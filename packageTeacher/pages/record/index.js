// packageTeacher/pages/record/index.js
const storage = require('../../../utils/storage.js');

Page({
  data: {
    records: [],
    currentDate: '',
    showAddModal: false,
    students: [],
    selectedStudentIndex: -1,  // 选中的学生索引
    newRecord: {
      studentId: '',
      studentName: '',
      subject: '数学',
      content: '',
      date: ''
    },
    statusOptions: ['未完成', '已完成', '待订正'],
    subjectOptions: ['语文', '数学', '英语', '其他'],
    teacherId: ''  // 添加老师ID
  },

  onLoad() {
    // 初始化模拟数据
    storage.initMockData();
    
    // 设置当前日期
    const today = new Date().toISOString().split('T')[0];
    this.setData({ currentDate: today });
    
    this.loadRecords();
    // 不在onLoad中加载学生，在onShow中加载
  },

  onReady() {
    // 页面准备好后，确保能获取到老师ID
    this.loadStudents();
  },

  onShow() {
    console.log('[onShow] 页面显示，检查登录状态');
    
    // 获取老师ID（每次显示页面时都重新获取）
    const teacherInfo = wx.getStorageSync('teacher_info');
    console.log('[onShow] teacherInfo:', teacherInfo);
    
    if (teacherInfo && teacherInfo._id) {
      console.log('[onShow] 设置teacherId:', teacherInfo._id);
      this.setData({ 
        teacherId: teacherInfo._id,
        students: [],  // 先清空旧数据
        selectedStudentIndex: -1
      }, () => {
        // setData回调中加载学生，确保teacherId已设置
        console.log('[onShow] teacherId设置完成，开始加载学生');
        this.loadStudents();
      });
    } else {
      console.error('[onShow] 没有老师信息，跳转到登录页');
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 2000,
        success: () => {
          setTimeout(() => {
            wx.redirectTo({
              url: '/packageTeacher/pages/login/index'
            });
          }, 1500);
        }
      });
    }
    
    this.loadRecords();
    // 更新tabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateSelected();
    }
  },

  // 从云数据库加载作业记录
  async loadRecords() {
    try {
      const teacherId = this.data.teacherId;
      if (!teacherId) {
        console.error('[加载作业] 没有老师ID');
        this.setData({ 
          records: [], 
          stats: { total: 0, completed: 0, pending: 0, needCorrection: 0 } 
        });
        return;
      }
      
      console.log('[加载作业] 从云数据库加载，teacherId:', teacherId, 'date:', this.data.currentDate);
      
      // 调用云函数获取作业
      const res = await wx.cloud.callFunction({
        name: 'api',
        data: {
          action: 'getHomeworkByTeacher',
          data: {
            teacherId: teacherId,
            date: this.data.currentDate
          }
        }
      });
      
      console.log('[加载作业] 云函数返回:', res);
      
      let records = [];
      if (res.result && res.result.success) {
        records = res.result.data || [];
        console.log('[加载作业] 成功获取', records.length, '条记录');
      } else {
        console.error('[加载作业] 获取失败:', res.result?.message);
        // 失败时使用本地数据作为备份
        records = storage.getRecordsByDate(this.data.currentDate);
      }
      
      // 计算统计数据
      const stats = {
        total: records.length,
        completed: records.filter(r => r.status === 1).length,
        pending: records.filter(r => r.status === 0).length,
        needCorrection: records.filter(r => r.status === 2).length
      };
      
      this.setData({ records, stats });
    } catch (error) {
      console.error('[加载作业] 错误:', error);
      // 错误时使用本地数据作为备份
      try {
        const records = storage.getRecordsByDate(this.data.currentDate);
        const stats = {
          total: records.length,
          completed: records.filter(r => r.status === 1).length,
          pending: records.filter(r => r.status === 0).length,
          needCorrection: records.filter(r => r.status === 2).length
        };
        this.setData({ records, stats });
      } catch (e) {
        this.setData({ 
          records: [], 
          stats: { total: 0, completed: 0, pending: 0, needCorrection: 0 } 
        });
      }
    }
  },

  // 加载学生列表
  async loadStudents() {
    // 先从 storage 获取 teacherId（确保是最新的）
    const teacherInfo = wx.getStorageSync('teacher_info');
    const teacherId = teacherInfo ? teacherInfo._id : this.data.teacherId;
    
    console.log('[loadStudents] 开始加载，teacherId:', teacherId);
    console.log('[loadStudents] teacherInfo:', teacherInfo);
    
    if (!teacherId) {
      console.error('[loadStudents] 没有老师ID，无法加载学生');
      this.setData({ 
        students: [],
        selectedStudentIndex: -1
      });
      return;
    }
    
    // 确保 data 中的 teacherId 也是正确的
    if (this.data.teacherId !== teacherId) {
      console.log('[loadStudents] 更新 data.teacherId:', teacherId);
      this.setData({ teacherId });
    }
    
    try {
      console.log('[loadStudents] 调用云函数 getStudentsByTeacher，teacherId:', teacherId);
      
      const res = await wx.cloud.callFunction({
        name: 'api',
        data: {
          action: 'getStudentsByTeacher',
          data: { teacherId }
        }
      });
      
      console.log('[loadStudents] 云函数返回:', JSON.stringify(res));
      
      if (res.result && res.result.success) {
        const students = res.result.data || [];
        console.log('[loadStudents] 成功加载', students.length, '个学生');
        
        this.setData({ 
          students,
          selectedStudentIndex: -1
        });
        
        if (students.length === 0) {
          wx.showToast({
            title: '未找到分配的学生',
            icon: 'none',
            duration: 2000
          });
        }
      } else {
        console.error('[loadStudents] 失败:', res.result?.message);
        this.setData({ 
          students: [],
          selectedStudentIndex: -1
        });
      }
    } catch (err) {
      console.error('[loadStudents] 错误:', err);
      this.setData({ 
        students: [],
        selectedStudentIndex: -1
      });
    }
  },

  // 日期选择
  selectDate(e) {
    const date = e.detail.value;
    this.setData({ currentDate: date });
    this.loadRecords();
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadRecords();
    wx.showToast({
      title: '刷新成功',
      icon: 'success'
    });
    wx.stopPullDownRefresh();
  },

  // 显示添加作业弹窗（兼容旧版本）
  async showAddModal() {
    console.log('[showAddModal] 打开弹窗前检查学生列表:', {
      students: this.data.students,
      count: this.data.students.length,
      teacherId: this.data.teacherId
    });
    
    // 如果学生列表为空，先强制重新加载
    if (!this.data.students || this.data.students.length === 0) {
      wx.showLoading({ title: '加载学生...' });
      
      await this.loadStudents();
      
      wx.hideLoading();
      
      // 加载后再次检查
      if (!this.data.students || this.data.students.length === 0) {
        wx.showToast({
          title: '没有分配的学生',
          icon: 'none',
          duration: 2000
        });
        return;
      }
    }
    
    // 显示弹窗（不再跳转）
    this.setData({ 
      showAddModal: true,
      newRecord: {
        studentId: '',
        studentName: '',
        subject: '数学',
        content: '',
        date: this.data.currentDate
      }
    });
  },

  // 隐藏添加作业弹窗
  hideAddModal() {
    this.setData({ 
      showAddModal: false,
      selectedStudentIndex: -1
    });
  },

  // 选择学生
  selectStudent(e) {
    const index = e.detail.value;
    
    // 添加索引有效性检查
    if (index < 0 || index >= this.data.students.length) {
      console.error('选择学生失败: 索引超出范围', { 
        index, 
        studentsLength: this.data.students.length 
      });
      return;
    }
    
    const student = this.data.students[index];
    
    // 添加空值检查
    if (!student) {
      console.error('选择学生失败: 学生不存在', { index, students: this.data.students });
      wx.showToast({
        title: '选择学生失败',
        icon: 'error'
      });
      return;
    }
    
    console.log('[选择学生] 选中:', student);
    
    this.setData({
      selectedStudentIndex: index,
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

  // 确认添加作业
  async onConfirmAdd() {
    const { studentId, studentName, subject, content, date } = this.data.newRecord;
    const teacherId = this.data.teacherId;
    
    if (!studentId || !subject || !content) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }
    
    if (!teacherId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    try {
      // 先保存到云端
      const res = await wx.cloud.callFunction({
        name: 'api',
        data: {
          action: 'addHomeworkRecord',
          data: {
            studentId,
            studentName,
            teacherId,
            subject,
            content,
            date
          }
        }
      });
      
      if (res.result && res.result.success) {
        console.log('[发布作业] 云端保存成功:', res.result.data);
        
        // 再保存到本地作为备份
        storage.addRecord(studentId, studentName, subject, content, date);
        
        // 更新同步时间
        wx.setStorageSync('lastUpdateTime', Date.now());
        
        // 震动反馈
        wx.vibrateShort({
          type: 'medium'
        });
        
        this.setData({ showAddModal: false });
        this.loadRecords();
        
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        });
      } else {
        console.error('[发布作业] 云端保存失败:', res.result?.message);
        wx.showToast({
          title: '发布失败:' + (res.result?.message || '未知错误'),
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('[发布作业] 错误:', error);
      wx.showToast({
        title: '发布失败，请重试',
        icon: 'none'
      });
    }
  },

  // 输入作业内容
  inputContent(e) {
    this.setData({
      'newRecord.content': e.detail.value
    });
  },

  // 确认添加作业（兼容旧代码）
  async confirmAdd() {
    const { studentId, studentName, subject, content, date } = this.data.newRecord;
    const teacherId = this.data.teacherId;
    
    if (!studentId || !subject || !content) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }
    
    if (!teacherId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    try {
      // 先保存到云端
      const res = await wx.cloud.callFunction({
        name: 'api',
        data: {
          action: 'addHomeworkRecord',
          data: {
            studentId,
            studentName,
            teacherId,
            subject,
            content,
            date
          }
        }
      });
      
      if (res.result && res.result.success) {
        console.log('[发布作业] 云端保存成功:', res.result.data);
        
        // 再保存到本地作为备份
        storage.addRecord(studentId, studentName, subject, content, date);
        
        // 更新同步时间
        wx.setStorageSync('lastUpdateTime', Date.now());
        
        // 震动反馈
        wx.vibrateShort({
          type: 'medium'
        });
        
        this.setData({ showAddModal: false });
        this.loadRecords();
        
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        });
      } else {
        console.error('[发布作业] 云端保存失败:', res.result?.message);
        wx.showToast({
          title: '发布失败:' + (res.result?.message || '未知错误'),
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('[发布作业] 错误:', error);
      wx.showToast({
        title: '发布失败，请重试',
        icon: 'none'
      });
    }
  },

  // 更新作业状态
  updateStatus(e) {
    const id = e.currentTarget.dataset.id;
    const status = e.detail.value;
    
    storage.updateRecord(id, status, '');
    this.loadRecords();
    
    // 震动反馈
    wx.vibrateShort({
      type: 'medium'
    });
  },

  // 删除作业
  deleteRecord(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '删除后将无法恢复，是否继续？',
      success: (res) => {
        if (res.confirm) {
          storage.deleteRecord(id);
          this.loadRecords();
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
  }
});
