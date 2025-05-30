/**
 * Gemini 文件服务 - 移动端适配版
 * 提供类似电脑版的文件上传和管理功能，适配移动端环境
 * 支持真正的文件上传到 Gemini 服务器
 */
import { GoogleGenAI, FileState } from '@google/genai';
import type { File as GeminiFile } from '@google/genai';
import type { Model, FileType } from '../../types';
import { logApiRequest, logApiResponse, log } from '../../services/LoggerService';
import { mobileFileStorage } from '../../services/MobileFileStorageService';
import { withRetry } from '../../utils/retryUtils';

// 文件大小常量
const MB = 1024 * 1024;
const MAX_FILE_SIZE = 20 * MB; // 20MB 限制，与电脑版保持一致

/**
 * Gemini 文件缓存
 */
interface GeminiFileCache {
  files: GeminiFile[];
  timestamp: number;
}

const FILE_CACHE_DURATION = 3000; // 3秒缓存，与电脑版保持一致
let fileCache: GeminiFileCache | null = null;

/**
 * 缓存服务 - 模拟电脑版的 CacheService
 */
class MobileCacheService {
  private static cache = new Map<string, { data: any; timestamp: number; duration: number }>();

  static get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.duration) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  static set<T>(key: string, data: T, duration: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      duration
    });
  }

  static clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

/**
 * Gemini 文件服务类
 * 移动端适配版本，支持真正的文件上传到 Gemini 服务器
 */
export class GeminiFileService {
  private model: Model;
  private sdk: GoogleGenAI;

  constructor(model: Model) {
    this.model = model;
    if (!model.apiKey) {
      throw new Error('API密钥未设置');
    }

    // 创建 Gemini SDK 实例
    this.sdk = new GoogleGenAI({
      vertexai: false,
      apiKey: model.apiKey,
      httpOptions: {
        baseUrl: this.getBaseURL()
      }
    });

    console.log(`[GeminiFileService] 初始化文件服务，模型: ${this.model.id}, baseURL: ${this.getBaseURL()}`);
  }

  /**
   * 获取基础 URL
   */
  private getBaseURL(): string {
    const baseUrl = this.model.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    return baseUrl.replace(/\/v1beta\/?$/, '');
  }

  /**
   * 上传文件到 Gemini 服务器
   * @param file 文件对象
   * @returns Gemini 文件对象
   */
  async uploadFile(file: FileType): Promise<GeminiFile> {
    try {
      console.log(`[GeminiFileService] 开始上传文件到 Gemini: ${file.origin_name}`);

      // 检查文件大小
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`文件太大，最大允许 ${MAX_FILE_SIZE / MB}MB`);
      }

      // 检查是否为支持的文件类型
      if (file.ext !== '.pdf') {
        throw new Error('Gemini 目前只支持 PDF 文件上传');
      }

      // 记录 API 请求
      logApiRequest('Gemini File Upload', 'INFO', {
        method: 'POST',
        fileName: file.origin_name,
        fileSize: file.size,
        fileType: file.ext,
        baseUrl: this.getBaseURL()
      });

      // 获取文件的 base64 数据
      const fileContent = await this.getFileContent(file);

      // 使用 Gemini SDK 上传文件
      const uploadResult = await withRetry(
        async () => {
          // 创建 Blob 对象用于上传
          const base64Data = fileContent.includes(',') ? fileContent.split(',')[1] : fileContent;
          const binaryData = this.base64ToArrayBuffer(base64Data);
          const blob = new Blob([binaryData], { type: 'application/pdf' });

          // 使用 SDK 上传文件
          return await this.sdk.files.upload({
            file: blob,
            config: {
              mimeType: 'application/pdf',
              name: file.id,
              displayName: file.origin_name
            }
          });
        },
        'Gemini File Upload',
        3
      );

      // 记录 API 响应
      logApiResponse('Gemini File Upload', 200, {
        fileName: file.origin_name,
        fileUri: uploadResult.uri,
        fileState: uploadResult.state
      });

