// packageParent/pages/bind-student/bind-student.js
// 家长绑定已有学生页面

Page({
  data: {
    studentId: '',
    studentInfo: null,
    binding: false
  },

  onLoad() {
    // 检查是否已绑定
    const boundStudent = wx.getStorageSync('bound_student');
    if (boundStudent) {
      wx.showModal({
        title: '提示',
        content: '您已绑定学生：' + boundStudent.name + '\n是否重新绑定？',
        success: (res) => {
          if (!res.confirm) {
            wx.navigateBack();
          }
        }
      });
    }
  },

  // 输入学生ID
  onStudentIdInput(e) {
    this.setData({
      studentId: e.detail.value.trim()
    });
  },

  // 查询学生信息
  async queryStudent() {
    const studentId = this.data.studentId;
    
    if (!studentId) {
      wx.showToast({
        title: '请输入学生ID',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '查询中...',
      mask: true
    });

    try {
      // 调用云函数查询学生
      const res = await wx.cloud.callFunction({
        name: 'api',
        data: {
          action: 'getStudentById',
          data: { studentId }
        }
      });

      wx.hideLoading();

      if (res.result && res.result.success && res.result.data) {
        const student = res.result.data;
        this.setData({
          studentInfo: student
        });
      } else {
        wx.showModal({
          title: '未找到',
          content: '未找到该学生，请检查ID是否正确',
          showCancel: false
        });
        this.setData({
          studentInfo: null
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('查询失败:', error);
      wx.showToast({
        title: '查询失败，请重试',
        icon: 'none'
      });
    }
  },

  // 确认绑定
  async confirmBind() {
    if (!this.data.studentInfo) {
      wx.showToast({
        title: '请先查询学生',
        icon: 'none'
      });
      return;
    }

    const student = this.data.studentInfo;
    
    wx.showModal({
      title: '确认绑定',
      content: `确认绑定学生：${student.name}\n年级：${student.grade || '未知'}`,
      success: async (res) => {
        if (res.confirm) {
          this.setData({ binding: true });
          
          try {
            // 保存到本地存储
            wx.setStorageSync('bound_student', {
              id: student._id || student.id,
              name: student.name,
              grade: student.grade,
              school: student.school,
              gender: student.gender,
              age: student.age
            });
            
            wx.showToast({
              title: '绑定成功',
              icon: 'success',
              duration: 2000,
              success: () => {
                setTimeout(() => {
                  // 跳转到作业页面
                  wx.switchTab({
                    url: '/packageParent/pages/homework/index'
                  });
                }, 1500);
              }
            });
          } catch (error) {
            console.error('绑定失败:', error);
            wx.showToast({
              title: '绑定失败',
              icon: 'none'
            });
          } finally {
            this.setData({ binding: false });
          }
        }
      }
    });
  }
});
