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
      case 'updateStatus':
        return await updateStatus(data);
      case 'batchUpdate':
        return await batchUpdateStatus(data);
      case 'getStatus':
        return await getStatus(data);
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

// 更新单个学生的作业状态
async function updateStatus(data) {
  const { homeworkId, studentId, status, remark, teacherRemark } = data;
  
  // 查询是否已存在记录
  const existResult = await db.collection('homework_status').where({
    homeworkId,
    studentId
  }).get();
  
  const statusData = {
    homeworkId,
    studentId,
    status, // 0-未完成, 1-已完成, 2-待订正
    remark: remark || '',
    teacherRemark: teacherRemark || '',
    updateTime: db.serverDate()
  };
  
  if (status === 1) {
    statusData.completeTime = db.serverDate();
  }
  
  if (existResult.data.length > 0) {
    // 更新记录
    await db.collection('homework_status').doc(existResult.data[0]._id).update({
      data: statusData
    });
  } else {
    // 创建新记录
    statusData.createTime = db.serverDate();
    await db.collection('homework_status').add({
      data: statusData
    });
  }
  
  return {
    success: true,
    message: '状态更新成功'
  };
}

// 批量更新作业状态（教师端使用）
async function batchUpdateStatus(data) {
  const { homeworkId, studentStatuses } = data;
  
  const tasks = studentStatuses.map(async ({ studentId, status, remark }) => {
    const existResult = await db.collection('homework_status').where({
      homeworkId,
      studentId
    }).get();
    
    const statusData = {
      homeworkId,
      studentId,
      status,
      remark: remark || '',
      updateTime: db.serverDate()
    };
    
    if (status === 1) {
      statusData.completeTime = db.serverDate();
    }
    
    if (existResult.data.length > 0) {
      await db.collection('homework_status').doc(existResult.data[0]._id).update({
        data: statusData
      });
    } else {
      statusData.createTime = db.serverDate();
      await db.collection('homework_status').add({
        data: statusData
      });
    }
  });
  
  await Promise.all(tasks);
  
  return {
    success: true,
    message: '批量更新成功'
  };
}

// 获取作业状态
async function getStatus(data) {
  const { homeworkId, studentId } = data;
  
  const result = await db.collection('homework_status').where({
    homeworkId,
    studentId
  }).get();
  
  return {
    success: true,
    data: result.data[0] || null
  };
}
