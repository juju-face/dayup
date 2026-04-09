import tcb from 'tcb-js-sdk'
import { cloudConfig, adminConfig, permissionConfig } from './config'

// 简单的加密/解密函数（生产环境应使用更安全的加密方式）
function encryptData(data) {
  try {
    return btoa(JSON.stringify(data))
  } catch (error) {
    console.error('加密数据失败:', error)
    return null
  }
}

function decryptData(encryptedData) {
  try {
    return JSON.parse(atob(encryptedData))
  } catch (error) {
    console.error('解密数据失败:', error)
    return null
  }
}

class CloudService {
  constructor() {
    this.app = null
    this.db = null
    this.auth = null
    this.initialized = false
    this.envId = cloudConfig.env
    this.currentUser = null
    this.useLocalMode = false // 是否使用本地存储模式
    this.cloudStatus = 'initializing' // 云服务状态：initializing, connected, disconnected
  }

  async init() {
    if (this.initialized) {
      return
    }

    // 检查 accessKey 是否为占位符
    if (cloudConfig.accessKey === 'your-access-key-here' || !cloudConfig.accessKey) {
      console.warn('[CloudService] accessKey 未配置，切换到本地存储模式')
      this.useLocalMode = true
      this.cloudStatus = 'disconnected'
      this.initialized = true
      return
    }

    try {
      console.log('[CloudService] 初始化云开发...')
      console.log('[CloudService] tcb 对象:', tcb)
      console.log('[CloudService] tcb.init 方法:', typeof tcb.init)
      
      // 初始化云开发（使用配置文件中的 accessKey）
      this.app = tcb.init({
        // 环境 ID
        env: cloudConfig.env,
        // 地域
        region: cloudConfig.region,
        // 匿名访问令牌
        accessKey: cloudConfig.accessKey
      })

      console.log('[CloudService] app 初始化结果:', this.app)
      
      if (!this.app) {
        throw new Error('app 初始化失败')
      }

      // 检查 app 对象的方法
      console.log('[CloudService] app 对象方法:', Object.keys(this.app))
      console.log('[CloudService] app.database 方法:', typeof this.app.database)

      // 登录后获取数据库（不使用匿名登录，直接使用 accessKey）
      console.log('[CloudService] 尝试获取数据库实例...')
      this.db = this.app.database()
      
      console.log('[CloudService] 数据库实例:', this.db)
      
      if (!this.db) {
        throw new Error('database 初始化失败')
      }
      
      this.initialized = true
      this.cloudStatus = 'connected'
      console.log('[CloudService] 云开发初始化成功！')
      
    } catch (error) {
      console.error('[CloudService] 云开发初始化失败:', error)
      console.error('[CloudService] 错误详情:', JSON.stringify(error, null, 2))
      
      // 初始化失败时切换到本地存储模式
      console.warn('[CloudService] 切换到本地存储模式')
      this.useLocalMode = true
      this.cloudStatus = 'disconnected'
      this.initialized = true
    }
  }

  // 获取云服务状态
  getCloudStatus() {
    return {
      status: this.cloudStatus,
      useLocalMode: this.useLocalMode,
      initialized: this.initialized
    }
  }

  // 检查是否使用本地模式
  isLocalMode() {
    return this.useLocalMode
  }

  async ensureInit() {
    if (!this.initialized) {
      await this.init()
    }
    
    // 如果使用本地模式，不检查 db
    if (this.useLocalMode) {
      return
    }
    
    if (!this.db) {
      throw new Error('数据库未初始化')
    }
  }

  // ==================== 认证相关 ====================

