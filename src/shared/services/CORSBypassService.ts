/**
 * CORS 绕过服务
 * 使用 capacitor-cors-bypass-enhanced 插件在移动端绕过 CORS 限制
 */

import { Capacitor } from '@capacitor/core';
import { CorsBypass } from 'capacitor-cors-bypass-enhanced';
import LoggerService from './LoggerService';

// 请求配置接口
export interface CORSBypassRequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  data?: any;
  timeout?: number;
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
}

// 响应接口
export interface CORSBypassResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  url: string;
  success: boolean;
  duration?: number;
}



/**
 * CORS 绕过服务类
 */
export class CORSBypassService {
  private static instance: CORSBypassService;

  private constructor() {}

  public static getInstance(): CORSBypassService {
    if (!CORSBypassService.instance) {
      CORSBypassService.instance = new CORSBypassService();
    }
    return CORSBypassService.instance;
  }

  /**
   * 检查是否在移动端并且插件可用
   */
  public isAvailable(): boolean {
    return Capacitor.isNativePlatform() && !!CorsBypass;
  }

  /**
   * 执行 HTTP 请求
   */
  public async request<T = any>(options: CORSBypassRequestOptions): Promise<CORSBypassResponse<T>> {
    const startTime = Date.now();
    const {
      url,
      method = 'GET',
      headers = {},
      data,
      timeout = 30000,
      responseType = 'json'
    } = options;

    LoggerService.log('DEBUG', `[CORS Bypass] 开始请求: ${method} ${url}`, {
      method,
      url,
      headers,
      timeout
    });

    if (!this.isAvailable()) {
      throw new Error('CORS Bypass 服务不可用，请检查插件安装');
    }

    try {
      // 构建请求配置
      const requestConfig = {
        url,
        method: method as any,
        headers: this.prepareHeaders(headers),
        data: this.serializeData(data),
        timeout,
        responseType: this.validateResponseType(responseType)
      };

      // 执行请求
      const response = await CorsBypass.request(requestConfig);
      const duration = Date.now() - startTime;

      LoggerService.log('INFO', `[CORS Bypass] 请求成功: ${method} ${url} (${duration}ms)`, {
        status: response.status,
        duration
      });

      return {
        data: response.data,
        status: response.status,
        statusText: response.statusText || 'OK',
        headers: response.headers || {},
        url: response.url || url,
        success: true,
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;

      LoggerService.log('ERROR', `[CORS Bypass] 请求失败: ${method} ${url} (${duration}ms)`, {
        error: error.message,
        duration
      });

      // 统一错误格式
      throw this.createError(error, url, duration);
    }
  }

  /**
   * GET 请求
   */
  public async get<T = any>(url: string, options: Omit<CORSBypassRequestOptions, 'url' | 'method'> = {}): Promise<CORSBypassResponse<T>> {
    return this.request<T>({ ...options, url, method: 'GET' });
  }

  /**
   * POST 请求
   */
  public async post<T = any>(url: string, data?: any, options: Omit<CORSBypassRequestOptions, 'url' | 'method' | 'data'> = {}): Promise<CORSBypassResponse<T>> {
    return this.request<T>({ ...options, url, method: 'POST', data });
  }

  /**
   * PUT 请求
   */
  public async put<T = any>(url: string, data?: any, options: Omit<CORSBypassRequestOptions, 'url' | 'method' | 'data'> = {}): Promise<CORSBypassResponse<T>> {
    return this.request<T>({ ...options, url, method: 'PUT', data });
  }

  /**
   * DELETE 请求
   */
  public async delete<T = any>(url: string, options: Omit<CORSBypassRequestOptions, 'url' | 'method'> = {}): Promise<CORSBypassResponse<T>> {
    return this.request<T>({ ...options, url, method: 'DELETE' });
  }



  /**
   * 准备请求头
   */
  private prepareHeaders(headers: Record<string, string>): Record<string, string> {
    const defaultHeaders = {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'User-Agent': 'AetherLink-Mobile/1.0'
    };

    return {
      ...defaultHeaders,
      ...headers
    };
  }

  /**
   * 创建统一的错误对象
   */
  private createError(originalError: any, url: string, duration: number): Error {
    const error = new Error();
    error.name = 'CORSBypassError';

    // 根据错误类型提供友好的错误信息
    if (originalError.message?.includes('timeout')) {
      error.message = `请求超时: ${url}`;
    } else if (originalError.message?.includes('network')) {
      error.message = `网络连接失败: ${url}`;
    } else if (originalError.message?.includes('404')) {
      error.message = `资源未找到: ${url}`;
    } else if (originalError.message?.includes('401')) {
      error.message = `身份验证失败: ${url}`;
    } else if (originalError.message?.includes('403')) {
      error.message = `访问被拒绝: ${url}`;
    } else {
      error.message = originalError.message || `请求失败: ${url}`;
    }

    // 添加额外信息
    (error as any).originalError = originalError;
    (error as any).url = url;
    (error as any).duration = duration;

    return error;
  }

  /**
   * 序列化数据，保护非JSON数据不被破坏
   */
  private serializeData(data: any): string | undefined {
    if (data === null || data === undefined) {
      return undefined;
    }

    // 如果已经是字符串，直接返回
    if (typeof data === 'string') {
      return data;
    }

    // 如果是Buffer、ArrayBuffer、Blob等二进制数据，转换为字符串
    if (data instanceof ArrayBuffer) {
      return new TextDecoder().decode(data);
    }

    if (data instanceof Uint8Array) {
      return new TextDecoder().decode(data);
    }

    // 如果是FormData，不能直接序列化，抛出错误提示
    if (data instanceof FormData) {
      throw new Error('FormData is not supported by CORS bypass plugin. Please convert to JSON object.');
    }

    // 如果是Blob，不能直接序列化，抛出错误提示  
    if (data instanceof Blob) {
      throw new Error('Blob is not supported by CORS bypass plugin. Please convert to appropriate format.');
    }

    // 对于普通对象，使用JSON序列化
    try {
      return JSON.stringify(data);
    } catch (error) {
      throw new Error(`Failed to serialize data: ${error}`);
    }
  }

  /**
   * 验证并返回有效的响应类型
   */
  private validateResponseType(responseType: 'json' | 'text' | 'blob' | 'arraybuffer'): 'json' | 'text' | 'blob' | 'arraybuffer' {
    const validTypes: Array<'json' | 'text' | 'blob' | 'arraybuffer'> = ['json', 'text', 'blob', 'arraybuffer'];
    
    if (validTypes.includes(responseType)) {
      return responseType;
    }
    
    // 如果类型无效，默认为text，同时记录警告
    LoggerService.log('WARN', `[CORS Bypass] 无效的响应类型: ${responseType}，回退到 'text'`);
    return 'text';
  }

}

// 导出单例实例
export const corsService = CORSBypassService.getInstance(); 