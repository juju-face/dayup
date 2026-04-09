const cloud = require('wx-server-sdk');
const bcrypt = require('bcryptjs');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// ==================== 主入口函数 ====================
exports.main = async (event, context) => {
  // 处理HTTP触发器请求格式
  let action = event.action;
  let data = event.data;
  
  // 如果是HTTP触发器，请求体可能在body字段中
  if (!action && event.body) {
    try {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      action = body.action;
      data = body.data;
    } catch (e) {
      console.error('[API] 解析body失败:', e);
    }
  }
  
  console.log('[API] 收到请求:', action);
  
  if (!action) {
    return { success: false, message: '缺少 action 参数' };
  }
  
  try {
    let result;
    
    switch (action) {
      // ========== 学生相关 ==========
      case 'addStudent':
        result = await addStudent(data);
        break;
      case 'updateStudent':
        result = await updateStudent(data);
        break;
      case 'deleteStudent':
        result = await deleteStudent(data);
        break;
      case 'getStudentById':
        result = await getStudentById(data);
        break;
      case 'getStudentsByParentPhone':
        result = await getStudentsByParentPhone(data);
        break;
      case 'getAllStudents':
        result = await getAllStudents(data);
        break;
      case 'getStudentsByTeacher':
        result = await getStudentsByTeacher(data);
        break;
        
      // ========== 老师相关 ==========
      case 'addTeacher':
        result = await addTeacher(data);
        break;
      case 'updateTeacher':
        result = await updateTeacher(data);
        break;
      case 'deleteTeacher':
        result = await deleteTeacher(data);
        break;
      case 'getTeacherByPhone':
        result = await getTeacherByPhone(data);
        break;
      case 'getTeacherById':
        result = await getTeacherById(data);
        break;
      case 'getAllTeachers':
        result = await getAllTeachers(data);
        break;
      case 'teacherLogin':
        result = await teacherLogin(data);
        break;
      case 'assignStudentsToTeacher':
        result = await assignStudentsToTeacher(data);
        break;
        
      // ========== 作业相关 ==========
      case 'addHomeworkRecord':
        result = await addHomeworkRecord(data);
        break;
      case 'updateHomeworkStatus':
        result = await updateHomeworkStatus(data);
        break;
      case 'deleteHomeworkRecord':
        result = await deleteHomeworkRecord(data);
        break;
      case 'getHomeworkByStudent':
        result = await getHomeworkByStudent(data);
        break;
      case 'getHomeworkByTeacher':
        result = await getHomeworkByTeacher(data);
        break;
        
      // ========== 费用相关 ==========
      case 'addFeeRecord':
        result = await addFeeRecord(data);
        break;
      case 'updateFeeRecord':
        result = await updateFeeRecord(data);
        break;
      case 'deleteFeeRecord':
        result = await deleteFeeRecord(data);
        break;
      case 'getFeeRecords':
        result = await getFeeRecords(data);
        break;
        
      // ========== 系统设置相关 ==========
      case 'getSystemSettings':
        result = await getSystemSettings(data);
        break;
      case 'saveSystemSettings':
        result = await saveSystemSettings(data);
        break;
        
      default:
        result = { success: false, message: '未知操作: ' + action };
    }
    
    return result;
    
  } catch (err) {
    console.error('[API] 操作失败:', err);
    return { success: false, message: err.message || '操作失败' };
  }
};

// ==================== 学生相关操作 ====================

async function addStudent(data) {
  if (!data || !data.name) {
    return { success: false, message: '学生姓名不能为空' };
  }
  
  const studentData = {
    name: data.name,
    gender: data.gender || 'male',
    grade: data.grade || '一年级',
    className: data.className || '',
    age: data.age || 7,
    parentPhone: data.parentPhone || '',
    teacherId: data.teacherId || '',  // 分配的老师ID
    school: data.school || '',
    birthday: data.birthday || '',
    createTime: db.serverDate(),
    updateTime: db.serverDate()
  };
  
  const result = await db.collection('students').add({ data: studentData });
  
  return {
    success: true,
    data: { _id: result._id, ...studentData },
    message: '学生添加成功'
  };
}