  async login(username, password) {
    console.log('[CloudService] 登录验证...')
    
    if (username === adminConfig.defaultUsername && password === adminConfig.defaultPassword) {
      const user = {
        _id: 'admin',
        username: adminConfig.defaultUsername,
        name: '管理员',
        loginTime: new Date().toISOString()
      }
      this.currentUser = user
      // 使用加密存储用户信息
      const encryptedUser = encryptData(user)
      if (encryptedUser) {
        localStorage.setItem('admin_user', encryptedUser)
      }
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

  async checkLoginStatus() {
    const userStr = localStorage.getItem('admin_user')
    if (userStr) {
      // 解密用户信息
      const user = decryptData(userStr)
      if (user) {
        this.currentUser = user
        return {
          isLoggedIn: true,
          user: this.currentUser
        }
      }
    }
    
    return {
      isLoggedIn: false,
      user: null
    }
  }

  async logout() {
    this.currentUser = null
    localStorage.removeItem('admin_user')
    
    return {
      success: true,
      message: '退出成功'
    }
  }

  async initAdmin() {
    return {
      success: true,
      message: `初始化成功，请使用 ${adminConfig.defaultUsername}/${adminConfig.defaultPassword} 登录`,
      data: {
        username: adminConfig.defaultUsername,
        password: adminConfig.defaultPassword
      }
    }
  }

  // ==================== 权限控制 ====================

  // 检查用户是否有某个权限
  hasPermission(permission) {
    if (!this.currentUser) {
      return false
    }
    
    // 默认管理员拥有所有权限
    const userRole = this.currentUser.role || 'admin'
    const roleConfig = permissionConfig.roles[userRole]
    
    if (!roleConfig) {
      return false
    }
    
    return roleConfig.permissions.includes(permission) || roleConfig.permissions.includes('all')
  }

  // 检查用户是否可以访问某个路由
  canAccessRoute(routePath) {
    if (!this.currentUser) {
      return false
    }
    
    const userRole = this.currentUser.role || 'admin'
    const allowedRoles = permissionConfig.routePermissions[routePath]
    
    if (!allowedRoles) {
      return true // 如果没有配置权限，默认允许访问
    }
    
    return allowedRoles.includes(userRole)
  }

  // 获取用户的角色信息
  getUserRole() {
    if (!this.currentUser) {
      return null
    }
    
    return this.currentUser.role || 'admin'
  }

  // ==================== 本地存储操作（降级模式） ====================

  // 获取本地存储的集合数据
  _getLocalCollection(collection) {
    const data = localStorage.getItem(`cloud_${collection}`)
    return data ? JSON.parse(data) : []
  }

  // 保存本地存储的集合数据
  _saveLocalCollection(collection, data) {
    localStorage.setItem(`cloud_${collection}`, JSON.stringify(data))
  }

  // 生成本地唯一ID
  _generateLocalId() {
    return 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  // ==================== 数据库操作 ====================

  async addDocument(collection, data) {
    await this.ensureInit()

    // 本地存储模式
    if (this.useLocalMode) {
      try {
        console.log('[CloudService] 本地模式：添加文档...')
        const localData = this._getLocalCollection(collection)
        const newItem = {
          _id: this._generateLocalId(),
          ...data,
          createTime: new Date().toISOString(),
          updateTime: new Date().toISOString()
        }
        localData.push(newItem)
        this._saveLocalCollection(collection, localData)
        console.log('[CloudService] 本地模式：添加文档成功')
        return {
          success: true,
          data: newItem,
          message: '添加成功（本地模式）'
        }
      } catch (error) {
        console.error('[CloudService] 本地模式：添加文档失败:', error)
        return {
          success: false,
          message: error.message || '添加失败'
        }
      }
    }

    // 云开发模式
    try {
      console.log('[CloudService] 准备添加文档...')
      console.log('[CloudService] collection:', collection)

      const result = await this.db.collection(collection).add({
        data: {
          ...data,
          createTime: new Date(),
          updateTime: new Date()
        }
      })

      console.log('[CloudService] 添加文档成功:', result)
      return {
        success: true,
        data: { _id: result.id, ...data },
        message: '添加成功'
      }
    } catch (error) {
      console.error('[CloudService] 添加文档失败:', error)
      return {
        success: false,
        message: error.message || '添加失败'
      }
    }
  }

  async updateDocument(collection, data) {
    await this.ensureInit()

    // 本地存储模式
    if (this.useLocalMode) {
      try {
        console.log('[CloudService] 本地模式：更新文档...')
        const { _id, ...updateData } = data
        const localData = this._getLocalCollection(collection)
        const index = localData.findIndex(item => item._id === _id)

        if (index === -1) {
          return {
            success: false,
            message: '文档不存在'
          }
        }

        localData[index] = {
          ...localData[index],
          ...updateData,
          updateTime: new Date().toISOString()
        }
        this._saveLocalCollection(collection, localData)
        console.log('[CloudService] 本地模式：更新文档成功')
        return {
          success: true,
          message: '更新成功（本地模式）'
        }
      } catch (error) {
        console.error('[CloudService] 本地模式：更新文档失败:', error)
        return {
          success: false,
          message: error.message
        }
      }
    }

    // 云开发模式
    try {
      const { _id, ...updateData } = data

      const result = await this.db.collection(collection).doc(_id).update({
        data: {
          ...updateData,
          updateTime: new Date()
        }
      })

      console.log('[CloudService] 更新文档成功:', result)
      return {
        success: true,
        message: '更新成功'
      }
    } catch (error) {
      console.error('[CloudService] 更新文档失败:', error)
      return {
        success: false,
        message: error.message
      }
    }
  }

  async deleteDocument(collection, _id) {
    await this.ensureInit()

    // 本地存储模式
    if (this.useLocalMode) {
      try {
        console.log('[CloudService] 本地模式：删除文档...')
        const localData = this._getLocalCollection(collection)
        const filteredData = localData.filter(item => item._id !== _id)
        this._saveLocalCollection(collection, filteredData)
        console.log('[CloudService] 本地模式：删除文档成功')
        return {
          success: true,
          message: '删除成功（本地模式）'
        }
      } catch (error) {
        console.error('[CloudService] 本地模式：删除文档失败:', error)
        return {
          success: false,
          message: error.message
        }
      }
    }

    // 云开发模式
    try {
      const result = await this.db.collection(collection).doc(_id).remove()

      console.log('[CloudService] 删除文档成功:', result)
      return {
        success: true,
        message: '删除成功'
      }
    } catch (error) {
      console.error('[CloudService] 删除文档失败:', error)
      return {
        success: false,
        message: error.message
      }
    }
  }

  async queryDocuments(collection, query = {}) {
    await this.ensureInit()

    // 本地存储模式
    if (this.useLocalMode) {
      try {
        console.log('[CloudService] 本地模式：查询文档...')
        let localData = this._getLocalCollection(collection)

        // 简单的排序处理
        if (query.orderBy) {
          localData.sort((a, b) => {
            const field = query.orderBy.field
            const direction = query.orderBy.direction || 'desc'
            const aVal = a[field] || ''
            const bVal = b[field] || ''
            if (direction === 'desc') {
              return bVal > aVal ? 1 : -1
            } else {
              return aVal > bVal ? 1 : -1
            }
          })
        }

        // 简单的分页处理
        if (query.skip) {
          localData = localData.slice(query.skip)
        }
        if (query.limit) {
          localData = localData.slice(0, query.limit)
        }

        console.log('[CloudService] 本地模式：查询文档成功')
        return {
          success: true,
          data: localData,
          message: '查询成功（本地模式）'
        }
      } catch (error) {
        console.error('[CloudService] 本地模式：查询文档失败:', error)
        return {
          success: false,
          message: error.message,
          data: []
        }
      }
    }

    // 云开发模式
    try {
      console.log('[CloudService] 查询文档...')
      console.log('[CloudService] collection:', collection)

      let dbQuery = this.db.collection(collection)

      if (query.where) {
        dbQuery = dbQuery.where(query.where)
      }

      if (query.orderBy) {
        dbQuery = dbQuery.orderBy(query.orderBy.field, query.orderBy.direction || 'desc')
      }

      if (query.limit) {
        dbQuery = dbQuery.limit(query.limit)
      }

      if (query.skip) {
        dbQuery = dbQuery.skip(query.skip)
      }

      const result = await dbQuery.get()

      console.log('[CloudService] 查询文档成功:', result)
      return {
        success: true,
        data: result.data || [],
        message: '查询成功'
      }
    } catch (error) {
      console.error('[CloudService] 查询文档失败:', error)
      return {
        success: false,
        message: error.message,
        data: []
      }
    }
  }

  // ==================== 学生相关 ====================

  async addStudent(data) {
    return await this.addDocument('students', data)
  }

  async updateStudent(data) {
    return await this.updateDocument('students', data)
  }

  async deleteStudent(id) {
    return await this.deleteDocument('students', id)
  }

  async getAllStudents() {
    return await this.queryDocuments('students', {
      orderBy: { field: 'createTime', direction: 'desc' }
    })
  }

  // ==================== 费用相关 ====================

  async addFeeRecord(data) {
    return await this.addDocument('fee', data)
  }

  async updateFeeRecord(data) {
    return await this.updateDocument('fee', data)
  }

  async deleteFeeRecord(_id) {
    return await this.deleteDocument('fee', _id)
  }

  async getAllFeeRecords() {
    return await this.queryDocuments('fee', {
      orderBy: { field: 'createTime', direction: 'desc' }
    })
  }
}

const cloudService = new CloudService()
export default cloudService
