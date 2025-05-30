/**
 * Gemini 文件上传功能测试
 * 用于验证移动端文件上传到 Gemini 服务器的功能
 */
import type { Model, FileType } from '../../types';
import { createGeminiFileService } from './fileService';

/**
 * 测试文件上传功能
 */
export async function testFileUpload() {
  console.log('🧪 开始测试 Gemini 文件上传功能...');

  // 模拟模型配置
  const testModel: Model = {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    apiKey: process.env.GEMINI_API_KEY || 'your-api-key-here',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    provider: 'gemini',
    temperature: 0.7,
    maxTokens: 2048
  };

  // 模拟文件对象
  const testFile: FileType = {
    id: 'test-file-001',
    name: 'test-file-001.pdf',
    origin_name: 'test-document.pdf',
    path: '',
    size: 1024 * 1024, // 1MB
    ext: '.pdf',
    type: 'document',
    created_at: new Date().toISOString(),
    count: 1,
    hash: 'test-hash-123',
    base64Data: 'data:application/pdf;base64,JVBERi0xLjQKJdPr6eEKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPD4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9GMSA0IDAgUgo+Pgo+PgovQ29udGVudHMgNSAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvSGVsdmV0aWNhCj4+CmVuZG9iago1IDAgb2JqCjw8Ci9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCi9GMSA4IFRmCjEwIDcwIFRkCihIZWxsbyBXb3JsZCEpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDExNSAwMDAwMCBuIAowMDAwMDAwMjQ1IDAwMDAwIG4gCjAwMDAwMDAzMjIgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA2Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgo0MTQKJSVFT0Y=',
    mimeType: 'application/pdf'
  };

  try {
    // 创建文件服务
    const fileService = createGeminiFileService(testModel);
    console.log('✅ 文件服务创建成功');

    // 测试文件上传
    console.log('📤 测试文件上传...');
    const uploadResult = await fileService.uploadFile(testFile);
    console.log('✅ 文件上传成功:', {
      uri: uploadResult.uri,
      name: uploadResult.name,
      displayName: uploadResult.displayName,
      state: uploadResult.state
    });

    // 测试文件检索
    console.log('🔍 测试文件检索...');
    const retrievedFile = await fileService.retrieveFile(testFile);
    if (retrievedFile) {
      console.log('✅ 文件检索成功:', retrievedFile.uri);
    } else {
      console.log('⚠️ 未找到已上传的文件');
    }

    // 测试文件列表
    console.log('📋 测试文件列表...');
    const fileList = await fileService.listFiles();
    console.log(`✅ 获取文件列表成功，共 ${fileList.length} 个文件`);

    // 测试 base64 获取
    console.log('📄 测试 base64 获取...');
    const base64Result = await fileService.getBase64File(testFile);
    console.log('✅ base64 获取成功，数据长度:', base64Result.data.length);

    // 测试文件删除（可选）
    if (uploadResult.uri) {
      console.log('🗑️ 测试文件删除...');
      await fileService.deleteFile(uploadResult.uri);
      console.log('✅ 文件删除成功');
    }

    console.log('🎉 所有测试通过！');
    return true;
  } catch (error) {
    console.error('❌ 测试失败:', error);
    return false;
  }
}

/**
 * 测试文件上传性能
 */
export async function testFileUploadPerformance() {
  console.log('⚡ 开始性能测试...');

  const testModel: Model = {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    apiKey: process.env.GEMINI_API_KEY || 'your-api-key-here',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    provider: 'gemini',
    temperature: 0.7,
    maxTokens: 2048
  };

  // 创建不同大小的测试文件
  const testFiles: FileType[] = [
    {
      id: 'small-file',
      name: 'small-file.pdf',
      origin_name: 'small-document.pdf',
      path: '',
      size: 100 * 1024, // 100KB
      ext: '.pdf',
      type: 'document',
      created_at: new Date().toISOString(),
      count: 1,
      hash: 'small-hash',
      base64Data: 'data:application/pdf;base64,JVBERi0xLjQ=', // 简化的 PDF
      mimeType: 'application/pdf'
    },
    {
      id: 'medium-file',
      name: 'medium-file.pdf',
      origin_name: 'medium-document.pdf',
      path: '',
      size: 5 * 1024 * 1024, // 5MB
      ext: '.pdf',
      type: 'document',
      created_at: new Date().toISOString(),
      count: 1,
      hash: 'medium-hash',
      base64Data: 'data:application/pdf;base64,JVBERi0xLjQ=', // 简化的 PDF
      mimeType: 'application/pdf'
    }
  ];

  const fileService = createGeminiFileService(testModel);

  for (const file of testFiles) {
    const startTime = Date.now();
    try {
      await fileService.uploadFile(file);
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`✅ ${file.origin_name} 上传成功，耗时: ${duration}ms`);
    } catch (error) {
      console.error(`❌ ${file.origin_name} 上传失败:`, error);
    }
  }
}

/**
 * 运行所有测试
 */
export async function runAllTests() {
  console.log('🚀 开始运行 Gemini 文件上传测试套件...');
  
  try {
    await testFileUpload();
    await testFileUploadPerformance();
    console.log('🎊 所有测试完成！');
  } catch (error) {
    console.error('💥 测试套件执行失败:', error);
  }
}

// 如果直接运行此文件，执行测试
if (typeof window === 'undefined' && require.main === module) {
  runAllTests();
}
