Page({
  data: {
    phone: '',
    code: '',
    countdown: 0,
    isTeacher: false
  },

  onLoad() {
    // 检查是否已登录
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.phone) {
      this.jumpToMain(userInfo.role);
    }
  },

  // 输入手机号
  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },

  // 输入验证码
  onCodeInput(e) {
    this.setData({ code: e.detail.value });
  },

  // 切换角色
  switchRole(e) {
    const isTeacher = e.currentTarget.dataset.role === 'teacher';
    this.setData({ isTeacher });
  },

  // 获取验证码
  getCode() {
    const { phone } = this.data;
    if (!phone || phone.length !== 11) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }

    wx.showToast({
      title: '验证码已发送',
      icon: 'success'
    });

    // 倒计时
    this.setData({ countdown: 60 });
    const timer = setInterval(() => {
      const countdown = this.data.countdown - 1;
      if (countdown <= 0) {
        clearInterval(timer);
      }
      this.setData({ countdown });
    }, 1000);
  },

  // 登录
  handleLogin() {
    const { phone, code, isTeacher } = this.data;

    if (!phone || phone.length !== 11) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }

    if (!code || code.length !== 6) {
      wx.showToast({
        title: '请输入6位验证码',
        icon: 'none'
      });
      return;
    }

    // 模拟登录验证
    wx.showLoading({ title: '登录中...' });

    setTimeout(() => {
      wx.hideLoading();

      const role = isTeacher ? 'teacher' : 'parent';
      const userInfo = {
        phone,
        role,
        loginTime: new Date().toISOString()
      };

      wx.setStorageSync('userInfo', userInfo);
      const app = getApp();
      app.setRole(role);

      // 检查是否已填写过信息
      const profile = wx.getStorageSync('profile');
      if (profile && profile.name) {
        this.jumpToMain(role);
      } else {
        wx.navigateTo({
          url: '/pages/register/index'
        });
      }
    }, 1000);
  },

  // 跳转到主页面
  jumpToMain(role) {
    if (role === 'teacher') {
      wx.switchTab({
        url: '/pages/homework/index'
      });
    } else {
      wx.switchTab({
        url: '/pages/parent/homework/index'
      });
    }
  }
});
