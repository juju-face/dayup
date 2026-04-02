// pages/index/index.js
Page({
  data: {},
  
  selectRole(e) {
    const role = e.currentTarget.dataset.role;
    const app = getApp();
    
    // 设置全局角色状态
    app.setRole(role);
    
    // 跳转到对应角色的首页
    if (role === 'parent') {
      wx.redirectTo({
        url: '/packageParent/pages/home/home'
      });
    } else {
      // 老师端跳转到作业管理页（新的首页）
      wx.switchTab({
        url: '/pages/homework/index'
      });
    }
  }
})
