import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    server: {
      port: 3000,
      open: true,
      // 配置代理解决跨域问题
      proxy: {
        '/api': {
          target: 'https://dayup-02-8gpzk22z15cf48a9.service.tcloudbase.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    },
    define: {
      // 将环境变量注入到客户端
      __APP_ENV__: JSON.stringify(env)
    }
  }
})
