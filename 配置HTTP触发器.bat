@echo off
echo ============================================================================
echo  DayUp 项目 HTTP 触发器快速配置
echo ============================================================================
echo.
echo 本工具将帮助你配置 HTTP 触发器，使 Admin 后台能够调用云函数 API
echo.
echo 环境 ID: dayup-02-8gpzk22z15cf48a9
echo API 云函数: api
echo.
echo ============================================================================
echo.

:start
set /p method="请选择配置方式 (1=微信开发者工具, 2=腾讯云控制台, 3=跳过): "

if "%method%"=="1" goto wechat
if "%method%"=="2" goto tencent
if "%method%"=="3" goto skip
echo 无效选择，请重新输入
echo.
goto start

:wechat
echo.
echo ═════════════════════════════════════════════════════════════════════════
echo  方式一：微信开发者工具配置（推荐）
echo ═════════════════════════════════════════════════════════════════════════
echo.
echo 步骤 1：打开云开发控制台
echo ---------------------------------------------------
echo 1. 打开【微信开发者工具】
echo 2. 点击顶部工具栏的【云开发】按钮
echo 3. 选择环境：dayup-02-8gpzk22z15cf48a9
echo 4. 点击【确定】
echo.
pause
echo.

echo 步骤 2：进入云函数管理
echo ---------------------------------------------------
echo 1. 左侧菜单点击【云函数】
echo 2. 在列表中找到【api】函数
echo 3. 点击【api】进入详情页
echo.
pause
echo.

echo 步骤 3：创建 HTTP 触发器
echo ---------------------------------------------------
echo 1. 点击顶部【触发器】标签
echo 2. 点击【新建触发器】按钮
echo 3. 填写配置：
echo.
echo    ┌─────────────────────────────────────────┐
echo    │ 触发方式：HTTP触发                       │
echo    │ 触发器名称：http-trigger                 │
echo    │ 鉴权方式：免鉴权                         │
echo    │ 请求方法：POST, OPTIONS                  │
echo    │ 域名：默认                               │
echo    └─────────────────────────────────────────┘
echo.
echo 4. 点击【提交】
echo.
pause
echo.
goto after_config

:tencent
echo.
echo ═════════════════════════════════════════════════════════════════════════
echo  方式二：腾讯云控制台配置
echo ═════════════════════════════════════════════════════════════════════════
echo.
echo 步骤 1：登录控制台
echo ---------------------------------------------------
echo 1. 浏览器访问：https://console.cloud.tencent.com/tcb
echo 2. 登录腾讯云账号
echo 3. 进入【云开发 CloudBase】控制台
echo.
pause
echo.

echo 步骤 2：选择环境
echo ---------------------------------------------------
echo 1. 在环境列表中找到 dayup-02-8gpzk22z15cf48a9
echo 2. 点击进入环境详情页
echo.
pause
echo.

echo 步骤 3：配置 HTTP 触发器
echo ---------------------------------------------------
echo 1. 左侧菜单点击【云函数】
echo 2. 找到 api 函数并点击
echo 3. 进入【函数配置】→【触发器】
echo 4. 点击【创建触发器】
echo 5. 配置参数（同方式一）
echo 6. 点击【提交】
echo.
pause
echo.
goto after_config

:after_config
echo.
echo ═════════════════════════════════════════════════════════════════════════
echo  ✓ HTTP 触发器配置完成！
echo ═════════════════════════════════════════════════════════════════════════
echo.
echo 触发器地址：
echo https://dayup-02-8gpzk22z15cf48a9.service.tcloudbase.com/api
echo.
echo.
echo 步骤 4：配置 Admin 环境变量
echo ---------------------------------------------------
echo.
echo 正在更新 admin/.env 文件...

if not exist "d:\Edge\jeff项目文件\dayup-02\admin\.env" (
    echo VITE_APP_API_BASE_URL=https://dayup-02-8gpzk22z15cf48a9.service.tcloudbase.com/api > "d:\Edge\jeff项目文件\dayup-02\admin\.env"
    echo VITE_APP_ENV=production >> "d:\Edge\jeff项目文件\dayup-02\admin\.env"
    echo ✓ 已创建 .env 文件
) else (
    echo 备份原配置文件...
    copy "d:\Edge\jeff项目文件\dayup-02\admin\.env" "d:\Edge\jeff项目文件\dayup-02\admin\.env.backup" >nul
    echo VITE_APP_API_BASE_URL=https://dayup-02-8gpzk22z15cf48a9.service.tcloudbase.com/api > "d:\Edge\jeff项目文件\dayup-02\admin\.env"
    echo VITE_APP_ENV=production >> "d:\Edge\jeff项目文件\dayup-02\admin\.env"
    echo ✓ 已更新 .env 文件
)

echo.
echo 配置文件内容：
echo ---------------------------------------------------
type "d:\Edge\jeff项目文件\dayup-02\admin\.env"
echo.

echo 步骤 5：测试 API
echo ---------------------------------------------------
echo.
echo 请选择测试方式：
echo 1. 使用 Node.js 测试脚本
echo 2. 使用 curl 测试
echo 3. 跳过测试
echo.
set /p test="请选择 (1-3): "

if "%test%"=="1" goto node_test
if "%test%"=="2" goto curl_test
if "%test%"=="3" goto complete

:node_test
echo.
echo 正在运行 Node.js 测试...
echo.
cd /d "d:\Edge\jeff项目文件\dayup-02"
if exist "test-api.js" (
    node test-api.js
) else (
    echo 测试脚本不存在，请手动测试
)
goto complete

:curl_test
echo.
echo 正在使用 curl 测试 API...
echo.
curl -X POST https://dayup-02-8gpzk22z15cf48a9.service.tcloudbase.com/api ^
  -H "Content-Type: application/json" ^
  -d "{\"action\":\"getAllStudents\",\"data\":{\"limit\":1}}" ^
  -w "\n\n状态码: %{http_code}\n"
echo.
goto complete

:skip
echo.
echo ⚠ 你已选择跳过配置
echo.
echo 如需配置，请运行：configure-http-trigger.bat
echo 或查看详细指南：HTTP_TRIGGER_GUIDE.md
echo.
goto end

:complete
echo.
echo ═════════════════════════════════════════════════════════════════════════
echo  ✓ 配置完成！
echo ═════════════════════════════════════════════════════════════════════════
echo.
echo 下一步操作：
echo.
echo 1. 重新构建 Admin 后台：
echo    cd admin && npm run build
echo.
echo 2. 重新部署到静态托管：
echo    tcb hosting deploy dist -e dayup-02-8gpzk22z15cf48a9
echo    或：使用微信开发者工具上传 dist 文件夹
echo.
echo 3. 访问 Admin 后台测试功能：
echo    https://dayup-02-8gpzk22z15cf48a9-1418591179.tcloudbaseapp.com
echo.
echo 4. 如有问题，请查看：
echo    - HTTP_TRIGGER_GUIDE.md（详细配置指南）
echo    - README.md（项目文档）
echo.
echo ═════════════════════════════════════════════════════════════════════════

:end
echo.
pause