      console.log(`[GeminiFileService] 文件上传成功: ${uploadResult.uri}`);
      return uploadResult;
    } catch (error: any) {
      log('ERROR', `Gemini 文件上传失败: ${error.message || '未知错误'}`, {
        fileName: file.origin_name,
        fileSize: file.size,
        error
      });
      throw error;
    }
  }

  /**
   * 将 base64 转换为 ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * 获取文件内容
   */
  private async getFileContent(file: FileType): Promise<string> {
    // 优先使用文件的 base64Data
    if (file.base64Data) {
      return file.base64Data;
    }

    // 从移动端文件存储读取
    try {
      return await mobileFileStorage.readFile(file.id);
    } catch (error) {
      console.error('[GeminiFileService] 读取文件内容失败:', error);
      throw new Error('无法读取文件内容');
    }
  }

  /**
   * 获取文件的 base64 编码
   * @param file 文件对象
   * @returns base64 数据和 MIME 类型
   */
  async getBase64File(file: FileType): Promise<{ data: string; mimeType: string }> {
    try {
      let base64Data = file.base64Data;
      if (!base64Data) {
        // 从文件存储服务读取
        const fileContent = await mobileFileStorage.readFile(file.id);
        base64Data = fileContent;
      }

      if (!base64Data) {
        throw new Error('无法获取文件内容');
      }

      // 移除 data URL 前缀（如果存在）
      const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

      return {
        data: cleanBase64,
        mimeType: file.mimeType || 'application/pdf'
      };
    } catch (error) {
      console.error('[GeminiFileService] 获取文件 base64 失败:', error);
      throw error;
    }
  }

  /**
   * 检索已上传的文件 - 模拟电脑版实现
   * @param file 文件对象
   * @returns Gemini 文件对象或 undefined
   */
  async retrieveFile(file: FileType): Promise<GeminiFile | undefined> {
    try {
      console.log(`[GeminiFileService] 检索文件: ${file.origin_name}`);

      const FILE_LIST_CACHE_KEY = 'gemini_file_list';

      // 使用缓存服务检查缓存 - 模拟电脑版的 CacheService
      const cachedResponse = MobileCacheService.get<GeminiFile[]>(FILE_LIST_CACHE_KEY);
      if (cachedResponse) {
        const cachedFile = this.processFileList(cachedResponse, file);
        if (cachedFile) {
          console.log(`[GeminiFileService] 从缓存中找到文件: ${cachedFile.uri}`);
          return cachedFile;
        }
      }

      // 从 Gemini 服务器获取文件列表
      const files = await this.listFiles();

      // 设置缓存 - 模拟电脑版的缓存策略
      MobileCacheService.set(FILE_LIST_CACHE_KEY, files, FILE_CACHE_DURATION);

      // 查找匹配的文件
      const foundFile = this.processFileList(files, file);
      if (foundFile) {
        console.log(`[GeminiFileService] 找到已上传的文件: ${foundFile.uri}`);
      } else {
        console.log(`[GeminiFileService] 未找到已上传的文件: ${file.origin_name}`);
      }

      return foundFile;
    } catch (error) {
      console.error('[GeminiFileService] 检索文件失败:', error);
      return undefined;
    }
  }

  /**
   * 处理文件列表 - 模拟电脑版的 processResponse 方法
   * @param files 文件列表
   * @param targetFile 目标文件
   * @returns 匹配的文件或 undefined
   */
  private processFileList(files: GeminiFile[], targetFile: FileType): GeminiFile | undefined {
    for (const file of files) {
      if (file.state === FileState.ACTIVE) {
        if (file.displayName === targetFile.origin_name && Number(file.sizeBytes) === targetFile.size) {
          return file;
        }
      }
    }
    return undefined;
  }

  /**
   * 列出所有已上传的文件
   * @returns 文件列表
   */
  async listFiles(): Promise<GeminiFile[]> {
    try {
      console.log(`[GeminiFileService] 获取文件列表`);

      // 使用 Gemini SDK 获取文件列表
      const files: GeminiFile[] = [];
      const fileList = await withRetry(
        () => this.sdk.files.list(),
        'Gemini List Files',
        3
      );

      // 遍历文件列表
      for await (const file of fileList) {
        files.push(file);
      }

      console.log(`[GeminiFileService] 获取到 ${files.length} 个文件`);
      return files;
    } catch (error) {
      console.error('[GeminiFileService] 获取文件列表失败:', error);
      throw error;
    }
  }

  /**
   * 删除已上传的文件
   * @param fileId Gemini 文件 ID
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      console.log(`[GeminiFileService] 删除文件: ${fileId}`);

      // 使用 Gemini SDK 删除文件
      await withRetry(
        () => this.sdk.files.delete({ name: fileId }),
        'Gemini Delete File',
        3
      );

      // 清除缓存
      fileCache = null;

      console.log(`[GeminiFileService] 文件删除成功: ${fileId}`);
    } catch (error) {
      console.error('[GeminiFileService] 删除文件失败:', error);
      throw error;
    }
  }


}

/**
 * 创建 Gemini 文件服务实例
 * @param model 模型配置
 * @returns Gemini 文件服务实例
 */
export function createGeminiFileService(model: Model): GeminiFileService {
  return new GeminiFileService(model);
}
