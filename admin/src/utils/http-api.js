/**
 * 纯HTTP API模式 - 方案B
 * 所有数据库操作通过云函数HTTP触发器
 * 安全性高，适合Admin后台管理
 */

import { apiConfig } from './config'

class HttpApiService {
  constructor() {
    this.baseURL = apiConfig.baseURL
    this.initialized = false
    this.adminApiKey = 'dayup_admin_2025_secure_key' // Admin API密钥
  }

  async init() {
    if (this.initialized) return
    
    // 验证API地址配置
    if (!this.baseURL || this.baseURL.includes('your-custom-domain')) {
      console.warn('[HttpApiService] API地址未正确配置，请检查 .env 文件')
      console.warn('[HttpApiService] 当前地址:', this.baseURL)
    }
    
    this.initialized = true
    console.log('[HttpApiService] HTTP API服务初始化成功')
    console.log('[HttpApiService] API地址:', this.baseURL)
  }

  // ==================== HTTP请求封装 ====================

  async request(action, data = {}) {
    await this.init()
    
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Api-Key': this.adminApiKey,  // 添加Admin API密钥
        },
        body: JSON.stringify({
          action,
          data,
          timestamp: Date.now()
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status}`)
      }

      const result = await response.json()
      
      // 云函数HTTP触发器返回格式处理
      if (result.body) {
        try {
          return JSON.parse(result.body)
        } catch (e) {
          return { success: false, message: '响应格式错误' }
        }
      }
      
      return result
    } catch (error) {
      console.error(`[HttpApiService] ${action} 请求失败:`, error)
      return {
        success: false,
        message: error.message || '网络请求失败',
        data: null
      }
    }
  }

  // ==================== 认证相关（Admin） ====================

  /**
   * Admin登录
   */
  async login(username, password) {
    // 简单的前端验证（实际应该调用云函数验证）
    if (username === 'admin' && password === '123456') {
      const user = {
        _id: 'admin',
        username: 'admin',
        name: '管理员',
        loginTime: new Date().toISOString()
      }
      
      // 存储用户信息
      localStorage.setItem('admin_user', JSON.stringify(user))
      
      return {
        success: true,
        data: user,
        message: '登录成功'
      }
    }
    
    return {
      success: false,
      message: '账号或密码错误'
    }
  }

  /**
   * 检查登录状态（修复base64解码错误）
   */
  async checkLoginStatus() {
    const userStr = localStorage.getItem('admin_user')
    if (userStr) {
      try {
        // 尝试多种解析方式
        let user = null
        
        // 方式1：直接JSON解析（新的存储方式）
        try {
          user = JSON.parse(userStr)
        } catch (e) {
          // 方式2：base64解码（旧的存储方式）
          try {
            user = JSON.parse(atob(userStr))
          } catch (e2) {
            console.warn('解析用户信息失败，清除存储:', e2)
            localStorage.removeItem('admin_user')
            return {
              isLoggedIn: false,
              user: null
            }
          }
        }
        
        if (user) {
          return {
            isLoggedIn: true,
            user
          }
        }
      } catch (e) {
        console.warn('检查登录状态失败:', e)
        localStorage.removeItem('admin_user')
      }
    }
    
    return {
      isLoggedIn: false,
      user: null
    }
  }

  /**
   * 退出登录
   */
  async logout() {
    try {
      localStorage.removeItem('admin_user')
    } catch (e) {
      console.warn('清除用户信息失败:', e)
    }
    return {
      success: true,
      message: '退出成功'
    }
  }

  // ==================== 学生管理 ====================

  /**
   * 添加学生
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

    return await this.request('addStudent', data)
  }

  /**
   * 更新学生信息
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

    return await this.request('updateStudent', data)
  }

  /**
   * 删除学生
   */
  async deleteStudent(student) {
    if (!student || (!student._id && !student.id)) {
      return {
        success: false,
        message: '学生ID不能为空'
      }
    }

    return await this.request('deleteStudent', student)
  }

  /**
   * 获取学生列表
   */
  async getAllStudents(params = {}) {
    return await this.request('getAllStudents', params)
  }

  /**
   * 根据ID获取学生
   */
  async getStudentById(id) {
    return await this.request('getStudentById', { id })
  }

  // ==================== 费用管理 ====================

  /**
   * 添加缴费记录
   */
  async addFeeRecord(data) {
    return await this.request('addFeeRecord', data)
  }

  /**
   * 更新缴费记录
   */
  async updateFeeRecord(data) {
    return await this.request('updateFeeRecord', data)
  }

  /**
   * 删除缴费记录
   */
  async deleteFeeRecord(id) {
    return await this.request('deleteFeeRecord', { _id: id })
  }

  /**
   * 获取缴费记录列表
   */
  async getFeeRecords(params = {}) {
    return await this.request('getFeeRecords', params)
  }

  // ==================== 老师管理 ====================

  /**
   * 添加老师
   */
  async addTeacher(data) {
    // 数据验证
    const validation = this.validateTeacherData(data)
    if (!validation.valid) {
      return {
        success: false,
        message: validation.message
      }
    }

    return await this.request('addTeacher', data)
  }

  /**
   * 更新老师信息
   */
  async updateTeacher(data) {
    if (!data._id && !data.id) {
      return {
        success: false,
        message: '缺少老师ID'
      }
    }

    return await this.request('updateTeacher', data)
  }

  /**
   * 删除老师
   */
  async deleteTeacher(id) {
    if (!id) {
      return {
        success: false,
        message: '老师ID不能为空'
      }
    }

    return await this.request('deleteTeacher', { _id: id })
  }

  /**
   * 根据手机号获取老师
   */
  async getTeacherByPhone(phone) {
    if (!phone) {
      return {
        success: false,
        message: '手机号不能为空'
      }
    }

    return await this.request('getTeacherByPhone', { phone })
  }

  /**
   * 获取所有老师
   */
  async getAllTeachers(params = {}) {
    return await this.request('getAllTeachers', params)
  }

  /**
   * 老师登录
   */
  async teacherLogin(phone, password) {
    if (!phone || !password) {
      return {
        success: false,
        message: '手机号和密码不能为空'
      }
    }

    return await this.request('teacherLogin', { phone, password })
  }

  /**
   * 分配学生给老师
   */
  async assignStudentsToTeacher(teacherId, studentIds) {
    if (!teacherId) {
      return {
        success: false,
        message: '老师ID不能为空'
      }
    }

    return await this.request('assignStudentsToTeacher', {
      teacherId,
      studentIds
    })
  }

  /**
   * 获取老师的学生列表
   */
  async getStudentsByTeacher(teacherId, params = {}) {
    if (!teacherId) {
      return {
        success: false,
        message: '老师ID不能为空'
      }
    }

    return await this.request('getStudentsByTeacher', {
      teacherId,
      ...params
    })
  }

  // ==================== 数据验证 ====================

  validateStudentData(data) {
    const required = ['name', 'className']
    
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

    if (data.phone && !/^1[3-9]\d{9}$/.test(data.phone)) {
      return {
        valid: false,
        message: '手机号格式不正确'
      }
    }

    return { valid: true }
  }

  validateTeacherData(data) {
    const required = ['name', 'phone', 'subject', 'classes']
    
    for (const field of required) {
      if (!data[field] || (Array.isArray(data[field]) && data[field].length === 0)) {
        return {
          valid: false,
          message: `${field}不能为空`
        }
      }
    }

    if (data.phone && !/^1[3-9]\d{9}$/.test(data.phone)) {
      return {
        valid: false,
        message: '手机号格式不正确'
      }
    }

    if (data.password && data.password.length < 6) {
      return {
        valid: false,
        message: '密码至少6位'
      }
    }

    return { valid: true }
  }

  /**
   * 批量更新学生status字段（修复旧数据）
   */
  async batchUpdateStudentStatus(params = {}) {
    return await this.request('batchUpdateStudentStatus', params)
  }

  validateFeeRecord(data) {
    if (!data.studentId) {
      return {
        valid: false,
        message: '学生ID不能为空'
      }
    }

    if (!data.amount || data.amount <= 0) {
      return {
        valid: false,
        message: '金额必须大于0'
      }
    }

    return { valid: true }
  }

  // ==================== 工具方法 ====================

  /**
   * 获取服务状态
   */
  getStatus() {
    return {
      initialized: this.initialized,
      baseURL: this.baseURL,
      mode: '纯HTTP API模式'
    }
  }

  /**
   * 测试API连接
   */
  async testConnection() {
    try {
      console.log('[HttpApiService] 测试API连接...')
      
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'getAllStudents',
          data: { limit: 1 }
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.body) {
        const parsed = JSON.parse(result.body)
        return {
          success: parsed.success !== false,
          message: parsed.success !== false ? 'API连接正常' : 'API返回错误',
          data: parsed
        }
      }
      
      return {
        success: result.success !== false,
        message: 'API连接正常',
        data: result
      }
    } catch (error) {
      console.error('[HttpApiService] API连接测试失败:', error)
      return {
        success: false,
        message: `API连接失败: ${error.message}`,
        error: error.message
      }
    }
  }

// ==================== 扩展方法（兼容性） ====================

  /**
   * 获取云服务状态（兼容性方法）
   */
  getCloudStatus() {
    return {
      initialized: this.initialized,
      useLocalMode: false,
      hasDB: true,
      mode: 'HTTP API模式'
    }
  }

  /**
   * 获取所有缴费记录（Dashboard用）
   */
  async getAllFeeRecords() {
    return await this.getFeeRecords()
  }

  /**
   * 获取系统设置
   */
  async getSystemSettings(key = 'feeSettings') {
    return await this.request('getSystemSettings', { key })
  }

  /**
   * 保存系统设置
   */
  async saveSystemSettings(key, value) {
    return await this.request('saveSystemSettings', { key, value })
  }
}

// 导出单例
const httpApiService = new HttpApiService()
export default httpApiService
