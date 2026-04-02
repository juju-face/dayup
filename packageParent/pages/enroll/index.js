// packageParent/pages/enroll/index.js
import mockData from '../../../mock/mockData.js';

Page({
  data: {
    timeSlotId: '',
    timeSlot: {},
    childrenList: [],
    selectedChildId: ''
  },
  
  onLoad(options) {
    // 接收timeSlotId参数
    if (options.timeSlotId) {
      this.setData({
        timeSlotId: options.timeSlotId
      });
      // 加载时段信息
      this.loadTimeSlotInfo(options.timeSlotId);
    }
    // 加载孩子列表
    this.loadChildrenList();
  },
  
  // 加载时段信息
  loadTimeSlotInfo(timeSlotId) {
    // 从mockData获取时段信息
    const timeSlot = mockData.timeSlots.find(slot => slot.id === timeSlotId);
    if (timeSlot) {
      this.setData({
        timeSlot: timeSlot
      });
    }
  },
  
  // 加载孩子列表
  loadChildrenList() {
    const childrenList = wx.getStorageSync('childrenList') || [];
    this.setData({
      childrenList: childrenList
    });
  },
  
  // 跳转到添加孩子页面
  navigateToAddChild() {
    wx.navigateTo({
      url: '/packageParent/pages/add-child/add-child'
    });
  },
  
  // 选择孩子
  selectChild(e) {
    const childId = e.currentTarget.dataset.childId;
    this.setData({
      selectedChildId: childId
    });
  },
  
  // 提交报名
  submitEnroll() {
    // 校验是否选择了孩子
    if (!this.data.selectedChildId) {
      wx.showModal({
        title: '提示',
        content: '请选择孩子',
        showCancel: false
      });
      return;
    }
    
    // 检查时段是否还有名额
    if (this.data.timeSlot.currentKids >= this.data.timeSlot.maxKids) {
      wx.showModal({
        title: '提示',
        content: '该时段名额已满',
        showCancel: false
      });
      return;
    }
    
    // 获取选中的孩子信息
    const selectedChild = this.data.childrenList.find(child => child.id === this.data.selectedChildId);
    if (!selectedChild) {
      wx.showModal({
        title: '提示',
        content: '孩子信息不存在',
        showCancel: false
      });
      return;
    }
    
    // 生成报名记录
    const enrollRecord = {
      id: Date.now().toString(),
      childId: this.data.selectedChildId,
      timeSlotId: this.data.timeSlotId,
      status: 'pending',
      createTime: new Date().toISOString(),
      parentPhone: selectedChild.parentPhone
    };
    
    // 获取现有报名记录
    let enrollList = wx.getStorageSync('enrollList') || [];
    // 追加新记录
    enrollList.push(enrollRecord);
    // 保存回本地存储
    wx.setStorageSync('enrollList', enrollList);
    
    // 更新时段的currentKids数量
    const updatedTimeSlots = mockData.timeSlots.map(slot => {
      if (slot.id === this.data.timeSlotId) {
        return {
          ...slot,
          currentKids: slot.currentKids + 1
        };
      }
      return slot;
    });
    // 更新mockData
    mockData.timeSlots = updatedTimeSlots;
    // 保存到本地存储（模拟更新）
    wx.setStorageSync('mockData', mockData);
    
    // 提交成功提示
    wx.showToast({
      title: '报名成功',
      icon: 'success',
      duration: 2000,
      success() {
        // 2秒后返回首页
        setTimeout(() => {
          wx.navigateBack({ delta: 2 });
        }, 2000);
      }
    });
  }
})