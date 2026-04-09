const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 确保集合存在（通过尝试添加一个空文档来创建集合）
async function ensureCollectionExists() {
  try {
    // 尝试获取集合信息
    await db.collection('students').limit(1).get();
    return true;
  } catch (err) {
    if (err.errCode === -502005 || err.message.includes('collection not exists')) {
      // 集合不存在，尝试创建
      try {
        // 通过添加一个临时文档来创建集合
        const tempResult = await db.collection('students').add({
          data: {
            _temp: true,
            createTime: db.serverDate()
          }
        });
        // 删除临时文档
        await db.collection('students').doc(tempResult._id).remove();
        return true;
      } catch (createErr) {
        console.error('创建集合失败:', createErr);
        return false;
      }
    }
    console.error('检查集合失败:', err);
    return false;
  }
}

exports.main = async (event, context) => {
  const { action, data } = event;
  
  try {
    // 确保集合存在
    const collectionExists = await ensureCollectionExists();
    if (!collectionExists) {
      return {
        success: false,
        message: '数据库集合不存在，请在云开发控制台中手动创建 students 集合'
      };
    }
    
    switch (action) {
      case 'add':
        return await addStudent(data);
      case 'update':
        return await updateStudent(data);
      case 'delete':
        return await deleteStudent(data);
      case 'getList':
        return await getStudentList(data);
      case 'getById':
        return await getStudentById(data);
      case 'bindParent':
        return await bindParent(data);
      case 'getByParentPhone':
        return await getStudentsByParentPhone(data);
      default:
        return {
          success: false,
          message: '未知操作'
        };
    }
  } catch (err) {
    console.error('云函数执行错误:', err);
    return {
      success: false,
      message: err.message || '操作失败'
    };
  }
};

// 添加学生
async function addStudent(data) {
  const studentData = {
    ...data,
    createTime: db.serverDate(),
    updateTime: db.serverDate()
  };
  
  const result = await db.collection('students').add({
    data: studentData
  });
  
  return {
    success: true,
    data: {
      _id: result._id,
      ...studentData
    },
    message: '学生添加成功'
  };
}

// 更新学生
async function updateStudent(data) {
  const { _id, ...updateData } = data;
  
  updateData.updateTime = db.serverDate();
  
  await db.collection('students').doc(_id).update({
    data: updateData
  });
  
  return {
    success: true,
    message: '学生信息更新成功'
  };
}

// 删除学生
async function deleteStudent(data) {
  const { _id } = data;
  
  await db.collection('students').doc(_id).remove();
  
  return {
    success: true,
    message: '学生删除成功'
  };
}

// 获取学生列表
async function getStudentList(data) {
  const { teacherId, className } = data || {};
  
  let query = db.collection('students');
  
  if (teacherId) {
    query = query.where({ teacherId });
  }
  
  if (className) {
    query = query.where({ className });
  }
  
  const result = await query.orderBy('createTime', 'desc').get();
  
  return {
    success: true,
    data: result.data
  };
}

// 根据ID获取学生
async function getStudentById(data) {
  const { _id } = data;
  
  const result = await db.collection('students').doc(_id).get();
  
  return {
    success: true,
    data: result.data
  };
}

// 绑定家长
async function bindParent(data) {
  const { studentId, parentPhone, parentOpenId } = data;
  
  await db.collection('students').doc(studentId).update({
    data: {
      parentPhone,
      parentOpenId,
      updateTime: db.serverDate()
    }
  });
  
  return {
    success: true,
    message: '家长绑定成功'
  };
}

// 根据家长手机号获取学生列表
async function getStudentsByParentPhone(data) {
  const { parentPhone } = data;
  
  const result = await db.collection('students')
    .where({ parentPhone })
    .orderBy('createTime', 'desc')
    .get();
  
  return {
    success: true,
    data: result.data
  };
}
