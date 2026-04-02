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
        return await addHomework(data);
      case 'update':
        return await updateHomework(data);
      case 'delete':
        return await deleteHomework(data);
      case 'getByTeacher':
        return await getHomeworkByTeacher(data);
      case 'getByDate':
        return await getHomeworkByDate(data);
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

// 添加作业
async function addHomework(data) {
  const { teacherId, subject, content, students, date, deadline, remark } = data;
  
  const homeworkData = {
    teacherId,
    subject,
    content,
    students: students || [], // 指定学生ID数组，空数组表示全部学生
    date,
    deadline: deadline || '',
    remark: remark || '',
    status: 0, // 0-未完成, 1-已完成, 2-待订正
    createTime: db.serverDate(),
    updateTime: db.serverDate()
  };
  
  const result = await db.collection('homework').add({
    data: homeworkData
  });
  
  return {
    success: true,
    data: {
      _id: result._id,
      ...homeworkData
    },
    message: '作业发布成功'
  };
}

// 更新作业
async function updateHomework(data) {
  const { _id, ...updateData } = data;
  
  updateData.updateTime = db.serverDate();
  
  await db.collection('homework').doc(_id).update({
    data: updateData
  });
  
  return {
    success: true,
    message: '作业更新成功'
  };
}

// 删除作业
async function deleteHomework(data) {
  const { _id } = data;
  
  await db.collection('homework').doc(_id).remove();
  
  return {
    success: true,
    message: '作业删除成功'
  };
}

// 获取教师的作业列表
async function getHomeworkByTeacher(data) {
  const { teacherId, startDate, endDate } = data;
  
  let query = db.collection('homework').where({
    teacherId
  });
  
  if (startDate && endDate) {
    query = query.where({
      date: _.gte(startDate).and(_.lte(endDate))
    });
  }
  
  const result = await query.orderBy('date', 'desc').orderBy('createTime', 'desc').get();
  
  return {
    success: true,
    data: result.data
  };
}

// 按日期获取作业
async function getHomeworkByDate(data) {
  const { date, studentId } = data;
  
  let query = db.collection('homework').where({
    date,
    students: studentId ? _.in([studentId]) : _.size(0)
  });
  
  const result = await query.orderBy('createTime', 'desc').get();
  
  return {
    success: true,
    data: result.data
  };
}
