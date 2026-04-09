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
  async handleLogin() {
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

    wx.showLoading({ title: '登录中...' });

    try {
      const role = isTeacher ? 'teacher' : 'parent';
      
      if (role === 'teacher') {
        // 老师端：查询是否已注册
        const checkRes = await this.checkTeacherExists(phone);
        
        if (checkRes.exists) {
          // 老师已存在，直接登录
          console.log('[登录] 老师已存在，自动登录');
          
          wx.setStorageSync('teacher_info', checkRes.data);
          wx.setStorageSync('profile', {
            role: 'teacher',
            name: checkRes.data.name,
            parentPhone: phone
          });
        } else {
          // 老师不存在，跳转完善信息
          console.log('[登录] 老师不存在，跳转完善信息');
          wx.hideLoading();
          wx.setStorageSync('userInfo', { phone, role, loginTime: new Date().toISOString() });
          wx.navigateTo({ url: '/pages/register/index' });
          return;
        }
      } else {
        // 家长端：先查询是否有绑定的孩子
        console.log('[登录] 家长登录，检查授权...');
        
        const checkRes = await this.checkParentAuthorized(phone);
        
        if (!checkRes.authorized) {
          // 该手机号不是任何学生的家长手机号，拒绝登录
          wx.hideLoading();
          console.log('[登录] 家长未授权:', phone);
          wx.showToast({
            title: checkRes.message || '该手机号未注册为家长',
            icon: 'none'
          });
          return;
        }
        
        // 授权通过，保存家长信息并绑定孩子
        wx.setStorageSync('parentProfile', {
          role: 'parent',
          phone: phone
        });
        
        // 绑定找到的孩子
        await this.loadAndBindChildren(phone);
      }

      // 保存用户信息
      wx.setStorageSync('userInfo', {
        phone,
        role,
        loginTime: new Date().toISOString()
      });

      const app = getApp();
      app.setRole(role);

      wx.hideLoading();
      wx.showToast({
        title: '登录成功',
        icon: 'success',
        duration: 1000,
        success: () => {
          setTimeout(() => {
            this.jumpToMain(role);
          }, 1000);
        }
      });
    } catch (err) {
      wx.hideLoading();
      console.error('[登录] 失败:', err);
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      });
    }
  },

  // 检查老师是否已注册
  async checkTeacherExists(phone) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'api',
        data: {
          action: 'getTeacherByPhone',
          data: { phone }
        }
      });

      console.log('[checkTeacherExists] 结果:', res);

      if (res.result && res.result.success && res.result.data) {
        return { exists: true, data: res.result.data };
      }
      return { exists: false, data: null };
    } catch (err) {
      console.error('[checkTeacherExists] 失败:', err);
      return { exists: false, data: null };
    }
  },

  // 检查家长是否已授权（手机号是否是某个学生的家长手机号）
  async checkParentAuthorized(phone) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'api',
        data: {
          action: 'getStudentsByParentPhone',
          data: { parentPhone: phone }
        }
      });

      console.log('[checkParentAuthorized] 查询结果:', res);

      if (res.result && res.result.success && res.result.data && res.result.data.length > 0) {
        // 找到了绑定该手机号的学生，允许登录
        return { 
          authorized: true, 
          children: res.result.data 
        };
      }
      // 没有找到该手机号对应的学生，拒绝登录
      return { 
        authorized: false, 
        message: '该手机号未登记为家长' 
      };
    } catch (err) {
      console.error('[checkParentAuthorized] 查询失败:', err);
      return { 
        authorized: false, 
        message: '查询失败，请重试' 
      };
    }
  },

  // 查询该家长绑定的孩子
  async loadAndBindChildren(phone) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'api',
        data: {
          action: 'getStudentsByParentPhone',
          data: { parentPhone: phone }
        }
      });

      console.log('[loadAndBindChildren] 查询结果:', res);

      if (res.result && res.result.success && res.result.data) {
        const children = res.result.data.map(child => ({
          id: child._id,
          _id: child._id,
          name: child.name,
          className: child.className || '',
          school: child.school || '',
          gender: child.gender || 'male',
          age: child.age || 7,
          parentPhone: child.parentPhone,
          paidStatus: child.paidStatus || 'pending',
          remainingDays: child.remainingDays || 0,
          expireDate: child.expireDate || '',
          priceMonth: child.priceMonth || 2800,
          priceTerm: child.priceTerm || 12800
        }));
        
        console.log('[loadAndBindChildren] 找到', children.length, '个孩子');
        
        // 保存孩子列表
        wx.setStorageSync('childrenList', children);
        
        // 绑定第一个孩子，并同步保存缴费数据到缓存
        if (children.length > 0) {
          wx.setStorageSync('boundStudent', children[0]);
          
          // 同步保存第一个孩子的缴费数据到缓存
          this.syncFeeDataToCache(children[0]);
          console.log('[loadAndBindChildren] 已绑定第一个孩子:', children[0].name);
        }
      } else {
        console.log('[loadAndBindChildren] 未找到绑定的孩子');
        wx.setStorageSync('childrenList', []);
        wx.removeStorageSync('boundStudent');
      }
    } catch (err) {
      console.error('[loadAndBindChildren] 查询失败:', err);
      wx.setStorageSync('childrenList', []);
    }
  },

  // 同步缴费数据到本地缓存
  syncFeeDataToCache(student) {
    if (!student || !student.id) return;
    
    const now = new Date();
    let paidStatus = student.paidStatus || 'pending';
    let remainingDays = student.remainingDays || 0;
    let expireDate = student.expireDate || '';
    
    // 如果有过期日期，重新计算剩余天数
    if (expireDate) {
      const expireTime = new Date(expireDate).getTime();
      const nowTime = now.getTime();
      remainingDays = Math.max(0, Math.ceil((expireTime - nowTime) / (1000 * 60 * 60 * 24)));
      
      if (remainingDays <= 0) {
        paidStatus = 'pending';
      }
    }
    
    const feeInfo = {
      priceMonth: student.priceMonth || 2800,
      priceTerm: student.priceTerm || 12800,
      originalPriceTerm: student.originalPriceTerm || 15000,
      paidStatus,
      remainingDays,
      expireDate,
      services: student.services || ['午餐', '午休', '作业辅导']
    };
    
    // 保存到缓存（与 fee 页面一致的 key）
    const cacheKey = 'fee_cache_' + student.id;
    try {
      wx.setStorageSync(cacheKey, {
        feeInfo,
        history: [],
        timestamp: Date.now()
      });
      console.log('[syncFeeDataToCache] 缴费数据已同步到缓存:', cacheKey, feeInfo);
    } catch (e) {
      console.error('[syncFeeDataToCache] 保存缓存失败:', e);
    }
  },

  // 检查用户是否已注册
  async checkUserExists(phone, role) {
    try {
      if (role === 'teacher') {
        // 查询老师
        const res = await wx.cloud.callFunction({
          name: 'api',
          data: {
            action: 'getTeacherByPhone',
            data: { phone }
          }
        });

        console.log('[checkUserExists] 查询老师结果:', res);

        if (res.result && res.result.success && res.result.data) {
          return { exists: true, data: res.result.data };
        }
      } else {
        // 家长端：查询是否有绑定该手机号的学生
        const res = await wx.cloud.callFunction({
          name: 'api',
          data: {
            action: 'getStudentsByParentPhone',
            data: { parentPhone: phone }
          }
        });

        console.log('[checkUserExists] 查询家长结果:', res);

        if (res.result && res.result.success && res.result.data && res.result.data.length > 0) {
          // 家长存在（有绑定的孩子）
          return { 
            exists: true, 
            data: { 
              name: '家长',
              children: res.result.data 
            } 
          };
        }
      }
      
      // 用户不存在
      return { exists: false, data: null };
    } catch (err) {
      console.error('[checkUserExists] 查询失败:', err);
      return { exists: false, data: null };
    }
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
