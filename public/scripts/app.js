// ============= 侧边栏菜单逻辑 =============
        (function() {
            const hamburger = document.getElementById('hamburgerBtn');
            const sidebar = document.getElementById('sidebar');
            let menuOpen = false;

            function openMenu() {
                menuOpen = true;
                sidebar.style.top = window.scrollY + 'px';
                sidebar.classList.add('open');
                document.body.style.overflow = 'hidden';
            }
            function closeMenu() {
                menuOpen = false;
                sidebar.classList.remove('open');
                document.body.style.overflow = '';
            }

            hamburger.addEventListener('click', function(e) {
                e.stopPropagation();
                menuOpen ? closeMenu() : openMenu();
            });

            document.addEventListener('click', function(e) {
                if (!menuOpen) return;
                if (sidebar.contains(e.target) || hamburger.contains(e.target)) return;
                closeMenu();
            });

            sidebar.addEventListener('click', function(e) {
                e.stopPropagation();
            });
        })();

        // ============= 主应用逻辑 =============
        (() => {
            const WILDCARD_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
            const LOG_COLORS = { error: '#ef4444', warn: '#f59e0b', success: '#10b981', info: '#3b82f6' };
            const MAX_LOG = 60;

            const cacheDom = () => ({
                appContainer: document.getElementById('appContainer'),
                refreshBtn: document.getElementById('refreshBtn'),
                settingsBtn: document.getElementById('settingsBtn'),
                aboutBtn: document.getElementById('aboutBtn'),
                aboutModal: document.getElementById('aboutModal'),
                closeAboutBtn: document.getElementById('closeAboutBtn'),
                settingsPanel: document.getElementById('settingsPanel'),
                panelClose: document.getElementById('panelClose'),
                themeBtn: document.getElementById('themeBtn'),
                themeIcon: document.getElementById('themeIcon'),
                themeLabel: document.getElementById('themeLabel'),
                accentColorPicker: document.getElementById('accentColorPicker'),
                cacheStatusRow: document.getElementById('cacheStatusRow'),
                cacheDetailRow: document.getElementById('cacheDetailRow'),
                toolCountRow: document.getElementById('toolCountRow'),
                debugLog: document.getElementById('debugLog'),
                toolsGrid: document.getElementById('toolsGrid'),
                emptyState: document.getElementById('emptyState'),
                loading: document.getElementById('loading'),
                errorMsg: document.getElementById('errorMsg'),
                cookieBanner: document.getElementById('cookieBanner'),
                cookieAccept: document.getElementById('cookieAccept'),
                cookieReject: document.getElementById('cookieReject'),
            });

            const dom = cacheDom();
            let isPanelOpen = false;
            let debugEntries = [];
            let rafPending = false;

            const escapeHtml = (() => {
                const div = document.createElement('div');
                return text => { div.textContent = text; return div.innerHTML; };
            })();

            const isAbsoluteUrl = (url) => /^https?:\/\//i.test(url);

            const resolveIconUrl = (iconUrl, sourceDomain) => {
                if (!iconUrl) return null;
                const resolved = processWildcard(iconUrl);
                if (isAbsoluteUrl(resolved)) return resolved;
                if (resolved.startsWith('//')) return 'https:' + resolved;
                if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/|$)/.test(resolved) && !resolved.startsWith('/') && !resolved.startsWith('.')) {
                    try {
                        new URL('https://' + resolved);
                        return 'https://' + resolved;
                    } catch (e) {}
                }
                try {
                    const base = sourceDomain ? `https://${sourceDomain}` : window.location.origin;
                    return new URL(resolved, base).href;
                } catch (e) {
                    return null;
                }
            };

            const processUrl = (url, useHttps = true) => {
                if (!url) return '';
                if (url.startsWith('http://') || url.startsWith('https://')) return url;
                return useHttps ? `https://${url}` : `http://${url}`;
            };

            const wildcardCache = new Map();
            const fixedHash = (s) => {
                let h = 0;
                for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
                return Math.abs(h);
            };
            const processWildcard = (str) => {
                if (!str.includes('*')) return str;
                let seed = fixedHash(str);
                let result = '';
                for (const ch of str) {
                    if (ch === '*') {
                        seed = (seed * 9301 + 49297) % 233280;
                        result += WILDCARD_CHARS[seed % WILDCARD_CHARS.length];
                    } else {
                        result += ch;
                    }
                }
                return result;
            };

            const parseDownloadUrls = (dl) => {
                if (!dl) return [];
                const parse = (str) => {
                    const i = str.indexOf(':');
                    return i > -1 ? { text: str.slice(0, i).trim(), url: str.slice(i + 1).trim() } : { text: '下载', url: str };
                };
                return (Array.isArray(dl) ? dl : [dl]).map(item =>
                    typeof item === 'string' ? parse(item) : { text: item.text || '下载', url: item.url || '' }
                );
            };

            const log = (msg, type = 'info') => {
                const ts = new Date().toISOString();
                debugEntries.push({ ts, msg, type });
                if (debugEntries.length > MAX_LOG) debugEntries.shift();
                (type === 'error' ? console.error : type === 'warn' ? console.warn : console.log)(`[CLRA] ${ts}: ${msg}`);
                if (isPanelOpen) scheduleLogRefresh();
            };

            const scheduleLogRefresh = () => {
                if (rafPending) return;
                rafPending = true;
                requestAnimationFrame(() => { renderDebugLog(); rafPending = false; });
            };

            const renderDebugLog = () => {
                const html = debugEntries.map(({ ts, msg, type }) => {
                    const color = LOG_COLORS[type] || LOG_COLORS.info;
                    return `<div style="margin-bottom:4px;padding:4px 8px;border-left:3px solid ${color};background:rgba(128,128,128,0.06);border-radius:0 4px 4px 0;">
                        <span style="color:#888;font-size:11px;">${ts}</span><span style="margin-left:8px;">${escapeHtml(msg)}</span></div>`;
                }).join('');
                dom.debugLog.innerHTML = html;
                dom.debugLog.scrollTop = dom.debugLog.scrollHeight;
            };

            const togglePanel = (show) => {
                isPanelOpen = show ?? !isPanelOpen;
                dom.settingsPanel.classList.toggle('open', isPanelOpen);
                if (isPanelOpen) { renderDebugLog(); document.body.style.overflow = "hidden"; } else { document.body.style.overflow = ""; }
            };

            dom.settingsBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePanel(); });
            dom.panelClose.addEventListener('click', () => togglePanel(false));
            document.addEventListener('click', (e) => {
                if (!dom.settingsPanel.contains(e.target) && !dom.settingsBtn.contains(e.target)) togglePanel(false);
            });
            dom.settingsPanel.addEventListener('click', (e) => e.stopPropagation());
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isPanelOpen) togglePanel(false); });

            dom.aboutBtn.addEventListener('click', () => dom.aboutModal.classList.add('visible'));
            dom.closeAboutBtn.addEventListener('click', () => dom.aboutModal.classList.remove('visible'));
            dom.aboutModal.addEventListener('click', (e) => {
                if (e.target === dom.aboutModal) dom.aboutModal.classList.remove('visible');
            });

            const applyAccentColor = (color) => {
                document.documentElement.style.setProperty('--accent', color);
                document.documentElement.style.setProperty('--accent-hover', adjustColor(color, 10));
                dom.accentColorPicker.value = color;
            };
            const adjustColor = (hex, percent) => {
                const num = parseInt(hex.replace('#', ''), 16);
                const amt = Math.round(2.55 * percent);
                const R = Math.min(255, Math.max(0, (num >> 16) + amt));
                const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
                const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
                return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
            };
            const savedAccent = localStorage.getItem('clra-accent');
            if (savedAccent) applyAccentColor(savedAccent);
            else dom.accentColorPicker.value = '#0078D4';
            dom.accentColorPicker.addEventListener('input', (e) => {
                const color = e.target.value;
                applyAccentColor(color);
                localStorage.setItem('clra-accent', color);
            });

            const theme = {
                current: localStorage.getItem('clra-theme') || 'auto',
                systemDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
                apply() {
                    const isDark = this.current === 'dark' || (this.current === 'auto' && this.systemDark);
                    document.body.classList.toggle('light-theme', !isDark);
                    dom.themeIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
                    dom.themeLabel.textContent = this.current === 'auto' ? '自动' : (isDark ? '深色' : '浅色');
                },
                setMode(mode) { this.current = mode; localStorage.setItem('clra-theme', mode); this.apply(); },
                toggle() {
                    if (this.current === 'auto') this.setMode(this.systemDark ? 'light' : 'dark');
                    else if (this.current === 'light') this.setMode('dark');
                    else this.setMode('auto');
                },
            };
            dom.themeBtn.addEventListener('click', () => theme.toggle());
            const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const systemThemeListener = (e) => { theme.systemDark = e.matches; if (theme.current === 'auto') theme.apply(); };
            if (darkMediaQuery.addEventListener) darkMediaQuery.addEventListener('change', systemThemeListener);
            else if (darkMediaQuery.addListener) darkMediaQuery.addListener(systemThemeListener);
            theme.apply();

            window.addEventListener('load', () => dom.appContainer.classList.add('loaded'));

            const createToolCard = (tool, index) => {
                const rawName = tool.name || (tool._domain || '未命名工具');
                const rawDeveloper = tool.developer || '贡献者';
                const rawVersion = tool.version || '?';
                const rawDesc = tool.description || '暂无描述';
                const updateContent = tool.update_content || '';
                const isError = tool.isError;
                const isFallback = tool._fallback_loaded;
                const iconBg = isError ? 'rgba(220,53,69,0.1)' : 'var(--bg2)';
                const iconClass = isError ? 'fas fa-exclamation-triangle' : isFallback ? 'fas fa-wifi' : 'fas fa-cogs';
                const iconColor = isError ? '#dc3545' : isFallback ? '#ff9500' : 'var(--accent)';
                const badgeBg = isError ? '#dc3545' : isFallback ? '#ff9500' : 'var(--accent)';
                const badgeText = isError ? '错误' : isFallback ? '实时' : `v${rawVersion}`;
                const cardClass = `tool-card${isError ? ' error' : isFallback ? ' fallback' : ''}`;

                const sourceDomain = tool._source || '';
                const rawIconUrl = (tool.icon_url || tool.icon || '').trim();
                const iconUrl = rawIconUrl ? resolveIconUrl(rawIconUrl, sourceDomain) : null;

                if (iconUrl) {
                    log(`工具 ${rawName} 图标: ${iconUrl}`, 'info');
                } else if (rawIconUrl) {
                    log(`工具 ${rawName} 图标解析失败 (原始: ${rawIconUrl})`, 'warn');
                }

                const imgHtml = iconUrl
                    ? `<img src="${escapeHtml(iconUrl)}" alt="${escapeHtml(rawName)}" loading="lazy"
                        onload="this.nextElementSibling.style.display='none';"
                        onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">`
                    : '';
                const fallbackIconHtml = `<i class="${iconClass}" style="display:${iconUrl ? 'none' : 'flex'};color:${iconColor};"></i>`;

                const projectUrl = tool.url ? processUrl(processWildcard(tool.url)) : null;
                const parsedUrls = parseDownloadUrls(tool.download_url).filter(btn => {
                    const href = processUrl(processWildcard(btn.url));
                    return href.startsWith('http://') || href.startsWith('https://');
                });

                const downloadHtml = parsedUrls.map(btn => {
                    const href = escapeHtml(processUrl(processWildcard(btn.url)));
                    return `<a href="${href}" class="btn btn-secondary" target="_blank" rel="noopener noreferrer">
                        <i class="fas fa-download"></i> ${escapeHtml(btn.text)}</a>`;
                }).join('');

                const projectBtn = !isError && projectUrl
                    ? `<a href="${escapeHtml(projectUrl)}" class="btn btn-primary" target="_blank" rel="noopener noreferrer">
                        <i class="fas fa-external-link-alt"></i> 项目主页</a>`
                    : '';

                const fallbackTag = isFallback ? '<span class="fallback-tag">(回退加载)</span>' : '';

                const updateHtml = updateContent.trim()
                    ? `<div class="update-content"><strong>更新内容:</strong><br>${escapeHtml(updateContent)}</div>`
                    : '';

                return `<div class="${cardClass}" style="animation-delay: ${index * 0.04}s">
                    <div class="tool-head">
                        <div class="tool-icon" style="background:${iconBg};">
                            ${imgHtml}
                            ${fallbackIconHtml}
                        </div>
                        <div class="tool-info">
                            <h3 style="color:${isError?'#dc3545':'var(--text)'};">${escapeHtml(rawName)}</h3>
                            <div class="tool-meta">
                                <span class="badge" style="background:${badgeBg};">${badgeText}</span>
                                <span class="developer">by ${escapeHtml(rawDeveloper)}</span>
                                ${fallbackTag}
                            </div>
                        </div>
                    </div>
                    <div class="tool-desc">${escapeHtml(rawDesc).replace(/\\n/g, '<br>')}</div>
                    ${updateHtml}
                    <div class="tool-actions">${projectBtn}${downloadHtml}</div>
                </div>`;
            };

            const renderTools = (tools) => {
                dom.loading.classList.remove('active');
                if (!tools.length) {
                    dom.toolsGrid.innerHTML = '';
                    dom.emptyState.classList.add('active');
                    dom.toolCountRow.innerHTML = '<span>工具数量: 0</span>';
                    return;
                }
                dom.emptyState.classList.remove('active');
                dom.errorMsg.classList.remove('active');
                dom.toolsGrid.innerHTML = tools.map((tool, i) => createToolCard(tool, i)).join('');
                dom.toolCountRow.innerHTML = `<span>工具数量: ${tools.length}</span>`;
            };

            const fetchWithProtocol = async (domain, filename, protocol) => {
                const url = `${protocol}://${domain}/${filename}`;
                const res = await fetch(url, { mode: 'cors', headers: { Accept: 'application/json' } });
                if (!res.ok) {
                    if (res.status === 404) return null;
                    throw new Error(`HTTP ${res.status} ${res.statusText}`);
                }
                const manifest = await res.json();
                manifest._fallback_loaded = true;
                manifest._source = domain;
                return manifest;
            };

            const fetchDirect = async (domain) => {
                const resolved = processWildcard(domain);
                for (const file of ['clra_manifest.json', 'jfkl_manifest.json']) {
                    try {
                        const result = await fetchWithProtocol(resolved, file, 'https');
                        if (result) return result;
                    } catch (e) {
                        try {
                            const result = await fetchWithProtocol(resolved, file, 'http');
                            if (result) return result;
                        } catch (e2) {}
                    }
                }
                log(`无法从 ${domain} 获取清单`, 'error');
                return null;
            };

            const fetchFromCache = async (domain) => {
                const safe = domain.replace(/[^a-zA-Z0-9]/g, '_');
                const types = ['clra_manifest', 'jfkl_manifest'];
                for (const type of types) {
                    const cacheUrl = `/manifest-cache/domains/${safe}_${type}.json`;
                    try {
                        const res = await fetch(cacheUrl);
                        if (res.ok) {
                            const data = await res.json();
                            data._source = domain;
                            log(`缓存命中: ${domain}`, 'success');
                            return data;
                        }
                    } catch (_) {}
                }
                log(`缓存未命中 ${domain}，回退实时请求`, 'warn');
                const directData = await fetchDirect(domain);
                if (directData) directData._source = domain;
                return directData;
            };

            const loadConfig = async () => {
                const res = await fetch('./clra_urls.txt');
                if (!res.ok) throw new Error(`配置文件 HTTP ${res.status}`);
                const text = await res.text();
                const domains = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
                log(`加载 ${domains.length} 个域名`, 'success');
                return domains;
            };

            const loadCacheMeta = async () => {
                try {
                    const res = await fetch('/manifest-cache/metadata.json');
                    if (!res.ok) return null;
                    return await res.json();
                } catch (_) { return null; }
            };

            const updateCacheUI = (meta) => {
                if (!meta) {
                    dom.cacheStatusRow.innerHTML = '<span><i class="fas fa-database"></i> <span class="cache-dot error"></span> 缓存不可用</span>';
                    dom.cacheDetailRow.innerHTML = '<span>最后同步: --</span>';
                    return;
                }
                const last = new Date(meta.last_sync);
                const hours = (Date.now() - last.getTime()) / 3600000;
                let cls, text;
                if (hours > 24) { cls = 'error'; text = '过期'; }
                else if (hours > 2) { cls = 'stale'; text = '较旧'; }
                else { cls = 'fresh'; text = '正常'; }
                dom.cacheStatusRow.innerHTML = `<span><i class="fas fa-database"></i> ${text} <span class="cache-dot ${cls}"></span></span>`;
                dom.cacheDetailRow.innerHTML = `<span>最后同步: ${last.toLocaleString()}</span>`;
            };

            const isValidTool = (tool) => {
                if (!tool) return false;
                return !!(tool.name || tool.description || (tool.download_url && tool.download_url.length));
            };

            const init = async () => {
                dom.loading.classList.add('active');
                dom.emptyState.classList.remove('active');
                dom.errorMsg.classList.remove('active');
                try {
                    const [meta, domains] = await Promise.all([loadCacheMeta(), loadConfig()]);
                    updateCacheUI(meta);
                    if (!domains.length) throw new Error('无域名配置');

                    const manifests = await Promise.all(domains.map(fetchFromCache));
                    const seen = new Set();
                    const tools = [];
                    for (const m of manifests) {
                        if (!m) continue;
                        if (seen.has(m.name)) continue;
                        if (!isValidTool(m)) continue;
                        seen.add(m.name);
                        tools.push(m);
                    }
                    log(`加载完成: 有效工具 ${tools.length}`, 'success');

                    const fallbackCount = tools.filter(t => t._fallback_loaded).length;
                    if (fallbackCount > 0 && dom.cacheStatusRow) {
                        const exist = document.querySelector('.cache-warning');
                        if (!exist) {
                            const warn = document.createElement('div');
                            warn.className = 'setting-row cache-warning';
                            warn.innerHTML = `<span><i class="fas fa-exclamation-circle"></i> ${fallbackCount} 个工具使用实时加载</span>`;
                            dom.cacheStatusRow.after(warn);
                        }
                    }
                    renderTools(tools);
                } catch (e) {
                    log(`初始化失败: ${e.message}`, 'error');
                    dom.loading.classList.remove('active');
                    dom.emptyState.classList.remove('active');
                    dom.errorMsg.classList.add('active');
                }
            };

            dom.refreshBtn.addEventListener('click', init);

            // ====================  Clarity 与 Cookie（Worker 代理版） ====================
            const CLARITY_PROXY_BASE = 'https://proxy.api.xingying.us.kg/clarity-proxy';
            const DEFAULT_CLARITY_ID = 'wvnu22ps48';

            const getClarityId = () => {
                const host = window.location.hostname;
                if (host === 'clra1.lzh173.chat') return 'wvnsox7a0p';
                return DEFAULT_CLARITY_ID;
            };

            const setupClarity = (id) => {
                if (!id) return;
                window.clarityConfig = { proxy: CLARITY_PROXY_BASE };
                const script = document.createElement('script');
                script.async = 1;
                script.src = `${CLARITY_PROXY_BASE}/www.clarity.ms/tag/${id}`;
                document.head.appendChild(script);
                log(`Clarity 已通过代理加载 (前端ID: ${id})`, 'info');
            };

            const EU_COUNTRIES = [
                'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT',
                'LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','CH'
            ];

            const isEUCountry = (code) => EU_COUNTRIES.includes(code.toUpperCase());

            const detectEUviaIP = () => {
                return new Promise((resolve) => {
                    const timeout = setTimeout(() => resolve(false), 3000);
                    fetch('https://ipapi.co/json/')
                        .then(res => res.ok ? res.json() : Promise.reject())
                        .then(data => {
                            clearTimeout(timeout);
                            resolve(isEUCountry(data.country_code));
                        })
                        .catch(() => {
                            clearTimeout(timeout);
                            const lang = navigator.language || navigator.userLanguage || '';
                            const code = lang.split('-')[1] || lang.split('-')[0]?.toUpperCase();
                            resolve(code ? isEUCountry(code) : false);
                        });
                });
            };

            const showCookieBanner = () => dom.cookieBanner.classList.remove('hidden');
            const hideCookieBanner = () => dom.cookieBanner.classList.add('hidden');

            const setCookieConsent = (accepted) => {
                localStorage.setItem('cookieConsent', accepted ? 'accepted' : 'rejected');
                hideCookieBanner();
                if (accepted) {
                    const clarityId = getClarityId();
                    if (clarityId) setupClarity(clarityId);
                }
            };

            (async () => {
                const clarityId = getClarityId();
                if (!clarityId) {
                    log('当前域名不加载 Clarity', 'info');
                    return;
                }
                const existingConsent = localStorage.getItem('cookieConsent');
                if (existingConsent === 'accepted') {
                    setupClarity(clarityId);
                    return;
                }
                if (existingConsent === 'rejected') return;

                const isEU = await detectEUviaIP();
                if (!isEU) {
                    setupClarity(clarityId);
                    return;
                }
                showCookieBanner();
            })();

            dom.cookieAccept.addEventListener('click', () => setCookieConsent(true));
            dom.cookieReject.addEventListener('click', () => setCookieConsent(false));

            init();
        })();
