// packageTeacher/pages/check-records/index.js
import mockData from '../../../mock/mockData.js';

Page({
  data: {
    currentTab: 'today',
    timeSlotOptions: [],
    
    // 今日记录数据
    todayStats: {
      expected: 0,
      actual: 0,
      checkedOut: 0,
      pendingCheckOut: 0
    },
    todayRecords: [],
    
    // 补签管理数据
    makeupForm: {
      date: '',
      timeSlotIndex: 0,
      timeSlotId: '',
      timeSlotName: '',
      time: ''
    },
    makeupStudents: [],
    
    // 数据查询数据
    queryForm: {
      startDate: '',
      endDate: '',
      timeSlots: [],
      status: 'all'
    },
    queryResults: [],
    queryLoading: false,
    queryPage: 1,
    queryPageSize: 20
  },

  onLoad() {
    // 初始化时段选项
    this.initTimeSlots();
    // 初始化日期
    this.initDates();
  },

  onShow() {
    // 刷新今日记录
    if (this.data.currentTab === 'today') {
      this.loadTodayRecords();
    }
  },

  // 初始化时段选项
  initTimeSlots() {
    const timeSlots = mockData.timeSlots || [];
    this.setData({
      timeSlotOptions: timeSlots
    });
  },

  // 初始化日期
  initDates() {
    const today = new Date().toISOString().split('T')[0];
    this.setData({
      'makeupForm.date': today,
      'queryForm.startDate': today,
      'queryForm.endDate': today
    });
  },

  // 切换 Tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      currentTab: tab
    });
    
    // 根据 Tab 加载对应数据
    if (tab === 'today') {
      this.loadTodayRecords();
    } else if (tab === 'makeup') {
      this.loadMakeupStudents();
    }
  },

  // 加载今日记录
  loadTodayRecords() {
    const today = new Date().toISOString().split('T')[0];
    const enrollList = wx.getStorageSync('enrollList') || [];
    const checkInList = wx.getStorageSync('checkInList') || [];
    const childrenList = wx.getStorageSync('childrenList') || [];

    // 筛选今日记录
    const todayCheckIns = checkInList.filter(record => {
      return record.checkTime.split('T')[0] === today;
    });

    // 计算统计数据
    const checkInChildren = new Set();
    const checkOutChildren = new Set();
    
    todayCheckIns.forEach(record => {
      if (record.type === 'checkIn') {
        checkInChildren.add(record.childId);
      } else if (record.type === 'checkOut') {
        checkOutChildren.add(record.childId);
      }
    });

    const actual = checkInChildren.size;
    const checkedOut = Array.from(checkInChildren).filter(childId => checkOutChildren.has(childId)).length;
    const pendingCheckOut = actual - checkedOut;
    
    // 应到人数（从报名记录计算）
    const expected = enrollList.filter(enroll => enroll.status !== 'cancelled').length;

    // 构建记录列表
    const records = [];
    Array.from(checkInChildren).forEach(childId => {
      const child = childrenList.find(c => c.id === childId);
      if (child) {
        const checkInRecord = todayCheckIns.find(r => r.childId === childId && r.type === 'checkIn');
        const checkOutRecord = todayCheckIns.find(r => r.childId === childId && r.type === 'checkOut');
        
        records.push({
          id: checkInRecord.id,
          childId: child.id,
          childName: child.name,
          avatar: child.avatar,
          timeSlotName: checkInRecord.timeSlotName,
          checkInTime: this.formatTime(checkInRecord.checkTime),
          checkOutTime: checkOutRecord ? this.formatTime(checkOutRecord.checkTime) : null,
          type: checkOutRecord ? 'checkOut' : 'checkIn'
        });
      }
    });

    this.setData({
      todayStats: {
        expected: expected,
        actual: actual,
        checkedOut: checkedOut,
        pendingCheckOut: pendingCheckOut
      },
      todayRecords: records
    });
  },

  // 格式化时间
  formatTime(isoString) {
    const date = new Date(isoString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  },

  // 显示记录菜单
  showRecordMenu(e) {
    const record = e.currentTarget.dataset.record;
    wx.showActionSheet({
      itemList: ['补签为签退', '查看详情', '删除记录'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.makeupCheckOut(record);
            break;
          case 1:
            this.viewRecordDetail(record);
            break;
          case 2:
            this.deleteRecord(record);
            break;
        }
      }
    });
  },

  // 补签为签退
  makeupCheckOut(record) {
    const checkInList = wx.getStorageSync('checkInList') || [];
    
    const checkOutRecord = {
      id: Date.now().toString(),
      childId: record.childId,
      childName: record.childName,
      avatar: record.avatar,
      timeSlotId: record.timeSlotId,
      timeSlotName: record.timeSlotName,
      checkTime: new Date().toISOString(),
      type: 'checkOut',
      isMakeup: true
    };

    checkInList.unshift(checkOutRecord);
    wx.setStorageSync('checkInList', checkInList);

    wx.showToast({
      title: '补签成功',
      icon: 'success',
      duration: 1500
    });

    this.loadTodayRecords();
  },

  // 查看记录详情
  viewRecordDetail(record) {
    wx.showModal({
      title: '记录详情',
      content: `学生：${record.childName}\n时段：${record.timeSlotName}\n签到时间：${record.checkInTime}${record.checkOutTime ? '\n签退时间：' + record.checkOutTime : '\n状态：未签退'}`,
      showCancel: false
    });
  },

  // 删除记录
  deleteRecord(record) {
    wx.showModal({
      title: '删除记录',
      content: '确定要删除这条记录吗？',
      success: (res) => {
        if (res.confirm) {
          const checkInList = wx.getStorageSync('checkInList') || [];
          const updatedList = checkInList.filter(r => r.id !== record.id);
          wx.setStorageSync('checkInList', updatedList);
          
          this.loadTodayRecords();
          
          wx.showToast({
            title: '删除成功',
            icon: 'success',
            duration: 1500
          });
        }
      }
    });
  },

  // 补签管理 - 日期选择
  bindMakeupDateChange(e) {
    this.setData({
      'makeupForm.date': e.detail.value
    });
  },

  // 补签管理 - 时段选择
  bindMakeupTimeSlotChange(e) {
    const index = e.detail.value;
    const timeSlot = this.data.timeSlotOptions[index];
    this.setData({
      'makeupForm.timeSlotIndex': index,
      'makeupForm.timeSlotId': timeSlot.id,
      'makeupForm.timeSlotName': timeSlot.name
    }, () => {
      this.loadMakeupStudents();
    });
  },

  // 加载补签学生列表
  loadMakeupStudents() {
    const { timeSlotId } = this.data.makeupForm;
    if (!timeSlotId) return;

    const enrollList = wx.getStorageSync('enrollList') || [];
    const childrenList = wx.getStorageSync('childrenList') || [];

    // 筛选该时段的应到学生
    const students = [];
    enrollList.forEach(enroll => {
      if (enroll.timeSlotId === timeSlotId && enroll.status !== 'cancelled') {
        const child = childrenList.find(c => c.id === enroll.childId);
        if (child) {
          students.push({
            ...child,
            selected: false
          });
        }
      }
    });

    this.setData({
      makeupStudents: students
    });
  },

  // 切换学生选择
  toggleStudentSelection(e) {
    const index = e.currentTarget.dataset.index;
    const students = this.data.makeupStudents;
    students[index].selected = !students[index].selected;
    this.setData({
      makeupStudents: students
    });
  },

  // 补签管理 - 时间输入
  bindMakeupTimeInput(e) {
    this.setData({
      'makeupForm.time': e.detail.value
    });
  },

  // 提交补签
  submitMakeup() {
    const { date, timeSlotId, timeSlotName, time } = this.data.makeupForm;
    const selectedStudents = this.data.makeupStudents.filter(s => s.selected);

    if (!timeSlotId) {
      wx.showToast({ title: '请选择时段', icon: 'none' });
      return;
    }
    if (selectedStudents.length === 0) {
      wx.showToast({ title: '请选择学生', icon: 'none' });
      return;
    }
    if (!time) {
      wx.showToast({ title: '请输入时间', icon: 'none' });
      return;
    }

    const checkInList = wx.getStorageSync('checkInList') || [];
    const enrollList = wx.getStorageSync('enrollList') || [];

    // 构建完整时间字符串
    const checkTime = `${date}T${time}:00.000Z`;

    selectedStudents.forEach(student => {
      const checkInRecord = {
        id: Date.now().toString() + student.id,
        childId: student.id,
        childName: student.name,
        avatar: student.avatar,
        timeSlotId: timeSlotId,
        timeSlotName: timeSlotName,
        checkTime: checkTime,
        type: 'checkIn',
        isMakeup: true
      };
      checkInList.unshift(checkInRecord);

      // 更新报名记录状态
      const enrollIndex = enrollList.findIndex(e => e.childId === student.id && e.timeSlotId === timeSlotId);
      if (enrollIndex !== -1) {
        enrollList[enrollIndex].status = 'checkedIn';
      }
    });

    wx.setStorageSync('checkInList', checkInList);
    wx.setStorageSync('enrollList', enrollList);

    wx.showToast({
      title: '补签成功',
      icon: 'success',
      duration: 1500
    });

    // 重置表单
    this.setData({
      makeupStudents: this.data.makeupStudents.map(s => ({ ...s, selected: false })),
      'makeupForm.time': ''
    });
  },

  // 数据查询 - 开始日期
  bindQueryStartDateChange(e) {
    this.setData({
      'queryForm.startDate': e.detail.value
    });
  },

  // 数据查询 - 结束日期
  bindQueryEndDateChange(e) {
    this.setData({
      'queryForm.endDate': e.detail.value
    });
  },

  // 数据查询 - 时段选择
  bindQueryTimeSlotsChange(e) {
    this.setData({
      'queryForm.timeSlots': e.detail.value
    });
  },

  // 数据查询 - 状态选择
  bindQueryStatusChange(e) {
    this.setData({
      'queryForm.status': e.detail.value
    });
  },

  // 执行查询
  executeQuery() {
    const { startDate, endDate, timeSlots, status } = this.data.queryForm;
    const checkInList = wx.getStorageSync('checkInList') || [];
    const childrenList = wx.getStorageSync('childrenList') || [];

    this.setData({ queryLoading: true, queryPage: 1 });

    // 筛选记录
    let results = checkInList.filter(record => {
      const recordDate = record.checkTime.split('T')[0];
      const dateMatch = recordDate >= startDate && recordDate <= endDate;
      const timeSlotMatch = timeSlots.length === 0 || timeSlots.includes(record.timeSlotId);
      
      let statusMatch = true;
      if (status === 'checkedIn') {
        statusMatch = record.type === 'checkIn';
      } else if (status === 'notCheckedIn') {
        statusMatch = record.type !== 'checkIn';
      }

      return dateMatch && timeSlotMatch && statusMatch;
    });

    // 关联学生信息
    results = results.map(record => {
      const child = childrenList.find(c => c.id === record.childId);
      return {
        ...record,
        childName: child ? child.name : record.childName,
        avatar: child ? child.avatar : record.avatar,
        checkTime: this.formatTime(record.checkTime)
      };
    });

    this.setData({
      queryResults: results.slice(0, this.data.queryPageSize),
      queryLoading: false
    });
  },

  // 加载更多查询结果
  loadMoreQueryResults() {
    if (this.data.queryLoading) return;

    const { queryPage, queryPageSize, queryResults } = this.data;
    const nextPage = queryPage + 1;
    const start = (nextPage - 1) * queryPageSize;
    const end = start + queryPageSize;

    // 这里应该从完整的查询结果中切片
    // 简化处理，实际应该保存完整结果
    this.setData({
      queryPage: nextPage
    });
  },

  // 导出数据
  exportData() {
    const data = this.data.queryResults;
    const jsonStr = JSON.stringify(data, null, 2);

    wx.showModal({
      title: '导出数据',
      content: jsonStr.substring(0, 500) + (jsonStr.length > 500 ? '...' : ''),
      confirmText: '复制',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: jsonStr,
            success: () => {
              wx.showToast({
                title: '已复制到剪贴板',
                icon: 'success',
                duration: 1500
              });
            }
          });
        }
      }
    });
  }
});