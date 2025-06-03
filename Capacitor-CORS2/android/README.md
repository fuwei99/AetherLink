# Capacitor CORS Bypass Plugin

一个专为 Capacitor 7.2.0 设计的原生插件，用于解决 WebView 中的 CORS 问题，支持 HTTP 请求和 Server-Sent Events (SSE)。

## 功能特性

- ✅ 绕过 WebView 的 CORS 限制
- ✅ 支持所有 HTTP 方法 (GET, POST, PUT, DELETE, PATCH)
- ✅ 支持 Server-Sent Events (SSE)
- ✅ 自定义请求头和参数
- ✅ Cookie 和认证支持
- ✅ 超时设置
- ✅ 自动重连机制 (SSE)
- ✅ TypeScript 支持
- ✅ iOS 和 Android 原生实现

## 安装

```bash
npm install capacitor-cors-bypass
npx cap sync
```

## 配置

### iOS

在 `ios/App/App/AppDelegate.swift` 中注册插件：

```swift
import CapacitorCorsBypass

// 在 application(_:didFinishLaunchingWithOptions:) 方法中添加
self.window?.rootViewController = rootViewController
```

### Android

插件会自动注册，无需额外配置。

## 使用方法

### HTTP 请求

```typescript
import { CorsBypass } from 'capacitor-cors-bypass';

// GET 请求
const response = await CorsBypass.get({
  url: 'https://api.example.com/data',
  headers: {
    'Authorization': 'Bearer your-token',
    'Content-Type': 'application/json'
  },
  params: {
    page: '1',
    limit: '10'
  },
  timeout: 10000
});

// POST 请求
const postResponse = await CorsBypass.post({
  url: 'https://api.example.com/users',
  headers: {
    'Authorization': 'Bearer your-token'
  },
  data: {
    name: 'John Doe',
    email: 'john@example.com'
  }
});

// 通用请求
const customResponse = await CorsBypass.request({
  url: 'https://api.example.com/endpoint',
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer your-token'
  },
  data: { status: 'updated' },
  responseType: 'json',
  withCredentials: true
});
```

### Server-Sent Events (SSE)

```typescript
import { CorsBypass } from 'capacitor-cors-bypass';

// 开始 SSE 连接
const { connectionId } = await CorsBypass.startSSE({
  url: 'https://api.example.com/events',
  headers: {
    'Authorization': 'Bearer your-token'
  },
  withCredentials: true,
  reconnectTimeout: 5000 // 5秒重连
});

// 监听消息
await CorsBypass.addListener('sseMessage', (event) => {
  console.log('收到消息:', event.data);
  console.log('消息类型:', event.type);
  console.log('消息ID:', event.id);
});

// 监听连接状态
await CorsBypass.addListener('sseOpen', (event) => {
  console.log('连接已打开:', event.connectionId);
});

await CorsBypass.addListener('sseError', (event) => {
  console.error('连接错误:', event.error);
});

await CorsBypass.addListener('sseClose', (event) => {
  console.log('连接已关闭:', event.connectionId);
});

// 停止 SSE 连接
await CorsBypass.stopSSE({ connectionId });

// 清理所有监听器
await CorsBypass.removeAllListeners();
```

## API 文档

### HTTP 请求方法

#### `request(options: HttpRequestOptions): Promise<HttpResponse>`

发送 HTTP 请求。

#### `get(options: HttpRequestOptions): Promise<HttpResponse>`

发送 GET 请求。

#### `post(options: HttpRequestOptions): Promise<HttpResponse>`

发送 POST 请求。

#### `put(options: HttpRequestOptions): Promise<HttpResponse>`

发送 PUT 请求。

#### `patch(options: HttpRequestOptions): Promise<HttpResponse>`

发送 PATCH 请求。

#### `delete(options: HttpRequestOptions): Promise<HttpResponse>`

发送 DELETE 请求。

### SSE 方法

#### `startSSE(options: SSEOptions): Promise<{ connectionId: string }>`

开始 SSE 连接。

#### `stopSSE(options: { connectionId: string }): Promise<void>`

停止 SSE 连接。

### 事件监听

#### `addListener(eventName, listenerFunc): Promise<PluginListenerHandle>`

添加事件监听器。支持的事件：
- `sseMessage` - SSE 消息事件
- `sseOpen` - SSE 连接打开事件
- `sseError` - SSE 错误事件
- `sseClose` - SSE 连接关闭事件

#### `removeAllListeners(): Promise<void>`

移除所有事件监听器。

## 接口定义

### HttpRequestOptions

```typescript
interface HttpRequestOptions {
  url: string;                    // 请求 URL
  method?: string;                // HTTP 方法
  headers?: { [key: string]: string }; // 请求头
  data?: any;                     // 请求体数据
  params?: { [key: string]: string }; // URL 参数
  timeout?: number;               // 超时时间（毫秒）
  responseType?: string;          // 响应类型
  withCredentials?: boolean;      // 是否包含凭据
}
```

### HttpResponse

```typescript
interface HttpResponse {
  data: any;                      // 响应数据
  status: number;                 // HTTP 状态码
  statusText: string;             // 状态文本
  headers: { [key: string]: string }; // 响应头
  url: string;                    // 请求 URL
}
```

### SSEOptions

```typescript
interface SSEOptions {
  url: string;                    // SSE URL
  headers?: { [key: string]: string }; // 请求头
  withCredentials?: boolean;      // 是否包含凭据
  reconnectTimeout?: number;      // 重连超时（毫秒）
}
```

## 常见问题

### Q: 为什么需要这个插件？

A: Capacitor 应用在 WebView 中运行时会受到 CORS 策略限制，无法直接访问跨域资源。这个插件通过原生代码绕过了这些限制。

### Q: 支持哪些平台？

A: 目前支持 iOS 和 Android 平台，Web 平台使用标准的 fetch API。

### Q: 如何处理认证？

A: 可以通过 `headers` 参数传递认证信息，或者设置 `withCredentials: true` 来包含 cookies。

### Q: SSE 连接断开后会自动重连吗？

A: 是的，如果设置了 `reconnectTimeout`，插件会在连接断开后自动尝试重连。

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### 1.0.0
- 初始版本
- 支持 HTTP 请求和 SSE
- iOS 和 Android 原生实现
