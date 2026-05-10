@echo off
echo CLRA 项目完整性检查
echo =========================
echo.

REM 检查必需文件
if exist "index.html" (
    echo ✅ 主应用文件存在
) else (
    echo ❌ 主应用文件缺失
)

if exist "styles.css" (
    echo ✅ 样式文件存在
) else (
    echo ❌ 样式文件缺失
)

if exist "clra_urls.txt" (
    echo ✅ 域名配置文件存在
) else (
    echo ❌ 域名配置文件缺失
)

if exist "sync-manifests.js" (
    echo ✅ 缓存同步脚本存在
) else (
    echo ❌ 缓存同步脚本缺失
)

if exist "package.json" (
    echo ✅ Node.js包配置文件存在
) else (
    echo ❌ Node.js包配置文件缺失
)

if exist "manifest-cache\metadata.json" (
    echo ✅ 缓存元数据文件存在
) else (
    echo ❌ 缓存元数据文件缺失
)

echo.
REM 检查目录
if exist "manifest-cache" (
    echo ✅ 缓存根目录存在
) else (
    echo ❌ 缓存根目录缺失
)

if exist "manifest-cache\domains" (
    echo ✅ 域名缓存目录存在
) else (
    echo ❌ 域名缓存目录缺失
)

if exist ".github" (
    echo ✅ GitHub配置目录存在
) else (
    echo ❌ GitHub配置目录缺失
)

if exist ".github\workflows" (
    echo ✅ GitHub Actions工作流目录存在
) else (
    echo ❌ GitHub Actions工作流目录缺失
)

if exist ".github\workflows\sync-manifests.yml" (
    echo ✅ GitHub Actions工作流文件存在
) else (
    echo ❌ GitHub Actions工作流文件缺失
)

echo.
echo 检查缓存文件...
if exist "manifest-cache\domains\*.json" (
    dir "manifest-cache\domains\*.json" /b
    echo ✅ 缓存文件存在
) else (
    echo ⚠️  没有找到缓存文件
)

echo.
echo =========================
echo 项目检查完成！
echo.
echo 建议操作:
echo 1. 使用 Python 启动本地服务器: python -m http.server 8000
echo 2. 在浏览器中访问: http://localhost:8000
echo 3. 如需同步缓存，请安装 Node.js 后运行: node sync-manifests.js
pause