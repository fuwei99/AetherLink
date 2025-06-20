import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
import { useAssistant } from '../../../shared/hooks';
import { AssistantService } from '../../../shared/services';
import { getStorageItem } from '../../../shared/utils/storage';
import { EventEmitter, EVENT_NAMES } from '../../../shared/services/EventService';
import type { Assistant } from '../../../shared/types/Assistant';
import type { RootState } from '../../../shared/store';
import { setAssistants, setCurrentAssistant as setReduxCurrentAssistant } from '../../../shared/store/slices/assistantsSlice';
import { dexieStorage } from '../../../shared/services/DexieStorageService';

// 常量
const CURRENT_ASSISTANT_ID_KEY = 'currentAssistantId';

/**
 * 侧边栏状态管理钩子
 */
export function useSidebarState() {
  const [value, setValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  const dispatch = useDispatch();

  // 创建记忆化的 selector 来避免不必要的重新渲染
  const selectSidebarState = useMemo(
    () => createSelector(
      [
        (state: RootState) => state.assistants.assistants,
        (state: RootState) => state.assistants.currentAssistant,
        (state: RootState) => state.messages.currentTopicId
      ],
      (assistants, currentAssistant, currentTopicId) => ({
        assistants,
        currentAssistant,
        currentTopicId
      })
    ),
    []
  );

  // 直接从Redux获取数据，移除冗余的本地状态
  const { assistants: userAssistants, currentAssistant, currentTopicId } = useSelector(selectSidebarState);

  // 从数据库获取当前话题
  const [currentTopic, setCurrentTopic] = useState<any>(null);

  // 当话题ID变化时，从数据库获取话题信息
  useEffect(() => {
    const loadTopic = async () => {
      if (!currentTopicId) {
        setCurrentTopic(null);
        return;
      }

      try {
        const topic = await dexieStorage.getTopic(currentTopicId);
        if (topic) {
          setCurrentTopic(topic);
        }
      } catch (error) {
        console.error('加载话题信息失败:', error);
      }
    };

    loadTopic();
  }, [currentTopicId]);

  // 使用useAssistant钩子加载当前助手的话题
  const {
    assistant: assistantWithTopics,
    // isLoading: topicsLoading, // 注释掉未使用的变量
    updateTopic: updateAssistantTopic,
    refreshTopics,
  } = useAssistant(currentAssistant?.id || null);

  // 简化状态设置函数，直接使用Redux
  const setUserAssistants = useCallback((assistants: Assistant[]) => {
    dispatch(setAssistants(assistants));
  }, [dispatch]);

  const setCurrentAssistant = useCallback((assistant: Assistant | null) => {
    dispatch(setReduxCurrentAssistant(assistant));
  }, [dispatch]);

  // 移除复杂的加载状态防护，数据已预加载

  // 🔥 简化版本：数据已在AppInitializer中预加载，这里只处理强制重新加载
  const loadAssistants = useCallback(async (forceReload = false) => {
    // 如果需要强制重新加载，重新获取数据
    if (forceReload) {
      console.log('[SidebarTabs] 强制重新加载助手列表...');
      try {
        const assistants = await AssistantService.getUserAssistants();
        dispatch(setAssistants(assistants));
        console.log(`[SidebarTabs] 重新加载了 ${assistants.length} 个助手`);
      } catch (error) {
        console.error('[SidebarTabs] 重新加载助手列表失败:', error);
        throw error;
      }
    } else {
      // 正常情况下，数据已经在Redux中预加载，无需额外操作
      console.log('[SidebarTabs] 使用预加载的助手数据');
    }
  }, [dispatch]);

  // 🔥 简化初始化逻辑：数据已在AppInitializer中预加载，这里只需要设置loading状态
  useEffect(() => {
    // 数据已在AppInitializer中预加载，直接设置为已加载
    if (!initialized.current && userAssistants.length > 0) {
      console.log('[SidebarTabs] 检测到预加载数据，设置为已初始化');
      initialized.current = true;
      setLoading(false);
    } else if (!initialized.current) {
      // 如果还没有数据，等待AppInitializer完成
      console.log('[SidebarTabs] 等待AppInitializer完成数据预加载...');
    }
  }, [userAssistants.length]);

  // 监听SHOW_TOPIC_SIDEBAR事件，切换到话题标签页
  useEffect(() => {
    const unsubscribe = EventEmitter.on(EVENT_NAMES.SHOW_TOPIC_SIDEBAR, () => {
      setValue(1); // 切换到话题标签页（索引为1）
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // 移除冗余的状态同步逻辑，直接使用Redux状态

  return {
    value,
    setValue,
    loading,
    userAssistants,
    setUserAssistants,
    currentAssistant,
    setCurrentAssistant,
    assistantWithTopics,
    currentTopic,
    updateAssistantTopic,
    refreshTopics,
    loadAssistants
  };
}
