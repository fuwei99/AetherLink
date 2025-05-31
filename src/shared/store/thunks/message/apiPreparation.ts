import { dexieStorage } from '../../../services/DexieStorageService';
import { getMainTextContent, findImageBlocks, findFileBlocks } from '../../../utils/blockUtils';
import { getFileTypeByExtension, readFileContent, FileTypes } from '../../../utils/fileUtils';
import type { MCPTool, Message } from '../../../types'; // 补充Message类型
import { REFERENCE_PROMPT } from '../../../config/prompts';
import { MobileKnowledgeService } from '../../../services/MobileKnowledgeService';
import { newMessagesActions } from '../../slices/newMessagesSlice';
import { AssistantMessageStatus } from '../../../types/newMessage';
import store from '../../index';

/**
 * 在API调用前检查是否需要进行知识库搜索（风格：新模式）
 */
export const performKnowledgeSearchIfNeeded = async (topicId: string, assistantMessageId: string) => {
  try {
    console.log('[performKnowledgeSearchIfNeeded] 开始检查知识库选择状态...');

    // 检查是否有选中的知识库
    const knowledgeContextData = window.sessionStorage.getItem('selectedKnowledgeBase');
    console.log('[performKnowledgeSearchIfNeeded] sessionStorage数据:', knowledgeContextData);

    if (!knowledgeContextData) {
      console.log('[performKnowledgeSearchIfNeeded] 没有选中知识库，直接返回');
      return;
    }

    const contextData = JSON.parse(knowledgeContextData);
    console.log('[performKnowledgeSearchIfNeeded] 解析后的上下文数据:', contextData);

    if (!contextData.isSelected || !contextData.searchOnSend) {
      console.log('[performKnowledgeSearchIfNeeded] 不需要搜索，直接返回', {
        isSelected: contextData.isSelected,
        searchOnSend: contextData.searchOnSend
      });
      return;
    }

    console.log('[performKnowledgeSearchIfNeeded] 检测到知识库选择，开始搜索...');

    // 设置助手消息状态为搜索中
    store.dispatch(newMessagesActions.updateMessage({
      id: assistantMessageId,
      changes: {
        status: AssistantMessageStatus.SEARCHING
      }
    }));

    // 获取话题消息
    const messages = await dexieStorage.getTopicMessages(topicId);
    if (!messages || messages.length === 0) {
      console.warn('[performKnowledgeSearchIfNeeded] 无法获取话题消息');
      return;
    }

    // 找到最后一条用户消息
    const userMessage = messages
      .filter((m: Message) => m.role === 'user')
      .pop();

    if (!userMessage) {
      console.warn('[performKnowledgeSearchIfNeeded] 未找到用户消息');
      return;
    }

    // 获取用户消息的文本内容
    const userContent = getMainTextContent(userMessage);
    if (!userContent) {
      console.warn('[performKnowledgeSearchIfNeeded] 用户消息内容为空');
      return;
    }

    console.log('[performKnowledgeSearchIfNeeded] 用户消息内容:', userContent);

    // 搜索知识库 - 使用增强RAG
    const knowledgeService = MobileKnowledgeService.getInstance();
    const searchResults = await knowledgeService.search({
      knowledgeBaseId: contextData.knowledgeBase.id,
      query: userContent.trim(),
      threshold: 0.6,
      limit: 5,
      useEnhancedRAG: true // 启用增强RAG搜索
    });

    console.log(`[performKnowledgeSearchIfNeeded] 搜索到 ${searchResults.length} 个相关内容`);

    if (searchResults.length > 0) {
      // 转换为KnowledgeReference格式
      const references = searchResults.map((result, index) => ({
        id: index + 1,
        content: result.content,
        type: 'file' as const,
        similarity: result.similarity,
        knowledgeBaseId: contextData.knowledgeBase.id,
        knowledgeBaseName: contextData.knowledgeBase.name,
        sourceUrl: `knowledge://${contextData.knowledgeBase.id}/${result.documentId || index}`
      }));

      // 缓存搜索结果（用于API注入）
      const cacheKey = `knowledge-search-${userMessage.id}`;
      window.sessionStorage.setItem(cacheKey, JSON.stringify(references));

      console.log(`[performKnowledgeSearchIfNeeded] 知识库搜索结果已缓存: ${cacheKey}`);

      // 发送知识库搜索事件（借鉴MCP工具块的事件机制）
      const { EventEmitter, EVENT_NAMES } = await import('../../../services/EventService');

      // 发送知识库搜索完成事件，携带搜索结果
      EventEmitter.emit(EVENT_NAMES.KNOWLEDGE_SEARCH_COMPLETED, {
        messageId: assistantMessageId,
        knowledgeBaseId: contextData.knowledgeBase.id,
        knowledgeBaseName: contextData.knowledgeBase.name,
        searchQuery: userContent,
        searchResults: searchResults,
        references: references
      });

      console.log(`[performKnowledgeSearchIfNeeded] 已发送知识库搜索完成事件，结果数量: ${searchResults.length}`);
    }

    // 清除知识库选择状态
    window.sessionStorage.removeItem('selectedKnowledgeBase');

  } catch (error) {
    console.error('[performKnowledgeSearchIfNeeded] 知识库搜索失败:', error);
    // 清除知识库选择状态
    window.sessionStorage.removeItem('selectedKnowledgeBase');
  }
};

