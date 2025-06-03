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

  /**
   * Create an MCP-compatible transport that bypasses CORS
   */
  createMCPTransport(options: MCPTransportOptions): Promise<MCPTransport>;

  /**
   * Create a custom fetch function that bypasses CORS for MCP
   */
  createMCPFetch(): Promise<MCPFetchFunction>;

  /**
   * Search the web using SearXNG instances
   */
  searchWeb(options: WebSearchOptions): Promise<WebSearchResult>;

  /**
   * Fetch and extract content from a webpage
   */
  fetchWebContent(options: WebFetchOptions): Promise<WebFetchResult>;

  /**
   * Create a proxy server for bypassing CORS
   */
  createProxyServer(options: ProxyServerOptions): Promise<ProxyServerResult>;

  /**
   * Batch HTTP requests with automatic retry and rate limiting
   */
  batchRequests(requests: BatchRequestOptions[]): Promise<BatchRequestResult[]>;

  /**
   * Download file with progress tracking
   */
  downloadFile(options: DownloadOptions): Promise<DownloadResult>;

  /**
   * Upload file with progress tracking
   */
  uploadFile(options: UploadOptions): Promise<UploadResult>;

  /**
   * Create a persistent connection pool
   */
  createConnectionPool(options: ConnectionPoolOptions): Promise<ConnectionPoolResult>;

  /**
   * Parse and extract data from various formats
   */
  parseData(options: ParseDataOptions): Promise<ParseDataResult>;

  /**
   * Create a WebSocket connection that bypasses CORS
   */
  createWebSocket(options: WebSocketOptions): Promise<WebSocketResult>;

  /**
   * Monitor network requests and responses
   */
  startNetworkMonitor(options: NetworkMonitorOptions): Promise<NetworkMonitorResult>;

  /**
   * Stop network monitoring
   */
  stopNetworkMonitor(): Promise<void>;

  /**
   * Cache management for requests
   */
  manageCache(options: CacheOptions): Promise<CacheResult>;

  /**
   * Make HTTP/2 request with multiplexing support
   */
  makeHTTP2Request(options: HTTP2RequestOptions): Promise<HTTP2RequestResult>;

  /**
   * Make HTTP/3 (QUIC) request with 0-RTT support
   */
  makeHTTP3Request(options: HTTP3RequestOptions): Promise<HTTP3RequestResult>;

  /**
   * Call gRPC service method
   */
  callGRPC(options: GRPCCallOptions): Promise<GRPCCallResult>;

  /**
   * Execute GraphQL query or mutation
   */
  queryGraphQL(options: GraphQLOptions): Promise<GraphQLResult>;

  /**
   * Create persistent gRPC connection
   */
  createGRPCConnection(options: GRPCConnectionOptions): Promise<GRPCConnectionResult>;

  /**
   * Subscribe to GraphQL subscription
   */
  subscribeGraphQL(options: GraphQLSubscriptionOptions): Promise<GraphQLSubscriptionResult>;
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

export interface HttpRequestResult {
  /**
   * Success status
   */
  success: boolean;

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

  /**
   * Request duration in milliseconds
   */
  duration: number;

  /**
   * Error message (if failed)
   */
  error?: string;
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

export interface MCPTransportOptions {
  /**
   * Base URL for the MCP server
   */
  baseUrl: string;

  /**
   * Request headers for MCP communication
   */
  headers?: { [key: string]: string };

  /**
   * Whether to include credentials
   */
  withCredentials?: boolean;

  /**
   * Timeout for requests
   */
  timeout?: number;
}

export interface MCPTransport {
  /**
   * Send a message to the MCP server
   */
  send(message: any): Promise<any>;

  /**
   * Start listening for server messages
   */
  startListening(): Promise<void>;

  /**
   * Stop listening and close the transport
   */
  close(): Promise<void>;

  /**
   * Add a message listener
   */
  onMessage(callback: (message: any) => void): void;

  /**
   * Add an error listener
   */
  onError(callback: (error: any) => void): void;