async function updateStudent(data) {
  if (!data._id) {
    return { success: false, message: '缺少学生ID' };
  }
  
  const { _id, createTime, ...updateData } = data;
  updateData.updateTime = db.serverDate();
  
  await db.collection('students').doc(_id).update({ data: updateData });
  
  return { success: true, message: '学生信息更新成功' };
}

async function deleteStudent(data) {
  if (!data._id) {
    return { success: false, message: '缺少学生ID' };
  }
  
  await db.collection('students').doc(data._id).remove();
  
  return { success: true, message: '学生删除成功' };
}

async function getStudentById(data) {
  if (!data._id) {
    return { success: false, message: '缺少学生ID' };
  }
  
  const result = await db.collection('students').doc(data._id).get();
  
  return { success: true, data: result.data };
}

async function getStudentsByParentPhone(data) {
  const { parentPhone } = data || {};
  
  let query = db.collection('students');
  if (parentPhone) {
    query = query.where({ parentPhone });
  }
  
  const result = await query.orderBy('createTime', 'desc').get();
  
  return { success: true, data: result.data };
}

async function getAllStudents(data) {
  const { limit = 100, skip = 0 } = data || {};
  
  const result = await db.collection('students')
    .orderBy('createTime', 'desc')
    .skip(skip)
    .limit(limit)
    .get();
  
  return { success: true, data: result.data };
}

async function getStudentsByTeacher(data) {
  const { teacherId, limit = 100, skip = 0 } = data || {};
  
  if (!teacherId) {
    return { success: false, message: '缺少老师ID' };
  }
  
  const result = await db.collection('students')
    .where({ teacherId })
    .orderBy('createTime', 'desc')
    .skip(skip)
    .limit(limit)
    .get();
  
  return { success: true, data: result.data };
}

// ==================== 老师相关操作 ====================

async function addTeacher(data) {
  if (!data || !data.phone) {
    return { success: false, message: '手机号不能为空' };
  }
  
  // 检查手机号是否已存在
  const existing = await db.collection('teachers')
    .where({ phone: data.phone })
    .limit(1)
    .get();
  
  // 如果已存在，返回现有账号
  if (existing.data.length > 0) {
    const teacher = existing.data[0];
    const { password: _, ...teacherInfo } = teacher;
    return { 
      success: true, 
      data: teacherInfo, 
      message: '老师已存在' 
    };
  }
  
  // 加密密码
  const password = data.password || '123456';
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const teacherData = {
    name: data.name || '老师',
    phone: data.phone,
    password: hashedPassword,
    subject: data.subject || '',
    classes: data.classes || [],
    role: data.role || 'teacher',
    status: data.status || 'active',
    createTime: db.serverDate(),
    updateTime: db.serverDate()
  };
  
  const result = await db.collection('teachers').add({ data: teacherData });
  
  const { password: _, ...teacherInfo } = teacherData;
  
  return {
    success: true,
    data: { _id: result._id, ...teacherInfo },
    message: '老师添加成功'
  };
}

async function updateTeacher(data) {
  if (!data._id) {
    return { success: false, message: '缺少老师ID' };
  }
  
  const { _id, createTime, password, ...updateData } = data;
  
  // 如果更新了密码，需要加密
  if (password) {
    updateData.password = await bcrypt.hash(password, 10);
  }
  
  updateData.updateTime = db.serverDate();
  
  await db.collection('teachers').doc(_id).update({ data: updateData });
  
  return { success: true, message: '老师信息更新成功' };
}

async function deleteTeacher(data) {
  if (!data._id) {
    return { success: false, message: '缺少老师ID' };
  }
  
  await db.collection('teachers').doc(data._id).remove();
  
  return { success: true, message: '老师删除成功' };
}

async function getTeacherByPhone(data) {
  if (!data.phone) {
    return { success: false, message: '缺少手机号' };
  }
  
  const result = await db.collection('teachers')
    .where({ phone: data.phone })
    .limit(1)
    .get();
  
  if (result.data.length === 0) {
    return { success: false, message: '老师不存在' };
  }
  
  return { success: true, data: result.data[0] };
}

