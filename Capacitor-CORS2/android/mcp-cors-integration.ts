// MCP SDK 与 Capacitor CORS Bypass 插件集成示例

import { CorsBypass } from 'capacitor-cors-bypass';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

/**
 * 自定义 MCP Transport，使用 Capacitor CORS Bypass 插件
 */
export class CapacitorMCPTransport {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string, headers: Record<string, string> = {}) {
    this.baseUrl = baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
      ...headers
    };
  }

  /**
   * 发送 MCP 请求，绕过 CORS
   */
  async sendRequest(request: any): Promise<any> {
    try {
      const response = await CorsBypass.post({
        url: `${this.baseUrl}/mcp`,
        headers: this.headers,
        data: request,
        timeout: 30000,
        responseType: 'json'
      });

      if (response.status >= 400) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.data;
    } catch (error) {
      console.error('MCP request failed:', error);
      throw error;
    }
  }

  /**
   * 建立 SSE 连接，绕过 CORS
   */
  async startSSE(onMessage: (data: any) => void, onError: (error: any) => void): Promise<string> {
    try {
      const { connectionId } = await CorsBypass.startSSE({
        url: `${this.baseUrl}/sse`,
        headers: this.headers,
        withCredentials: true,
        reconnectTimeout: 5000
      });

      // 监听 SSE 消息
      await CorsBypass.addListener('sseMessage', (event) => {
        if (event.connectionId === connectionId) {
          try {
            const data = JSON.parse(event.data);
            onMessage(data);
          } catch (error) {
            console.error('Failed to parse SSE message:', error);
          }
        }
      });

      // 监听 SSE 错误
      await CorsBypass.addListener('sseError', (event) => {
        if (event.connectionId === connectionId) {
          onError(new Error(event.error));
        }
      });

      return connectionId;
    } catch (error) {
      console.error('Failed to start SSE:', error);
      throw error;
    }
  }

  /**
   * 停止 SSE 连接
   */
  async stopSSE(connectionId: string): Promise<void> {
    await CorsBypass.stopSSE({ connectionId });
  }
}

/**
 * MCP 客户端包装器，使用 CORS Bypass
 */
export class CapacitorMCPClient {
  private transport: CapacitorMCPTransport;
  private sseConnectionId?: string;

  constructor(baseUrl: string, headers?: Record<string, string>) {
    this.transport = new CapacitorMCPTransport(baseUrl, headers);
  }

  /**
   * 初始化 MCP 连接
   */
  async initialize(): Promise<any> {
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          roots: { listChanged: true },
          sampling: {}
        },
        clientInfo: {
          name: 'capacitor-mcp-client',
          version: '1.0.0'
        }
      }
    };

    return await this.transport.sendRequest(initRequest);
  }

  /**
   * 列出可用的工具
   */
  async listTools(): Promise<any> {
    const request = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list'
    };

    return await this.transport.sendRequest(request);
  }

  /**
   * 调用工具
   */
  async callTool(name: string, arguments_: Record<string, any>): Promise<any> {
    const request = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name,
        arguments: arguments_
      }
    };

    return await this.transport.sendRequest(request);
  }

  /**
   * 列出资源
   */
  async listResources(): Promise<any> {
    const request = {
      jsonrpc: '2.0',
      id: 4,
      method: 'resources/list'
    };

    return await this.transport.sendRequest(request);
  }

  /**
   * 读取资源
   */
  async readResource(uri: string): Promise<any> {
    const request = {
      jsonrpc: '2.0',
      id: 5,
      method: 'resources/read',
      params: { uri }
    };

    return await this.transport.sendRequest(request);
  }

  /**
   * 启动实时通知（SSE）
   */
  async startNotifications(onNotification: (data: any) => void): Promise<void> {
    this.sseConnectionId = await this.transport.startSSE(
      onNotification,
      (error) => console.error('SSE error:', error)
    );
  }

  /**
   * 停止实时通知
   */
  async stopNotifications(): Promise<void> {
    if (this.sseConnectionId) {
      await this.transport.stopSSE(this.sseConnectionId);
      this.sseConnectionId = undefined;
    }
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    await this.stopNotifications();
    await CorsBypass.removeAllListeners();
  }
}

/**
 * 使用示例
 */
export async function useMCPWithCORSBypass() {
  const client = new CapacitorMCPClient('https://api.example.com', {
    'Authorization': 'Bearer your-token'
  });

  try {
    // 初始化连接
    const initResult = await client.initialize();
    console.log('MCP initialized:', initResult);

    // 列出可用工具
    const tools = await client.listTools();
    console.log('Available tools:', tools);

    // 调用工具
    const result = await client.callTool('calculator', {
      operation: 'add',
      a: 5,
      b: 3
    });
    console.log('Tool result:', result);

    // 启动实时通知
    await client.startNotifications((notification) => {
      console.log('Received notification:', notification);
    });

    // 列出和读取资源
    const resources = await client.listResources();
    console.log('Available resources:', resources);

    if (resources.resources?.length > 0) {
      const resource = await client.readResource(resources.resources[0].uri);
      console.log('Resource content:', resource);
    }

  } catch (error) {
    console.error('MCP operation failed:', error);
  } finally {
    await client.cleanup();
  }
}
