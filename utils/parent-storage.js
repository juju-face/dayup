// utils/parent-storage.js
// 家长端数据管理工具 - 只读教师端数据，提供家长视角查询

const teacherStorage = require('./storage.js');

// 存储键名
const BOUND_STUDENT_KEY = 'bound_student_id';

/**
 * 获取今天的日期字符串
 * @returns {string} 格式：YYYY-MM-DD
 */
function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

/**
 * 获取本周的起始和结束日期
 * @returns {Object} {start: string, end: string}
 */
function getWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0是周日，1是周一
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0]
  };
}

/**
 * 获取本月的起始和结束日期
 * @returns {Object} {start: string, end: string}
 */
function getMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  return {
    start: firstDay.toISOString().split('T')[0],
    end: lastDay.toISOString().split('T')[0]
  };
}

/**
 * 家长绑定孩子
 * @param {string} studentId - 学生ID
 */
function bindStudent(studentId) {
  if (!studentId) {
    console.error('[parent-storage] 绑定失败：学生ID不能为空');
    return false;
  }
  
  try {
    wx.setStorageSync(BOUND_STUDENT_KEY, studentId);
    console.log('[parent-storage] 绑定学生成功:', studentId);
    return true;
  } catch (error) {
    console.error('[parent-storage] 绑定学生失败:', error);
    return false;
  }
}

/**
 * 获取当前绑定的孩子信息
 * @returns {Object|null} 学生信息对象
 */
function getBoundStudent() {
  try {
    const studentId = wx.getStorageSync(BOUND_STUDENT_KEY);
    if (!studentId) {
      console.log('[parent-storage] 未绑定学生');
      return null;
    }
    
    const students = teacherStorage.getStudents();
    const student = students.find(s => s.id === studentId);
    
    if (!student) {
      console.error('[parent-storage] 绑定的学生不存在:', studentId);
      return null;
    }
    
    return student;
  } catch (error) {
    console.error('[parent-storage] 获取绑定学生失败:', error);
    return null;
  }
}

/**
 * 获取绑定学生今日所有作业
 * @returns {Array} 今日作业列表
 */
function getTodayRecords() {
  const student = getBoundStudent();
  if (!student) {
    console.log('[parent-storage] 未绑定学生，无法获取今日作业');
    return [];
  }
  
  const today = getTodayString();
  const allRecords = teacherStorage.getRecords();
  
  const todayRecords = allRecords.filter(r => 
    r.studentId === student.id && r.date === today
  );
  
  // 按科目排序
  todayRecords.sort((a, b) => a.subject.localeCompare(b.subject));
  
  console.log('[parent-storage] 获取今日作业:', todayRecords.length, '条');
  return todayRecords;
}

/**
 * 获取绑定学生指定日期的作业
 * @param {string} date - 日期（YYYY-MM-DD）
 * @returns {Array} 指定日期作业列表
 */
function getRecordsByDate(date) {
  const student = getBoundStudent();
  if (!student) {
    console.log('[parent-storage] 未绑定学生，无法获取作业');
    return [];
  }
  
  if (!date) {
    console.error('[parent-storage] 日期不能为空');
    return [];
  }
  
  const allRecords = teacherStorage.getRecords();
  
  const records = allRecords.filter(r => 
    r.studentId === student.id && r.date === date
  );
  
  // 按科目排序
  records.sort((a, b) => a.subject.localeCompare(b.subject));
  
  console.log('[parent-storage] 获取', date, '作业:', records.length, '条');
  return records;
}

/**
 * 获取日期范围内的作业
 * @param {string} start - 开始日期（YYYY-MM-DD）
 * @param {string} end - 结束日期（YYYY-MM-DD）
 * @returns {Array} 日期范围内作业列表
 */
function getRecordsByDateRange(start, end) {
  const student = getBoundStudent();
  if (!student) {
    console.log('[parent-storage] 未绑定学生，无法获取作业');
    return [];
  }
  
  if (!start || !end) {
    console.error('[parent-storage] 日期范围不能为空');
    return [];
  }
  
  const allRecords = teacherStorage.getRecords();
  
  const records = allRecords.filter(r => {
    if (r.studentId !== student.id) return false;
    return r.date >= start && r.date <= end;
  });
  
  // 按日期降序，同一天按科目排序
  records.sort((a, b) => {
    if (a.date !== b.date) {
      return new Date(b.date) - new Date(a.date);
    }
    return a.subject.localeCompare(b.subject);
  });
  
  console.log('[parent-storage] 获取日期范围作业:', start, '至', end, records.length, '条');
  return records;
}

/**
 * 计算完成率
 * @param {string} start - 开始日期（YYYY-MM-DD）
 * @param {string} end - 结束日期（YYYY-MM-DD）
 * @returns {Object} {total: number, completed: number, rate: number}
 */
