# 🚀 Capacitor CORS Bypass 插件 - 增强功能完整指南

## 📋 功能概览

这个插件现在是一个功能完整的网络处理瑞士军刀，提供了远超基础 CORS 绕过的强大能力。

## 🎯 核心功能分类

### 1. 基础网络功能 ✅
- **HTTP 请求 CORS 绕过** - 绕过浏览器 CORS 限制
- **SSE 连接** - 服务器发送事件支持
- **WebSocket 连接** - 实时双向通信
- **MCP 协议支持** - Model Context Protocol 集成

### 2. 高级网络功能 🚀
- **批量请求处理** - 并发请求管理
- **自动重试机制** - 智能错误恢复
- **连接池管理** - 高效连接复用
- **网络监控** - 实时网络状态监控

### 3. 文件操作 📁
- **文件下载** - 支持断点续传和进度跟踪
- **文件上传** - 多种格式上传支持
- **速度控制** - 上传/下载速度限制
- **进度回调** - 实时进度更新

### 4. 数据处理 📊
- **多格式解析** - JSON, XML, CSV, YAML, HTML, Markdown, Base64
- **智能缓存** - 压缩存储和过期管理
- **数据转换** - 格式间转换
- **JSONPath 支持** - 复杂数据提取

### 5. 服务器功能 🖥️
- **内置代理服务器** - 动态创建代理
- **速率限制** - API 调用频率控制
- **CORS 处理** - 自动 CORS 头处理

### 6. 高级协议支持 ⚡
- **HTTP/2** - 多路复用和服务器推送
- **HTTP/3 (QUIC)** - 0-RTT 和连接迁移
- **gRPC** - 高性能 RPC 调用和流式传输
- **GraphQL** - 查询、变更和订阅支持

## 🔧 详细功能说明

### 批量请求处理
```typescript
const results = await CorsBypass.batchRequests([
  {
    url: 'https://api1.com/data',
    id: 'req1',
    priority: 1,
    retry: { maxAttempts: 3, delay: 1000, backoff: 'exponential' }
  },
  {
    url: 'https://api2.com/data',
    id: 'req2',
    priority: 2,
    headers: { 'Authorization': 'Bearer token' }
  }
]);

// 结果包含每个请求的详细信息
results.forEach(result => {
  console.log(`请求 ${result.id}: ${result.success ? '成功' : '失败'}`);
  console.log(`耗时: ${result.duration}ms, 重试次数: ${result.attempts}`);
});
```

### 文件下载/上传
```typescript
// 下载文件
const download = await CorsBypass.downloadFile({
  url: 'https://example.com/large-file.zip',
  filePath: '/storage/downloads/file.zip',
  resume: true,                    // 断点续传
  maxSpeed: 1024 * 1024,          // 1MB/s 限速
  progressInterval: 1024 * 100,    // 每100KB回调一次
  headers: { 'User-Agent': 'MyApp' }
});

// 监听下载进度
CorsBypass.addListener('downloadProgress', (data) => {
  const progress = (data.bytesDownloaded / data.totalSize) * 100;
  console.log(`下载进度: ${progress.toFixed(2)}%`);
});

// 上传文件
const upload = await CorsBypass.uploadFile({
  url: 'https://api.com/upload',
  filePath: '/storage/image.jpg',
  method: 'POST',
  fieldName: 'file',
  formData: { 
    userId: '123',
    category: 'avatar'
  },
  maxSpeed: 512 * 1024  // 512KB/s 限速
});
```

### 连接池管理
```typescript
// 创建连接池
const pool = await CorsBypass.createConnectionPool({
  maxConnections: 10,
  timeout: 30000,
  keepAliveTimeout: 60000,
  maxRequestsPerConnection: 100,
  baseUrl: 'https://api.example.com',
  defaultHeaders: {
    'User-Agent': 'MyApp/1.0',
    'Accept': 'application/json'
  }
});

// 连接池会自动管理连接复用
console.log(`连接池状态: ${pool.status}`);
console.log(`活跃连接: ${pool.activeConnections}/${pool.maxConnections}`);
console.log(`总请求数: ${pool.stats.totalRequests}`);
console.log(`平均响应时间: ${pool.stats.averageResponseTime}ms`);
```

