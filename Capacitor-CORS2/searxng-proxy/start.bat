@echo off
echo 🔍 启动 Bing Search CORS 代理服务器...
echo.
echo 🌐 本地服务器: http://localhost:3001
echo 🔍 搜索端点: http://localhost:3001/search?q=your-query
echo 📄 抓取端点: http://localhost:3001/fetch?url=target-url
echo 📁 测试页面: http://localhost:3001/
echo.

REM 检查 Node.js 是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未找到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

REM 检查是否已安装依赖
if not exist node_modules (
    echo 📦 安装依赖包...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
)

echo ✅ 启动服务器...
npm start

pause
