const parentStorage = require('../../../utils/parent-storage.js');

Page({
  data: {
    child: null,
    feeInfo: {
      priceMonth: 2800,
      priceTerm: 12800,
      originalPriceTerm: 15000,
      paidStatus: 'paid',
      remainingDays: 45,
      expireDate: '2026-06-30',
      services: ['午餐', '午休', '作业辅导']
    },
    history: [
      { date: '2026-03-01', amount: 2800, status: 'paid' },
      { date: '2026-02-01', amount: 2800, status: 'paid' },
      { date: '2026-01-01', amount: 2800, status: 'paid' }
    ]
  },

  onLoad() {
    this.loadChildInfo();
    this.loadFeeInfo();
  },

  onShow() {
    this.loadChildInfo();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateSelected();
    }
  },

  loadChildInfo() {
    const currentChild = parentStorage.getBoundStudent();
    if (!currentChild) {
      wx.showModal({
        title: '提示',
        content: '请先绑定孩子',
        showCancel: false
      });
      return;
    }
    this.setData({ child: currentChild });
  },

  loadFeeInfo() {
    try {
      const feeInfo = wx.getStorageSync('feeInfo');
      if (feeInfo) {
        this.setData({ feeInfo });
      }
    } catch (e) {
      console.log('使用默认费用信息');
    }
  },

  handleEditChild() {
    wx.showModal({
      title: '提示',
      content: '跳转到编辑孩子资料页面',
      showCancel: false
    });
  },

  handleFeeDetail() {
    wx.showModal({
      title: '费用详情',
      content: '跳转到费用详情页面',
      showCancel: false
    });
  },

  handleContactTeacher() {
    wx.showModal({
      title: '提示',
      content: '联系老师功能',
      showCancel: false
    });
  },

  handleSwitchChild() {
    wx.showModal({
      title: '切换孩子',
      content: '跳转到切换孩子页面',
      showCancel: false
    });
  },

  handleSwitchRole() {
    wx.showModal({
      title: '切换角色',
      content: '确定要切换到教师端吗？',
      success: (res) => {
        if (res.confirm) {
          const app = getApp();
          app.setRole('teacher');
          wx.reLaunch({
            url: '/pages/homework/index'
          });
        }
      }
    });
  }
});
