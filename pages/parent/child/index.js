const parentStorage = require('../../../utils/parent-storage.js');

Page({
  data: {
    child: null
  },

  onLoad() {
    this.loadChildInfo();
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

  copyPhone() {
    const { child } = this.data;
    if (!child || !child.parentPhone) return;

    wx.setClipboardData({
      data: child.parentPhone,
      success: () => {
        wx.showToast({
          title: '已复制',
          icon: 'success'
        });
      }
    });
  },

  editInfo() {
    wx.showModal({
      title: '提示',
      content: '跳转到编辑资料页面',
      showCancel: false
    });
  },

  contactTeacher() {
    wx.showModal({
      title: '提示',
      content: '跳转到联系老师页面',
      showCancel: false
    });
  }
});
