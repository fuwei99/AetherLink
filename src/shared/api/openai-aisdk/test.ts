/**
 * AI SDK OpenAI Provider 测试文件
 * 用于验证AI SDK供应商的功能
 */
import { OpenAIAISDKProvider } from './provider';
import type { Model, Message } from '../../types';

/**
 * 创建测试模型配置
 */
function createTestModel(): Model {
  return {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini (AI SDK)',
    provider: 'openai-aisdk',
    providerType: 'openai-aisdk',
    apiKey: 'your-api-key-here', // 需要替换为真实的API密钥
    baseUrl: 'https://api.openai.com/v1',
    enabled: true,
    isDefault: false,
    temperature: 0.7,
    maxTokens: 1000
  };
}

/**
 * 测试基本聊天功能
 */
export async function testBasicChat() {
  console.log('🧪 测试基本聊天功能...');
  
  const model = createTestModel();
  const provider = new OpenAIAISDKProvider(model);
  
  const messages: Message[] = [
    {
      id: 'test-1',
      role: 'user',
      content: '你好，请简单介绍一下你自己。',
      timestamp: Date.now()
    }
  ];
  
  try {
    let receivedContent = '';
    
    const result = await provider.sendChatMessage(messages, {
      onUpdate: (content, reasoning) => {
        receivedContent = content;
        console.log('📝 实时更新:', content.substring(0, 50) + '...');
        if (reasoning) {
          console.log('🧠 推理内容:', reasoning.substring(0, 50) + '...');
        }
      }
    });
    
    console.log('✅ 基本聊天测试成功');
    console.log('📊 最终结果:', typeof result === 'string' ? result.substring(0, 100) + '...' : result);
    return true;
    
  } catch (error) {
    console.error('❌ 基本聊天测试失败:', error);
    return false;
  }
}

/**
 * 测试流式响应性能
 */
export async function testStreamingPerformance() {
  console.log('🚀 测试流式响应性能...');
  
  const model = createTestModel();
  const provider = new OpenAIAISDKProvider(model);
  
  const messages: Message[] = [
    {
      id: 'test-2',
      role: 'user',
      content: '请写一个关于人工智能的200字短文。',
      timestamp: Date.now()
    }
  ];
  
  try {
    const startTime = Date.now();
    let firstChunkTime = 0;
    let chunkCount = 0;
    
    const result = await provider.sendChatMessage(messages, {
      onUpdate: (content, reasoning) => {
        chunkCount++;
        if (firstChunkTime === 0) {
          firstChunkTime = Date.now();
          console.log(`⚡ 首个数据块延迟: ${firstChunkTime - startTime}ms`);
        }
      }
    });
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const firstChunkDelay = firstChunkTime - startTime;
    
    console.log('✅ 流式响应性能测试完成');
    console.log(`📊 性能指标:`);
    console.log(`   - 首个数据块延迟: ${firstChunkDelay}ms`);
    console.log(`   - 总响应时间: ${totalTime}ms`);
    console.log(`   - 数据块数量: ${chunkCount}`);
    console.log(`   - 平均每块延迟: ${totalTime / chunkCount}ms`);
    
    return {
      firstChunkDelay,
      totalTime,
      chunkCount,
      avgChunkDelay: totalTime / chunkCount
    };
    
  } catch (error) {
    console.error('❌ 流式响应性能测试失败:', error);
    return null;
  }
}

/**
 * 测试中断功能
 */
export async function testAbortSignal() {
  console.log('🛑 测试中断功能...');
  
  const model = createTestModel();
  const provider = new OpenAIAISDKProvider(model);
  
  const messages: Message[] = [
    {
      id: 'test-3',
      role: 'user',
      content: '请写一篇1000字的长文章，详细介绍机器学习的发展历史。',
      timestamp: Date.now()
    }
  ];
  
  try {
    const controller = new AbortController();
    
    // 2秒后中断请求
    setTimeout(() => {
      console.log('🛑 发送中断信号...');
      controller.abort();
    }, 2000);
    
    const result = await provider.sendChatMessage(messages, {
      onUpdate: (content) => {
        console.log('📝 收到内容长度:', content.length);
      },
      abortSignal: controller.signal
    });
    
    console.log('❌ 中断测试失败 - 请求未被中断');
    return false;
    
  } catch (error: any) {
    if (error.name === 'AbortError' || error.message.includes('abort')) {
      console.log('✅ 中断功能测试成功');
      return true;
    } else {
      console.error('❌ 中断测试失败:', error);
      return false;
    }
  }
}

/**
 * 运行所有测试
 */
export async function runAllTests() {
  console.log('🧪 开始运行AI SDK Provider测试套件...\n');
  
  const results = {
    basicChat: false,
    streamingPerformance: null as any,
    abortSignal: false
  };
  
  // 测试基本聊天
  results.basicChat = await testBasicChat();
  console.log('');
  
  // 测试流式响应性能
  results.streamingPerformance = await testStreamingPerformance();
  console.log('');
  
  // 测试中断功能
  results.abortSignal = await testAbortSignal();
  console.log('');
  
  // 输出测试总结
  console.log('📋 测试总结:');
  console.log(`   - 基本聊天: ${results.basicChat ? '✅ 通过' : '❌ 失败'}`);
  console.log(`   - 流式性能: ${results.streamingPerformance ? '✅ 通过' : '❌ 失败'}`);
  console.log(`   - 中断功能: ${results.abortSignal ? '✅ 通过' : '❌ 失败'}`);
  
  if (results.streamingPerformance) {
    console.log(`   - 首个数据块延迟: ${results.streamingPerformance.firstChunkDelay}ms`);
  }
  
  return results;
}

// 如果直接运行此文件，执行测试
if (typeof window !== 'undefined' && (window as any).runAISDKTests) {
  (window as any).runAISDKTests = runAllTests;
}
