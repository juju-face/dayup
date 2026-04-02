// custom-tab-bar/index.js
Component({
  data: {
    selected: '',
    tabList: [],
    role: 'parent',
    isTeacher: false,
    selectedColor: '#FF7A45', // 家长端暖橙
    color: '#999999',
    backgroundColor: '#FFFFFF',
    height: 100,
    showTabBar: true // 是否显示tabBar
  },
  attached() {
    // 检查当前页面是否需要显示tabBar
    this.checkShowTabBar();
    // 初始化导航栏
    this.initTabList();
    // 监听数据变化，更新徽章
    this.updateBadge();
    // 每5秒更新一次徽章
    this.badgeTimer = setInterval(() => {
      this.updateBadge();
    }, 5000);
  },
  detached() {
    // 清理定时器
    if (this.badgeTimer) {
      clearInterval(this.badgeTimer);
    }
  },
  methods: {
    // 检查是否需要显示tabBar
    checkShowTabBar() {
      const pages = getCurrentPages();
      if (pages.length > 0) {
        const currentPage = pages[pages.length - 1];
        const route = currentPage.route;
        
        // 登录页和注册页不显示tabBar
        const hideTabBarPages = [
          'pages/login/index',
          'pages/register/index'
        ];
        
        const showTabBar = !hideTabBarPages.includes(route);
        this.setData({ showTabBar });
      }
    },
    
    initTabList() {
      // 获取全局应用实例
      const app = getApp();
      const role = app.globalData.role || 'parent';
      const isTeacher = role === 'teacher';
      
      let tabList = [];
      let selectedColor = '#FF7A45'; // 家长端默认暖橙
      
      if (isTeacher) {
        // 老师端配置：冷蓝主题，固定3Tab（作业/学生/我的）
        selectedColor = '#1890FF';
        tabList = [
          {
            pagePath: 'pages/homework/index',
            text: '作业',
            icon: '📝',
            selectedIcon: '📝'
          },
          {
            pagePath: 'pages/students/index',
            text: '学生',
            icon: '👨‍🎓',
            selectedIcon: '👨‍🎓'
          },
          {
            pagePath: 'pages/profile/index',
            text: '我的',
            icon: '👤',
            selectedIcon: '👤'
          }
        ];
      } else {
        // 家长端配置：暖橙主题，2Tab（作业/我的）
        selectedColor = '#FF7A45';
        tabList = [
          {
            pagePath: 'pages/parent/homework/index',
            text: '作业',
            icon: '📝',
            selectedIcon: '📝'
          },
          {
            pagePath: 'pages/parent/mine/index',
            text: '我的',
            icon: '👤',
            selectedIcon: '👤'
          }
        ];
      }

      // 获取当前页面路径
      let selected = '';
      const pages = getCurrentPages();
      if (pages.length > 0) {
        selected = pages[pages.length - 1].route;
      }
      
      this.setData({
        tabList: tabList,
        role: role,
        isTeacher: isTeacher,
        selectedColor: selectedColor,
        color: '#999999',
        backgroundColor: '#FFFFFF',
        height: 100,
        selected: selected
      });
    },
    switchTab(e) {
      const data = e.currentTarget.dataset;
      const url = data.path;
      
      // 使用switchTab跳转到页面，保持tab栏显示
      wx.switchTab({
        url: '/' + url
      });
    },
    // 更新徽章提示
    updateBadge() {
      const role = this.data.role;
      
      if (role === 'teacher') {
        // 老师端：显示待批改数量
        try {
          const storage = require('../utils/storage.js');
          const today = new Date().toISOString().split('T')[0];
          const stats = storage.getStatsByDate(today);
          
          const pendingCount = stats.needCorrection || 0;
          
          const tabList = this.data.tabList;
          if (tabList.length > 0 && tabList[0].text === '作业') {
            const newBadge = pendingCount > 0 ? pendingCount : 0;
            const oldBadge = tabList[0].badge || 0;
            
            if (newBadge !== oldBadge) {
              tabList[0].badge = newBadge;
              this.setData({
                tabList: tabList
              });
            }
          }
        } catch (error) {
          console.error('[custom-tab-bar] 更新徽章失败:', error);
        }
      } else {
        // 家长端：显示今日未完成数量（作业tab在索引0）
        try {
          const parentStorage = require('../utils/parent-storage.js');
          const todayStats = parentStorage.getTodayStats();
          
          const pendingCount = todayStats.pending || 0;
          
          const tabList = this.data.tabList;
          // 家长端现在有2个tab：作业(索引0)、我的(索引1)
          if (tabList.length >= 2 && tabList[0].text === '作业') {
            const newBadge = pendingCount > 0 ? pendingCount : 0;
            const oldBadge = tabList[0].badge || 0;
            
            if (newBadge !== oldBadge) {
              tabList[0].badge = newBadge;
              this.setData({
                tabList: tabList
              });
            }
          }
        } catch (error) {
          console.error('[custom-tab-bar] 更新徽章失败:', error);
        }
      }
    },
    // 更新选中状态
    updateSelected() {
      // 重新检查是否需要显示tabBar
      this.checkShowTabBar();
      
      // 重新初始化tabBar配置，确保角色正确
      this.initTabList();
      
      const pages = getCurrentPages();
      if (pages.length > 0) {
        const currentPage = pages[pages.length - 1];
        let currentPath = currentPage.route;
        
        this.setData({
          selected: currentPath
        });
      }
    }
  }
})
