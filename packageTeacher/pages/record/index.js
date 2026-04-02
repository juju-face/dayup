// packageTeacher/pages/record/index.js
const storage = require('../../../utils/storage.js');

Page({
  data: {
    records: [],
    currentDate: '',
    showAddModal: false,
    students: [],
    newRecord: {
      studentId: '',
      studentName: '',
      subject: '数学',
      content: '',
      date: ''
    },
    statusOptions: ['未完成', '已完成', '待订正'],
    subjectOptions: ['语文', '数学', '英语', '其他']
  },

  onLoad() {
    // 初始化模拟数据
    storage.initMockData();
    
    // 设置当前日期
    const today = new Date().toISOString().split('T')[0];
    this.setData({ currentDate: today });
    
    this.loadRecords();
    this.loadStudents();
  },

  onShow() {
    this.loadRecords();
    this.loadStudents();
    // 更新tabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateSelected();
    }
  },

  // 加载作业记录
  loadRecords() {
    try {
      const records = storage.getRecordsByDate(this.data.currentDate);
      
      // 计算统计数据
      const stats = {
        total: records.length,
        completed: records.filter(r => r.status === 1).length,
        pending: records.filter(r => r.status === 0).length,
        needCorrection: records.filter(r => r.status === 2).length
      };
      
      this.setData({ records, stats });
    } catch (error) {
      console.error('加载作业记录失败:', error);
      this.setData({ records: [], stats: { total: 0, completed: 0, pending: 0, needCorrection: 0 } });
    }
  },

  // 加载学生列表
  loadStudents() {
    try {
      const students = storage.getStudents();
      this.setData({ students });
    } catch (error) {
      console.error('加载学生列表失败:', error);
      this.setData({ students: [] });
    }
  },

  // 日期选择
  selectDate(e) {
    const date = e.detail.value;
    this.setData({ currentDate: date });
    this.loadRecords();
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadRecords();
    wx.showToast({
      title: '刷新成功',
      icon: 'success'
    });
    wx.stopPullDownRefresh();
  },

  // 显示添加作业弹窗
  showAddModal() {
    const today = new Date().toISOString().split('T')[0];
    this.setData({
      showAddModal: true,
      newRecord: {
        studentId: '',
        studentName: '',
        subject: '数学',
        content: '',
        date: today
      }
    });
  },

  // 隐藏添加作业弹窗
  hideAddModal() {
    this.setData({ showAddModal: false });
  },

  // 选择学生
  selectStudent(e) {
    const index = e.detail.value;
    const student = this.data.students[index];
    this.setData({
      'newRecord.studentId': student.id,
      'newRecord.studentName': student.name
    });
  },

  // 选择科目
  selectSubject(e) {
    const index = e.detail.value;
    this.setData({
      'newRecord.subject': this.data.subjectOptions[index]
    });
  },

  // 选择科目标签
  selectSubjectTag(e) {
    const subject = e.currentTarget.dataset.subject;
    this.setData({
      'newRecord.subject': subject
    });
  },

  // 确认添加作业
  onConfirmAdd() {
    const { studentId, studentName, subject, content, date } = this.data.newRecord;
    
    if (!studentId || !subject || !content) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    storage.addRecord(studentId, studentName, subject, content, date);
    
    // 更新同步时间
    wx.setStorageSync('lastUpdateTime', Date.now());
    
    // 震动反馈
    wx.vibrateShort({
      type: 'medium'
    });
    
    this.setData({ showAddModal: false });
    this.loadRecords();
    
    wx.showToast({
      title: '添加成功',
      icon: 'success'
    });
  },

  // 输入作业内容
  inputContent(e) {
    this.setData({
      'newRecord.content': e.detail.value
    });
  },

  // 确认添加作业
  confirmAdd() {
    const { studentId, studentName, subject, content, date } = this.data.newRecord;
    
    if (!studentId || !subject || !content) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    storage.addRecord(studentId, studentName, subject, content, date);
    
    // 更新同步时间
    wx.setStorageSync('lastUpdateTime', Date.now());
    
    // 震动反馈
    wx.vibrateShort({
      type: 'medium'
    });
    
    this.setData({ showAddModal: false });
    this.loadRecords();
    
    wx.showToast({
      title: '添加成功',
      icon: 'success'
    });
  },

  // 更新作业状态
  updateStatus(e) {
    const id = e.currentTarget.dataset.id;
    const status = e.detail.value;
    
    storage.updateRecord(id, status, '');
    this.loadRecords();
    
    // 震动反馈
    wx.vibrateShort({
      type: 'medium'
    });
  },

  // 删除作业
  deleteRecord(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '删除后将无法恢复，是否继续？',
      success: (res) => {
        if (res.confirm) {
          storage.deleteRecord(id);
          this.loadRecords();
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
  }
});
