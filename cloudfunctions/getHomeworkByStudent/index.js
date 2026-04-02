const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { studentId, date, startDate, endDate } = event;
  
  try {
    // 构建查询条件
    let query = db.collection('homework').where({
      $or: [
        { students: studentId },
        { students: _.size(0) }
      ]
    });
    
    // 按日期筛选
    if (date) {
      query = query.where({ date });
    } else if (startDate && endDate) {
      query = query.where({
        date: _.gte(startDate).and(_.lte(endDate))
      });
    }
    
    // 获取作业列表
    const result = await query.orderBy('date', 'desc').orderBy('createTime', 'desc').get();
    
    // 获取学生的作业状态记录
    const homeworkIds = result.data.map(item => item._id);
    const statusResult = await db.collection('homework_status').where({
      studentId,
      homeworkId: _.in(homeworkIds)
    }).get();
    
    // 合并作业和状态
    const homeworkList = result.data.map(homework => {
      const statusRecord = statusResult.data.find(s => s.homeworkId === homework._id);
      return {
        ...homework,
        studentStatus: statusRecord ? statusRecord.status : 0, // 0-未完成, 1-已完成, 2-待订正
        studentRemark: statusRecord ? statusRecord.remark : '',
        completeTime: statusRecord ? statusRecord.completeTime : null
      };
    });
    
    return {
      success: true,
      data: homeworkList
    };
  } catch (err) {
    return {
      success: false,
      message: err.message
    };
  }
};