  /**
   * Add a close listener
   */
  onClose(callback: () => void): void;
}

export interface MCPFetchFunction {
  (input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export interface WebSearchOptions {
  /**
   * Search query
   */
  query: string;

  /**
   * Search category
   */
  category?: 'general' | 'images' | 'videos' | 'news' | 'map' | 'music' | 'it' | 'science';

  /**
   * Language for search results
   */
  language?: string;

  /**
   * Response format
   */
  format?: 'json' | 'html';

  /**
   * Specific search engines to use
   */
  engines?: string;

  /**
   * Page number for pagination
   */
  page?: number;

  /**
   * Custom SearXNG instance URL
   */
  instanceUrl?: string;
}

export interface WebSearchResult {
  /**
   * Search query
   */
  query: string;

  /**
   * Search results
   */
  results: WebSearchResultItem[];

  /**
   * Total number of results
   */
  number_of_results: number;

  /**
   * Metadata about the search
   */
  meta?: {
    instance: string;
    query: string;
    category?: string;
    language?: string;
    timestamp: string;
    proxy?: string;
  };
}

export interface WebSearchResultItem {
  /**
   * Result title
   */
  title: string;

  /**
   * Result URL
   */
  url: string;

  /**
   * Result content/description
   */
  content?: string;

  /**
   * Search engine that provided this result
   */
  engine?: string;

  /**
   * Result index
   */
  index?: number;
}

export interface WebFetchOptions {
  /**
   * URL to fetch
   */
  url: string;

  /**
   * Type of content to extract
   */
  extract?: 'text' | 'title' | 'links' | 'images' | 'all';

  /**
   * Custom headers
   */
  headers?: { [key: string]: string };

  /**
   * Request timeout in seconds
   */
  timeout?: number;
}

export interface WebFetchResult {
  /**
   * Original URL
   */
  url: string;

  /**
   * HTTP status code
   */
  status: number;

  /**
   * Page title
   */
  title?: string;

  /**
   * Meta description
   */
  description?: string;

  /**
   * Extracted text content
   */
  content?: string;

  /**
   * Extracted links
   */
  links?: Array<{
    href: string;
    text: string;
  }>;

  /**
   * Extracted images
   */
  images?: Array<{
    src: string;
    alt: string;
  }>;

  /**
   * Timestamp of the fetch
   */
  timestamp: string;
}

export interface ProxyServerOptions {
  /**
   * Port to run the proxy server on
   */
  port?: number;

  /**
   * Host to bind the proxy server to
   */
  host?: string;

  /**
   * Enable CORS headers
   */
  enableCors?: boolean;

  /**
   * Custom headers to add to all responses
   */
  headers?: { [key: string]: string };

  /**
   * Rate limiting options
   */
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
}

export interface ProxyServerResult {
  /**
   * Server URL
   */
  url: string;

  /**
   * Server port
   */
  port: number;

  /**
   * Server status
   */
  status: 'running' | 'stopped' | 'error';

  /**
   * Server ID for management
   */
  serverId: string;
}

export interface BatchRequestOptions extends HttpRequestOptions {
  /**
   * Request ID for tracking
   */
  id?: string;

  /**
   * Priority (higher number = higher priority)
   */
  priority?: number;

  /**
   * Retry options
   */
  retry?: {
    maxAttempts: number;
    delay: number;
    backoff?: 'linear' | 'exponential';
  };
}

export interface BatchRequestResult {
  /**
   * Request ID
   */
  id?: string;

  /**
   * Request success status
   */
  success: boolean;

  /**
   * Response data (if successful)
   */
  data?: any;

  /**
   * Error message (if failed)
   */
  error?: string;

  /**
   * HTTP status code
   */
  status?: number;

  /**
   * Response headers
   */
  headers?: { [key: string]: string };

  /**
   * Request duration in milliseconds
   */
  duration: number;

  /**
   * Number of retry attempts made
   */
  attempts: number;
}

export interface DownloadOptions {
  /**
   * URL to download from
   */
  url: string;

  /**
   * Local file path to save to
   */
  filePath: string;

  /**
   * Custom headers
   */
  headers?: { [key: string]: string };

  /**
   * Progress callback interval in bytes
   */
  progressInterval?: number;

  /**
   * Resume download if file exists
   */
  resume?: boolean;

  /**
   * Maximum download speed in bytes per second
   */
  maxSpeed?: number;
}

export interface DownloadResult {
  /**
   * Download success status
   */
  success: boolean;

  /**
   * Local file path
   */
  filePath: string;

  /**
   * Total bytes downloaded
   */
  bytesDownloaded: number;

  /**
   * Total file size
   */
  totalSize: number;

  /**
   * Download duration in milliseconds
   */
  duration: number;

  /**
   * Average download speed in bytes per second
   */
  averageSpeed: number;

  /**
   * Error message (if failed)
   */
  error?: string;
}

export interface UploadOptions {
  /**
   * URL to upload to
   */
  url: string;

  /**
   * Local file path to upload
   */
  filePath: string;

  /**
   * HTTP method (POST, PUT, etc.)
   */
  method?: string;

  /**
   * Custom headers
   */
  headers?: { [key: string]: string };

  /**
   * Form field name for the file
   */
  fieldName?: string;

  /**
   * Additional form data
   */
  formData?: { [key: string]: string };

  /**
   * Progress callback interval in bytes
   */
  progressInterval?: number;

  /**
   * Maximum upload speed in bytes per second
   */
  maxSpeed?: number;
}

export interface UploadResult {
  /**
   * Upload success status
   */
  success: boolean;

  /**
   * Server response data
   */
  response?: any;

  /**
   * Total bytes uploaded
   */
  bytesUploaded: number;

  /**
   * Upload duration in milliseconds
   */
  duration: number;

  /**
   * Average upload speed in bytes per second
   */
  averageSpeed: number;

  /**
   * HTTP status code
   */
  status?: number;

  /**
   * Error message (if failed)
   */
  error?: string;
}

export interface ConnectionPoolOptions {
  /**
   * Maximum number of concurrent connections
   */
  maxConnections?: number;

  /**
   * Connection timeout in milliseconds
   */
  timeout?: number;

  /**
   * Keep-alive timeout in milliseconds
   */
  keepAliveTimeout?: number;

  /**
   * Maximum number of requests per connection
   */
  maxRequestsPerConnection?: number;

  /**
   * Base URL for the connection pool
   */
  baseUrl?: string;

  /**
   * Default headers for all requests
   */
  defaultHeaders?: { [key: string]: string };
}

export interface ConnectionPoolResult {
  /**
   * Pool ID for management
   */
  poolId: string;

  /**
   * Pool status
   */
  status: 'active' | 'inactive' | 'error';

  /**
   * Number of active connections
   */
  activeConnections: number;

  /**
   * Maximum connections allowed
   */
  maxConnections: number;

  /**
   * Pool statistics
   */
  stats: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
  };
}

export interface ParseDataOptions {
  /**
   * Data to parse
   */
  data: string;

