const parentStorage = require('../../../utils/parent-storage.js');

Page({
  data: {
    currentFilter: 'week',
    startDate: '',
    endDate: '',
    stats: {
      completionRate: 0,
      completed: 0,
      pending: 0,
      correction: 0,
      trend: ''
    },
    weeklyData: [],
    groupedRecords: [],
    loading: false
  },

  onLoad() {
    this.initDateRange();
    this.loadData();
  },

  onShow() {
    this.loadData();
    // 更新tabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateSelected();
    }
  },

  onPullDownRefresh() {
    this.loadData();
    wx.stopPullDownRefresh();
  },

  // 初始化日期范围
  initDateRange() {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    this.setData({
      startDate: this.formatDate(weekAgo),
      endDate: this.formatDate(today)
    });
  },

  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 切换筛选条件
  switchFilter(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ currentFilter: filter });

    // 根据筛选条件设置日期范围
    const today = new Date();
    let startDate, endDate;

    switch(filter) {
      case 'week':
        // 本周（最近7天）
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate = this.formatDate(weekAgo);
        endDate = this.formatDate(today);
        break;
      case 'month':
        // 本月
        startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
        endDate = this.formatDate(today);
        break;
      case 'semester':
        // 本学期（假设3月-7月为春季学期，9月-次年1月为秋季学期）
        const month = today.getMonth() + 1;
        const year = today.getFullYear();
        if (month >= 3 && month <= 7) {
          startDate = `${year}-03-01`;
          endDate = `${year}-07-31`;
        } else if (month >= 9 && month <= 12) {
          startDate = `${year}-09-01`;
          endDate = `${year}-12-31`;
        } else {
          startDate = `${year - 1}-09-01`;
          endDate = `${year}-01-31`;
        }
        break;
      case 'custom':
        // 自定义，保持当前日期
        return;
    }

    this.setData({ startDate, endDate });
    this.loadData();
  },

  // 开始日期变化
  onStartDateChange(e) {
    this.setData({ startDate: e.detail.value });
    if (this.data.endDate) {
      this.loadData();
    }
  },

  // 结束日期变化
  onEndDateChange(e) {
    this.setData({ endDate: e.detail.value });
    if (this.data.startDate) {
      this.loadData();
    }
  },

  // 加载数据
  loadData() {
    this.setData({ loading: true });

    const { startDate, endDate } = this.data;
    if (!startDate || !endDate) {
      this.setData({ loading: false });
      return;
    }

    // 获取日期范围内的记录
    const records = parentStorage.getRecordsByDateRange(startDate, endDate);

    // 计算统计数据
    const stats = this.calculateStats(records);

    // 生成周数据（近7天）
    const weeklyData = this.generateWeeklyData(records);

    // 按日期分组
    const groupedRecords = this.groupRecordsByDate(records);

    this.setData({
      stats,
      weeklyData,
      groupedRecords,
      loading: false
    });
  },

  // 计算统计数据
  calculateStats(records) {
    const total = records.length;
    if (total === 0) {
      return {
        completionRate: 0,
        completed: 0,
        pending: 0,
        correction: 0,
        trend: ''
      };
    }

    const completed = records.filter(r => r.status === 1).length;
    const pending = records.filter(r => r.status === 0).length;
    const correction = records.filter(r => r.status === 2).length;
    const completionRate = Math.round((completed / total) * 100);

    // 计算趋势（与上一周期比较）
    let trend = '';
    const prevRecords = this.getPrevPeriodRecords();
    if (prevRecords.length > 0) {
      const prevCompleted = prevRecords.filter(r => r.status === 1).length;
      const prevRate = Math.round((prevCompleted / prevRecords.length) * 100);
      const diff = completionRate - prevRate;
      if (diff > 0) {
        trend = `较上周 +${diff}% 📈`;
      } else if (diff < 0) {
        trend = `较上周 ${diff}% 📉`;
      } else {
        trend = '与上周持平 ➡️';
      }
    }

    return {
      completionRate,
      completed,
      pending,
      correction,
      trend
    };
  },

  // 获取上一周期的记录（用于计算趋势）
  getPrevPeriodRecords() {
    const today = new Date();
    const days = this.data.currentFilter === 'week' ? 7 :
                 this.data.currentFilter === 'month' ? 30 : 90;

    const prevEnd = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
    const prevStart = new Date(prevEnd.getTime() - days * 24 * 60 * 60 * 1000);

    return parentStorage.getRecordsByDateRange(
      this.formatDate(prevStart),
      this.formatDate(prevEnd)
    );
  },

  // 生成周数据（近7天）
  generateWeeklyData(records) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const today = new Date();
    const weeklyData = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = this.formatDate(date);
      const dayRecords = records.filter(r => r.date === dateStr);

      let rate = 0;
      if (dayRecords.length > 0) {
        const completed = dayRecords.filter(r => r.status === 1).length;
        rate = Math.round((completed / dayRecords.length) * 100);
      }

      weeklyData.push({
        day: weekdays[date.getDay()],
        date: dateStr,
        rate: rate,
        count: dayRecords.length
      });
    }

    return weeklyData;
  },

  // 按日期分组记录
  groupRecordsByDate(records) {
    const groups = {};
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    records.forEach(record => {
      if (!groups[record.date]) {
        const date = new Date(record.date);
        const month = date.getMonth() + 1;
        const day = date.getDate();

        groups[record.date] = {
          date: record.date,
          formattedDate: `${month}月${day}日`,
          weekday: weekdays[date.getDay()],
          records: [],
          expanded: true // 默认展开
        };
      }

      // 添加科目名称和状态文本
      const subjectMap = {
        'chinese': '语文',
        'math': '数学',
        'english': '英语',
        'other': '其他'
      };

      const statusMap = {
        0: '未完成',
        1: '已完成',
        2: '待订正'
      };

      groups[record.date].records.push({
        ...record,
        subjectName: subjectMap[record.subject] || '其他',
        statusText: statusMap[record.status] || '未知'
      });
    });

    // 转换为数组并按日期倒序
    return Object.values(groups).sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });
  },

  // 切换分组展开/收起
  toggleGroup(e) {
    const date = e.currentTarget.dataset.date;
    const groupedRecords = this.data.groupedRecords.map(group => {
      if (group.date === date) {
        return { ...group, expanded: !group.expanded };
      }
      return group;
    });

    this.setData({ groupedRecords });
  }
});
