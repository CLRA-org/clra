#!/usr/bin/env node

/**
 * CLRA 工具分发平台 - 清单同步脚本
 * 用于GitHub Actions定时同步manifest文件到缓存
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// 配置
const CONFIG_FILE = './clra_urls.txt';
const CACHE_DIR = './manifest-cache';
const DOMAINS_CACHE_DIR = path.join(CACHE_DIR, 'domains');
const METADATA_FILE = path.join(CACHE_DIR, 'metadata.json');

// 支持的manifest文件名
const MANIFEST_FILES = ['clra_manifest.json', 'jfkl_manifest.json'];

// 调试日志
function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`[${timestamp}] ${prefix} ${message}`);
}

// 生成随机字符串（用于泛域名）
function generateRandomString(length = 16) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// 生成固定的泛域名替换字符串（与前端保持一致）
function generateFixedWildcardString(wildcardDomain) {
    // 使用域名作为种子，生成固定的16位字符串
    // 这确保相同的泛域名总是生成相同的结果
    let hash = 0;
    for (let i = 0; i < wildcardDomain.length; i++) {
        const char = wildcardDomain.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
    }

    // 生成16位固定字符串
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    let seed = Math.abs(hash);

    for (let i = 0; i < 16; i++) {
        seed = (seed * 9301 + 49297) % 233280;
        result += chars.charAt(seed % chars.length);
    }

    return result;
}

// 处理泛域名
function processWildcardDomain(domain) {
    if (domain.includes('*')) {
        // 检查缓存中是否已有该泛域名的实例
        const wildcardCacheFile = path.join(DOMAINS_CACHE_DIR, `${domain.replace(/\*/g, 'WILDCARD')}.cache`);

        if (fs.existsSync(wildcardCacheFile)) {
            const cachedDomain = fs.readFileSync(wildcardCacheFile, 'utf8').trim();
            log(`使用缓存的泛域名实例: ${cachedDomain}`);
            return cachedDomain;
        } else {
            // 生成新的泛域名实例（使用固定算法确保前后端一致）
            const resolvedDomain = domain.replace(/\*/g, generateFixedWildcardString(domain));

            // 缓存生成的域名
            fs.writeFileSync(wildcardCacheFile, resolvedDomain);
            log(`生成并缓存泛域名实例: ${resolvedDomain}`);

            return resolvedDomain;
        }
    }
    return domain;
}

// 获取HTTP/HTTPS模块
function getRequestModule(url) {
    return url.startsWith('https://') ? https : http;
}

// 获取清单文件
async function fetchManifest(domain, manifestFile) {
    return new Promise((resolve, reject) => {
        const url = `https://${domain}/${manifestFile}`;
        const requestModule = getRequestModule(url);

        log(`尝试从 ${url} 获取清单文件`);

        const request = requestModule.get(url, (response) => {
            let data = '';

            if (response.statusCode === 200) {
                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    try {
                        const manifest = JSON.parse(data);
                        log(`成功获取清单文件: ${domain}/${manifestFile}`, 'success');
                        resolve({ domain, manifest, filename: manifestFile });
                    } catch (error) {
                        log(`解析清单文件失败: ${domain}/${manifestFile} - ${error.message}`, 'error');
                        resolve(null);
                    }
                });
            } else {
                log(`HTTP ${response.statusCode}: ${url}`, 'warn');
                resolve(null);
            }
        });

        request.on('error', (error) => {
            log(`请求失败: ${url} - ${error.message}`, 'error');
            resolve(null);
        });

        request.setTimeout(10000, () => {
            log(`请求超时: ${url}`, 'warn');
            request.abort();
            resolve(null);
        });
    });
}

