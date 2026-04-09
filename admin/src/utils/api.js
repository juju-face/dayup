import axios from 'axios'
import { apiConfig } from './config'

// 云函数 HTTP 触发器地址
const API_BASE_URL = apiConfig.baseURL

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
apiClient.interceptors.request.use(
  config => {
    console.log('API 请求:', config.url, config.data)
    return config
  },
  error => {
    console.error('API 请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
apiClient.interceptors.response.use(
  response => {
    console.log('API 响应:', response.data)
    // 云函数 HTTP 触发器返回的数据在 body 中
    if (response.data && response.data.body) {
      try {
        return JSON.parse(response.data.body)
      } catch (e) {
        return response.data.body
      }
    }
    return response.data
  },
  error => {
    console.error('API 响应错误:', error)
    return {
      success: false,
      message: error.message || '网络请求失败'
    }
  }
)

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL
  }

  // ==================== 学生相关操作 ====================

  // 添加学生
  async addStudent(data) {
    try {
      const result = await apiClient.post('', {
        action: 'addStudent',
        data
      })
      return result
    } catch (error) {
      console.error('添加学生失败:', error)
      return { success: false, message: error.message }
    }
  }

  // 更新学生
  async updateStudent(data) {
    try {
      const result = await apiClient.post('', {
        action: 'updateStudent',
        data
      })
      return result
    } catch (error) {
      console.error('更新学生失败:', error)
      return { success: false, message: error.message }
    }
  }

  // 删除学生
  async deleteStudent(id) {
    try {
      const result = await apiClient.post('', {
        action: 'deleteStudent',
        data: { id }
      })
      return result
    } catch (error) {
      console.error('删除学生失败:', error)
      return { success: false, message: error.message }
    }
  }

  // 获取学生列表
  async getAllStudents() {
    try {
      const result = await apiClient.post('', {
        action: 'getAllStudents',
        data: {}
      })
      return result
    } catch (error) {
      console.error('获取学生列表失败:', error)
      return { success: false, message: error.message }
    }
  }

  // ==================== 费用相关操作 ====================

  // 添加缴费记录
  async addFeeRecord(data) {
    try {
      const result = await apiClient.post('', {
        action: 'addFeeRecord',
        data
      })
      return result
    } catch (error) {
      console.error('添加缴费记录失败:', error)
      return { success: false, message: error.message }
    }
  }

  // 更新缴费记录
  async updateFeeRecord(data) {
    try {
      const result = await apiClient.post('', {
        action: 'updateFeeRecord',
        data
      })
      return result
    } catch (error) {
      console.error('更新缴费记录失败:', error)
      return { success: false, message: error.message }
    }
  }

  // 删除缴费记录
  async deleteFeeRecord(id) {
    try {
      const result = await apiClient.post('', {
        action: 'deleteFeeRecord',
        data: { _id: id }
      })
      return result
    } catch (error) {
      console.error('删除缴费记录失败:', error)
      return { success: false, message: error.message }
    }
  }
}

// 导出单例
const apiService = new ApiService()

export default apiService