  /**
   * Data format
   */
  format: 'json' | 'xml' | 'csv' | 'yaml' | 'html' | 'markdown' | 'base64';

  /**
   * Parsing options
   */
  options?: {
    /**
     * For CSV: delimiter character
     */
    delimiter?: string;

    /**
     * For HTML: CSS selector to extract
     */
    selector?: string;

    /**
     * For XML: namespace mappings
     */
    namespaces?: { [prefix: string]: string };

    /**
     * For JSON: path to extract (JSONPath)
     */
    jsonPath?: string;

    /**
     * Encoding for base64 data
     */
    encoding?: string;
  };
}

export interface ParseDataResult {
  /**
   * Parsing success status
   */
  success: boolean;

  /**
   * Parsed data
   */
  data?: any;

  /**
   * Data type of the result
   */
  dataType: 'object' | 'array' | 'string' | 'number' | 'boolean';

  /**
   * Number of items parsed (for arrays/objects)
   */
  itemCount?: number;

  /**
   * Error message (if failed)
   */
  error?: string;

  /**
   * Parsing metadata
   */
  metadata?: {
    originalFormat: string;
    parseTime: number;
    dataSize: number;
  };
}

export interface WebSocketOptions {
  /**
   * WebSocket URL
   */
  url: string;

  /**
   * WebSocket protocols
   */
  protocols?: string[];

