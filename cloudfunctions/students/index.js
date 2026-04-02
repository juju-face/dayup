const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { action, data } = event;
  
  try {
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
      default:
        return {
          success: false,
          message: '未知操作'
        };
    }
  } catch (err) {
    return {
      success: false,
      message: err.message
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
