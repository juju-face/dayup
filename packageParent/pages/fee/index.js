Page({
  data: {
    feeInfo: {
      priceMonth: 2800,
      priceTerm: 12800,
      originalPriceTerm: 15000,
      paidStatus: 'paid',
      remainingDays: 45,
      expireDate: '2026-06-30',
      services: ['午餐', '午休', '作业辅导'],
      history: [
        { date: '2026-03-01', amount: 2800, status: 'paid' },
        { date: '2026-02-01', amount: 2800, status: 'paid' },
        { date: '2026-01-01', amount: 2800, status: 'paid' }
      ]
    }
  },

  onLoad() {
    this.loadFeeInfo();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateSelected();
    }
  },

  loadFeeInfo() {
    // 从 storage 读取 mock 数据
    try {
      const feeInfo = wx.getStorageSync('feeInfo');
      if (feeInfo) {
        this.setData({ feeInfo });
      }
    } catch (e) {
      console.log('使用默认费用信息');
    }
  },

  handlePay() {
    wx.showModal({
      title: '提示',
      content: '跳转到支付页面',
      showCancel: false
    });
  }
});
