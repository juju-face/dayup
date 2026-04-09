// app.js
App({
  globalData: {
    userInfo: null,
    role: null,
    theme: 'light',
    screenInfo: {
      screenWidth: 0,
      screenHeight: 0,
      windowWidth: 0,
      windowHeight: 0,
      pixelRatio: 0,
      statusBarHeight: 0,
      navBarHeight: 0,
      isLandscape: false
    }
  },
  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'dayup-02-8gpzk22z15cf48a9',
        traceUser: true,
      });
      console.log('[云开发] 初始化成功');
    }

    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 初始化屏幕信息
    this.initScreenInfo()

    // 初始化主题
    this.initTheme()

    // 初始化角色状态
    this.initRole()

    // 模拟数据初始化
    this.initMockData()
  },
  onResize(res) {
    // 监听屏幕旋转
    const isLandscape = res.size.windowWidth > res.size.windowHeight
    this.globalData.screenInfo.isLandscape = isLandscape
    
    // 横屏提示
    if (isLandscape) {
      wx.showToast({
        title: '请竖屏使用',
        icon: 'none',
        duration: 2000
      })
    }
  },
  initScreenInfo() {
    // 使用新的 API 获取系统信息
    const windowInfo = wx.getWindowInfo()
    const deviceInfo = wx.getDeviceInfo()
    const appBaseInfo = wx.getAppBaseInfo()
    const menuButtonInfo = wx.getMenuButtonBoundingClientRect()
    
    // 计算导航栏高度
    const navBarHeight = menuButtonInfo.top + menuButtonInfo.height + (menuButtonInfo.top - windowInfo.statusBarHeight)
    
    // 计算屏幕宽度和字体缩放比例
    const screenWidth = windowInfo.screenWidth
    let fontSizeScale = 1
    
    if (screenWidth < 375) {
      // 小屏幕缩放
      fontSizeScale = screenWidth / 375
    } else if (screenWidth > 430) {
      // 大屏幕缩放
      fontSizeScale = screenWidth / 430
    }
    
    // 设置全局屏幕信息
    this.globalData.screenInfo = {
      screenWidth: windowInfo.screenWidth,
      screenHeight: windowInfo.screenHeight,
      windowWidth: windowInfo.windowWidth,
      windowHeight: windowInfo.windowHeight,
      pixelRatio: windowInfo.pixelRatio,
      statusBarHeight: windowInfo.statusBarHeight,
      navBarHeight: navBarHeight,
      fontSizeScale: fontSizeScale,
      isLandscape: windowInfo.windowWidth > windowInfo.windowHeight
    }
    
    // 设置全局 CSS 变量
    wx.setStorageSync('screenInfo', this.globalData.screenInfo)
  },
  initTheme() {
    // 获取当前主题
    const appBaseInfo = wx.getAppBaseInfo()
    const theme = appBaseInfo.theme || 'light'
    this.globalData.theme = theme
    
    // 监听主题变更
    wx.onThemeChange((res) => {
      this.globalData.theme = res.theme
      // 通知所有页面主题变更
      this.notifyThemeChange(res.theme)
    })
  },
  notifyThemeChange(theme) {
    // 获取当前页面栈
    const pages = getCurrentPages()
    if (pages.length > 0) {
      const currentPage = pages[pages.length - 1]
      // 如果页面有 onThemeChange 方法，调用它
      if (currentPage.onThemeChange && typeof currentPage.onThemeChange === 'function') {
        currentPage.onThemeChange(theme)
      }
    }
  },
  initRole() {
    // 检查是否已登录
    const userInfo = wx.getStorageSync('userInfo')
    const profile = wx.getStorageSync('profile')
    
    if (userInfo && userInfo.phone && profile && profile.name) {
      // 已登录且已填写信息，直接进入主页面
      this.globalData.role = userInfo.role
      setTimeout(() => {
        if (userInfo.role === 'teacher') {
          wx.switchTab({
            url: '/pages/homework/index'
          })
        } else {
          wx.switchTab({
            url: '/pages/parent/homework/index'
          })
        }
      }, 100)
    } else {
      // 未登录，进入登录页
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/login/index'
        })
      }, 100)
    }
  },
  setRole(role) {
    // 设置角色状态并存储到本地
    this.globalData.role = role
    wx.setStorageSync('role', role)
  },
  initMockData() {
    const storage = require('./utils/storage.js');
    const parentStorage = require('./utils/parent-storage.js');
    
    // 初始化作业模拟数据（仅第一次）
    if (!wx.getStorageSync('homework_records')) {
      storage.initMockData();
    }
    
    // 初始化学生详细信息（仅第一次）
    if (!wx.getStorageSync('students_list')) {
      const students = [
        {
          id: 'student_001',
          name: '张三',
          gender: 'male',
          age: 7,
          birthday: '2018-05-20',
          className: '一年级一班',
          enrollDate: '2025-09-01',
          school: '第一小学',
          parentPhone: '13800138001',
          address: '北京市朝阳区某某街道1号',
          allergy: '花生过敏',
          emergencyContact: '张三爸爸 13900139001'
        },
        {
          id: 'student_002',
          name: '李四',
          gender: 'female',
          age: 7,
          birthday: '2018-08-15',
          className: '一年级一班',
          enrollDate: '2025-09-01',
          school: '第一小学',
          parentPhone: '13800138002',
          address: '北京市朝阳区某某街道2号',
          allergy: '',
          emergencyContact: '李四妈妈 13900139002'
        },
        {
          id: 'student_003',
          name: '王五',
          gender: 'male',
          age: 7,
          birthday: '2018-03-10',
          className: '一年级二班',
          enrollDate: '2025-09-01',
          school: '第一小学',
          parentPhone: '13800138003',
          address: '北京市朝阳区某某街道3号',
          allergy: '',
          emergencyContact: '王五爸爸 13900139003'
        }
      ];
      storage.setStudents(students);
    }
  }
})
