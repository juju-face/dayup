// pages/homework/index.js
const cloudDB = require('../../utils/cloud-db.js');

Page({
  data: {
    records: [],
    currentDate: '',
    showAddModal: false,
    students: [],
    newRecord: {
      studentId: '',
      studentName: '',
      subject: '数学',
      content: '',
      date: ''
    },
    statusOptions: ['未完成', '已完成', '待订正'],
    subjectOptions: ['语文', '数学', '英语', '其他'],
    teacherId: '', // 从登录信息获取
    isLoading: false
  },

  onLoad() {
    // 检查登录状态
    const teacherInfo = wx.getStorageSync('teacher_info');
    if (!teacherInfo || !teacherInfo._id) {
      // 如果没有登录信息，提示但不跳转（调试模式）
      console.log('[onLoad] 未登录，请先切换角色');
      wx.showToast({
        title: '请先切换角色登录',
        icon: 'none'
      });
      return;
    }
    
    // 设置当前日期
    const today = new Date().toISOString().split('T')[0];
    this.setData({ 
      currentDate: today,
      teacherId: teacherInfo._id
    });
    
    console.log('[onLoad] 老师信息:', teacherInfo);
    
    this.loadRecords();
    this.loadStudents();
  },

  onShow() {
    // 每次显示页面时重新获取 teacherId
    const teacherInfo = wx.getStorageSync('teacher_info');
    if (teacherInfo && teacherInfo._id) {
      if (this.data.teacherId !== teacherInfo._id) {
        this.setData({ teacherId: teacherInfo._id });
        this.loadStudents();
        this.loadRecords();
      }
    }
    
    // 更新tabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateSelected();
    }
  },

  // 加载作业记录（使用云函数）
  async loadRecords() {
    this.setData({ isLoading: true });
    
    try {
      const result = await cloudDB.getHomeworkByTeacher(
        this.data.teacherId,
        this.data.currentDate,
        this.data.currentDate
      );
      
      if (result.success) {
        // 转换数据格式
        const records = result.data.map(item => ({
          id: item._id,
          studentId: item.studentId || (item.students ? item.students[0] : ''),
          studentName: item.studentName || this.getStudentNameById(item.studentId || (item.students ? item.students[0] : '')),
          subject: item.subject || '数学',
          content: item.content || '',
          status: item.status || 0,
          date: item.date
        }));
        
        // 计算统计数据
        const stats = {
          total: records.length,
          completed: records.filter(r => r.status === 1).length,
          pending: records.filter(r => r.status === 0).length,
          needCorrection: records.filter(r => r.status === 2).length
        };
        
        console.log('[loadRecords] 加载成功，记录数:', records.length);
        this.setData({ records, stats });
      } else {
        console.error('[loadRecords] 加载失败:', result.message);
        wx.showToast({
          title: result.message || '加载失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('加载作业记录失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 根据学生ID获取姓名
  getStudentNameById(studentId) {
    const student = this.data.students.find(s => s._id === studentId || s.id === studentId);
    return student ? student.name : '全体学生';
  },

  // 加载学生列表（使用云函数 getStudentsByTeacher）
  async loadStudents() {
    try {
      const teacherId = this.data.teacherId;
      
      console.log('[loadStudents] 开始加载, teacherId:', teacherId);
      
      if (!teacherId) {
        console.error('[loadStudents] 没有老师ID');
        this.setData({ students: [] });
        return;
      }
      
      const res = await wx.cloud.callFunction({
        name: 'api',
        data: {
          action: 'getStudentsByTeacher',
          data: { teacherId }
        }
      });
      
      console.log('[loadStudents] 云函数返回:', res);
      
      if (res.result && res.result.success) {
        const students = (res.result.data || []).map(item => ({
          id: item._id,
          name: item.name,
          _id: item._id
        }));
        console.log('[loadStudents] 加载成功，学生数量:', students.length);
        this.setData({ students });
      } else {
        console.error('[loadStudents] 加载失败:', res.result?.message);
        this.setData({ students: [] });
      }
    } catch (error) {
      console.error('[loadStudents] 加载失败:', error);
      this.setData({ students: [] });
    }
  },

  // 日期选择
  selectDate(e) {
    const date = e.detail.value;
    this.setData({ currentDate: date });
    this.loadRecords();
  },

  // 下拉刷新
  async onPullDownRefresh() {
    await this.loadRecords();
    wx.showToast({
      title: '刷新成功',
      icon: 'success'
    });
    wx.stopPullDownRefresh();
  },

  // 显示添加作业弹窗
  showAddModal() {
    const today = new Date().toISOString().split('T')[0];
    this.setData({
      showAddModal: true,
      newRecord: {
        studentId: '',
        studentName: '',
        subject: '数学',
        content: '',
        date: today
      }
    });
  },

  // 隐藏添加作业弹窗
  hideAddModal() {
    this.setData({ showAddModal: false });
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  },

  // 选择学生
  selectStudent(e) {
    const index = e.detail.value;
    const student = this.data.students[index];
    
    if (!student) {
      wx.showToast({
        title: '请先添加学生',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      'newRecord.studentId': student._id || student.id,
      'newRecord.studentName': student.name
    });
  },

  // 选择科目
  selectSubject(e) {
    const index = e.detail.value;
    this.setData({
      'newRecord.subject': this.data.subjectOptions[index]
    });
  },

  // 选择科目标签
  selectSubjectTag(e) {
    const subject = e.currentTarget.dataset.subject;
    this.setData({
      'newRecord.subject': subject
    });
  },

  // 输入作业内容
  inputContent(e) {
    this.setData({
      'newRecord.content': e.detail.value
    });
  },

  // 确认添加作业（使用云函数）
  async onConfirmAdd() {
    const { studentId, studentName, subject, content, date } = this.data.newRecord;
    
    if (!studentId || !subject || !content) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '添加中...' });

    try {
      const result = await cloudDB.addHomework({
        teacherId: this.data.teacherId,
        studentId: studentId,
        studentName: studentName || '未知学生',
        subject: subject,
        content: content,
        date: date
      });

      wx.hideLoading();

      if (result.success) {
        this.setData({ showAddModal: false });
        this.loadRecords();
        
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: result.message || '添加失败',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('添加作业失败:', error);
      wx.showToast({
        title: '添加失败',
        icon: 'none'
      });
    }
  },

  // 更新作业状态（使用云函数）
  async updateStatus(e) {
    const id = e.currentTarget.dataset.id;
    const status = parseInt(e.detail.value);
    
    wx.showLoading({ title: '更新中...' });

    try {
      const result = await cloudDB.updateHomework({
        _id: id,
        status: status
      });

      wx.hideLoading();

      if (result.success) {
        this.loadRecords();
        
        // 震动反馈
        wx.vibrateShort({
          type: 'medium'
        });
      } else {
        wx.showToast({
          title: result.message || '更新失败',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('更新状态失败:', error);
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      });
    }
  },

  // 删除作业（使用云函数）
  async deleteRecord(e) {
    const id = e.currentTarget.dataset.id;

    wx.showModal({
      title: '确认删除',
      content: '删除后将无法恢复，是否继续？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });

          try {
            const result = await cloudDB.deleteHomework(id);

            wx.hideLoading();

            if (result.success) {
              this.loadRecords();
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
            } else {
              wx.showToast({
                title: result.message || '删除失败',
                icon: 'none'
              });
            }
          } catch (error) {
            wx.hideLoading();
            console.error('删除作业失败:', error);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 切换角色（调试用）
  switchRole() {
    wx.showActionSheet({
      itemList: ['切换到家长端', '切换到老师端'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 切换到家长端 - 输入家长手机号验证
          this.quickLoginParent();
        } else {
          // 切换到老师端 - 输入老师手机号验证
          this.quickLoginTeacher();
        }
      }
    });
  },

  // 快速登录老师（调试用）
  quickLoginTeacher() {
    wx.showModal({
      title: '切换到老师端',
      editable: true,
      placeholderText: '请输入老师手机号',
      success: async (res) => {
        if (res.confirm && res.content) {
          const phone = res.content.trim();
          if (!phone || phone.length !== 11) {
            wx.showToast({ title: '请输入11位手机号', icon: 'none' });
            return;
          }
          
          wx.showLoading({ title: '验证中...' });
          
          try {
            const result = await wx.cloud.callFunction({
              name: 'api',
              data: {
                action: 'getTeacherByPhone',
                data: { phone }
              }
            });
            
            wx.hideLoading();
            
            if (result.result && result.result.success && result.result.data) {
              // 老师存在，保存登录信息
              const teacherInfo = result.result.data;
              wx.setStorageSync('teacher_info', teacherInfo);
              wx.setStorageSync('profile', {
                role: 'teacher',
                name: teacherInfo.name,
                parentPhone: phone
              });
              
              const app = getApp();
              app.setRole('teacher');
              app.globalData.teacherInfo = teacherInfo;
              
              wx.showToast({ title: '切换成功', icon: 'success' });
              
              // 延迟跳转，确保 storage 写入完成
              setTimeout(() => {
                wx.reLaunch({
                  url: '/pages/homework/index'
                });
              }, 800);
            } else {
              wx.showToast({ title: '该手机号未注册为老师', icon: 'none' });
            }
          } catch (err) {
            wx.hideLoading();
            console.error('验证失败:', err);
            wx.showToast({ title: '验证失败', icon: 'none' });
          }
        }
      }
    });
  },

  // 快速登录家长（调试用）
  quickLoginParent() {
    wx.showModal({
      title: '切换到家长端',
      editable: true,
      placeholderText: '请输入家长手机号',
      success: async (res) => {
        if (res.confirm && res.content) {
          const phone = res.content.trim();
          if (!phone || phone.length !== 11) {
            wx.showToast({ title: '请输入11位手机号', icon: 'none' });
            return;
          }
          
          wx.showLoading({ title: '验证中...' });
          
          try {
            const result = await wx.cloud.callFunction({
              name: 'api',
              data: {
                action: 'getStudentsByParentPhone',
                data: { parentPhone: phone }
              }
            });
            
            wx.hideLoading();
            
            if (result.result && result.result.success && result.result.data && result.result.data.length > 0) {
              const children = result.result.data;
              wx.setStorageSync('parentProfile', {
                role: 'parent',
                phone: phone
              });
              wx.setStorageSync('userInfo', {
                phone: phone,
                role: 'parent',
                loginTime: new Date().toISOString()
              });
              wx.setStorageSync('childrenList', children.map(c => ({
                ...c,
                id: c._id || c.id
              })));
              
              if (children.length > 0) {
                const firstChild = children[0];
                wx.setStorageSync('boundStudent', {
                  ...firstChild,
                  id: firstChild._id || firstChild.id
                });
              }
              
              const app = getApp();
              app.setRole('parent');
              
              wx.showToast({ title: '切换成功', icon: 'success' });
              
              setTimeout(() => {
                wx.reLaunch({
                  url: '/pages/parent/homework/index'
                });
              }, 800);
            } else {
              wx.showToast({ title: '该手机号未登记为家长', icon: 'none' });
            }
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: '验证失败', icon: 'none' });
          }
        }
      }
    });
  },

  // 清除老师端数据
  clearTeacherData() {
    const app = getApp();
    app.setRole('parent');
    // 保留登录信息，只是切换角色
    console.log('已切换到家长端');
  }
});
