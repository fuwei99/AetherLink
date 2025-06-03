import { WebPlugin } from '@capacitor/core';

import type {
  CorsBypassPlugin,
  HttpRequestOptions,
  HttpResponse,
  SSEOptions,
  SSEMessageEvent,
  SSEConnectionEvent,
  SSEErrorEvent,
  PluginListenerHandle,
} from './definitions.js';

export class CorsBypassWeb extends WebPlugin implements CorsBypassPlugin {
  private sseConnections: Map<string, EventSource> = new Map();
  private connectionCounter = 0;

  async request(options: HttpRequestOptions): Promise<HttpResponse> {
    return this.makeRequest(options);
  }

  async get(options: HttpRequestOptions): Promise<HttpResponse> {
    return this.makeRequest({ ...options, method: 'GET' });
  }

  async post(options: HttpRequestOptions): Promise<HttpResponse> {
    return this.makeRequest({ ...options, method: 'POST' });
  }

  async put(options: HttpRequestOptions): Promise<HttpResponse> {
    return this.makeRequest({ ...options, method: 'PUT' });
  }

  async patch(options: HttpRequestOptions): Promise<HttpResponse> {
    return this.makeRequest({ ...options, method: 'PATCH' });
  }

  async delete(options: HttpRequestOptions): Promise<HttpResponse> {
    return this.makeRequest({ ...options, method: 'DELETE' });
  }

  private async makeRequest(options: HttpRequestOptions): Promise<HttpResponse> {
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
}
