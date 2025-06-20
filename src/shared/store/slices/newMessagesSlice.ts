import { createEntityAdapter, createSlice, createSelector, createAsyncThunk } from '@reduxjs/toolkit';
import type { EntityState, PayloadAction } from '@reduxjs/toolkit';
import type { Message, AssistantMessageStatus } from '../../types/newMessage.ts';
import type { RootState } from '../index';
import { dexieStorage } from '../../services/DexieStorageService';
import { upsertManyBlocks } from './messageBlocksSlice';

// 1. 创建实体适配器
const messagesAdapter = createEntityAdapter<Message>();

// 错误信息接口
export interface ErrorInfo {
  message: string;
  code?: string | number;
  type?: string;
  timestamp: string;
  details?: string;
  context?: Record<string, any>;
}

// API Key 错误信息接口
export interface ApiKeyErrorInfo {
  message: string;
  originalError: any;
  timestamp: string;
  canRetry: boolean;
}

// 2. 定义状态接口
export interface NormalizedMessagesState extends EntityState<Message, string> {
  messageIdsByTopic: Record<string, string[]>; // 主题ID -> 消息ID数组的映射
  currentTopicId: string | null;
  loadingByTopic: Record<string, boolean>;
  streamingByTopic: Record<string, boolean>;
  displayCount: number;
  errors: ErrorInfo[]; // 错误信息数组，记录多个错误
  errorsByTopic: Record<string, ErrorInfo[]>; // 按主题分组的错误信息
  apiKeyErrors: Record<string, { messageId: string; error: ApiKeyErrorInfo }>; // API Key 错误状态，按主题分组
}

// 3. 定义初始状态
const initialState: NormalizedMessagesState = messagesAdapter.getInitialState({
  messageIdsByTopic: {},
  currentTopicId: null,
  loadingByTopic: {},
  streamingByTopic: {},
  displayCount: 20,
  errors: [],
  errorsByTopic: {},
  apiKeyErrors: {}
});

// 定义 Payload 类型
interface MessagesReceivedPayload {
  topicId: string;
  messages: Message[];
}

interface SetTopicLoadingPayload {
  topicId: string;
  loading: boolean;
}

interface SetTopicStreamingPayload {
  topicId: string;
  streaming: boolean;
}

// 移除了额外的状态跟踪

interface AddMessagePayload {
  topicId: string;
  message: Message;
}

interface UpdateMessagePayload {
  id: string;
  changes: Partial<Message>;
}

interface UpdateMessageStatusPayload {
  topicId: string;
  messageId: string;
  status: AssistantMessageStatus;
}

interface RemoveMessagePayload {
  topicId: string;
  messageId: string;
}

interface SetErrorPayload {
  error: ErrorInfo;
  topicId?: string; // 可选的主题ID，用于按主题分组错误
}

// API Key 错误相关的 Payload 类型
interface SetApiKeyErrorPayload {
  topicId: string;
  messageId: string;
  error: ApiKeyErrorInfo;
}

interface ClearApiKeyErrorPayload {
  topicId: string;
}

// 添加块引用的Payload类型
interface UpsertBlockReferencePayload {
  messageId: string;
  blockId: string;
  status?: string;
}