// 根据ID获取老师信息
async function getTeacherById(data) {
  if (!data._id) {
    return { success: false, message: '缺少老师ID' };
  }
  
  try {
    const result = await db.collection('teachers').doc(data._id).get();
    
    if (!result.data) {
      return { success: false, message: '老师不存在' };
    }
    
    // 不返回密码
    const { password: _, ...teacherInfo } = result.data;
    
    return { success: true, data: teacherInfo };
  } catch (err) {
    console.error('[API] getTeacherById 错误:', err);
    return { success: false, message: err.message || '获取老师信息失败' };
  }
}

async function getAllTeachers(data) {
  const { limit = 100, skip = 0 } = data || {};
  
  const result = await db.collection('teachers')
    .orderBy('createTime', 'desc')
    .skip(skip)
    .limit(limit)
    .get();
  
  return { success: true, data: result.data };
}

async function teacherLogin(data) {
  const { phone, password } = data || {};
  
  if (!phone || !password) {
    return { success: false, message: '手机号和密码不能为空' };
  }
  
  const result = await db.collection('teachers')
    .where({ phone })
    .limit(1)
    .get();
  
  if (result.data.length === 0) {
    return { success: false, message: '手机号或密码错误' };
  }
  
  const teacher = result.data[0];
  
  // 验证密码
  const isValid = await bcrypt.compare(password, teacher.password);
  if (!isValid) {
    return { success: false, message: '手机号或密码错误' };
  }
  
  // 检查状态
  if (teacher.status !== 'active') {
    return { success: false, message: '账号已禁用' };
  }
  
  const { password: _, ...teacherInfo } = teacher;
  
  return { success: true, data: teacherInfo, message: '登录成功' };
}

async function assignStudentsToTeacher(data) {
  const { teacherId, studentIds } = data || {};
  
  if (!teacherId) {
    return { success: false, message: '缺少老师ID' };
  }
  
  if (!studentIds || studentIds.length === 0) {
    return { success: false, message: '没有选择要分配的学生' };
  }
  
  // 清除之前分配的
  await db.collection('students')
    .where({ teacherId })
    .update({ data: { teacherId: _.remove(), updateTime: db.serverDate() } });
  
  // 分配新学生
  for (const studentId of studentIds) {
    await db.collection('students').doc(studentId).update({
      data: { teacherId, updateTime: db.serverDate() }
    });
  }
  
  return { success: true, message: `分配成功，共${studentIds.length}名学生` };
}

// ==================== 作业管理 ====================

async function addHomeworkRecord(data) {
  if (!data.teacherId || !data.content || !data.date) {
    return { success: false, message: '参数不完整' };
  }
  
  const recordData = {
    teacherId: data.teacherId,
    studentId: data.studentId || '',
    studentName: data.studentName || '',
    subject: data.subject || '数学',
    content: data.content,
    date: data.date,
    deadline: data.deadline || '',
    remark: data.remark || '',
    status: 0,  // 0:未完成 1:已完成 2:待订正
    createTime: db.serverDate(),
    updateTime: db.serverDate()
  };
  
  const result = await db.collection('homework_records').add({ data: recordData });
  
  return { success: true, data: { _id: result._id, ...recordData } };
}

async function updateHomeworkStatus(data) {
  if (!data._id || data.status === undefined) {
    return { success: false, message: '参数不完整' };
  }
  
  const updateData = { status: data.status, updateTime: db.serverDate() };
  if (data.remark !== undefined) {
    updateData.remark = data.remark;
  }
  
  await db.collection('homework_records').doc(data._id).update({ data: updateData });
  
  return { success: true, message: '更新成功' };
}

async function deleteHomeworkRecord(data) {
  if (!data._id) {
    return { success: false, message: '缺少记录ID' };
  }
  
  await db.collection('homework_records').doc(data._id).remove();
  
  return { success: true, message: '删除成功' };
}

