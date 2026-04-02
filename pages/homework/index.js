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
    teacherId: 'teacher_001', // 当前教师ID，实际应从登录信息获取
    isLoading: false
  },

  onLoad() {
    // 设置当前日期
    const today = new Date().toISOString().split('T')[0];
    this.setData({ currentDate: today });
    
    this.loadRecords();
    this.loadStudents();
  },

  onShow() {
    this.loadRecords();
    this.loadStudents();
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
          studentId: item.students[0] || '',
          studentName: this.getStudentNameById(item.students[0]),
          subject: item.subject,
          content: item.content,
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
        
        this.setData({ records, stats });
      } else {
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

  // 加载学生列表（使用云函数）
  async loadStudents() {
    try {
      const result = await cloudDB.getStudentList(this.data.teacherId);
      
      if (result.success) {
        const students = result.data.map(item => ({
          id: item._id,
          name: item.name,
          _id: item._id
        }));
        this.setData({ students });
      }
    } catch (error) {
      console.error('加载学生列表失败:', error);
      // 使用本地模拟数据作为备用
      this.setData({
        students: [
          { id: 'student_001', name: '张三', _id: 'student_001' },
          { id: 'student_002', name: '李四', _id: 'student_002' },
          { id: 'student_003', name: '王五', _id: 'student_003' }
        ]
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
    this.setData({
      'newRecord.studentId': student.id,
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
        subject: subject,
        content: content,
        students: [studentId], // 指定学生，空数组表示全部
        date: date,
        deadline: '',
        remark: ''
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
  }
});
