const parentStorage = require('../../../utils/parent-storage.js');
const teacherStorage = require('../../../utils/storage.js');

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
    this.loadTodayRecords();
  },

  onPullDownRefresh() {
    this.loadTodayRecords();
  },

  initPage() {
    const currentChild = parentStorage.getBoundStudent();
    if (!currentChild) {
      wx.showModal({
        title: '提示',
        content: '请先绑定孩子',
        showCancel: false
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

  loadTodayRecords() {
    const { currentDate } = this.data;
    const currentChild = parentStorage.getBoundStudent();
    
    if (!currentChild) return;

    this.setData({ isLoading: true });

    try {
      // 从 storage 读取记录
      const records = teacherStorage.getRecordsByStudent(currentChild.id);
      const todayRecords = records.filter(r => r.date === currentDate);

      const subjectMap = {
        'chinese': '语文',
        'math': '数学',
        'english': '英语',
        'other': '其他'
      };

      const homework = todayRecords.map(h => ({
        ...h,
        subjectName: subjectMap[h.subject] || '其他'
      }));

      // 读取上次同步时间
      const lastUpdateTimestamp = wx.getStorageSync('lastUpdateTime');
      let lastUpdateTime = '';
      if (lastUpdateTimestamp) {
        const date = new Date(lastUpdateTimestamp);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        lastUpdateTime = `${hours}:${minutes}`;
      }

      this.setData({
        homework,
        lastUpdateTime
      });
    } catch (error) {
      console.error('加载作业记录失败:', error);
    } finally {
      this.setData({ isLoading: false });
      wx.stopPullDownRefresh();
    }
  },

  handleRefresh() {
    this.loadTodayRecords();
  }

});
