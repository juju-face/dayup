// utils/storage.js
// 学生作业管理工具类 - 支持每个学生作业内容不同

const STORAGE_KEY = 'homework_records';

/**
 * 生成唯一ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * 获取所有记录
 */
function getRecords() {
  try {
    const records = wx.getStorageSync(STORAGE_KEY);
    return Array.isArray(records) ? records : [];
  } catch (error) {
    console.error('[storage] 获取记录失败:', error);
    return [];
  }
}

/**
 * 保存记录
 */
function saveRecords(records) {
  try {
    wx.setStorageSync(STORAGE_KEY, records);
  } catch (error) {
    console.error('[storage] 保存记录失败:', error);
  }
}

/**
 * 初始化模拟数据
 * 生成3学生4条记录，每个学生作业内容不同
 */
function initMockData() {
  const existingRecords = getRecords();
  if (existingRecords.length > 0) {
    console.log('[storage] 已有数据，跳过初始化');
    return;
  }

  console.log('[storage] 开始初始化模拟数据');

  const mockRecords = [
    {
      id: generateId(),
      studentId: 'student_001',
      studentName: '张三',
      subject: '数学',
      content: '练习册P12',
      status: 1, // 已完成
      date: '2026-03-30',
      remark: '完成得很好'
    },
    {
      id: generateId(),
      studentId: 'student_002',
      studentName: '李四',
      subject: '数学',
      content: '练习册P13', // 不同页码
      status: 0, // 未完成
      date: '2026-03-30',
      remark: ''
    },
    {
      id: generateId(),
      studentId: 'student_003',
      studentName: '王五',
      subject: '语文', // 不同科目
      content: '背诵课文',
      status: 2, // 待订正
      date: '2026-03-30',
      remark: '背诵不流利'
    },
    {
      id: generateId(),
      studentId: 'student_001',
      studentName: '张三',
      subject: '英语', // 一天多条
      content: '单词抄写',
      status: 0, // 未完成
      date: '2026-03-30',
      remark: ''
    }
  ];

  saveRecords(mockRecords);
  console.log('[storage] 模拟数据初始化完成，共', mockRecords.length, '条记录');
  console.log('[storage] 记录详情:', mockRecords);
}

/**
 * 给某学生添加一条作业
 * @param {string} studentId - 学生ID
 * @param {string} studentName - 学生姓名
 * @param {string} subject - 科目（语/数/英）
 * @param {string} content - 作业内容
 * @param {string} date - 日期（YYYY-MM-DD）
 * @returns {Object} 新增的记录
 */
function addRecord(studentId, studentName, subject, content, date) {
  if (!studentId || !subject || !content || !date) {
    console.error('[storage] 添加记录失败：参数不完整');
    return null;
  }

  const records = getRecords();
  
  const newRecord = {
    id: generateId(),
    studentId: studentId,
    studentName: studentName || '未知学生',
    subject: subject,
    content: content,
    status: 0, // 默认未完成
    date: date,
    remark: ''
  };

  records.unshift(newRecord);
  saveRecords(records);

  console.log('[storage] 添加记录成功:', newRecord);
  return newRecord;
}

/**
 * 更新完成情况
 * @param {string} id - 记录ID
 * @param {number} status - 状态（0未完成/1已完成/2待订正）
 * @param {string} remark - 备注
 * @returns {Object|null} 更新后的记录
 */
function updateRecord(id, status, remark) {
  if (!id || status === undefined) {
    console.error('[storage] 更新记录失败：参数不完整');
    return null;
  }

  const validStatuses = [0, 1, 2];
  if (!validStatuses.includes(status)) {
    console.error('[storage] 更新记录失败：无效的状态', status);
    return null;
  }

  const records = getRecords();
  const recordIndex = records.findIndex(r => r.id === id);

  if (recordIndex === -1) {
    console.error('[storage] 更新记录失败：记录不存在', id);
    return null;
  }

  records[recordIndex].status = status;
  records[recordIndex].remark = remark || '';

  saveRecords(records);
  console.log('[storage] 更新记录成功:', id, 'status:', status);
  return records[recordIndex];
}

