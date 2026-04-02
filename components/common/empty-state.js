// empty-state.js
Component({
  properties: {
    text: {
      type: String,
      value: '暂无数据'
    },
    btnText: {
      type: String,
      value: ''
    }
  },
  methods: {
    handleBtnClick() {
      // 触发按钮点击事件
      this.triggerEvent('btnClick');
    }
  }
})