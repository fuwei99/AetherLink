/**
 * 插件集成测试
 * 用于验证 Capacitor-CORS2 插件是否正确集成
 */

// 导入插件
import { CorsBypass } from 'capacitor-cors-bypass-enhanced';

// 测试插件导入
export function testPluginIntegration() {
  try {
    console.log('✅ Capacitor-CORS2 插件导入成功');
    console.log('插件对象:', CorsBypass);

    // 验证插件方法是否存在
    const expectedMethods = [
      'request',
      'get',
      'post',
      'put',
      'patch',
      'delete',
      'startSSE',
      'stopSSE',
      'addListener',
      'removeAllListeners'
    ];

    expectedMethods.forEach(method => {
      if (typeof (CorsBypass as any)[method] === 'function') {
        console.log(`✅ 方法 ${method} 存在`);
      } else {
        console.warn(`⚠️ 方法 ${method} 不存在或不是函数`);
      }
    });

    return true;
  } catch (error) {
    console.error('❌ 插件导入失败:', error);
    return false;
  }
}