// 获取域名的清单文件
async function fetchDomainManifest(domain) {
    log(`处理域名: ${domain}`);

    // 处理泛域名
    const resolvedDomain = processWildcardDomain(domain);

    // 尝试获取所有支持的清单文件
    const promises = MANIFEST_FILES.map(file => fetchManifest(resolvedDomain, file));
    const results = await Promise.all(promises);

    // 返回第一个成功的结果
    const validResult = results.find(result => result !== null);

    if (validResult) {
        // 返回结果时包含原始域名信息
        return {
            ...validResult,
            originalDomain: domain,  // 保存原始域名（可能包含*）
            resolvedDomain: resolvedDomain  // 保存解析后的域名
        };
    } else {
        log(`域名 ${domain} 没有可用的清单文件`, 'warn');
        return null;
    }
}

// 加载配置文件
function loadConfig() {
    try {
        if (!fs.existsSync(CONFIG_FILE)) {
            log(`配置文件 ${CONFIG_FILE} 不存在`, 'error');
            return [];
        }

        const content = fs.readFileSync(CONFIG_FILE, 'utf8');
        const domains = content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));

        log(`加载配置文件成功，共 ${domains.length} 个域名`);
        return domains;
    } catch (error) {
        log(`加载配置文件失败: ${error.message}`, 'error');
        return [];
    }
}

// 保存清单缓存
function saveManifestCache(domain, manifestData) {
    try {
        // 使用原始域名（可能包含*）来创建缓存文件名
        const originalDomain = manifestData.originalDomain || domain;

        // 创建缓存文件名（使用原始域名，保持与前端查找逻辑一致）
        const safeDomain = originalDomain.replace(/[^a-zA-Z0-9]/g, '_');
        const filename = manifestData.filename.replace('.json', '');
        const cacheFile = path.join(DOMAINS_CACHE_DIR, `${safeDomain}_${filename}.json`);

        fs.writeFileSync(cacheFile, JSON.stringify(manifestData.manifest, null, 2));
        log(`缓存清单文件: ${cacheFile} (原始域名: ${originalDomain})`, 'success');

        return {
            domain: originalDomain,
            resolvedDomain: manifestData.resolvedDomain,
            cacheFile,
            manifest: manifestData.manifest
        };
    } catch (error) {
        log(`保存缓存失败: ${error.message}`, 'error');
        return null;
    }
}

// 更新元数据
function updateMetadata(cachedManifests) {
    const metadata = {
        last_sync: new Date().toISOString(),
        total_tools: cachedManifests.length,
        domains: cachedManifests.map(item => ({
            domain: item.domain,
            cache_file: path.basename(item.cacheFile),
            tool_name: item.manifest.name,
            version: item.manifest.version
        })),
        version: '1.0.0'
    };

    fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2));
    log(`更新元数据: ${cachedManifests.length} 个工具`, 'success');
}

// 主函数
async function main() {
    log('开始同步清单文件');

    // 确保缓存目录存在
    if (!fs.existsSync(DOMAINS_CACHE_DIR)) {
        fs.mkdirSync(DOMAINS_CACHE_DIR, { recursive: true });
        log(`创建缓存目录: ${DOMAINS_CACHE_DIR}`);
    }

    // 加载域名配置
    const domains = loadConfig();
    if (domains.length === 0) {
        log('没有找到有效的域名配置', 'error');
        process.exit(1);
    }

    log(`开始处理 ${domains.length} 个域名`);

    // 并行获取所有域名的清单文件
    const promises = domains.map(domain => fetchDomainManifest(domain));
    const results = await Promise.all(promises);

    // 过滤成功获取的结果
    const validManifests = results.filter(result => result !== null);

    if (validManifests.length === 0) {
        log('没有找到任何有效的清单文件', 'warn');
    } else {
        log(`成功获取 ${validManifests.length} 个清单文件`, 'success');

        // 保存缓存
        const cachedManifests = [];
        for (const manifestData of validManifests) {
            const cacheResult = saveManifestCache(manifestData.domain, manifestData);
            if (cacheResult) {
                cachedManifests.push(cacheResult);
            }
        }

        // 更新元数据
        updateMetadata(cachedManifests);

        log(`同步完成: 共缓存 ${cachedManifests.length} 个工具清单`, 'success');
    }
}

// 运行主函数
main().catch(error => {
    log(`同步失败: ${error.message}`, 'error');
    process.exit(1);
});