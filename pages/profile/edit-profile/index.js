Page({
  data: {
    // 老师信息
    teacherInfo: {
      name: '',
      school: '',
      avatarText: '',
      phone: ''
    },
    // 卡通头像选择
    avatarChoices: ['👨‍🏫', '👩‍🏫', '🎓', '📚', '🌟', '💡', '🎨', '🎵', '⚽', '🏀', '🎯', '🎸'],
    showAvatarModal: false,
    selectedAvatar: -1,
    tempAvatar: ''
  },

  onLoad(options) {
    // 接收从主页面传递过来的老师信息
    if (options.teacherInfo) {
      this.setData({
        teacherInfo: JSON.parse(options.teacherInfo)
      });
    }
  },

  // 表单提交
  formSubmit(e) {
    const formData = e.detail.value;
    
    // 更新老师信息
    const updatedInfo = {
      ...this.data.teacherInfo,
      ...formData
    };
    
    // 简单验证
    if (!updatedInfo.name) {
      wx.showToast({
        title: '请输入姓名',
        icon: 'none'
      });
      return;
    }
    
    if (!updatedInfo.school) {
      wx.showToast({
        title: '请输入校区',
        icon: 'none'
      });
      return;
    }
    
    if (updatedInfo.phone && !/^1[3-9]\d{9}$/.test(updatedInfo.phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }
    
    // 模拟保存操作
    wx.showLoading({
      title: '保存中...',
      mask: true
    });
    
    setTimeout(() => {
      wx.hideLoading();
      
      // 保存成功，返回上一页并传递更新后的数据
      const pages = getCurrentPages();
      const prevPage = pages[pages.length - 2];
      
      if (prevPage) {
        prevPage.setData({
          teacherInfo: updatedInfo
        });
      }
      
      wx.showToast({
        title: '资料保存成功',
        icon: 'success'
      });
      
      // 返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1000);
    }, 1000);
  },

  // 显示头像选择弹窗
  showAvatarModal() {
    this.setData({
      showAvatarModal: true,
      selectedAvatar: -1,
      tempAvatar: this.data.teacherInfo.avatarText
    });
    // 禁用背景滚动
    wx.setPageStyle({
      style: {
        overflow: 'hidden'
      }
    });
  },

  // 隐藏头像选择弹窗
  hideAvatarModal() {
    this.setData({
      showAvatarModal: false,
      selectedAvatar: -1,
      tempAvatar: ''
    });
    // 恢复背景滚动
    wx.setPageStyle({
      style: {
        overflow: 'auto'
      }
    });
  },

  // 选择头像
  selectAvatar(e) {
    const index = e.currentTarget.dataset.index;
    const avatar = this.data.avatarChoices[index];
    
    this.setData({
      tempAvatar: avatar,
      selectedAvatar: index
    });
  },

  // 确认选择头像
  confirmAvatar() {
    if (this.data.selectedAvatar !== -1) {
      this.setData({
        'teacherInfo.avatarText': this.data.tempAvatar,
        'showAvatarModal': false,
        'selectedAvatar': -1
      });
    } else {
      wx.showToast({
        title: '请选择一个头像',
        icon: 'none'
      });
    }
  },

  // 阻止滚动
  preventScroll() {
    // 空函数，用于阻止滚动
  }
});