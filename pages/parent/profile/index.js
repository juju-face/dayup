// pages/parent/profile/index.js
const app = getApp();

Page({
  data: {},

  onShow() {
    // 更新tabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateSelected();
    }
  },

  switchToTeacher() {
    wx.showModal({
      title: '切换角色',
      content: '确定要切换到老师端吗？',
      success: (res) => {
        if (res.confirm) {
          app.setRole('teacher');
          wx.switchTab({
            url: '/pages/homework/index'
          });
        }
      }
    });
  }
});
