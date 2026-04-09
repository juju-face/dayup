// utils/homework-service.js
// 作业管理服务 - 统一处理作业相关的数据操作

const STORAGE_KEY = 'homework_records';
const DRAFT_KEY = 'homework_draft';
const TEMPLATE_KEY = 'homework_templates';

class HomeworkService {
  constructor() {
    this.cloudFunctionName = 'api';
  }

  // ==================== 作业管理 ====================

  /**
   * 添加作业记录（云端 + 本地）
   * @param {Object} homeworkData - 作业数据
   * @returns {Promise<Object>} 结果
   */
  async addHomework(homeworkData) {
    try {
      console.log('[HomeworkService] 添加作业:', homeworkData);
      
      // 参数校验
      const { studentId, studentName, teacherId, subject, content, date } = homeworkData;
      if (!studentId || !studentName || !teacherId || !subject || !content || !date) {
        throw new Error('参数不完整');
      }

      // 1. 先保存到云端
      const cloudResult = await this.addHomeworkToCloud(homeworkData);
      
      if (cloudResult.success) {
        // 2. 再保存到本地作为备份
        this.addHomeworkToLocal(cloudResult.data);
        
        // 3. 清除草稿
        this.clearDraft();
        
        return {
          success: true,
          data: cloudResult.data,
          message: '作业发布成功'
        };
      } else {
        throw new Error(cloudResult.message || '云端保存失败');
      }
    } catch (error) {
      console.error('[HomeworkService] 添加作业失败:', error);
      
      // 云端失败，尝试只保存本地
      try {
        const localRecord = {
          id: this.generateId(),
          ...homeworkData,
          status: 0,
          remark: '',
          createTime: new Date().toISOString(),
          updateTime: new Date().toISOString()
        };
        
        this.addHomeworkToLocal(localRecord);
        
        return {
          success: true,
          data: localRecord,
          message: '已保存到本地，将在网络恢复后同步'
        };
      } catch (localError) {
        return {
          success: false,
          message: '作业发布失败: ' + error.message
        };
      }
    }
  }

  /**
   * 批量添加作业（给多个学生）
   * @param {Array} homeworkList - 作业列表
   * @returns {Promise<Object>} 结果
   */
  async batchAddHomework(homeworkList) {
    try {
      console.log('[HomeworkService] 批量添加作业:', homeworkList.length, '条');
      
      if (!Array.isArray(homeworkList) || homeworkList.length === 0) {
        throw new Error('作业列表不能为空');
      }
      
      // 参数校验
      for (const homework of homeworkList) {
        const { studentId, studentName, teacherId, subject, content, date } = homework;
        if (!studentId || !studentName || !teacherId || !subject || !content || !date) {
          throw new Error('参数不完整');
        }
      }

      // 1. 批量保存到云端
      const results = [];
      for (const homework of homeworkList) {
        const result = await this.addHomeworkToCloud(homework);
        results.push(result);
      }
      
      // 2. 统计成功和失败的数量
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;
      
      if (successCount > 0) {
        // 3. 保存成功的到本地
        results.filter(r => r.success).forEach(r => {
          this.addHomeworkToLocal(r.data);
        });
        
        // 4. 清除草稿
        this.clearDraft();
        
        return {
          success: true,
          data: { successCount, failCount },
          message: `成功发布 ${successCount} 条作业${failCount > 0 ? `，失败 ${failCount} 条` : ''}`
        };
      } else {
        throw new Error('全部发布失败');
      }
    } catch (error) {
      console.error('[HomeworkService] 批量添加作业失败:', error);
      return {
        success: false,
        message: '批量发布失败: ' + error.message
      };
    }
  }

  /**
   * 更新作业状态
   * @param {string} recordId - 记录ID
   * @param {number} status - 状态
   * @param {string} remark - 备注
   * @returns {Promise<Object>} 结果
   */
  async updateHomeworkStatus(recordId, status, remark = '') {
    try {
      console.log('[HomeworkService] 更新作业状态:', { recordId, status, remark });
      
      if (!recordId || status === undefined) {
        throw new Error('参数不完整');
      }

      // 更新云端
      const res = await wx.cloud.callFunction({
        name: this.cloudFunctionName,
        data: {
          action: 'updateHomeworkStatus',
          data: { recordId, status, remark }
        }
      });

      if (res.result && res.result.success) {
        // 更新本地
        this.updateHomeworkStatusInLocal(recordId, status, remark);
        
        return {
          success: true,
          message: '状态更新成功'
        };
      } else {
        throw new Error(res.result?.message || '更新失败');
      }
    } catch (error) {
      console.error('[HomeworkService] 更新作业状态失败:', error);
      return {
        success: false,
        message: '更新失败: ' + error.message
      };
    }
  }

  /**
   * 删除作业
   * @param {string} recordId - 记录ID
   * @returns {Promise<Object>} 结果
   */
  async deleteHomework(recordId) {
    try {
      console.log('[HomeworkService] 删除作业:', recordId);
      
      if (!recordId) {
        throw new Error('缺少记录ID');
      }

      // 删除云端
      const res = await wx.cloud.callFunction({
        name: this.cloudFunctionName,
        data: {
          action: 'deleteHomeworkRecord',
          data: { recordId }
        }
      });

      if (res.result && res.result.success) {
        // 删除本地
        this.deleteHomeworkFromLocal(recordId);
        
        return {
          success: true,
          message: '删除成功'
        };
      } else {
        throw new Error(res.result?.message || '删除失败');
      }
    } catch (error) {
      console.error('[HomeworkService] 删除作业失败:', error);
      return {
        success: false,
        message: '删除失败: ' + error.message
      };
    }
  }

  // ==================== 模板管理 ====================

