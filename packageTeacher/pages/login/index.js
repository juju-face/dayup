// packageTeacher/pages/login/index.js
Page({
  data: {
    phone: '',
    password: '',
    loading: false
  },

  // 输入手机号
  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },

  // 输入密码
  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },

  // 登录
  onLogin() {
    const { phone, password } = this.data;
    
    if (!phone || !password) {
      wx.showToast({
        title: '请输入手机号和密码',
        icon: 'none'
      });
      return;
    }
    
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({
        title: '手机号格式不正确',
        icon: 'none'
      });
      return;
    }
    
    this.setData({ loading: true });
    
    wx.cloud.callFunction({
      name: 'api',
      data: {
        action: 'teacherLogin',
        data: { phone, password }
      }
    }).then(res => {
      console.log('老师登录结果:', res);
      
      if (res.result && res.result.success) {
        const teacherInfo = res.result.data;
        
        // 存储老师信息
        wx.setStorageSync('teacher_info', teacherInfo);
        
        // 存储到globalData
        const app = getApp();
        if (app) {
          app.globalData.teacherInfo = teacherInfo;
        }
        
        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 1000,
          success: () => {
            // 跳转到首页
            setTimeout(() => {
              wx.redirectTo({
                url: '/packageTeacher/pages/home/index'
              });
            }, 1000);
          }
        });
      } else {
        wx.showToast({
          title: res.result?.message || '登录失败',
          icon: 'error'
        });
      }
    }).catch(err => {
      console.error('登录失败:', err);
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'error'
      });
    }).finally(() => {
      this.setData({ loading: false });
    });
  },

  // 测试登录（用于开发测试 - 调用真实登录接口）
  onTestLogin() {
    wx.showModal({
      title: '测试登录',
      content: '使用测试账号登录？\n手机号：13800138001\n密码：123456',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            phone: '13800138001',
            password: '123456'
          });
          
          // 调用真实的登录接口，获取数据库中的真实 teacher _id
          this.setData({ loading: true });
          
          wx.cloud.callFunction({
            name: 'api',
            data: {
              action: 'teacherLogin',
              data: { phone: '13800138001', password: '123456' }
            }
          }).then(loginRes => {
            console.log('[测试登录] 云函数返回:', loginRes);
            
            if (loginRes.result && loginRes.result.success) {
              const teacherInfo = loginRes.result.data;
              
              wx.setStorageSync('teacher_info', teacherInfo);
              
              const app = getApp();
              if (app) {
                app.globalData.teacherInfo = teacherInfo;
              }
              
              wx.showToast({
                title: '测试登录成功',
                icon: 'success',
                duration: 1000,
                success: () => {
                  setTimeout(() => {
                    wx.redirectTo({
                      url: '/packageTeacher/pages/home/index'
                    });
                  }, 1000);
                }
              });
            } else {
              // 测试账号不存在，自动创建
              console.log('[测试登录] 测试账号不存在，自动创建...');
              wx.cloud.callFunction({
                name: 'api',
                data: {
                  action: 'addTeacher',
                  data: {
                    name: '测试老师',
                    phone: '13800138001',
                    password: '123456',
                    subject: '数学',
                    classes: ['一年级1班', '二年级1班'],
                    role: 'teacher',
                    status: 'active'
                  }
                }
              }).then(addRes => {
                console.log('[测试登录] 创建测试账号返回:', addRes);
                
                if (addRes.result && addRes.result.success) {
                  // 创建成功，重新登录
                  wx.cloud.callFunction({
                    name: 'api',
                    data: {
                      action: 'teacherLogin',
                      data: { phone: '13800138001', password: '123456' }
                    }
                  }).then(reLoginRes => {
                    if (reLoginRes.result && reLoginRes.result.success) {
                      const teacherInfo = reLoginRes.result.data;
                      wx.setStorageSync('teacher_info', teacherInfo);
                      
                      const app = getApp();
                      if (app) {
                        app.globalData.teacherInfo = teacherInfo;
                      }
                      
                      wx.showToast({
                        title: '账号已创建，登录成功',
                        icon: 'success',
                        duration: 1500,
                        success: () => {
                          setTimeout(() => {
                            wx.redirectTo({
                              url: '/packageTeacher/pages/home/index'
                            });
                          }, 1500);
                        }
                      });
                    }
                  });
                } else {
                  wx.showToast({
                    title: addRes.result?.message || '创建测试账号失败',
                    icon: 'none'
                  });
                }
              });
            }
          }).catch(err => {
            console.error('[测试登录] 失败:', err);
            wx.showToast({
              title: '测试登录失败: ' + (err.message || '未知错误'),
              icon: 'none'
            });
          }).finally(() => {
            this.setData({ loading: false });
          });
        }
      }
    });
  }
});
