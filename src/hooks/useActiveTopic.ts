import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../shared/store';
import { newMessagesActions, loadTopicMessagesThunk } from '../shared/store/slices/newMessagesSlice';
import { EventEmitter, EVENT_NAMES } from '../shared/services/EventService';
import { dexieStorage } from '../shared/services/DexieStorageService';
import type { ChatTopic, Assistant } from '../shared/types/Assistant';

/**
 * useActiveTopic Hook
 * 自动触发消息加载和事件发送，无需在Redux reducer中初始化
 */
export function useActiveTopic(assistant: Assistant, initialTopic?: ChatTopic) {
  const dispatch = useDispatch();
  const [activeTopic, setActiveTopic] = useState<ChatTopic | null>(initialTopic || null);
  // 从Redux获取当前话题ID
  const currentTopicId = useSelector((state: RootState) => state.messages.currentTopicId);

  // ：话题变化时立即响应，无加载状态
  useEffect(() => {
    if (!activeTopic) return;

    console.log(`[useActiveTopic] 即时切换话题: ${activeTopic.name} (${activeTopic.id})`);

    // 1. 立即设置当前话题ID到Redux
    dispatch(newMessagesActions.setCurrentTopicId(activeTopic.id));

    // 2. 立即发送话题变更事件
    EventEmitter.emit(EVENT_NAMES.CHANGE_TOPIC, activeTopic);

    // 3. 后台异步加载话题消息（不阻塞UI）
    Promise.resolve().then(async () => {
      try {
        await dispatch(loadTopicMessagesThunk(activeTopic.id) as any);
        console.log(`[useActiveTopic] 后台消息加载完成: ${activeTopic.id}`);
      } catch (error) {
        console.error(`[useActiveTopic] 后台加载话题消息失败:`, error);
      }
    });
  }, [activeTopic, dispatch]);

  // ：助手变化时立即选择第一个话题
  useEffect(() => {
    if (!assistant) return;

    // 如果当前没有激活话题，或者激活话题不属于当前助手，则立即选择
    if (!activeTopic || activeTopic.assistantId !== assistant.id) {
      // 优先使用助手对象中的topics数组（：预加载数据）
      if (Array.isArray(assistant.topics) && assistant.topics.length > 0) {
        console.log(`[useActiveTopic] 即时选择第一个话题: ${assistant.topics[0].name}`);
        setActiveTopic(assistant.topics[0]);
        return;
      }

      // 兜底：后台异步加载（不阻塞UI）
      console.log(`[useActiveTopic] 助手对象没有topics，后台加载`);
      Promise.resolve().then(async () => {
        try {
          const allTopics = await dexieStorage.getAllTopics();
          const assistantTopics = allTopics.filter(topic => topic.assistantId === assistant.id);

          if (assistantTopics.length > 0) {
            const sortedTopics = assistantTopics.sort((a, b) => {
              const timeA = new Date(a.lastMessageTime || a.updatedAt || a.createdAt || 0).getTime();
              const timeB = new Date(b.lastMessageTime || b.updatedAt || b.createdAt || 0).getTime();
              return timeB - timeA;
            });

            console.log(`[useActiveTopic] 后台加载完成，选择话题: ${sortedTopics[0].name}`);
            setActiveTopic(sortedTopics[0]);
          } else {
            console.log(`[useActiveTopic] 助手 ${assistant.name} 没有话题`);
            setActiveTopic(null);
          }
        } catch (error) {
          console.error(`[useActiveTopic] 后台加载助手话题失败:`, error);
          setActiveTopic(null);
        }
      });
    }
  }, [assistant, activeTopic]);

  // ：监听外部话题ID变化，立即响应
  useEffect(() => {
    if (!currentTopicId || !assistant) return;

    // 如果当前激活话题已经是目标话题，无需重复处理
    if (activeTopic?.id === currentTopicId) return;

    console.log(`[useActiveTopic] 外部话题ID变化，即时切换: ${currentTopicId}`);

    // 优先从助手的topics数组中查找（：预加载数据）
    if (Array.isArray(assistant.topics)) {
      const targetTopic = assistant.topics.find(topic => topic.id === currentTopicId);
      if (targetTopic) {
        console.log(`[useActiveTopic] 从预加载数据找到话题: ${targetTopic.name}`);
        setActiveTopic(targetTopic);
        return;
      }
    }

    // 兜底：后台异步加载（不阻塞UI）
    Promise.resolve().then(async () => {
      try {
        const topic = await dexieStorage.getTopic(currentTopicId);

        if (topic && topic.assistantId === assistant.id) {
          console.log(`[useActiveTopic] 后台加载话题成功: ${topic.name}`);
          setActiveTopic(topic);
        } else if (topic) {
          console.warn(`[useActiveTopic] 话题 ${currentTopicId} 不属于当前助手 ${assistant.id}`);
        } else {
          console.warn(`[useActiveTopic] 找不到话题 ${currentTopicId}`);
        }
      } catch (error) {
        console.error(`[useActiveTopic] 后台加载外部话题失败:`, error);
      }
    });
  }, [currentTopicId, assistant, activeTopic]);

  // ：提供即时切换话题的方法
  const switchToTopic = (topic: ChatTopic) => {
    console.log(`[useActiveTopic] 即时切换到话题: ${topic.name} (${topic.id})`);
    setActiveTopic(topic);
  };

  return {
    activeTopic,
    setActiveTopic: switchToTopic
  };
}

/**
 * 的话题管理器
 * 提供话题的基本操作方法
 */
export const TopicManager = {
  async getTopic(id: string): Promise<ChatTopic | null> {
    try {
      return await dexieStorage.getTopic(id);
    } catch (error) {
      console.error(`[TopicManager] 获取话题 ${id} 失败:`, error);
      return null;
    }
  },

  async getAllTopics(): Promise<ChatTopic[]> {
    try {
      return await dexieStorage.getAllTopics();
    } catch (error) {
      console.error('[TopicManager] 获取所有话题失败:', error);
      return [];
    }
  },

  async getTopicMessages(id: string) {
    try {
      // 使用新的消息获取方式，避免直接访问已弃用的messages字段
      const messages = await dexieStorage.getMessagesByTopicId(id);
      return messages || [];
    } catch (error) {
      console.error(`[TopicManager] 获取话题 ${id} 的消息失败:`, error);
      return [];
    }
  },

  async removeTopic(id: string) {
    try {
      // TODO: 实现删除话题的逻辑，包括删除相关文件
      await dexieStorage.deleteTopic(id);
      console.log(`[TopicManager] 话题 ${id} 删除成功`);
    } catch (error) {
      console.error(`[TopicManager] 删除话题 ${id} 失败:`, error);
      throw error;
    }
  }
};
