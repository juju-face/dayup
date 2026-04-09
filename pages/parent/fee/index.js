const cloudDB = require('../../../utils/cloud-db.js');
const parentStorage = require('../../../utils/parent-storage.js');

// 本地缓存键名
const CACHE_KEY_PREFIX = 'fee_cache_';
const CACHE_EXPIRE_MS = 5 * 60 * 1000; // 缓存有效期 5 分钟

Page({
  data: {
    currentChild: null,
    feeInfo: {
      priceMonth: 0,
      priceTerm: 0,
      originalPriceTerm: 0,
      paidStatus: 'pending',
      remainingDays: 0,
      expireDate: '',
      services: ['午餐', '午休', '作业辅导']
    },
    history: [],
    loading: false,
    lastUpdateTime: '',
    navBarHeight: 88,
    menuButtonTop: 0,
    statusBarHeight: 20
  },

  onLoad() {
    this.loadCurrentChild();
    // 获取胶囊按钮信息，用于对齐返回键
    const menuButton = wx.getMenuButtonBoundingClientRect();
    const navBarHeight = menuButton.height + (menuButton.top - wx.getSystemInfoSync().statusBarHeight) * 2;
    this.setData({
      navBarHeight: navBarHeight,
      menuButtonTop: menuButton.top,
      statusBarHeight: wx.getSystemInfoSync().statusBarHeight
    });
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateSelected();
    }
  },

  // 返回上一页
  handleBack() {
    wx.navigateBack({
      fail: () => {
        // 如果没有上一页，跳转到首页
        wx.switchTab({
          url: '/pages/parent/mine/index'
        });
      }
    });
  },

  // 加载当前选中的孩子
  async loadCurrentChild() {
    this.setData({ loading: true });
    
    try {
      let currentChildId = parentStorage.getBoundStudentId();
      
      if (!currentChildId) {
        let childrenList = wx.getStorageSync('childrenList') || [];
        
        if (childrenList.length === 0) {
          childrenList = wx.getStorageSync('students_list') || [];
        }
        
        if (childrenList.length > 0) {
          currentChildId = childrenList[0].id || childrenList[0]._id;
          parentStorage.bindStudent(currentChildId);
        }
      }
      
      if (!currentChildId) {
        this.setData({ loading: false });
        return;
      }
      
      // 从云数据库获取学生信息
      const result = await cloudDB.getStudentById(currentChildId);
      
      if (result.success && result.data) {
        const student = result.data;
        this.setData({
          currentChild: {
            ...student,
            id: student._id || student.id
          }
        });
        
        // 加载该学生的费用信息
        await this.loadFeeInfo(currentChildId);
      } else {
        this.loadFeeFromLocal(currentChildId);
      }
    } catch (error) {
      console.error('加载孩子信息失败:', error);
      this.setData({ loading: false });
      this.loadFeeFromLocal(parentStorage.getBoundStudentId());
    }
  },

  // 从云端加载费用信息
  async loadFeeInfo(studentId) {
    try {
      // 优先从本地缓存加载
      const cached = this.loadFromCache(studentId);
      if (cached) {
        this.setData({
          feeInfo: cached.feeInfo,
          history: cached.history || [],
          lastUpdateTime: cached.timestamp ? this.formatTime(new Date(cached.timestamp)) : '',
          loading: false
        });
        
        // 缓存过期则后台刷新
        if (Date.now() - cached.timestamp > CACHE_EXPIRE_MS) {
          this.fetchFeeFromCloud(studentId);
        }
      } else {
        await this.fetchFeeFromCloud(studentId);
      }
    } catch (error) {
      console.error('加载费用信息失败:', error);
      this.loadFeeFromLocal(studentId);
    }
  },

  // 从本地缓存加载
  loadFromCache(studentId) {
    try {
      const cacheKey = CACHE_KEY_PREFIX + studentId;
      return wx.getStorageSync(cacheKey);
    } catch (e) {
      return null;
    }
  },

  // 保存到本地缓存
  saveToCache(studentId, feeInfo, history) {
    try {
      const cacheKey = CACHE_KEY_PREFIX + studentId;
      wx.setStorageSync(cacheKey, {
        feeInfo,
        history,
        timestamp: Date.now()
      });
    } catch (e) {
      console.error('保存缓存失败:', e);
    }
  },

  // 从云端获取费用信息
  async fetchFeeFromCloud(studentId) {
    try {
      // 获取缴费记录
      const result = await cloudDB.getFeeRecords(studentId);
      
      if (result.success && result.data) {
        const records = result.data;
        
        // 获取当前学生信息（含费用状态）
        const studentResult = await cloudDB.getStudentById(studentId);
        const student = studentResult.success ? studentResult.data : null;
        
        // 计算最新费用状态
        const now = new Date();
        
        let paidStatus = 'pending';
        let remainingDays = 0;
        let expireDate = '';
        
        if (student) {
          paidStatus = student.paidStatus || 'pending';
          remainingDays = student.remainingDays || 0;
          expireDate = student.expireDate || '';
        }
        
        // 如果有过期日期，计算剩余天数
        if (expireDate) {
          const expireTime = new Date(expireDate).getTime();
          const nowTime = now.getTime();
          remainingDays = Math.max(0, Math.ceil((expireTime - nowTime) / (1000 * 60 * 60 * 24)));
          
          if (remainingDays <= 0) {
            paidStatus = 'pending';
          }
        }
        
        const feeInfo = {
          priceMonth: student?.priceMonth || 2800,
          priceTerm: student?.priceTerm || 12800,
          originalPriceTerm: student?.originalPriceTerm || 15000,
          paidStatus,
          remainingDays,
          expireDate,
          services: student?.services || ['午餐', '午休', '作业辅导']
        };
        
        // 转换历史记录格式
        const history = records.map(r => ({
          _id: r._id,
          date: r.payDate || (r.createTime ? new Date(r.createTime).toISOString().split('T')[0] : ''),
          amount: r.amount || r.priceMonth || feeInfo.priceMonth,
          type: r.type || 'month',
          status: 'paid',
          createTime: r.createTime
        }));
        
        this.setData({
          feeInfo,
          history,
          loading: false,
          lastUpdateTime: this.formatTime(now)
        });
        
        // 保存到缓存
        this.saveToCache(studentId, feeInfo, history);
      } else {
        this.loadFeeFromLocal(studentId);
      }
    } catch (error) {
      console.error('从云端获取费用信息失败:', error);
      this.loadFeeFromLocal(studentId);
    }
  },

  formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  },

  // 从本地存储加载费用信息
  loadFeeFromLocal(studentId) {
    try {
      const feeInfo = wx.getStorageSync('feeInfo_' + studentId) || wx.getStorageSync('feeInfo');
      const history = wx.getStorageSync('feeHistory_' + studentId) || [];
      
      if (feeInfo) {
        this.setData({
          feeInfo: { ...this.data.feeInfo, ...feeInfo },
          history,
          loading: false
        });
      } else {
        this.setData({
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
          loading: false
        });
      }
    } catch (e) {
      console.log('使用默认费用信息');
      this.setData({
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
        history: []
      });
    }
  },

  // 获取默认到期日期（下个月同一天）
  getDefaultExpireDate() {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().split('T')[0];
  },

  // 缴费
  handlePay() {
    console.log('按钮被点击了！');
    const { currentChild, feeInfo } = this.data;
    
    if (!currentChild) {
      wx.showToast({ title: '请先选择孩子', icon: 'none' });
      return;
    }
    
    if (feeInfo.paidStatus === 'paid') {
      wx.showToast({ title: '本月已缴费', icon: 'none' });
      return;
    }
    
    const payType = feeInfo.priceMonth ? 'month' : 'term';
    const amount = payType === 'month' ? feeInfo.priceMonth : feeInfo.priceTerm;
    
    wx.showModal({
      title: '缴费确认',
      content: `为 ${currentChild.name} 缴纳${payType === 'month' ? '月托' : '学期'}费 ¥${amount} 元？`,
      confirmText: '确认缴费',
      success: (res) => {
        console.log('[handlePay] modal result:', res);
        if (res.confirm) {
          this.processPayment(payType, amount);
        }
      }
    });
  },

  // 处理支付
  async processPayment(type, amount) {
    const { currentChild, feeInfo, history } = this.data;
    console.log('[processPayment] 开始支付:', { type, amount, currentChild });
    
    if (!currentChild || !currentChild.id) {
      wx.showToast({ title: '学生信息错误', icon: 'none' });
      return;
    }
    
    wx.showLoading({ title: '支付中...' });
    
    try {
      const studentId = currentChild.id;
      const now = new Date();
      const payDate = now.toISOString().split('T')[0];
      const expireDate = this.getDefaultExpireDate();
      
      // 1. 添加缴费记录到 fee 集合
      const feeRecord = {
        studentId,
        studentName: currentChild.name,
        parentPhone: currentChild.parentPhone || '',
        type,
        amount,
        payDate,
        status: 'paid'
      };
      
      console.log('[processPayment] 准备添加缴费记录:', feeRecord);
      
      const addResult = await cloudDB.addFeeRecord(feeRecord);
      console.log('[processPayment] 添加缴费记录结果:', addResult);
      
      if (!addResult.success) {
        throw new Error(addResult.message || '添加缴费记录失败');
      }
      
      // 2. 更新学生费用状态到 students 集合
      const feeUpdateData = {
        paidStatus: 'paid',
        remainingDays: 30,
        expireDate,
        lastPayDate: payDate,
        lastPayType: type,
        lastPayAmount: amount
      };
      
      const updateResult = await cloudDB.updateStudentFeeInfo(studentId, feeUpdateData);
      
      if (!updateResult.success) {
        console.warn('更新学生费用状态失败:', updateResult.message);
        // 不阻塞流程，继续执行
      }
      
      // 3. 更新本地数据
      const newFeeInfo = {
        ...feeInfo,
        paidStatus: 'paid',
        remainingDays: 30,
        expireDate
      };
      
      const newHistory = [
        {
          _id: addResult.data?._id || Date.now().toString(),
          date: payDate,
          amount,
          type,
          status: 'paid'
        },
        ...history
      ];
      
      this.setData({
        feeInfo: newFeeInfo,
        history: newHistory,
        lastUpdateTime: this.formatTime(now)
      });
      
      // 4. 保存到本地存储
      wx.setStorageSync('feeInfo_' + studentId, newFeeInfo);
      wx.setStorageSync('feeHistory_' + studentId, newHistory);
      
      // 保存到缓存
      this.saveToCache(studentId, newFeeInfo, newHistory);
      
      wx.hideLoading();
      wx.showToast({ title: '缴费成功', icon: 'success' });
      
    } catch (error) {
      wx.hideLoading();
      console.error('缴费失败:', error);
      wx.showModal({
        title: '缴费失败',
        content: error.message || '缴费过程中出现错误，请重试',
        showCancel: false
      });
    }
  },

  // 下拉刷新
  async onPullDownRefresh() {
    const studentId = this.data.currentChild?.id;
    if (studentId) {
      await this.fetchFeeFromCloud(studentId);
    }
    wx.stopPullDownRefresh();
  }
});
