// packageParent/pages/home/home.js
Page({
  data: {
    timeSlots: []
  },
  
  onLoad() {
    // 从本地存储获取托管时段数据
    this.loadTimeSlots();
  },
  
  loadTimeSlots() {
    const mockData = wx.getStorageSync('mockData');
    if (mockData && mockData.timeSlots) {
      this.setData({
        timeSlots: mockData.timeSlots
      });
    }
  },
  
  navigateToTimeSlots() {
    // 跳转到查看时段页面
    wx.navigateTo({
      url: '/packageParent/pages/timeSlots/timeSlots'
    });
  },
  
  navigateToChild() {
    // 跳转到我的孩子页面
    wx.navigateTo({
      url: '/packageParent/pages/child/child'
    });
  },
  
  navigateToOrder() {
    // 跳转到报名记录页面
    wx.navigateTo({
      url: '/packageParent/pages/order/order'
    });
  },
  
  switchRole() {
    // 清除角色状态
    wx.removeStorageSync('role');
    // 跳转到角色选择页
    wx.redirectTo({
      url: '/pages/index/index'
    });
  }
})