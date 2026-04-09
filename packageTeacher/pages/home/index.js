// packageTeacher/pages/home/index.js
import mockData from '../../../mock/mockData.js';

Page({
  data: {
    timeSlotOptions: [],
    timeSlotIndex: 0,
    currentTimeSlot: {},
    stats: {
      expected: 0,
      actual: 0,
      inClass: 0,
      pendingCheckOut: 0
    },
    inClassStudents: [],
    refreshTimer: null,
    // [修改点1] 在原有 data 基础上增加 floatBtnAnimation
    floatBtnAnimation: '',
    teacherInfo: null
  },

  onLoad() {
    // 检查是否已登录
    const teacherInfo = wx.getStorageSync('teacher_info');
    if (!teacherInfo) {
      // 未登录，跳转到登录页
      wx.redirectTo({
        url: '/packageTeacher/pages/login/index'
      });
      return;
    }
    
    this.setData({ teacherInfo });
    
    // 初始化时段选项
    this.initTimeSlots();
  },

  onShow() {
    // 检查登录状态
    const teacherInfo = wx.getStorageSync('teacher_info');
    if (!teacherInfo) {
      wx.redirectTo({
        url: '/packageTeacher/pages/login/index'
      });
      return;
    }
    
    // 【调试代码】输出当前页面样式类
    console.log('[调试] 当前页面样式类:', 'teacher-home theme-teacher');
    console.log('[调试] 当前角色:', getApp().globalData.role);
    console.log('[调试] 老师信息:', teacherInfo);
    
    // 【调试代码】强制刷新 setData
    this.setData({ refresh: Date.now() });
    
    // 页面显示时刷新数据
    this.refreshData();
    
    // 每30秒自动刷新
    this.startRefreshTimer();
  },

  onHide() {
    // 页面隐藏时清除定时器
    this.clearRefreshTimer();
  },

  onUnload() {
    // 页面卸载时清除定时器
    this.clearRefreshTimer();
  },

  // 初始化时段选项
  initTimeSlots() {
    // 从 mock 数据获取时段列表
    const timeSlots = mockData.timeSlots || [];
    this.setData({
      timeSlotOptions: timeSlots,
      currentTimeSlot: timeSlots[0] || {},
      timeSlotIndex: 0
    });
  },

  // 时段切换
  bindTimeSlotChange(e) {
    const index = e.detail.value;
    const timeSlotOptions = this.data.timeSlotOptions;
    this.setData({
      timeSlotIndex: index,
      currentTimeSlot: timeSlotOptions[index]
    });
    // 重新计算数据
    this.calculateStats();
  },

  // 刷新数据
  refreshData() {
    this.calculateStats();
  },

  // 开始自动刷新定时器
  startRefreshTimer() {
    this.clearRefreshTimer();
    this.refreshTimer = setInterval(() => {
      this.refreshData();
    }, 30000); // 30秒刷新一次
  },

  // 清除自动刷新定时器
  clearRefreshTimer() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  },

  // 计算统计数据
  calculateStats() {
    const currentTimeSlot = this.data.currentTimeSlot;
    if (!currentTimeSlot.id) return;

    // 从 storage 读取数据
    const enrollList = wx.getStorageSync('enrollList') || [];
    const checkInList = wx.getStorageSync('checkInList') || [];
    const childrenList = wx.getStorageSync('childrenList') || [];
    const today = new Date().toISOString().split('T')[0];

    // 筛选当前时段的报名记录
    const currentEnrolls = enrollList.filter(enroll => {
      return enroll.timeSlotId === currentTimeSlot.id && enroll.status !== 'cancelled';
    });

    // 筛选今天当前时段的签到记录
    const todayCheckIns = checkInList.filter(record => {
      return record.timeSlotId === currentTimeSlot.id && record.checkTime.split('T')[0] === today;
    });

    // 计算应到人数
    const expected = currentEnrolls.length;

    // 计算实到人数（去重）
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
    const pendingCheckOut = Array.from(checkInChildren).filter(childId => !checkOutChildren.has(childId)).length;
    const inClass = pendingCheckOut;

    // 计算在班学生列表
    const inClassStudentIds = Array.from(checkInChildren).filter(childId => !checkOutChildren.has(childId));
    const inClassStudents = [];

    inClassStudentIds.forEach(childId => {
      // 从 childrenList 中查找学生信息
      const child = childrenList.find(c => c.id === childId);
      if (child) {
        // 检查是否刚刚签到（30分钟内）
        const recentCheckIn = todayCheckIns.find(record => 
          record.childId === childId && 
          record.type === 'checkIn'
        );
        
        const justCheckedIn = recentCheckIn ? this.isJustCheckedIn(recentCheckIn.checkTime) : false;

        inClassStudents.push({
          ...child,
          justCheckedIn: justCheckedIn
        });
      }
    });

    // 更新数据
    this.setData({
      stats: {
        expected: expected,
        actual: actual,
        inClass: inClass,
        pendingCheckOut: pendingCheckOut
      },
      inClassStudents: inClassStudents
    });
  },

  // 判断是否刚刚签到（30分钟内）
  isJustCheckedIn(checkTime) {
    const checkInTime = new Date(checkTime);
    const now = new Date();
    const diffMinutes = (now - checkInTime) / (1000 * 60);
    return diffMinutes <= 30;
  },

  // 显示学生详情
  showStudentDetail(e) {
    const student = e.currentTarget.dataset.student;
    wx.showModal({
      title: '学生详情',
      content: `姓名：${student.name}\n年龄：${student.age}岁\n家长电话：${student.parentPhone}\n过敏信息：${student.allergies || '无'}`,
      confirmText: '立即签退',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.checkOutStudent(student);
        }
      }
    });
  },

  // 学生签退
  checkOutStudent(student) {
    const currentTimeSlot = this.data.currentTimeSlot;
    const checkInList = wx.getStorageSync('checkInList') || [];

    // 创建签退记录
    const checkOutRecord = {
      id: Date.now().toString(),
      childId: student.id,
      childName: student.name,
      avatar: student.avatar,
      timeSlotId: currentTimeSlot.id,
      timeSlotName: currentTimeSlot.name,
      checkTime: new Date().toISOString(),
      type: 'checkOut'
    };

    // 添加签退记录
    checkInList.push(checkOutRecord);
    wx.setStorageSync('checkInList', checkInList);

    // 刷新数据
    this.refreshData();

    wx.showToast({
      title: '签退成功',
      icon: 'success',
      duration: 1500
    });
  },

  // 跳转到签到明细页
  navigateToRecords() {
    wx.switchTab({
      url: '/packageTeacher/pages/check-records/index'
    });
  },

  // [修改点2] 在 methods 中增加 onFloatCheck 方法
  onFloatCheck() {
    wx.showActionSheet({
      itemList: ['模拟扫码输入', '从列表选择', '连续签到模式'],
      success: (res) => {
        console.log('选择', res.tapIndex);
        // 这里后续实现逻辑
      }
    });
  },

  // 显示签到选项（原有方法，保留）
  showCheckInOptions() {
    wx.showActionSheet({
      itemList: ['模拟扫码输入', '从列表选择', '连续签到模式'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.simulateScanCode();
            break;
          case 1:
            this.selectFromList();
            break;
          case 2:
            this.toggleContinuousMode();
            break;
        }
      }
    });
  },

  // 模拟扫码输入
  simulateScanCode() {
    wx.showModal({
      title: '模拟扫码',
      content: '请输入学生ID',
      inputPlaceholder: '学生ID',
      success: (res) => {
        if (res.confirm) {
          const childId = res.content;
          this.processStudentCheckIn(childId);
        }
      }
    });
  },

  // 从列表选择学生
  selectFromList() {
    // 从 storage 读取数据
    const enrollList = wx.getStorageSync('enrollList') || [];
    const checkInList = wx.getStorageSync('checkInList') || [];
    const childrenList = wx.getStorageSync('childrenList') || [];
    const currentTimeSlot = this.data.currentTimeSlot;
    const today = new Date().toISOString().split('T')[0];

    // 筛选当前时段的报名记录
    const currentEnrolls = enrollList.filter(enroll => {
      return enroll.timeSlotId === currentTimeSlot.id && enroll.status !== 'cancelled';
    });

    // 筛选今天当前时段的签到记录
    const todayCheckIns = checkInList.filter(record => {
      return record.timeSlotId === currentTimeSlot.id && record.checkTime.split('T')[0] === today;
    });

    // 构建学生列表
    const studentList = [];
    currentEnrolls.forEach(enroll => {
      const child = childrenList.find(c => c.id === enroll.childId);
      if (child) {
        // 检查签到状态
        const hasCheckIn = todayCheckIns.some(record => 
          record.childId === child.id && record.type === 'checkIn'
        );
        const hasCheckOut = todayCheckIns.some(record => 
          record.childId === child.id && record.type === 'checkOut'
        );

        let status = '未签到';
        if (hasCheckIn && !hasCheckOut) {
          status = '已签到';
        } else if (hasCheckIn && hasCheckOut) {
          status = '已签退';
        }

        studentList.push({
          ...child,
          status: status,
          hasCheckIn: hasCheckIn,
          hasCheckOut: hasCheckOut
        });
      }
    });

    // 排序：未签到的在前面
    studentList.sort((a, b) => {
      if (a.status === '未签到' && b.status !== '未签到') return -1;
      if (a.status !== '未签到' && b.status === '未签到') return 1;
      return 0;
    });

    // 显示学生列表
    const studentNames = studentList.map(student => `${student.name} (${student.status})`);
    wx.showActionSheet({
      itemList: studentNames,
      success: (res) => {
        const selectedStudent = studentList[res.tapIndex];
        this.processStudentCheckIn(selectedStudent.id);
      }
    });
  },

  // 连续签到模式
  toggleContinuousMode() {
    // 这里可以实现连续签到模式的开关逻辑
    wx.showToast({
      title: '连续签到模式已开启',
      icon: 'success',
      duration: 1500
    });
  },

  // 处理学生签到
  processStudentCheckIn(childId) {
    // 从 storage 读取数据
    const checkInList = wx.getStorageSync('checkInList') || [];
    const childrenList = wx.getStorageSync('childrenList') || [];
    const currentTimeSlot = this.data.currentTimeSlot;
    const today = new Date().toISOString().split('T')[0];

    // 查找学生信息
    const child = childrenList.find(c => c.id === childId);
    if (!child) {
      wx.showToast({
        title: '学生不存在',
        icon: 'error',
        duration: 1500
      });
      return;
    }

    // 筛选今天当前时段的签到记录
    const todayCheckIns = checkInList.filter(record => {
      return record.timeSlotId === currentTimeSlot.id && record.checkTime.split('T')[0] === today;
    });

    // 检查签到状态
    const hasCheckIn = todayCheckIns.some(record => 
      record.childId === child.id && record.type === 'checkIn'
    );
    const hasCheckOut = todayCheckIns.some(record => 
      record.childId === child.id && record.type === 'checkOut'
    );

    if (hasCheckIn && !hasCheckOut) {
      // 已签到未签退，询问是否签退
      wx.showModal({
        title: '学生状态',
        content: `${child.name} 已签到未签退，是否进行签退？`,
        confirmText: '签退',
        cancelText: '查看详情',
        success: (res) => {
          if (res.confirm) {
            this.checkOutStudent(child);
          } else if (res.cancel) {
            this.showStudentDetail({ currentTarget: { dataset: { student: child } } });
          }
        }
      });
    } else if (!hasCheckIn) {
      // 未签到，确认签到
      wx.showModal({
        title: '确认签到',
        content: `确认签到 ${child.name}？\n时段：${currentTimeSlot.name}`,
        confirmText: '确认',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this.checkInStudent(child);
          }
        }
      });
    } else {
      // 已签退，提示
      wx.showToast({
        title: '该学生今日已签退',
        icon: 'info',
        duration: 1500
      });
    }
  },

  // 学生签到
  checkInStudent(student) {
    const currentTimeSlot = this.data.currentTimeSlot;
    const checkInList = wx.getStorageSync('checkInList') || [];
    const enrollList = wx.getStorageSync('enrollList') || [];

    // 创建签到记录
    const checkInRecord = {
      id: Date.now().toString(),
      childId: student.id,
      childName: student.name,
      avatar: student.avatar,
      timeSlotId: currentTimeSlot.id,
      timeSlotName: currentTimeSlot.name,
      checkTime: new Date().toISOString(),
      type: 'checkIn'
    };

    // 添加签到记录到数组开头
    checkInList.unshift(checkInRecord);
    wx.setStorageSync('checkInList', checkInList);

    // 更新报名记录状态
    const updatedEnrollList = enrollList.map(enroll => {
      if (enroll.childId === student.id && enroll.timeSlotId === currentTimeSlot.id) {
        return { ...enroll, status: 'checkedIn' };
      }
      return enroll;
    });
    wx.setStorageSync('enrollList', updatedEnrollList);

    // 震动反馈
    wx.vibrateShort({ type: 'light' });

    // 成功提示
    wx.showToast({
      title: '签到成功',
      icon: 'success',
      duration: 800
    });

    // 刷新数据
    this.refreshData();
  },

  // 学生签退（重写原有方法，添加震动和动画效果）
  checkOutStudent(student) {
    const currentTimeSlot = this.data.currentTimeSlot;
    const checkInList = wx.getStorageSync('checkInList') || [];

    // 创建签退记录
    const checkOutRecord = {
      id: Date.now().toString(),
      childId: student.id,
      childName: student.name,
      avatar: student.avatar,
      timeSlotId: currentTimeSlot.id,
      timeSlotName: currentTimeSlot.name,
      checkTime: new Date().toISOString(),
      type: 'checkOut'
    };

    // 添加签退记录到数组开头
    checkInList.unshift(checkOutRecord);
    wx.setStorageSync('checkInList', checkInList);

    // 震动反馈
    wx.vibrateShort({ type: 'light' });

    // 成功提示
    wx.showToast({
      title: '签退成功',
      icon: 'success',
      duration: 800
    });

    // 刷新数据
    this.refreshData();
  }
});
