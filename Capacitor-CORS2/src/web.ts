import { WebPlugin } from '@capacitor/core';

import type {
  CorsBypassPlugin,
  HttpRequestOptions,
  HttpResponse,
  HttpRequestResult,
  SSEOptions,
  SSEMessageEvent,
  SSEConnectionEvent,
  SSEErrorEvent,
  PluginListenerHandle,
  MCPTransportOptions,
  MCPTransport,
  MCPFetchFunction,
  WebSearchOptions,
  WebSearchResult,
  WebFetchOptions,
  WebFetchResult,
  ProxyServerOptions,
  ProxyServerResult,
  BatchRequestOptions,
  BatchRequestResult,
  DownloadOptions,
  DownloadResult,
  UploadOptions,
  UploadResult,
  ConnectionPoolOptions,
  ConnectionPoolResult,
  ParseDataOptions,
  ParseDataResult,
  WebSocketOptions,
  WebSocketResult,
  NetworkMonitorOptions,
  NetworkMonitorResult,
  CacheOptions,
  CacheResult,
  HTTP2RequestOptions,
  HTTP2RequestResult,
  HTTP3RequestOptions,
  HTTP3RequestResult,
  GRPCCallOptions,
  GRPCCallResult,
  GRPCConnectionOptions,
  GRPCConnectionResult,
  GraphQLOptions,
  GraphQLResult,
  GraphQLSubscriptionOptions,
  GraphQLSubscriptionResult,
} from './definitions.js';

export class CorsBypassWeb extends WebPlugin implements CorsBypassPlugin {
  private sseConnections: Map<string, EventSource> = new Map();
  private connectionCounter = 0;

  async request(options: HttpRequestOptions): Promise<HttpResponse> {
    return this.makeRequestInternal(options);
  }

  async get(options: HttpRequestOptions): Promise<HttpResponse> {
    return this.makeRequestInternal({ ...options, method: 'GET' });
  }

  async post(options: HttpRequestOptions): Promise<HttpResponse> {
    return this.makeRequestInternal({ ...options, method: 'POST' });
  }

  async put(options: HttpRequestOptions): Promise<HttpResponse> {
    return this.makeRequestInternal({ ...options, method: 'PUT' });
  }

  async patch(options: HttpRequestOptions): Promise<HttpResponse> {
    return this.makeRequestInternal({ ...options, method: 'PATCH' });
  }

  async delete(options: HttpRequestOptions): Promise<HttpResponse> {
    return this.makeRequestInternal({ ...options, method: 'DELETE' });
  }