async function getHomeworkByStudent(data) {
  const { studentId, date, startDate, endDate, limit = 100 } = data || {};
  
  if (!studentId) {
    return { success: false, message: '缺少学生ID' };
  }
  
  let query = db.collection('homework_records').where({ studentId });
  
  if (date) {
    query = db.collection('homework_records').where({ studentId, date });
  }
  
  if (startDate && endDate) {
    query = db.collection('homework_records').where({
      studentId,
      date: db.command.gte(startDate).and(db.command.lte(endDate))
    });
  }
  
  const result = await query.orderBy('date', 'desc').limit(limit).get();
  
  return { success: true, data: result.data };
}

async function getHomeworkByTeacher(data) {
  const { teacherId, startDate, endDate, limit = 100 } = data || {};
  
  if (!teacherId) {
    return { success: false, message: '缺少老师ID' };
  }
  
  // 构建查询条件
  const whereCondition = { teacherId };
  
  if (startDate && endDate) {
    whereCondition.date = db.command.gte(startDate).and(db.command.lte(endDate));
  }
  
  const result = await db.collection('homework_records')
    .where(whereCondition)
    .orderBy('date', 'desc')
    .orderBy('createTime', 'desc')
    .limit(limit)
    .get();
  
  return { success: true, data: result.data };
}

// ==================== 费用相关 ====================

async function addFeeRecord(data) {
  if (!data.studentId) {
    return { success: false, message: '缺少学生ID' };
  }
  
  const feeData = {
    ...data,
    createTime: db.serverDate(),
    updateTime: db.serverDate()
  };
  
  const result = await db.collection('fee').add({ data: feeData });
  
  return { success: true, data: { _id: result._id, ...feeData } };
}

async function updateFeeRecord(data) {
  if (!data._id) {
    return { success: false, message: '缺少记录ID' };
  }
  
  const { _id, createTime, ...updateData } = data;
  updateData.updateTime = db.serverDate();
  
  await db.collection('fee').doc(_id).update({ data: updateData });
  
  return { success: true, message: '更新成功' };
}

async function deleteFeeRecord(data) {
  if (!data._id) {
    return { success: false, message: '缺少记录ID' };
  }
  
  await db.collection('fee').doc(data._id).remove();
  
  return { success: true, message: '删除成功' };
}

async function getFeeRecords(data) {
  const { studentId, month, limit = 500 } = data || {};
  
  console.log('[API] getFeeRecords 查询参数:', { studentId, month, limit });
  
  let query = db.collection('fee');
  
  // 构建查询条件
  const whereCondition = {};
  if (studentId) whereCondition.studentId = studentId;
  if (month) whereCondition.month = month;
  
  // 如果有查询条件才添加 where
  if (Object.keys(whereCondition).length > 0) {
    query = query.where(whereCondition);
  }
  
  const result = await query.orderBy('createTime', 'desc').limit(limit).get();
  
  console.log('[API] getFeeRecords 查询结果数量:', result.data.length);
  
  return { success: true, data: result.data };
}

// ==================== 系统设置相关 ====================

// 获取系统设置
async function getSystemSettings(data) {
  const { key = 'feeSettings' } = data || {};
  
  // 从 settings 集合获取
  const result = await db.collection('settings')
    .where({ key })
    .limit(1)
    .get();
  
  if (result.data.length > 0) {
    return { success: true, data: result.data[0].value };
  }
  
  // 返回默认值
  return { success: true, data: null };
}

// 保存系统设置
async function saveSystemSettings(data) {
  const { key = 'feeSettings', value } = data || {};
  
  if (value === undefined) {
    return { success: false, message: '设置值不能为空' };
  }
  
  // 先查询是否存在
  const existing = await db.collection('settings')
    .where({ key })
    .limit(1)
    .get();
  
  if (existing.data.length > 0) {
    // 更新
    await db.collection('settings')
      .doc(existing.data[0]._id)
      .update({
        data: {
          value,
          updateTime: db.serverDate()
        }
      });
  } else {
    // 新增
    await db.collection('settings').add({
      data: {
        key,
        value,
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    });
  }
  
  return { success: true, message: '设置已保存' };
}
