// packageParent/pages/child-list/child-list.js
Page({
  data: {
    childrenList: []
  },
  
  onShow() {
    // 页面显示时加载孩子列表
    this.loadChildrenList();
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
  
  // 跳转到编辑孩子页面
  navigateToEditChild(e) {
    const childId = e.currentTarget.dataset.childId;
    wx.navigateTo({
      url: `/packageParent/pages/add-child/add-child?childId=${childId}`
    });
  },
  
  // 删除孩子信息
  deleteChild(e) {
    const childId = e.currentTarget.dataset.childId;
    const that = this;
    
    // 二次确认
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个孩子的信息吗？',
      success(res) {
        if (res.confirm) {
          // 获取现有孩子列表
          let childrenList = wx.getStorageSync('childrenList') || [];
          // 过滤掉要删除的孩子
          childrenList = childrenList.filter(child => child.id !== childId);
          // 保存回本地存储
          wx.setStorageSync('childrenList', childrenList);
          // 刷新列表
          that.setData({
            childrenList: childrenList
          });
          // 提示删除成功
          wx.showToast({
            title: '删除成功',
            icon: 'success',
            duration: 1500
          });
        }
      }
    });
  }
})