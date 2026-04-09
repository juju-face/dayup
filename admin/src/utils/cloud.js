/**
 * Cloud服务代理文件
 * 已将tcb-js-sdk迁移到http-api.js
 * 此文件保持向后兼容
 */

// 导入新的HTTP API服务
import httpApiService from './http-api'

// 导出为cloudService，保持向后兼容
export default httpApiService
