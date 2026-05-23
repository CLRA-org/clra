export default {
  async fetch(request) {
    const url = new URL(request.url);

    // 主脚本代理
    if (url.pathname.startsWith('/clarity/tag/')) {
      url.hostname = 'www.clarity.ms';
      return fetch(new Request(url.toString(), request));
    }

    // 第一方代理：/clarity-proxy/<host>/<path>
    if (url.pathname.startsWith('/clarity-proxy/')) {
      const pathParts = url.pathname.replace('/clarity-proxy/', '').split('/');
      const host = pathParts[0];          // 如 c.clarity.ms
      const realPath = '/' + pathParts.slice(1).join('/'); // 如 /c.gif
      url.hostname = host;
      url.pathname = realPath;
      return fetch(new Request(url.toString(), request));
    }

    // 正常静态请求
    return fetch(request);
  }
};