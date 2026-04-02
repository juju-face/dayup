// packageParent/pages/messages/index.js
Page({
  data: {
    currentTab: 'all',
    messages: [
      {
        id: '1',
        type: 'homework',
        title: '新作业布置',
        content: '张老师为您的孩子布置了新的数学作业：练习册P12-15',
        time: '2026-03-31 14:30',
        childName: '张三',
        read: false
      },
      {
        id: '2',
        type: 'feedback',
        title: '作业已完成',
        content: '您的孩子已完成语文作业，老师评价：完成得很好！',
        time: '2026-03-31 12:15',
        childName: '张三',
        read: false
      },
      {
        id: '3',
        type: 'homework',
        title: '作业待订正',
        content: '您的孩子有一份数学作业需要订正，请督促孩子及时完成',
        time: '2026-03-30 16:45',
        childName: '张三',
        read: true
      },
      {
        id: '4',
        type: 'feedback',
        title: '作业评语',
        content: '英语作业完成情况良好，单词拼写正确，继续保持！',
        time: '2026-03-30 10:20',
        childName: '张三',
        read: true
      }
    ],
    filteredMessages: []
  },

  onLoad() {
    this.filterMessages();
  },

  onShow() {
    // 更新tabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateSelected();
    }
  },

  // 切换标签
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
    this.filterMessages();
  },

  // 筛选消息
  filterMessages() {
    const { currentTab, messages } = this.data;
    
    if (currentTab === 'all') {
      this.setData({ filteredMessages: messages });
    } else {
      const filtered = messages.filter(m => m.type === currentTab);
      this.setData({ filteredMessages: filtered });
    }
  },

  // 标记为已读
  markAsRead(e) {
    const id = e.currentTarget.dataset.id;
    const messages = this.data.messages.map(m => {
      if (m.id === id) {
        return { ...m, read: true };
      }
      return m;
    });
    
    this.setData({ messages });
    this.filterMessages();
    
    wx.showToast({
      title: '已标记为已读',
      icon: 'success'
    });
  },

  // 查看详情
  viewDetail(e) {
    const id = e.currentTarget.dataset.id;
    const message = this.data.messages.find(m => m.id === id);
    
    if (message) {
      // 标记为已读
      this.markAsRead(e);
      
      // 根据消息类型跳转到不同页面
      if (message.type === 'homework') {
        wx.navigateTo({
          url: '../homework/index'
        });
      } else {
        wx.showModal({
          title: message.title,
          content: message.content,
          showCancel: false
        });
      }
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    // 这里可以添加从服务器获取新消息的逻辑
    wx.showToast({
      title: '刷新成功',
      icon: 'success'
    });
    wx.stopPullDownRefresh();
  }
});
