Page({
  data: {
    role: 'parent',
    name: '',
    gender: 'male',
    school: '',
    className: '',
    parentPhone: ''
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        role: userInfo.role,
        parentPhone: userInfo.phone
      });
    }
  },

  // 输入姓名
  onNameInput(e) {
    this.setData({ name: e.detail.value });
  },

  // 选择性别
  onGenderChange(e) {
    const gender = e.detail.value === '1' ? 'female' : 'male';
    this.setData({ gender });
  },

  // 输入学校
  onSchoolInput(e) {
    this.setData({ school: e.detail.value });
  },

  // 输入班级
  onClassInput(e) {
    this.setData({ className: e.detail.value });
  },

  // 保存并进入
  handleSave() {
    const { role, name, gender, school, className, parentPhone } = this.data;

    if (!name) {
      wx.showToast({
        title: role === 'teacher' ? '请输入您的姓名' : '请输入您的姓名',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    setTimeout(() => {
      wx.hideLoading();

      if (role === 'teacher') {
        // 教师端：保存教师资料
        const profile = {
          role,
          name,
          gender,
          school: school || '第一小学',
          parentPhone,
          saveTime: new Date().toISOString()
        };
        wx.setStorageSync('profile', profile);
        
        // 跳转到教师端首页
        wx.switchTab({
          url: '/pages/homework/index'
        });
      } else {
        // 家长端：只保存家长基本信息，孩子信息从后台获取
        const parentProfile = {
          role: 'parent',
          name: name,
          phone: parentPhone,
          saveTime: new Date().toISOString()
        };
        wx.setStorageSync('parentProfile', parentProfile);
        
        // 注意：孩子信息由后台管理系统统一管理
        // 家长端会自动根据手机号从云数据库获取绑定的孩子
        
        // 跳转到家长端首页
        wx.switchTab({
          url: '/pages/parent/homework/index'
        });
      }
    }, 500);
  }
});
