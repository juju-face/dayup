// pages/students/add-student/index.js
const storage = require('../../../utils/storage.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    formData: {
      name: '',
      grade: '',
      class: '',
      school: '',
      parentPhone: '',
      address: ''
    },
    gradeOptions: ['请选择年级', '一年级', '二年级', '三年级', '四年级', '五年级', '六年级'],
    classOptions: ['请选择班级', '1班', '2班', '3班', '4班', '5班', '6班', '7班', '8班', '9班', '10班'],
    schoolOptions: ['请选择学校', '北京市第一小学', '北京市第二小学', '北京市第三小学', '北京市实验小学', '朝阳区中心小学'],
    gradeIndex: 0,
    classIndex: 0,
    schoolIndex: 0,
    // 地址选择器数据
    cityOptions: ['请选择市县', '北京市', '上海市', '广州市', '深圳市'],
    districtOptions: ['请选择区', '朝阳区', '海淀区', '东城区', '西城区', '丰台区'],
    streetOptions: ['请选择街道', '建国路街道', '朝阳路街道', '中关村街道', '五道口街道', '望京街道'],
    cityIndex: 0,
    districtIndex: 0,
    streetIndex: 0,
    selectedCity: '',
    selectedDistrict: '',
    selectedStreet: '',
    phoneError: false,
    shakePhone: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

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
  
  // 输入框绑定
  bindInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [`formData.${field}`]: value
    });
  },

  // 年级选择
  bindGradeChange(e) {
    const index = parseInt(e.detail.value);
    const gradeText = this.data.gradeOptions[index];
    // 如果选择的是"请选择年级"，则不保存为有效值
    const gradeValue = gradeText === '请选择年级' ? '' : index;
    this.setData({
      gradeIndex: index,
      [`formData.grade`]: gradeValue
    });
  },

  // 班级选择
  bindClassChange(e) {
    const index = parseInt(e.detail.value);
    const classText = this.data.classOptions[index];
    // 如果选择的是"请选择班级"，则不保存为有效值
    const classValue = classText === '请选择班级' ? '' : index;
    this.setData({
      classIndex: index,
      [`formData.class`]: classValue
    });
  },

  // 学校选择
  bindSchoolChange(e) {
    const index = parseInt(e.detail.value);
    const schoolValue = this.data.schoolOptions[index];
    // 如果选择的是"请选择学校"，则不保存为有效值
    const finalValue = schoolValue === '请选择学校' ? '' : schoolValue;
    this.setData({
      schoolIndex: index,
      [`formData.school`]: finalValue
    });
  },

  // 地址选择 - 市县
  bindCityChange(e) {
    const index = parseInt(e.detail.value);
    const cityText = this.data.cityOptions[index];
    const cityValue = cityText === '请选择市县' ? '' : cityText;
    this.setData({
      cityIndex: index,
      selectedCity: cityValue
    }, () => {
      this.updateAddress();
    });
  },

  // 地址选择 - 区
  bindDistrictChange(e) {
    const index = parseInt(e.detail.value);
    const districtText = this.data.districtOptions[index];
    const districtValue = districtText === '请选择区' ? '' : districtText;
    this.setData({
      districtIndex: index,
      selectedDistrict: districtValue
    }, () => {
      this.updateAddress();
    });
  },

  // 地址选择 - 街道
  bindStreetChange(e) {
    const index = parseInt(e.detail.value);
    const streetText = this.data.streetOptions[index];
    const streetValue = streetText === '请选择街道' ? '' : streetText;
    this.setData({
      streetIndex: index,
      selectedStreet: streetValue
    }, () => {
      this.updateAddress();
    });
  },

  // 更新完整地址
  updateAddress() {
    const { selectedCity, selectedDistrict, selectedStreet } = this.data;
    const addressParts = [];
    if (selectedCity) addressParts.push(selectedCity);
    if (selectedDistrict) addressParts.push(selectedDistrict);
    if (selectedStreet) addressParts.push(selectedStreet);
    const fullAddress = addressParts.join('');
    this.setData({
      [`formData.address`]: fullAddress
    });
  },

  // 表单提交
  formSubmit(e) {
    const formData = this.data.formData;
    
    // 验证表单
    if (!formData.name) {
      wx.showToast({ title: '请输入姓名', icon: 'error' });
      return;
    }
    if (!formData.grade) {
      wx.showToast({ title: '请选择年级', icon: 'error' });
      return;
    }
    if (!formData.class) {
      wx.showToast({ title: '请选择班级', icon: 'error' });
      return;
    }
    if (!formData.school) {
      wx.showToast({ title: '请输入学校', icon: 'error' });
      return;
    }
    // 验证电话号码格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!formData.parentPhone) {
      this.setData({ phoneError: true, shakePhone: true });
      setTimeout(() => this.setData({ shakePhone: false }), 500);
      wx.showToast({ title: '请输入家长电话', icon: 'error' });
      return;
    }
    if (!phoneRegex.test(formData.parentPhone)) {
      this.setData({ phoneError: true, shakePhone: true });
      setTimeout(() => this.setData({ shakePhone: false }), 500);
      wx.showToast({ title: '手机号格式错误', icon: 'error' });
      return;
    }
    if (!formData.address) {
      wx.showToast({ title: '请输入家庭住址', icon: 'error' });
      return;
    }
    
    // 创建新学生对象
    const newStudent = {
      id: 'student_' + Date.now(),
      name: formData.name.trim(),
      grade: parseInt(formData.grade),
      class: parseInt(formData.class),
      school: formData.school.trim(),
      parentPhone: formData.parentPhone.trim(),
      address: formData.address.trim()
    };
    
    // 存储新学生数据
    try {
      const students = storage.getStudents();
      students.push(newStudent);
      storage.setStudents(students);
      
      // 显示成功提示
      wx.showToast({
        title: '添加成功',
        icon: 'success',
        duration: 1000,
        success: () => {
          // 返回上一页
          setTimeout(() => {
            wx.navigateBack();
          }, 1000);
        }
      });
    } catch (error) {
      console.error('添加学生失败:', error);
      wx.showToast({ title: '添加失败', icon: 'error' });
    }
  },
  
  // 取消添加
  cancelAdd() {
    wx.navigateBack();
  }
})