### 数据解析器
```typescript
// CSV 解析
const csvResult = await CorsBypass.parseData({
  data: 'name,age,city\nJohn,25,NYC\nJane,30,LA',
  format: 'csv',
  options: { delimiter: ',' }
});

// XML 解析
const xmlResult = await CorsBypass.parseData({
  data: '<root><item id="1">Value</item></root>',
  format: 'xml',
  options: { 
    namespaces: { ns: 'http://example.com' }
  }
});

// JSON 路径提取
const jsonResult = await CorsBypass.parseData({
  data: '{"users": [{"name": "John"}, {"name": "Jane"}]}',
  format: 'json',
  options: { jsonPath: '$.users[*].name' }
});

// HTML 内容提取
const htmlResult = await CorsBypass.parseData({
  data: '<html><body><h1>Title</h1><p>Content</p></body></html>',
  format: 'html',
  options: { selector: 'h1, p' }
});

// Base64 解码
const base64Result = await CorsBypass.parseData({
  data: 'SGVsbG8gV29ybGQ=',
  format: 'base64',
  options: { encoding: 'utf-8' }
});
```

### WebSocket 增强
```typescript
const ws = await CorsBypass.createWebSocket({
  url: 'wss://api.example.com/ws',
  protocols: ['chat', 'notification'],
  headers: { 'Authorization': 'Bearer token' },
  timeout: 10000,
  reconnect: {
    enabled: true,
    maxAttempts: 5,
    delay: 1000,
    backoff: 'exponential'
  },
  heartbeatInterval: 30000  // 30秒心跳
});

// 监听 WebSocket 事件
CorsBypass.addListener('webSocketMessage', (data) => {
  console.log(`收到消息: ${data.message}`);
});

CorsBypass.addListener('webSocketReconnect', (data) => {
  console.log(`重连尝试: ${data.attempt}/${data.maxAttempts}`);
});

// 发送消息
await CorsBypass.sendWebSocketMessage({
  connectionId: ws.connectionId,
  message: JSON.stringify({ type: 'chat', content: 'Hello!' })
});
```

### 网络监控
```typescript
// 开始网络监控
const monitor = await CorsBypass.startNetworkMonitor({
  urlPatterns: [
    'https://api.example.com/*',
    'https://cdn.example.com/*'
  ],
  methods: ['GET', 'POST', 'PUT'],
  includeBodies: true,
  includeHeaders: true,
  maxRequests: 1000,
  duration: 300000  // 5分钟
});

// 监听网络事件
CorsBypass.addListener('networkRequest', (data) => {
  console.log(`请求: ${data.method} ${data.url}`);
  console.log(`状态: ${data.status}, 耗时: ${data.duration}ms`);
});

// 获取监控统计
console.log(`监控统计:`);
console.log(`总请求: ${monitor.stats.totalRequests}`);
console.log(`成功率: ${(monitor.stats.successfulRequests / monitor.stats.totalRequests * 100).toFixed(2)}%`);
console.log(`平均响应时间: ${monitor.stats.averageResponseTime}ms`);
console.log(`数据传输: ${(monitor.stats.totalDataTransferred / 1024 / 1024).toFixed(2)}MB`);

// 停止监控
await CorsBypass.stopNetworkMonitor();
```

