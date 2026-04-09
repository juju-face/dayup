<template>
  <div class="fee-page">
    <el-card class="settings-card">
      <template #header>
        <div class="card-header">
          <span>费用设置</span>
        </div>
      </template>
      <el-form :model="feeSettings" label-width="120px">
        <el-form-item label="月托管费用">
          <el-input-number v-model="feeSettings.monthlyFee" :min="0" :step="100" />
          <span class="unit">元/月</span>
        </el-form-item>
        <el-form-item label="餐费">
          <el-input-number v-model="feeSettings.mealFee" :min="0" :step="50" />
          <span class="unit">元/月</span>
        </el-form-item>
        <el-form-item label="材料费">
          <el-input-number v-model="feeSettings.materialFee" :min="0" :step="50" />
          <span class="unit">元/学期</span>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="saveSettings">保存设置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="records-card">
      <template #header>
        <div class="card-header">
          <span>缴费记录</span>
          <div class="header-actions">
            <el-select v-model="selectedMonth" placeholder="选择月份" @change="loadFeeRecords">
              <el-option
                v-for="month in monthOptions"
                :key="month"
                :label="month"
                :value="month"
              />
            </el-select>
            <el-button type="primary" @click="showAddFeeDialog">
              <el-icon><Plus /></el-icon>
              记录缴费
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="feeRecords" v-loading="loading" stripe>
        <el-table-column prop="studentName" label="学生姓名" min-width="100" />
        <el-table-column prop="payDate" label="缴费日期" min-width="120" />
        <el-table-column prop="amount" label="缴费金额" min-width="100">
          <template #default="scope">
            <span>¥{{ scope.row.amount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="缴费状态" min-width="100">
          <template #default="scope">
            <el-tag :type="scope.row.status === 'paid' ? 'success' : 'danger'">
              {{ scope.row.status === 'paid' ? '已缴费' : '未缴费' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="120" />
      </el-table>
    </el-card>

    <el-row :gutter="20" class="statistics-row">
      <el-col :span="8">
        <el-card>
          <div class="stat-item">
            <div class="stat-label">本月应收</div>
            <div class="stat-value">¥{{ statistics.totalReceivable }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <div class="stat-item">
            <div class="stat-label">本月实收</div>
            <div class="stat-value success">¥{{ statistics.totalReceived }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <div class="stat-item">
            <div class="stat-label">未缴金额</div>
            <div class="stat-value danger">¥{{ statistics.totalUnpaid }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="dialogVisible" title="记录缴费" width="500px">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-form-item label="选择学生" prop="studentId">
          <el-select v-model="form.studentId" placeholder="请选择学生" style="width: 100%">
            <el-option
              v-for="student in students"
              :key="student._id || student.id"
              :label="student.name"
              :value="student._id || student.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="缴费月份" prop="month">
          <el-date-picker
            v-model="form.month"
            type="month"
            placeholder="选择月份"
            value-format="YYYY-MM"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="缴费金额" prop="amount">
          <el-input-number v-model="form.amount" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" rows="2" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import cloudService from '../utils/cloud'

const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const formRef = ref(null)

const feeSettings = reactive({
  monthlyFee: 1500,
  mealFee: 300,
  materialFee: 200
})

const selectedMonth = ref('')
const feeRecords = ref([])
const students = ref([])

const form = reactive({
  studentId: '',
  month: '',
  amount: 1500,
  remark: ''
})

const formRules = {
  studentId: [{ required: true, message: '请选择学生', trigger: 'change' }],
  month: [{ required: true, message: '请选择月份', trigger: 'change' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }]
}

const formatTime = (time) => {
  if (!time) return ''
  const date = new Date(time)
  return date.toLocaleString('zh-CN')
}

const monthOptions = computed(() => {
  const options = []
  const now = new Date()
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    options.push(d.toISOString().slice(0, 7))
  }
  return options
})

const statistics = reactive({
  totalReceivable: 0,
  totalReceived: 0,
  totalUnpaid: 0
})

const loadSettings = async () => {
  try {
    // 优先从云端加载
    const result = await cloudService.getSystemSettings('feeSettings')
    if (result.success && result.data) {
      const settings = typeof result.data === 'string' ? JSON.parse(result.data) : result.data
      // 使用 !== undefined 判断，支持 0 值
      if (settings.monthlyFee !== undefined) feeSettings.monthlyFee = settings.monthlyFee
      if (settings.mealFee !== undefined) feeSettings.mealFee = settings.mealFee
      if (settings.materialFee !== undefined) feeSettings.materialFee = settings.materialFee
      console.log('[费用管理] 从云端加载设置成功:', settings)
    } else {
      // 云端没有，从 localStorage 加载
      const settings = JSON.parse(localStorage.getItem('feeSettings') || '{}')
      if (settings.monthlyFee !== undefined) feeSettings.monthlyFee = settings.monthlyFee
      if (settings.mealFee !== undefined) feeSettings.mealFee = settings.mealFee
      if (settings.materialFee !== undefined) feeSettings.materialFee = settings.materialFee
      console.log('[费用管理] 从本地加载设置成功:', settings)
    }
  } catch (error) {
    console.error('[费用管理] 加载设置失败:', error)
    // 降级到 localStorage
    const settings = JSON.parse(localStorage.getItem('feeSettings') || '{}')
    if (settings.monthlyFee !== undefined) feeSettings.monthlyFee = settings.monthlyFee
    if (settings.mealFee !== undefined) feeSettings.mealFee = settings.mealFee
    if (settings.materialFee !== undefined) feeSettings.materialFee = settings.materialFee
  }
}

const saveSettings = async () => {
  try {
    // 同时保存到云端和 localStorage
    const settingsData = {
      monthlyFee: feeSettings.monthlyFee,
      mealFee: feeSettings.mealFee,
      materialFee: feeSettings.materialFee
    }
    
    // 保存到云端
    const result = await cloudService.saveSystemSettings('feeSettings', settingsData)
    if (result.success) {
      console.log('[费用管理] 保存到云端成功')
    } else {
      console.warn('[费用管理] 保存到云端失败:', result.message)
    }
    
    // 同时保存到 localStorage 作为备份
    localStorage.setItem('feeSettings', JSON.stringify(settingsData))
    
    ElMessage.success('设置已保存（已同步到云端）')
    calculateStatistics()
  } catch (error) {
    console.error('[费用管理] 保存设置失败:', error)
    // 即使云端失败，也保存到 localStorage
    const settingsData = {
      monthlyFee: feeSettings.monthlyFee,
      mealFee: feeSettings.mealFee,
      materialFee: feeSettings.materialFee
    }
    localStorage.setItem('feeSettings', JSON.stringify(settingsData))
    ElMessage.warning('设置已保存到本地（云端同步失败）')
    calculateStatistics()
  }
}

const loadStudents = async () => {
  try {
    const result = await cloudService.getAllStudents()
    if (result.success) {
      students.value = result.data
    }
  } catch (error) {
    console.error('加载学生列表失败:', error)
  }
}

const loadFeeRecords = async () => {
  loading.value = true
  try {
    console.log('[费用管理] 开始加载缴费记录...')
    const result = await cloudService.getAllFeeRecords()
    console.log('[费用管理] 加载缴费记录结果:', result)
    
    if (result.success) {
      let records = result.data || []
      console.log('[费用管理] 原始记录数量:', records.length)
      
      if (selectedMonth.value) {
        // 根据 payDate 字段过滤（payDate 格式为 '2026-04-07'）
        records = records.filter(r => {
          if (!r.payDate) return false
          return r.payDate.startsWith(selectedMonth.value)
        })
      }
      
      feeRecords.value = records
      calculateStatistics()
    } else {
      console.error('[费用管理] 加载失败:', result.message)
    }
  } catch (error) {
    console.error('加载缴费记录失败:', error)
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

const calculateStatistics = () => {
  const month = selectedMonth.value || new Date().toISOString().slice(0, 7)
  const monthlyFee = feeSettings.monthlyFee || 1500
  
  // 该月所有已缴费记录的实际金额之和（与 Dashboard 保持一致）
  const paidRecords = feeRecords.value.filter(r => {
    return r.payDate && r.payDate.startsWith(month) && r.status === 'paid'
  })
  statistics.totalReceived = paidRecords.reduce((sum, r) => sum + (r.amount || 0), 0)
  
  // 已缴费学生数
  const paidStudentIds = new Set(paidRecords.map(r => r.studentId))
  const paidCount = paidStudentIds.size
  const unpaidCount = students.value.length - paidCount
  
  // 未缴金额 = 未缴费学生数 × 托管费
  statistics.totalUnpaid = unpaidCount * monthlyFee
  // 应收 = 实收 + 未缴（总金额）
  statistics.totalReceivable = statistics.totalReceived + statistics.totalUnpaid
}

const showAddFeeDialog = () => {
  form.studentId = ''
  form.month = new Date().toISOString().slice(0, 7)
  form.amount = feeSettings.monthlyFee
  form.remark = ''
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitLoading.value = true
      
      try {
        const student = students.value.find(s => (s._id || s.id) === form.studentId)
        
        const newRecord = {
          studentId: form.studentId,
          studentName: student?.name || '',
          month: form.month,
          amount: form.amount,
          status: 'paid',
          payTime: new Date(),
          remark: form.remark
        }
        
        const result = await cloudService.addFeeRecord(newRecord)
        
        if (result.success) {
          ElMessage.success('缴费记录已添加')
          dialogVisible.value = false
          await loadFeeRecords()
        } else {
          ElMessage.error(result.message || '添加失败')
        }
      } catch (error) {
        ElMessage.error('添加失败')
        console.error('添加失败:', error)
      } finally {
        submitLoading.value = false
      }
    }
  })
}

onMounted(async () => {
  selectedMonth.value = new Date().toISOString().slice(0, 7)
  await loadSettings()
  await loadStudents()
  await loadFeeRecords()
})
</script>

<style scoped lang="scss">
.fee-page {
  .settings-card {
    margin-bottom: 20px;

    .unit {
      margin-left: 10px;
      color: #666;
    }
  }

  .records-card {
    margin-bottom: 20px;

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .header-actions {
        display: flex;
        gap: 10px;
      }
    }
  }

  .statistics-row {
    .stat-item {
      text-align: center;

      .stat-label {
        font-size: 14px;
        color: #666;
        margin-bottom: 10px;
      }

      .stat-value {
        font-size: 28px;
        font-weight: bold;
        color: #409eff;

        &.success {
          color: #67c23a;
        }

        &.danger {
          color: #f56c6c;
        }
      }
    }
  }
}
</style>
