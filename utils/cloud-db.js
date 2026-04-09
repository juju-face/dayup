/**
 * 云数据库工具类
 * 封装云函数调用，实现教师端和家长端数据同步
 */

class CloudDB {
  constructor() {
    this.db = null;
    this._ = null;
    this.initialized = false;
    
    // 延迟初始化云开发
    this.init();
  }

  // 初始化云开发
  init() {
    try {
      if (!wx.cloud) {
        console.warn('请使用 2.2.3 或以上的基础库以使用云能力');
        return;
      }
      
      // 检查是否已经初始化
      if (this.initialized) {
        return;
      }
      
      // 获取云开发环境ID（从配置或本地存储）
      let envId = wx.getStorageSync('cloud_env_id') || '';
      
      // 如果本地存储没有，使用默认环境ID
      if (!envId || envId === 'your-env-id') {
        envId = 'dayup-02-8gpzk22z15cf48a9'; // 云开发环境ID
        // 保存到本地存储
        wx.setStorageSync('cloud_env_id', envId);
      }
      
      wx.cloud.init({
        env: envId,
        traceUser: true
      });
      
      this.db = wx.cloud.database();
      this._ = this.db.command;
      this.initialized = true;
      
      console.log('云开发初始化成功');
    } catch (err) {
      console.error('云开发初始化失败:', err);
      // 不抛出错误，让应用可以继续使用本地存储
    }
  }

  // 检查是否已初始化
  checkInitialized() {
    if (!this.initialized) {
      console.warn('云开发未初始化，请检查环境ID配置');
      return false;
    }
    return true;
  }

  // ==================== 作业相关 ====================
  
