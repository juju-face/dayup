import tcb from 'tcb-js-sdk'

class CloudService {
  constructor() {
    this.app = null
    this.initialized = false
  }

  // 初始化云开发
  init() {
    try {
      // 获取环境ID（实际使用时需要配置）
      const envId = 'your-env-id' // 这里需要替换为实际的环境ID
      
      this.app = tcb.init({
        env: envId
      })
      
      this.initialized = true
      console.log('云开发初始化成功')
    } catch (err) {
      console.error('云开发初始化失败:', err)
    }
  }

  // 检查是否已初始化
  checkInitialized() {
    if (!this.initialized) {
      console.warn('云开发未初始化')
      return false
    }
    return true
  }

  // 调用云函数
  async callFunction(name, data) {
    if (!this.checkInitialized()) {
      return { success: false, message: '云开发未初始化' }
    }
    
    try {
      const result = await this.app.callFunction({
        name,
        data
      })
      return result.result
    } catch (err) {
      console.error(`调用云函数 ${name} 失败:`, err)
      return { success: false, message: err.message }
    }
  }

  // ==================== 学生相关 ====================
  
  // 添加学生
  async addStudent(data) {
    return this.callFunction('students', {
      action: 'add',
      data
    })
  }

  // 更新学生
  async updateStudent(data) {
    return this.callFunction('students', {
      action: 'update',
      data
    })
  }

  // 删除学生
  async deleteStudent(_id) {
    return this.callFunction('students', {
      action: 'delete',
      data: { _id }
    })
  }

  // 获取学生列表
  async getStudentList(teacherId, className) {
    return this.callFunction('students', {
      action: 'getList',
      data: { teacherId, className }
    })
  }

  // ==================== 费用相关 ====================
  
  // 添加缴费记录
  async addFeeRecord(data) {
    return this.callFunction('fee', {
      action: 'add',
      data
    })
  }

  // 更新缴费记录
  async updateFeeRecord(data) {
    return this.callFunction('fee', {
      action: 'update',
      data
    })
  }

  // 删除缴费记录
  async deleteFeeRecord(_id) {
    return this.callFunction('fee', {
      action: 'delete',
      data: { _id }
    })
  }

  // 获取缴费记录
  async getFeeRecords(month) {
    return this.callFunction('fee', {
      action: 'getList',
      data: { month }
    })
  }
}

// 导出单例
const cloudService = new CloudService()

export default cloudService
