<template>
  <div class="data-fix-container">
    <el-card shadow="hover" class="fix-card">
      <template #header>
        <div class="card-header">
          <span class="header-title">数据修复工具</span>
          <el-tag type="warning">管理员专用</el-tag>
        </div>
      </template>

      <div class="fix-content">
        <el-alert 
          title="此工具用于修复学生数据中的status字段，将没有status字段的学生设置为'在读'状态。" 
          type="info" 
          :closable="false"
          show-icon
          class="fix-alert"
        />

        <el-descriptions :column="1" border class="status-info">
          <el-descriptions-item label="修复目标">
            <el-tag type="warning">status字段不存在的学生</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="修复值">
            <el-tag type="success">active（在读）</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="影响">
            <span>修复后学生状态将显示为"在读"</span>
          </el-descriptions-item>
        </el-descriptions>

        <div class="fix-actions">
          <el-button 
            type="primary" 
            size="large" 
            @click="runFix" 
            :loading="loading"
            :disabled="completed"
          >
            {{ completed ? '修复完成' : '开始修复' }}
          </el-button>

          <el-button 
            type="info" 
            size="large" 
            @click="checkStatus" 
            :loading="checking"
            v-if="!completed"
          >
            检查状态
          </el-button>
        </div>

        <div v-if="result" class="result-panel">
          <el-divider>修复结果</el-divider>
          
          <el-result 
            v-if="result.success" 
            icon="success" 
            :title="result.message"
            :sub-title="`共修复 ${result.updatedCount || 0} 条学生记录`"
          />
          
          <el-result 
            v-else 
            icon="error" 
            title="修复失败"
            :sub-title="result.message"
          />

          <el-descriptions :column="1" border v-if="result.details">
            <el-descriptions-item label="修复数量">
              <el-tag type="success">{{ result.updatedCount || 0 }} 条</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="执行时间">
              {{ new Date().toLocaleString('zh-CN') }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <el-alert 
          v-if="completed" 
          title="修复已完成！所有学生数据已更新。" 
          type="success" 
          show-icon
          :closable="false"
          class="success-alert"
        />
      </div>
    </el-card>

    <!-- 确认对话框 -->
    <el-dialog
      v-model="confirmVisible"
      title="确认执行修复"
      width="400px"
    >
      <p>你确定要执行数据修复吗？此操作将：</p>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>查询所有没有status字段的学生</li>
        <li>将他们的status设置为'active'（在读）</li>
        <li>更新updateTime时间戳</li>
      </ul>
      <p style="color: #e6a23c; margin-top: 15px;">
        <el-icon><Warning /></el-icon>
        此操作不可撤销，请谨慎操作！
      </p>
      <template #footer>
        <el-button @click="confirmVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmFix" :loading="loading">
          确认修复
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Warning } from '@element-plus/icons-vue'
import cloudService from '../utils/cloud'

const loading = ref(false)
const checking = ref(false)
const completed = ref(false)
const confirmVisible = ref(false)
const result = ref(null)

const runFix = () => {
  confirmVisible.value = true
}

const confirmFix = async () => {
  confirmVisible.value = false
  loading.value = true
  result.value = null

  try {
    const res = await cloudService.batchUpdateStudentStatus({ limit: 500 })
    
    if (res.success) {
      result.value = {
        success: true,
        message: res.message || '数据修复成功',
        updatedCount: res.updatedCount || 0,
        details: res
      }
      ElMessage.success(`修复成功！共更新 ${res.updatedCount || 0} 条记录`)
      completed.value = true
    } else {
      result.value = {
        success: false,
        message: res.message || '修复失败'
      }
      ElMessage.error(res.message || '修复失败')
    }
  } catch (error) {
    console.error('修复失败:', error)
    result.value = {
      success: false,
      message: error.message || '执行失败'
    }
    ElMessage.error('修复失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

const checkStatus = async () => {
  checking.value = true
  
  try {
    // 获取没有status字段的学生数量
    const res = await cloudService.getAllStudents({ limit: 1 })
    
    if (res.success && res.data && res.data.length > 0) {
      const sample = res.data[0]
      const hasStatus = sample.status !== undefined
      
      if (hasStatus) {
        ElMessage.info(`数据状态正常，学生已有status字段: ${sample.status}`)
      } else {
        ElMessage.warning(`发现异常数据，学生缺少status字段，需要修复`)
      }
    } else {
      ElMessage.info('暂无学生数据或无法获取状态')
    }
  } catch (error) {
    console.error('检查失败:', error)
    ElMessage.error('检查失败: ' + error.message)
  } finally {
    checking.value = false
  }
}
</script>

<style scoped>
.data-fix-container {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.fix-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  font-size: 18px;
  font-weight: bold;
}

.fix-content {
  padding: 20px 0;
}

.fix-alert {
  margin-bottom: 20px;
}

.status-info {
  margin: 30px 0;
}

.fix-actions {
  margin: 40px 0;
  text-align: center;
}

.fix-actions .el-button {
  margin: 0 10px;
  min-width: 120px;
}

.result-panel {
  margin-top: 30px;
  padding: 20px;
  background-color: #f5f7fa;
  border-radius: 8px;
}

.success-alert {
  margin-top: 20px;
}
</style>