  /**
   * 获取作业模板
   * @returns {Array} 模板列表
   */
  getTemplates() {
    try {
      const templates = wx.getStorageSync(TEMPLATE_KEY);
      return Array.isArray(templates) ? templates : [];
    } catch (error) {
      console.error('[HomeworkService] 获取模板失败:', error);
      return [];
    }
  }

  /**
   * 保存作业模板
   * @param {Object} template - 模板数据
   * @returns {boolean} 是否成功
   */
  saveTemplate(template) {
    try {
      const templates = this.getTemplates();
      const newTemplate = {
        id: this.generateId(),
        name: template.name,
        subject: template.subject,
        content: template.content,
        createTime: new Date().toISOString()
      };
      
      templates.unshift(newTemplate); // 新模板放前面
      
      wx.setStorageSync(TEMPLATE_KEY, templates);
      console.log('[HomeworkService] 保存模板成功:', newTemplate);
      return true;
    } catch (error) {
      console.error('[HomeworkService] 保存模板失败:', error);
      return false;
    }
  }

  /**
   * 删除作业模板
   * @param {string} templateId - 模板ID
   * @returns {boolean} 是否成功
   */
  deleteTemplate(templateId) {
    try {
      const templates = this.getTemplates();
      const filtered = templates.filter(t => t.id !== templateId);
      
      wx.setStorageSync(TEMPLATE_KEY, filtered);
      console.log('[HomeworkService] 删除模板成功:', templateId);
      return true;
    } catch (error) {
      console.error('[HomeworkService] 删除模板失败:', error);
      return false;
    }
  }

  // ==================== 草稿管理 ====================

  /**
   * 保存草稿
   * @param {Object} draft - 草稿数据
   * @returns {boolean} 是否成功
   */
  saveDraft(draft) {
    try {
      const draftData = {
        ...draft,
        saveTime: new Date().toISOString()
      };
      
      wx.setStorageSync(DRAFT_KEY, draftData);
      console.log('[HomeworkService] 保存草稿成功:', draftData);
      return true;
    } catch (error) {
      console.error('[HomeworkService] 保存草稿失败:', error);
      return false;
    }
  }

  /**
   * 获取草稿
   * @returns {Object|null} 草稿数据
   */
  getDraft() {
    try {
      const draft = wx.getStorageSync(DRAFT_KEY);
      return draft || null;
    } catch (error) {
      console.error('[HomeworkService] 获取草稿失败:', error);
      return null;
    }
  }

  /**
   * 清除草稿
   * @returns {boolean} 是否成功
   */
  clearDraft() {
    try {
      wx.removeStorageSync(DRAFT_KEY);
      console.log('[HomeworkService] 清除草稿成功');
      return true;
    } catch (error) {
      console.error('[HomeworkService] 清除草稿失败:', error);
      return false;
    }
  }

  /**
   * 检查是否有草稿
   * @returns {boolean}
   */
  hasDraft() {
    const draft = this.getDraft();
    return draft !== null;
  }

  // ==================== 私有方法 ====================

  /**
   * 保存到云端
   * @private
   */
  async addHomeworkToCloud(homeworkData) {
    const res = await wx.cloud.callFunction({
      name: this.cloudFunctionName,
      data: {
        action: 'addHomeworkRecord',
        data: homeworkData
      }
    });
    
    return res.result || { success: false, message: '未知错误' };
  }

  /**
   * 保存到本地
   * @private
   */
  addHomeworkToLocal(record) {
    const records = this.getLocalRecords();
    records.unshift(record);
    this.saveLocalRecords(records);
  }

  /**
   * 获取本地记录
   * @private
   */
  getLocalRecords() {
    try {
      const records = wx.getStorageSync(STORAGE_KEY);
      return Array.isArray(records) ? records : [];
    } catch (error) {
      console.error('[HomeworkService] 获取本地记录失败:', error);
      return [];
    }
  }

  /**
   * 保存本地记录
   * @private
   */
  saveLocalRecords(records) {
    try {
      wx.setStorageSync(STORAGE_KEY, records);
    } catch (error) {
      console.error('[HomeworkService] 保存本地记录失败:', error);
    }
  }

  /**
   * 更新本地状态
   * @private
   */
  updateHomeworkStatusInLocal(recordId, status, remark) {
    const records = this.getLocalRecords();
    const index = records.findIndex(r => r._id === recordId || r.id === recordId);
    
    if (index !== -1) {
      records[index].status = status;
      records[index].remark = remark || '';
      records[index].updateTime = new Date().toISOString();
      this.saveLocalRecords(records);
    }
  }

  /**
   * 删除本地记录
   * @private
   */
  deleteHomeworkFromLocal(recordId) {
    const records = this.getLocalRecords();
    const filtered = records.filter(r => r._id !== recordId && r.id !== recordId);
    this.saveLocalRecords(filtered);
  }

  /**
   * 生成唯一ID
   * @private
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  // ==================== 工具方法 ====================

  /**
   * 按日期获取作业
   * @param {string} date - 日期
   * @returns {Array} 作业列表
   */
  getHomeworkByDate(date) {
    const records = this.getLocalRecords();
    return records.filter(r => r.date === date);
  }

  /**
   * 按学生获取作业
   * @param {string} studentId - 学生ID
   * @returns {Array} 作业列表
   */
  getHomeworkByStudent(studentId) {
    const records = this.getLocalRecords();
    return records.filter(r => r.studentId === studentId);
  }

  /**
   * 获取今日作业
   * @returns {Array} 作业列表
   */
  getTodayHomework() {
    const today = new Date().toISOString().split('T')[0];
    return this.getHomeworkByDate(today);
  }
}

// 创建单例
const homeworkService = new HomeworkService();

// 导出
module.exports = homeworkService;