// 4. 创建 Slice
const newMessagesSlice = createSlice({
  name: 'normalizedMessages',
  initialState,
  reducers: {
    // 设置当前主题
    setCurrentTopicId(state, action: PayloadAction<string | null>) {
      state.currentTopicId = action.payload;
      if (action.payload && !(action.payload in state.messageIdsByTopic)) {
        state.messageIdsByTopic[action.payload] = [];
        state.loadingByTopic[action.payload] = false;
        state.streamingByTopic[action.payload] = false;
      }
    },

    // 设置主题加载状态
    setTopicLoading(state, action: PayloadAction<SetTopicLoadingPayload>) {
      const { topicId, loading } = action.payload;
      state.loadingByTopic[topicId] = loading;
    },

    // 设置主题流式响应状态
    setTopicStreaming(state, action: PayloadAction<SetTopicStreamingPayload>) {
      const { topicId, streaming } = action.payload;
      state.streamingByTopic[topicId] = streaming;
    },

    // 移除了额外的状态跟踪

    // 设置错误信息
    setError(state, action: PayloadAction<SetErrorPayload>) {
      const { error, topicId } = action.payload;

      // 添加到全局错误列表
      state.errors.push(error);

      // 如果超过10个错误，移除最旧的
      if (state.errors.length > 10) {
        state.errors.shift();
      }

      // 如果提供了主题ID，添加到主题错误列表
      if (topicId) {
        if (!state.errorsByTopic[topicId]) {
          state.errorsByTopic[topicId] = [];
        }

        state.errorsByTopic[topicId].push(error);

        // 如果超过5个错误，移除最旧的
        if (state.errorsByTopic[topicId].length > 5) {
          state.errorsByTopic[topicId].shift();
        }
      }
    },

    // 设置 API Key 错误
    setApiKeyError(state, action: PayloadAction<SetApiKeyErrorPayload>) {
      const { topicId, messageId, error } = action.payload;
      state.apiKeyErrors[topicId] = { messageId, error };
    },

    // 清除 API Key 错误
    clearApiKeyError(state, action: PayloadAction<ClearApiKeyErrorPayload>) {
      const { topicId } = action.payload;
      delete state.apiKeyErrors[topicId];
    },

    // 更新消息状态
    updateMessageStatus(state, action: PayloadAction<UpdateMessageStatusPayload>) {
      const { messageId, status } = action.payload;
      const message = state.entities[messageId];
      if (message) {
        message.status = status;
      }
    },

    // 设置显示消息数量
    setDisplayCount(state, action: PayloadAction<number>) {
      state.displayCount = action.payload;
    },

    // 接收消息 - 改造为：确保按时间顺序存储
    messagesReceived(state, action: PayloadAction<MessagesReceivedPayload>) {
      const { topicId, messages } = action.payload;

      console.log(`[messagesReceived] 接收 ${messages.length} 条消息，话题: ${topicId}`);

      // 添加或更新消息
      messagesAdapter.upsertMany(state as any, messages);

      // ：确保消息按时间顺序存储
      const sortedMessages = [...messages].sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return aTime - bTime; // 升序排列，最早的在前面
      });

      const sortedMessageIds = sortedMessages.map(msg => msg.id);
      console.log(`[messagesReceived] 按时间排序后的消息ID: [${sortedMessageIds.join(', ')}]`);

      // 确保不会覆盖现有消息，但保持时间顺序
      if (!state.messageIdsByTopic[topicId]) {
        state.messageIdsByTopic[topicId] = sortedMessageIds;
      } else {
        // 合并现有消息ID和新消息ID，然后重新排序以保持时间顺序
        const existingIds = state.messageIdsByTopic[topicId];
        const newIds = sortedMessageIds.filter(id => !existingIds.includes(id));
        const allIds = [...existingIds, ...newIds];

        // 获取所有消息并按时间排序
        const allMessages = allIds.map(id => state.entities[id]).filter(Boolean);
        const sortedAllMessages = allMessages.sort((a, b) => {
          const aTime = new Date(a.createdAt).getTime();
          const bTime = new Date(b.createdAt).getTime();
          return aTime - bTime;
        });

        state.messageIdsByTopic[topicId] = sortedAllMessages.map(msg => msg.id);
        console.log(`[messagesReceived] 合并排序后的消息ID: [${state.messageIdsByTopic[topicId].join(', ')}]`);
      }
    },

    // 添加消息 - 改造为：按时间顺序插入
    addMessage(state, action: PayloadAction<AddMessagePayload>) {
      const { topicId, message } = action.payload;

      console.log(`[addMessage] 添加消息 ${message.id} 到话题 ${topicId}，时间: ${message.createdAt}`);

      // 添加消息
      messagesAdapter.addOne(state as any, message);

      // ：按时间顺序插入消息ID
      if (!state.messageIdsByTopic[topicId]) {
        state.messageIdsByTopic[topicId] = [];
      }

      const messageIds = state.messageIdsByTopic[topicId];
      const newMessageTime = new Date(message.createdAt).getTime();

      // 找到正确的插入位置（保持时间升序）
      let insertIndex = messageIds.length;
      for (let i = messageIds.length - 1; i >= 0; i--) {
        const existingMessage = state.entities[messageIds[i]];
        if (existingMessage) {
          const existingTime = new Date(existingMessage.createdAt).getTime();
          if (newMessageTime >= existingTime) {
            insertIndex = i + 1;
            break;
          }
          insertIndex = i;
        }
      }

      // 在正确位置插入消息ID
      messageIds.splice(insertIndex, 0, message.id);
      console.log(`[addMessage] 消息插入到位置 ${insertIndex}，当前消息顺序: [${messageIds.join(', ')}]`);
    },

    // 更新消息
    updateMessage(state, action: PayloadAction<UpdateMessagePayload>) {
      messagesAdapter.updateOne(state as any, {
        id: action.payload.id,
        changes: action.payload.changes
      });
    },

    // 删除消息
    removeMessage(state, action: PayloadAction<RemoveMessagePayload>) {
      const { topicId, messageId } = action.payload;

      // 从实体中删除消息
      messagesAdapter.removeOne(state as any, messageId);

      // 从主题的消息ID数组中删除
      if (state.messageIdsByTopic[topicId]) {
        state.messageIdsByTopic[topicId] = state.messageIdsByTopic[topicId].filter(id => id !== messageId);
      }
    },

    // 清空主题的所有消息
    clearTopicMessages(state, action: PayloadAction<string>) {
      const topicId = action.payload;

      // 获取要删除的消息ID
      const messageIds = state.messageIdsByTopic[topicId] || [];

      // 删除消息
      messagesAdapter.removeMany(state as any, messageIds);

      // 清空主题的消息ID数组
      state.messageIdsByTopic[topicId] = [];
    },

    // 添加或更新块引用
    upsertBlockReference(state, action: PayloadAction<UpsertBlockReferencePayload>) {
      const { messageId, blockId } = action.payload;

      const messageToUpdate = state.entities[messageId];
      if (!messageToUpdate) {
        console.error(`[upsertBlockReference] 消息 ${messageId} 不存在.`);
        return;
      }

      // 获取当前块列表
      const currentBlocks = [...(messageToUpdate.blocks || [])];

      // 如果块ID不在列表中，添加它
      if (!currentBlocks.includes(blockId)) {
        // 更新消息的blocks数组
        messagesAdapter.updateOne(state as any, {
          id: messageId,
          changes: {
            blocks: [...currentBlocks, blockId]
          }
        });
      }
    }
  }
});

