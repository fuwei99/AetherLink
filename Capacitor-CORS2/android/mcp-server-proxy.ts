// MCP 服务器代理，用于在 Capacitor 应用中运行 MCP 服务器

import { CorsBypass } from 'capacitor-cors-bypass';

/**
 * MCP 服务器代理类
 * 将本地 MCP 服务器的功能通过 CORS Bypass 暴露给外部
 */
export class MCPServerProxy {
  private tools: Map<string, Function> = new Map();
  private resources: Map<string, Function> = new Map();
  private prompts: Map<string, Function> = new Map();

  /**
   * 注册工具
   */
  registerTool(name: string, handler: Function, schema?: any) {
    this.tools.set(name, handler);
    console.log(`Tool registered: ${name}`);
  }

  /**
   * 注册资源
   */
  registerResource(uri: string, handler: Function) {
    this.resources.set(uri, handler);
    console.log(`Resource registered: ${uri}`);
  }

  /**
   * 注册提示
   */
  registerPrompt(name: string, handler: Function, schema?: any) {
    this.prompts.set(name, handler);
    console.log(`Prompt registered: ${name}`);
  }

  /**
   * 处理 MCP 请求
   */
  async handleRequest(request: any): Promise<any> {
    const { method, params, id } = request;

    try {
      switch (method) {
        case 'initialize':
          return this.handleInitialize(id);

        case 'tools/list':
          return this.handleListTools(id);

        case 'tools/call':
          return await this.handleCallTool(params, id);

        case 'resources/list':
          return this.handleListResources(id);

        case 'resources/read':
          return await this.handleReadResource(params, id);

        case 'prompts/list':
          return this.handleListPrompts(id);

        case 'prompts/get':
          return await this.handleGetPrompt(params, id);

        default:
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Method not found: ${method}`
            }
          };
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: `Internal error: ${error.message}`
        }
      };
    }
  }

  private handleInitialize(id: number) {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: { listChanged: true },
          resources: { subscribe: true, listChanged: true },
          prompts: { listChanged: true }
        },
        serverInfo: {
          name: 'capacitor-mcp-server',
          version: '1.0.0'
        }
      }
    };
  }

  private handleListTools(id: number) {
    const tools = Array.from(this.tools.keys()).map(name => ({
      name,
      description: `Tool: ${name}`,
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      }
    }));

    return {
      jsonrpc: '2.0',
      id,
      result: { tools }
    };
  }

  private async handleCallTool(params: any, id: number) {
    const { name, arguments: args } = params;
    const handler = this.tools.get(name);

    if (!handler) {
      throw new Error(`Tool not found: ${name}`);
    }

    const result = await handler(args);
    return {
      jsonrpc: '2.0',
      id,
      result: {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result)
          }
        ]
      }
    };
  }

  private handleListResources(id: number) {
    const resources = Array.from(this.resources.keys()).map(uri => ({
      uri,
      name: uri.split('/').pop() || uri,
      description: `Resource: ${uri}`,
      mimeType: 'text/plain'
    }));

    return {
      jsonrpc: '2.0',
      id,
      result: { resources }
    };
  }

  private async handleReadResource(params: any, id: number) {
    const { uri } = params;
    const handler = this.resources.get(uri);

    if (!handler) {
      throw new Error(`Resource not found: ${uri}`);
    }

    const content = await handler();
    return {
      jsonrpc: '2.0',
      id,
      result: {
        contents: [
          {
            uri,
            mimeType: 'text/plain',
            text: typeof content === 'string' ? content : JSON.stringify(content)
          }
        ]
      }
    };
  }

  private handleListPrompts(id: number) {
    const prompts = Array.from(this.prompts.keys()).map(name => ({
      name,
      description: `Prompt: ${name}`,
      arguments: []
    }));

    return {
      jsonrpc: '2.0',
      id,
      result: { prompts }
    };
  }

  private async handleGetPrompt(params: any, id: number) {
    const { name, arguments: args } = params;
    const handler = this.prompts.get(name);

    if (!handler) {
      throw new Error(`Prompt not found: ${name}`);
    }

    const result = await handler(args);
    return {
      jsonrpc: '2.0',
      id,
      result: {
        description: `Prompt: ${name}`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result)
            }
          }
        ]
      }
    };
  }
}

/**
 * 创建一个完整的 MCP 服务器，集成 CORS Bypass
 */
export class CapacitorMCPServer {
  private proxy: MCPServerProxy;
  private externalApiUrl: string;

  constructor(externalApiUrl: string) {
    this.proxy = new MCPServerProxy();
    this.externalApiUrl = externalApiUrl;
    this.setupDefaultTools();
  }

  /**
   * 设置默认工具
   */
  private setupDefaultTools() {
    // HTTP 请求工具
    this.proxy.registerTool('http_request', async (args: any) => {
      const { url, method = 'GET', headers = {}, data } = args;
      
      const response = await CorsBypass.request({
        url,
        method: method as any,
        headers,
        data,
        timeout: 30000
      });

      return {
        status: response.status,
        headers: response.headers,
        data: response.data
      };
    });

    // 文件读取工具（通过 API）
    this.proxy.registerTool('read_file', async (args: any) => {
      const { path } = args;
      
      const response = await CorsBypass.get({
        url: `${this.externalApiUrl}/files/${encodeURIComponent(path)}`,
        headers: { 'Accept': 'text/plain' }
      });

      return response.data;
    });

    // 数据库查询工具
    this.proxy.registerTool('database_query', async (args: any) => {
      const { query, params = [] } = args;
      
      const response = await CorsBypass.post({
        url: `${this.externalApiUrl}/database/query`,
        data: { query, params },
        headers: { 'Content-Type': 'application/json' }
      });

      return response.data;
    });

    // 系统信息资源
    this.proxy.registerResource('system://info', async () => {
      const response = await CorsBypass.get({
        url: `${this.externalApiUrl}/system/info`
      });
      return response.data;
    });

    // 配置资源
    this.proxy.registerResource('config://app', async () => {
      const response = await CorsBypass.get({
        url: `${this.externalApiUrl}/config`
      });
      return response.data;
    });

    // 代码生成提示
    this.proxy.registerPrompt('generate_code', async (args: any) => {
      const { language, description } = args;
      return `Generate ${language} code for: ${description}`;
    });
  }

  /**
   * 处理来自外部的 MCP 请求
   */
  async handleExternalRequest(request: any): Promise<any> {
    return await this.proxy.handleRequest(request);
  }

  /**
   * 添加自定义工具
   */
  addTool(name: string, handler: Function, schema?: any) {
    this.proxy.registerTool(name, handler, schema);
  }

  /**
   * 添加自定义资源
   */
  addResource(uri: string, handler: Function) {
    this.proxy.registerResource(uri, handler);
  }

  /**
   * 添加自定义提示
   */
  addPrompt(name: string, handler: Function, schema?: any) {
    this.proxy.registerPrompt(name, handler, schema);
  }
}

/**
 * 使用示例
 */
export async function setupMCPServer() {
  const server = new CapacitorMCPServer('https://api.example.com');

  // 添加自定义工具
  server.addTool('calculate', async (args: any) => {
    const { operation, a, b } = args;
    switch (operation) {
      case 'add': return a + b;
      case 'subtract': return a - b;
      case 'multiply': return a * b;
      case 'divide': return a / b;
      default: throw new Error('Unknown operation');
    }
  });

  // 添加自定义资源
  server.addResource('weather://current', async () => {
    const response = await CorsBypass.get({
      url: 'https://api.weather.com/current',
      headers: { 'API-Key': 'your-api-key' }
    });
    return response.data;
  });

  return server;
}
