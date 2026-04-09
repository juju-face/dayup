// utils/migration-tool.js
// 数据迁移工具 - 将旧版作业数据迁移到云数据库

const homeworkService = require('./homework-service.js');

class MigrationTool {
  constructor() {
    this.cloudFunctionName = 'api';
  }

  /**
   * 从旧版storage迁移作业数据到云端
   * @param {string} teacherId - 老师ID
   * @returns {Promise<Object>} 迁移结果
   */
  async migrateHomeworkData(teacherId) {
    try {
      console.log('[MigrationTool] 开始迁移作业数据，老师ID:', teacherId);
      
      // 1. 获取本地作业数据
      const localRecords = this.getLocalHomeworkRecords();
      console.log('[MigrationTool] 本地作业记录数:', localRecords.length);
      
      if (localRecords.length === 0) {
        return {
          success: true,
          data: { total: 0, migrated: 0, skipped: 0 },
          message: '没有需要迁移的数据'
        };
      }
      
      // 2. 获取云端已存在的作业（避免重复）
      const cloudRecords = await this.getCloudHomeworkRecords(teacherId);
      const cloudRecordKeys = new Set(
        cloudRecords.map(r => `${r.studentId}_${r.date}_${r.subject}_${r.content}`)
      );
      
      console.log('[MigrationTool] 云端已有作业数:', cloudRecords.length);
      
      // 3. 筛选需要迁移的数据
      const recordsToMigrate = localRecords.filter(record => {
        const recordKey = `${record.studentId}_${record.date}_${record.subject}_${record.content}`;
        const existsInCloud = cloudRecordKeys.has(recordKey);
        const hasRequiredFields = record.studentId && record.subject && record.content && record.date;
        
        return !existsInCloud && hasRequiredFields;
      });
      
      console.log('[MigrationTool] 需要迁移的作业数:', recordsToMigrate.length);
      
      if (recordsToMigrate.length === 0) {
        return {
          success: true,
          data: { total: localRecords.length, migrated: 0, skipped: localRecords.length },
          message: '没有新的数据需要迁移'
        };
      }
      
      // 4. 批量迁移到云端
      const results = [];
      const batchSize = 10; // 每批10条，避免超时
      
      for (let i = 0; i < recordsToMigrate.length; i += batchSize) {
        const batch = recordsToMigrate.slice(i, i + batchSize);
        console.log(`[MigrationTool] 迁移批次 ${Math.floor(i/batchSize) + 1}/${Math.ceil(recordsToMigrate.length/batchSize)}`);
        
        const batchResults = await Promise.allSettled(
          batch.map(record => this.migrateSingleRecord(record, teacherId))
        );
        
        results.push(...batchResults);
        
        // 每批间隔500ms，避免触发云函数限流
        if (i + batchSize < recordsToMigrate.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // 5. 统计结果
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failCount = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
      
      console.log('[MigrationTool] 迁移完成:', { successCount, failCount });
      
      return {
        success: true,
        data: {
          total: localRecords.length,
          migrated: successCount,
          skipped: localRecords.length - recordsToMigrate.length,
          failed: failCount
        },
        message: `成功迁移 ${successCount} 条作业数据${failCount > 0 ? `，失败 ${failCount} 条` : ''}`
      };
    } catch (error) {
      console.error('[MigrationTool] 迁移失败:', error);
      return {
        success: false,
        message: '迁移失败: ' + error.message
      };
    }
  }

  /**
   * 迁移单条记录
   * @private
   */
  async migrateSingleRecord(record, teacherId) {
    try {
      // 构造迁移数据
      const homeworkData = {
        studentId: record.studentId,
        studentName: record.studentName || '未知学生',
        teacherId: teacherId,
        subject: record.subject || '其他',
        content: record.content,
        date: record.date,
        remark: record.remark || '',
        status: record.status || 0
      };
      
      // 调用云函数保存
      const res = await wx.cloud.callFunction({
        name: this.cloudFunctionName,
        data: {
          action: 'addHomeworkRecord',
          data: homeworkData
        }
      });
      
      if (res.result && res.result.success) {
        console.log('[MigrationTool] 单条记录迁移成功:', res.result.data._id);
        return { success: true, data: res.result.data };
      } else {
        throw new Error(res.result?.message || '云端保存失败');
      }
    } catch (error) {
      console.error('[MigrationTool] 单条记录迁移失败:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 获取本地作业记录（兼容旧版storage格式）
   * @private
   */
  getLocalHomeworkRecords() {
    try {
      // 尝试从多种可能的存储键中获取
      const possibleKeys = ['homework_records', 'records', 'homework'];
      
      for (const key of possibleKeys) {
        try {
          const data = wx.getStorageSync(key);
          if (Array.isArray(data) && data.length > 0) {
            console.log('[MigrationTool] 从 storage key:', key, '获取到', data.length, '条记录');
            return data;
          }
        } catch (e) {
          // 忽略单个key的错误，继续尝试下一个
        }
      }
      
      // 如果没有找到，尝试从utils/storage.js的格式获取
      const storage = require('./storage.js');
      if (storage.getRecords && typeof storage.getRecords === 'function') {
        const records = storage.getRecords();
        if (Array.isArray(records) && records.length > 0) {
          console.log('[MigrationTool] 从 storage.js 获取到', records.length, '条记录');
          return records;
        }
      }
      
      console.log('[MigrationTool] 未找到本地作业记录');
      return [];
    } catch (error) {
      console.error('[MigrationTool] 获取本地记录失败:', error);
      return [];
    }
  }

  /**
   * 获取云端作业记录
   * @private
   */
  async getCloudHomeworkRecords(teacherId) {
    try {
      const res = await wx.cloud.callFunction({
        name: this.cloudFunctionName,
        data: {
          action: 'getHomeworkByTeacher',
          data: {
            teacherId: teacherId,
            limit: 1000  // 获取所有记录
          }
        }
      });
      
      if (res.result && res.result.success) {
        return res.result.data || [];
      }
      return [];
    } catch (error) {
      console.error('[MigrationTool] 获取云端记录失败:', error);
      return [];
    }
  }

  /**
   * 检查数据一致性
   * @param {string} teacherId - 老师ID
   * @returns {Promise<Object>} 检查结果
   */
  async checkDataConsistency(teacherId) {
    try {
      console.log('[MigrationTool] 检查数据一致性');
      
      const localRecords = this.getLocalHomeworkRecords();
      const cloudRecords = await this.getCloudHomeworkRecords(teacherId);
      
      const localCount = localRecords.length;
      const cloudCount = cloudRecords.length;
      
      // 对比数据详情
      const localKeys = new Set(
        localRecords.map(r => `${r.studentId}_${r.date}_${r.subject}_${r.content}`)
      );
      const cloudKeys = new Set(
        cloudRecords.map(r => `${r.studentId}_${r.date}_${r.subject}_${r.content}`)
      );
      
      const missingInCloud = [...localKeys].filter(key => !cloudKeys.has(key));
      const missingInLocal = [...cloudKeys].filter(key => !localKeys.has(key));
      
      return {
        success: true,
        data: {
          localCount,
          cloudCount,
          missingInCloud: missingInCloud.length,
          missingInLocal: missingInLocal.length,
          isConsistent: missingInCloud.length === 0 && missingInLocal.length === 0
        }
      };
    } catch (error) {
      console.error('[MigrationTool] 检查失败:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 清理无效的本地数据
   * @returns {Object} 清理结果
   */
  cleanupInvalidData() {
    try {
      console.log('[MigrationTool] 清理无效的本地数据');
      
      const localRecords = this.getLocalHomeworkRecords();
      const validRecords = localRecords.filter(record => {
        return record.studentId && record.subject && record.content && record.date;
      });
      
      const removedCount = localRecords.length - validRecords.length;
      
      if (removedCount > 0) {
        // 保存清理后的数据
        wx.setStorageSync('homework_records', validRecords);
        console.log('[MigrationTool] 清理了', removedCount, '条无效记录');
      }
      
      return {
        success: true,
        data: {
          total: localRecords.length,
          valid: validRecords.length,
          removed: removedCount
        }
      };
    } catch (error) {
      console.error('[MigrationTool] 清理失败:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
}

// 创建实例
const migrationTool = new MigrationTool();

// 导出
module.exports = migrationTool;