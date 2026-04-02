// packageTeacher/pages/students/index.js
const storage = require('../../../utils/storage.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    students: [],
    filteredStudents: [],
    selectedStudents: [],
    showFilterModal: false,
    filters: {
      school: ''
    },
    schools: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadStudents();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.loadStudents();
    // 更新tabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateSelected();
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadStudents();
    wx.stopPullDownRefresh();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },
  
  // 加载学生数据
  loadStudents() {
    try {
      const students = storage.getStudents();
      
      // 提取学校列表
      const schools = [...new Set(students.map(student => student.school))];
      
      this.setData({ 
        students,
        schools,
        filteredStudents: students
      });
      
      // 应用筛选
      this.updateFilteredStudents();
    } catch (error) {
      console.error('加载学生数据失败:', error);
      this.setData({ 
        students: [],
        filteredStudents: [],
        schools: []
      });
    }
  },
  
  // 显示筛选弹窗
  showFilter() {
    this.setData({ showFilterModal: true });
  },
  
  // 隐藏筛选弹窗
  hideFilter() {
    this.setData({ showFilterModal: false });
  },
  
  // 设置筛选条件
  setFilter(e) {
    const { key, value } = e.currentTarget.dataset;
    const filters = { ...this.data.filters };
    filters[key] = value;
    this.setData({ filters });
  },
  
  // 重置筛选条件
  resetFilter() {
    this.setData({ 
      filters: {
        school: ''
      }
    });
  },
  
  // 应用筛选条件
  applyFilter() {
    this.setData({ showFilterModal: false });
    this.updateFilteredStudents();
  },
  
  // 更新筛选后的学生列表
  updateFilteredStudents() {
    let filtered = [...this.data.students];
    
    // 应用学校筛选
    if (this.data.filters.school) {
      filtered = filtered.filter(student => student.school === this.data.filters.school);
    }
    
    this.setData({ filteredStudents: filtered });
  },
  
  // 显示学生详情
  showStudentDetail(e) {
    const studentId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '学生详情',
      content: '学生详情功能开发中',
      showCancel: false
    });
  },
  
  // 添加学生
  addStudent() {
    // 直接跳转到添加学生页面
    wx.navigateTo({
      url: '/pages/students/add-student/index'
    });
  },
  
  // 批量编辑
  batchEdit() {
    wx.showModal({
      title: '批量编辑',
      content: '批量编辑功能开发中',
      showCancel: false
    });
  },
  
  // 批量删除
  batchDelete() {
    wx.showModal({
      title: '批量删除',
      content: '确定要删除选中的学生吗？',
      success: (res) => {
        if (res.confirm) {
          // 批量删除逻辑
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
          this.setData({ selectedStudents: [] });
          this.loadStudents();
        }
      }
    });
  },
  
  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  }
})