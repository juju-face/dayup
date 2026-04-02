const parentStorage = require('../../../utils/parent-storage.js');
const cloudDB = require('../../../utils/cloud-db.js');

Page({
  data: {
    currentChild: null,
    currentDate: '',
    formattedDate: '',
    homework: [],
    stats: {
      total: 0,
      completed: 0,
      pending: 0,
      needCorrection: 0
    },
    isLoading: false,
    homeworkWatcher: null,
    statusWatcher: null
  },

  onLoad() {
    this.initPage();
  },

  onShow() {
    this.initPage();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateSelected();
    }
  },

  onHide() {
    // 页面隐藏时取消监听
    this.stopWatchers();
  },

  onUnload() {
    // 页面卸载时取消监听
    this.stopWatchers();
  },

  // 取消所有监听
  stopWatchers() {
    if (this.data.homeworkWatcher) {
      this.data.homeworkWatcher.close();
    }
    if (this.data.statusWatcher) {
      this.data.statusWatcher.close();
    }
  },

  async initPage() {
    let currentChild = parentStorage.getBoundStudent();
    
    // 如果没有绑定学生，尝试从本地存储加载并绑定第一个
    if (!currentChild) {
      try {
        // 尝试从本地存储加载学生列表
        let childrenList = wx.getStorageSync('childrenList') || [];
        
        // 如果没有，从 students_list 获取
        if (childrenList.length === 0) {
          childrenList = wx.getStorageSync('students_list') || [];
        }
        
        if (childrenList.length > 0) {
          // 绑定第一个学生
          const firstChild = childrenList[0];
          parentStorage.bindStudent(firstChild.id);
          currentChild = firstChild;
        }
      } catch (error) {
        console.error('自动绑定学生失败:', error);
      }
    }
    
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

    await this.loadHomework();
    
    // 启动实时监听
    this.startWatchers(currentChild.id);
  },

  formatDate(date) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = weekdays[date.getDay()];
    return `${month}月${day}日 ${weekday}`;
  },

  // 加载作业（使用云函数）
  async loadHomework() {
    const { currentChild, currentDate } = this.data;
    if (!currentChild) return;

    this.setData({ isLoading: true });

    try {
      const result = await cloudDB.getHomeworkByStudent(currentChild.id, currentDate);

      if (result.success) {
        const subjectMap = {
          'chinese': '语文',
          'math': '数学',
          'english': '英语',
          'other': '其他',
          '语文': '语文',
          '数学': '数学',
          '英语': '英语'
        };

        const homework = result.data.map(h => ({
          id: h._id,
          subject: h.subject,
          subjectName: subjectMap[h.subject] || '其他',
          content: h.content,
          status: h.studentStatus !== undefined ? h.studentStatus : (h.status || 0),
          date: h.date,
          remark: h.studentRemark || ''
        }));

        // 计算统计
        const stats = {
          total: homework.length,
          completed: homework.filter(h => h.status === 1).length,
          pending: homework.filter(h => h.status === 0).length,
          needCorrection: homework.filter(h => h.status === 2).length
        };

        this.setData({
          homework,
          stats
        });

        // 更新tabBar徽章
        this.updateTabBarBadge(stats.pending);
      } else {
        wx.showToast({
          title: result.message || '加载失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('加载作业失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 更新tabBar徽章
  updateTabBarBadge(count) {
    if (count > 0) {
      wx.setTabBarBadge({
        index: 0,
        text: String(count)
      });
    } else {
      wx.removeTabBarBadge({
        index: 0
      });
    }
  },

  // 启动实时监听
  startWatchers(studentId) {
    // 监听作业变化
    const homeworkWatcher = cloudDB.watchHomework(
      studentId,
      (snapshot) => {
        console.log('作业数据实时更新:', snapshot);
        // 数据变化时重新加载
        this.loadHomework();
      },
      (err) => {
        console.error('作业监听失败:', err);
      }
    );

    // 监听作业状态变化
    const statusWatcher = cloudDB.watchHomeworkStatus(
      studentId,
      (snapshot) => {
        console.log('作业状态实时更新:', snapshot);
        // 状态变化时重新加载
        this.loadHomework();
      },
      (err) => {
        console.error('状态监听失败:', err);
      }
    );

    this.setData({
      homeworkWatcher,
      statusWatcher
    });
  },

  // 下拉刷新
  async onPullDownRefresh() {
    await this.loadHomework();
    wx.stopPullDownRefresh();
    wx.showToast({
      title: '刷新成功',
      icon: 'success'
    });
  }
});
