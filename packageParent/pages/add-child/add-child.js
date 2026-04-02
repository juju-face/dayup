// packageParent/pages/add-child/add-child.js
Page({
  data: {
    name: '',
    gender: '',
    age: '',
    school: '',
    parentPhone: '',
    allergies: '',
    avatarUrl: '',
    childId: ''
  },
  
  onLoad(options) {
    // 检查是否为编辑模式
    if (options.childId) {
      this.setData({
        childId: options.childId
      });
      // 加载孩子信息
      this.loadChildInfo(options.childId);
    }
  },
  
  // 加载孩子信息（编辑模式）
  loadChildInfo(childId) {
    const childrenList = wx.getStorageSync('childrenList') || [];
    const child = childrenList.find(c => c.id === childId);
    if (child) {
      this.setData({
        name: child.name,
        gender: child.gender,
        age: child.age,
        school: child.school,
        parentPhone: child.parentPhone,
        allergies: child.allergies,
        avatarUrl: child.avatarUrl
      });
    }
  },
  
  // 姓名输入
  handleNameInput(e) {
    this.setData({
      name: e.detail.value
    });
  },
  
  // 性别选择
  handleGenderChange(e) {
    this.setData({
      gender: e.currentTarget.dataset.gender
    });
  },
  
  // 年龄输入
  handleAgeInput(e) {
    this.setData({
      age: e.detail.value
    });
  },
  
  // 学校输入
  handleSchoolInput(e) {
    this.setData({
      school: e.detail.value
    });
  },
  
  // 电话输入
  handlePhoneInput(e) {
    this.setData({
      parentPhone: e.detail.value
    });
  },
  
  // 过敏信息输入
  handleAllergiesInput(e) {
    this.setData({
      allergies: e.detail.value
    });
  },
  
  // 选择头像
  chooseAvatar() {
    const that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        // 获取临时路径
        const tempFilePaths = res.tempFilePaths;
        that.setData({
          avatarUrl: tempFilePaths[0]
        });
      }
    });
  },
  
  // 保存孩子信息
  saveChildInfo() {
    // 表单校验
    if (!this.validateForm()) {
      return;
    }
    
    // 获取现有孩子列表
    let childrenList = wx.getStorageSync('childrenList') || [];
    
    if (this.data.childId) {
      // 编辑模式：更新现有孩子信息
      const index = childrenList.findIndex(c => c.id === this.data.childId);
      if (index !== -1) {
        childrenList[index] = {
          ...childrenList[index],
          name: this.data.name,
          gender: this.data.gender,
          age: this.data.age,
          school: this.data.school,
          parentPhone: this.data.parentPhone,
          allergies: this.data.allergies,
          avatarUrl: this.data.avatarUrl
        };
      }
    } else {
      // 添加模式：创建新孩子对象
      const newChild = {
        id: Date.now().toString(),
        name: this.data.name,
        gender: this.data.gender,
        age: this.data.age,
        school: this.data.school,
        parentPhone: this.data.parentPhone,
        allergies: this.data.allergies,
        avatarUrl: this.data.avatarUrl,
        createTime: new Date().toISOString()
      };
      
      // 追加到列表
      childrenList.push(newChild);
    }
    
    // 保存回本地存储
    wx.setStorageSync('childrenList', childrenList);
    
    // 保存成功提示
    wx.showToast({
      title: '保存成功',
      icon: 'success',
      duration: 1500,
      success() {
        // 延迟返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    });
  },
  
  // 表单校验
  validateForm() {
    // 姓名校验
    if (!this.data.name.trim()) {
      wx.showModal({
        title: '提示',
        content: '请输入孩子姓名',
        showCancel: false
      });
      return false;
    }
    
    // 性别校验
    if (!this.data.gender) {
      wx.showModal({
        title: '提示',
        content: '请选择性别',
        showCancel: false
      });
      return false;
    }
    
    // 年龄校验
    if (!this.data.age) {
      wx.showModal({
        title: '提示',
        content: '请输入年龄',
        showCancel: false
      });
      return false;
    }
    
    const age = parseInt(this.data.age);
    if (age < 1 || age > 18) {
      wx.showModal({
        title: '提示',
        content: '年龄必须在1-18岁之间',
        showCancel: false
      });
      return false;
    }
    
    // 电话校验
    if (!this.data.parentPhone) {
      wx.showModal({
        title: '提示',
        content: '请输入家长联系电话',
        showCancel: false
      });
      return false;
    }
    
    // 手机号正则校验
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(this.data.parentPhone)) {
      wx.showModal({
        title: '提示',
        content: '请输入正确的手机号',
        showCancel: false
      });
      return false;
    }
    
    return true;
  }
})