/**
 * 获取某日所有学生作业
 * @param {string} date - 日期（YYYY-MM-DD）
 * @returns {Array} 该日期的所有记录
 */
function getRecordsByDate(date) {
  if (!date) {
    console.error('[storage] 获取记录失败：日期为空');
    return [];
  }

  const records = getRecords();
  const filteredRecords = records.filter(r => r.date === date);

  // 按科目和学生排序
  filteredRecords.sort((a, b) => {
    if (a.subject !== b.subject) {
      return a.subject.localeCompare(b.subject);
    }
    return a.studentName.localeCompare(b.studentName);
  });

  console.log('[storage] 获取', date, '的记录:', filteredRecords.length, '条');
  return filteredRecords;
}

/**
 * 获取某学生所有历史作业
 * @param {string} studentId - 学生ID
 * @returns {Array} 该学生的所有记录
 */
function getRecordsByStudent(studentId) {
  if (!studentId) {
    console.error('[storage] 获取记录失败：学生ID为空');
    return [];
  }

  const records = getRecords();
  const filteredRecords = records.filter(r => r.studentId === studentId);

  // 按日期降序排序（最新的在前）
  filteredRecords.sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });

  console.log('[storage] 获取学生', studentId, '的记录:', filteredRecords.length, '条');
  return filteredRecords;
}

/**
 * 删除记录
 * @param {string} id - 记录ID
 * @returns {boolean} 是否删除成功
 */
function deleteRecord(id) {
  if (!id) {
    console.error('[storage] 删除记录失败：ID为空');
    return false;
  }

  const records = getRecords();
  const filteredRecords = records.filter(r => r.id !== id);

  if (filteredRecords.length === records.length) {
    console.error('[storage] 删除记录失败：记录不存在', id);
    return false;
  }

  saveRecords(filteredRecords);
  console.log('[storage] 删除记录成功:', id);
  return true;
}



/**
 * 获取某日统计信息
 * @param {string} date - 日期
 * @returns {Object} 统计信息
 */
function getStatsByDate(date) {
  const records = getRecordsByDate(date);

  return {
    total: records.length,
    completed: records.filter(r => r.status === 1).length,
    pending: records.filter(r => r.status === 0).length,
    needCorrection: records.filter(r => r.status === 2).length
  };
}

// 存储键名
const STUDENTS_KEY = 'students_list';

/**
 * 保存学生列表
 * @param {Array} students - 学生列表
 */
function setStudents(students) {
  try {
    wx.setStorageSync(STUDENTS_KEY, students);
    console.log('[storage] 保存学生列表成功:', students.length, '名学生');
  } catch (error) {
    console.error('[storage] 保存学生列表失败:', error);
  }
}

/**
 * 获取所有学生列表
 * @returns {Array} 学生列表
 */
function getStudents() {
  try {
    const students = wx.getStorageSync(STUDENTS_KEY);
    if (Array.isArray(students) && students.length > 0) {
      return students;
    }
    
    // 如果没有学生数据，从记录中提取
    const records = getRecords();
    const studentMap = new Map();

    records.forEach(r => {
      if (!studentMap.has(r.studentId)) {
        studentMap.set(r.studentId, {
          id: r.studentId,
          name: r.studentName,
          gender: 'male',
          age: 7,
          birthday: '2018-05-20',
          className: '一年级一班',
          enrollDate: '2025-09-01',
          school: '第一小学',
          parentPhone: '13800138000',
          address: '北京市朝阳区某某街道',
          allergy: '',
          emergencyContact: ''
        });
      }
    });

    const studentList = Array.from(studentMap.values());
    // 保存到本地存储
    if (studentList.length > 0) {
      setStudents(studentList);
    }
    return studentList;
  } catch (error) {
    console.error('[storage] 获取学生列表失败:', error);
    return [];
  }
}

// 导出模块
module.exports = {
  initMockData,
  addRecord,
  updateRecord,
  getRecordsByDate,
  getRecordsByStudent,
  deleteRecord,
  getStudents,
  setStudents,
  getStatsByDate,
  getRecords,
  saveRecords
};