// 5. 导出 Actions
export const newMessagesActions = newMessagesSlice.actions;

// 6. 导出 Selectors
// 创建一个稳定的选择器函数，避免每次调用都返回新引用
const selectMessagesState = (state: RootState) => {
  if (!state.messages) {
    // 返回一个稳定的初始状态
    return messagesAdapter.getInitialState();
  }
  return state.messages;
};

export const {
  selectAll: selectAllMessages,
  selectById: selectMessageById,
  selectIds: selectMessageIds
} = messagesAdapter.getSelectors<RootState>(selectMessagesState);

// 创建稳定的空数组引用
const EMPTY_MESSAGES_ARRAY: any[] = [];

// 自定义选择器 - 使用 createSelector 进行记忆化
export const selectMessagesByTopicId = createSelector(
  [
    (state: RootState) => state.messages,
    (_state: RootState, topicId: string) => topicId
  ],
  (messagesState, topicId) => {
    if (!messagesState) {
      return EMPTY_MESSAGES_ARRAY;
    }
    const messageIds = messagesState.messageIdsByTopic[topicId] || EMPTY_MESSAGES_ARRAY;
    return messageIds.map((id: string) => messagesState.entities[id]).filter(Boolean);
  }
);

export const selectCurrentTopicId = (state: RootState) =>
  state.messages ? state.messages.currentTopicId : null;

export const selectTopicLoading = (state: RootState, topicId: string) =>
  state.messages ? state.messages.loadingByTopic[topicId] || false : false;

export const selectTopicStreaming = (state: RootState, topicId: string) =>
  state.messages ? state.messages.streamingByTopic[topicId] || false : false;

// 错误相关选择器 - 使用 createSelector 进行记忆化
export const selectErrors = createSelector(
  [(state: RootState) => state.messages],
  (messagesState) => {
    // 确保返回数组，使用稳定的空数组引用
    return messagesState?.errors || EMPTY_MESSAGES_ARRAY;
  }
);

export const selectLastError = createSelector(
  [selectErrors],
  (errors) => {
    // 直接返回最后一个错误，createSelector会处理记忆化
    return errors.length > 0 ? errors[errors.length - 1] : null;
  }
);

export const selectErrorsByTopic = createSelector(
  [
    (state: RootState) => state.messages,
    (_state: RootState, topicId: string) => topicId
  ],
  (messagesState, topicId) => {
    // 确保返回数组，使用稳定的空数组引用
    return messagesState?.errorsByTopic?.[topicId] || EMPTY_MESSAGES_ARRAY;
  }
);

// API Key 错误相关选择器 - 使用 createSelector 进行记忆化
export const selectApiKeyError = createSelector(
  [
    (state: RootState) => state.messages,
    (_state: RootState, topicId: string) => topicId
  ],
  (messagesState, topicId) => {
    // 确保返回值，添加默认值处理
    return messagesState?.apiKeyErrors?.[topicId] || null;
  }
);

export const selectHasApiKeyError = createSelector(
  [
    (state: RootState) => state.messages,
    (_state: RootState, topicId: string) => topicId
  ],
  (messagesState, topicId) => {
    // 转换为布尔值，确保有转换逻辑
    return Boolean(messagesState?.apiKeyErrors?.[topicId]);
  }
);

