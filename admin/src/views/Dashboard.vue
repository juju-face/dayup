<template>
  <div class="dashboard">
    <el-row :gutter="20" class="statistics-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon student">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.totalStudents }}</div>
              <div class="stat-label">总学生数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon parent">
              <el-icon><UserFilled /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.totalParents }}</div>
              <div class="stat-label">家长数量</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon fee">
              <el-icon><Money /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">¥{{ statistics.totalFee }}</div>
              <div class="stat-label">本月应收</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon paid">
              <el-icon><CircleCheck /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">¥{{ statistics.paidFee }}</div>
              <div class="stat-label">本月实收</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-row">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>年级分布</span>
            </div>
          </template>
          <div ref="gradeChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>缴费情况统计</span>
            </div>
          </template>
          <div ref="feeChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="quick-actions">
      <template #header>
        <div class="card-header">
          <span>快捷操作</span>
        </div>
      </template>
      <div class="action-buttons">
        <el-button type="primary" size="large" @click="$router.push('/students')">
          <el-icon><Plus /></el-icon>
          添加学生
        </el-button>
        <el-button type="success" size="large" @click="$router.push('/fee')">
          <el-icon><Money /></el-icon>
          设置费用
        </el-button>
        <el-button type="warning" size="large" @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新数据
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import cloudService from '../utils/cloud'

const gradeChartRef = ref(null)
const feeChartRef = ref(null)
const loading = ref(false)

const statistics = ref({
  totalStudents: 0,
  totalParents: 0,
  totalFee: 0,
  paidFee: 0
})

let studentsCache = []
let feeRecordsCache = []

const initData = async () => {
  loading.value = true
  try {
    const [studentsResult, feeRecordsResult, settingsResult] = await Promise.all([
      cloudService.getAllStudents(),
      cloudService.getAllFeeRecords(),
      cloudService.getSystemSettings('feeSettings')
    ])

    if (studentsResult.success) {
      studentsCache = studentsResult.data
    }

    if (feeRecordsResult.success) {
      feeRecordsCache = feeRecordsResult.data
    }

    // 优先从云端获取费用设置，降级到 localStorage
    let feeSettings = { monthlyFee: 1500 }
    if (settingsResult.success && settingsResult.data) {
      feeSettings = typeof settingsResult.data === 'string' 
        ? JSON.parse(settingsResult.data) 
        : settingsResult.data
    } else {
      const localSettings = JSON.parse(localStorage.getItem('feeSettings') || '{}')
      if (localSettings.monthlyFee !== undefined) {
        feeSettings = localSettings
      }
    }

    statistics.value.totalStudents = studentsCache.length

    const parentPhones = [...new Set(studentsCache.map(s => s.parentPhone).filter(Boolean))]
    statistics.value.totalParents = parentPhones.length

    const currentMonth = new Date().toISOString().slice(0, 7)
    const monthlyFee = feeSettings.monthlyFee || 1500

    // 使用 payDate 字段过滤（格式为 2026-04-07）
    const paidRecords = feeRecordsCache
      .filter(r => r.payDate && r.payDate.startsWith(currentMonth) && r.status === 'paid')
    const paidThisMonth = paidRecords.reduce((sum, r) => sum + (r.amount || 0), 0)
    
    // 已缴费学生数
    const paidStudentIds = new Set(paidRecords.map(r => r.studentId))
    const paidCount = paidStudentIds.size
    const unpaidCount = studentsCache.length - paidCount
    
    // 实收 = 已缴费记录金额之和
    statistics.value.paidFee = paidThisMonth
    // 应收 = 实收 + 未缴金额
    statistics.value.totalFee = paidThisMonth + (unpaidCount * monthlyFee)

    nextTick(() => {
      initGradeChart(studentsCache)
      initFeeChart(studentsCache, feeRecordsCache, currentMonth)
    })

    ElMessage.success('数据加载成功')
  } catch (error) {
    console.error('初始化数据失败:', error)
    ElMessage.error('数据加载失败，请重试')
  } finally {
    loading.value = false
  }
}

const initGradeChart = (students) => {
  if (!gradeChartRef.value) return

  const chart = echarts.init(gradeChartRef.value)
  
  const gradeCount = {}
  students.forEach(s => {
    const grade = s.grade || s.className || '未设置'
    gradeCount[grade] = (gradeCount[grade] || 0) + 1
  })

  const option = {
    tooltip: { trigger: 'item' },
    legend: { bottom: '5%' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: { show: false },
      emphasis: {
        label: {
          show: true,
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      data: Object.entries(gradeCount).map(([name, value]) => ({ name, value }))
    }]
  }

  chart.setOption(option)
  window.addEventListener('resize', () => chart.resize())
}

const initFeeChart = (students, feeRecords, currentMonth) => {
  if (!feeChartRef.value) return

  const chart = echarts.init(feeChartRef.value)

  // 使用 payDate 字段过滤
  const paidCount = feeRecords.filter(r => r.payDate && r.payDate.startsWith(currentMonth) && r.status === 'paid').length
  const unpaidCount = students.length - paidCount

  const option = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'category', data: ['已缴费', '未缴费'] },
    yAxis: { type: 'value' },
    series: [{
      data: [
        { value: paidCount, itemStyle: { color: '#67c23a' } },
        { value: unpaidCount, itemStyle: { color: '#f56c6c' } }
      ],
      type: 'bar',
      barWidth: '50%',
      label: { show: true, position: 'top' }
    }]
  }

  chart.setOption(option)
  window.addEventListener('resize', () => chart.resize())
}

const refreshData = async () => {
  await initData()
}

onMounted(() => {
  initData()
})
</script>

<style scoped lang="scss">
.dashboard {
  .statistics-row {
    margin-bottom: 20px;
  }

  .stat-card {
    .stat-content {
      display: flex;
      align-items: center;
    }

    .stat-icon {
      width: 60px;
      height: 60px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 15px;

      &.student {
        background: #e6f7ff;
        color: #1890ff;
      }

      &.parent {
        background: #f6ffed;
        color: #52c41a;
      }

      &.fee {
        background: #fff7e6;
        color: #fa8c16;
      }

      &.paid {
        background: #f9f0ff;
        color: #722ed1;
      }

      .el-icon {
        font-size: 28px;
      }
    }

    .stat-info {
      .stat-value {
        font-size: 24px;
        font-weight: bold;
        color: #333;
      }

      .stat-label {
        font-size: 14px;
        color: #999;
        margin-top: 4px;
      }
    }
  }

  .chart-row {
    margin-bottom: 20px;
  }

  .chart-container {
    height: 300px;
  }

  .card-header {
    font-weight: bold;
  }

  .quick-actions {
    .action-buttons {
      display: flex;
      gap: 15px;
      flex-wrap: wrap;

      .el-button {
        display: flex;
        align-items: center;
        gap: 5px;
      }
    }
  }
}
</style>
