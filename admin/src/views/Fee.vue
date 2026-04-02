<template>
  <div class="fee-page">
    <!-- 费用设置 -->
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

    <!-- 缴费记录 -->
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
        <el-table-column prop="studentName" label="学生姓名" width="100" />
        <el-table-column prop="month" label="缴费月份" width="120" />
        <el-table-column prop="amount" label="缴费金额" width="120">
          <template #default="scope">
            <span>¥{{ scope.row.amount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="缴费状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.status === 'paid' ? 'success' : 'danger'">
              {{ scope.row.status === 'paid' ? '已缴费' : '未缴费' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="payTime" label="缴费时间" width="150" />
        <el-table-column prop="remark" label="备注" min-width="150" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <el-button
              v-if="scope.row.status !== 'paid'"
              type="success"
              size="small"
              @click="markAsPaid(scope.row)"
            >
              标记已缴
            </el-button>
            <el-button type="danger" size="small" @click="deleteRecord(scope.row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 统计信息 -->
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

    <!-- 添加缴费记录对话框 -->
    <el-dialog v-model="dialogVisible" title="记录缴费" width="500px">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-form-item label="选择学生" prop="studentId">
          <el-select v-model="form.studentId" placeholder="请选择学生" style="width: 100%">
            <el-option
              v-for="student in students"
              :key="student.id"
              :label="student.name"
              :value="student.id"
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

// 生成本月及前6个月的选项
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

// 加载费用设置
const loadSettings = () => {
  const settings = JSON.parse(localStorage.getItem('feeSettings') || '{}')
  if (settings.monthlyFee) feeSettings.monthlyFee = settings.monthlyFee
  if (settings.mealFee) feeSettings.mealFee = settings.mealFee
  if (settings.materialFee) feeSettings.materialFee = settings.materialFee
}

// 保存费用设置
const saveSettings = () => {
  localStorage.setItem('feeSettings', JSON.stringify(feeSettings))
  ElMessage.success('设置已保存')
}

// 加载学生列表
const loadStudents = () => {
  students.value = JSON.parse(localStorage.getItem('students') || '[]')
}

// 加载缴费记录
const loadFeeRecords = () => {
  loading.value = true
  const records = JSON.parse(localStorage.getItem('feeRecords') || '[]')
  
  // 筛选月份
  if (selectedMonth.value) {
    feeRecords.value = records.filter(r => r.month === selectedMonth.value)
  } else {
    feeRecords.value = records
  }
  
  // 计算统计
  calculateStatistics()
  loading.value = false
}

// 计算统计数据
const calculateStatistics = () => {
  const month = selectedMonth.value || new Date().toISOString().slice(0, 7)
  const students = JSON.parse(localStorage.getItem('students') || '[]')
  const records = JSON.parse(localStorage.getItem('feeRecords') || '[]')
  
  const monthlyFee = feeSettings.monthlyFee
  statistics.totalReceivable = students.length * monthlyFee
  
  const paidThisMonth = records
    .filter(r => r.month === month && r.status === 'paid')
    .reduce((sum, r) => sum + r.amount, 0)
  statistics.totalReceived = paidThisMonth
  statistics.totalUnpaid = statistics.totalReceivable - paidThisMonth
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
        const records = JSON.parse(localStorage.getItem('feeRecords') || '[]')
        const student = students.value.find(s => s.id === form.studentId)
        
        const newRecord = {
          id: Date.now().toString(),
          studentId: form.studentId,
          studentName: student?.name || '',
          month: form.month,
          amount: form.amount,
          status: 'paid',
          payTime: new Date().toLocaleString(),
          remark: form.remark
        }
        
        records.push(newRecord)
        localStorage.setItem('feeRecords', JSON.stringify(records))
        
        // 同步到云数据库
        const result = await cloudService.addFeeRecord(newRecord)
        
        if (result.success) {
          ElMessage.success('缴费记录已添加并同步到云数据库')
        } else {
          ElMessage.success('缴费记录已添加（云同步失败）')
        }
        
        dialogVisible.value = false
        loadFeeRecords()
      } catch (error) {
        ElMessage.error('添加失败')
        console.error('添加失败:', error)
      } finally {
        submitLoading.value = false
      }
    }
  })
}

const markAsPaid = async (row) => {
  ElMessageBox.confirm(`确定标记 "${row.studentName}" 为已缴费吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const records = JSON.parse(localStorage.getItem('feeRecords') || '[]')
      const index = records.findIndex(r => r.id === row.id)
      if (index > -1) {
        records[index].status = 'paid'
        records[index].payTime = new Date().toLocaleString()
        localStorage.setItem('feeRecords', JSON.stringify(records))
        
        // 同步到云数据库
        const result = await cloudService.updateFeeRecord(records[index])
        
        if (result.success) {
          ElMessage.success('标记成功并同步到云数据库')
        } else {
          ElMessage.success('标记成功（云同步失败）')
        }
        
        loadFeeRecords()
      }
    } catch (error) {
      ElMessage.error('标记失败')
      console.error('标记失败:', error)
    }
  })
}

const deleteRecord = async (row) => {
  ElMessageBox.confirm('确定删除这条缴费记录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const records = JSON.parse(localStorage.getItem('feeRecords') || '[]')
      const index = records.findIndex(r => r.id === row.id)
      if (index > -1) {
        records.splice(index, 1)
        localStorage.setItem('feeRecords', JSON.stringify(records))
        
        // 同步到云数据库
        const result = await cloudService.deleteFeeRecord(row.id)
        
        if (result.success) {
          ElMessage.success('删除成功并同步到云数据库')
        } else {
          ElMessage.success('删除成功（云同步失败）')
        }
        
        loadFeeRecords()
      }
    } catch (error) {
      ElMessage.error('删除失败')
      console.error('删除失败:', error)
    }
  })
}

onMounted(() => {
  selectedMonth.value = new Date().toISOString().slice(0, 7)
  loadSettings()
  loadStudents()
  loadFeeRecords()
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