### 智能缓存
```typescript
// 设置缓存
await CorsBypass.manageCache({
  operation: 'set',
  key: 'user_profile_123',
  value: {
    name: 'John Doe',
    email: 'john@example.com',
    preferences: { theme: 'dark' }
  },
  expiration: 3600000,  // 1小时过期
  namespace: 'user_data',
  compression: {
    enabled: true,
    algorithm: 'gzip'
  }
});

// 获取缓存
const cached = await CorsBypass.manageCache({
  operation: 'get',
  key: 'user_profile_123',
  namespace: 'user_data'
});

if (cached.hit) {
  console.log('缓存命中:', cached.value);
  console.log('过期时间:', cached.expiration);
} else {
  console.log('缓存未命中');
}

// 获取缓存统计
const stats = await CorsBypass.manageCache({
  operation: 'size',
  namespace: 'user_data'
});

console.log(`缓存统计:`);
console.log(`总键数: ${stats.stats.totalKeys}`);
console.log(`总大小: ${(stats.stats.totalSize / 1024).toFixed(2)}KB`);
console.log(`命中率: ${(stats.stats.hitRate * 100).toFixed(2)}%`);

// 清理过期缓存
await CorsBypass.manageCache({
  operation: 'clear',
  namespace: 'user_data'
});
```

### 代理服务器
```typescript
// 创建代理服务器
const server = await CorsBypass.createProxyServer({
  port: 8080,
  host: '0.0.0.0',
  enableCors: true,
  headers: {
    'X-Powered-By': 'CorsBypass',
    'X-Version': '1.0.0'
  },
  rateLimit: {
    maxRequests: 100,
    windowMs: 60000  // 每分钟最多100个请求
  }
});

console.log(`代理服务器运行在: ${server.url}`);
console.log(`服务器ID: ${server.serverId}`);

// 现在可以通过代理访问任何URL
// http://localhost:8080/proxy/https://api.example.com/data

### 高级协议支持
```typescript
// HTTP/2 多路复用请求
const http2Response = await CorsBypass.makeHTTP2Request({
  url: 'https://api.example.com/data',
  method: 'GET',
  multiplexing: true,
  priority: 1,
  weight: 16,
  serverPush: true,
  settings: {
    maxConcurrentStreams: 100,
    initialWindowSize: 65535,
    enablePush: true
  }
});

console.log(`HTTP/2 协议: ${http2Response.protocol}`);
console.log(`流 ID: ${http2Response.streamId}`);
console.log(`推送资源: ${http2Response.pushedResources?.length || 0} 个`);
console.log(`多路复用效率: ${http2Response.multiplexingStats?.streamEfficiency}%`);

// HTTP/3 (QUIC) 0-RTT 请求
const http3Response = await CorsBypass.makeHTTP3Request({
  url: 'https://api.example.com/data',
  method: 'GET',
  earlyData: true,
  connectionMigration: true,
  settings: {
    maxIdleTimeout: 30000,
    initialMaxData: 1048576,
    initialMaxStreamsBidi: 100
  }
});

console.log(`HTTP/3 协议: ${http3Response.protocol}`);
console.log(`连接 ID: ${http3Response.connectionId}`);
console.log(`0-RTT 使用: ${http3Response.earlyDataUsed ? '是' : '否'}`);
console.log(`RTT: ${http3Response.quicStats?.rtt}ms`);
console.log(`丢包率: ${http3Response.quicStats?.packetLoss}%`);

// gRPC 服务调用
const grpcResponse = await CorsBypass.callGRPC({
  url: 'https://grpc.api.example.com',
  service: 'UserService',
  method: 'GetUser',
  data: { userId: 123 },
  metadata: {
    'authorization': 'Bearer token',
    'x-request-id': 'req-123'
  },
  timeout: 10000,
  compression: 'gzip',
  tls: {
    enabled: true,
    insecure: false
  }
});

console.log(`gRPC 状态: ${grpcResponse.status}`);
console.log(`响应数据:`, grpcResponse.data);
console.log(`耗时: ${grpcResponse.duration}ms`);

// gRPC 流式调用
const grpcStream = await CorsBypass.callGRPC({
  url: 'https://grpc.api.example.com',
  service: 'ChatService',
  method: 'StreamChat',
  streaming: {
    type: 'bidirectional',
    bufferSize: 1024
  }
});

// 监听流式响应
CorsBypass.addListener('grpcStreamMessage', (data) => {
  console.log(`收到流消息:`, data.message);
});

