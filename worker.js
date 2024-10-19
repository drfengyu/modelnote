addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
    const url = new URL(request.url);
    
    // 打印请求的 URL，便于调试
    //console.log(`Request URL: ${url.pathname}`);

    // 处理静态资源请求
    if (url.pathname.endsWith('.css') || url.pathname.endsWith('.js') || url.pathname.endsWith('.png') || url.pathname.endsWith('.jpg')) {
        // 将请求转发到 Hugging Face 的资源
        const targetUrl = 'https://huggingface.co' + url.pathname + url.search;

        // 请求目标 URL
        const response = await fetch(targetUrl, {
            method: request.method,
            headers: {
                'User-Agent': request.headers.get('User-Agent'), // 保留用户代理
                // 可以在这里添加其他必要的头部
            },
            redirect: 'follow'
        });

        // 克隆响应以便可以读取其内容
        const responseClone = response.clone();
        
        // 确保响应头允许跨域请求
        const newHeaders = new Headers(responseClone.headers);
        newHeaders.set('Access-Control-Allow-Origin', '*');

        return new Response(responseClone.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders
        });
    }

    // 处理其他请求（例如 API 请求）
    const targetUrl = 'https://huggingface.co' + url.pathname + url.search;
    const modifiedHeaders = new Headers(request.headers);
    modifiedHeaders.delete('Origin');

    const response = await fetch(targetUrl, {
        method: request.method,
        headers: modifiedHeaders,
        body: request.method === 'POST' ? request.body : null,
        redirect: 'follow'
    });

    const responseClone = response.clone();
    const newHeaders = new Headers(responseClone.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(responseClone.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
    });
}
