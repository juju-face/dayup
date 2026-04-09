const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 简单的密码加密（实际项目中应该使用更安全的加密方式）
function hashPassword(password) {
  const crypto = require('crypto')
  return crypto.createHash('sha256').update(password).digest('hex')
}

exports.main = async (event, context) => {
  const { action, data } = event

  try {
    switch (action) {
      case 'initAdmin':
        return await initAdmin()
      case 'login':
        return await login(data)
      case 'createUser':
        return await createUser(data)
      case 'updatePassword':
        return await updatePassword(data)
      default:
        return {
          success: false,
          message: '未知操作'
        }
    }
  } catch (err) {
    console.error('操作失败:', err)
    return {
      success: false,
      message: err.message
    }
  }
}

// 初始化管理员账号
async function initAdmin() {
  try {
    // 检查是否已存在管理员
    const existingAdmin = await db.collection('admin_users').where({
      role: 'admin'
    }).get()

    if (existingAdmin.data.length > 0) {
      return {
        success: false,
        message: '管理员账号已存在'
      }
    }

    // 创建默认管理员账号
    const adminData = {
      username: 'admin',
      password: hashPassword('123456'),
      role: 'admin',
      name: '系统管理员',
      status: 'active',
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }

    const result = await db.collection('admin_users').add({
      data: adminData
    })

    return {
      success: true,
      message: '管理员账号创建成功',
      data: {
        username: 'admin',
        password: '123456'
      }
    }
  } catch (error) {
    console.error('初始化管理员失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

// 用户登录
async function login(data) {
  const { username, password } = data

  if (!username || !password) {
    return {
      success: false,
      message: '用户名和密码不能为空'
    }
  }

  try {
    const user = await db.collection('admin_users').where({
      username: username,
      password: hashPassword(password),
      status: 'active'
    }).get()

    if (user.data.length === 0) {
      return {
        success: false,
        message: '用户名或密码错误'
      }
    }

    const userInfo = user.data[0]

    // 更新最后登录时间
    await db.collection('admin_users').doc(userInfo._id).update({
      data: {
        lastLoginTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })

    return {
      success: true,
      message: '登录成功',
      data: {
        userId: userInfo._id,
        username: userInfo.username,
        role: userInfo.role,
        name: userInfo.name
      }
    }
  } catch (error) {
    console.error('登录失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

// 创建新用户
async function createUser(data) {
  const { username, password, name, role = 'user' } = data

  if (!username || !password) {
    return {
      success: false,
      message: '用户名和密码不能为空'
    }
  }

  try {
    // 检查用户名是否已存在
    const existingUser = await db.collection('admin_users').where({
      username: username
    }).get()

    if (existingUser.data.length > 0) {
      return {
        success: false,
        message: '用户名已存在'
      }
    }

    const userData = {
      username,
      password: hashPassword(password),
      name: name || username,
      role,
      status: 'active',
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }

    const result = await db.collection('admin_users').add({
      data: userData
    })

    return {
      success: true,
      message: '用户创建成功',
      data: {
        _id: result._id,
        username,
        name: userData.name,
        role
      }
    }
  } catch (error) {
    console.error('创建用户失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

// 修改密码
async function updatePassword(data) {
  const { userId, oldPassword, newPassword } = data

  if (!userId || !oldPassword || !newPassword) {
    return {
      success: false,
      message: '参数不完整'
    }
  }

  try {
    const user = await db.collection('admin_users').doc(userId).get()

    if (!user.data) {
      return {
        success: false,
        message: '用户不存在'
      }
    }

    if (user.data.password !== hashPassword(oldPassword)) {
      return {
        success: false,
        message: '原密码错误'
      }
    }

    await db.collection('admin_users').doc(userId).update({
      data: {
        password: hashPassword(newPassword),
        updateTime: db.serverDate()
      }
    })

    return {
      success: true,
      message: '密码修改成功'
    }
  } catch (error) {
    console.error('修改密码失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}
