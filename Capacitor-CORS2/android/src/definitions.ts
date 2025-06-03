export interface CorsBypassPlugin {
  /**
   * Make an HTTP request with CORS bypass
   */
  request(options: HttpRequestOptions): Promise<HttpResponse>;

  /**
   * Make a GET request with CORS bypass
   */
  get(options: HttpRequestOptions): Promise<HttpResponse>;

  /**
   * Make a POST request with CORS bypass
   */
  post(options: HttpRequestOptions): Promise<HttpResponse>;

  /**
   * Make a PUT request with CORS bypass
   */
  put(options: HttpRequestOptions): Promise<HttpResponse>;

  /**
   * Make a PATCH request with CORS bypass
   */
  patch(options: HttpRequestOptions): Promise<HttpResponse>;

  /**
   * Make a DELETE request with CORS bypass
   */
  delete(options: HttpRequestOptions): Promise<HttpResponse>;

  /**
   * Start listening to Server-Sent Events
   */
  startSSE(options: SSEOptions): Promise<{ connectionId: string }>;

  /**
   * Stop listening to Server-Sent Events
   */
  stopSSE(options: { connectionId: string }): Promise<void>;

  /**
   * Add a listener for SSE events
   */
  addListener(
    eventName: 'sseMessage',
    listenerFunc: (event: SSEMessageEvent) => void,
  ): Promise<PluginListenerHandle>;

  /**
   * Add a listener for SSE connection events
   */
  addListener(
    eventName: 'sseOpen',
    listenerFunc: (event: SSEConnectionEvent) => void,
  ): Promise<PluginListenerHandle>;

  /**
   * Add a listener for SSE error events
   */
  addListener(
    eventName: 'sseError',
    listenerFunc: (event: SSEErrorEvent) => void,
  ): Promise<PluginListenerHandle>;

  /**
   * Add a listener for SSE close events
   */
  addListener(
    eventName: 'sseClose',
    listenerFunc: (event: SSEConnectionEvent) => void,
  ): Promise<PluginListenerHandle>;

  /**
   * Remove all listeners for this plugin
   */
  removeAllListeners(): Promise<void>;
}

export interface HttpRequestOptions {
  /**
   * The URL to send the request to
   */
  url: string;

  /**
   * The HTTP method to use (GET, POST, PUT, DELETE, PATCH)
   */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

  /**
   * Request headers
   */
  headers?: { [key: string]: string };

  /**
   * Request body data
   */
  data?: any;

  /**
   * URL parameters
   */
  params?: { [key: string]: string };

  /**
   * Request timeout in milliseconds
   */
  timeout?: number;

  /**
   * Response type
   */
  responseType?: 'text' | 'json' | 'blob' | 'arraybuffer';

  /**
   * Whether to include credentials (cookies)
   */
  withCredentials?: boolean;
}

export interface HttpResponse {
  /**
   * Response data
   */
  data: any;

  /**
   * HTTP status code
   */
  status: number;

  /**
   * Status text
   */
  statusText: string;

  /**
   * Response headers
   */
  headers: { [key: string]: string };

  /**
   * Request URL
   */
  url: string;
}

export interface SSEOptions {
  /**
   * The URL to connect to for SSE
   */
  url: string;

  /**
   * Request headers
   */
  headers?: { [key: string]: string };

  /**
   * Whether to include credentials (cookies)
   */
  withCredentials?: boolean;

  /**
   * Reconnection timeout in milliseconds
   */
  reconnectTimeout?: number;
}

export interface SSEMessageEvent {
  /**
   * Connection ID
   */
  connectionId: string;

  /**
   * Event type
   */
  type?: string;

  /**
   * Event data
   */
  data: string;

  /**
   * Event ID
   */
  id?: string;

  /**
   * Retry timeout
   */
  retry?: number;
}

export interface SSEConnectionEvent {
  /**
   * Connection ID
   */
  connectionId: string;

  /**
   * Connection status
   */
  status: 'connected' | 'disconnected';
}

export interface SSEErrorEvent {
  /**
   * Connection ID
   */
  connectionId: string;

  /**
   * Error message
   */
  error: string;

  /**
   * Error code
   */
  code?: number;
}

export interface PluginListenerHandle {
  remove(): Promise<void>;
}