  /**
   * 发布作业（教师端）
   * @param {Object} data 作业数据
   */
  async addHomework(data) {
    if (!this.checkInitialized()) {
      return { success: false, message: '云开发未初始化' };
    }
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'api',
        data: {
          action: 'addHomeworkRecord',
          data: data
        }
      });
      return result.result;
    } catch (err) {
      console.error('发布作业失败:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * 更新作业（教师端）
   * @param {Object} data 作业数据
   */
  async updateHomework(data) {
    if (!this.checkInitialized()) {
      return { success: false, message: '云开发未初始化' };
    }
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'api',
        data: {
          action: 'updateHomeworkStatus',
          data: data
        }
      });
      return result.result;
    } catch (err) {
      console.error('更新作业失败:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * 删除作业（教师端）
   * @param {string} _id 作业ID
   */
  async deleteHomework(_id) {
    if (!this.checkInitialized()) {
      return { success: false, message: '云开发未初始化' };
    }
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'api',
        data: {
          action: 'deleteHomeworkRecord',
          data: { _id }
        }
      });
      return result.result;
    } catch (err) {
      console.error('删除作业失败:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * 获取教师的作业列表（教师端）
   * @param {string} teacherId 教师ID
   * @param {string} startDate 开始日期
   * @param {string} endDate 结束日期
   */
  async getHomeworkByTeacher(teacherId, startDate, endDate) {
    if (!this.checkInitialized()) {
      return { success: false, message: '云开发未初始化' };
    }
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'api',
        data: {
          action: 'getHomeworkByTeacher',
          data: { teacherId, startDate, endDate }
        }
      });
      return result.result;
    } catch (err) {
      console.error('获取作业列表失败:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * 获取学生的作业列表（家长端）
   * @param {string} studentId 学生ID
   * @param {string} date 日期
   * @param {string} startDate 开始日期
   * @param {string} endDate 结束日期
   */
  async getHomeworkByStudent(studentId, date, startDate, endDate) {
    if (!this.checkInitialized()) {
      return { success: false, message: '云开发未初始化' };
    }
    
    try {
      // 调用 api 云函数，查询 homework_records 集合
      const result = await wx.cloud.callFunction({
        name: 'api',
        data: {
          action: 'getHomeworkByStudent',
          data: { studentId, date, startDate, endDate }
        }
      });
      return result.result;
    } catch (err) {
      console.error('获取学生作业失败:', err);
      return { success: false, message: err.message };
    }
  }

  // ==================== 作业状态相关 ====================

  /**
   * 更新作业状态
   * @param {Object} data 状态数据
   */
  async updateHomeworkStatus(data) {
    if (!this.checkInitialized()) {
      return { success: false, message: '云开发未初始化' };
    }
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'updateHomeworkStatus',
        data: {
          action: 'updateStatus',
          data: data
        }
      });
      return result.result;
    } catch (err) {
      console.error('更新作业状态失败:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * 批量更新作业状态（教师端）
   * @param {string} homeworkId 作业ID
   * @param {Array} studentStatuses 学生状态数组
   */
  async batchUpdateHomeworkStatus(homeworkId, studentStatuses) {
    if (!this.checkInitialized()) {
      return { success: false, message: '云开发未初始化' };
    }
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'updateHomeworkStatus',
        data: {
          action: 'batchUpdate',
          data: { homeworkId, studentStatuses }
        }
      });
      return result.result;
    } catch (err) {
      console.error('批量更新作业状态失败:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * 获取作业状态
   * @param {string} homeworkId 作业ID
   * @param {string} studentId 学生ID
   */
  async getHomeworkStatus(homeworkId, studentId) {
    if (!this.checkInitialized()) {
      return { success: false, message: '云开发未初始化' };
    }
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'updateHomeworkStatus',
        data: {
          action: 'getStatus',
          data: { homeworkId, studentId }
        }
      });
      return result.result;
    } catch (err) {
      console.error('获取作业状态失败:', err);
      return { success: false, message: err.message };
    }
  }

  // ==================== 学生相关 ====================

  /**
   * 添加学生
   * @param {Object} data 学生数据
   */
  async addStudent(data) {
    if (!this.checkInitialized()) {
      return { success: false, message: '云开发未初始化' };
    }
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'students',
        data: {
          action: 'add',
          data: data
        }
      });
      return result.result;
    } catch (err) {
      console.error('添加学生失败:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * 更新学生信息
   * @param {Object} data 学生数据
   */
  async updateStudent(data) {
    if (!this.checkInitialized()) {
      return { success: false, message: '云开发未初始化' };
    }
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'students',
        data: {
          action: 'update',
          data: data
        }
      });
      return result.result;
    } catch (err) {
      console.error('更新学生信息失败:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * 删除学生
   * @param {string} _id 学生ID
   */
  async deleteStudent(_id) {
    if (!this.checkInitialized()) {
      return { success: false, message: '云开发未初始化' };
    }
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'students',
        data: {
          action: 'delete',
          data: { _id }
        }
      });
      return result.result;
    } catch (err) {
      console.error('删除学生失败:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * 获取学生列表
   * @param {string} teacherId 教师ID
   * @param {string} className 班级名称
   */
  async getStudentList(teacherId, className) {
    if (!this.checkInitialized()) {
      return { success: false, message: '云开发未初始化' };
    }
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'students',
        data: {
          action: 'getList',
          data: { teacherId, className }
        }
      });
      return result.result;
    } catch (err) {
      console.error('获取学生列表失败:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * 根据ID获取学生
   * @param {string} _id 学生ID
   */
  async getStudentById(_id) {
    if (!this.checkInitialized()) {
      return { success: false, message: '云开发未初始化' };
    }
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'students',
        data: {
          action: 'getById',
          data: { _id }
        }
      });
      return result.result;
    } catch (err) {
      console.error('获取学生信息失败:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * 根据家长手机号获取学生列表（家长端使用）
   * @param {string} parentPhone 家长手机号
   */
  async getStudentsByParentPhone(parentPhone) {
    if (!this.checkInitialized()) {
      return { success: false, message: '云开发未初始化' };
    }
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'students',
        data: {
          action: 'getByParentPhone',
          data: { parentPhone }
        }
      });
      return result.result;
    } catch (err) {
      console.error('根据手机号获取学生失败:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * 绑定家长
   * @param {string} studentId 学生ID
   * @param {string} parentPhone 家长手机号
   * @param {string} parentOpenId 家长OpenID
   */
  async bindParent(studentId, parentPhone, parentOpenId) {
    if (!this.checkInitialized()) {
      return { success: false, message: '云开发未初始化' };
    }
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'students',
        data: {
          action: 'bindParent',
          data: { studentId, parentPhone, parentOpenId }
        }
      });
      return result.result;
    } catch (err) {
      console.error('绑定家长失败:', err);
      return { success: false, message: err.message };
    }
  }

  // ==================== 实时数据监听 ====================

  /**
   * 监听作业变化（实时同步）
   * @param {string} studentId 学生ID
   * @param {Function} onChange 变化回调
   * @param {Function} onError 错误回调
   */
  watchHomework(studentId, onChange, onError) {
    if (!this.checkInitialized()) {
      console.warn('云开发未初始化，无法启用实时监听');
      return null;
    }
    
    try {
      const watcher = this.db.collection('homework')
        .where(
          this._.or([
            { students: studentId },
            { students: this._.size(0) }
          ])
        )
        .watch({
          onChange: (snapshot) => {
            console.log('作业数据变化:', snapshot);
            if (typeof onChange === 'function') {
              onChange(snapshot);
            }
          },
          onError: (err) => {
            console.error('监听失败:', err);
            if (typeof onError === 'function') {
              onError(err);
            }
          }
        });
      
      return watcher;
    } catch (err) {
      console.error('创建监听失败:', err);
      return null;
    }
  }

  /**
   * 监听作业状态变化（实时同步）
   * @param {string} studentId 学生ID
   * @param {Function} onChange 变化回调
   * @param {Function} onError 错误回调
   */
  watchHomeworkStatus(studentId, onChange, onError) {
    if (!this.checkInitialized()) {
      console.warn('云开发未初始化，无法启用实时监听');
      return null;
    }
    
    try {
      const watcher = this.db.collection('homework_status')
        .where({ studentId })
        .watch({
          onChange: (snapshot) => {
            console.log('作业状态变化:', snapshot);
            if (typeof onChange === 'function') {
              onChange(snapshot);
            }
          },
          onError: (err) => {
            console.error('监听失败:', err);
            if (typeof onError === 'function') {
              onError(err);
            }
          }
        });
      
      return watcher;
    } catch (err) {
      console.error('创建监听失败:', err);
      return null;
    }
  }

  // ==================== 费用相关 ====================

  /**
   * 添加缴费记录
   * @param {Object} data 缴费数据
   */
  async addFeeRecord(data) {
    if (!this.checkInitialized()) {
      return { success: false, message: '云开发未初始化' };
    }
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'api',
        data: {
          action: 'addFeeRecord',
          data: data
        }
      });
      return result.result;
    } catch (err) {
      console.error('添加缴费记录失败:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * 获取缴费记录
   * @param {string} studentId 学生ID
   * @param {string} month 月份
   */
  async getFeeRecords(studentId, month) {
    if (!this.checkInitialized()) {
      return { success: false, message: '云开发未初始化' };
    }
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'api',
        data: {
          action: 'getFeeRecords',
          data: { studentId, month }
        }
      });
      return result.result;
    } catch (err) {
      console.error('获取缴费记录失败:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * 更新学生费用状态
   * @param {string} studentId 学生ID
   * @param {Object} feeInfo 费用信息
   */
  async updateStudentFeeInfo(studentId, feeInfo) {
    if (!this.checkInitialized()) {
      return { success: false, message: '云开发未初始化' };
    }
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'api',
        data: {
          action: 'updateStudent',
          data: { _id: studentId, ...feeInfo }
        }
      });
      return result.result;
    } catch (err) {
      console.error('更新学生费用状态失败:', err);
      return { success: false, message: err.message };
    }
  }
}

// 导出单例
const cloudDB = new CloudDB();

module.exports = cloudDB;
