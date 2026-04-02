// mockData.js - 模拟数据

// 托管时段列表
export const timeSlots = [
  {
    id: '1',
    name: '上午托管',
    timeRange: '08:00-12:00',
    price: 50,
    maxKids: 20,
    currentKids: 15
  },
  {
    id: '2',
    name: '下午托管',
    timeRange: '14:00-18:00',
    price: 50,
    maxKids: 20,
    currentKids: 12
  },
  {
    id: '3',
    name: '全天托管',
    timeRange: '08:00-18:00',
    price: 90,
    maxKids: 20,
    currentKids: 18
  },
  {
    id: '4',
    name: '晚托班',
    timeRange: '18:00-20:00',
    price: 30,
    maxKids: 15,
    currentKids: 8
  }
]

// 孩子信息模板
export const children = [
  {
    id: '1',
    name: '小明',
    age: 6,
    school: '阳光幼儿园',
    parentPhone: '13800138000',
    allergies: '无'
  },
  {
    id: '2',
    name: '小红',
    age: 5,
    school: '希望幼儿园',
    parentPhone: '13900139000',
    allergies: '海鲜'
  },
  {
    id: '3',
    name: '小华',
    age: 7,
    school: '实验小学',
    parentPhone: '13700137000',
    allergies: '花生'
  },
  {
    id: '4',
    name: '小丽',
    age: 6,
    school: '阳光幼儿园',
    parentPhone: '13600136000',
    allergies: '无'
  }
]

// 报名记录模板
export const orders = [
  {
    id: '1',
    childId: '1',
    timeSlotId: '1',
    status: '已支付',
    createTime: '2024-01-01 10:00:00'
  },
  {
    id: '2',
    childId: '2',
    timeSlotId: '3',
    status: '待支付',
    createTime: '2024-01-01 11:00:00'
  },
  {
    id: '3',
    childId: '3',
    timeSlotId: '2',
    status: '已支付',
    createTime: '2024-01-01 14:00:00'
  },
  {
    id: '4',
    childId: '4',
    timeSlotId: '4',
    status: '已支付',
    createTime: '2024-01-01 16:00:00'
  }
]

// 签到记录模板
export const signRecords = [
  {
    id: '1',
    childId: '1',
    timeSlotId: '1',
    checkInTime: '2024-01-01 08:30:00',
    checkType: 'in'
  },
  {
    id: '2',
    childId: '1',
    timeSlotId: '1',
    checkInTime: '2024-01-01 11:45:00',
    checkType: 'out'
  },
  {
    id: '3',
    childId: '3',
    timeSlotId: '2',
    checkInTime: '2024-01-01 14:15:00',
    checkType: 'in'
  },
  {
    id: '4',
    childId: '3',
    timeSlotId: '2',
    checkInTime: '2024-01-01 17:50:00',
    checkType: 'out'
  }
]

// 导出所有模拟数据
export default {
  timeSlots,
  children,
  orders,
  signRecords
}