  /**
   * Custom headers
   */
  headers?: { [key: string]: string };

  /**
   * Connection timeout in milliseconds
   */
  timeout?: number;

  /**
   * Auto-reconnect options
   */
  reconnect?: {
    enabled: boolean;
    maxAttempts: number;
    delay: number;
    backoff?: 'linear' | 'exponential';
  };

  /**
   * Ping/pong heartbeat interval in milliseconds
   */
  heartbeatInterval?: number;
}

export interface WebSocketResult {
  /**
   * WebSocket connection ID
   */
  connectionId: string;

  /**
   * Connection status
   */
  status: 'connecting' | 'connected' | 'disconnected' | 'error';

  /**
   * WebSocket URL
   */
  url: string;

  /**
   * Selected protocol
   */
  protocol?: string;

  /**
   * Connection statistics
   */
  stats: {
    messagesReceived: number;
    messagesSent: number;
    bytesReceived: number;
    bytesSent: number;
    connectionTime: number;
  };
}

export interface NetworkMonitorOptions {
  /**
   * Monitor specific URLs (patterns supported)
   */
  urlPatterns?: string[];

  /**
   * Monitor specific HTTP methods
   */
  methods?: string[];

  /**
   * Include request/response bodies
   */
  includeBodies?: boolean;

  /**
   * Include request/response headers
   */
  includeHeaders?: boolean;

  /**
   * Maximum number of requests to store
   */
  maxRequests?: number;

  /**
   * Monitor duration in milliseconds (0 = unlimited)
   */
  duration?: number;
}

export interface NetworkMonitorResult {
  /**
   * Monitor ID
   */
  monitorId: string;

  /**
   * Monitor status
   */
  status: 'active' | 'inactive' | 'error';

  /**
   * Number of requests monitored
   */
  requestCount: number;

  /**
   * Monitor start time
   */
  startTime: string;

  /**
   * Monitor statistics
   */
  stats: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    totalDataTransferred: number;
  };
}

export interface CacheOptions {
  /**
   * Cache operation
   */
  operation: 'get' | 'set' | 'delete' | 'clear' | 'size' | 'keys';

  /**
   * Cache key
   */
  key?: string;

  /**
   * Cache value (for set operation)
   */
  value?: any;

  /**
   * Cache expiration in milliseconds (for set operation)
   */
  expiration?: number;

  /**
   * Cache namespace
   */
  namespace?: string;

  /**
   * Compression options
   */
  compression?: {
    enabled: boolean;
    algorithm?: 'gzip' | 'deflate' | 'brotli';
  };
}

export interface CacheResult {
  /**
   * Operation success status
   */
  success: boolean;

  /**
   * Cache value (for get operation)
   */
  value?: any;

  /**
   * Cache size (for size operation)
   */
  size?: number;

  /**
   * Cache keys (for keys operation)
   */
  keys?: string[];

  /**
   * Cache hit/miss status
   */
  hit?: boolean;

  /**
   * Cache expiration time
   */
  expiration?: string;

  /**
   * Error message (if failed)
   */
  error?: string;

  /**
   * Cache statistics
   */
  stats?: {
    totalKeys: number;
    totalSize: number;
    hitRate: number;
    missRate: number;
  };
}

// HTTP/2 协议支持
export interface HTTP2RequestOptions extends HttpRequestOptions {
  /**
   * Enable HTTP/2 multiplexing
   */
  multiplexing?: boolean;

  /**
   * HTTP/2 stream priority (1-256)
   */
  priority?: number;

  /**
   * HTTP/2 stream weight (1-256)
   */
  weight?: number;

  /**
   * Enable server push
   */
  serverPush?: boolean;

