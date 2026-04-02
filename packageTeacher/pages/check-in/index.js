// packageTeacher/pages/check-in/index.js
import mockData from '../../../mock/mockData.js';

Page({
  data: {
    checkType: 'checkIn', // checkIn 或 checkOut
    timeSlots: [],
    timeSlotNames: [],
    timeSlotIndex: 0,
    selectedTimeSlot: {},
    childrenList: [],
    todayRecords: []
  },
  
  onLoad() {
    // 初始化数据
    this.initData();
  },
  
  onShow() {
    // 页面显示时刷新今日签到记录
    this.loadTodayRecords();
  },
  
  // 初始化数据
  initData() {
    // 加载时段列表
    this.loadTimeSlots();
    // 加载孩子列表
    this.loadChildrenList();
    // 加载今日签到记录
    this.loadTodayRecords();
  },
  
  // 加载时段列表
  loadTimeSlots() {
    const timeSlots = mockData.timeSlots;
    const timeSlotNames = timeSlots.map(slot => slot.name);
    this.setData({
      timeSlots: timeSlots,
      timeSlotNames: timeSlotNames,
      selectedTimeSlot: timeSlots[0] || {}
    });
  },
  
  // 加载孩子列表
  loadChildrenList() {
    const childrenList = wx.getStorageSync('childrenList') || [];
    this.setData({
      childrenList: childrenList
    });
  },
  
  // 加载今日签到记录
  loadTodayRecords() {
    const checkInList = wx.getStorageSync('checkInList') || [];
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = checkInList
      .filter(record => record.checkTime.includes(today))
      .sort((a, b) => new Date(b.checkTime) - new Date(a.checkTime));
    this.setData({
      todayRecords: todayRecords
    });
  },
  
  // 切换签到/签退
  switchCheckType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      checkType: type
    });
  },
  
  // 时段选择
  bindTimeSlotChange(e) {
    const index = e.detail.value;
    this.setData({
      timeSlotIndex: index,
      selectedTimeSlot: this.data.timeSlots[index]
    });
  },
  
  // 模拟扫码
  scanCode() {
    const that = this;
    wx.showActionSheet({
      itemList: ['输入孩子ID', '从孩子列表选择'],
      success(res) {
        if (res.tapIndex === 0) {
          // 输入孩子ID
          that.inputChildId();
        } else if (res.tapIndex === 1) {
          // 从孩子列表选择
          that.selectChildFromList();
        }
      }
    });
  },
  
  // 输入孩子ID
  inputChildId() {
    const that = this;
    wx.showModal({
      title: '输入孩子ID',
      content: '请输入孩子的ID',
      inputPlaceholder: '孩子ID',
      success(res) {
        if (res.confirm) {
          const childId = res.content.trim();
          if (childId) {
            that.checkChild(childId);
          }
        }
      }
    });
  },
  
  // 从孩子列表选择
  selectChildFromList() {
    const that = this;
    const children = this.data.childrenList;
    if (children.length === 0) {
      wx.showModal({
        title: '提示',
        content: '暂无孩子信息',
        showCancel: false
      });
      return;
    }
    
    const childNames = children.map(child => child.name);
    wx.showActionSheet({
      itemList: childNames,
      success(res) {
        const child = children[res.tapIndex];
        that.checkChild(child.id);
      }
    });
  },
  
  // 检查孩子信息
  checkChild(childId) {
    const child = this.data.childrenList.find(c => c.id === childId);
    if (!child) {
      wx.showModal({
        title: '提示',
        content: '孩子信息不存在',
        showCancel: false
      });
      return;
    }
    
    // 显示孩子信息确认弹窗
    this.confirmCheckIn(child);
  },
  
  // 确认签到/签退
  confirmCheckIn(child) {
    const that = this;
    const checkType = this.data.checkType;
    const timeSlot = this.data.selectedTimeSlot;
    
    wx.showModal({
      title: checkType === 'checkIn' ? '确认签到' : '确认签退',
      content: `孩子：${child.name}\n时段：${timeSlot.name}\n时间：${new Date().toLocaleString()}`,
      success(res) {
        if (res.confirm) {
          // 生成签到记录
          that.createCheckInRecord(child, timeSlot);
        }
      }
    });
  },
  
  // 生成签到记录
  createCheckInRecord(child, timeSlot) {
    const checkType = this.data.checkType;
    const checkInList = wx.getStorageSync('checkInList') || [];
    
    // 生成签到记录
    const record = {
      id: Date.now().toString(),
      childId: child.id,
      childName: child.name,
      timeSlotId: timeSlot.id,
      timeSlotName: timeSlot.name,
      checkTime: new Date().toISOString(),
      type: checkType
    };
    
    // 追加到列表
    checkInList.push(record);
    // 保存回本地存储
    wx.setStorageSync('checkInList', checkInList);
    
    // 更新报名记录状态
    if (checkType === 'checkIn') {
      this.updateEnrollStatus(child.id, timeSlot.id);
    }
    
    // 提示成功
    wx.showToast({
      title: checkType === 'checkIn' ? '签到成功' : '签退成功',
      icon: 'success',
      duration: 1500
    });
    
    // 刷新今日签到记录
    this.loadTodayRecords();
  },
  
  // 更新报名记录状态
  updateEnrollStatus(childId, timeSlotId) {
    const enrollList = wx.getStorageSync('enrollList') || [];
    const updatedEnrollList = enrollList.map(enroll => {
      if (enroll.childId === childId && enroll.timeSlotId === timeSlotId) {
        return {
          ...enroll,
          status: 'checkedIn'
        };
      }
      return enroll;
    });
    // 保存回本地存储
    wx.setStorageSync('enrollList', updatedEnrollList);
  }
})