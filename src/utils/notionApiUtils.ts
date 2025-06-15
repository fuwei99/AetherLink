/**
 * Notion API 工具函数
 * 统一处理API调用和错误处理
 */
import { toastManager } from '../components/EnhancedToast';
import { Toast } from '@capacitor/toast';
import { Capacitor } from '@capacitor/core';

// Notion API 配置
export const getNotionApiUrl = (endpoint: string): string => {
  // 简化环境判断逻辑
  const isDevelopment = process.env.NODE_ENV === 'development' || 
                       window.location.hostname === 'localhost' ||
                       window.location.hostname === '127.0.0.1';
  
  const baseUrl = isDevelopment ? '/api/notion' : 'https://api.notion.com';
  return `${baseUrl}${endpoint}`;
};

// 通用的Notion API请求函数
export const notionApiRequest = async (
  endpoint: string,
  options: {
    method: 'GET' | 'POST';
    apiKey: string;
    body?: any;
  }
): Promise<any> => {
  const url = getNotionApiUrl(endpoint);
  
  const response = await fetch(url, {
    method: options.method,
    headers: {
      'Authorization': `Bearer ${options.apiKey}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new NotionApiError(
      errorData.message || `HTTP ${response.status}: ${response.statusText}`,
      response.status,
      errorData.code
    );
  }

  return response.json();
};

// 自定义错误类
export class NotionApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'NotionApiError';
  }

  // 获取用户友好的错误信息
  getUserFriendlyMessage(): string {
    switch (this.status) {
      case 401:
        return 'API密钥无效，请检查配置';
      case 404:
        return '数据库不存在，请检查数据库ID';
      case 403:
        return '权限不足，请确保集成已连接到数据库';
      case 429:
        return '请求过于频繁，请稍后重试';
      case 500:
        return 'Notion服务器错误，请稍后重试';
      default:
        return this.message || '未知错误';
    }
  }
}

// 统一的成功提示函数
export const showSuccessMessage = async (message: string, url?: string): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    // 移动端使用原生Toast
    await Toast.show({
      text: message,
      duration: 'long'
    });

    // 如果有URL，可以考虑添加额外的操作按钮
    if (url) {
      console.log('Notion页面链接:', url);
    }
  } else {
    // Web端使用自定义Toast组件
    toastManager.success(message, '导出成功', {
      duration: 6000,
      action: url ? {
        label: '查看',
        onClick: () => window.open(url, '_blank')
      } : undefined
    });
  }
};

// 统一的错误提示函数
export const showErrorMessage = async (error: Error | NotionApiError): Promise<void> => {
  const message = error instanceof NotionApiError
    ? error.getUserFriendlyMessage()
    : error.message;

  if (Capacitor.isNativePlatform()) {
    // 移动端使用原生Toast
    await Toast.show({
      text: `操作失败: ${message}`,
      duration: 'long'
    });
  } else {
    // Web端使用自定义Toast组件
    toastManager.error(message, '操作失败', {
      duration: 8000 // 错误消息显示时间稍长
    });
  }
};
