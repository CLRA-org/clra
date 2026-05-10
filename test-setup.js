#!/usr/bin/env node

/**
 * CLRA 项目测试脚本
 * 验证项目设置是否正确
 */

const fs = require('fs');
const path = require('path');

function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`[${timestamp}] ${prefix} ${message}`);
}

function checkFile(filePath, description) {
    if (fs.existsSync(filePath)) {
        log(`${description} ✓`, 'success');
        return true;
    } else {
        log(`${description} ✗ - 文件不存在: ${filePath}`, 'error');
        return false;
    }
}

function checkDirectory(dirPath, description) {
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        log(`${description} ✓`, 'success');
        return true;
    } else {
        log(`${description} ✗ - 目录不存在: ${dirPath}`, 'error');
        return false;
    }
}

function validateJsonFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        JSON.parse(content);
        log(`JSON文件验证通过: ${filePath}`, 'success');
        return true;
    } catch (error) {
        log(`JSON文件验证失败: ${filePath} - ${error.message}`, 'error');
        return false;
    }
}

function main() {
    log('开始项目完整性检查');

    let allPassed = true;

    // 检查必需文件
    const requiredFiles = [
        { path: './index.html', description: '主应用文件' },
        { path: './styles.css', description: '样式文件' },
        { path: './clra_urls.txt', description: '域名配置文件' },
        { path: './sync-manifests.js', description: '缓存同步脚本' },
        { path: './package.json', description: 'Node.js包配置文件' },
        { path: './manifest-cache/metadata.json', description: '缓存元数据文件' }
    ];

    for (const file of requiredFiles) {
        if (!checkFile(file.path, file.description)) {
            allPassed = false;
        }
    }

    // 检查必需目录
    const requiredDirs = [
        { path: './manifest-cache', description: '缓存根目录' },
        { path: './manifest-cache/domains', description: '域名缓存目录' },
        { path: './.github', description: 'GitHub配置目录' },
        { path: './.github/workflows', description: 'GitHub Actions工作流目录' }
    ];

    for (const dir of requiredDirs) {
        if (!checkDirectory(dir.path, dir.description)) {
            allPassed = false;
        }
    }

    // 检查GitHub Actions工作流文件
    if (!checkFile('./.github/workflows/sync-manifests.yml', 'GitHub Actions工作流文件')) {
        allPassed = false;
    }

    // 验证JSON文件
    const jsonFiles = [
        './manifest-cache/metadata.json',
        './package.json'
    ];

    for (const jsonFile of jsonFiles) {
        if (fs.existsSync(jsonFile)) {
            if (!validateJsonFile(jsonFile)) {
                allPassed = false;
            }
        }
    }

    // 检查缓存文件
    const cacheDir = './manifest-cache/domains';
    if (fs.existsSync(cacheDir)) {
        const cacheFiles = fs.readdirSync(cacheDir);
        if (cacheFiles.length > 0) {
            log(`找到 ${cacheFiles.length} 个缓存文件`, 'success');
            for (const cacheFile of cacheFiles) {
                if (cacheFile.endsWith('.json')) {
                    validateJsonFile(path.join(cacheDir, cacheFile));
                }
            }
        } else {
            log('缓存目录为空，建议添加示例缓存文件', 'warn');
        }
    }

    // 检查clra_urls.txt内容
    try {
        const configContent = fs.readFileSync('./clra_urls.txt', 'utf8');
        const domains = configContent
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));

        if (domains.length > 0) {
            log(`配置文件包含 ${domains.length} 个域名:`, 'success');
            domains.forEach(domain => log(`  - ${domain}`));
        } else {
            log('配置文件为空，请添加域名配置', 'warn');
        }
    } catch (error) {
        log(`读取配置文件失败: ${error.message}`, 'error');
        allPassed = false;
    }

    // 总结
    log('');
    if (allPassed) {
        log('🎉 项目完整性检查通过！', 'success');
        log('');
        log('接下来可以:');
        log('1. 启动本地服务器测试: python -m http.server 8000');
        log('2. 或运行缓存同步: node sync-manifests.js');
        log('3. 在GitHub上配置Actions工作流');
    } else {
        log('❌ 项目检查发现问题，请修复上述错误', 'error');
    }
}

main();