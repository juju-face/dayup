// pages/students/index.js
const cloudDB = require('../../utils/cloud-db.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    students: [],
    filteredStudents: [],
    showFilterModal: false,
    filters: {
      school: '',
      className: ''
    },
    schools: [],
    classNames: [],
    loading: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadStudents();
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
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadStudents();
    wx.stopPullDownRefresh();
  },

  /**
   * 加载学生数据（从云数据库）
   */
  async loadStudents() {
    this.setData({ loading: true });
    
    try {
      // 从云数据库获取学生列表
      const result = await cloudDB.getStudentList();
      
      if (result.success) {
        const students = result.data || [];
        
        // 提取学校和班级列表
        const schools = [...new Set(students.map(student => student.school).filter(Boolean))];
        const classNames = [...new Set(students.map(student => student.className).filter(Boolean))];
        
        this.setData({ 
          students,
          schools,
          classNames,
          filteredStudents: students,
          loading: false
        });
      } else {
        // 如果云开发未配置，使用本地存储作为备用
        this.loadFromLocal();
      }
    } catch (error) {
      console.error('加载学生数据失败:', error);
      // 使用本地存储作为备用
      this.loadFromLocal();
    }
  },

  /**
   * 从本地存储加载（备用方案）
   */
  loadFromLocal() {
    try {
      const storage = require('../../utils/storage.js');
      const students = storage.getStudents();
      
      const schools = [...new Set(students.map(student => student.school).filter(Boolean))];
      const classNames = [...new Set(students.map(student => student.className).filter(Boolean))];
      
      this.setData({ 
        students,
        schools,
        classNames,
        filteredStudents: students,
        loading: false
      });
      
      this.updateFilteredStudents();
    } catch (error) {
      console.error('本地加载失败:', error);
      this.setData({ 
        students: [],
        filteredStudents: [],
        schools: [],
        classNames: [],
        loading: false
      });
    }
  },

  /**
   * 显示筛选弹窗
   */
  showFilter() {
    this.setData({ showFilterModal: true });
  },

  /**
   * 隐藏筛选弹窗
   */
  hideFilter() {
    this.setData({ showFilterModal: false });
  },

  /**
   * 设置筛选条件
   */
  setFilter(e) {
    const { key, value } = e.currentTarget.dataset;
    const filters = { ...this.data.filters };
    filters[key] = value;
    this.setData({ filters });
  },

  /**
   * 重置筛选条件
   */
  resetFilter() {
    this.setData({ 
      filters: {
        school: '',
        className: ''
      }
    });
  },

  /**
   * 应用筛选条件
   */
  applyFilter() {
    this.setData({ showFilterModal: false });
    this.updateFilteredStudents();
  },

  /**
   * 更新筛选后的学生列表
   */
  updateFilteredStudents() {
    let filtered = [...this.data.students];
    
    // 应用学校筛选
    if (this.data.filters.school) {
      filtered = filtered.filter(student => student.school === this.data.filters.school);
    }
    
    // 应用班级筛选
    if (this.data.filters.className) {
      filtered = filtered.filter(student => student.className === this.data.filters.className);
    }
    
    this.setData({ filteredStudents: filtered });
  },

  /**
   * 显示学生详情
   */
  showStudentDetail(e) {
    const studentId = e.currentTarget.dataset.id;
    const student = this.data.students.find(s => s.id === studentId);
    
    if (student) {
      wx.showModal({
        title: student.name,
        content: `学校：${student.school || '未设置'}\n班级：${student.className || '未设置'}\n家长手机：${student.parentPhone || '未设置'}\n入学日期：${student.enrollDate || '未设置'}\n状态：${student.status === 'active' ? '在读' : '休学'}`,
        showCancel: false
      });
    }
  },

  /**
   * 阻止事件冒泡
   */
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  }
})
