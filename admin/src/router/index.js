import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Layout from '../views/Layout.vue'
import Dashboard from '../views/Dashboard.vue'
import Students from '../views/Students.vue'
import Teachers from '../views/Teachers.vue'
import Fee from '../views/Fee.vue'
import DataFix from '../views/DataFix.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { public: true }
  },
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: Dashboard,
        meta: { title: '数据概览', icon: 'Odometer' }
      },
      {
        path: 'students',
        name: 'Students',
        component: Students,
        meta: { title: '学生管理', icon: 'User' }
      },
      {
        path: 'teachers',
        name: 'Teachers',
        component: Teachers,
        meta: { title: '老师管理', icon: 'Avatar' }
      },
      {
        path: 'fee',
        name: 'Fee',
        component: Fee,
        meta: { title: '费用管理', icon: 'Money' }
      },
      {
        path: 'data-fix',
        name: 'DataFix',
        component: DataFix,
        meta: { title: '数据修复', icon: 'Tools', adminOnly: true }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const isLoggedIn = !!localStorage.getItem('admin_user')
  
  if (to.meta.public) {
    next()
  } else if (!isLoggedIn) {
    next('/login')
  } else {
    // 检查权限
    const userStr = localStorage.getItem('admin_user')
    if (userStr) {
      // 解密函数 - 支持JSON和base64两种格式
      function decryptData(encryptedData) {
        try {
          // 先尝试作为JSON解析（新格式）
          return JSON.parse(encryptedData)
        } catch (e) {
          try {
            // 如果失败，尝试base64解密（旧格式）
            return JSON.parse(atob(encryptedData))
          } catch (error) {
            console.error('解密数据失败:', error)
            return null
          }
        }
      }
      
      const user = decryptData(userStr)
      const userRole = user?.role || 'admin'
      
      // 检查路由权限
      const routePath = to.path
      const allowedRoles = {
        '/dashboard': ['admin', 'operator'],
        '/students': ['admin', 'operator'],
        '/teachers': ['admin'],
        '/fee': ['admin'],
        '/data-fix': ['admin']
      }
      
      const routeAllowedRoles = allowedRoles[routePath]
      if (routeAllowedRoles && !routeAllowedRoles.includes(userRole)) {
        next('/dashboard') // 无权限时重定向到dashboard
        return
      }
    }
    next()
  }
})

export default router
