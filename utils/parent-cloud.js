// utils/parent-cloud.js
// 家长端云函数调用封装 - 基于云数据库

/**
 * 获取今天绑定的孩子作业
 * @returns {Promise<Array>} 作业列表
 */
async function getTodayHomeworkFromCloud() {
  try {
    const studentInfo = wx.getStorageSync('bound_student');
    if (!studentInfo || !studentInfo.id) {
      console.error('[parent-cloud] 未绑定学生');
      return [];
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    console.log('[parent-cloud] 获取今日作业:', { studentId: studentInfo.id, date: today });
    
    const res = await wx.cloud.callFunction({
      name: 'api',
      data: {
        action: 'getHomeworkByStudent',
        data: {
          studentId: studentInfo.id,
          date: today
        }
      }
    });
    
    console.log('[parent-cloud] 云函数返回:', res);
    
    if (res.result && res.result.success) {
      const homework = res.result.data || [];
      console.log('[parent-cloud] 成功获取', homework.length, '条作业记录');
      
      // 按科目排序
      homework.sort((a, b) => a.subject.localeCompare(b.subject));
      
      return homework;
    } else {
      console.error('[parent-cloud] 获取失败:', res.result?.message);
      return [];
    }
  } catch (error) {
    console.error('[parent-cloud] 获取今日作业错误:', error);
    return [];
  }
}

/**
 * 获取指定日期范围的孩子作业
 * @param {string} startDate - 开始日期 (YYYY-MM-DD)
 * @param {string} endDate - 结束日期 (YYYY-MM-DD)
 * @returns {Promise<Array>} 作业列表
 */
async function getHomeworkByDateRange(startDate, endDate) {
  try {
    const studentInfo = wx.getStorageSync('bound_student');
    if (!studentInfo || !studentInfo.id) {
      console.error('[parent-cloud] 未绑定学生');
      return [];
    }
    
    console.log('[parent-cloud] 获取日期范围作业:', {
      studentId: studentInfo.id,
      startDate,
      endDate
    });
    
    const res = await wx.cloud.callFunction({
      name: 'api',
      data: {
        action: 'getHomeworkByStudent',
        data: {
          studentId: studentInfo.id,
          startDate,
          endDate
        }
      }
    });
    
    if (res.result && res.result.success) {
      const homework = res.result.data || [];
      console.log('[parent-cloud] 成功获取', homework.length, '条作业记录');
      
      // 按日期降序，同一天按科目排序
      homework.sort((a, b) => {
        if (a.date !== b.date) {
          return new Date(b.date) - new Date(a.date);
        }
        return a.subject.localeCompare(b.subject);
      });
      
      return homework;
    } else {
      console.error('[parent-cloud] 获取失败:', res.result?.message);
      return [];
    }
  } catch (error) {
    console.error('[parent-cloud] 获取作业错误:', error);
    return [];
  }
}

/**
 * 获取作业统计信息
 * @param {string} startDate - 开始日期
 * @param {string} endDate - 结束日期
 * @returns {Promise<Object>} 统计信息
 */
async function getHomeworkStats(startDate, endDate) {
  try {
    const homework = await getHomeworkByDateRange(startDate, endDate);
    
    const total = homework.length;
    const completed = homework.filter(h => h.status === 1).length;
    const pending = homework.filter(h => h.status === 0).length;
    const needCorrection = homework.filter(h => h.status === 2).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // 按科目统计
    const subjectStats = {};
    homework.forEach(h => {
      if (!subjectStats[h.subject]) {
        subjectStats[h.subject] = {
          subject: h.subject,
          total: 0,
          completed: 0,
          pending: 0,
          needCorrection: 0
        };
      }
      
      subjectStats[h.subject].total++;
      if (h.status === 1) subjectStats[h.subject].completed++;
      else if (h.status === 0) subjectStats[h.subject].pending++;
      else if (h.status === 2) subjectStats[h.subject].needCorrection++;
    });
    
    const subjectStatsArray = Object.values(subjectStats).map(s => ({
      ...s,
      completionRate: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0
    })).sort((a, b) => b.total - a.total);
    
    return {
      total,
      completed,
      pending,
      needCorrection,
      completionRate,
      subjectStats: subjectStatsArray
    };
  } catch (error) {
    console.error('[parent-cloud] 获取统计错误:', error);
    return {
      total: 0,
      completed: 0,
      pending: 0,
      needCorrection: 0,
      completionRate: 0,
      subjectStats: []
    };
  }
}

/**
 * 更新作业状态（家长标记完成/未完成）
 * @param {string} recordId - 作业记录ID
 * @param {number} status - 状态 (0:未完成 1:已完成 2:待订正)
 * @param {string} remark - 备注（可选）
 * @returns {Promise<boolean>} 是否成功
 */
async function updateHomeworkStatus(recordId, status, remark = '') {
  try {
    const res = await wx.cloud.callFunction({
      name: 'api',
      data: {
        action: 'updateHomeworkStatus',
        data: {
          recordId,
          status,
          remark
        }
      }
    });
    
    if (res.result && res.result.success) {
      console.log('[parent-cloud] 更新作业状态成功:', { recordId, status });
      return true;
    } else {
      console.error('[parent-cloud] 更新失败:', res.result?.message);
      return false;
    }
  } catch (error) {
    console.error('[parent-cloud] 更新作业状态错误:', error);
    return false;
  }
}

// 导出模块
module.exports = {
  getTodayHomeworkFromCloud,
  getHomeworkByDateRange,
  getHomeworkStats,
  updateHomeworkStatus
};