export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/clarity')) {
      url.hostname = 'www.clarity.ms';
      return fetch(new Request(url.toString(), request));
    }
    return fetch(request);
  }
};