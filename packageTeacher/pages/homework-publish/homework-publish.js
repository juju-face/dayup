// packageTeacher/pages/homework-publish/homework-publish.js
// 重构后的作业发布页面 - 支持批量发布、模板、草稿

const homeworkService = require('../../../utils/homework-service.js');

Page({
  data: {
    // 学生列表
    students: [],
    selectedStudents: [], // 选中的学生ID列表
    selectedStudentIndex: -1, // 单个模式下选中的学生索引
    selectedStudentName: '', // 单个模式下选中的学生姓名
    
    // 表单数据
    subject: '数学',
    content: '',
    date: '',
    remark: '',
    
    // 模板相关
    templates: [],
    showTemplatePicker: false,
    
    // UI状态
    submitting: false,
    showBatchMode: false,
    
    // 老师信息
    teacherId: '',
    teacherName: '',
    
    // 草稿提示
    showDraftTip: false,
    draft: null
  },

  onLoad() {
    this.initPage();
  },

  onShow() {
    // 检查是否有草稿
    this.checkDraft();
    
    // 加载模板
    this.loadTemplates();
  },

  // 初始化页面
  async initPage() {
    // 获取老师信息
    const teacherInfo = wx.getStorageSync('teacher_info');
    console.log('[initPage] teacherInfo:', JSON.stringify(teacherInfo));
    
    if (!teacherInfo || !teacherInfo._id) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        showCancel: false,
        success: () => {
          wx.redirectTo({
            url: '/packageTeacher/pages/login/index'
          });
        }
      });
      return;
    }

    // 设置日期为今天
    const today = new Date().toISOString().split('T')[0];
    
    this.setData({
      teacherId: teacherInfo._id,
      teacherName: teacherInfo.name || '',
      date: today
    });

    console.log('[initPage] 设置 teacherId:', teacherInfo._id, 'name:', teacherInfo.name);

    // 加载学生列表
    await this.loadStudents();
  },

  // 检查草稿
  checkDraft() {
    const draft = homeworkService.getDraft();
    if (draft) {
      const now = new Date();
      const saveTime = new Date(draft.saveTime);
      const minutesDiff = Math.floor((now - saveTime) / 1000 / 60);
      
      if (minutesDiff < 60) { // 1小时内的草稿
        this.setData({
          showDraftTip: true,
          draft: draft
        });
      }
    }
  },

  // 加载草稿
  loadDraft() {
    const draft = homeworkService.getDraft();
    if (draft) {
      this.setData({
        subject: draft.subject || '数学',
        content: draft.content || '',
        remark: draft.remark || '',
        showDraftTip: false
      });
      
      if (draft.studentIds && draft.studentIds.length > 0) {
        this.setData({
          selectedStudents: draft.studentIds,
          showBatchMode: true
        });
      }
      
      wx.showToast({
        title: '草稿已恢复',
        icon: 'success'
      });
    }
  },

  // 放弃草稿
  discardDraft() {
    homeworkService.clearDraft();
    this.setData({
      showDraftTip: false,
      draft: null
    });
  },

  // 自动保存草稿
  autoSaveDraft() {
    const { subject, content, remark, selectedStudents, showBatchMode } = this.data;
    
    // 如果有内容，保存草稿
    if (content.trim()) {
      const draft = {
        subject,
        content,
        remark,
        studentIds: showBatchMode ? selectedStudents : [],
        saveTime: new Date().toISOString()
      };
      
      homeworkService.saveDraft(draft);
    }
  },

  // 加载学生列表
  async loadStudents() {
    try {
      const teacherId = this.data.teacherId;
      console.log('[loadStudents] 开始加载, teacherId:', teacherId, 'type:', typeof teacherId);
      
      const res = await wx.cloud.callFunction({
        name: 'api',
        data: {
          action: 'getStudentsByTeacher',
          data: { teacherId: teacherId }
        }
      });

      console.log('[loadStudents] 云函数返回:', JSON.stringify(res));

      if (res.result && res.result.success) {
        const students = res.result.data || [];
        console.log('[loadStudents] 获取到学生数量:', students.length);
        if (students.length > 0) {
          console.log('[loadStudents] 前3个学生:', JSON.stringify(students.slice(0, 3)));
        }
        this.setData({ students });
      } else {
        console.warn('[loadStudents] 查询失败:', res.result ? res.result.message : '未知错误');
        wx.showToast({
          title: '加载学生失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('[loadStudents] 异常:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // 加载模板列表
  loadTemplates() {
    const templates = homeworkService.getTemplates();
    this.setData({ templates });
  },

  // 切换批量模式
  toggleBatchMode() {
    this.setData({
      showBatchMode: !this.data.showBatchMode
    });
  },

  // 选择学生（批量模式）
  onSelectStudent(e) {
    const studentId = e.currentTarget.dataset.studentId;
    const selectedStudents = this.data.selectedStudents;
    
    const index = selectedStudents.indexOf(studentId);
    if (index > -1) {
      selectedStudents.splice(index, 1);
    } else {
      selectedStudents.push(studentId);
    }
    
    this.setData({ selectedStudents });
    this.autoSaveDraft();
  },

  // 选择学生（单选模式）- picker bindchange 返回的是索引值
  onSelectSingleStudent(e) {
    const index = e.detail.value; // picker 返回选中的索引
    const students = this.data.students;
    if (index >= 0 && index < students.length) {
      const student = students[index];
      const studentId = student._id || student.id;
      this.setData({
        selectedStudents: [studentId],
        selectedStudentIndex: index,
        selectedStudentName: student.name
      });
      console.log('[onSelectSingleStudent] 选中学生:', student.name, 'id:', studentId, 'index:', index);
    }
    this.autoSaveDraft();
  },

  // 选择科目
  onSelectSubject(e) {
    const subject = e.currentTarget.dataset.subject;
    this.setData({ subject });
    this.autoSaveDraft();
  },

  // 输入内容
  onContentInput(e) {
    this.setData({ content: e.detail.value });
    this.autoSaveDraft();
  },

  // 输入备注
  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
    this.autoSaveDraft();
  },

  // 选择日期
  onDateChange(e) {
    this.setData({ date: e.detail.value });
    this.autoSaveDraft();
  },

  // 选择模板
  onSelectTemplate(e) {
    const templateId = e.currentTarget.dataset.templateId;
    const templates = this.data.templates;
    const template = templates.find(t => t.id === templateId);
    
    if (template) {
      this.setData({
        subject: template.subject,
        content: template.content,
        showTemplatePicker: false
      });
      
      wx.showToast({
        title: '模板已应用',
        icon: 'success'
      });
    }
  },

  // 显示模板选择器
  showTemplatePicker() {
    this.setData({ showTemplatePicker: true });
  },

  // 隐藏模板选择器
  hideTemplatePicker() {
    this.setData({ showTemplatePicker: false });
  },

  // 保存为模板
  onSaveAsTemplate() {
    const { subject, content } = this.data;
    
    if (!content.trim()) {
      wx.showToast({
        title: '请输入作业内容',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '保存模板',
      content: '将当前作业保存为模板，方便以后使用',
      editable: true,
      placeholderText: '请输入模板名称',
      success: (res) => {
        if (res.confirm && res.content) {
          const template = {
            name: res.content,
            subject,
            content
          };
          
          if (homeworkService.saveTemplate(template)) {
            this.loadTemplates();
            wx.showToast({
              title: '保存成功',
              icon: 'success'
            });
          } else {
            wx.showToast({
              title: '保存失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 发布作业
  async publishHomework() {
    const { showBatchMode, selectedStudents, students, subject, content, date, remark, teacherId, teacherName } = this.data;
    
    // 表单验证
    if (!this.validateForm()) {
      return;
    }
    
    this.setData({ submitting: true });
    
    try {
      let result;
      
      if (showBatchMode) {
        // 批量发布
        const homeworkList = selectedStudents.map(studentId => {
          const student = students.find(s => (s._id || s.id) === studentId);
          return {
            studentId: studentId,
            studentName: student ? student.name : '未知',
            teacherId: teacherId,
            subject: subject,
            content: content,
            date: date,
            remark: remark
          };
        });
        
        result = await homeworkService.batchAddHomework(homeworkList);
      } else {
        // 单个发布
        const studentId = selectedStudents[0];
        const student = students.find(s => (s._id || s.id) === studentId);
        
        result = await homeworkService.addHomework({
          studentId: studentId,
          studentName: student ? student.name : '未知',
          teacherId: teacherId,
          subject: subject,
          content: content,
          date: date,
          remark: remark
        });
      }
      
      if (result.success) {
        wx.showToast({
          title: result.message,
          icon: 'success',
          duration: 2000,
          success: () => {
            setTimeout(() => {
              wx.navigateBack();
            }, 1500);
          }
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('发布失败:', error);
      wx.showModal({
        title: '发布失败',
        content: error.message,
        showCancel: false
      });
    } finally {
      this.setData({ submitting: false });
    }
  },

  // 表单验证
  validateForm() {
    const { showBatchMode, selectedStudents, subject, content, date } = this.data;
    
    if (selectedStudents.length === 0) {
      wx.showToast({
        title: showBatchMode ? '请选择至少一个学生' : '请选择一个学生',
        icon: 'none'
      });
      return false;
    }
    
    if (!subject) {
      wx.showToast({
        title: '请选择科目',
        icon: 'none'
      });
      return false;
    }
    
    if (!content.trim()) {
      wx.showToast({
        title: '请输入作业内容',
        icon: 'none'
      });
      return false;
    }
    
    if (!date) {
      wx.showToast({
        title: '请选择日期',
        icon: 'none'
      });
      return false;
    }
    
    return true;
  }
});
