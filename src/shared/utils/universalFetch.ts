/**
 * 通用网络请求工具
 * 统一使用标准 fetch，支持移动端和Web端的流式输出
 */

// 移除Capacitor相关导入，统一使用Web端方式

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

  // 🔥 修复移动端流式输出问题：统一使用Web端方式，通过SDK连接
  // 移动端也使用标准fetch，避免CapacitorHttp导致的流式输出问题
  console.log(`[Universal Fetch] 使用标准 fetch 请求`);
  return await webFetch(urlString, fetchOptions, timeout);
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
 * 专门用于 MCP 服务器的请求函数
 * 自动处理 CORS 代理逻辑
 */
export async function mcpFetch(
  originalUrl: string,
  options: UniversalFetchOptions = {}
): Promise<Response> {
  // 🔥 统一使用标准fetch方式
  console.log(`[MCP Fetch] 统一请求: ${originalUrl}`);
  return await universalFetch(originalUrl, options);
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
  // 🔥 统一处理：检查是否跨域
  try {
    const urlObj = new URL(url);
    const currentOrigin = window.location.origin;
    return urlObj.origin !== currentOrigin;
  } catch {
    return false;
  }
}

/**
 * 获取适合当前平台的 URL
 */
export function getPlatformUrl(originalUrl: string): string {
  // 🔥 统一处理：根据是否跨域决定是否使用代理
  if (needsCORSProxy(originalUrl)) {
    // 跨域请求：返回代理 URL
    return `/api/cors-proxy?url=${encodeURIComponent(originalUrl)}`;
  } else {
    // 同域请求：返回原始 URL
    return originalUrl;
  }
}

/**
 * 日志记录函数
 */
export function logFetchUsage(originalUrl: string, finalUrl: string, method: string = 'GET') {
  console.log(`[Universal Fetch] ${method} ${originalUrl} -> ${finalUrl}`);
}
