// pages/parent/today/index.js
const parentStorage = require('../../../utils/parent-storage.js');
const teacherStorage = require('../../../utils/storage.js');

Page({
  data: {
    boundStudent: {},
    children: [],
    todayDate: '',
    homework: []
  },

  onLoad() {
    this.initDate();
    this.loadData();
  },

  onShow() {
    this.loadData();
    // 更新tabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateSelected();
    }
  },

  // 初始化日期
  initDate() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekday = weekdays[now.getDay()];
    
    this.setData({
      todayDate: `${month}月${date}日 ${weekday}`
    });
  },

  // 加载数据
  loadData() {
    // 加载绑定的学生
    const boundStudent = parentStorage.getBoundStudent();
    
    // 加载所有孩子列表（用于切换）
    const children = teacherStorage.getStudents();
    
    // 加载今日作业
    const homework = parentStorage.getTodayRecords();
    
    this.setData({
      boundStudent: boundStudent || {},
      children: children || [],
      homework: homework || []
    });

    // 更新tabBar徽章
    this.updateTabBarBadge(homework);
  },

  // 更新tabBar徽章
  updateTabBarBadge(homework) {
    const pendingCount = homework.filter(h => h.status === 0).length;
    
    if (pendingCount > 0) {
      wx.setTabBarBadge({
        index: 0,
        text: String(pendingCount)
      });
    } else {
      wx.removeTabBarBadge({
        index: 0
      });
    }
  },

  // 切换孩子
  switchChild() {
    const children = this.data.children;
    const currentId = this.data.boundStudent.id;
    
    const items = children.map(c => c.name);
    
    wx.showActionSheet({
      itemList: items,
      success: (res) => {
        const selectedChild = children[res.tapIndex];
        if (selectedChild.id !== currentId) {
          parentStorage.bindStudent(selectedChild.id);
          this.loadData();
          wx.showToast({
            title: '已切换',
            icon: 'success'
          });
        }
      }
    });
  },

  // 查看历史
  viewHistory() {
    wx.switchTab({
      url: '/pages/parent/record/index'
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadData();
    wx.stopPullDownRefresh();
  }
});
