const parentCloud = require('../../../utils/parent-cloud.js');

Page({
  data: {
    currentChild: null,
    currentDate: '',
    formattedDate: '',
    homework: [],
    lastUpdateTime: '',
    isLoading: false
  },

  onLoad() {
    this.initPage();
  },

  onShow() {
    this.loadTodayHomework();
  },

  onPullDownRefresh() {
    this.loadTodayHomework();
  },

  initPage() {
    const currentChild = wx.getStorageSync('bound_student');
    if (!currentChild) {
      wx.showModal({
        title: '提示',
        content: '请先绑定孩子',
        showCancel: false,
        success: () => {
          // 可以跳转到绑定页面
          // wx.navigateTo({
          //   url: '/packageParent/pages/add-child/index'
          // });
        }
      });
      return;
    }

    const today = new Date();
    const currentDate = today.toISOString().split('T')[0];
    const formattedDate = this.formatDate(today);

    this.setData({
      currentChild,
      currentDate,
      formattedDate
    });
  },

  formatDate(date) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = weekdays[date.getDay()];
    return `${month}月${day}日 ${weekday}`;
  },

  // 从云数据库加载今日作业
  async loadTodayHomework() {
    this.setData({ isLoading: true });

    try {
      const homework = await parentCloud.getTodayHomeworkFromCloud();
      
      // 科目名称映射
      const subjectMap = {
        '语文': '语文',
        '数学': '数学',
        '英语': '英语',
        '其他': '其他'
      };

      const formattedHomework = homework.map(h => ({
        ...h,
        subjectName: subjectMap[h.subject] || h.subject || '其他',
        statusText: this.getStatusText(h.status),
        statusClass: this.getStatusClass(h.status)
      }));

      // 更新最后同步时间
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const lastUpdateTime = `${hours}:${minutes}`;

      this.setData({
        homework: formattedHomework,
        lastUpdateTime
      });
    } catch (error) {
      console.error('加载作业失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
      wx.stopPullDownRefresh();
    }
  },

  // 获取状态文本
  getStatusText(status) {
    const statusMap = {
      0: '未完成',
      1: '已完成',
      2: '待订正'
    };
    return statusMap[status] || '未知';
  },

  // 获取状态样式类
  getStatusClass(status) {
    const classMap = {
      0: 'status-pending',
      1: 'status-completed',
      2: 'status-correction'
    };
    return classMap[status] || '';
  },

  // 下拉刷新
  handleRefresh() {
    this.loadTodayHomework();
  },

  // 查看作业详情
  viewHomeworkDetail(e) {
    const record = e.currentTarget.dataset.record;
    wx.showModal({
      title: '作业详情',
      content: `科目：${record.subjectName}\n内容：${record.content}\n状态：${record.statusText}`,
      showCancel: false
    });
  }

});
