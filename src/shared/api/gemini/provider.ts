/**
 * Gemini Provider - 电脑版完整实现
 * 基于电脑版架构重新设计，支持完整的功能
 */
import {
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  FinishReason,
  Modality,
  GenerateContentResponse
} from '@google/genai';
import type {
  Content,
  FunctionCall,
  GenerateContentConfig,
  Part,
  PartUnion,
  SafetySetting,
  ThinkingConfig,
  Tool
} from '@google/genai';
import type { Message, Model, MCPTool, FileType } from '../../types';
import { getMainTextContent } from '../../utils/messageUtils';
import store from '../../store';
import {
  isGeminiReasoningModel,
  isGenerateImageModel,
  isGemmaModel,
  isWebSearchModel
} from '../../config/models';
import { takeRight } from 'lodash';
import axios from 'axios';
import OpenAI from 'openai';
import { filterUserRoleStartMessages, filterEmptyMessages } from '../../utils/messageUtils/filters';
import { withRetry } from '../../utils/retryUtils';
import { MobileFileStorageService } from '../../services/MobileFileStorageService';
import { createGeminiFileService } from './fileService';

// 常量定义
const MB = 1024 * 1024;



// 接口定义
interface CompletionsParams {
  messages: Message[];
  assistant: any;
  mcpTools: MCPTool[];
  onChunk: (chunk: any) => void;
  onFilterMessages: (messages: Message[]) => void;
}

interface MCPToolResponse {
  toolUseId?: string;
  toolCallId?: string;
  tool: MCPTool;
}

interface MCPCallToolResponse {
  isError: boolean;
  content: string;
}

// 工具函数
function findImageBlocks(message: Message): any[] {
  try {
    if (!message.blocks || !Array.isArray(message.blocks)) {
      return [];
    }
    const state = store.getState();
    return message.blocks
      .map(blockId => state.messageBlocks.entities[blockId])
      .filter(block => block && block.type === 'image');
  } catch (error) {
    console.error('[findImageBlocks] 失败:', error);
    return [];
  }
}

function findFileBlocks(message: Message): any[] {
  try {
    if (!message.blocks || !Array.isArray(message.blocks)) {
      return [];
    }
    const state = store.getState();
    return message.blocks
      .map(blockId => state.messageBlocks.entities[blockId])
      .filter(block => block && block.type === 'file');
  } catch (error) {
    console.error('[findFileBlocks] 失败:', error);
    return [];
  }
}

// 基础Provider类
export abstract class BaseProvider {
  protected model: Model;
  protected sdk: GoogleGenAI;

  constructor(model: Model) {
    this.model = model;
    this.sdk = new GoogleGenAI({ 
      vertexai: false, 
      apiKey: model.apiKey, 
      httpOptions: { baseUrl: this.getBaseURL() } 
    });
  }

  public getBaseURL(): string {
    const baseUrl = this.model.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    // 确保 baseUrl 不以 /v1beta 结尾，避免重复
    return baseUrl.replace(/\/v1beta\/?$/, '');
  }

  protected getAssistantSettings(assistant: any) {
    // 获取原始maxTokens值
    const maxTokens = Math.max(assistant?.maxTokens || assistant?.settings?.maxTokens || 4096, 1);

    console.log(`[GeminiProvider] maxTokens参数 - 助手设置: ${assistant?.maxTokens}, settings设置: ${assistant?.settings?.maxTokens}, 最终值: ${maxTokens}`);

    // 检查流式输出设置
    const streamOutput = assistant?.settings?.streamOutput !== false;

    return {
      contextCount: assistant?.settings?.contextCount || 10,
      maxTokens: maxTokens,
      streamOutput: streamOutput,
      temperature: this.getTemperature(assistant),
      topP: this.getTopP(assistant)
    };
  }

  protected getTemperature(assistant?: any, model?: Model): number {
    return assistant?.settings?.temperature || assistant?.temperature || model?.temperature || 0.7;
  }

  protected getTopP(assistant?: any, model?: Model): number {
    return assistant?.settings?.topP || assistant?.topP || (model as any)?.topP || 0.95;
  }

  protected getCustomParameters(assistant?: any): any {
    return assistant?.settings?.customParameters || {};
  }

