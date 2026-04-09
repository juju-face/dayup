const cloudDB = require('../../utils/cloud-db.js');

Page({
  data: {
    // 老师信息
    teacherInfo: {
      name: '张老师',
      school: '北京第一小学',
      avatarText: '张',
      phone: ''
    },
    
    // 老师ID
    teacherId: '',
    
    // 今日数据
    todayData: {
      modificationCount: 0,
      correctionCount: 0
    },
    
    // 动画
    cardAnimation: null,
    
    // 卡通头像选择
    avatarChoices: ['👨‍🏫', '👩‍🏫', '🎓', '📚', '🌟', '💡', '🎨', '🎵', '⚽', '🏀', '🎯', '🎸'],
    showAvatarModal: false,
    selectedAvatar: -1,
    tempAvatar: '',
    
    // 任务相关
    showModificationModal: false,
    showCorrectionModal: false,
    showEditTaskModal: false,
    currentTask: {},
    currentTaskType: '',
    currentTaskIndex: -1,
    
    // 待修改任务（未完成）
    modificationTasks: [],
    
    // 待订正任务
    correctionTasks: []
  },
  
  onLoad() {
    this.initAnimation();
    this.loadTeacherInfo();
  },
  
  onShow() {
    // 每次页面显示时重新加载任务数据
    this.loadTeacherInfo();
    this.loadTaskData();
    // 更新tabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateSelected();
    }
  },
  
  // 加载老师信息
  loadTeacherInfo() {
    try {
      const profile = wx.getStorageSync('profile');
      const teacherInfo = wx.getStorageSync('teacher_info');
      
      if (profile && profile.role === 'teacher') {
        this.setData({
          teacherInfo: {
            name: profile.name || '张老师',
            school: profile.school || '第一小学',
            avatarText: profile.name ? profile.name.charAt(0) : '张',
            phone: profile.parentPhone || ''
          },
          teacherId: teacherInfo?._id || ''
        });
      }
    } catch (error) {
      console.error('加载老师信息失败:', error);
    }
  },
  
  // 加载任务数据（从云端获取）
  async loadTaskData() {
    const teacherId = this.data.teacherId;
    if (!teacherId) {
      console.log('[loadTaskData] 没有老师ID');
      return;
    }
    
    try {
      // 获取今天的日期
      const today = new Date().toISOString().split('T')[0];
      
      // 从云端获取作业数据
      const result = await cloudDB.getHomeworkByTeacher(teacherId, today, today);
      
      if (result.success) {
        // 转换为待修改和待订正任务
        const modificationTasks = [];
        const correctionTasks = [];
        
        result.data.forEach((record) => {
          const task = {
            id: record._id,
            studentName: record.studentName || '未知学生',
            studentClass: record.className || '未分班',
            taskTitle: `${record.subject || '数学'}作业`,
            submitTime: record.createTime ? new Date(record.createTime).toLocaleString() : today,
            description: record.content || '',
            status: record.status || 0
          };
          
          if (record.status === 0) {
            // 未完成 = 待修改
            modificationTasks.push(task);
          } else if (record.status === 2) {
            // 待订正
            correctionTasks.push(task);
          }
        });
        
        this.setData({
          modificationTasks: modificationTasks,
          correctionTasks: correctionTasks,
          'todayData.modificationCount': modificationTasks.length,
          'todayData.correctionCount': correctionTasks.length
        });
        
        console.log('[loadTaskData] 加载成功，待修改:', modificationTasks.length, '待订正:', correctionTasks.length);
      }
    } catch (error) {
      console.error('加载任务数据失败:', error);
    }
  },
  
  // 初始化动画
  initAnimation() {
    this.animation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease-out'
    });
  },
  

  

  
  // 效率工具点击
  toolClick(e) {
    const toolType = e.currentTarget.dataset.type;
    
    // 震动反馈
    wx.vibrateShort();
    
    // 模拟工具功能
    const toolNames = {
      template: '模板录入',
      copy: '复制昨日',
      batch: '批量录入',
      phrase: '快捷短语'
    };
    
    wx.showToast({
      title: `${toolNames[toolType]}功能开发中`,
      icon: 'none'
    });
  },
  

  
  // 系统设置操作
  settingAction(e) {
    const actionType = e.currentTarget.dataset.type;
    
    if (actionType === 'exportAll') {
      wx.showLoading({
        title: '导出中...',
        mask: true
      });
      
      setTimeout(() => {
        wx.hideLoading();
        wx.showToast({
          title: '全部数据已导出',
          icon: 'success'
        });
      }, 2000);
    }
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

  // 编辑老师资料
  editProfile() {
    wx.navigateTo({
      url: './edit-profile/index?teacherInfo=' + JSON.stringify(this.data.teacherInfo)
    });
  },

  // 显示待修改模态框
  showModificationModal() {
    if (this.data.modificationTasks.length === 0) {
      // 显示无作业提示
      wx.showModal({
        title: '提示',
        content: '今日暂无待修改作业',
        showCancel: false
      });
    } else {
      this.setData({
        showModificationModal: true
      });
      // 禁用背景滚动
      wx.setPageStyle({
        style: {
          overflow: 'hidden'
        }
      });
    }
  },

  // 隐藏待修改模态框
  hideModificationModal() {
    this.setData({
      showModificationModal: false
    });
    // 恢复背景滚动
    wx.setPageStyle({
      style: {
        overflow: 'auto'
      }
    });
  },

  // 显示待订正模态框
  showCorrectionModal() {
    if (this.data.correctionTasks.length === 0) {
      // 显示无作业提示
      wx.showModal({
        title: '提示',
        content: '今日暂无待订正作业',
        showCancel: false
      });
    } else {
      this.setData({
        showCorrectionModal: true
      });
      // 禁用背景滚动
      wx.setPageStyle({
        style: {
          overflow: 'hidden'
        }
      });
    }
  },

  // 隐藏待订正模态框
  hideCorrectionModal() {
    this.setData({
      showCorrectionModal: false
    });
    // 恢复背景滚动
    wx.setPageStyle({
      style: {
        overflow: 'auto'
      }
    });
  },



  // 隐藏作业编辑模态框
  hideEditTaskModal() {
    this.setData({
      showEditTaskModal: false,
      currentTask: {},
      currentTaskType: '',
      currentTaskIndex: -1
    });
    // 恢复背景滚动
    wx.setPageStyle({
      style: {
        overflow: 'auto'
      }
    });
  },

  // 更新作业描述
  updateTaskDescription(e) {
    this.setData({
      'currentTask.description': e.detail.value
    });
  },

  // 保存作业修改
  async saveTask() {
    const { currentTask, currentTaskType, currentTaskIndex } = this.data;
    
    // 验证作业内容
    if (!currentTask || !currentTask.description) {
      wx.showToast({
        title: '作业内容不能为空',
        icon: 'none'
      });
      return;
    }
    
    const updatedTask = { ...currentTask };
    
    if (currentTaskType === 'correction') {
      // 验证索引是否有效
      if (currentTaskIndex < 0 || currentTaskIndex >= this.data.correctionTasks.length) {
        wx.showToast({
          title: '作业不存在',
          icon: 'none'
        });
        return;
      }
      
      // 更新云端数据
      try {
        const result = await cloudDB.updateHomework({
          _id: updatedTask.id,
          status: 2,  // 2表示待订正
          remark: updatedTask.description
        });
        
        if (result.success) {
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          });
          // 重新加载数据
          this.loadTaskData();
        } else {
          wx.showToast({
            title: result.message || '保存失败',
            icon: 'none'
          });
        }
      } catch (err) {
        console.error('保存失败:', err);
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        });
      }
    }
    
    this.hideEditTaskModal();
  },

  // 订正作业（移至待订正状态）
  async correctTask(e) {
    const index = e.currentTarget.dataset.index;
    const type = e.currentTarget.dataset.type;
    
    wx.showModal({
      title: '订正作业',
      content: '确定要订正此作业吗？',
      success: async (res) => {
        if (res.confirm) {
          if (type === 'modification') {
            // 验证索引是否有效
            if (index < 0 || index >= this.data.modificationTasks.length) {
              wx.showToast({
                title: '作业不存在',
                icon: 'none'
              });
              return;
            }
            
            const task = this.data.modificationTasks[index];
            
            // 更新云端数据
            try {
              const result = await cloudDB.updateHomework({
                _id: task.id,
                status: 2  // 2表示待订正
              });
              
              if (result.success) {
                wx.showToast({
                  title: '作业已移至待订正',
                  icon: 'success'
                });
                // 重新加载数据
                this.loadTaskData();
              } else {
                wx.showToast({
                  title: result.message || '更新失败',
                  icon: 'none'
                });
              }
            } catch (err) {
              console.error('更新失败:', err);
              wx.showToast({
                title: '更新失败',
                icon: 'none'
              });
            }
          } else if (type === 'correction') {
            // 对于待订正作业，打开编辑弹窗
            let task = this.data.correctionTasks[index];
            
            this.setData({
              currentTask: task,
              currentTaskType: type,
              currentTaskIndex: index,
              showEditTaskModal: true
            });
            // 禁用背景滚动
            wx.setPageStyle({
              style: {
                overflow: 'hidden'
              }
            });
          }
        }
      }
    });
  },

  // 完成作业
  async completeTask(e) {
    const index = e.currentTarget.dataset.index;
    const type = e.currentTarget.dataset.type;
    
    wx.showModal({
      title: '完成作业',
      content: '确定要标记此作业为完成吗？',
      success: async (res) => {
        if (res.confirm) {
          let task;
          
          if (type === 'modification') {
            task = this.data.modificationTasks[index];
          } else if (type === 'correction') {
            task = this.data.correctionTasks[index];
          }
          
          if (!task) {
            wx.showToast({
              title: '作业不存在',
              icon: 'none'
            });
            return;
          }
          
          // 更新云端数据
          try {
            const result = await cloudDB.updateHomework({
              _id: task.id,
              status: 1  // 1表示已完成
            });
            
            if (result.success) {
              wx.showToast({
                title: '作业已完成',
                icon: 'success'
              });
              // 重新加载数据
              this.loadTaskData();
            } else {
              wx.showToast({
                title: result.message || '更新失败',
                icon: 'none'
              });
            }
          } catch (err) {
            console.error('更新失败:', err);
            wx.showToast({
              title: '更新失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 阻止滚动
  preventScroll() {
    // 空函数，用于阻止滚动
  }
});