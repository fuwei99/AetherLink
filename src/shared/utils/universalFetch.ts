/**
 * 通用网络请求工具
 * 移动端直接请求（已配置WebView跨域），Web端使用代理
 */

import { Capacitor } from '@capacitor/core';
import { NativeHttpService } from '../services/NativeHttpService';



export interface UniversalFetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
}

/**
 * 通用 fetch 函数，自动选择最佳的网络请求方式
 */
export async function universalFetch(
  url: string | URL,
  options: UniversalFetchOptions = {}
): Promise<Response> {
  const urlString = url.toString();
  const {
    timeout = 30000,
    retries = 3,
    ...fetchOptions
  } = options;

  console.log(`[Universal Fetch] 请求: ${urlString}`);

  // 移动端：检查是否需要使用原生HTTP
  if (Capacitor.isNativePlatform()) {
    const nativeHttpService = NativeHttpService.getInstance();
    if (nativeHttpService.shouldUseNativeHttp(urlString)) {
      console.log(`[Universal Fetch] 使用原生HTTP绕过CORS: ${urlString}`);
      const nativeResponse = await nativeHttpService.request(urlString, fetchOptions);

      // 将原生响应转换为标准Response对象
      return new Response(nativeResponse.data, {
        status: nativeResponse.status,
        statusText: nativeResponse.statusText,
        headers: new Headers(nativeResponse.headers)
      });
    }
  }

  // 检查是否需要使用CORS代理
  const finalUrl = getPlatformUrl(urlString);
  if (finalUrl !== urlString) {
    console.log(`[Universal Fetch] 使用CORS代理: ${urlString} -> ${finalUrl}`);
  }

  console.log(`[Universal Fetch] 使用标准 fetch 请求`);
  return await webFetch(finalUrl, fetchOptions, timeout);
}

// 移除不再使用的nativeFetch和createStreamingResponse函数

/**
 * Web 端标准请求
 */
async function webFetch(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  console.log(`[Universal Fetch] 使用标准 fetch 请求`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}



/**
 * 创建支持 CORS 绕过的 fetch 函数
 * 可以用来替换全局的 fetch
 */
export function createCORSFreeFetch() {
  return async (url: string | URL, init?: RequestInit): Promise<Response> => {
    return await universalFetch(url, init);
  };
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

    // 移动端：直接请求，不使用代理（WebView已配置跨域）
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
  //  统一处理：根据是否跨域决定是否使用代理
  if (needsCORSProxy(originalUrl)) {
    // 根据URL选择对应的代理
    if (originalUrl.includes('glama.ai')) {
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
  //  统一处理：根据是否跨域决定是否使用代理
  if (needsCORSProxy(originalUrl)) {
    // 根据URL选择对应的代理，返回完整URL
    const currentOrigin = window.location.origin;
    if (originalUrl.includes('glama.ai')) {
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
