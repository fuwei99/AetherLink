/**
 * 调试工具 - 用于诊断应用中的问题
 */

// 检查剪贴板权限和功能
export async function testClipboardFunctionality(): Promise<boolean> {
  console.log('🔍 开始测试剪贴板功能...');
  
  try {
    // 测试1: 检查navigator.clipboard是否可用
    if (!navigator.clipboard) {
      console.error('❌ navigator.clipboard 不可用');
      return false;
    }
    
    // 测试2: 检查写入权限
    const testText = '测试复制内容 ' + new Date().toISOString();
    await navigator.clipboard.writeText(testText);
    console.log('✅ 剪贴板写入测试成功');
    
    // 测试3: 检查读取权限（可选）
    try {
      const readText = await navigator.clipboard.readText();
      if (readText === testText) {
        console.log('✅ 剪贴板读取测试成功');
      }
    } catch (readError) {
      console.warn('⚠️ 剪贴板读取权限被拒绝（这是正常的）:', readError);
    }
    
    return true;
  } catch (error) {
    console.error('❌ 剪贴板功能测试失败:', error);
    return false;
  }
}

// 检查DOM元素的点击事件
export function testElementClickability(selector: string): boolean {
  console.log(`🔍 测试元素点击性: ${selector}`);
  
  const elements = document.querySelectorAll(selector);
  console.log(`找到 ${elements.length} 个匹配元素`);
  
  elements.forEach((element, index) => {
    const rect = element.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(element);
    
    console.log(`元素 ${index + 1}:`, {
      visible: rect.width > 0 && rect.height > 0,
      pointerEvents: computedStyle.pointerEvents,
      zIndex: computedStyle.zIndex,
      position: computedStyle.position,
      display: computedStyle.display,
      opacity: computedStyle.opacity
    });
  });
  
  return elements.length > 0;
}

// 将调试函数添加到全局作用域（仅在开发环境）
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).debugUtils = {
    testClipboardFunctionality,
    testElementClickability
  };
  
  console.log('🛠️ 调试工具已添加到 window.debugUtils');
  console.log('可用命令:');
  console.log('- window.debugUtils.testClipboardFunctionality()');
  console.log('- window.debugUtils.testElementClickability("选择器")');
} 