// GraphQL 查询
const graphqlResponse = await CorsBypass.queryGraphQL({
  url: 'https://api.example.com/graphql',
  query: `
    query GetUser($id: ID!) {
      user(id: $id) {
        id
        name
        email
        posts {
          title
          content
          createdAt
        }
      }
    }
  `,
  variables: { id: '123' },
  headers: {
    'Authorization': 'Bearer token'
  },
  cache: {
    enabled: true,
    ttl: 300000,  // 5分钟缓存
    key: 'user_123'
  }
});

console.log(`GraphQL 查询结果:`, graphqlResponse.data);
console.log(`缓存命中: ${graphqlResponse.cache?.hit ? '是' : '否'}`);
console.log(`耗时: ${graphqlResponse.duration}ms`);

// GraphQL 变更
const mutationResponse = await CorsBypass.queryGraphQL({
  url: 'https://api.example.com/graphql',
  mutation: `
    mutation UpdateUser($id: ID!, $input: UserInput!) {
      updateUser(id: $id, input: $input) {
        id
        name
        email
        updatedAt
      }
    }
  `,
  variables: {
    id: '123',
    input: {
      name: 'John Doe',
      email: 'john@example.com'
    }
  }
});

// GraphQL 订阅
const subscription = await CorsBypass.subscribeGraphQL({
  url: 'wss://api.example.com/graphql',
  subscription: `
    subscription OnCommentAdded($postId: ID!) {
      commentAdded(postId: $postId) {
        id
        content
        author {
          name
        }
        createdAt
      }
    }
  `,
  variables: { postId: '456' },
  protocols: ['graphql-ws'],
  reconnect: {
    enabled: true,
    maxAttempts: 5,
    delay: 1000,
    backoff: 'exponential'
  }
});

// 监听订阅消息
CorsBypass.addListener('graphqlSubscription', (data) => {
  console.log(`收到订阅消息:`, data.data);
});

// 批量 GraphQL 操作
const batchResponse = await CorsBypass.queryGraphQL({
  url: 'https://api.example.com/graphql',
  batch: [
    {
      query: 'query GetUser($id: ID!) { user(id: $id) { name } }',
      variables: { id: '123' },
      operationName: 'GetUser'
    },
    {
      query: 'query GetPosts { posts { title } }',
      operationName: 'GetPosts'
    }
  ]
});

console.log(`批量操作结果:`, batchResponse.batchResults);
```

## 🎯 实际应用场景

### 1. 企业级 API 集成
```typescript
// 创建企业 API 连接池
const enterprisePool = await CorsBypass.createConnectionPool({
  maxConnections: 20,
  baseUrl: 'https://enterprise-api.com',
  defaultHeaders: {
    'Authorization': 'Bearer enterprise-token',
    'X-API-Version': '2.0'
  }
});

// 批量处理业务数据
const businessRequests = [
  { url: '/users', id: 'users', priority: 1 },
  { url: '/orders', id: 'orders', priority: 2 },
  { url: '/analytics', id: 'analytics', priority: 3 }
];

const results = await CorsBypass.batchRequests(businessRequests);
```

### 2. 大文件处理系统
```typescript
// 下载大型数据集
const datasetDownload = await CorsBypass.downloadFile({
  url: 'https://data.gov/dataset/large-dataset.csv',
  filePath: '/storage/datasets/data.csv',
  resume: true,
  maxSpeed: 2 * 1024 * 1024,  // 2MB/s
  progressInterval: 1024 * 1024  // 每1MB回调
});

// 解析下载的数据
const parsedData = await CorsBypass.parseData({
  data: await readFile('/storage/datasets/data.csv'),
  format: 'csv',
  options: { delimiter: ',' }
});

// 缓存处理结果
await CorsBypass.manageCache({
  operation: 'set',
  key: 'processed_dataset',
  value: parsedData.data,
  expiration: 24 * 60 * 60 * 1000,  // 24小时
  compression: { enabled: true, algorithm: 'gzip' }
});
```

### 3. 实时数据监控
```typescript
// 启动网络监控
const monitor = await CorsBypass.startNetworkMonitor({
  urlPatterns: ['https://api.monitoring.com/*'],
  includeBodies: true,
  maxRequests: 10000
});