// === 移动端侧边栏切换 ===
document.addEventListener('DOMContentLoaded', function() {
  var hamburger = document.querySelector('.hamburger-btn');
  var sidebar = document.querySelector('.sidebar');
  if (hamburger && sidebar) {
    hamburger.addEventListener('click', function() {
      sidebar.classList.toggle('open');
      document.body.classList.toggle('sidebar-open');
    });
    // 点击侧边栏外部关闭（可选）
    sidebar.addEventListener('click', function(e) {
      if (e.target === sidebar) {
        sidebar.classList.remove('open');
        document.body.classList.remove('sidebar-open');
      }
    });
  }
});


// === 完全代理 Clarity（代理 clarity.js 并手动初始化） ===
function initClarity(projectId) {
  const proxyBase = 'https://proxy.api.xingying.us.kg/clarity-proxy';

  // 定义 window.clarity 队列
  window.clarity = window.clarity || function() {
    (window.clarity.q = window.clarity.q || []).push(arguments);
  };

  // 通过代理加载 clarity.js（版本保持与官方同步）
  const script = document.createElement('script');
  script.async = true;
  script.src = proxyBase + '/scripts.clarity.ms/0.8.64/clarity.js';
  script.onload = function() {
    // clarity.js 加载完成后，手动启动项目
    window.clarity('start', {
      projectId: projectId,
      upload: proxyBase + '/i.clarity.ms/collect',  // 上报也走代理
      expire: 365,
      cookies: ['_uetmsclkid', '_uetvid', '_clck'],
      track: false,
      content: true,
      unmask: ['body'],
      dob: 2336
    });
  };
  document.head.appendChild(script);
}

// 启动 Clarity（使用当前域名对应的项目 ID）
(function() {
  const host = window.location.hostname;
  let projectId = 'wvnu22ps48'; // 默认
  if (host === 'clra1.lzh173.chat') projectId = 'wvnsox7a0p';
  // 可根据需要添加更多映射

  // 等待页面基本加载后初始化（避免阻塞）
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initClarity(projectId));
  } else {
    initClarity(projectId);
  }
})();