// 改造为：直接返回有序消息，无需运行时排序
export const selectOrderedMessagesByTopicId = createSelector(
  [selectMessagesByTopicId],
  (messages) => {
    // ：假设消息已经按时间顺序存储，直接返回
    // 这样避免了每次渲染时的排序开销，提升性能
    console.log(`[selectOrderedMessagesByTopicId] 返回 ${messages.length} 条有序消息（）`);
    return messages;
  }
);

// 异步Thunk - 改造为的简单加载
export const loadTopicMessagesThunk = createAsyncThunk(
  'normalizedMessages/loadTopicMessages',
  async (topicId: string, { dispatch }) => {
    try {
      dispatch(newMessagesActions.setTopicLoading({ topicId, loading: true }));

      console.log(`[loadTopicMessagesThunk] 开始加载话题 ${topicId} 的消息（）`);

      // 像电脑端一样，直接从topic获取消息
      const topic = await dexieStorage.getTopic(topicId);
      if (!topic) {
        console.log(`[loadTopicMessagesThunk] 话题 ${topicId} 不存在，创建空话题`);
        // 像电脑端一样，如果topic不存在就创建一个空的
        await dexieStorage.saveTopic({
          id: topicId,
          messages: [],
          messageIds: [],
          name: '新对话',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as any);
        dispatch(newMessagesActions.messagesReceived({ topicId, messages: [] }));
        return [];
      }

      // 直接从topic.messages获取消息
      let messagesFromTopic = topic.messages || [];
      console.log(`[loadTopicMessagesThunk] 从话题对象获取到 ${messagesFromTopic.length} 条消息`);

      // 数据修复：如果messages数组为空但messageIds数组有数据，从messages表恢复
      if (messagesFromTopic.length === 0 && topic.messageIds && topic.messageIds.length > 0) {
        console.log(`[loadTopicMessagesThunk] 检测到数据不一致，从messages表恢复 ${topic.messageIds.length} 条消息`);

        try {
          const recoveredMessages = [];
          for (const messageId of topic.messageIds) {
            const message = await dexieStorage.getMessage(messageId);
            if (message) {
              recoveredMessages.push(message);
            }
          }

          if (recoveredMessages.length > 0) {
            console.log(`[loadTopicMessagesThunk] 成功恢复 ${recoveredMessages.length} 条消息，更新话题数据`);

            // 更新话题的messages数组
            topic.messages = recoveredMessages;
            await dexieStorage.saveTopic(topic);

            // 使用恢复的消息
            messagesFromTopic = recoveredMessages;
          }
        } catch (error) {
          console.error(`[loadTopicMessagesThunk] 数据恢复失败:`, error);
        }
      }

      if (messagesFromTopic.length > 0) {
        // 像电脑端一样，简单的块查询
        const messageIds = messagesFromTopic.map(m => m.id);
        console.log(`[loadTopicMessagesThunk] 查询消息块，消息ID: [${messageIds.join(', ')}]`);

        const blocks = await dexieStorage.getMessageBlocksByMessageIds(messageIds);
        console.log(`[loadTopicMessagesThunk] 加载到 ${blocks.length} 个消息块`);

        // 像电脑端一样，确保消息有正确的blocks字段
        const messagesWithBlockIds = messagesFromTopic.map(m => ({
          ...m,
          blocks: m.blocks?.map(String) || []
        }));

        if (blocks.length > 0) {
          dispatch(upsertManyBlocks(blocks));
        }
        dispatch(newMessagesActions.messagesReceived({ topicId, messages: messagesWithBlockIds }));
      } else {
        console.log(`[loadTopicMessagesThunk] 话题 ${topicId} 没有消息`);
        dispatch(newMessagesActions.messagesReceived({ topicId, messages: [] }));
      }

      console.log(`[loadTopicMessagesThunk] 话题 ${topicId} 消息加载完成`);
      return messagesFromTopic;
    } catch (error) {
      console.error(`[loadTopicMessagesThunk] 加载话题 ${topicId} 消息失败:`, error);

      // 创建错误信息对象
      const errorInfo: ErrorInfo = {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: error instanceof Error && 'code' in error ? (error as any).code : 'UNKNOWN',
        type: 'LOAD_MESSAGES_ERROR',
        timestamp: new Date().toISOString(),
        details: error instanceof Error ? error.stack : undefined,
        context: { topicId }
      };

      // 分发错误
      dispatch(newMessagesActions.setError({
        error: errorInfo,
        topicId
      }));

      throw error;
    } finally {
      dispatch(newMessagesActions.setTopicLoading({ topicId, loading: false }));
    }
  }
);

// 7. 导出 Reducer
export default newMessagesSlice.reducer;