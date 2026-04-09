<template>
  <div class="teachers-container">
    <el-card shadow="hover" class="teachers-card">
      <template #header>
        <div class="card-header">
          <span class="header-title">老师管理</span>
          <el-button type="primary" @click="handleAdd" size="small">
            <el-icon><Plus /></el-icon>
            添加老师
          </el-button>
        </div>
      </template>

      <div class="search-form">
        <el-form :model="searchForm" inline>
          <el-form-item label="姓名">
            <el-input v-model="searchForm.name" placeholder="请输入姓名" size="small" />
          </el-form-item>
          <el-form-item label="手机号">
            <el-input v-model="searchForm.phone" placeholder="请输入手机号" size="small" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="searchForm.status" placeholder="请选择状态" size="small">
              <el-option label="启用" value="active" />
              <el-option label="禁用" value="inactive" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" size="small" @click="handleSearch">搜索</el-button>
            <el-button size="small" @click="resetSearch">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table :data="filteredTeachers" style="width: 100%" v-loading="loading">
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="phone" label="手机号" width="150" />
        <el-table-column prop="subject" label="科目" width="100" />
        <el-table-column prop="classes" label="管理班级">
          <template #default="scope">
            {{ formatClasses(scope.row.classes) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.status === 'active' ? 'success' : 'info'">
              {{ scope.row.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="180">
          <template #default="scope">
            {{ formatTime(scope.row.createTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="scope">
            <el-button type="primary" size="small" @click="handleEdit(scope.row)">
              编辑
            </el-button>
            <el-button type="warning" size="small" @click="handleAssignStudents(scope.row)">
              分配学生
            </el-button>
            <el-button type="danger" size="small" @click="handleDelete(scope.row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="filteredTeachers.length"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 添加/编辑老师对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '添加老师' : '编辑老师'"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input 
            v-model="form.phone" 
            placeholder="请输入手机号" 
            maxlength="11"
            @input="handlePhoneInput"
          />
        </el-form-item>
        <el-form-item label="密码" prop="password" v-if="dialogType === 'add'">
          <el-input v-model="form.password" type="password" placeholder="请输入登录密码" />
        </el-form-item>
        <el-form-item label="科目" prop="subject">
          <el-select v-model="form.subject" placeholder="请选择科目" style="width: 100%">
            <el-option label="语文" value="语文" />
            <el-option label="数学" value="数学" />
            <el-option label="英语" value="英语" />
            <el-option label="物理" value="物理" />
            <el-option label="化学" value="化学" />
            <el-option label="生物" value="生物" />
            <el-option label="历史" value="历史" />
            <el-option label="地理" value="地理" />
            <el-option label="政治" value="政治" />
          </el-select>
        </el-form-item>
        <el-form-item label="管理班级" prop="classes">
          <el-select
            v-model="form.classes"
            multiple
            placeholder="请选择管理的班级"
            style="width: 100%"
          >
            <el-option label="一年级1班" value="一年级1班" />
            <el-option label="一年级2班" value="一年级2班" />
            <el-option label="二年级1班" value="二年级1班" />
            <el-option label="二年级2班" value="二年级2班" />
            <el-option label="三年级1班" value="三年级1班" />
            <el-option label="三年级2班" value="三年级2班" />
            <el-option label="四年级1班" value="四年级1班" />
            <el-option label="四年级2班" value="四年级2班" />
            <el-option label="五年级1班" value="五年级1班" />
            <el-option label="五年级2班" value="五年级2班" />
            <el-option label="六年级1班" value="六年级1班" />
            <el-option label="六年级2班" value="六年级2班" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio value="active">启用</el-radio>
            <el-radio value="inactive">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitLoading">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 分配学生对话框 -->
    <el-dialog
      v-model="assignDialogVisible"
      title="分配学生"
      width="600px"
    >
      <div class="assign-students-container">
        <el-transfer
          v-model="assignedStudentIds"
          :data="studentTransferData"
          :titles="['未分配学生', '已分配学生']"
          filterable
          :filter-method="filterStudents"
          filter-placeholder="搜索学生姓名"
        />
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="assignDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSaveAssignment" :loading="assignLoading">
            保存分配
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import cloudService from '../utils/cloud'

const loading = ref(false)
const submitLoading = ref(false)
const assignLoading = ref(false)
const dialogVisible = ref(false)
const assignDialogVisible = ref(false)
const dialogType = ref('add')
const formRef = ref(null)
const currentTeacher = ref(null)

const searchForm = reactive({
  name: '',
  phone: '',
  status: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 10
})

const teachers = ref([])
const allStudents = ref([])
const assignedStudentIds = ref([])

const form = reactive({
  _id: '',
  name: '',
  phone: '',
  password: '',
  subject: '',
  classes: [],
  status: 'active'
})

const formRules = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ],
  subject: [
    { required: true, message: '请选择科目', trigger: 'change' }
  ],
  classes: [
    { required: true, message: '请至少选择一个班级', trigger: 'change' }
  ]
}

const formatTime = (time) => {
  if (!time) return ''
  const date = new Date(time)
  return date.toLocaleString('zh-CN')
}

const formatClasses = (classes) => {
  if (!classes || classes.length === 0) return '未设置'
  return classes.join('、')
}

// 限制手机号只能输入数字
const handlePhoneInput = (value) => {
  form.phone = value.replace(/[^0-9]/g, '').slice(0, 11)
}

const loadTeachers = async () => {
  loading.value = true
  try {
    const result = await cloudService.getAllTeachers()
    
    if (result.success) {
      teachers.value = result.data
      ElMessage.success('老师列表加载成功')
    } else {
      ElMessage.error(result.message || '加载失败')
    }
  } catch (error) {
    console.error('加载老师列表失败:', error)
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

const loadAllStudents = async () => {
  try {
    const result = await cloudService.getAllStudents()
    if (result.success) {
      allStudents.value = result.data
    }
  } catch (error) {
    console.error('加载学生列表失败:', error)
  }
}

const studentTransferData = computed(() => {
  return allStudents.value.map(student => ({
    key: student._id,
    label: `${student.name}（${student.grade}${student.className}）`,
    disabled: false
  }))
})

const filteredTeachers = computed(() => {
  let result = teachers.value
  
  if (searchForm.name) {
    result = result.filter(teacher => teacher.name && teacher.name.includes(searchForm.name))
  }
  
  if (searchForm.phone) {
    result = result.filter(teacher => teacher.phone && teacher.phone.includes(searchForm.phone))
  }
  
  if (searchForm.status) {
    result = result.filter(teacher => teacher.status === searchForm.status)
  }
  
  const start = (pagination.page - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  return result.slice(start, end)
})

const handleSearch = () => {
  pagination.page = 1
}

const resetSearch = () => {
  searchForm.name = ''
  searchForm.phone = ''
  searchForm.status = ''
  pagination.page = 1
}

const handleSizeChange = (size) => {
  pagination.pageSize = size
  pagination.page = 1
}

const handleCurrentChange = (current) => {
  pagination.page = current
}

const handleAdd = () => {
  dialogType.value = 'add'
  Object.assign(form, {
    _id: '',
    name: '',
    phone: '',
    password: '',
    subject: '',
    classes: [],
    status: 'active'
  })
  dialogVisible.value = true
}

const handleEdit = (teacher) => {
  dialogType.value = 'edit'
  Object.assign(form, {
    _id: teacher._id,
    name: teacher.name,
    phone: teacher.phone,
    subject: teacher.subject,
    classes: teacher.classes || [],
    status: teacher.status || 'active'
  })
  // 编辑时不显示密码
  form.password = ''
  dialogVisible.value = true
}

const handleDelete = async (teacher) => {
  try {
    await ElMessageBox.confirm(`确定要删除老师 "${teacher.name}" 吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const result = await cloudService.deleteTeacher(teacher._id)
    
    if (result.success) {
      ElMessage.success('删除成功')
      await loadTeachers()
    } else {
      ElMessage.error(result.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

const handleAssignStudents = async (teacher) => {
  currentTeacher.value = teacher
  assignDialogVisible.value = true
  
  // 加载该老师已分配的学生
  try {
    const result = await cloudService.getStudentsByTeacher(teacher._id)
    if (result.success) {
      assignedStudentIds.value = result.data.map(s => s._id)
    }
  } catch (error) {
    console.error('加载老师的学生失败:', error)
    assignedStudentIds.value = []
  }
}

const filterStudents = (query, item) => {
  return item.label.includes(query)
}

const handleSaveAssignment = async () => {
  assignLoading.value = true
  try {
    const result = await cloudService.assignStudentsToTeacher(
      currentTeacher.value._id,
      assignedStudentIds.value
    )
    
    if (result.success) {
      ElMessage.success('分配成功')
      assignDialogVisible.value = false
    } else {
      ElMessage.error(result.message || '分配失败')
    }
  } catch (error) {
    console.error('分配失败:', error)
    ElMessage.error('分配失败')
  } finally {
    assignLoading.value = false
  }
}

const handleSubmit = async () => {
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    
    submitLoading.value = true
    try {
      let result
      if (dialogType.value === 'add') {
        result = await cloudService.addTeacher(form)
      } else {
        result = await cloudService.updateTeacher(form)
      }
      
      if (result.success) {
        ElMessage.success(dialogType.value === 'add' ? '添加成功' : '更新成功')
        dialogVisible.value = false
        await loadTeachers()
      } else {
        ElMessage.error(result.message || '操作失败')
      }
    } catch (error) {
      console.error('操作失败:', error)
      ElMessage.error('操作失败')
    } finally {
      submitLoading.value = false
    }
  })
}

onMounted(() => {
  loadTeachers()
  loadAllStudents()
})
</script>

<style scoped>
.teachers-container {
  padding: 20px;
}

.teachers-card {
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

.search-form {
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.dialog-footer {
  text-align: right;
}

.assign-students-container {
  margin: 20px 0;
}
</style>