  /**
   * HTTP/2 settings
   */
  settings?: {
    headerTableSize?: number;
    enablePush?: boolean;
    maxConcurrentStreams?: number;
    initialWindowSize?: number;
    maxFrameSize?: number;
    maxHeaderListSize?: number;
  };
}

export interface HTTP2RequestResult extends HttpRequestResult {
  /**
   * HTTP/2 protocol version
   */
  protocol: 'h2' | 'h2c';

  /**
   * Stream ID
   */
  streamId: number;

  /**
   * Server push resources
   */
  pushedResources?: Array<{
    url: string;
    headers: { [key: string]: string };
    data: string;
  }>;

  /**
   * Connection multiplexing stats
   */
  multiplexingStats?: {
    activeStreams: number;
    totalStreams: number;
    streamEfficiency: number;
  };
}

// HTTP/3 (QUIC) 协议支持
export interface HTTP3RequestOptions extends HttpRequestOptions {
  /**
   * Enable 0-RTT (early data)
   */
  earlyData?: boolean;

  /**
   * QUIC connection migration
   */
  connectionMigration?: boolean;

  /**
   * QUIC settings
   */
  settings?: {
    maxIdleTimeout?: number;
    maxUdpPayloadSize?: number;
    initialMaxData?: number;
    initialMaxStreamDataBidiLocal?: number;
    initialMaxStreamDataBidiRemote?: number;
    initialMaxStreamDataUni?: number;
    initialMaxStreamsBidi?: number;
    initialMaxStreamsUni?: number;
  };
}

export interface HTTP3RequestResult extends HttpRequestResult {
  /**
   * HTTP/3 protocol version
   */
  protocol: 'h3';

  /**
   * QUIC connection ID
   */
  connectionId: string;

  /**
   * 0-RTT status
   */
  earlyDataUsed: boolean;

  /**
   * QUIC performance metrics
   */
  quicStats?: {
    rtt: number;
    packetLoss: number;
    congestionWindow: number;
    bytesInFlight: number;
  };
}

// gRPC 协议支持
export interface GRPCCallOptions {
  /**
   * gRPC service URL
   */
  url: string;

  /**
   * Service name
   */
  service: string;

  /**
   * Method name
   */
  method: string;

  /**
   * Request data
   */
  data?: any;

  /**
   * gRPC metadata (headers)
   */
  metadata?: { [key: string]: string };

  /**
   * Request timeout in milliseconds
   */
  timeout?: number;

  /**
   * Enable streaming
   */
  streaming?: {
    type: 'client' | 'server' | 'bidirectional';
    bufferSize?: number;
  };

  /**
   * Compression algorithm
   */
  compression?: 'gzip' | 'deflate' | 'none';

  /**
   * TLS options
   */
  tls?: {
    enabled: boolean;
    cert?: string;
    key?: string;
    ca?: string;
    insecure?: boolean;
  };
}

export interface GRPCCallResult {
  /**
   * Success status
   */
  success: boolean;

  /**
   * Response data
   */
  data?: any;

  /**
   * gRPC status code
   */
  status: number;

  /**
   * Status message
   */
  message?: string;

  /**
   * Response metadata
   */
  metadata?: { [key: string]: string };

  /**
   * Request duration in milliseconds
   */
  duration: number;

  /**
   * Streaming information
   */
  streaming?: {
    streamId: string;
    messageCount: number;
    bytesTransferred: number;
  };

  /**
   * Error details (if failed)
   */
  error?: {
    code: number;
    message: string;
    details?: any;
  };
}

export interface GRPCConnectionOptions {
  /**
   * gRPC server URL
   */
  url: string;

  /**
   * Connection pool size
   */
  poolSize?: number;

  /**
   * Keep-alive settings
   */
  keepAlive?: {
    enabled: boolean;
    timeout: number;
    interval: number;
    permitWithoutCalls: boolean;
  };

  /**
   * Default metadata for all calls
   */
  defaultMetadata?: { [key: string]: string };

  /**
   * TLS configuration
   */
  tls?: {
    enabled: boolean;
    cert?: string;
    key?: string;
    ca?: string;
    insecure?: boolean;
  };

