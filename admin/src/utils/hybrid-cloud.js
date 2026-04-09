/**
 * 混合云开发模式 - 最佳实践
 * 
 * 简单查询：使用tcb-js-sdk（只读权限）
 * 敏感操作：使用云函数HTTP API（完整权限+业务逻辑）
 */

import { cloudConfig } from './config'
import apiService from './api'

class HybridCloudService {
  constructor() {
    this.app = null
    this.db = null
    this.initialized = false
    this.useLocalMode = false
  }

  async init() {
    if (this.initialized) return

    // 检查是否配置Access Key
    if (!cloudConfig.accessKey || cloudConfig.accessKey === 'your-access-key-here') {
      console.warn('[HybridCloud] Access Key未配置，使用HTTP API模式')
      this.useLocalMode = true
      this.initialized = true
      return
    }

    try {
      // 动态导入tcb-js-sdk，避免打包过大
      const tcb = await import('tcb-js-sdk')
      
      this.app = tcb.default.init({
        env: cloudConfig.env,
        region: cloudConfig.region,
        accessKey: cloudConfig.accessKey
      })
      
      this.db = this.app.database()
      this.initialized = true
      
      console.log('[HybridCloud] 混合云开发模式初始化成功')
    } catch (error) {
      console.warn('[HybridCloud] tcb-js-sdk初始化失败，使用HTTP API模式:', error)
      this.useLocalMode = true
      this.initialized = true
    }
  }

  // ==================== 简单查询（使用tcb-js-sdk） ====================
  
  /**
   * 简单查询 - 适合只读操作
   * 优点：响应快，代码简洁
   * 注意：需要在云开发控制台设置严格的数据库安全规则
   */
  async queryStudentsSimple(params = {}) {
    await this.init()

    // 如果tcb-js-sdk初始化失败，降级到HTTP API
    if (this.useLocalMode || !this.db) {
      console.log('[HybridCloud] 降级到HTTP API模式')
      return await apiService.getAllStudents()
    }

    try {
      const { page = 1, pageSize = 10, search = '' } = params
      
      let query = this.db.collection('students')
      
      // 搜索条件
      if (search) {
        query = query.where({
          name: this.db.RegExp({
            regexp: search,
            options: 'i'  // 不区分大小写
          })
        })
      }
      
      const result = await query
        .orderBy('createTime', 'desc')
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .get()
      
      return {
        success: true,
        data: result.data,
        message: '查询成功'
      }
    } catch (error) {
      console.error('[HybridCloud] 查询失败:', error)
      return {
        success: false,
        message: error.message,
        data: []
      }
    }
  }

  /**
   * 实时监听学生数据变化
   * 优点：实时同步，适合数据监控看板
   */
  watchStudents(onChange, onError) {
    if (this.useLocalMode || !this.db) {
      console.warn('[HybridCloud] 本地模式下不支持实时监听')
      return null
    }

    try {
      const watcher = this.db.collection('students')
        .watch({
          onChange: (snapshot) => {
            console.log('[HybridCloud] 数据变化:', snapshot)
            onChange(snapshot)
          },
          onError: (err) => {
            console.error('[HybridCloud] 监听失败:', err)
            onError(err)
          }
        })
      
      return watcher
    } catch (error) {
      console.error('[HybridCloud] 创建监听失败:', error)
      return null
    }
  }

  // ==================== 敏感操作（使用云函数HTTP） ====================
  
  /**
   * 添加学生 - 敏感操作，使用HTTP API
   * 优点：安全，可以在云函数中做数据验证和权限控制
   */
  async addStudent(data) {
    // 数据验证
    const validation = this.validateStudentData(data)
    if (!validation.valid) {
      return {
        success: false,
        message: validation.message
      }
    }

    // 调用云函数（包含业务逻辑）
    return await apiService.addStudent(data)
  }

  /**
   * 更新学生 - 敏感操作，使用HTTP API
   */
  async updateStudent(data) {
    // 数据验证
    const validation = this.validateStudentData(data)
    if (!validation.valid) {
      return {
        success: false,
        message: validation.message
      }
    }

    // 调用云函数（包含权限验证和业务逻辑）
    return await apiService.updateStudent(data)
  }

  /**
   * 删除学生 - 敏感操作，使用HTTP API
   * 优点：可以在云函数中做级联删除、日志记录等
   */
  async deleteStudent(id) {
    if (!id) {
      return {
        success: false,
        message: '学生ID不能为空'
      }
    }

    // 调用云函数（包含权限验证和级联删除）
    return await apiService.deleteStudent(id)
  }

  // ==================== 费用管理（敏感操作，使用HTTP API） ====================

  async addFeeRecord(data) {
    return await apiService.addFeeRecord(data)
  }

  async updateFeeRecord(data) {
    return await apiService.updateFeeRecord(data)
  }

  async deleteFeeRecord(id) {
    return await apiService.deleteFeeRecord(id)
  }

  // ==================== 数据验证 ====================

  validateStudentData(data) {
    const required = ['name', 'age', 'className']
    
    for (const field of required) {
      if (!data[field]) {
        return {
          valid: false,
          message: `${field}不能为空`
        }
      }
    }

    if (data.age && (data.age < 3 || data.age > 18)) {
      return {
        valid: false,
        message: '年龄必须在3-18岁之间'
      }
    }

    return { valid: true }
  }

  // ==================== 工具方法 ====================

  getCloudStatus() {
    return {
      initialized: this.initialized,
      useLocalMode: this.useLocalMode,
      hasDB: !!this.db,
      mode: this.useLocalMode ? 'HTTP API模式' : '混合模式'
    }
  }
}

const hybridCloudService = new HybridCloudService()
export default hybridCloudService
