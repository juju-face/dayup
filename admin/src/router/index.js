import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Layout from '../views/Layout.vue'
import Dashboard from '../views/Dashboard.vue'
import Students from '../views/Students.vue'
import Fee from '../views/Fee.vue'

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
        path: 'fee',
        name: 'Fee',
        component: Fee,
        meta: { title: '费用管理', icon: 'Money' }
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
  const isLoggedIn = localStorage.getItem('admin_logged_in') === 'true'
  
  if (to.meta.public) {
    next()
  } else if (!isLoggedIn) {
    next('/login')
  } else {
    next()
  }
})

export default router
