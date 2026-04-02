<template>
  <div class="students-page">
    <!-- 搜索栏 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="学生姓名">
          <el-input v-model="searchForm.name" placeholder="请输入姓名" clearable />
        </el-form-item>
        <el-form-item label="年级">
          <el-select v-model="searchForm.grade" placeholder="请选择年级" clearable>
            <el-option label="一年级" value="一年级" />
            <el-option label="二年级" value="二年级" />
            <el-option label="三年级" value="三年级" />
            <el-option label="四年级" value="四年级" />
            <el-option label="五年级" value="五年级" />
            <el-option label="六年级" value="六年级" />
          </el-select>
        </el-form-item>
        <el-form-item label="家长手机号">
          <el-input v-model="searchForm.parentPhone" placeholder="请输入手机号" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作栏 -->
    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <span>学生列表</span>
          <el-button type="primary" @click="showAddDialog">
            <el-icon><Plus /></el-icon>
            添加学生
          </el-button>
        </div>
      </template>

      <!-- 表格 -->
      <el-table :data="studentList" v-loading="loading" stripe>
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="grade" label="年级" width="100" />
        <el-table-column prop="school" label="学校" min-width="150" />
        <el-table-column prop="parentName" label="家长姓名" width="100" />
        <el-table-column prop="parentPhone" label="家长手机号" width="120" />
        <el-table-column prop="address" label="地址" min-width="200" show-overflow-tooltip />
        <el-table-column prop="createTime" label="添加时间" width="150" />
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

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '添加学生' : '编辑学生'"
      width="600px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="学生姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入学生姓名" />
        </el-form-item>
        <el-form-item label="年级" prop="grade">
          <el-select v-model="form.grade" placeholder="请选择年级" style="width: 100%">
            <el-option label="一年级" value="一年级" />
            <el-option label="二年级" value="二年级" />
            <el-option label="三年级" value="三年级" />
            <el-option label="四年级" value="四年级" />
            <el-option label="五年级" value="五年级" />
            <el-option label="六年级" value="六年级" />
          </el-select>
        </el-form-item>
        <el-form-item label="学校" prop="school">
          <el-input v-model="form.school" placeholder="请输入学校名称" />
        </el-form-item>
        <el-form-item label="家长姓名" prop="parentName">
          <el-input v-model="form.parentName" placeholder="请输入家长姓名" />
        </el-form-item>
        <el-form-item label="家长手机号" prop="parentPhone">
          <el-input v-model="form.parentPhone" placeholder="请输入家长手机号" />
        </el-form-item>
        <el-form-item label="家庭地址" prop="address">
          <el-input v-model="form.address" type="textarea" rows="3" placeholder="请输入家庭地址" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" rows="2" placeholder="请输入备注信息" />
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
import { ref, reactive, onMounted, getCurrentInstance } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
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
  pageSize: 10,
  total: 0
})

const form = reactive({
  id: null,
  name: '',
  grade: '',
  school: '',
  parentName: '',
  parentPhone: '',
  address: '',
  remark: ''
})

const formRules = {
  name: [{ required: true, message: '请输入学生姓名', trigger: 'blur' }],
  grade: [{ required: true, message: '请选择年级', trigger: 'change' }],
  school: [{ required: true, message: '请输入学校名称', trigger: 'blur' }],
  parentName: [{ required: true, message: '请输入家长姓名', trigger: 'blur' }],
  parentPhone: [
    { required: true, message: '请输入家长手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ]
}

const studentList = ref([])

// 加载学生列表
const loadStudents = () => {
  loading.value = true
  // 先从 students 获取，然后同步到 students_list 以保持一致
  let students = JSON.parse(localStorage.getItem('students') || '[]')
  
  // 确保数据同步到 students_list，供教师端和家长端使用
  if (students.length > 0) {
    localStorage.setItem('students_list', JSON.stringify(students))
  }
  
  // 筛选
  let filtered = students
  if (searchForm.name) {
    filtered = filtered.filter(s => s.name.includes(searchForm.name))
  }
  if (searchForm.grade) {
    filtered = filtered.filter(s => s.grade === searchForm.grade)
  }
  if (searchForm.parentPhone) {
    filtered = filtered.filter(s => s.parentPhone.includes(searchForm.parentPhone))
  }
  
  // 分页
  pagination.total = filtered.length
  const start = (pagination.page - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  studentList.value = filtered.slice(start, end)
  
  loading.value = false
}

const handleSearch = () => {
  pagination.page = 1
  loadStudents()
}

const resetSearch = () => {
  searchForm.name = ''
  searchForm.grade = ''
  searchForm.parentPhone = ''
  handleSearch()
}

const showAddDialog = () => {
  dialogType.value = 'add'
  resetForm()
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogType.value = 'edit'
  Object.assign(form, row)
  dialogVisible.value = true
}

const handleDelete = async (row) => {
  ElMessageBox.confirm(`确定要删除学生 "${row.name}" 吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const students = JSON.parse(localStorage.getItem('students') || '[]')
      const index = students.findIndex(s => s.id === row.id)
      if (index > -1) {
        students.splice(index, 1)
        localStorage.setItem('students', JSON.stringify(students))
        // 同步到 students_list，供教师端和家长端使用
        localStorage.setItem('students_list', JSON.stringify(students))
        
        // 同步到云数据库
        const result = await cloudService.deleteStudent(row.id)
        
        if (result.success) {
          ElMessage.success('删除成功并同步到云数据库')
        } else {
          ElMessage.success('删除成功（云同步失败）')
        }
        
        loadStudents()
      }
    } catch (error) {
      ElMessage.error('删除失败')
      console.error('删除失败:', error)
    }
  })
}

const resetForm = () => {
  form.id = null
  form.name = ''
  form.grade = ''
  form.school = ''
  form.parentName = ''
  form.parentPhone = ''
  form.address = ''
  form.remark = ''
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitLoading.value = true
      
      try {
        const students = JSON.parse(localStorage.getItem('students') || '[]')
        let result
        
        if (dialogType.value === 'add') {
          // 添加
          const newStudent = {
            ...form,
            id: Date.now().toString(),
            createTime: new Date().toLocaleString()
          }
          students.push(newStudent)
          
          // 同步到云数据库
          result = await cloudService.addStudent(newStudent)
          
          if (result.success) {
            ElMessage.success('添加成功并同步到云数据库')
          } else {
            ElMessage.success('添加成功（云同步失败）')
          }
        } else {
          // 编辑
          const index = students.findIndex(s => s.id === form.id)
          if (index > -1) {
            students[index] = { ...students[index], ...form }
            
            // 同步到云数据库
            result = await cloudService.updateStudent(form)
            
            if (result.success) {
              ElMessage.success('更新成功并同步到云数据库')
            } else {
              ElMessage.success('更新成功（云同步失败）')
            }
          }
        }
        
        localStorage.setItem('students', JSON.stringify(students))
        // 同步到 students_list，供教师端和家长端使用
        localStorage.setItem('students_list', JSON.stringify(students))
        dialogVisible.value = false
        loadStudents()
      } catch (error) {
        ElMessage.error('操作失败')
        console.error('操作失败:', error)
      } finally {
        submitLoading.value = false
      }
    }
  })
}

const handleSizeChange = (size) => {
  pagination.pageSize = size
  loadStudents()
}

const handlePageChange = (page) => {
  pagination.page = page
  loadStudents()
}

onMounted(() => {
  loadStudents()
})
</script>

<style scoped lang="scss">
.students-page {
  .search-card {
    margin-bottom: 20px;
  }

  .search-form {
    .el-form-item {
      margin-bottom: 0;
    }
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .pagination {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