// 创建 WebSocket 连接接收实时数据
const ws = await CorsBypass.createWebSocket({
  url: 'wss://realtime.monitoring.com/ws',
  reconnect: { enabled: true, maxAttempts: 10, delay: 5000 }
});

// 处理实时数据
CorsBypass.addListener('webSocketMessage', async (data) => {
  const parsed = await CorsBypass.parseData({
    data: data.message,
    format: 'json'
  });

  // 缓存重要数据
  if (parsed.data.priority === 'high') {
    await CorsBypass.manageCache({
      operation: 'set',
      key: `alert_${Date.now()}`,
      value: parsed.data,
      namespace: 'alerts'
    });
  }
});
```

### 4. 多媒体内容处理
```typescript
// 批量下载图片
const imageUrls = [
  'https://cdn.example.com/image1.jpg',
  'https://cdn.example.com/image2.jpg',
  'https://cdn.example.com/image3.jpg'
];

const downloadPromises = imageUrls.map((url, index) =>
  CorsBypass.downloadFile({
    url,
    filePath: `/storage/images/image_${index}.jpg`,
    maxSpeed: 1024 * 1024  // 1MB/s per image
  })
);

const downloads = await Promise.all(downloadPromises);

// 批量上传处理后的图片
const uploadPromises = downloads.map((download, index) =>
  CorsBypass.uploadFile({
    url: 'https://api.example.com/upload',
    filePath: download.filePath,
    fieldName: 'image',
    formData: { category: 'processed', index: index.toString() }
  })
);

await Promise.all(uploadPromises);

### 5. 高性能微服务通信
```typescript
// 使用 gRPC 进行微服务间通信
const userService = await CorsBypass.createGRPCConnection({
  url: 'https://user-service.internal:443',
  poolSize: 10,
  keepAlive: {
    enabled: true,
    timeout: 30000,
    interval: 5000,
    permitWithoutCalls: true
  },
  tls: { enabled: true, insecure: false },
  compression: { algorithm: 'gzip', level: 6 }
});

// 批量用户查询
const userRequests = userIds.map(id => ({
  service: 'UserService',
  method: 'GetUser',
  data: { userId: id },
  metadata: { 'x-trace-id': generateTraceId() }
}));

const users = await Promise.all(
  userRequests.map(req => CorsBypass.callGRPC(req))
);

// 实时聊天流
const chatStream = await CorsBypass.callGRPC({
  url: 'https://chat-service.internal:443',
  service: 'ChatService',
  method: 'StreamMessages',
  streaming: { type: 'bidirectional', bufferSize: 4096 },
  data: { roomId: 'room-123' }
});

CorsBypass.addListener('grpcStreamMessage', (message) => {
  // 处理实时消息
  broadcastToClients(message.data);
});
```

### 6. 现代 Web API 集成
```typescript
// GraphQL 联邦查询
const federatedQuery = await CorsBypass.queryGraphQL({
  url: 'https://api.example.com/graphql',
  query: `
    query GetUserWithPosts($userId: ID!) {
      user(id: $userId) @service(name: "users") {
        id
        name
        email
      }
      posts(userId: $userId) @service(name: "posts") {
        id
        title
        content
        comments @service(name: "comments") {
          id
          content
          author
        }
      }
    }
  `,
  variables: { userId: '123' },
  cache: { enabled: true, ttl: 60000 }
});

// HTTP/3 高速 API 调用
const http3Requests = await Promise.all([
  CorsBypass.makeHTTP3Request({
    url: 'https://api1.example.com/data',
    earlyData: true,
    connectionMigration: true
  }),
  CorsBypass.makeHTTP3Request({
    url: 'https://api2.example.com/data',
    earlyData: true,
    connectionMigration: true
  })
]);

console.log(`HTTP/3 平均 RTT: ${
  http3Requests.reduce((sum, r) => sum + r.quicStats.rtt, 0) / http3Requests.length
}ms`);

// GraphQL 实时订阅
const liveUpdates = await CorsBypass.subscribeGraphQL({
  url: 'wss://api.example.com/graphql',
  subscription: `
    subscription LiveMetrics {
      metrics {
        timestamp
        cpu
        memory
        network
      }
    }
  `,
  reconnect: { enabled: true, maxAttempts: 10, delay: 1000 }
});

CorsBypass.addListener('graphqlSubscription', (data) => {
  updateDashboard(data.data.metrics);
});
```
```

## 🔧 配置和优化

### 性能优化建议
```typescript
// 1. 合理设置连接池大小
const pool = await CorsBypass.createConnectionPool({
  maxConnections: Math.min(navigator.hardwareConcurrency * 2, 20),
  keepAliveTimeout: 30000
});

