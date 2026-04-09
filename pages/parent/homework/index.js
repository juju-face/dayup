const parentStorage = require('../../../utils/parent-storage.js');
const cloudDB = require('../../../utils/cloud-db.js');

// 本地缓存键名
const CACHE_KEY_PREFIX = 'homework_cache_';
const CACHE_EXPIRE_MS = 5 * 60 * 1000; // 缓存有效期 5 分钟

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
    lastUpdateTime: '' // 上次更新时间
  },

  onLoad() {
    this.initPage();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateSelected();
    }
    // 页面可见时只更新 tabBar 徽章，不重新加载数据
    this.updateTabBarBadge();
  },

  async initPage() {
    let currentChild = parentStorage.getBoundStudent();
    
    // 如果没有绑定学生，尝试从本地存储加载并绑定第一个
    if (!currentChild) {
      try {
        let childrenList = wx.getStorageSync('childrenList') || [];
        
        if (childrenList.length === 0) {
          childrenList = wx.getStorageSync('students_list') || [];
        }
        
        if (childrenList.length > 0) {
          const firstChild = childrenList[0];
          const studentId = firstChild.id || firstChild._id;
          
          if (studentId) {
            parentStorage.bindStudent(studentId);
            currentChild = firstChild;
            console.log('[initPage] 自动绑定第一个孩子:', firstChild.name);
          }
        }
      } catch (error) {
        console.error('自动绑定学生失败:', error);
      }
    }
    
    if (!currentChild) {
      // 调试模式：提示用户切换角色
      wx.showToast({
        title: '请先切换角色登录',
        icon: 'none'
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

    // 先尝试加载本地缓存
    await this.loadFromCache();
  },

  // 从本地缓存加载（快速响应）
  async loadFromCache() {
    const { currentChild, currentDate } = this.data;
    if (!currentChild) return;

    const studentId = currentChild.id || currentChild._id;
    const cacheKey = CACHE_KEY_PREFIX + studentId + '_' + currentDate;
    
    try {
      const cached = wx.getStorageSync(cacheKey);
      
      if (cached && cached.homework) {
        const now = Date.now();
        const isExpired = (now - cached.timestamp) > CACHE_EXPIRE_MS;
        
        // 显示缓存数据
        this.setData({
          homework: cached.homework,
          stats: cached.stats,
          lastUpdateTime: cached.timestamp ? this.formatTime(new Date(cached.timestamp)) : ''
        });
        
        // 更新 tabBar 徽章
        this.updateTabBarBadge();
        
        // 缓存过期或首次加载，需要刷新
        if (isExpired || !cached.timestamp) {
          console.log('[缓存] 数据已过期，触发后台刷新');
          this.loadHomework({ silent: true }); // 静默刷新，不显示 loading
        }
      } else {
        // 没有缓存，直接加载
        await this.loadHomework();
      }
    } catch (e) {
      console.error('[缓存] 读取缓存失败:', e);
      await this.loadHomework();
    }
  },

  formatDate(date) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = weekdays[date.getDay()];
    return `${month}月${day}日 ${weekday}`;
  },

  formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  },

  // 加载作业（使用云函数）
  async loadHomework(options = {}) {
    const { currentChild, currentDate } = this.data;
    if (!currentChild) return;

    const { silent = false } = options; // 是否静默模式（不显示 loading）

    if (!silent) {
      this.setData({ isLoading: true });
    }

    try {
      const studentId = currentChild.id || currentChild._id;
      const result = await cloudDB.getHomeworkByStudent(studentId, currentDate);

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

        const stats = {
          total: homework.length,
          completed: homework.filter(h => h.status === 1).length,
          pending: homework.filter(h => h.status === 0).length,
          needCorrection: homework.filter(h => h.status === 2).length
        };

        const now = new Date();
        this.setData({
          homework,
          stats,
          lastUpdateTime: this.formatTime(now),
          isLoading: false
        });

        // 保存到本地缓存
        this.saveToCache(homework, stats);
        
        // 更新 tabBar 徽章
        this.updateTabBarBadge(stats.pending);
      } else {
        if (!silent) {
          wx.showToast({
            title: result.message || '加载失败',
            icon: 'none'
          });
        }
        this.setData({ isLoading: false });
      }
    } catch (error) {
      console.error('加载作业失败:', error);
      if (!silent) {
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      }
      this.setData({ isLoading: false });
    }
  },

  // 保存到本地缓存
  saveToCache(homework, stats) {
    const { currentChild, currentDate } = this.data;
    if (!currentChild) return;

    const studentId = currentChild.id || currentChild._id;
    const cacheKey = CACHE_KEY_PREFIX + studentId + '_' + currentDate;
    
    try {
      wx.setStorageSync(cacheKey, {
        homework,
        stats,
        timestamp: Date.now()
      });
      console.log('[缓存] 保存成功');
    } catch (e) {
      console.error('[缓存] 保存失败:', e);
    }
  },

  // 更新 tabBar 徽章
  updateTabBarBadge(pendingCount) {
    // 如果没有传入数量，从当前 stats 读取
    if (pendingCount === undefined) {
      pendingCount = this.data.stats.pending || 0;
    }
    
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

  // 下拉刷新
  async onPullDownRefresh() {
    await this.loadHomework({ silent: false });
    wx.stopPullDownRefresh();
  },

  // 切换角色（调试用）
  switchRole() {
    wx.showActionSheet({
      itemList: ['切换到老师端', '切换到家长端'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 切换到老师端 - 弹出输入手机号验证
          this.quickLoginTeacher();
        } else {
          // 切换到家长端 - 弹出输入手机号验证
          this.quickLoginParent();
        }
      }
    });
  },

  // 快速登录老师（调试用）
  quickLoginTeacher() {
    wx.showModal({
      title: '切换到老师端',
      editable: true,
      placeholderText: '请输入老师手机号',
      success: async (res) => {
        if (res.confirm && res.content) {
          const phone = res.content.trim();
          if (!phone || phone.length !== 11) {
            wx.showToast({ title: '请输入11位手机号', icon: 'none' });
            return;
          }
          
          wx.showLoading({ title: '验证中...' });
          
          try {
            const result = await wx.cloud.callFunction({
              name: 'api',
              data: {
                action: 'getTeacherByPhone',
                data: { phone }
              }
            });
            
            wx.hideLoading();
            
            if (result.result && result.result.success && result.result.data) {
              const teacherInfo = result.result.data;
              wx.setStorageSync('teacher_info', teacherInfo);
              wx.setStorageSync('profile', {
                role: 'teacher',
                name: teacherInfo.name,
                parentPhone: phone
              });
              
              const app = getApp();
              app.setRole('teacher');
              app.globalData.teacherInfo = teacherInfo;
              
              wx.showToast({ title: '切换成功', icon: 'success' });
              
              setTimeout(() => {
                wx.reLaunch({
                  url: '/pages/homework/index'
                });
              }, 800);
            } else {
              wx.showToast({ title: '该手机号未注册为老师', icon: 'none' });
            }
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: '验证失败', icon: 'none' });
          }
        }
      }
    });
  },

  // 快速登录家长（调试用）
  quickLoginParent() {
    wx.showModal({
      title: '切换到家长端',
      editable: true,
      placeholderText: '请输入家长手机号',
      success: async (res) => {
        if (res.confirm && res.content) {
          const phone = res.content.trim();
          if (!phone || phone.length !== 11) {
            wx.showToast({ title: '请输入11位手机号', icon: 'none' });
            return;
          }
          
          wx.showLoading({ title: '验证中...' });
          
          try {
            const result = await wx.cloud.callFunction({
              name: 'api',
              data: {
                action: 'getStudentsByParentPhone',
                data: { parentPhone: phone }
              }
            });
            
            wx.hideLoading();
            
            if (result.result && result.result.success && result.result.data && result.result.data.length > 0) {
              // 家长存在（有绑定的孩子）
              const children = result.result.data;
              wx.setStorageSync('parentProfile', {
                role: 'parent',
                phone: phone
              });
              wx.setStorageSync('userInfo', {
                phone: phone,
                role: 'parent',
                loginTime: new Date().toISOString()
              });
              wx.setStorageSync('childrenList', children.map(c => ({
                ...c,
                id: c._id || c.id
              })));
              
              // 绑定第一个孩子
              if (children.length > 0) {
                const firstChild = children[0];
                wx.setStorageSync('boundStudent', {
                  ...firstChild,
                  id: firstChild._id || firstChild.id
                });
              }
              
              const app = getApp();
              app.setRole('parent');
              
              wx.showToast({ title: '切换成功', icon: 'success' });
              
              setTimeout(() => {
                wx.reLaunch({
                  url: '/pages/parent/homework/index'
                });
              }, 800);
            } else {
              wx.showToast({ title: '该手机号未登记为家长', icon: 'none' });
            }
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: '验证失败', icon: 'none' });
          }
        }
      }
    });
  }
});
