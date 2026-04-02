Page({
  data: {
    // 班级列表
    classList: [
      { id: 1, name: '一年级一班' },
      { id: 2, name: '一年级二班' },
      { id: 3, name: '二年级一班' },
      { id: 4, name: '二年级二班' },
      { id: 5, name: '三年级一班' }
    ],
    currentClass: 1,
    
    // 今日数据
    todayData: {
      inputCount: 45,
      completionRate: 85,
      correctionCount: 3,
      trend: 5
    },
    
    // 7日趋势
    weekTrend: [
      { date: '10/1', rate: 75, isToday: false },
      { date: '10/2', rate: 82, isToday: false },
      { date: '10/3', rate: 78, isToday: false },
      { date: '10/4', rate: 85, isToday: false },
      { date: '10/5', rate: 90, isToday: false },
      { date: '10/6', rate: 88, isToday: false },
      { date: '10/7', rate: 85, isToday: true }
    ],
    
    // 待关注学生
    attentionStudents: [
      { id: 1, name: '小明', completionRate: 45 },
      { id: 2, name: '小红', completionRate: 52 },
      { id: 3, name: '小刚', completionRate: 58 }
    ],
    
    // 家长数据
    parentData: {
      unreadCount: 3
    },
    
    // 动画
    cardAnimation: null
  },
  
  onLoad() {
    this.initAnimation();
    this.startCountUp();
  },
  
  // 初始化动画
  initAnimation() {
    this.animation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease-out'
    });
  },
  
  // 数字滚动动画
  startCountUp() {
    // 模拟数字滚动效果
    let currentCount = 0;
    const targetCount = this.data.todayData.inputCount;
    const interval = setInterval(() => {
      currentCount += Math.ceil(targetCount / 30);
      if (currentCount >= targetCount) {
        clearInterval(interval);
        currentCount = targetCount;
      }
      this.setData({
        'todayData.inputCount': currentCount
      });
    }, 30);
  },
  
  // 切换班级
  switchClass(e) {
    const classId = e.currentTarget.dataset.id;
    this.setData({ currentClass: classId });
    
    // 触发卡片动画
    this.animation.opacity(0).translateY(20).step();
    this.setData({ cardAnimation: this.animation.export() });
    
    // 模拟数据加载
    setTimeout(() => {
      // 随机生成新数据
      const newData = {
        inputCount: Math.floor(Math.random() * 50) + 30,
        completionRate: Math.floor(Math.random() * 40) + 60,
        correctionCount: Math.floor(Math.random() * 5),
        trend: Math.floor(Math.random() * 10) - 2
      };
      
      this.setData({ todayData: newData });
      
      // 恢复动画
      this.animation.opacity(1).translateY(0).step();
      this.setData({ cardAnimation: this.animation.export() });
      
      // 重新开始数字滚动
      this.startCountUp();
    }, 150);
  },
  
  // 效率工具点击
  toolClick(e) {
    const toolType = e.currentTarget.dataset.type;
    
    // 震动反馈
    wx.vibrateShort();
    
    // 模拟工具功能
    const toolNames = {
      template: '模板录入',
      copy: '复制昨日',
      batch: '批量录入',
      phrase: '快捷短语'
    };
    
    wx.showToast({
      title: `${toolNames[toolType]}功能开发中`,
      icon: 'none'
    });
  },
  
  // 家长沟通操作
  parentAction(e) {
    const actionType = e.currentTarget.dataset.type;
    
    if (actionType === 'notify') {
      wx.showModal({
        title: '一键通知',
        content: '确定要向所有家长发送通知吗？',
        success: (res) => {
          if (res.confirm) {
            wx.showToast({
              title: '通知已发送',
              icon: 'success'
            });
          }
        }
      });
    } else if (actionType === 'export') {
      wx.showLoading({
        title: '导出中...',
        mask: true
      });
      
      setTimeout(() => {
        wx.hideLoading();
        wx.showToast({
          title: '报表已导出',
          icon: 'success'
        });
      }, 1500);
    }
  },
  
  // 系统设置操作
  settingAction(e) {
    const actionType = e.currentTarget.dataset.type;
    
    switch (actionType) {
      case 'exportAll':
        wx.showLoading({
          title: '导出中...',
          mask: true
        });
        
        setTimeout(() => {
          wx.hideLoading();
          wx.showToast({
            title: '全部数据已导出',
            icon: 'success'
          });
        }, 2000);
        break;
        
      case 'reset':
        wx.showModal({
          title: '重置测试数据',
          content: '确定要重置所有测试数据吗？此操作不可恢复。',
          success: (res) => {
            if (res.confirm) {
              wx.showToast({
                title: '数据已重置',
                icon: 'success'
              });
            }
          }
        });
        break;
        
      case 'switchRole':
        wx.showActionSheet({
          itemList: ['切换为学生', '切换为家长', '取消'],
          success: (res) => {
            if (res.tapIndex === 0) {
              wx.showToast({
                title: '已切换为学生角色',
                icon: 'success'
              });
            } else if (res.tapIndex === 1) {
              wx.showToast({
                title: '已切换为家长角色',
                icon: 'success'
              });
            }
          }
        });
        break;
    }
  }
});