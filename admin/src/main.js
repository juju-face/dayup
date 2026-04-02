import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import './styles/index.scss'

// 导入云服务
import cloudService from './utils/cloud'

// 初始化云开发
cloudService.init()

const app = createApp(App)

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 全局注入云服务
app.config.globalProperties.$cloud = cloudService

app.use(router)
app.use(ElementPlus)
app.mount('#app')