  /**
   * 获取Gemini专属参数
   * @param assistant 助手配置（可选）
   */
  protected getGeminiSpecificParameters(assistant?: any): any {
    const params: any = {};

    // Candidate Count
    if (assistant?.candidateCount !== undefined && assistant.candidateCount !== 1) {
      params.candidateCount = assistant.candidateCount;
    }

    // Response Modalities
    if (assistant?.responseModalities && Array.isArray(assistant.responseModalities)) {
      if (JSON.stringify(assistant.responseModalities) !== JSON.stringify(['TEXT'])) {
        params.responseModalities = assistant.responseModalities.map((modality: string) => {
          switch (modality) {
            case 'TEXT': return 'TEXT';
            case 'IMAGE': return 'IMAGE';
            case 'AUDIO': return 'AUDIO';
            default: return 'TEXT';
          }
        });
      }
    }

    // Speech Config
    if (assistant?.enableSpeech) {
      params.speechConfig = {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: assistant.speechLanguage === 'zh-CN' ? 'zh-CN-Wavenet-A' : 'en-US-Wavenet-A'
          }
        }
      };
    }

    // Thinking Config 已在 getBudgetToken 方法中处理，这里不再重复处理

    // Media Resolution (影响图像处理的token消耗)
    if (assistant?.mediaResolution && assistant.mediaResolution !== 'medium') {
      // 这个参数通常在处理图像时使用，不是直接的API参数
      // 但我们可以存储它以便在图像处理时使用
      params.mediaResolution = assistant.mediaResolution;
    }

    // 通用参数
    // Top-K
    if (assistant?.topK !== undefined && assistant.topK !== 40) {
      params.topK = assistant.topK;
    }

    // Frequency Penalty (Gemini可能不直接支持，但可以尝试)
    if (assistant?.frequencyPenalty !== undefined && assistant.frequencyPenalty !== 0) {
      params.frequencyPenalty = assistant.frequencyPenalty;
    }

    // Presence Penalty (Gemini可能不直接支持，但可以尝试)
    if (assistant?.presencePenalty !== undefined && assistant.presencePenalty !== 0) {
      params.presencePenalty = assistant.presencePenalty;
    }

    // Seed
    if (assistant?.seed !== undefined && assistant.seed !== null) {
      params.seed = assistant.seed;
    }

    // Stop Sequences
    if (assistant?.stopSequences && Array.isArray(assistant.stopSequences) && assistant.stopSequences.length > 0) {
      params.stopSequences = assistant.stopSequences;
    }

    return params;
  }

  protected createAbortController(_messageId?: string, _autoCleanup = false) {
    const abortController = new AbortController();
    const cleanup = () => {};
    return { abortController, cleanup };
  }

  protected async getMessageContent(message: Message): Promise<string> {
    return getMainTextContent(message);
  }

  public convertMcpTools<T>(mcpTools: MCPTool[]): T[] {
    return mcpTools.map((tool) => {
      let toolName = tool.id || tool.name;
      
      // 清理工具名称
      if (/^\d/.test(toolName)) toolName = `mcp_${toolName}`;
      toolName = toolName.replace(/[^a-zA-Z0-9_.-]/g, '_');
      if (toolName.length > 64) toolName = toolName.substring(0, 64);
      if (!/^[a-zA-Z_]/.test(toolName)) toolName = `tool_${toolName}`;

      return {
        functionDeclarations: [{
          name: toolName,
          description: tool.description,
          parameters: tool.inputSchema
        }]
      };
    }) as T[];
  }

  protected setupToolsConfig<T>({ mcpTools, enableToolUse }: {
    mcpTools: MCPTool[];
    model: Model;
    enableToolUse: boolean;
  }): { tools: T[] } {
    if (!enableToolUse || !mcpTools?.length) return { tools: [] };
    return { tools: this.convertMcpTools<T>(mcpTools) };
  }

  protected get useSystemPromptForTools(): boolean {
    return false;
  }

  public mcpToolCallResponseToMessage = (mcpToolResponse: MCPToolResponse, resp: MCPCallToolResponse, _model: Model) => {
    if ('toolUseId' in mcpToolResponse && mcpToolResponse.toolUseId) {
      return {
        role: 'user',
        parts: [{ text: !resp.isError ? resp.content : `Error: ${resp.content}` }]
      } satisfies Content;
    } else if ('toolCallId' in mcpToolResponse) {
      return {
        role: 'user',
        parts: [{
          functionResponse: {
            id: mcpToolResponse.toolCallId,
            name: mcpToolResponse.tool.id,
            response: {
              output: !resp.isError ? resp.content : undefined,
              error: resp.isError ? resp.content : undefined
            }
          }
        }]
      } satisfies Content;
    }
    return;
  }
}

// Gemini Provider实现
export default class GeminiProvider extends BaseProvider {
  constructor(provider: any) {
    const model = {
      id: provider.models?.[0]?.id || 'gemini-pro',
      apiKey: provider.apiKey,
      baseUrl: provider.apiHost,
      temperature: 0.7,
      maxTokens: 2048
    } as Model;
    super(model);
  }

