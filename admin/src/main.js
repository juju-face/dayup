import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import './styles/index.scss'

// 导入HTTP API服务（方案B：纯HTTP API模式）
import httpApiService from './utils/http-api'

// 创建应用
const app = createApp(App)

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 全局注入HTTP API服务
app.config.globalProperties.$api = httpApiService

// 添加全局错误处理
app.config.errorHandler = (err, instance, info) => {
  console.error('全局错误捕获:', err)
  console.error('错误信息:', info)
}

app.use(router)
app.use(ElementPlus)
app.mount('#app')

console.log('✅ Admin后台已启动（纯HTTP API模式）')