export const prepareMessagesForApi = async (
  topicId: string,
  assistantMessageId: string,
  _mcpTools?: MCPTool[], // 添加下划线前缀表示未使用的参数
  options?: { skipKnowledgeSearch?: boolean }
) => {
  console.log('[prepareMessagesForApi] 开始准备API消息', { topicId, assistantMessageId, options });

  // 1. 首先检查是否需要进行知识库搜索（风格：在API调用前搜索）
  if (!options?.skipKnowledgeSearch) {
    console.log('[prepareMessagesForApi] 调用知识库搜索检查...');
    await performKnowledgeSearchIfNeeded(topicId, assistantMessageId);
    console.log('[prepareMessagesForApi] 知识库搜索检查完成');
  } else {
    console.log('[prepareMessagesForApi] 跳过知识库搜索检查');
  }

  // 2. 获取包含content字段的消息
  const messages = await dexieStorage.getTopicMessages(topicId);

  // 按创建时间排序消息，确保顺序正确
  const sortedMessages = [...messages].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return timeA - timeB; // 升序排列，最早的在前面
  });

  // 获取当前助手消息
  const assistantMessage = sortedMessages.find((msg: Message) => msg.id === assistantMessageId);
  if (!assistantMessage) {
    throw new Error(`找不到助手消息 ${assistantMessageId}`);
  }

  // 获取当前助手消息的创建时间
  const assistantMessageTime = new Date(assistantMessage.createdAt).getTime();

  // 获取当前助手ID，用于获取系统提示词
  const topic = await dexieStorage.getTopic(topicId);
  const assistantId = topic?.assistantId;

  // 获取系统提示词
  // 🔥 修复：统一优先级逻辑 - 优先使用助手的系统提示词，与气泡组件和编辑对话框保持一致
  // 优先级：助手提示词 > 话题提示词 > 默认提示词
  let systemPrompt = '';
  if (assistantId) {
    const assistant = await dexieStorage.getAssistant(assistantId);
    if (assistant) {
      // 优先使用助手的系统提示词
      systemPrompt = assistant.systemPrompt || '';

      // 如果助手没有系统提示词，才使用话题的提示词
      if (!systemPrompt && topic && topic.prompt) {
        systemPrompt = topic.prompt;
      }
    }
  } else if (topic && topic.prompt) {
    // 如果没有助手，使用话题的提示词
    systemPrompt = topic.prompt;
  }

  // 注意：默认系统提示词的获取在UI层面处理（SystemPromptBubble和SystemPromptDialog）
  // 这里不需要获取默认系统提示词，避免循环依赖问题
  // 如果没有助手提示词和话题提示词，使用空字符串也是可以的

  // 转换为API请求格式，只包含当前助手消息之前的消息
  const apiMessages = [];

  for (const message of sortedMessages) {
    // 跳过当前正在处理的助手消息和所有system消息
    if (message.id === assistantMessageId || message.role === 'system') {
      continue;
    }

    // 只包含创建时间早于当前助手消息的消息
    const messageTime = new Date(message.createdAt).getTime();
    if (messageTime >= assistantMessageTime) {
      continue;
    }

    // 获取消息内容 - 检查是否有知识库缓存（风格）
    let content = getMainTextContent(message);

    // 如果是用户消息，检查是否有知识库搜索结果或选中的知识库
    if (message.role === 'user') {
      const cacheKey = `knowledge-search-${message.id}`;
      const cachedReferences = window.sessionStorage.getItem(cacheKey);

      if (cachedReferences && content) {
        try {
          const references = JSON.parse(cachedReferences);
          if (references && references.length > 0) {
            // 应用REFERENCE_PROMPT格式（风格）
            const referenceContent = `\`\`\`json\n${JSON.stringify(references, null, 2)}\n\`\`\``;
            content = REFERENCE_PROMPT
              .replace('{question}', content)
              .replace('{references}', referenceContent);

            console.log(`[prepareMessagesForApi] 为消息 ${message.id} 应用了知识库上下文，引用数量: ${references.length}`);

            // 清除缓存
            window.sessionStorage.removeItem(cacheKey);
          }
        } catch (error) {
          console.error('[prepareMessagesForApi] 解析知识库缓存失败:', error);
        }
      } else {
        // 检查是否有选中的知识库但没有缓存的搜索结果
        const knowledgeContextData = window.sessionStorage.getItem('selectedKnowledgeBase');
        if (knowledgeContextData && content) {
          try {
            const contextData = JSON.parse(knowledgeContextData);
            if (contextData.isSelected && contextData.searchOnSend) {
              console.log(`[prepareMessagesForApi] 检测到选中的知识库但没有缓存结果，进行实时搜索...`);

              // 动态导入知识库服务
              const { MobileKnowledgeService } = await import('../../../services/MobileKnowledgeService');
              const knowledgeService = MobileKnowledgeService.getInstance();

              // 搜索知识库
              const searchResults = await knowledgeService.search({
                knowledgeBaseId: contextData.knowledgeBase.id,
                query: content.trim(),
                threshold: 0.6,
                limit: 5
              });

              if (searchResults.length > 0) {
                // 转换为引用格式
                const references = searchResults.map((result: any, index: number) => ({
                  id: index + 1,
                  content: result.content,
                  type: 'file' as const,
                  similarity: result.similarity,
                  knowledgeBaseId: contextData.knowledgeBase.id,
                  knowledgeBaseName: contextData.knowledgeBase.name,
                  sourceUrl: `knowledge://${contextData.knowledgeBase.id}/${result.documentId}`
                }));

                // 应用REFERENCE_PROMPT格式
                const referenceContent = `\`\`\`json\n${JSON.stringify(references, null, 2)}\n\`\`\``;
                content = REFERENCE_PROMPT
                  .replace('{question}', content)
                  .replace('{references}', referenceContent);

                console.log(`[prepareMessagesForApi] 实时搜索并应用了知识库上下文，引用数量: ${references.length}`);
              }
            }
          } catch (error) {
            console.error('[prepareMessagesForApi] 实时知识库搜索失败:', error);
          }
        }
      }
    }

    // 检查是否有文件或图片块
    const imageBlocks = findImageBlocks(message);
    const fileBlocks = findFileBlocks(message);

    // 如果没有文件和图片，使用简单格式
    if (imageBlocks.length === 0 && fileBlocks.length === 0) {
      apiMessages.push({
        role: message.role,
        content: content || '' // 确保content不为undefined或null
      });
    } else {
      // 有文件或图片时，使用多模态格式
      const parts = [];

      // 确保至少有一个文本部分，即使内容为空
      // 这样可以避免parts数组为空导致API请求失败
      parts.push({ type: 'text', text: content || '' });

      // 处理图片块
      for (const imageBlock of imageBlocks) {
        if (imageBlock.url) {
          parts.push({
            type: 'image_url',
            image_url: {
              url: imageBlock.url
            }
          });
        } else if (imageBlock.file && imageBlock.file.base64Data) {
          let base64Data = imageBlock.file.base64Data;
          if (base64Data.includes(',')) {
            base64Data = base64Data.split(',')[1];
          }
          parts.push({
            type: 'image_url',
            image_url: {
              url: `data:${imageBlock.file.mimeType || 'image/jpeg'};base64,${base64Data}`
            }
          });
        }
      }

      // 处理文件块
      for (const fileBlock of fileBlocks) {
        if (fileBlock.file) {
          const fileType = getFileTypeByExtension(fileBlock.file.name || fileBlock.file.origin_name || '');

          // 处理文本、代码和文档类型的文件
          if (fileType === FileTypes.TEXT || fileType === FileTypes.CODE || fileType === FileTypes.DOCUMENT) {
            try {
              const fileContent = await readFileContent(fileBlock.file);
              if (fileContent) {
                // 按照最佳实例格式：文件名\n文件内容
                const fileName = fileBlock.file.origin_name || fileBlock.file.name || '未知文件';
                parts.push({
                  type: 'text',
                  text: `${fileName}\n${fileContent}`
                });
              }
            } catch (error) {
              console.error(`[prepareMessagesForApi] 读取文件内容失败:`, error);
            }
          }
        }
      }

      apiMessages.push({
        role: message.role,
        content: parts
      });
    }
  }

  // 在数组开头添加系统消息
  // 注意：MCP 工具注入现在由提供商层的智能切换机制处理
  apiMessages.unshift({
    role: 'system',
    content: systemPrompt
  });

  return apiMessages;
};