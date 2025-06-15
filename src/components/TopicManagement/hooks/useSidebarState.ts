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

// 全局初始化状态，防止多个组件实例同时初始化
let globalInitialized = false;
let globalInitializing = false;

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

  // 添加加载状态防护
  const loadingRef = useRef(false);

  // 加载助手列表 - 优化版本，避免不必要的重新加载
  const loadAssistants = useCallback(async (forceReload = false) => {
    try {
      // 防止并发加载
      if (loadingRef.current) {
        console.log('[SidebarTabs] 正在加载中，跳过重复请求');
        return;
      }

      // 如果已经有助手数据且不是强制重新加载，则跳过
      if (!forceReload && userAssistants.length > 0) {
        console.log('[SidebarTabs] 助手列表已存在，跳过重新加载');
        return;
      }

      loadingRef.current = true;
      console.log('[SidebarTabs] 开始加载助手列表');
      const assistants = await AssistantService.getUserAssistants();
      console.log('[SidebarTabs] 获取到助手列表:', assistants.length);

      // 直接更新Redux状态
      setUserAssistants(assistants);

      // 获取当前助手ID
      const currentAssistant = await AssistantService.getCurrentAssistant();
      console.log('[SidebarTabs] 获取到当前助手:', currentAssistant?.name);

      if (currentAssistant) {
        // 如果有当前助手，直接使用
        setCurrentAssistant(currentAssistant);
      } else {
        // 否则，尝试从缓存中获取
        const cachedAssistantId = await getStorageItem<string>(CURRENT_ASSISTANT_ID_KEY);
        console.log('[SidebarTabs] 从缓存获取到助手ID:', cachedAssistantId);

        if (cachedAssistantId && assistants.length > 0) {
          const cachedAssistant = assistants.find(assistant => assistant.id === cachedAssistantId);
          if (cachedAssistant) {
            console.log('[SidebarTabs] 从缓存找到助手:', cachedAssistant.name);
            setCurrentAssistant(cachedAssistant);
            // 设置当前助手到数据库
            await AssistantService.setCurrentAssistant(cachedAssistant.id);
          } else if (assistants.length > 0) {
            console.log('[SidebarTabs] 缓存助手不存在，使用第一个助手:', assistants[0].name);
            setCurrentAssistant(assistants[0]);
            // 设置当前助手到数据库
            await AssistantService.setCurrentAssistant(assistants[0].id);
          }
        } else if (assistants.length > 0) {
          console.log('[SidebarTabs] 没有缓存助手，使用第一个助手:', assistants[0].name);
          setCurrentAssistant(assistants[0]);
          // 设置当前助手到数据库
          await AssistantService.setCurrentAssistant(assistants[0].id);
        }
      }


    } catch (error) {
      console.error('[SidebarTabs] 加载助手数据失败:', error);
      throw error;
    } finally {
      loadingRef.current = false;
    }
  }, [userAssistants.length, setUserAssistants, setCurrentAssistant]);

  // 初始化数据 - 添加全局防护机制避免重复初始化
  useEffect(() => {
    async function initializeData() {
      // 检查全局初始化状态
      if (globalInitialized || globalInitializing) {
        console.log('[SidebarTabs] 全局已初始化或正在初始化，跳过');
        setLoading(false);
        return;
      }

      // 双重检查本地状态
      if (initialized.current) {
        console.log('[SidebarTabs] 本地已经初始化过，跳过重复初始化');
        setLoading(false);
        return;
      }

      try {
        console.log('[SidebarTabs] 开始初始化侧边栏数据');
        setLoading(true);
        globalInitializing = true;
        initialized.current = true; // 立即设置为true，防止重复调用

        await loadAssistants(true); // 初始化时强制加载助手列表

        globalInitialized = true;
        console.log('[SidebarTabs] 侧边栏数据初始化完成');
      } catch (error) {
        console.error('[SidebarTabs] 初始化数据失败:', error);
        initialized.current = false; // 失败时重置，允许重试
        globalInitialized = false;
      } finally {
        globalInitializing = false;
        setLoading(false); // 确保loading状态在成功或失败后都设置
      }
    }

    initializeData();
  }, []); // 移除loadAssistants依赖，避免重复触发

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
