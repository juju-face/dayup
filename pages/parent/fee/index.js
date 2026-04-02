const cloudDB = require('../../../utils/cloud-db.js');
const parentStorage = require('../../../utils/parent-storage.js');

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
    loading: false
  },

  onLoad() {
    this.loadCurrentChild();
  },

  onShow() {
    this.loadCurrentChild();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateSelected();
    }
  },

  // 加载当前选中的孩子
  async loadCurrentChild() {
    this.setData({ loading: true });
    
    try {
      let currentChildId = parentStorage.getBoundStudentId();
      
      // 如果没有绑定学生，尝试从本地存储加载并绑定第一个
      if (!currentChildId) {
        try {
          // 尝试从本地存储加载学生列表
          let childrenList = wx.getStorageSync('childrenList') || [];
          
          // 如果没有，从 students_list 获取
          if (childrenList.length === 0) {
            childrenList = wx.getStorageSync('students_list') || [];
          }
          
          if (childrenList.length > 0) {
            // 绑定第一个学生
            currentChildId = childrenList[0].id;
            parentStorage.bindStudent(currentChildId);
          }
        } catch (error) {
          console.error('自动绑定学生失败:', error);
        }
      }
      
      if (!currentChildId) {
        this.setData({ loading: false });
        return;
      }
      
      // 从云数据库获取学生信息（包含费用信息）
      const result = await cloudDB.getStudentById(currentChildId);
      
      if (result.success && result.data) {
        const student = result.data;
        this.setData({
          currentChild: student
        });
        
        // 加载该学生的费用信息
        await this.loadFeeInfo(student._id || student.id);
      } else {
        // 使用本地存储作为备用
        this.loadFeeFromLocal(currentChildId);
      }
    } catch (error) {
      console.error('加载孩子信息失败:', error);
      this.loadFeeFromLocal(parentStorage.getBoundStudentId());
    }
  },

  // 从云数据库加载费用信息
  async loadFeeInfo(studentId) {
    try {
      // 这里应该调用云函数获取费用信息
      // 暂时使用本地存储或默认数据
      const feeData = await this.fetchFeeFromCloud(studentId);
      
      if (feeData) {
        this.setData({
          feeInfo: feeData.feeInfo,
          history: feeData.history || [],
          loading: false
        });
      } else {
        this.loadFeeFromLocal(studentId);
      }
    } catch (error) {
      console.error('加载费用信息失败:', error);
      this.loadFeeFromLocal(studentId);
    }
  },

  // 从云端获取费用信息（模拟）
  async fetchFeeFromCloud(studentId) {
    // TODO: 这里应该调用云函数获取真实的费用数据
    // 现在返回 null，让逻辑走到本地存储
    return null;
  },

  // 从本地存储加载费用信息（备用方案）
  loadFeeFromLocal(studentId) {
    try {
      // 尝试从本地存储读取
      const feeInfo = wx.getStorageSync('feeInfo_' + studentId) || wx.getStorageSync('feeInfo');
      const history = wx.getStorageSync('feeHistory_' + studentId) || [];
      
      if (feeInfo) {
        this.setData({
          feeInfo: {
            ...this.data.feeInfo,
            ...feeInfo
          },
          history: history,
          loading: false
        });
      } else {
        // 使用默认数据
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
          history: [],
          loading: false
        });
      }
    } catch (e) {
      console.log('使用默认费用信息');
      this.setData({ loading: false });
    }
  },

  // 获取默认到期日期（下个月同一天）
  getDefaultExpireDate() {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().split('T')[0];
  },

  handlePay() {
    const { currentChild, feeInfo } = this.data;
    
    if (!currentChild) {
      wx.showToast({
        title: '请先选择孩子',
        icon: 'none'
      });
      return;
    }
    
    if (feeInfo.paidStatus === 'paid') {
      wx.showToast({
        title: '本月已缴费',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '缴费确认',
      content: `为 ${currentChild.name} 缴纳托管费 ¥${feeInfo.priceMonth} 元？`,
      confirmText: '确认缴费',
      success: (res) => {
        if (res.confirm) {
          // 模拟支付成功
          this.simulatePayment();
        }
      }
    });
  },

  // 模拟支付（实际应该调用微信支付）
  simulatePayment() {
    wx.showLoading({ title: '支付中...' });
    
    setTimeout(() => {
      wx.hideLoading();
      
      const { feeInfo, history, currentChild } = this.data;
      
      // 更新缴费状态
      const newFeeInfo = {
        ...feeInfo,
        paidStatus: 'paid',
        remainingDays: 30,
        expireDate: this.getDefaultExpireDate()
      };
      
      // 添加缴费记录
      const newHistory = [
        {
          date: new Date().toISOString().split('T')[0],
          amount: feeInfo.priceMonth,
          status: 'paid'
        },
        ...history
      ];
      
      this.setData({
        feeInfo: newFeeInfo,
        history: newHistory
      });
      
      // 保存到本地存储
      const studentId = currentChild._id || currentChild.id;
      wx.setStorageSync('feeInfo_' + studentId, newFeeInfo);
      wx.setStorageSync('feeHistory_' + studentId, newHistory);
      
      wx.showToast({
        title: '缴费成功',
        icon: 'success'
      });
    }, 1500);
  }
});