// 2. 使用缓存减少重复请求
const cacheKey = `api_data_${userId}_${timestamp}`;
let data = await CorsBypass.manageCache({
  operation: 'get',
  key: cacheKey
});

if (!data.hit) {
  const response = await CorsBypass.makeRequest({ url: apiUrl });
  await CorsBypass.manageCache({
    operation: 'set',
    key: cacheKey,
    value: response.data,
    expiration: 300000  // 5分钟缓存
  });
  data = response;
}

// 3. 批量处理减少开销
const batchSize = 10;
const batches = [];
for (let i = 0; i < requests.length; i += batchSize) {
  batches.push(requests.slice(i, i + batchSize));
}

for (const batch of batches) {
  await CorsBypass.batchRequests(batch);
  await new Promise(resolve => setTimeout(resolve, 100)); // 避免过载
}
```

### 错误处理最佳实践
```typescript
try {
  const result = await CorsBypass.batchRequests(requests);

  // 检查每个请求的结果
  const failed = result.filter(r => !r.success);
  if (failed.length > 0) {
    console.warn(`${failed.length} 个请求失败:`, failed);

    // 重试失败的请求
    const retryRequests = failed.map(f => ({
      ...requests.find(r => r.id === f.id),
      retry: { maxAttempts: 3, delay: 2000 }
    }));

    await CorsBypass.batchRequests(retryRequests);
  }
} catch (error) {
  console.error('批量请求失败:', error);

  // 降级到单个请求
  for (const request of requests) {
    try {
      await CorsBypass.makeRequest(request);
    } catch (singleError) {
      console.error(`单个请求失败: ${request.url}`, singleError);
    }
  }
}
```

## 📱 移动端特殊功能

### 网络状态适配
```typescript
// 监听网络状态变化
CorsBypass.addListener('networkStatusChange', (status) => {
  if (status.type === 'cellular') {
    // 移动网络下降低下载速度
    CorsBypass.downloadFile({
      url: fileUrl,
      filePath: localPath,
      maxSpeed: 256 * 1024  // 256KB/s
    });
  } else if (status.type === 'wifi') {
    // WiFi 下使用全速
    CorsBypass.downloadFile({
      url: fileUrl,
      filePath: localPath,
      maxSpeed: 0  // 无限制
    });
  }
});
```

### 电池优化
```typescript
// 根据电池状态调整网络活动
CorsBypass.addListener('batteryStatusChange', (battery) => {
  const isLowBattery = battery.level < 0.2;

  if (isLowBattery) {
    // 低电量时减少网络活动
    await CorsBypass.createConnectionPool({
      maxConnections: 2,  // 减少连接数
      timeout: 10000      // 缩短超时时间
    });
  }
});
```

## 🎉 总结

这个增强版的 Capacitor CORS Bypass 插件提供了：

### ✅ 完整的网络解决方案
- 基础 CORS 绕过
- 高级网络管理
- 文件传输
- 实时通信
- 数据处理
- 缓存管理
- 监控分析
- 现代协议支持 (HTTP/2, HTTP/3, gRPC, GraphQL)

### 🚀 企业级特性
- 连接池管理
- 批量处理
- 自动重试
- 性能监控
- 错误恢复
- 资源优化

### 📱 移动端优化
- 网络状态适配
- 电池优化
- 存储管理
- 进度跟踪

**这是一个真正的网络处理瑞士军刀，可以满足从简单的 API 调用到复杂的企业级数据处理的所有需求！** 🎯
```