  /**
   * 获取安全设置
   */
  private getSafetySettings(): SafetySetting[] {
    const safetyThreshold = 'OFF' as HarmBlockThreshold;
    return [
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: safetyThreshold },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: safetyThreshold },
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: safetyThreshold },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: safetyThreshold },
      { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE }
    ];
  }

  /**
   * 获取推理配置
   */
  private getBudgetToken(assistant: any, model: Model) {
    if (isGeminiReasoningModel(model)) {
      // 检查是否启用思维链
      const enableThinking = assistant?.enableThinking;
      const thinkingBudget = assistant?.thinkingBudget || 0;

      if (!enableThinking || thinkingBudget === 0) {
        return {
          thinkingConfig: {
            includeThoughts: false,
            thinkingBudget: 0
          } as ThinkingConfig
        };
      }

      // 使用用户设置的thinkingBudget，范围0-24576
      const budget = Math.max(0, Math.min(thinkingBudget, 24576));

      return {
        thinkingConfig: {
          thinkingBudget: budget,
          includeThoughts: true
        } as ThinkingConfig
      };
    }
    return {};
  }

  /**
   * 处理PDF文件 - 模拟电脑版实现
   * 参考电脑版的 handlePdfFile 方法逻辑
   */
  private async handlePdfFile(file: FileType): Promise<Part> {
    const smallFileSize = 20 * MB;
    const isSmallFile = file.size < smallFileSize;

    if (isSmallFile) {
      // 小文件使用 base64 - 模拟电脑版的 window.api.gemini.base64File
      try {
        const fileService = createGeminiFileService(this.model);
        const { data, mimeType } = await fileService.getBase64File(file);
        return {
          inlineData: {
            data,
            mimeType
          } as Part['inlineData']
        };
      } catch (error) {
        console.error('[GeminiProvider] 获取base64失败，使用文件内置数据:', error);
        const base64Data = file.base64Data || '';
        const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
        return {
          inlineData: {
            data: cleanBase64,
            mimeType: 'application/pdf'
          } as Part['inlineData']
        };
      }
    }

    // 大文件处理 - 模拟电脑版的逻辑
    try {
      const fileService = createGeminiFileService(this.model);

      // 1. 先检索已上传的文件 - 模拟电脑版的 window.api.gemini.retrieveFile
      const fileMetadata = await fileService.retrieveFile(file);

      if (fileMetadata) {
        console.log(`[GeminiProvider] 使用已上传的文件: ${fileMetadata.uri}`);
        return {
          fileData: {
            fileUri: fileMetadata.uri,
            mimeType: fileMetadata.mimeType
          } as Part['fileData']
        };
      }

      // 2. 如果文件不存在，上传到 Gemini - 模拟电脑版的 window.api.gemini.uploadFile
      console.log(`[GeminiProvider] 上传新文件: ${file.origin_name}`);
      const uploadResult = await fileService.uploadFile(file);

      return {
        fileData: {
          fileUri: uploadResult.uri,
          mimeType: uploadResult.mimeType
        } as Part['fileData']
      };
    } catch (error) {
      console.error('[GeminiProvider] 文件上传失败，回退到base64:', error);
      // 回退策略 - 使用 base64
      const base64Data = file.base64Data || '';
      const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      return {
        inlineData: {
          data: cleanBase64,
          mimeType: 'application/pdf'
        } as Part['inlineData']
      };
    }
  }

  /**
   * 获取消息内容
   */
  private async getMessageContents(message: Message): Promise<Content> {
    const role = message.role === 'user' ? 'user' : 'model';
    const parts: Part[] = [];

    // 获取用户文本内容
    const textContent = await this.getMessageContent(message);

    // 只有当文本内容不为空时才添加文本part
    if (textContent && textContent.trim()) {
      parts.push({ text: textContent.trim() });
    }

    // 处理图片块
    const imageBlocks = findImageBlocks(message);

    for (const imageBlock of imageBlocks) {
      if (imageBlock.metadata?.generateImageResponse?.images) {
        for (const imageUrl of imageBlock.metadata.generateImageResponse.images) {
          if (imageUrl?.startsWith('data:')) {
            const matches = imageUrl.match(/^data:(.+);base64,(.*)$/);
            if (matches && matches.length === 3) {
              parts.push({
                inlineData: {
                  data: matches[2],
                  mimeType: matches[1]
                } as Part['inlineData']
              });
            }
          }
        }
      }
    }

    // 处理文件块 - 模拟电脑版的文件处理逻辑
    const fileBlocks = findFileBlocks(message);

    for (const fileBlock of fileBlocks) {
      const file = fileBlock.file;
      if (!file) {
        continue;
      }

      // 处理图片文件 - 模拟电脑版第176-184行
      if (file.type === 'image') {
        try {
          const base64Data = await this.getBase64Image(file);
          parts.push({
            inlineData: {
              data: base64Data.base64,
              mimeType: base64Data.mime
            } as Part['inlineData']
          });
        } catch (error) {
          console.error(`[GeminiProvider.getMessageContents] 处理图片文件失败:`, error);
        }
      }

      // 处理PDF文件 - 模拟电脑版第186-189行
      if (file.ext === '.pdf') {
        try {
          const pdfPart = await this.handlePdfFile(file);
          parts.push(pdfPart);
          continue;
        } catch (error) {
          console.error(`[GeminiProvider.getMessageContents] 处理PDF文件失败:`, error);
        }
      }

      // 处理文本和文档文件 - 模拟电脑版第190-195行
      if (['text', 'document'].includes(file.type)) {
        try {
          const fileContent = await this.readFileContent(file);
          if (fileContent) {
            parts.push({
              text: file.origin_name + '\n' + fileContent.trim()
            });
          }
        } catch (error) {
          console.error(`[GeminiProvider.getMessageContents] 处理文本文件失败:`, error);
        }
      }
    }

    // 确保至少有一个part，避免空parts数组导致API错误
    if (parts.length === 0) {
      parts.push({ text: '' });
    }

    return { role, parts };
  }

  /**
   * 获取消息文本内容 - 模拟电脑版的 getMainTextContent
   */
  protected async getMessageContent(message: Message): Promise<string> {
    return getMainTextContent(message);
  }

  /**
   * 获取图片的 base64 数据 - 模拟电脑版的 window.api.file.base64Image
   */
  private async getBase64Image(file: FileType): Promise<{ base64: string; mime: string }> {
    try {
      const fileService = createGeminiFileService(this.model);
      const result = await fileService.getBase64File(file);
      return {
        base64: result.data,
        mime: result.mimeType
      };
    } catch (error) {
      console.error('[GeminiProvider] 获取图片base64失败:', error);
      // 回退到文件内置数据
      const base64Data = file.base64Data || '';
      const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const mimeType = file.mimeType || `image/${file.ext?.slice(1) || 'png'}`;
      return {
        base64: cleanBase64,
        mime: mimeType
      };
    }
  }

  /**
   * 读取文件内容 - 模拟电脑版的 window.api.file.read
   */
  private async readFileContent(file: FileType): Promise<string> {
    try {
      // 从移动端文件存储读取
      const mobileFileStorage = MobileFileStorageService.getInstance();
      return await mobileFileStorage.readFile(file.id);
    } catch (error) {
      console.error('[GeminiProvider] 读取文件内容失败:', error);
      return `[无法读取文件内容: ${file.origin_name}]`;
    }
  }

  /**
   * 获取图像文件内容
   */
  private async getImageFileContents(message: Message): Promise<Content> {
    const role = message.role === 'user' ? 'user' : 'model';
    const content = getMainTextContent(message);
    const parts: Part[] = [];

    // 只有当文本内容不为空时才添加文本part
    if (content && content.trim()) {
      parts.push({ text: content.trim() });
    }

    const imageBlocks = findImageBlocks(message);

    for (const imageBlock of imageBlocks) {
      if (imageBlock.metadata?.generateImageResponse?.images) {
        for (const imageUrl of imageBlock.metadata.generateImageResponse.images) {
          if (imageUrl?.startsWith('data:')) {
            const matches = imageUrl.match(/^data:(.+);base64,(.*)$/);
            if (matches && matches.length === 3) {
              parts.push({
                inlineData: {
                  data: matches[2],
                  mimeType: matches[1]
                } as Part['inlineData']
              });
            }
          }
        }
      }
    }

    // 确保至少有一个part
    if (parts.length === 0) {
      parts.push({ text: '' });
    }

    return { role, parts };
  }

  /**
   * 核心completions方法 - 电脑版风格
   */
  public async completions({
    messages,
    assistant,
    mcpTools,
    onChunk,
    onFilterMessages
  }: CompletionsParams): Promise<void> {
    const model = assistant.model || this.model;
    let canGenerateImage = false;

    console.log(`[Gemini Provider] 检查图像生成能力 - 模型ID: ${model.id}, isGenerateImageModel: ${isGenerateImageModel(model)}, enableGenerateImage: ${assistant.enableGenerateImage}`);

    if (isGenerateImageModel(model)) {
      if (model.id === 'gemini-2.0-flash-exp') {
        canGenerateImage = assistant.enableGenerateImage!;
      } else {
        canGenerateImage = true;
      }
    }

    console.log(`[Gemini Provider] 图像生成决策 - canGenerateImage: ${canGenerateImage}`);

    if (canGenerateImage) {
      console.log(`[Gemini Provider] 调用图像生成方法`);
      await this.generateImageByChat({ messages, assistant, onChunk });
      return;
    }

    const { contextCount, maxTokens, streamOutput } = this.getAssistantSettings(assistant);

    // 过滤消息 - 参考电脑版实现
    const userMessages = filterUserRoleStartMessages(
      filterEmptyMessages(takeRight(messages, contextCount + 2))
    );
    onFilterMessages(userMessages);

    const userLastMessage = userMessages.pop();
    const history: Content[] = [];

    for (const message of userMessages) {
      history.push(await this.getMessageContents(message));
    }

    let systemInstruction = assistant.prompt;
    const { tools } = this.setupToolsConfig<Tool>({
      mcpTools,
      model,
      enableToolUse: true
    });

    if (this.useSystemPromptForTools) {
      // 构建系统提示词（简化版）
      systemInstruction = assistant.prompt || '';
    }

    // 🔥 调试日志：显示系统提示词的最终处理结果
    console.log(`[GeminiProvider.completions] 系统提示词最终处理:`, {
      useSystemPromptForTools: this.useSystemPromptForTools,
      assistantPrompt: assistant.prompt?.substring(0, 50) + (assistant.prompt?.length > 50 ? '...' : ''),
      systemInstruction: systemInstruction?.substring(0, 50) + (systemInstruction?.length > 50 ? '...' : ''),
      systemInstructionLength: systemInstruction?.length || 0,
      isGemmaModel: isGemmaModel(model)
    });

    // const toolResponses: MCPToolResponse[] = [];

    if (assistant.enableWebSearch && isWebSearchModel(model)) {
      tools.push({
        // @ts-ignore googleSearch is not a valid tool for Gemini
        googleSearch: {}
      });
    }

    const generateContentConfig: GenerateContentConfig = {
      safetySettings: this.getSafetySettings(),
      systemInstruction: isGemmaModel(model) ? undefined : systemInstruction,
      temperature: this.getTemperature(assistant, model),
      topP: this.getTopP(assistant, model),
      maxOutputTokens: maxTokens,
      tools: tools,
      ...this.getBudgetToken(assistant, model),
      ...this.getCustomParameters(assistant),
      ...this.getGeminiSpecificParameters(assistant) // 添加Gemini专属参数
    };

    // 为图像生成模型添加必要的配置
    if (isGenerateImageModel(model)) {
      generateContentConfig.responseModalities = [Modality.TEXT, Modality.IMAGE];
      generateContentConfig.responseMimeType = 'text/plain';
    }

    // 添加调试日志显示使用的参数
    console.log(`[GeminiProvider] API请求参数:`, {
      model: model.id,
      temperature: generateContentConfig.temperature,
      topP: generateContentConfig.topP,
      maxOutputTokens: generateContentConfig.maxOutputTokens,
      // 🔥 添加系统提示词信息到日志
      systemInstruction: generateContentConfig.systemInstruction?.substring(0, 50) + (generateContentConfig.systemInstruction?.length > 50 ? '...' : ''),
      systemInstructionLength: generateContentConfig.systemInstruction?.length || 0,
      geminiSpecificParams: this.getGeminiSpecificParameters(assistant),
      assistantInfo: assistant ? {
        id: assistant.id,
        name: assistant.name,
        temperature: assistant.temperature,
        topP: assistant.topP
      } : '无助手信息'
    });

    const messageContents: Content = await this.getMessageContents(userLastMessage!);
    const chat = this.sdk.chats.create({
      model: model.id,
      config: generateContentConfig,
      history: history
    });

    // 处理Gemma模型的特殊格式
    if (isGemmaModel(model) && assistant.prompt) {
      const isFirstMessage = history.length === 0;
      if (isFirstMessage && messageContents) {
        const systemMessage = [{
          text: '<start_of_turn>user\n' + systemInstruction + '<end_of_turn>\n' +
                '<start_of_turn>user\n' + (messageContents?.parts?.[0] as Part).text + '<end_of_turn>'
        }] as Part[];
        if (messageContents && messageContents.parts) {
          messageContents.parts[0] = systemMessage[0];
        }
      }
    }

    const finalUsage = { completion_tokens: 0, prompt_tokens: 0, total_tokens: 0 };
    const finalMetrics = { completion_tokens: 0, time_completion_millsec: 0, time_first_token_millsec: 0 };
    const { cleanup, abortController } = this.createAbortController(userLastMessage?.id, true);

    // 处理流式响应的核心逻辑
    const processStream = async (
      stream: AsyncGenerator<GenerateContentResponse> | GenerateContentResponse,
      _idx: number
    ) => {
      history.push(messageContents);
      let functionCalls: FunctionCall[] = [];
      let time_first_token_millsec = 0;
      const start_time_millsec = new Date().getTime();



      if (stream instanceof GenerateContentResponse) {
        // 非流式响应处理

        const time_completion_millsec = new Date().getTime() - start_time_millsec;

        if (stream.text?.length) {
          onChunk({ type: 'TEXT_DELTA', text: stream.text });
          onChunk({ type: 'TEXT_COMPLETE', text: stream.text });
        }

        stream.candidates?.forEach((candidate) => {
          if (candidate.content) {
            history.push(candidate.content);
            candidate.content.parts?.forEach((part) => {
              if (part.functionCall) {
                functionCalls.push(part.functionCall);
              }
              const text = part.text || '';
              if (part.thought) {
                onChunk({ type: 'THINKING_DELTA', text });
                onChunk({ type: 'THINKING_COMPLETE', text });
              } else if (part.text) {
                onChunk({ type: 'TEXT_DELTA', text });
                onChunk({ type: 'TEXT_COMPLETE', text });
              }
            });
          }
        });

        onChunk({
          type: 'BLOCK_COMPLETE',
          response: {
            text: stream.text,
            usage: {
              prompt_tokens: stream.usageMetadata?.promptTokenCount || 0,
              thoughts_tokens: stream.usageMetadata?.thoughtsTokenCount || 0,
              completion_tokens: stream.usageMetadata?.candidatesTokenCount || 0,
              total_tokens: stream.usageMetadata?.totalTokenCount || 0,
            },
            metrics: {
              completion_tokens: stream.usageMetadata?.candidatesTokenCount,
              time_completion_millsec,
              time_first_token_millsec: 0
            },
            webSearch: {
              results: stream.candidates?.[0]?.groundingMetadata,
              source: 'gemini'
            }
          }
        });
      } else {
        // 流式响应处理

        let content = '';
        let thinkingContent = '';

        for await (const chunk of stream) {
          if (time_first_token_millsec == 0) {
            time_first_token_millsec = new Date().getTime();
          }

          // 处理图像响应（如果是图像生成模型）
          if (isGenerateImageModel(model)) {
            const generateImage = this.processGeminiImageResponse(chunk, onChunk);
            if (generateImage?.images?.length) {
              onChunk({ type: 'IMAGE_COMPLETE', image: generateImage });
            }
          }

          if (chunk.candidates?.[0]?.content?.parts && chunk.candidates[0].content.parts.length > 0) {
            const parts = chunk.candidates[0].content.parts;
            for (const part of parts) {
              if (!part.text) continue;

              if (part.thought) {
                // 思考过程
                if (time_first_token_millsec === 0) {
                  time_first_token_millsec = new Date().getTime();
                }
                thinkingContent += part.text;
                onChunk({ type: 'thinking.delta', text: part.text || '' });
              } else {
                // 正常内容 - 修复电脑版的bug
                if (time_first_token_millsec == 0) {
                  time_first_token_millsec = new Date().getTime();
                }

                // 🔥 修复：当遇到正常文本且有思考内容时，发送THINKING_COMPLETE
                if (thinkingContent) {
                  onChunk({
                    type: 'thinking.complete',
                    text: thinkingContent,
                    thinking_millsec: new Date().getTime() - time_first_token_millsec
                  });
                  thinkingContent = ''; // 清空思维内容
                }

                content += part.text;
                onChunk({ type: 'text.delta', text: part.text });
              }
            }
          }

          if (chunk.candidates?.[0]?.finishReason) {
            if (content) {
              onChunk({ type: 'text.complete', text: content });
            }
            if (chunk.usageMetadata) {
              finalUsage.prompt_tokens += chunk.usageMetadata.promptTokenCount || 0;
              finalUsage.completion_tokens += chunk.usageMetadata.candidatesTokenCount || 0;
              finalUsage.total_tokens += chunk.usageMetadata.totalTokenCount || 0;
            }
            if (chunk.candidates?.[0]?.groundingMetadata) {
              const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
              onChunk({
                type: 'LLM_WEB_SEARCH_COMPLETE',
                llm_web_search: {
                  results: groundingMetadata,
                  source: 'gemini'
                }
              });
            }
            if (chunk.functionCalls) {
              chunk.candidates?.forEach((candidate) => {
                if (candidate.content) {
                  history.push(candidate.content);
                }
              });
              functionCalls = functionCalls.concat(chunk.functionCalls);
            }

            finalMetrics.completion_tokens = finalUsage.completion_tokens;
            finalMetrics.time_completion_millsec += new Date().getTime() - start_time_millsec;
            finalMetrics.time_first_token_millsec =
              (finalMetrics.time_first_token_millsec || 0) + (time_first_token_millsec - start_time_millsec);
          }
        }

        onChunk({
          type: 'BLOCK_COMPLETE',
          response: {
            usage: finalUsage,
            metrics: finalMetrics
          }
        });
      }
    };

    // const start_time_millsec = new Date().getTime();

    if (!streamOutput) {
      onChunk({ type: 'LLM_RESPONSE_CREATED' });
      const response = await withRetry(
        () => chat.sendMessage({
          message: messageContents as PartUnion,
          config: {
            ...generateContentConfig,
            abortSignal: abortController.signal
          }
        }),
        'Gemini Non-Stream Request'
      );
      return await processStream(response, 0).then(cleanup);
    }

    onChunk({ type: 'LLM_RESPONSE_CREATED' });
    const userMessagesStream = await withRetry(
      () => chat.sendMessageStream({
        message: messageContents as PartUnion,
        config: {
          ...generateContentConfig,
          abortSignal: abortController.signal
        }
      }),
      'Gemini Stream Request'
    );

    await processStream(userMessagesStream, 0).finally(cleanup);
  }

  /**
   * 图像生成方法
   */
  public async generateImageByChat({ messages, assistant, onChunk }: {
    messages: Message[];
    assistant: any;
    onChunk: (chunk: any) => void;
  }): Promise<void> {
    const model = assistant.model || this.model;
    const { contextCount, maxTokens } = this.getAssistantSettings(assistant);

    const userMessages = takeRight(messages, contextCount + 2);
    const userLastMessage = userMessages.pop();
    const { abortController } = this.createAbortController(userLastMessage?.id, true);
    const { signal } = abortController;

    const generateContentConfig: GenerateContentConfig = {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
      responseMimeType: 'text/plain',
      safetySettings: this.getSafetySettings(),
      temperature: this.getTemperature(assistant, model),
      topP: this.getTopP(assistant, model),
      maxOutputTokens: maxTokens,
      abortSignal: signal,
      ...this.getCustomParameters(assistant)
    };

    const history: Content[] = [];
    try {
      for (const message of userMessages) {
        history.push(await this.getImageFileContents(message));
      }

      let time_first_token_millsec = 0;
      const start_time_millsec = new Date().getTime();
      onChunk({ type: 'LLM_RESPONSE_CREATED' });

      const chat = this.sdk.chats.create({
        model: model.id,
        config: generateContentConfig,
        history: history
      });

      let content = '';
      const finalUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      const userMessage: Content = await this.getImageFileContents(userLastMessage!);

      const response = await withRetry(
        () => chat.sendMessageStream({
          message: userMessage.parts!,
          config: {
            ...generateContentConfig,
            abortSignal: signal
          }
        }),
        'Gemini Image Generation'
      );

      for await (const chunk of response as AsyncGenerator<GenerateContentResponse>) {
        if (time_first_token_millsec == 0) {
          time_first_token_millsec = new Date().getTime();
        }

        if (chunk.text !== undefined) {
          content += chunk.text;
          onChunk({ type: 'TEXT_DELTA', text: chunk.text });
        }

        // 处理图像响应
        const generateImage = this.processGeminiImageResponse(chunk, onChunk);
        if (generateImage?.images?.length) {
          onChunk({ type: 'IMAGE_COMPLETE', image: generateImage });
        }

        if (chunk.candidates?.[0]?.finishReason) {
          if (content) {
            onChunk({ type: 'TEXT_COMPLETE', text: content });
          }
          if (chunk.usageMetadata) {
            finalUsage.prompt_tokens = chunk.usageMetadata.promptTokenCount || 0;
            finalUsage.completion_tokens = chunk.usageMetadata.candidatesTokenCount || 0;
            finalUsage.total_tokens = chunk.usageMetadata.totalTokenCount || 0;
          }
        }
      }

      onChunk({
        type: 'BLOCK_COMPLETE',
        response: {
          usage: finalUsage,
          metrics: {
            completion_tokens: finalUsage.completion_tokens,
            time_completion_millsec: new Date().getTime() - start_time_millsec,
            time_first_token_millsec: time_first_token_millsec - start_time_millsec
          }
        }
      });
    } catch (error) {
      console.error('[generateImageByChat] error', error);
      onChunk({ type: 'ERROR', error });
    }
  }

  /**
   * 处理Gemini图像响应
   */
  private processGeminiImageResponse(
    chunk: GenerateContentResponse,
    onChunk: (chunk: any) => void
  ): { type: 'base64'; images: string[] } | undefined {
    const parts = chunk.candidates?.[0]?.content?.parts;
    if (!parts) return;

    const images = parts
      .filter((part: Part) => part.inlineData)
      .map((part: Part) => {
        if (!part.inlineData) return null;

        onChunk({ type: 'IMAGE_CREATED' });
        const dataPrefix = `data:${part.inlineData.mimeType || 'image/png'};base64,`;
        return part.inlineData.data?.startsWith('data:')
          ? part.inlineData.data
          : dataPrefix + part.inlineData.data;
      });

    return {
      type: 'base64',
      images: images.filter((image) => image !== null)
    };
  }

  /**
   * 翻译方法
   */
  public async translate(
    content: string,
    assistant: any,
    onResponse?: (text: string, isComplete: boolean) => void
  ) {
    const model = assistant.model || this.model;
    const { maxTokens } = this.getAssistantSettings(assistant);

    const _content = isGemmaModel(model) && assistant.prompt
      ? `<start_of_turn>user\n${assistant.prompt}<end_of_turn>\n<start_of_turn>user\n${content}<end_of_turn>`
      : content;

    if (!onResponse) {
      const response = await withRetry(
        () => this.sdk.models.generateContent({
          model: model.id,
          config: {
            maxOutputTokens: maxTokens,
            temperature: this.getTemperature(assistant, model),
            systemInstruction: isGemmaModel(model) ? undefined : assistant.prompt
          },
          contents: [{ role: 'user', parts: [{ text: _content }] }]
        }),
        'Gemini Translate'
      );
      return response.text || '';
    }

    const response = await withRetry(
      () => this.sdk.models.generateContentStream({
        model: model.id,
        config: {
          maxOutputTokens: maxTokens,
          temperature: this.getTemperature(assistant, model),
          systemInstruction: isGemmaModel(model) ? undefined : assistant.prompt
        },
        contents: [{ role: 'user', parts: [{ text: content }] }]
      }),
      'Gemini Translate Stream'
    );

    let text = '';
    for await (const chunk of response) {
      text += chunk.text;
      onResponse?.(text, false);
    }
    onResponse?.(text, true);
    return text;
  }

  /**
   * 生成摘要
   */
  public async summaries(messages: Message[], assistant: any): Promise<string> {
    const model = assistant.model || this.model;
    const userMessages = takeRight(messages, 5)
      .filter((message) => !message.isPreset)
      .map((message) => ({
        role: message.role,
        content: getMainTextContent(message)
      }));

    const userMessageContent = userMessages.reduce((prev, curr) => {
      const content = curr.role === 'user' ? `User: ${curr.content}` : `Assistant: ${curr.content}`;
      return prev + (prev ? '\n' : '') + content;
    }, '');

    const systemMessage = {
      role: 'system',
      content: '请为以下对话生成一个简洁的标题'
    };

    const userMessage = { role: 'user', content: userMessageContent };
    const content = isGemmaModel(model)
      ? `<start_of_turn>user\n${systemMessage.content}<end_of_turn>\n<start_of_turn>user\n${userMessage.content}<end_of_turn>`
      : userMessage.content;

    const response = await this.sdk.models.generateContent({
      model: model.id,
      config: {
        systemInstruction: isGemmaModel(model) ? undefined : systemMessage.content
      },
      contents: [{ role: 'user', parts: [{ text: content }] }]
    });

    return response.text || '';
  }

  /**
   * 生成文本
   */
  public async generateText({ prompt, content }: { prompt: string; content: string }): Promise<string> {
    const model = this.model;
    const MessageContent = isGemmaModel(model)
      ? `<start_of_turn>user\n${prompt}<end_of_turn>\n<start_of_turn>user\n${content}<end_of_turn>`
      : content;

    const response = await this.sdk.models.generateContent({
      model: model.id,
      config: {
        systemInstruction: isGemmaModel(model) ? undefined : prompt
      },
      contents: [{ role: 'user', parts: [{ text: MessageContent }] }]
    });

    return response.text || '';
  }

  /**
   * 生成建议
   */
  public async suggestions(): Promise<any[]> {
    return [];
  }

  /**
   * 搜索摘要
   */
  public async summaryForSearch(messages: Message[], assistant: any): Promise<string> {
    const model = assistant.model || this.model;
    const systemMessage = { role: 'system', content: assistant.prompt };
    const userMessageContent = messages.map(getMainTextContent).join('\n');

    const content = isGemmaModel(model)
      ? `<start_of_turn>user\n${systemMessage.content}<end_of_turn>\n<start_of_turn>user\n${userMessageContent}<end_of_turn>`
      : userMessageContent;

    const lastUserMessage = messages[messages.length - 1];
    const { abortController, cleanup } = this.createAbortController(lastUserMessage?.id);
    const { signal } = abortController;

    const response = await this.sdk.models
      .generateContent({
        model: model.id,
        config: {
          systemInstruction: isGemmaModel(model) ? undefined : systemMessage.content,
          temperature: this.getTemperature(assistant, model),
          httpOptions: { timeout: 20 * 1000 },
          abortSignal: signal
        },
        contents: [{ role: 'user', parts: [{ text: content }] }]
      })
      .finally(cleanup);

    return response.text || '';
  }

  /**
   * 生成图像
   */
  public async generateImage(): Promise<string[]> {
    return [];
  }

  /**
   * 检查模型有效性
   */
  public async check(model: Model, stream: boolean = false): Promise<{ valid: boolean; error: Error | null }> {
    if (!model) {
      return { valid: false, error: new Error('No model found') };
    }

    let config: GenerateContentConfig = { maxOutputTokens: 1 };

    if (isGeminiReasoningModel(model)) {
      config = {
        ...config,
        thinkingConfig: {
          includeThoughts: false,
          thinkingBudget: 0
        } as ThinkingConfig
      };
    }

    if (isGenerateImageModel(model)) {
      config = {
        ...config,
        responseModalities: [Modality.TEXT, Modality.IMAGE],
        responseMimeType: 'text/plain'
      };
    }

    try {
      if (!stream) {
        const result = await this.sdk.models.generateContent({
          model: model.id,
          contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
          config: config
        });
        if (!result.text) {
          throw new Error('Empty response');
        }
      } else {
        const response = await this.sdk.models.generateContentStream({
          model: model.id,
          contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
          config: config
        });
        let hasContent = false;
        for await (const chunk of response) {
          if (chunk.candidates && chunk.candidates[0].finishReason === FinishReason.MAX_TOKENS) {
            hasContent = true;
            break;
          }
        }
        if (!hasContent) {
          throw new Error('Empty streaming response');
        }
      }
      return { valid: true, error: null };
    } catch (error: any) {
      return { valid: false, error };
    }
  }

  /**
   * 获取模型列表
   */
  public async models(): Promise<OpenAI.Models.Model[]> {
    try {
      const api = this.getBaseURL() + '/v1beta/models';
      const { data } = await axios.get(api, { params: { key: this.model.apiKey } });

      return data.models.map((m: any) => ({
        id: m.name.replace('models/', ''),
        name: m.displayName,
        description: m.description,
        object: 'model',
        created: Date.now(),
        owned_by: 'gemini'
      }) as OpenAI.Models.Model);
    } catch (error) {
      return [];
    }
  }

  /**
   * 获取嵌入维度
   */
  public async getEmbeddingDimensions(model: Model): Promise<number> {
    const data = await this.sdk.models.embedContent({
      model: model.id,
      contents: [{ role: 'user', parts: [{ text: 'hi' }] }]
    });
    return data.embeddings?.[0]?.values?.length || 0;
  }

  /**
   * 兼容性方法：sendChatMessage - 转换为completions调用
   */
  public async sendChatMessage(
    messages: Message[],
    options?: {
      onUpdate?: (content: string, reasoning?: string) => void;
      onChunk?: (chunk: any) => void;
      enableWebSearch?: boolean;
      enableThinking?: boolean;
      enableTools?: boolean;
      mcpTools?: MCPTool[];
      mcpMode?: 'prompt' | 'function';
      systemPrompt?: string;
      abortSignal?: AbortSignal;
      assistant?: any;
    }
  ): Promise<string | { content: string; reasoning?: string; reasoningTime?: number }> {
    // 🔥 修复：正确处理系统提示词传递
    // 如果有传入的assistant，使用它；否则创建一个新的assistant对象
    const assistant = options?.assistant || {
      model: this.model,
      // 🔥 关键修复：使用systemPrompt参数作为prompt
      prompt: options?.systemPrompt || '',
      settings: {
        temperature: this.model.temperature || 0.7,
        topP: (this.model as any).topP || 0.95,
        maxTokens: this.model.maxTokens || 2048,
        streamOutput: true
      },
      enableWebSearch: options?.enableWebSearch || false,
      // 对于图像生成模型，默认启用图像生成
      enableGenerateImage: isGenerateImageModel(this.model)
    };

    // 🔥 修复：如果有传入的assistant但没有prompt，使用systemPrompt
    if (options?.assistant && options?.systemPrompt && !options.assistant.prompt) {
      assistant.prompt = options.systemPrompt;
    }

    // 🔥 调试日志：显示最终使用的系统提示词
    console.log(`[GeminiProvider.sendChatMessage] 系统提示词处理:`, {
      hasSystemPrompt: !!options?.systemPrompt,
      systemPromptLength: options?.systemPrompt?.length || 0,
      assistantPrompt: assistant.prompt?.substring(0, 50) + (assistant.prompt?.length > 50 ? '...' : ''),
      assistantPromptLength: assistant.prompt?.length || 0
    });

    let result = '';
    let reasoning = '';
    let reasoningTime = 0;
    const mcpTools = options?.mcpTools || [];

    await this.completions({
      messages,
      assistant,
      mcpTools,
      onChunk: (chunk: any) => {
        // 支持新的chunk类型格式
        if (chunk.type === 'text.delta' && chunk.text) {
          result += chunk.text;
          // 传递增量文本，让前端自己累积
          options?.onUpdate?.(chunk.text, reasoning);
        } else if (chunk.type === 'thinking.delta' && chunk.text) {
          reasoning += chunk.text;
          // 对于思考内容，传递累积的思考内容
          options?.onUpdate?.(result, reasoning);
        } else if (chunk.type === 'thinking.complete') {
          reasoningTime = chunk.thinking_millsec || 0;
        }

        // 直接传递chunk给onChunk回调
        options?.onChunk?.(chunk);
      },
      onFilterMessages: () => {}
    });

    if (reasoning) {
      return { content: result, reasoning, reasoningTime };
    }
    return result;
  }

  /**
   * 兼容性方法：testConnection
   */
  public async testConnection(): Promise<boolean> {
    return (await this.check(this.model)).valid;
  }

  /**
   * 兼容性方法：getModels
   */
  public async getModels(): Promise<any[]> {
    return this.models();
  }
}

// 同时提供命名导出以确保兼容性
export { GeminiProvider };
