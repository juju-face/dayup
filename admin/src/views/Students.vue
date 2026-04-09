<template>
  <div class="students-container">
    <el-card shadow="hover" class="students-card">
      <template #header>
        <div class="card-header">
          <span class="header-title">学生管理</span>
          <el-button type="primary" @click="handleAdd" size="small">
            <el-icon><Plus /></el-icon>
            添加学生
          </el-button>
        </div>
      </template>

      <div class="search-form">
        <el-form :model="searchForm" inline>
          <el-form-item label="姓名">
            <el-input v-model="searchForm.name" placeholder="请输入姓名" size="small" />
          </el-form-item>
          <el-form-item label="年级">
            <el-select v-model="searchForm.grade" placeholder="请选择年级" size="small">
              <el-option label="一年级" value="一年级" />
              <el-option label="二年级" value="二年级" />
              <el-option label="三年级" value="三年级" />
              <el-option label="四年级" value="四年级" />
              <el-option label="五年级" value="五年级" />
              <el-option label="六年级" value="六年级" />
            </el-select>
          </el-form-item>
          <el-form-item label="家长手机">
            <el-input v-model="searchForm.parentPhone" placeholder="请输入家长手机号" size="small" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" size="small" @click="handleSearch">搜索</el-button>
            <el-button size="small" @click="resetSearch">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table :data="filteredStudents" style="width: 100%" v-loading="loading">
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="gender" label="性别" width="80">
          <template #default="scope">
            {{ scope.row.gender === 'male' ? '男' : '女' }}
          </template>
        </el-table-column>
        <el-table-column prop="grade" label="年级" width="100" />
        <el-table-column prop="school" label="学校" />
        <el-table-column prop="className" label="班级" width="100" />
        <el-table-column prop="parentName" label="家长姓名" width="120" />
        <el-table-column prop="parentPhone" label="家长手机" width="150" />
        <el-table-column prop="createTime" label="创建时间" width="180">
          <template #default="scope">
            {{ formatTime(scope.row.createTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="scope">
            <el-button type="primary" size="small" @click="handleEdit(scope.row)">
              编辑
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
          :total="filteredStudents.length"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '添加学生' : '编辑学生'"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" maxlength="20" />
        </el-form-item>
        <el-form-item label="性别" prop="gender">
          <el-radio-group v-model="form.gender">
            <el-radio value="male">男</el-radio>
            <el-radio value="female">女</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="年级" prop="grade">
          <el-select v-model="form.grade" placeholder="请选择年级">
            <el-option label="一年级" value="一年级" />
            <el-option label="二年级" value="二年级" />
            <el-option label="三年级" value="三年级" />
            <el-option label="四年级" value="四年级" />
            <el-option label="五年级" value="五年级" />
            <el-option label="六年级" value="六年级" />
          </el-select>
        </el-form-item>
        <el-form-item label="学校" prop="school">
          <el-input v-model="form.school" placeholder="请输入学校" maxlength="50" />
        </el-form-item>
        <el-form-item label="班级" prop="className">
          <el-input v-model="form.className" placeholder="请输入班级" maxlength="20" />
        </el-form-item>
        <el-form-item label="家长姓名" prop="parentName">
          <el-input v-model="form.parentName" placeholder="请输入家长姓名" maxlength="20" />
        </el-form-item>
        <el-form-item label="家长手机" prop="parentPhone">
          <el-input 
            v-model="form.parentPhone" 
            placeholder="请输入家长手机号" 
            maxlength="11"
            @input="handlePhoneInput"
          />
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import cloudService from '../utils/cloud'

const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const dialogType = ref('add')
const formRef = ref(null)

const searchForm = reactive({
  name: '',
  grade: '',
  parentPhone: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 10
})

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入学生姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  gender: [
    { required: true, message: '请选择性别', trigger: 'change' }
  ],
  grade: [
    { required: true, message: '请选择年级', trigger: 'change' }
  ],
  school: [
    { required: true, message: '请输入学校', trigger: 'blur' }
  ],
  className: [
    { required: true, message: '请输入班级', trigger: 'blur' }
  ],
  parentName: [
    { required: true, message: '请输入家长姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '家长姓名长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  parentPhone: [
    { required: true, message: '请输入家长手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ]
}

const students = ref([])
const form = reactive({
  _id: '',
  name: '',
  gender: 'male',
  grade: '',
  school: '',
  className: '',
  parentName: '',
  parentPhone: ''
})

const formatTime = (time) => {
  if (!time) return ''
  const date = new Date(time)
  return date.toLocaleString('zh-CN')
}

// 限制手机号只能输入数字
const handlePhoneInput = (value) => {
  form.parentPhone = value.replace(/[^0-9]/g, '').slice(0, 11)
}

const loadStudents = async () => {
  loading.value = true
  try {
    const result = await cloudService.getAllStudents()
    console.log('[加载学生] API返回数据:', result)
    if (result.success) {
      console.log('[加载学生] 学生列表:', result.data)
      // 检查数据中的ID字段
      if (result.data.length > 0) {
        console.log('[加载学生] 第一个学生数据:', result.data[0])
        console.log('[加载学生] 第一个学生_id:', result.data[0]._id)
        console.log('[加载学生] 第一个学生id:', result.data[0].id)
      }
      students.value = result.data
      ElMessage.success('学生列表加载成功')
    } else {
      ElMessage.error(result.message || '加载失败')
    }
  } catch (error) {
    console.error('加载学生列表失败:', error)
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

const filteredStudents = computed(() => {
  let result = students.value
  
  if (searchForm.name) {
    result = result.filter(student => student.name && student.name.includes(searchForm.name))
  }
  
  if (searchForm.grade) {
    result = result.filter(student => student.grade === searchForm.grade)
  }
  
  if (searchForm.parentPhone) {
    result = result.filter(student => student.parentPhone && student.parentPhone.includes(searchForm.parentPhone))
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
  searchForm.grade = ''
  searchForm.parentPhone = ''
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
    gender: 'male',
    grade: '',
    school: '',
    className: '',
    parentName: '',
    parentPhone: ''
  })
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogType.value = 'edit'
  Object.assign(form, row)
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    
    submitLoading.value = true
    try {
      let result
      if (dialogType.value === 'add') {
        const studentData = {
          ...form,
          id: Date.now().toString()
        }
        result = await cloudService.addStudent(studentData)
      } else {
        result = await cloudService.updateStudent(form)
      }

      if (result.success) {
        ElMessage.success(dialogType.value === 'add' ? '添加成功' : '更新成功')
        dialogVisible.value = false
        await loadStudents()
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

const handleDelete = async (student) => {
  try {
    await ElMessageBox.confirm('确定要删除这个学生吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    // 传递完整的学生对象，包含 _id 和 id
    console.log('[删除学生] 完整学生数据:', student)
    
    const result = await cloudService.deleteStudent(student)
    
    console.log('[删除学生] 删除结果:', result)
    
    if (result.success) {
      ElMessage.success('删除成功')
      await loadStudents()
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

onMounted(() => {
  loadStudents()
})
</script>

<style scoped>
.students-container {
  padding: 20px;
}

.students-card {
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
</style>
