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
  async handleSave() {
    const { role, name, gender, school, className, parentPhone } = this.data;

    if (!name) {
      wx.showToast({
        title: role === 'teacher' ? '请输入您的姓名' : '请输入您的姓名',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      if (role === 'teacher') {
        // 教师端：调用云函数创建真实账号，获取真实 _id
        const addRes = await wx.cloud.callFunction({
          name: 'api',
          data: {
            action: 'addTeacher',
            data: {
              name: name,
              phone: parentPhone,
              password: '123456',  // 默认密码
              subject: '',
              classes: [],
              role: 'teacher',
              status: 'active'
            }
          }
        });

        console.log('[注册老师] 云函数返回:', addRes);

        if (addRes.result && addRes.result.success) {
          const teacherInfo = addRes.result.data;  // 包含真实的 _id
          
          // 保存到 storage
          wx.setStorageSync('teacher_info', teacherInfo);
          
          const profile = {
            role,
            name,
            gender,
            school: school || '第一小学',
            parentPhone,
            saveTime: new Date().toISOString()
          };
          wx.setStorageSync('profile', profile);
          
          wx.hideLoading();
          wx.showToast({
            title: '注册成功',
            icon: 'success',
            duration: 1000,
            success: () => {
              setTimeout(() => {
                wx.switchTab({
                  url: '/pages/homework/index'
                });
              }, 1000);
            }
          });
        } else {
          wx.hideLoading();
          wx.showToast({
            title: addRes.result?.message || '注册失败',
            icon: 'none'
          });
        }
      } else {
        // 家长端：只保存家长基本信息
        const parentProfile = {
          role: 'parent',
          name: name,
          phone: parentPhone,
          saveTime: new Date().toISOString()
        };
        wx.setStorageSync('parentProfile', parentProfile);
        
        wx.hideLoading();
        wx.showToast({
          title: '保存成功',
          icon: 'success',
          duration: 1000,
          success: () => {
            setTimeout(() => {
              wx.switchTab({
                url: '/pages/parent/homework/index'
              });
            }, 1000);
          }
        });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('[注册] 失败:', err);
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      });
    }
  }
});
