// 云服务配置
export const cloudConfig = {
  env: "dayup-02-8gpzk22z15cf48a9",
  region: "ap-shanghai",
  // 注意：在生产环境中，应该使用环境变量或安全的配置管理系统
  // 这里暂时使用占位符，实际部署时需要替换为真实的accessKey
  accessKey: import.meta.env.VITE_APP_TCB_ACCESS_KEY || "your-access-key-here"
}

// 管理员账户配置
export const adminConfig = {
  // 注意：在生产环境中，应该使用加密存储或从后端获取
  defaultUsername: "admin",
  defaultPassword: "123456"
}

// 权限配置
export const permissionConfig = {
  roles: {
    admin: {
      name: "管理员",
      permissions: ["dashboard", "students", "fee", "all"]
    },
    operator: {
      name: "操作员",
      permissions: ["dashboard", "students"]
    }
  },
  // 路由权限映射
  routePermissions: {
    "/dashboard": ["admin", "operator"],
    "/students": ["admin", "operator"],
    "/fee": ["admin"]
  }
}

// API配置
export const apiConfig = {
  // 云函数 HTTP 触发器地址
  baseURL: import.meta.env.VITE_APP_API_BASE_URL || 'https://dayup-02-8gpzk22z15cf48a9.service.tcloudbase.com/api'
}
