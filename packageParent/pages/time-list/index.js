// packageParent/pages/time-list/index.js
import mockData from '../../../mock/mockData.js';

Page({
  data: {
    timeSlots: [],
    filteredTimeSlots: [],
    searchKeyword: ''
  },
  
  onLoad() {
    // 加载时段列表
    this.loadTimeSlots();
  },
  
  onPullDownRefresh() {
    // 下拉刷新
    this.loadTimeSlots();
  },
  
  // 加载时段列表
  loadTimeSlots() {
    // 模拟网络延迟
    setTimeout(() => {
      // 从mockData获取时段列表
      const timeSlots = mockData.timeSlots;
      this.setData({
        timeSlots: timeSlots,
        filteredTimeSlots: timeSlots
      });
      // 停止下拉刷新
      wx.stopPullDownRefresh();
    }, 500);
  },
  
  // 搜索功能
  handleSearch(e) {
    const keyword = e.detail.value.trim();
    this.setData({
      searchKeyword: keyword
    });
    
    // 过滤时段列表
    this.filterTimeSlots(keyword);
  },
  
  // 过滤时段列表
  filterTimeSlots(keyword) {
    if (!keyword) {
      // 无搜索关键词，显示所有时段
      this.setData({
        filteredTimeSlots: this.data.timeSlots
      });
      return;
    }
    
    // 按名称过滤
    const filtered = this.data.timeSlots.filter(slot => 
      slot.name.includes(keyword)
    );
    
    this.setData({
      filteredTimeSlots: filtered
    });
  },
  
  // 跳转到报名页面
  navigateToBook(e) {
    const timeSlotId = e.currentTarget.dataset.timeSlotId;
    const timeSlot = this.data.timeSlots.find(slot => slot.id === timeSlotId);
    
    // 检查是否已满
    if (timeSlot.currentKids >= timeSlot.maxKids) {
      wx.showModal({
        title: '提示',
        content: '该时段名额已满',
        showCancel: false
      });
      return;
    }
    
    // 跳转到报名页面
    wx.navigateTo({
      url: `/packageParent/pages/book/book?timeSlotId=${timeSlotId}`
    });
  }
})