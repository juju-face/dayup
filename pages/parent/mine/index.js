const parentStorage = require('../../../utils/parent-storage.js');
const cloudDB = require('../../../utils/cloud-db.js');

Page({
  data: {
    parentProfile: null,
    childrenList: [], // 所有孩子列表
    currentChild: null, // 当前选中的孩子
    currentChildId: '', // 当前孩子ID
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
  },

  onLoad() {
    this.loadParentProfile();
    this.loadChildrenFromCloud();
  },

  onShow() {
    this.loadParentProfile();
    this.loadChildrenFromCloud();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateSelected();
    }
  },

  // 加载家长基本信息
  loadParentProfile() {
    try {
      const parentProfile = wx.getStorageSync('parentProfile');
      if (parentProfile) {
        this.setData({ parentProfile });
      } else {
        const userInfo = wx.getStorageSync('userInfo');
        this.setData({
          parentProfile: {
            role: 'parent',
            phone: userInfo ? userInfo.phone : ''
          }
        });
      }
    } catch (e) {
      console.log('加载家长资料失败:', e);
    }
  },

  // 从云数据库加载孩子列表（根据家长手机号）
  async loadChildrenFromCloud() {
    this.setData({ loading: true });
    
    try {
      const parentPhone = this.data.parentProfile?.phone || wx.getStorageSync('userInfo')?.phone;
      
      if (!parentPhone) {
        // 如果没有手机号，使用本地存储作为备用
        this.loadChildrenFromLocal();
        return;
      }
      
      // 从云数据库获取绑定的学生
      const result = await cloudDB.getStudentsByParentPhone(parentPhone);
      
      if (result.success && result.data && result.data.length > 0) {
        const childrenList = result.data;
        
        // 获取当前选中的孩子ID
        let currentChildId = parentStorage.getBoundStudentId();
        
        // 如果当前选中的不在列表中，默认选中第一个
        if (!currentChildId || !childrenList.find(c => c.id === currentChildId)) {
          currentChildId = childrenList[0].id;
          parentStorage.bindStudent(currentChildId);
        }
        
        // 找到当前孩子的详细信息
        const currentChild = childrenList.find(child => child.id === currentChildId) || childrenList[0];
        
        this.setData({
          childrenList,
          currentChildId,
          currentChild,
          loading: false
        });
        
        // 加载当前孩子的费用信息
        this.loadFeeInfo(currentChild._id || currentChild.id);
        
        // 保存到本地存储作为缓存
        wx.setStorageSync('childrenList', childrenList);
      } else {
        // 云数据库没有数据，尝试本地存储
        this.loadChildrenFromLocal();
      }
    } catch (error) {
      console.error('从云数据库加载孩子列表失败:', error);
      this.loadChildrenFromLocal();
    }
  },

  // 从本地存储加载（备用方案）
  loadChildrenFromLocal() {
    try {
      // 先尝试从 childrenList 获取
      let childrenList = wx.getStorageSync('childrenList') || [];
      
      // 如果没有，从 students_list 获取（教师端存储的学生数据）
      if (childrenList.length === 0) {
        childrenList = wx.getStorageSync('students_list') || [];
        // 保存到 childrenList 以便后续使用
        if (childrenList.length > 0) {
          wx.setStorageSync('childrenList', childrenList);
        }
      }
      
      // 获取当前选中的孩子ID
      let currentChildId = parentStorage.getBoundStudentId();
      
      // 如果有孩子列表但没有选中，默认选中第一个
      if (childrenList.length > 0 && !currentChildId) {
        currentChildId = childrenList[0].id;
        parentStorage.bindStudent(currentChildId);
      }
      
      // 找到当前孩子的详细信息
      let currentChild = null;
      if (currentChildId) {
        currentChild = childrenList.find(child => child.id === currentChildId) || childrenList[0];
      }
      
      this.setData({
        childrenList,
        currentChildId,
        currentChild,
        loading: false
      });
      
      // 加载费用信息
      if (currentChild) {
        this.loadFeeInfo(currentChildId);
      }
    } catch (e) {
      console.log('加载孩子列表失败:', e);
      this.setData({ loading: false });
    }
  },

  // 加载费用信息
  loadFeeInfo(studentId) {
    try {
      // 尝试从本地存储读取费用信息
      const feeInfo = wx.getStorageSync('feeInfo_' + studentId) || wx.getStorageSync('feeInfo');
      const history = wx.getStorageSync('feeHistory_' + studentId) || [];
      
      if (feeInfo) {
        this.setData({
          feeInfo: {
            ...this.data.feeInfo,
            ...feeInfo
          },
          history: history
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
          history: []
        });
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

  // 切换当前孩子
  handleSwitchChild(e) {
    const childId = e.currentTarget.dataset.id;
    if (childId === this.data.currentChildId) return;
    
    // 更新当前选中的孩子
    const currentChild = this.data.childrenList.find(child => child.id === childId);
    
    this.setData({
      currentChildId: childId,
      currentChild
    });
    
    // 保存到本地存储
    parentStorage.bindStudent(childId);
    
    // 重新加载新孩子的费用信息
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
    wx.switchTab({
      url: '/pages/parent/fee/index'
    });
  },

  // 立即缴费
  handlePay() {
    wx.switchTab({
      url: '/pages/parent/fee/index'
    });
  },

  handleContactTeacher() {
    wx.showModal({
      title: '提示',
      content: '联系老师功能',
      showCancel: false
    });
  }
});