  /**
   * Compression settings
   */
  compression?: {
    algorithm: 'gzip' | 'deflate' | 'none';
    level?: number;
  };
}

export interface GRPCConnectionResult {
  /**
   * Connection ID
   */
  connectionId: string;

  /**
   * Connection status
   */
  status: 'connected' | 'connecting' | 'disconnected' | 'error';

  /**
   * Server URL
   */
  url: string;

  /**
   * Connection statistics
   */
  stats: {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    averageResponseTime: number;
    activeStreams: number;
  };

  /**
   * Supported services
   */
  services?: Array<{
    name: string;
    methods: string[];
  }>;
}

// GraphQL 协议支持
export interface GraphQLOptions {
  /**
   * GraphQL endpoint URL
   */
  url: string;

  /**
   * GraphQL query string
   */
  query?: string;

  /**
   * GraphQL mutation string
   */
  mutation?: string;

  /**
   * Query/mutation variables
   */
  variables?: { [key: string]: any };

  /**
   * Operation name (for multiple operations)
   */
  operationName?: string;

  /**
   * Custom headers
   */
  headers?: { [key: string]: string };

  /**
   * Request timeout in milliseconds
   */
  timeout?: number;

  /**
   * Enable query caching
   */
  cache?: {
    enabled: boolean;
    ttl?: number;
    key?: string;
  };

  /**
   * Batch multiple operations
   */
  batch?: GraphQLOperation[];
}

export interface GraphQLOperation {
  /**
   * Operation query/mutation
   */
  query: string;

  /**
   * Operation variables
   */
  variables?: { [key: string]: any };

  /**
   * Operation name
   */
  operationName?: string;
}

export interface GraphQLResult {
  /**
   * Success status
   */
  success: boolean;

  /**
   * GraphQL response data
   */
  data?: any;

  /**
   * GraphQL errors
   */
  errors?: Array<{
    message: string;
    locations?: Array<{
      line: number;
      column: number;
    }>;
    path?: Array<string | number>;
    extensions?: { [key: string]: any };
  }>;

  /**
   * Response extensions
   */
  extensions?: { [key: string]: any };

  /**
   * HTTP status code
   */
  status: number;

  /**
   * Request duration in milliseconds
   */
  duration: number;

  /**
   * Cache information
   */
  cache?: {
    hit: boolean;
    key?: string;
    ttl?: number;
  };

  /**
   * Batch results (if batched)
   */
  batchResults?: GraphQLResult[];
}

export interface GraphQLSubscriptionOptions {
  /**
   * GraphQL subscription endpoint URL (usually WebSocket)
   */
  url: string;

  /**
   * Subscription query string
   */
  subscription: string;

  /**
   * Subscription variables
   */
  variables?: { [key: string]: any };

  /**
   * Custom headers
   */
  headers?: { [key: string]: string };

  /**
   * WebSocket subprotocols
   */
  protocols?: string[];

  /**
   * Connection timeout in milliseconds
   */
  timeout?: number;

  /**
   * Auto-reconnect settings
   */
  reconnect?: {
    enabled: boolean;
    maxAttempts: number;
    delay: number;
    backoff?: 'linear' | 'exponential';
  };

  /**
   * Heartbeat settings
   */
  heartbeat?: {
    enabled: boolean;
    interval: number;
    message?: string;
  };
}

export interface GraphQLSubscriptionResult {
  /**
   * Subscription ID
   */
  subscriptionId: string;

  /**
   * Connection status
   */
  status: 'connecting' | 'connected' | 'disconnected' | 'error';

  /**
   * WebSocket URL
   */
  url: string;

  /**
   * Subscription query
   */
  subscription: string;

  /**
   * Connection statistics
   */
  stats: {
    messagesReceived: number;
    messagesSent: number;
    connectionTime: number;
    lastMessageTime?: string;
  };

  /**
   * Error information (if failed)
   */
  error?: {
    code: number;
    message: string;
    details?: any;
  };
}