  async makeRequest(options: HttpRequestOptions): Promise<HttpRequestResult> {
    const startTime = Date.now();

    try {
      const response = await this.makeRequestInternal(options);
      const duration = Date.now() - startTime;

      return {
        success: true,
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        url: response.url,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        success: false,
        data: null,
        status: 0,
        statusText: 'Error',
        headers: {},
        url: options.url,
        duration,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async makeRequestInternal(options: HttpRequestOptions): Promise<HttpResponse> {
    const {
      url,
      method = 'GET',
      headers = {},
      data,
      params,
      timeout = 30000,
      responseType = 'json',
      withCredentials = false,
    } = options;

    // Build URL with parameters
    let requestUrl = url;
    if (params) {
      const urlParams = new URLSearchParams(params);
      requestUrl += (url.includes('?') ? '&' : '?') + urlParams.toString();
    }

    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method,
      headers: new Headers(headers),
      credentials: withCredentials ? 'include' : 'same-origin',
    };

    // Add body for non-GET requests
    if (data && method !== 'GET') {
      if (typeof data === 'object') {
        fetchOptions.body = JSON.stringify(data);
        if (!headers['Content-Type']) {
          (fetchOptions.headers as Headers).set('Content-Type', 'application/json');
        }
      } else {
        fetchOptions.body = data;
      }
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    fetchOptions.signal = controller.signal;

    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(requestUrl, fetchOptions);
      clearTimeout(timeoutId);

      // Parse response based on responseType
      let responseData: any;
      switch (responseType) {
        case 'text':
          responseData = await response.text();
          break;
        case 'blob':
          responseData = await response.blob();
          break;
        case 'arraybuffer':
          responseData = await response.arrayBuffer();
          break;
        case 'json':
        default:
          try {
            responseData = await response.json();
          } catch {
            responseData = await response.text();
          }
          break;
      }

      // Convert headers to object
      const responseHeaders: { [key: string]: string } = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        url: response.url,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async startSSE(options: SSEOptions): Promise<{ connectionId: string }> {
    const connectionId = `sse_${++this.connectionCounter}`;
    const { url, headers = {}, withCredentials = false } = options;

    try {
      const eventSource = new EventSource(url, {
        withCredentials,
      });

      // Store the connection
      this.sseConnections.set(connectionId, eventSource);

      // Set up event listeners
      eventSource.onopen = () => {
        this.notifyListeners('sseOpen', {
          connectionId,
          status: 'connected',
        } as SSEConnectionEvent);
      };

      eventSource.onmessage = (event) => {
        this.notifyListeners('sseMessage', {
          connectionId,
          data: event.data,
          id: event.lastEventId,
        } as SSEMessageEvent);
      };

      eventSource.onerror = () => {
        this.notifyListeners('sseError', {
          connectionId,
          error: 'SSE connection error',
        } as SSEErrorEvent);
      };

      return { connectionId };
    } catch (error) {
      throw new Error(`Failed to start SSE connection: ${error}`);
    }
  }

  async stopSSE(options: { connectionId: string }): Promise<void> {
    const { connectionId } = options;
    const eventSource = this.sseConnections.get(connectionId);

    if (eventSource) {
      eventSource.close();
      this.sseConnections.delete(connectionId);
      
      this.notifyListeners('sseClose', {
        connectionId,
        status: 'disconnected',
      } as SSEConnectionEvent);
    }
  }

  async removeAllListeners(): Promise<void> {
    // Close all SSE connections
    for (const [connectionId, eventSource] of this.sseConnections) {
      eventSource.close();
      this.notifyListeners('sseClose', {
        connectionId,
        status: 'disconnected',
      } as SSEConnectionEvent);
    }
    this.sseConnections.clear();

    // Remove all event listeners
    super.removeAllListeners();
  }

  async createMCPTransport(options: MCPTransportOptions): Promise<MCPTransport> {
    return new MCPTransportImpl(options, this);
  }

  async createMCPFetch(): Promise<MCPFetchFunction> {
    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

      const response = await this.makeRequestInternal({
        url,
        method: (init?.method as any) || 'GET',
        headers: this.headersToObject(init?.headers),
        data: init?.body,
        responseType: 'text',
        withCredentials: init?.credentials === 'include',
      });

      // Create a Response-like object
      return new Response(response.data, {
        status: response.status,
        statusText: response.statusText,
        headers: new Headers(response.headers),
      });
    };
  }

  private headersToObject(headers?: HeadersInit): { [key: string]: string } {
    if (!headers) return {};

    if (headers instanceof Headers) {
      const obj: { [key: string]: string } = {};
      headers.forEach((value, key) => {
        obj[key] = value;
      });
      return obj;
    }

    if (Array.isArray(headers)) {
      const obj: { [key: string]: string } = {};
      headers.forEach(([key, value]) => {
        obj[key] = value;
      });
      return obj;
    }

    return headers as { [key: string]: string };
  }

  // Web 环境下的占位符实现 - 这些功能需要通过代理服务器实现
  async searchWeb(options: WebSearchOptions): Promise<WebSearchResult> {
    throw new Error('searchWeb is not implemented in web environment. Use a proxy server.');
  }

  async fetchWebContent(options: WebFetchOptions): Promise<WebFetchResult> {
    throw new Error('fetchWebContent is not implemented in web environment. Use a proxy server.');
  }

  async createProxyServer(options: ProxyServerOptions): Promise<ProxyServerResult> {
    throw new Error('createProxyServer is not available in web environment.');
  }

  async batchRequests(requests: BatchRequestOptions[]): Promise<BatchRequestResult[]> {
    const results: BatchRequestResult[] = [];

    for (const request of requests) {
      const startTime = Date.now();
      let attempts = 0;
      const maxAttempts = request.retry?.maxAttempts || 1;

      while (attempts < maxAttempts) {
        attempts++;
        try {
          const response = await this.makeRequest(request);
          results.push({
            id: request.id,
            success: response.success,
            data: response.data,
            status: response.status,
            headers: response.headers,
            duration: Date.now() - startTime,
            attempts,
          });
          break;
        } catch (error) {
          if (attempts >= maxAttempts) {
            results.push({
              id: request.id,
              success: false,
              error: error instanceof Error ? error.message : String(error),
              duration: Date.now() - startTime,
              attempts,
            });
          } else {
            // 等待重试延迟
            const delay = request.retry?.delay || 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    }

    return results;
  }

  async downloadFile(options: DownloadOptions): Promise<DownloadResult> {
    throw new Error('downloadFile is not available in web environment.');
  }

  async uploadFile(options: UploadOptions): Promise<UploadResult> {
    throw new Error('uploadFile is not available in web environment.');
  }

  async createConnectionPool(options: ConnectionPoolOptions): Promise<ConnectionPoolResult> {
    throw new Error('createConnectionPool is not available in web environment.');
  }

  async parseData(options: ParseDataOptions): Promise<ParseDataResult> {
    const startTime = Date.now();

    try {
      let parsedData: any;
      let dataType: 'object' | 'array' | 'string' | 'number' | 'boolean' = 'string';

      switch (options.format) {
        case 'json':
          parsedData = JSON.parse(options.data);
          dataType = Array.isArray(parsedData) ? 'array' : typeof parsedData as any;
          break;

        case 'base64':
          parsedData = atob(options.data);
          dataType = 'string';
          break;

        default:
          throw new Error(`Format ${options.format} is not supported in web environment`);
      }

      return {
        success: true,
        data: parsedData,
        dataType,
        itemCount: Array.isArray(parsedData) ? parsedData.length : undefined,
        metadata: {
          originalFormat: options.format,
          parseTime: Date.now() - startTime,
          dataSize: options.data.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        dataType: 'string',
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          originalFormat: options.format,
          parseTime: Date.now() - startTime,
          dataSize: options.data.length,
        },
      };
    }
  }

  async createWebSocket(options: WebSocketOptions): Promise<WebSocketResult> {
    throw new Error('createWebSocket is not implemented in web environment. Use native WebSocket API.');
  }

  async startNetworkMonitor(options: NetworkMonitorOptions): Promise<NetworkMonitorResult> {
    throw new Error('startNetworkMonitor is not available in web environment.');
  }

  async stopNetworkMonitor(): Promise<void> {
    throw new Error('stopNetworkMonitor is not available in web environment.');
  }

  async manageCache(options: CacheOptions): Promise<CacheResult> {
    // 简单的内存缓存实现
    const cache = (globalThis as any).__corsBypassCache || ((globalThis as any).__corsBypassCache = new Map());

    switch (options.operation) {
      case 'get':
        const value = cache.get(options.key);
        return {
          success: true,
          value: value?.data,
          hit: value !== undefined,
          expiration: value?.expiration,
        };

      case 'set':
        const expiration = options.expiration ? new Date(Date.now() + options.expiration).toISOString() : undefined;
        cache.set(options.key, { data: options.value, expiration });
        return { success: true };

      case 'delete':
        const deleted = cache.delete(options.key);
        return { success: deleted };

      case 'clear':
        cache.clear();
        return { success: true };

      case 'size':
        return { success: true, size: cache.size };

      case 'keys':
        return { success: true, keys: Array.from(cache.keys()) };

      default:
        return { success: false, error: 'Unknown cache operation' };
    }
  }

  async makeHTTP2Request(options: HTTP2RequestOptions): Promise<HTTP2RequestResult> {
    throw new Error('HTTP/2 is not directly available in web environment.');
  }

  async makeHTTP3Request(options: HTTP3RequestOptions): Promise<HTTP3RequestResult> {
    throw new Error('HTTP/3 is not directly available in web environment.');
  }

  async callGRPC(options: GRPCCallOptions): Promise<GRPCCallResult> {
    throw new Error('gRPC is not directly available in web environment.');
  }

  async queryGraphQL(options: GraphQLOptions): Promise<GraphQLResult> {
    const startTime = Date.now();

    try {
      const query = options.query || options.mutation;
      if (!query) {
        throw new Error('Query or mutation is required');
      }

      const response = await this.makeRequestInternal({
        url: options.url,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        data: {
          query,
          variables: options.variables,
          operationName: options.operationName,
        },
        timeout: options.timeout,
      });

      return {
        success: response.status >= 200 && response.status < 300,
        data: response.data.data,
        errors: response.data.errors,
        extensions: response.data.extensions,
        status: response.status,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        status: 0,
        duration: Date.now() - startTime,
        errors: [{ message: error instanceof Error ? error.message : String(error) }],
      };
    }
  }

  async createGRPCConnection(options: GRPCConnectionOptions): Promise<GRPCConnectionResult> {
    throw new Error('gRPC connections are not available in web environment.');
  }

  async subscribeGraphQL(options: GraphQLSubscriptionOptions): Promise<GraphQLSubscriptionResult> {
    throw new Error('GraphQL subscriptions are not implemented in web environment.');
  }
}

class MCPTransportImpl implements MCPTransport {
  private messageListeners: ((message: any) => void)[] = [];
  private errorListeners: ((error: any) => void)[] = [];
  private closeListeners: (() => void)[] = [];
  private sseConnectionId: string | null = null;
  private isListening = false;

  constructor(
    private options: MCPTransportOptions,
    private plugin: CorsBypassWeb
  ) {}

  async send(message: any): Promise<any> {
    try {
      const response = await this.plugin.post({
        url: `${this.options.baseUrl}/message`,
        headers: {
          'Content-Type': 'application/json',
          ...this.options.headers,
        },
        data: message,
        withCredentials: this.options.withCredentials,
        timeout: this.options.timeout,
      });

      return response.data;
    } catch (error) {
      this.errorListeners.forEach(listener => listener(error));
      throw error;
    }
  }

  async startListening(): Promise<void> {
    if (this.isListening) return;

    try {
      const result = await this.plugin.startSSE({
        url: `${this.options.baseUrl}/sse`,
        headers: this.options.headers,
        withCredentials: this.options.withCredentials,
      });

      this.sseConnectionId = result.connectionId;
      this.isListening = true;

      // Listen for SSE messages
      await this.plugin.addListener('sseMessage', (event) => {
        if (event.connectionId === this.sseConnectionId) {
          try {
            const message = JSON.parse(event.data);
            this.messageListeners.forEach(listener => listener(message));
          } catch (error) {
            this.errorListeners.forEach(listener => listener(error));
          }
        }
      });

      // Listen for SSE errors
      await this.plugin.addListener('sseError', (event) => {
        if (event.connectionId === this.sseConnectionId) {
          this.errorListeners.forEach(listener => listener(new Error(event.error)));
        }
      });

      // Listen for SSE close
      await this.plugin.addListener('sseClose', (event) => {
        if (event.connectionId === this.sseConnectionId) {
          this.isListening = false;
          this.closeListeners.forEach(listener => listener());
        }
      });

    } catch (error) {
      this.errorListeners.forEach(listener => listener(error));
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.sseConnectionId) {
      await this.plugin.stopSSE({ connectionId: this.sseConnectionId });
      this.sseConnectionId = null;
    }
    this.isListening = false;
    this.closeListeners.forEach(listener => listener());
  }

  onMessage(callback: (message: any) => void): void {
    this.messageListeners.push(callback);
  }

  onError(callback: (error: any) => void): void {
    this.errorListeners.push(callback);
  }

  onClose(callback: () => void): void {
    this.closeListeners.push(callback);
  }
}
