const storage = require('../../utils/storage.js');

Page({
  data: {
    // 老师信息
    teacherInfo: {
      name: '张老师',
      school: '北京第一小学',
      avatarText: '张',
      phone: ''
    },
    

    
    // 今日数据
    todayData: {
      modificationCount: 5,
      correctionCount: 3
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
    
    // 待修改任务
    modificationTasks: [
      {
        studentName: '小明',
        studentClass: '一年级一班',
        taskTitle: '数学作业',
        submitTime: '2026-03-31 10:30',
        description: '完成课本第10页的习题1-5题'
      },
      {
        studentName: '小红',
        studentClass: '一年级二班',
        taskTitle: '语文作业',
        submitTime: '2026-03-31 09:15',
        description: '抄写生字表第5课的词语'
      },
      {
        studentName: '小李',
        studentClass: '二年级一班',
        taskTitle: '英语作业',
        submitTime: '2026-03-31 11:20',
        description: '完成练习册第8页的对话练习'
      },
      {
        studentName: '小张',
        studentClass: '二年级二班',
        taskTitle: '数学作业',
        submitTime: '2026-03-31 10:45',
        description: '完成课本第12页的应用题'
      },
      {
        studentName: '小王',
        studentClass: '三年级一班',
        taskTitle: '科学作业',
        submitTime: '2026-03-31 14:30',
        description: '完成实验报告'
      }
    ],
    
    // 待订正任务
    correctionTasks: [
      {
        studentName: '小刚',
        studentClass: '一年级一班',
        taskTitle: '数学作业',
        submitTime: '2026-03-30 16:45',
        description: '完成课本第8页的习题，需订正第3题'
      },
      {
        studentName: '小丽',
        studentClass: '一年级二班',
        taskTitle: '语文作业',
        submitTime: '2026-03-30 15:30',
        description: '抄写生字表，需订正错别字'
      },
      {
        studentName: '小强',
        studentClass: '二年级一班',
        taskTitle: '英语作业',
        submitTime: '2026-03-30 17:15',
        description: '完成练习册第6页，需订正语法错误'
      }
    ]
  },
  
  onLoad() {
    this.initAnimation();
    this.loadTaskData();
    this.loadTeacherInfo();
  },
  
  onShow() {
    // 每次页面显示时重新加载任务数据
    this.loadTaskData();
    this.loadTeacherInfo();
    // 更新tabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateSelected();
    }
  },
  
  // 加载老师信息
  loadTeacherInfo() {
    try {
      const profile = wx.getStorageSync('profile');
      if (profile && profile.role === 'teacher') {
        this.setData({
          teacherInfo: {
            name: profile.name || '张老师',
            school: profile.school || '北京第一小学',
            avatarText: profile.name ? profile.name.charAt(0) : '张',
            phone: profile.parentPhone || ''
          }
        });
      }
    } catch (error) {
      console.error('加载老师信息失败:', error);
    }
  },
  
  // 加载任务数据
  loadTaskData() {
    // 初始化模拟数据
    storage.initMockData();
    
    // 获取今天的日期
    const today = new Date().toISOString().split('T')[0];
    
    // 从存储中获取今日作业
    const records = storage.getRecordsByDate(today);
    
    // 转换为待修改和待订正任务
    const modificationTasks = [];
    const correctionTasks = [];
    
    records.forEach((record, index) => {
      if (record.status === 0) { // 未完成，待修改
        modificationTasks.push({
          id: record.id,
          studentName: record.studentName,
          studentClass: `三年级一班`, // 从学生信息中获取班级
          taskTitle: `${record.subject}作业`,
          submitTime: `${today} 10:00`, // 模拟提交时间
          description: record.content
        });
      } else if (record.status === 2) { // 待订正
        correctionTasks.push({
          id: record.id,
          studentName: record.studentName,
          studentClass: `三年级一班`, // 从学生信息中获取班级
          taskTitle: `${record.subject}作业`,
          submitTime: `${today} 09:00`, // 模拟提交时间
          description: record.content
        });
      }
    });
    
    // 更新数据
    this.setData({
      modificationTasks: modificationTasks,
      correctionTasks: correctionTasks,
      'todayData.modificationCount': modificationTasks.length,
      'todayData.correctionCount': correctionTasks.length
    });
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
  saveTask() {
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
      
      // 更新存储中的作业内容
      storage.updateRecord(updatedTask.id, 2, updatedTask.description); // 2表示待订正
      
      // 直接更新待订正列表
      const updatedTasks = [...this.data.correctionTasks];
      updatedTasks[currentTaskIndex] = updatedTask;
      this.setData({
        correctionTasks: updatedTasks
      });
      
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
    }
    
    this.hideEditTaskModal();
  },

  // 订正作业
  correctTask(e) {
    const index = e.currentTarget.dataset.index;
    const type = e.currentTarget.dataset.type;
    
    wx.showModal({
      title: '订正作业',
      content: '确定要订正此作业吗？',
      success: (res) => {
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
            
            // 从待修改列表移除
            const updatedModificationTasks = [...this.data.modificationTasks];
            const task = updatedModificationTasks.splice(index, 1)[0];
            
            // 添加到待订正列表
            const updatedCorrectionTasks = [...this.data.correctionTasks];
            updatedCorrectionTasks.push(task);
            
            // 更新存储中的作业状态
            storage.updateRecord(task.id, 2, ''); // 2表示待订正
            
            // 更新数据
            this.setData({
              modificationTasks: updatedModificationTasks,
              correctionTasks: updatedCorrectionTasks,
              'todayData.modificationCount': updatedModificationTasks.length,
              'todayData.correctionCount': updatedCorrectionTasks.length
            });
            
            wx.showToast({
              title: '作业已移至待订正',
              icon: 'success'
            });
          } else if (type === 'correction') {
            // 对于待订正作业，保持原有的编辑功能
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
  completeTask(e) {
    const index = e.currentTarget.dataset.index;
    const type = e.currentTarget.dataset.type;
    
    wx.showModal({
      title: '完成作业',
      content: '确定要标记此作业为完成吗？',
      success: (res) => {
        if (res.confirm) {
          if (type === 'modification') {
            const updatedTasks = [...this.data.modificationTasks];
            const task = updatedTasks.splice(index, 1)[0];
            
            // 更新存储中的作业状态
            storage.updateRecord(task.id, 1, ''); // 1表示已完成
            
            this.setData({
              modificationTasks: updatedTasks,
              'todayData.modificationCount': updatedTasks.length
            });
          } else if (type === 'correction') {
            const updatedTasks = [...this.data.correctionTasks];
            const task = updatedTasks.splice(index, 1)[0];
            
            // 更新存储中的作业状态
            storage.updateRecord(task.id, 1, ''); // 1表示已完成
            
            this.setData({
              correctionTasks: updatedTasks,
              'todayData.correctionCount': updatedTasks.length
            });
          }
          
          wx.showToast({
            title: '作业已完成',
            icon: 'success'
          });
        }
      }
    });
  },

  // 阻止滚动
  preventScroll() {
    // 空函数，用于阻止滚动
  }
});