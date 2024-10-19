export default {
  async fetch(request, env, ctx) {
    const clonedRequest = request.clone();
    // 使用当前时间作为键
    const now = new Date(new Date().getTime() + 8 * 60 * 60 * 1000); // Adjust for GMT+8
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0'); // Adjust for GMT+8
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    let logKey = `${year}.${month}.${day}.${hours}.${minutes}.${seconds}`;
    
    try {
      const url = new URL(request.url);
      if (url.pathname === '/') {
            return await handleGetLogs(env);
          }
      if (clonedRequest.method === 'POST') {
        const requestBody = await clonedRequest.json();
        const aimodel=requestBody.model;
        logKey=`${year}.${month}.${day}.${hours}.${minutes}.${seconds}.${aimodel}`;
        console.log(requestBody);
        if (requestBody != null && requestBody.messages != null) {
          const lastMessage = requestBody.messages[requestBody.messages.length - 1];
          let last_user_message = null;
          if (lastMessage && lastMessage.role === 'user') {
            last_user_message = lastMessage.content;
          } else {
            last_user_message = undefined;
          }
          try {
            // 将 message 序列化为 JSON 字符串
            //const messageString = JSON.stringify(last_user_message);
            //console.log(`${last_user_message}`);
            // 使用 Cloudflare Workers 的 KV API 直接存储 message 值
            if(last_user_message){
              await env.WORKER_LOG.put(logKey, last_user_message, { expirationTtl: 60 * 60 * 24 * 7 });
              console.log('Message Requested successfully');
            }
            
          } catch (error) {
            console.error(`Error storing message in KV: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error parsing JSON: ${error.message}`);
      //return new Response('Invalid JSON', { status: 400 });
    }

      try {
    const response = await fetch(request);
    const responseClone = response.clone(); 
    // 或者，如果你期望获取 JSON 数据，可以使用
    const responseBody = await responseClone.text();
    console.log(responseBody); // 打印获取的内容
    const fullText = generateMarkdownFromMessage(responseBody);
    if(fullText){
      //console.log(fullText); // 打印获取的内容
      await env.WORKER_LOG.put(logKey, fullText, { expirationTtl: 60 * 60 * 24 * 7 });
      console.log('Message Responsed successfully');
        }
    // 返回原始响应
    return response;
    } catch (error) {
    console.error(`Fetch error: ${error.message}`);
    return new Response('Internal Server Error', { status: 500 });
    }

  }
};

async function handleGetLogs(env) {
  try {
    const logs = [];
    // 从 KV 中获取所有键
    const list = await env.WORKER_LOG.list();
    for (const key of list.keys) {
      const value = await env.WORKER_LOG.get(key.name);
      logs.push({ key: key.name, value });
    }

    // 生成 HTML
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>历史消息</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f9f9f9;
          }
          h1 {
            color: #333;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            background-color: #fff;
          }
          th, td {
            padding: 12px;
            border: 1px solid #ddd;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
            color: #333;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          tr:hover {
            background-color: #ddd;
          }
        </style>
      </head>
      <body>
        <h1>历史消息</h1>
        <table>
          <tr>
            <th>时间</th>
            <th>消息</th>
          </tr>
          ${logs.map(log => `
            <tr>
              <td>${log.key}</td>
              <td>${log.value}</td>
            </tr>
          `).join('')}
        </table>
      </body>
      </html>
    `;
    
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=UTF-8' },
    });
  } catch (error) {
    console.error(`Error retrieving logs: ${error.message}`);
    return new Response('Internal Server Error', { status: 500 });
  }
}

function generateMarkdownFromMessage(message) {
    // 使用正则表达式匹配所有 event 为 text 的 data 值
    const regex = /event: text\s*data: "(.*?)"/g;
    let match;
    let result = [];

    // 循环提取所有匹配的内容
    while ((match = regex.exec(message)) !== null) {
        // 替换换行符和引号，并去掉多余空格
        const cleanedData = match[1]
            .replace(/\\n/g, '\n') // 替换换行符
            .replace(/\\\"/g, '"') // 替换引号
            .replace(/^\s+|\s+$/g, '') // 去掉首尾空格
            .replace(/\s+/g, ' '); // 将多个空格替换为一个空格
        result.push(cleanedData);
    }

    // 拼接成 Markdown 格式的文本
    const markdownText = result.join('\n\n'); // 每个段落之间加两个换行
    return markdownText;
}