function getCompletionRate(start, end) {
  const records = getRecordsByDateRange(start, end);
  
  const total = records.length;
  const completed = records.filter(r => r.status === 1).length;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return {
    total,
    completed,
    rate
  };
}

/**
 * 获取今日统计
 * @returns {Object} 今日作业统计
 */
function getTodayStats() {
  const records = getTodayRecords();
  
  return {
    total: records.length,
    completed: records.filter(r => r.status === 1).length,
    pending: records.filter(r => r.status === 0).length,
    needCorrection: records.filter(r => r.status === 2).length,
    completionRate: records.length > 0 
      ? Math.round((records.filter(r => r.status === 1).length / records.length) * 100)
      : 0
  };
}

/**
 * 获取本周统计
 * @returns {Object} 本周作业统计
 */
function getWeekStats() {
  const range = getWeekRange();
  const records = getRecordsByDateRange(range.start, range.end);
  
  return {
    startDate: range.start,
    endDate: range.end,
    total: records.length,
    completed: records.filter(r => r.status === 1).length,
    pending: records.filter(r => r.status === 0).length,
    needCorrection: records.filter(r => r.status === 2).length,
    completionRate: records.length > 0 
      ? Math.round((records.filter(r => r.status === 1).length / records.length) * 100)
      : 0
  };
}

/**
 * 获取本月统计
 * @returns {Object} 本月作业统计
 */
function getMonthStats() {
  const range = getMonthRange();
  const records = getRecordsByDateRange(range.start, range.end);
  
  // 按日期分组统计
  const dailyStats = {};
  records.forEach(r => {
    if (!dailyStats[r.date]) {
      dailyStats[r.date] = { total: 0, completed: 0 };
    }
    dailyStats[r.date].total++;
    if (r.status === 1) {
      dailyStats[r.date].completed++;
    }
  });
  
  return {
    startDate: range.start,
    endDate: range.end,
    total: records.length,
    completed: records.filter(r => r.status === 1).length,
    pending: records.filter(r => r.status === 0).length,
    needCorrection: records.filter(r => r.status === 2).length,
    completionRate: records.length > 0 
      ? Math.round((records.filter(r => r.status === 1).length / records.length) * 100)
      : 0,
    dailyStats: dailyStats
  };
}

/**
 * 获取科目统计
 * @param {string} start - 开始日期（可选）
 * @param {string} end - 结束日期（可选）
 * @returns {Object} 各科目作业统计
 */
function getSubjectStats(start, end) {
  let records;
  
  if (start && end) {
    records = getRecordsByDateRange(start, end);
  } else {
    records = getTodayRecords();
  }
  
  const subjectStats = {};
  
  records.forEach(r => {
    if (!subjectStats[r.subject]) {
      subjectStats[r.subject] = {
        subject: r.subject,
        total: 0,
        completed: 0,
        pending: 0,
        needCorrection: 0
      };
    }
    
    subjectStats[r.subject].total++;
    if (r.status === 1) {
      subjectStats[r.subject].completed++;
    } else if (r.status === 0) {
      subjectStats[r.subject].pending++;
    } else if (r.status === 2) {
      subjectStats[r.subject].needCorrection++;
    }
  });
  
  // 转换为数组并计算完成率
  const result = Object.values(subjectStats).map(s => ({
    ...s,
    completionRate: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0
  }));
  
  // 按总作业数降序排序
  result.sort((a, b) => b.total - a.total);
  
  return result;
}

/**
 * 取消绑定学生
 */
function unbindStudent() {
  try {
    wx.removeStorageSync(BOUND_STUDENT_KEY);
    console.log('[parent-storage] 取消绑定学生成功');
    return true;
  } catch (error) {
    console.error('[parent-storage] 取消绑定学生失败:', error);
    return false;
  }
}

/**
 * 检查是否已绑定学生
 * @returns {boolean}
 */
function hasBoundStudent() {
  try {
    const studentId = wx.getStorageSync(BOUND_STUDENT_KEY);
    return !!studentId;
  } catch (error) {
    return false;
  }
}

/**
 * 获取绑定的学生ID
 * @returns {string|null} 学生ID
 */
function getBoundStudentId() {
  try {
    return wx.getStorageSync(BOUND_STUDENT_KEY) || null;
  } catch (error) {
    console.error('[parent-storage] 获取绑定学生ID失败:', error);
    return null;
  }
}

// 导出模块
module.exports = {
  // 绑定相关
  bindStudent,
  getBoundStudent,
  getBoundStudentId,
  unbindStudent,
  hasBoundStudent,
  
  // 作业查询
  getTodayRecords,
  getRecordsByDate,
  getRecordsByDateRange,
  
  // 统计分析
  getCompletionRate,
  getTodayStats,
  getWeekStats,
  getMonthStats,
  getSubjectStats
};
