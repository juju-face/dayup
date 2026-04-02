// packageParent/pages/enroll-records/index.js
import mockData from '../../../mock/mockData.js';

Page({
  data: {
    activeFilter: 'all', // all, pending, completed
    enrollList: [],
    filteredRecords: [],
    childrenList: [],
    timeSlots: []
  },
  
  onLoad() {
    // 初始化数据
    this.initData();
  },
  
  onShow() {
    // 页面显示时重新加载数据
    this.initData();
  },
  
  // 初始化数据
  initData() {
    // 加载报名记录
    this.loadEnrollRecords();
    // 加载孩子列表
    this.loadChildrenList();
    // 加载时段列表
    this.loadTimeSlots();
    // 过滤记录
    this.filterRecords();
  },
  
  // 加载报名记录
  loadEnrollRecords() {
    const enrollList = wx.getStorageSync('enrollList') || [];
    this.setData({
      enrollList: enrollList
    });
  },
  
  // 加载孩子列表
  loadChildrenList() {
    const childrenList = wx.getStorageSync('childrenList') || [];
    this.setData({
      childrenList: childrenList
    });
  },
  
  // 加载时段列表
  loadTimeSlots() {
    const timeSlots = mockData.timeSlots;
    this.setData({
      timeSlots: timeSlots
    });
  },
  
  // 切换筛选
  switchFilter(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({
      activeFilter: filter
    });
    // 重新过滤记录
    this.filterRecords();
  },
  
  // 过滤记录
  filterRecords() {
    const { enrollList, childrenList, timeSlots, activeFilter } = this.data;
    
    // 关联查询，添加孩子和时段信息
    const recordsWithDetails = enrollList.map(enroll => {
      // 查找孩子信息
      const child = childrenList.find(c => c.id === enroll.childId) || {};
      // 查找时段信息
      const timeSlot = timeSlots.find(t => t.id === enroll.timeSlotId) || {};
      
      // 状态文本映射
      const statusTextMap = {
        pending: '待签到',
        checkedIn: '已签到',
        completed: '已完成',
        cancelled: '已取消'
      };
      
      return {
        ...enroll,
        childName: child.name || '未知孩子',
        avatar: child.avatar,
        timeSlotName: timeSlot.name || '未知时段',
        timeRange: timeSlot.timeRange || '',
        statusText: statusTextMap[enroll.status] || '未知状态'
      };
    });
    
    // 按时间倒序排列
    recordsWithDetails.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
    
    // 根据筛选条件过滤
    let filtered;
    switch (activeFilter) {
      case 'pending':
        filtered = recordsWithDetails.filter(record => record.status === 'pending');
        break;
      case 'completed':
        filtered = recordsWithDetails.filter(record => record.status === 'completed' || record.status === 'checkedIn');
        break;
      default:
        filtered = recordsWithDetails;
    }
    
    this.setData({
      filteredRecords: filtered
    });
  },
  
  // 查看记录详情
  viewRecordDetail(e) {
    const record = e.currentTarget.dataset.record;
    
    // 查找签到记录
    const checkInList = wx.getStorageSync('checkInList') || [];
    const checkInRecord = checkInList.find(c => c.childId === record.childId && c.timeSlotId === record.timeSlotId && c.type === 'checkIn');
    const checkOutRecord = checkInList.find(c => c.childId === record.childId && c.timeSlotId === record.timeSlotId && c.type === 'checkOut');
    
    let content = `孩子：${record.childName}\n时段：${record.timeSlotName}\n时间：${record.timeRange}\n报名时间：${record.createTime}\n状态：${record.statusText}`;
    
    if (checkInRecord) {
      content += `\n签到时间：${checkInRecord.checkTime}`;
    }
    
    if (checkOutRecord) {
      content += `\n签退时间：${checkOutRecord.checkTime}`;
    }
    
    wx.showModal({
      title: '报名详情',
      content: content,
      showCancel: false
    });
  },
  
  // 取消报名
  cancelEnroll(e) {
    const recordId = e.currentTarget.dataset.id;
    const that = this;
    
    wx.showModal({
      title: '取消报名',
      content: '确定要取消该报名吗？',
      success(res) {
        if (res.confirm) {
          const enrollList = wx.getStorageSync('enrollList') || [];
          const updatedEnrollList = enrollList.map(enroll => {
            if (enroll.id === recordId) {
              return {
                ...enroll,
                status: 'cancelled'
              };
            }
            return enroll;
          });
          
          // 保存更新后的报名记录
          wx.setStorageSync('enrollList', updatedEnrollList);
          
          // 恢复时段名额
          const cancelledEnroll = enrollList.find(enroll => enroll.id === recordId);
          if (cancelledEnroll) {
            that.restoreTimeSlotQuota(cancelledEnroll.timeSlotId);
          }
          
          // 重新加载数据
          that.initData();
          
          wx.showToast({
            title: '取消成功',
            icon: 'success',
            duration: 1500
          });
        }
      }
    });
  },
  
  // 恢复时段名额
  restoreTimeSlotQuota(timeSlotId) {
    // 注意：这里应该更新 mock 数据或后端数据库
    // 由于使用的是 Mock 数据，这里我们可以模拟更新
    console.log('恢复时段名额：', timeSlotId);
    
    // 实际项目中，这里应该调用 API 或更新本地存储中的时段数据
  }
})
