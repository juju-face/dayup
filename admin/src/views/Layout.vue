<template>
  <el-container class="layout-container">
    <!-- 侧边栏 -->
    <el-aside width="200px" class="sidebar">
      <div class="logo">
        <h2>DayUp 后台</h2>
      </div>
      <el-menu
        :default-active="activeMenu"
        class="sidebar-menu"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
        router
      >
        <el-menu-item index="/dashboard">
          <el-icon><Odometer /></el-icon>
          <span>数据概览</span>
        </el-menu-item>
        <el-menu-item index="/students">
          <el-icon><User /></el-icon>
          <span>学生管理</span>
        </el-menu-item>
        <el-menu-item index="/teachers">
          <el-icon><Avatar /></el-icon>
          <span>老师管理</span>
        </el-menu-item>
        <el-menu-item index="/fee">
          <el-icon><Money /></el-icon>
          <span>费用管理</span>
        </el-menu-item>
        <el-menu-item index="/data-fix">
          <el-icon><Tools /></el-icon>
          <span>数据修复</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <!-- 顶部导航 -->
      <el-header class="header">
        <div class="header-left">
          <span class="breadcrumb">{{ pageTitle }}</span>
        </div>
        <div class="header-right">
          <!-- 云服务状态提示 - 只在非默认状态时显示 -->
          <template v-if="isLocalMode">
            <el-tag type="warning" effect="dark" class="cloud-status-tag">
              <el-icon><Warning /></el-icon>
              本地模式
            </el-tag>
          </template>
          <template v-else-if="cloudStatus.status === 'connected'">
            <el-tag type="success" effect="plain" class="cloud-status-tag">
              <el-icon><CircleCheck /></el-icon>
              云服务已连接
            </el-tag>
          </template>
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-icon><UserFilled /></el-icon>
              {{ username }}
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 主内容区 -->
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import cloudService from '../utils/cloud'

const route = useRoute()
const router = useRouter()

const activeMenu = computed(() => route.path)
const pageTitle = computed(() => route.meta.title || '数据概览')
const username = computed(() => localStorage.getItem('admin_username') || '管理员')

// 云服务状态
const cloudStatus = ref({
  status: 'initializing',
  useLocalMode: false,
  initialized: false
})

// 获取云服务状态
const getCloudStatus = () => {
  cloudStatus.value = cloudService.getCloudStatus()
}

// 判断是否在本地模式
const isLocalMode = computed(() => cloudStatus.value.useLocalMode)

onMounted(() => {
  getCloudStatus()
})

const handleCommand = (command) => {
  if (command === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      localStorage.removeItem('admin_logged_in')
      localStorage.removeItem('admin_username')
      ElMessage.success('已退出登录')
      router.push('/login')
    })
  }
}
</script>

<style scoped lang="scss">
.layout-container {
  height: 100vh;
}

.sidebar {
  background-color: #304156;
  
  .logo {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid #1f2d3d;
    
    h2 {
      color: #fff;
      font-size: 18px;
      margin: 0;
    }
  }
  
  .sidebar-menu {
    border-right: none;
  }
}

.header {
  background-color: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  
  .breadcrumb {
    font-size: 16px;
    font-weight: 500;
    color: #333;
  }
  
  .user-info {
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #606266;
    
    &:hover {
      color: #409eff;
    }
  }
  
  .cloud-status-tag {
    margin-right: 16px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

.main-content {
  background-color: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}
</style>
