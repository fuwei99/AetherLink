/**
 * CORS 绕过测试工具
 * 用于验证移动端 CORS 绕过功能是否正常工作
 */

import { Capacitor } from '@capacitor/core';
import { corsService } from '../shared/services/CORSBypassService';
import { notionApiRequest } from './notionApiUtils';
import { Toast } from '@capacitor/toast';

export interface CORSTestResult {
  test: string;
  success: boolean;
  message: string;
  duration?: number;
  details?: any;
}

/**
 * 运行 CORS 绕过测试套件
 */
export async function runCORSTests(): Promise<CORSTestResult[]> {
  const results: CORSTestResult[] = [];

  console.log('[CORS Test] 开始运行 CORS 绕过测试套件...');

  // 测试1: 检查插件可用性
  results.push(await testPluginAvailability());

  // 测试2: 简单的 GET 请求测试
  results.push(await testSimpleGetRequest());

  // 测试3: Notion API 连接测试
  results.push(await testNotionApiConnection());

  // 测试4: 网络状态检查
  results.push(await testNetworkStatus());

  // 汇总结果
  const successCount = results.filter(r => r.success).length;
  console.log(`[CORS Test] 测试完成: ${successCount}/${results.length} 个测试通过`);

  // 移动端显示测试结果
  if (Capacitor.isNativePlatform()) {
    await Toast.show({
      text: `CORS测试完成: ${successCount}/${results.length} 通过`,
      duration: 'long',
      position: 'bottom'
    });
  }

  return results;
}

/**
 * 测试插件可用性
 */
async function testPluginAvailability(): Promise<CORSTestResult> {
  try {
    const isAvailable = corsService.isAvailable();
    
    return {
      test: '插件可用性检查',
      success: isAvailable,
      message: isAvailable 
        ? '✅ CORS Bypass 插件已正确加载' 
        : '❌ CORS Bypass 插件不可用'
    };
  } catch (error: any) {
    return {
      test: '插件可用性检查',
      success: false,
      message: `❌ 插件检查失败: ${error.message}`
    };
  }
}

/**
 * 测试简单的 GET 请求
 */
async function testSimpleGetRequest(): Promise<CORSTestResult> {
  if (!corsService.isAvailable()) {
    return {
      test: '简单GET请求测试',
      success: false,
      message: '❌ 插件不可用，跳过测试'
    };
  }

  try {
    const startTime = Date.now();
    
    // 使用一个公开的 API 进行测试
    const response = await corsService.get('https://httpbin.org/get', {
      timeout: 10000
    });

    const duration = Date.now() - startTime;

    return {
      test: '简单GET请求测试',
      success: response.success && response.status === 200,
      message: response.success 
        ? `✅ GET 请求成功 (${duration}ms)` 
        : `❌ GET 请求失败: ${response.status}`,
      duration,
      details: {
        status: response.status,
        url: response.url
      }
    };
  } catch (error: any) {
    return {
      test: '简单GET请求测试',
      success: false,
      message: `❌ GET 请求异常: ${error.message}`
    };
  }
}

/**
 * 测试 Notion API 连接
 */
async function testNotionApiConnection(): Promise<CORSTestResult> {
  if (!corsService.isAvailable()) {
    return {
      test: 'Notion API连接测试',
      success: false,
      message: '❌ 插件不可用，跳过测试'
    };
  }

  try {
    const startTime = Date.now();
    
    // 测试 Notion API 的基本连通性（会返回401，但能证明网络可达）
    try {
      await corsService.get('https://api.notion.com/v1/users/me', {
        timeout: 10000,
        headers: {
          'Authorization': 'Bearer test_key',
          'Notion-Version': '2022-06-28'
        }
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      // 401 错误表示请求到达了服务器，这是预期的（因为我们使用了假的 token）
      if (error.message?.includes('401') || error.message?.includes('身份验证失败')) {
        return {
          test: 'Notion API连接测试',
          success: true,
          message: `✅ Notion API 可达 (${duration}ms，预期的401错误)`,
          duration,
          details: {
            note: '401错误是预期的，因为使用了测试token'
          }
        };
      }
      
      throw error; // 其他错误重新抛出
    }

    // 如果没有抛出错误，这是意外的
    return {
      test: 'Notion API连接测试',
      success: false,
      message: '❌ 意外的成功响应（使用测试token不应该成功）'
    };

  } catch (error: any) {
    return {
      test: 'Notion API连接测试',
      success: false,
      message: `❌ Notion API 连接失败: ${error.message}`
    };
  }
}

/**
 * 测试网络状态
 */
async function testNetworkStatus(): Promise<CORSTestResult> {
  if (!corsService.isAvailable()) {
    return {
      test: '网络状态检查',
      success: false,
      message: '❌ 插件不可用，跳过测试'
    };
  }

  try {
    const startTime = Date.now();
    const networkStatus = await corsService.checkNetworkStatus();
    const duration = Date.now() - startTime;

    return {
      test: '网络状态检查',
      success: networkStatus,
      message: networkStatus 
        ? `✅ 网络连接正常 (${duration}ms)` 
        : `❌ 网络连接异常`,
      duration
    };
  } catch (error: any) {
    return {
      test: '网络状态检查',
      success: false,
      message: `❌ 网络检查失败: ${error.message}`
    };
  }
}

/**
 * 测试完整的 Notion API 工作流
 */
export async function testNotionWorkflow(apiKey: string, databaseId: string): Promise<CORSTestResult> {
  if (!apiKey || !databaseId) {
    return {
      test: 'Notion工作流测试',
      success: false,
      message: '❌ 需要提供 API Key 和数据库 ID'
    };
  }

  try {
    const startTime = Date.now();
    
    // 使用真实的 API Key 测试数据库访问
    const data = await notionApiRequest(`/v1/databases/${databaseId}`, {
      method: 'GET',
      apiKey
    });
    
    const duration = Date.now() - startTime;

    return {
      test: 'Notion工作流测试',
      success: true,
      message: `✅ Notion 数据库访问成功 (${duration}ms)`,
      duration,
      details: {
        databaseTitle: data.title?.[0]?.plain_text || '未命名数据库',
        propertiesCount: Object.keys(data.properties || {}).length
      }
    };

  } catch (error: any) {
    return {
      test: 'Notion工作流测试',
      success: false,
      message: `❌ Notion 工作流失败: ${error.message}`
    };
  }
}

/**
 * 生成测试报告
 */
export function generateTestReport(results: CORSTestResult[]): string {
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  let report = `📊 CORS 绕过测试报告\n`;
  report += `==================\n`;
  report += `总体结果: ${successCount}/${totalCount} 测试通过\n\n`;
  
  results.forEach((result, index) => {
    report += `${index + 1}. ${result.test}\n`;
    report += `   ${result.message}\n`;
    if (result.duration) {
      report += `   耗时: ${result.duration}ms\n`;
    }
    if (result.details) {
      report += `   详情: ${JSON.stringify(result.details, null, 2)}\n`;
    }
    report += `\n`;
  });
  
  return report;
} 