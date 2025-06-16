/**
 * 通用获取工具
 * 根据平台自动选择最适合的HTTP请求方式
 * - Web端：使用代理避免CORS问题
 * - 移动端：使用CorsBypass插件直接请求
 */

import { Capacitor } from '@capacitor/core';
import { CorsBypass } from 'capacitor-cors-bypass-enhanced';

// 请求选项接口
export interface UniversalFetchOptions extends RequestInit {
  timeout?: number;
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
}

// 响应接口，兼容标准Response
export interface UniversalResponse extends Response {
  data?: any;
}

/**
 * 通用fetch函数
 * @param url 请求URL
 * @param options 请求选项
 * @returns Promise<Response>
 */
export async function universalFetch(url: string, options: UniversalFetchOptions = {}): Promise<UniversalResponse> {
  const { timeout = 30000, responseType = 'json', ...fetchOptions } = options;

  // 移动端优先使用 CorsBypass 插件处理外部请求
  if (Capacitor.isNativePlatform()) {
    console.log('[Universal Fetch] 移动端使用 CorsBypass 插件:', url);
    
    try {
      const response = await CorsBypass.request({
        url,
        method: (fetchOptions.method || 'GET') as any,
        headers: extractHeaders(fetchOptions.headers),
        data: fetchOptions.body,
        timeout,
        responseType: responseType === 'json' ? 'json' : 'text'
      });

      // 创建兼容的Response对象
      const compatibleResponse = createCompatibleResponse(response, url);
      return compatibleResponse;

    } catch (error) {
      console.error('[Universal Fetch] CorsBypass 请求失败，回退到标准 fetch:', error);
      // 如果 CorsBypass 失败，回退到标准 fetch
      return standardFetch(url, { ...fetchOptions, timeout });
    }
  }

  // Web端使用标准fetch（可能通过代理）
  const finalUrl = getPlatformUrl(url);
  console.log('[Universal Fetch] Web端请求:', url, '->', finalUrl);
  return standardFetch(finalUrl, { ...fetchOptions, timeout });
}

/**
 * 从各种格式的headers中提取普通对象
 */
function extractHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {};

  if (headers instanceof Headers) {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  if (Array.isArray(headers)) {
    const result: Record<string, string> = {};
    headers.forEach(([key, value]) => {
      result[key] = value;
    });
    return result;
  }

  return headers as Record<string, string>;
}

/**
 * 创建兼容标准Response的对象
 */
function createCompatibleResponse(corsBypassResponse: any, originalUrl: string): UniversalResponse {
  const { data, status, statusText, headers } = corsBypassResponse;

  // 创建一个兼容的Response对象
  const response = new Response(typeof data === 'string' ? data : JSON.stringify(data), {
    status,
    statusText,
    headers: new Headers(headers)
  });

  // 添加额外的数据属性
  (response as UniversalResponse).data = data;

  return response as UniversalResponse;
}

/**
 * 标准fetch函数，带超时控制
 */
async function standardFetch(url: string, options: RequestInit & { timeout?: number }): Promise<UniversalResponse> {
  const { timeout = 30000, ...fetchOptions } = options;

  const controller = new AbortController();
  fetchOptions.signal = controller.signal;

  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);
    return response as UniversalResponse;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * 检查是否需要使用代理
 */
export function needsCORSProxy(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const currentOrigin = window.location.origin;

    // 本地地址不需要代理
    const hostname = urlObj.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
      console.log(`[Universal Fetch] 本地地址，不需要代理: ${url}`);
      return false;
    }

    // 移动端：直接请求，不使用代理（使用CorsBypass插件）
    if (Capacitor.isNativePlatform()) {
      console.log(`[Universal Fetch] 移动端，不使用代理: ${url}`);
      return false;
    }

    // Web端：跨域请求需要代理
    const needsProxy = urlObj.origin !== currentOrigin;
    console.log(`[Universal Fetch] Web端CORS检查: ${url} -> 当前域: ${currentOrigin} -> 需要代理: ${needsProxy}`);
    return needsProxy;
  } catch {
    console.log(`[Universal Fetch] URL解析失败，不使用代理: ${url}`);
    return false;
  }
}

/**
 * 获取适合当前平台的 URL
 */
export function getPlatformUrl(originalUrl: string): string {
  // 统一处理：根据是否跨域决定是否使用代理
  if (needsCORSProxy(originalUrl)) {
    // 根据URL选择对应的代理
    if (originalUrl.includes('api.notion.com')) {
      return originalUrl.replace('https://api.notion.com', '/api/notion');
    } else if (originalUrl.includes('glama.ai')) {
      return originalUrl.replace('https://glama.ai', '/api/mcp-glama');
    } else if (originalUrl.includes('mcp.api-inference.modelscope.net')) {
      return originalUrl.replace('https://mcp.api-inference.modelscope.net', '/api/mcp-modelscope');
    } else if (originalUrl.includes('router.mcp.so')) {
      return originalUrl.replace('https://router.mcp.so', '/api/mcp-router');
    }
    // 其他URL暂时直接返回（可以根据需要添加更多代理）
    return originalUrl;
  } else {
    // 不需要代理：返回原始 URL
    return originalUrl;
  }
}

/**
 * 获取完整的代理URL（用于需要完整URL的场景，如SSE）
 */
export function getFullProxyUrl(originalUrl: string): string {
  // 统一处理：根据是否跨域决定是否使用代理
  if (needsCORSProxy(originalUrl)) {
    // 根据URL选择对应的代理，返回完整URL
    const currentOrigin = window.location.origin;
    if (originalUrl.includes('api.notion.com')) {
      return originalUrl.replace('https://api.notion.com', `${currentOrigin}/api/notion`);
    } else if (originalUrl.includes('glama.ai')) {
      return originalUrl.replace('https://glama.ai', `${currentOrigin}/api/mcp-glama`);
    } else if (originalUrl.includes('mcp.api-inference.modelscope.net')) {
      return originalUrl.replace('https://mcp.api-inference.modelscope.net', `${currentOrigin}/api/mcp-modelscope`);
    } else if (originalUrl.includes('router.mcp.so')) {
      return originalUrl.replace('https://router.mcp.so', `${currentOrigin}/api/mcp-router`);
    }
    // 其他URL暂时直接返回
    return originalUrl;
  } else {
    // 不需要代理：返回原始 URL
    return originalUrl;
  }
}

/**
 * 日志记录函数
 */
export function logFetchUsage(originalUrl: string, finalUrl: string, method: string = 'GET') {
  console.log(`[Universal Fetch] ${method} ${originalUrl} -> ${finalUrl}`);
}
