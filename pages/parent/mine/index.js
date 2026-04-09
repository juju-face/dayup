const parentStorage = require('../../../utils/parent-storage.js');
const cloudDB = require('../../../utils/cloud-db.js');

// 本地缓存键名
const CACHE_KEY = 'mine_page_cache';
const CACHE_EXPIRE_MS = 5 * 60 * 1000; // 缓存有效期 5 分钟

Page({
  data: {
    parentProfile: null,
    childrenList: [],
    currentChild: null,
    currentChildId: '',
    loading: false,
    feeInfo: {
      priceMonth: 2800,
      priceTerm: 12800,
      originalPriceTerm: 15000,
      paidStatus: 'pending',
      remainingDays: 0,
      expireDate: '',
      services: ['午餐', '午休', '作业辅导']
    },
    history: [],
    lastUpdateTime: ''
  },

  async onLoad() {
    await this.loadParentProfile();
    // 优先从本地缓存加载
    await this.loadFromCache();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateSelected();
    }
    // 重新加载费用信息，确保数据同步
    const currentChildId = this.data.currentChildId || parentStorage.getBoundStudentId();
    if (currentChildId) {
      this.loadFeeInfo(currentChildId);
    }
  },

  // 从本地缓存加载（快速响应）
  async loadFromCache() {
    try {
      const cached = wx.getStorageSync(CACHE_KEY);
      
      if (cached && cached.childrenList) {
        const now = Date.now();
        const isExpired = (now - cached.timestamp) > CACHE_EXPIRE_MS;
        
        // 显示缓存数据
        this.setData({
          childrenList: cached.childrenList,
          currentChildId: cached.currentChildId,
          currentChild: cached.currentChild,
          lastUpdateTime: cached.timestamp ? this.formatTime(new Date(cached.timestamp)) : ''
        });
        
        // 加载费用信息
        if (cached.currentChildId) {
          this.loadFeeInfo(cached.currentChildId);
        }
        
        // 缓存过期，需要刷新
        if (isExpired || !cached.timestamp) {
          console.log('[缓存] 数据已过期，触发后台刷新');
          this.loadChildrenFromCloud({ silent: true });
        }
      } else {
        // 没有缓存，直接加载
        await this.loadChildrenFromCloud();
      }
    } catch (e) {
      console.error('[缓存] 读取缓存失败:', e);
      await this.loadChildrenFromCloud();
    }
  },

  formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  },

  // 加载家长基本信息
  loadParentProfile() {
    return new Promise((resolve) => {
      try {
        let parentProfile = wx.getStorageSync('parentProfile');
        const userInfo = wx.getStorageSync('userInfo');
        
        if (!parentProfile) {
          parentProfile = {
            role: 'parent',
            phone: userInfo ? userInfo.phone : ''
          };
          wx.setStorageSync('parentProfile', parentProfile);
        }
        
        this.setData({ parentProfile }, () => {
          console.log('家长资料:', parentProfile);
          resolve();
        });
      } catch (e) {
        console.log('加载家长资料失败:', e);
        const userInfo = wx.getStorageSync('userInfo');
        this.setData({
          parentProfile: {
            role: 'parent',
            phone: userInfo ? userInfo.phone : '未登录'
          }
        }, () => {
          resolve();
        });
      }
    });
  },

  // 从云数据库加载孩子列表
  loadChildrenFromCloud(options = {}) {
    const { silent = false } = options;

    return new Promise(async (resolve) => {
      if (!silent) {
        this.setData({ loading: true });
      }
      
      try {
        const parentPhone = this.data.parentProfile?.phone || wx.getStorageSync('userInfo')?.phone;
        
        if (!parentPhone) {
          console.log('没有家长手机号，无法加载孩子信息');
          this.setData({ loading: false }, resolve);
          return;
        }
        
        const result = await cloudDB.getStudentsByParentPhone(parentPhone);
        
        if (result.success && result.data && result.data.length > 0) {
          // 确保每个孩子对象都有 id 字段
          const childrenList = result.data.map(child => ({
            ...child,
            id: child._id || child.id
          }));
          
          let currentChildId = parentStorage.getBoundStudentId();
          const firstChild = childrenList[0];
          
          if (!currentChildId || !childrenList.find(c => c.id === currentChildId || c._id === currentChildId)) {
            currentChildId = firstChild.id || firstChild._id;
            if (currentChildId) {
              parentStorage.bindStudent(currentChildId);
            }
          }
          
          const currentChild = childrenList.find(child => child.id === currentChildId || child._id === currentChildId) || firstChild;
          
          // 同步所有孩子的缴费数据到缓存
          this.syncAllChildrenFeeData(childrenList);
          
          this.setData({
            childrenList,
            currentChildId,
            currentChild,
            loading: false,
            lastUpdateTime: this.formatTime(new Date())
          });
          
          // 保存到本地缓存
          this.saveToCache(childrenList, currentChildId, currentChild);
          
          // 加载费用信息
          this.loadFeeInfo(currentChildId);
        } else {
          // 云数据库没有数据，尝试本地存储
          this.loadChildrenFromLocal();
        }
        resolve();
      } catch (error) {
        console.error('从云数据库加载孩子列表失败:', error);
        this.loadChildrenFromLocal();
        resolve();
      }
    });
  },

  // 保存到本地缓存
  saveToCache(childrenList, currentChildId, currentChild) {
    try {
      wx.setStorageSync(CACHE_KEY, {
        childrenList,
        currentChildId,
        currentChild,
        timestamp: Date.now()
      });
      console.log('[缓存] 保存成功');
    } catch (e) {
      console.error('[缓存] 保存失败:', e);
    }
  },

  // 从本地存储加载孩子列表
  loadChildrenFromLocal() {
    return new Promise((resolve) => {
      this.setData({ loading: true });
      
      try {
        const parentPhone = this.data.parentProfile?.phone || wx.getStorageSync('userInfo')?.phone;
        
        if (!parentPhone) {
          this.setData({ loading: false }, resolve);
          return;
        }
        
        let studentsList = wx.getStorageSync('students_list') || [];
        let childrenList = studentsList.filter(student => {
          return student.parentPhone === parentPhone;
        });
        
        if (childrenList.length > 0) {
          wx.setStorageSync('childrenList', childrenList);
        }
        
        let currentChildId = parentStorage.getBoundStudentId();
        
        if (childrenList.length > 0 && !currentChildId) {
          currentChildId = childrenList[0].id;
          parentStorage.bindStudent(currentChildId);
        }
        
        let currentChild = null;
        if (currentChildId && childrenList.length > 0) {
          currentChild = childrenList.find(child => child.id === currentChildId) || childrenList[0];
        }
        
        this.setData({
          childrenList,
          currentChildId,
          currentChild,
          loading: false
        }, () => {
          if (currentChild) {
            this.loadFeeInfo(currentChildId);
          }
          resolve();
        });
      } catch (e) {
        console.error('加载孩子列表失败:', e);
        this.setData({ loading: false }, resolve);
      }
    });
  },

  // 加载费用信息
  loadFeeInfo(studentId) {
    if (!studentId) return;
    
    try {
      // 使用与 fee 页面一致的缓存 key
      const cacheKey = 'fee_cache_' + studentId;
      const cached = wx.getStorageSync(cacheKey);
      
      if (cached && cached.feeInfo) {
        console.log('[mine] 从缓存加载费用信息:', cached.feeInfo);
        this.setData({
          feeInfo: cached.feeInfo,
          history: cached.history || []
        });
      } else {
        // 尝试旧格式的 key
        const feeInfo = wx.getStorageSync('feeInfo_' + studentId) || wx.getStorageSync('feeInfo');
        const history = wx.getStorageSync('feeHistory_' + studentId) || [];
        
        if (feeInfo) {
          console.log('[mine] 从旧缓存加载费用信息:', feeInfo);
          this.setData({
            feeInfo: {
              ...this.data.feeInfo,
              ...feeInfo
            },
            history: history
          });
        } else {
          this.setData({
            feeInfo: {
              priceMonth: 2800,
              priceTerm: 12800,
              originalPriceTerm: 15000,
              paidStatus: 'pending',
              remainingDays: 30,
              expireDate: this.getDefaultExpireDate(),
              services: ['午餐', '午休', '作业辅导']
            },
            history: []
          });
        }
      }
    } catch (e) {
      console.log('使用默认费用信息');
    }
  },

  // 获取默认到期日期
  getDefaultExpireDate() {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().split('T')[0];
  },

  // 同步所有孩子的缴费数据到本地缓存
  syncAllChildrenFeeData(childrenList) {
    if (!childrenList || childrenList.length === 0) return;
    
    const now = new Date();
    
    childrenList.forEach(child => {
      if (!child.id) return;
      
      let paidStatus = child.paidStatus || 'pending';
      let remainingDays = child.remainingDays || 0;
      let expireDate = child.expireDate || '';
      
      // 如果有过期日期，重新计算剩余天数
      if (expireDate) {
        const expireTime = new Date(expireDate).getTime();
        const nowTime = now.getTime();
        remainingDays = Math.max(0, Math.ceil((expireTime - nowTime) / (1000 * 60 * 60 * 24)));
        
        if (remainingDays <= 0) {
          paidStatus = 'pending';
        }
      }
      
      const feeInfo = {
        priceMonth: child.priceMonth || 2800,
        priceTerm: child.priceTerm || 12800,
        originalPriceTerm: child.originalPriceTerm || 15000,
        paidStatus,
        remainingDays,
        expireDate,
        services: child.services || ['午餐', '午休', '作业辅导']
      };
      
      // 保存到缓存
      const cacheKey = 'fee_cache_' + child.id;
      try {
        wx.setStorageSync(cacheKey, {
          feeInfo,
          history: [],
          timestamp: Date.now()
        });
      } catch (e) {
        console.error('[syncAllChildrenFeeData] 保存缓存失败:', e);
      }
    });
    
    console.log('[syncAllChildrenFeeData] 已同步', childrenList.length, '个孩子的缴费数据到缓存');
  },

  // 下拉刷新
  async onPullDownRefresh() {
    await this.loadChildrenFromCloud({ silent: false });
    wx.stopPullDownRefresh();
  },

  // 切换当前孩子
  handleSwitchChild(e) {
    const childId = e.currentTarget.dataset.id;
    if (childId === this.data.currentChildId) return;
    
    const currentChild = this.data.childrenList.find(child => child.id === childId);
    
    this.setData({
      currentChildId: childId,
      currentChild
    });
    
    parentStorage.bindStudent(childId);
    
    // 更新缓存
    this.saveToCache(this.data.childrenList, childId, currentChild);
    
    this.loadFeeInfo(childId);
    
    wx.showToast({
      title: `已切换到 ${currentChild.name}`,
      icon: 'none'
    });
  },

  // 编辑当前孩子信息
  handleEditChild() {
    if (!this.data.currentChild) return;
    
    wx.showModal({
      title: '提示',
      content: '孩子信息由后台统一管理，如需修改请联系管理员',
      showCancel: false
    });
  },

  // 跳转到费用详情页面
  handleFeeDetail() {
    wx.navigateTo({
      url: '/pages/parent/fee/index'
    });
  },

  // 立即缴费
  handlePay() {
    console.log('handlePay 被调用了！');
    wx.navigateTo({
      url: '/pages/parent/fee/index'
    });
  },

  // 联系老师
  async handleContactTeacher() {
    const { currentChild } = this.data;
    
    if (!currentChild) {
      wx.showModal({
        title: '提示',
        content: '请先选择孩子',
        showCancel: false
      });
      return;
    }
    
    // 检查是否有分配的老师
    if (!currentChild.teacherId) {
      wx.showModal({
        title: '联系老师',
        content: '该孩子暂未分配老师，请联系管理员',
        showCancel: false
      });
      return;
    }
    
    wx.showLoading({ title: '加载中...' });
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'api',
        data: {
          action: 'getTeacherById',
          data: { _id: currentChild.teacherId }
        }
      });
      
      wx.hideLoading();
      
      if (res.result && res.result.success && res.result.data) {
        const teacher = res.result.data;
        const teacherName = teacher.name || '老师';
        const teacherPhone = teacher.phone || '未填写';
        const teacherSubject = teacher.subject || '';
        
        wx.showModal({
          title: `联系${teacherName}`,
          content: `科目：${teacherSubject || '全科'}\n电话：${teacherPhone}\n\n点击确定复制老师电话`,
          confirmText: '拨打',
          cancelText: '关闭',
          success: (modalRes) => {
            if (modalRes.confirm && teacherPhone && teacherPhone !== '未填写') {
              // 拨打老师电话
              wx.makePhoneCall({
                phoneNumber: teacherPhone,
                fail: () => {
                  wx.showToast({
                    title: '拨打失败',
                    icon: 'none'
                  });
                }
              });
            }
          }
        });
      } else {
        wx.showModal({
          title: '提示',
          content: '未找到老师信息，请联系管理员',
          showCancel: false
        });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('[handleContactTeacher] 错误:', err);
      wx.showModal({
        title: '提示',
        content: '获取老师信息失败，请重试',
        showCancel: false
      });
    }
  }
});
