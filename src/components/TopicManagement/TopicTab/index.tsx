import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Button,
  IconButton,
  Typography,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Tooltip
} from '@mui/material';
import { debounce } from 'lodash';
import {
  Plus,
  Search,
  X,
  Edit3,
  Pin,
  Trash2,
  FolderPlus,
  Trash,
  Sparkles,
  ArrowRight,
  Download,
  FileText,
  Copy,
  Database
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { addItemToGroup } from '../../../shared/store/slices/groupsSlice';
import { removeTopic, addTopic } from '../../../shared/store/slices/assistantsSlice';
import GroupDialog from '../GroupDialog';
import { dexieStorage } from '../../../shared/services/DexieStorageService';
import { EventEmitter, EVENT_NAMES } from '../../../shared/services/EventService';
import { getMainTextContent } from '../../../shared/utils/blockUtils';
import type { ChatTopic } from '../../../shared/types';
import type { Assistant } from '../../../shared/types/Assistant';
import { useTopicGroups } from './hooks/useTopicGroups';
import VirtualizedTopicGroups from './VirtualizedTopicGroups';
import VirtualizedTopicList from './VirtualizedTopicList';
import type { RootState } from '../../../shared/store';
import store from '../../../shared/store';
import { TopicService } from '../../../shared/services/TopicService';
import { TopicNamingService } from '../../../shared/services/TopicNamingService';
import { TopicManager } from '../../../shared/services/assistant/TopicManager';
import { exportTopicAsMarkdown, exportTopicAsDocx, copyTopicAsMarkdown } from '../../../utils/exportUtils';
import { exportTopicToNotion } from '../../../utils/notionExport';
import { toastManager } from '../../EnhancedToast';

interface TopicTabProps {
  currentAssistant: ({
    id: string;
    name: string;
    systemPrompt?: string;
    topics: ChatTopic[];
    topicIds?: string[];
  }) | null;
  currentTopic: ChatTopic | null;
  onSelectTopic: (topic: ChatTopic) => void;
  onCreateTopic: () => void;
  onDeleteTopic: (topicId: string, event: React.MouseEvent) => void;
  onUpdateTopic?: (topic: ChatTopic) => void;
}

/**
 * 话题选项卡主组件
 */
export default function TopicTab({
  currentAssistant,
  currentTopic,
  onSelectTopic,
  onCreateTopic,
  onDeleteTopic,
  onUpdateTopic
}: TopicTabProps) {
  const dispatch = useDispatch();

  // 话题状态管理 - ：无加载状态，即时响应
  const [topics, setTopics] = useState<ChatTopic[]>([]);

  // 搜索相关状态
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // 话题菜单相关状态
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [contextTopic, setContextTopic] = useState<ChatTopic | null>(null);

  // 添加话题到分组对话框状态
  const [addToGroupMenuAnchorEl, setAddToGroupMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [topicToGroup, setTopicToGroup] = useState<ChatTopic | null>(null);

  // 分组对话框状态
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);

  // 编辑对话框状态
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTopicName, setEditTopicName] = useState('');
  const [editTopicPrompt, setEditTopicPrompt] = useState('');
  const [editingTopic, setEditingTopic] = useState<ChatTopic | null>(null);

  // 确认对话框状态
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    content: string;
    onConfirm: () => void;
  }>({ title: '', content: '', onConfirm: () => {} });

  // 移动到助手菜单状态
  const [moveToMenuAnchorEl, setMoveToMenuAnchorEl] = useState<null | HTMLElement>(null);

  // 使用话题分组钩子
  const { topicGroups, topicGroupMap, ungroupedTopics } = useTopicGroups(topics, currentAssistant?.id);

  // 创建防抖搜索函数
  const debouncedSearch = useMemo(
    () => debounce((query: string) => {
      setDebouncedSearchQuery(query);
    }, 300), // 300ms 防抖延迟
    []
  );

  // 获取所有助手列表（用于移动功能）
  const allAssistants = useSelector((state: RootState) => state.assistants.assistants);

  // 🔥 使用 ref 缓存上次的计算结果，避免重复计算
  const lastComputedRef = useRef<{
    assistantId: string;
    topicIds: string;
    result: ChatTopic[];
  } | null>(null);

  // 🔥 进一步优化：创建稳定的话题ID列表作为依赖
  const topicIds = useMemo(() => {
    return currentAssistant?.topics?.map(t => t.id).join(',') || '';
  }, [currentAssistant?.topics]);

  // 🔥 优化：减少重复计算，使用缓存机制
  const sortedTopics = useMemo(() => {
    if (!currentAssistant || !Array.isArray(currentAssistant.topics)) {
      return [];
    }

    // 检查是否可以使用缓存的结果
    if (lastComputedRef.current &&
        lastComputedRef.current.assistantId === currentAssistant.id &&
        lastComputedRef.current.topicIds === topicIds) {
      // 使用缓存的结果，避免重复计算
      return lastComputedRef.current.result;
    }

    // 🔥 只在真正需要重新计算时才输出日志
    console.log('[TopicTab] 重新计算排序话题，助手:', currentAssistant.name, '话题数量:', currentAssistant.topics.length);

    // 按固定状态和最后消息时间排序话题（固定的在前面，然后按时间降序）
    const sorted = [...currentAssistant.topics].sort((a, b) => {
      // 首先按固定状态排序，固定的话题在前面
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      // 如果固定状态相同，按最后消息时间降序排序（最新的在前面）
      const timeA = new Date(a.lastMessageTime || a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.lastMessageTime || b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA; // 降序排序
    });

    // 缓存计算结果
    lastComputedRef.current = {
      assistantId: currentAssistant.id,
      topicIds,
      result: sorted
    };

    return sorted;
  }, [currentAssistant?.id, topicIds]); // 🔥 使用话题ID字符串作为依赖

  // 使用useEffect更新本地状态，但只在必要时更新
  useEffect(() => {
    setTopics(sortedTopics);
  }, [sortedTopics]);

  // 添加订阅话题变更事件
  useEffect(() => {
    if (!currentAssistant) return;

    const handleTopicChange = (eventData: any) => {
      if (eventData && (eventData.assistantId === currentAssistant.id || !eventData.assistantId)) {
        // 如果是话题创建或移动事件且有topic数据，将话题添加到顶部
        if (eventData.topic && (eventData.type === 'create' || eventData.type === 'move')) {
          setTopics(prevTopics => {
            // 检查话题是否已存在，避免重复添加
            const exists = prevTopics.some(topic => topic.id === eventData.topic.id);
            if (exists) {
              return prevTopics;
            }

            // 添加新话题并重新排序
            const newTopics = [eventData.topic, ...prevTopics];
            return newTopics.sort((a, b) => {
              // 首先按固定状态排序，固定的话题在前面
              if (a.pinned && !b.pinned) return -1;
              if (!a.pinned && b.pinned) return 1;

              // 如果固定状态相同，按最后消息时间降序排序（最新的在前面）
              const timeA = new Date(a.lastMessageTime || a.updatedAt || a.createdAt || 0).getTime();
              const timeB = new Date(b.lastMessageTime || b.updatedAt || b.createdAt || 0).getTime();
              return timeB - timeA; // 降序排序
            });
          });
        }
        // 如果currentAssistant.topics已更新，则使用它并排序（改造：支持空数组）
        else if (Array.isArray(currentAssistant.topics)) {
          // 🔥 减少重复日志输出
          if (process.env.NODE_ENV === 'development') {
            console.log('[TopicTab] 事件处理：更新话题数组，话题数量:', currentAssistant.topics.length);
          }

          // 按固定状态和最后消息时间排序话题（固定的在前面，然后按时间降序）
          const sortedTopics = [...currentAssistant.topics].sort((a, b) => {
            // 首先按固定状态排序，固定的话题在前面
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;

            // 如果固定状态相同，按最后消息时间降序排序（最新的在前面）
            const timeA = new Date(a.lastMessageTime || a.updatedAt || a.createdAt || 0).getTime();
            const timeB = new Date(b.lastMessageTime || b.updatedAt || b.createdAt || 0).getTime();
            return timeB - timeA; // 降序排序
          });

          setTopics(sortedTopics);
        }
      }
    };

    // 订阅话题变更事件
    const unsubCreate = EventEmitter.on(EVENT_NAMES.TOPIC_CREATED, handleTopicChange);
    const unsubDelete = EventEmitter.on(EVENT_NAMES.TOPIC_DELETED, handleTopicChange);
    const unsubMoved = EventEmitter.on(EVENT_NAMES.TOPIC_MOVED, handleTopicChange);

    return () => {
      unsubCreate();
      unsubDelete();
      unsubMoved();
    };
  }, [currentAssistant]);

  // 自动选择第一个话题（优化：只在真正需要时自动选择）
  useEffect(() => {
    // 优化条件检查：
    // 1. 非加载状态
    // 2. 有话题列表
    // 3. 没有当前选中的话题ID
    if (topics.length > 0) {
      // 从Redux获取当前话题ID
      const currentTopicId = store.getState().messages?.currentTopicId;

      // 只有在完全没有选中话题时才自动选择第一个话题
      if (!currentTopicId) {
        console.log('[TopicTab] 即时选择第一个话题:', topics[0].name || topics[0].title);
        onSelectTopic(topics[0]);
      }
    }
  }, [topics, onSelectTopic]);

  // 监听SHOW_TOPIC_SIDEBAR事件，确保在切换到话题标签页时自动选择话题（优化：与主逻辑保持一致）
  useEffect(() => {
    const handleShowTopicSidebar = () => {
      // 如果有话题但没有选中的话题，自动选择第一个话题
      if (topics.length > 0) {
        // 使用Redux状态检查，与主自动选择逻辑保持一致
        const currentTopicId = store.getState().messages?.currentTopicId;

        // 只有在完全没有选中话题时才自动选择第一个话题
        // 移除"话题不在当前助手列表中"的检查，避免用户选择被覆盖
        if (!currentTopicId) {
          console.log('[TopicTab] SHOW_TOPIC_SIDEBAR事件触发，即时选择第一个话题:', topics[0].name);
          onSelectTopic(topics[0]);
        }
      }
    };

    const unsubscribe = EventEmitter.on(EVENT_NAMES.SHOW_TOPIC_SIDEBAR, handleShowTopicSidebar);

    return () => {
      unsubscribe();
    };
  }, [topics, onSelectTopic]);

  // 筛选话题 - 使用防抖搜索查询
  const filteredTopics = useMemo(() => {
    if (!debouncedSearchQuery) return topics;
    return topics.filter(topic => {
      // 检查名称或标题
      if ((topic.name && topic.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())) ||
          (topic.title && topic.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()))) {
        return true;
      }

      // 检查消息内容
      return (topic.messages || []).some(message => {
        // 使用getMainTextContent获取消息内容
        const content = getMainTextContent(message);
        if (content) {
          return content.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
        }
        return false;
      });
    });
  }, [debouncedSearchQuery, topics]);

  // 搜索相关处理函数
  const handleSearchClick = () => {
    setShowSearch(true);
  };

  const handleCloseSearch = useCallback(() => {
    setShowSearch(false);
    setSearchQuery('');
    setDebouncedSearchQuery('');
    // 取消待执行的防抖函数
    debouncedSearch.cancel();
  }, [debouncedSearch]);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchQuery(value);
    // 触发防抖搜索
    debouncedSearch(value);
  }, [debouncedSearch]);

  // 打开话题菜单
  const handleOpenMenu = (event: React.MouseEvent, topic: ChatTopic) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget as HTMLElement);
    setContextTopic(topic);
  };

  // 关闭话题菜单
  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
    setContextTopic(null);
  };

  // 打开分组对话框
  const handleOpenGroupDialog = () => {
    setGroupDialogOpen(true);
  };

  // 关闭分组对话框
  const handleCloseGroupDialog = () => {
    setGroupDialogOpen(false);
  };

  // 打开添加到分组菜单
  const handleAddToGroupMenu = (event: React.MouseEvent, topic: ChatTopic) => {
    event.stopPropagation();
    setTopicToGroup(topic);
    setAddToGroupMenuAnchorEl(event.currentTarget as HTMLElement);
  };

  // 关闭添加到分组菜单
  const handleCloseAddToGroupMenu = () => {
    setAddToGroupMenuAnchorEl(null);
    setTopicToGroup(null);
  };

  // 添加到指定分组
  const handleAddToGroup = (groupId: string) => {
    if (!topicToGroup) return;

    dispatch(addItemToGroup({
      groupId,
      itemId: topicToGroup.id
    }));

    handleCloseAddToGroupMenu();
  };

  // 添加到新分组
  const handleAddToNewGroup = () => {
    handleCloseAddToGroupMenu();
    handleOpenGroupDialog();
  };

  // 打开编辑话题对话框
  const handleEditTopic = () => {
    if (!contextTopic) return;

    setEditingTopic(contextTopic);
    setEditTopicName(contextTopic.name || contextTopic.title || '');
    setEditTopicPrompt(contextTopic.prompt || '');
    setEditDialogOpen(true);
    handleCloseMenu();
  };

  // 关闭编辑话题对话框
  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingTopic(null);
  };

  // 保存编辑后的话题
  const handleSaveEdit = async () => {
    if (!editingTopic) return;

    try {
      const updatedTopic = {
        ...editingTopic,
        name: editTopicName,
        prompt: editTopicPrompt,
        isNameManuallyEdited: true, // 标记为手动编辑
        updatedAt: new Date().toISOString()
      };

      // 直接保存到数据库，确保数据持久化
      await dexieStorage.saveTopic(updatedTopic);
      console.log('[TopicTab] 已保存话题到数据库');

      // 更新本地状态并重新排序
      setTopics(prevTopics => {
        const updatedTopics = prevTopics.map(topic =>
          topic.id === updatedTopic.id ? updatedTopic : topic
        );

        // 重新排序：固定的话题在前面，然后按时间降序
        return updatedTopics.sort((a, b) => {
          // 首先按固定状态排序，固定的话题在前面
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;

          // 如果固定状态相同，按最后消息时间降序排序（最新的在前面）
          const timeA = new Date(a.lastMessageTime || a.updatedAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.lastMessageTime || b.updatedAt || b.createdAt || 0).getTime();
          return timeB - timeA; // 降序排序
        });
      });
      console.log('[TopicTab] 已更新本地话题状态');

      // 如果有更新回调，调用它
      if (onUpdateTopic) {
        onUpdateTopic(updatedTopic);
        console.log('[TopicTab] 已通过回调更新话题');
      }

      // 发送更新事件
      EventEmitter.emit(EVENT_NAMES.TOPIC_UPDATED, updatedTopic);
      console.log('[TopicTab] 已发送话题更新事件');

      handleCloseEditDialog();
      console.log('[TopicTab] 话题编辑完成');
    } catch (error) {
      console.error('[TopicTab] 保存话题编辑失败:', error);
    }
  };

  // 固定/取消固定话题
  const handleTogglePin = async () => {
    if (!contextTopic) return;

    try {
      const updatedTopic = {
        ...contextTopic,
        pinned: !contextTopic.pinned,
        updatedAt: new Date().toISOString()
      };

      // 保存到数据库
      await dexieStorage.saveTopic(updatedTopic);

      // 更新本地状态并重新排序
      setTopics(prevTopics => {
        const updatedTopics = prevTopics.map(topic =>
          topic.id === updatedTopic.id ? updatedTopic : topic
        );

        // 重新排序：固定的话题在前面，然后按时间降序
        return updatedTopics.sort((a, b) => {
          // 首先按固定状态排序，固定的话题在前面
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;

          // 如果固定状态相同，按最后消息时间降序排序（最新的在前面）
          const timeA = new Date(a.lastMessageTime || a.updatedAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.lastMessageTime || b.updatedAt || b.createdAt || 0).getTime();
          return timeB - timeA; // 降序排序
        });
      });

      // 如果有更新回调，调用它
      if (onUpdateTopic) {
        onUpdateTopic(updatedTopic);
      }

      // 发送更新事件
      EventEmitter.emit(EVENT_NAMES.TOPIC_UPDATED, updatedTopic);

      handleCloseMenu();
    } catch (error) {
      console.error('切换话题固定状态失败:', error);
    }
  };

  // 自动命名话题 - 与最佳实例保持一致
  const handleAutoRenameTopic = async () => {
    if (!contextTopic) return;

    try {
      console.log(`[TopicTab] 手动触发话题自动命名: ${contextTopic.id}`);

      // 强制生成话题名称，不检查shouldNameTopic条件
      const newName = await TopicNamingService.generateTopicName(contextTopic, undefined, true);

      if (newName && newName !== contextTopic.name) {
        // 更新话题名称
        const updatedTopic = {
          ...contextTopic,
          name: newName,
          isNameManuallyEdited: false, // 标记为自动生成
          updatedAt: new Date().toISOString()
        };

        // 保存到数据库
        await dexieStorage.saveTopic(updatedTopic);

        // 更新本地状态并重新排序
        setTopics(prevTopics => {
          const updatedTopics = prevTopics.map(topic =>
            topic.id === updatedTopic.id ? updatedTopic : topic
          );

          // 重新排序：固定的话题在前面，然后按时间降序
          return updatedTopics.sort((a, b) => {
            // 首先按固定状态排序，固定的话题在前面
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;

            // 如果固定状态相同，按最后消息时间降序排序（最新的在前面）
            const timeA = new Date(a.lastMessageTime || a.updatedAt || a.createdAt || 0).getTime();
            const timeB = new Date(b.lastMessageTime || b.updatedAt || b.createdAt || 0).getTime();
            return timeB - timeA; // 降序排序
          });
        });

        // 如果有更新回调，调用它
        if (onUpdateTopic) {
          onUpdateTopic(updatedTopic);
        }

        // 发送更新事件
        EventEmitter.emit(EVENT_NAMES.TOPIC_UPDATED, updatedTopic);

        console.log(`话题已自动命名: ${newName}`);
      } else {
        console.log('话题命名未发生变化或生成失败');
      }
    } catch (error) {
      console.error('自动命名话题失败:', error);
    }

    handleCloseMenu();
  };

  // 清空消息 - 使用聊天界面的清空方法
  const handleClearMessages = () => {
    if (!contextTopic) return;

    setConfirmDialogConfig({
      title: '清空消息',
      content: '确定要清空此话题的所有消息吗？此操作不可撤销。',
      onConfirm: async () => {
        try {
          // 使用 TopicService 的清空方法，与聊天界面保持一致
          const success = await TopicService.clearTopicContent(contextTopic.id);

          if (success) {
            // 更新本地状态 - 清空消息但保留话题
            setTopics(prevTopics =>
              prevTopics.map(topic =>
                topic.id === contextTopic.id
                  ? { ...topic, messageIds: [], messages: [], updatedAt: new Date().toISOString() }
                  : topic
              )
            );

            // 如果有更新回调，调用它
            if (onUpdateTopic) {
              const updatedTopic = {
                ...contextTopic,
                messageIds: [],
                messages: [],
                updatedAt: new Date().toISOString()
              };
              onUpdateTopic(updatedTopic);
            }

            console.log('话题消息已清空');
          } else {
            console.error('清空话题消息失败');
          }

          setConfirmDialogOpen(false);
        } catch (error) {
          console.error('清空话题消息失败:', error);
          setConfirmDialogOpen(false);
        }
      }
    });

    setConfirmDialogOpen(true);
    handleCloseMenu();
  };

  // 打开移动到助手菜单
  const handleOpenMoveToMenu = (event: React.MouseEvent) => {
    event.stopPropagation();
    setMoveToMenuAnchorEl(event.currentTarget as HTMLElement);
  };

  // 关闭移动到助手菜单
  const handleCloseMoveToMenu = () => {
    setMoveToMenuAnchorEl(null);
  };

  // 移动话题到其他助手
  const handleMoveTo = async (targetAssistant: Assistant) => {
    if (!contextTopic || !currentAssistant) return;

    try {
      // 更新话题的助手ID
      const updatedTopic = {
        ...contextTopic,
        assistantId: targetAssistant.id,
        updatedAt: new Date().toISOString()
      };

      // 保存到数据库
      await dexieStorage.saveTopic(updatedTopic);

      // 更新助手的topicIds - 从源助手移除，添加到目标助手
      await Promise.all([
        TopicManager.removeTopicFromAssistant(currentAssistant.id, contextTopic.id),
        TopicManager.addTopicToAssistant(targetAssistant.id, contextTopic.id)
      ]);

      // 更新Redux状态 - 按照新建话题的方式
      dispatch(removeTopic({
        assistantId: currentAssistant.id,
        topicId: contextTopic.id
      }));
      dispatch(addTopic({
        assistantId: targetAssistant.id,
        topic: updatedTopic
      }));

      // 从当前助手的话题列表中移除
      setTopics(prevTopics =>
        prevTopics.filter(topic => topic.id !== contextTopic.id)
      );

      // 发送话题移动事件 - 按照新建话题的格式
      EventEmitter.emit(EVENT_NAMES.TOPIC_MOVED, {
        topic: updatedTopic,
        assistantId: targetAssistant.id,
        type: 'move'
      });

      console.log(`话题 ${contextTopic.name} 已移动到助手 ${targetAssistant.name}`);
      handleCloseMoveToMenu();
      handleCloseMenu();
    } catch (error) {
      console.error('移动话题失败:', error);
    }
  };

  // 导出话题为Markdown格式
  const handleExportTopicAsMarkdown = async (includeReasoning = false) => {
    if (!contextTopic) return;
    
    try {
      await exportTopicAsMarkdown(contextTopic, includeReasoning);
    } catch (error) {
      console.error('导出话题Markdown失败:', error);
    }
    handleCloseMenu();
  };

  // 导出话题为DOCX格式
  const handleExportTopicAsDocx = async (includeReasoning = false) => {
    if (!contextTopic) return;
    
    try {
      await exportTopicAsDocx(contextTopic, includeReasoning);
    } catch (error) {
      console.error('导出话题DOCX失败:', error);
    }
    handleCloseMenu();
  };

  // 复制话题为Markdown格式
  const handleCopyTopicAsMarkdown = async (includeReasoning = false) => {
    if (!contextTopic) return;
    
    try {
      await copyTopicAsMarkdown(contextTopic, includeReasoning);
    } catch (error) {
      console.error('复制话题Markdown失败:', error);
    }
    handleCloseMenu();
  };

  // 导出话题到Notion
  const handleExportTopicToNotion = async (includeReasoning = false) => {
    if (!contextTopic) return;

    const notionSettings = store.getState().settings.notion;

    if (!notionSettings?.enabled) {
      toastManager.warning('请先在设置页面启用并配置Notion集成', '配置提醒');
      return;
    }

    if (!notionSettings.apiKey || !notionSettings.databaseId) {
      toastManager.warning('请先在设置页面配置Notion API密钥和数据库ID', '配置提醒');
      return;
    }

    try {
      await exportTopicToNotion(contextTopic, {
        apiKey: notionSettings.apiKey,
        databaseId: notionSettings.databaseId,
        pageTitleField: notionSettings.pageTitleField || 'Name',
        dateField: notionSettings.dateField
      }, includeReasoning);
    } catch (error) {
      console.error('导出话题到Notion失败:', error);
      // 错误处理已经在exportTopicToNotion函数内部处理了，这里不需要额外提示
    }
    handleCloseMenu();
  };

  return (
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      // 整体容器性能优化
      contain: 'layout style paint',
      transform: 'translateZ(0)',
      // 防止不必要的重绘
      isolation: 'isolate',
    }}>
      {/* 标题和按钮区域 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        {showSearch ? (
          <TextField
            fullWidth
            size="small"
            placeholder="搜索话题..."
            value={searchQuery}
            onChange={handleSearchChange}
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={handleCloseSearch}>
                    <X size={18} />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        ) : (
          <>
            <Typography variant="subtitle1" fontWeight="medium">
              {currentAssistant?.name || '所有话题'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <IconButton size="small" onClick={handleSearchClick} sx={{ mr: 0.5 }}>
                <Search size={18} />
              </IconButton>
              <Tooltip title="创建话题分组">
                <IconButton
                  size="small"
                  onClick={handleOpenGroupDialog}
                  sx={{
                    color: 'text.primary',
                    border: '1px solid',
                    borderColor: 'text.secondary',
                    borderRadius: '6px',
                    '&:hover': {
                      borderColor: 'text.primary',
                      backgroundColor: 'action.hover'
                    }
                  }}
                >
                  <FolderPlus size={16} />
                </IconButton>
              </Tooltip>
              <Tooltip title="创建新话题">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Plus size={16} />}
                  onClick={onCreateTopic}
                  sx={{
                    color: 'text.primary',
                    borderColor: 'text.secondary',
                    minWidth: 'auto',
                    px: 1,
                    fontSize: '0.75rem',
                    '&:hover': {
                      borderColor: 'text.primary',
                      backgroundColor: 'action.hover'
                    }
                  }}
                >
                  新建话题
                </Button>
              </Tooltip>
            </Box>
          </>
        )}
      </Box>

      {/* 没有话题时的提示 - ：无加载状态，即时显示 */}
      {topics.length === 0 && (
        <Box sx={{ py: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            此助手没有话题，点击上方的"+"按钮创建一个新话题。
          </Typography>
        </Box>
      )}

      {/* 分组区域 */}
      <VirtualizedTopicGroups
        topicGroups={topicGroups}
        topics={filteredTopics}
        topicGroupMap={topicGroupMap}
        currentTopic={currentTopic}
        onSelectTopic={onSelectTopic}
        onOpenMenu={handleOpenMenu}
        onDeleteTopic={onDeleteTopic}
      />

      {/* 未分组话题列表 - 使用虚拟化组件 */}
      <VirtualizedTopicList
        topics={ungroupedTopics}
        currentTopic={currentTopic}
        onSelectTopic={onSelectTopic}
        onOpenMenu={handleOpenMenu}
        onDeleteTopic={onDeleteTopic}
        title="未分组话题"
        height="calc(100vh - 400px)" // 动态计算高度
        emptyMessage="暂无未分组话题"
        itemHeight={64} // 更新为64px以包含margin-bottom空间
        searchQuery={debouncedSearchQuery}
        getMainTextContent={getMainTextContent}
      />

      {/* 分组对话框 */}
      <GroupDialog
        open={groupDialogOpen}
        onClose={handleCloseGroupDialog}
        type="topic"
        assistantId={currentAssistant?.id}
      />

      {/* 话题菜单 */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleCloseMenu}
      >
        {[
          <MenuItem key="add-to-group" onClick={(e) => {
            if (contextTopic) handleAddToGroupMenu(e, contextTopic);
            handleCloseMenu();
          }}>
            <FolderPlus size={18} style={{ marginRight: 8 }} />
            添加到分组...
          </MenuItem>,
          <MenuItem key="edit-topic" onClick={handleEditTopic}>
            <Edit3 size={18} style={{ marginRight: 8 }} />
            编辑话题
          </MenuItem>,
          <MenuItem key="auto-rename" onClick={handleAutoRenameTopic}>
            <Sparkles size={18} style={{ marginRight: 8 }} />
            自动命名话题
          </MenuItem>,
          <MenuItem key="toggle-pin" onClick={handleTogglePin}>
            <Pin size={18} style={{ marginRight: 8 }} />
            {contextTopic?.pinned ? '取消固定' : '固定话题'}
          </MenuItem>,
          <MenuItem key="clear-messages" onClick={handleClearMessages}>
            <Trash2 size={18} style={{ marginRight: 8 }} />
            清空消息
          </MenuItem>,
          allAssistants.length > 1 && currentAssistant && (
            <MenuItem key="move-to" onClick={handleOpenMoveToMenu}>
              <ArrowRight size={18} style={{ marginRight: 8 }} />
              移动到...
            </MenuItem>
          ),
          <Divider key="divider-export" />,
          <MenuItem key="copy-markdown" onClick={() => handleCopyTopicAsMarkdown(false)}>
            <Copy size={18} style={{ marginRight: 8 }} />
            复制为Markdown
          </MenuItem>,
          <MenuItem key="export-markdown" onClick={() => handleExportTopicAsMarkdown(false)}>
            <Download size={18} style={{ marginRight: 8 }} />
            导出为Markdown
          </MenuItem>,
          <MenuItem key="export-docx" onClick={() => handleExportTopicAsDocx(false)}>
            <FileText size={18} style={{ marginRight: 8 }} />
            导出为DOCX
          </MenuItem>,
          <MenuItem key="export-notion" onClick={() => handleExportTopicToNotion(false)}>
            <Database size={18} style={{ marginRight: 8 }} />
            导出到Notion
          </MenuItem>,
          <Divider key="divider-1" />,
          <MenuItem key="delete-topic" onClick={() => {
            if (contextTopic) {
              // 使用确认对话框来删除话题
              setConfirmDialogConfig({
                title: '删除话题',
                content: '确定要删除此话题吗？此操作不可撤销。',
                onConfirm: async () => {
                  try {
                    // 直接调用删除逻辑，不需要传递事件对象
                    await TopicService.deleteTopic(contextTopic.id);

                    // 从本地状态中移除话题
                    setTopics(prevTopics =>
                      prevTopics.filter(topic => topic.id !== contextTopic.id)
                    );

                    // 发送删除事件
                    EventEmitter.emit(EVENT_NAMES.TOPIC_DELETED, {
                      topicId: contextTopic.id,
                      assistantId: currentAssistant?.id
                    });

                    console.log('话题已删除');
                  } catch (error) {
                    console.error('删除话题失败:', error);
                  }
                  setConfirmDialogOpen(false);
                }
              });
              setConfirmDialogOpen(true);
            }
            handleCloseMenu();
          }}>
            <Trash size={18} style={{ marginRight: 8 }} />
            删除话题
          </MenuItem>
        ].filter(Boolean)}
      </Menu>

      {/* 添加到分组菜单 */}
      <Menu
        anchorEl={addToGroupMenuAnchorEl}
        open={Boolean(addToGroupMenuAnchorEl)}
        onClose={handleCloseAddToGroupMenu}
      >
        {[
          ...topicGroups.map((group) => (
            <MenuItem
              key={group.id}
              onClick={() => handleAddToGroup(group.id)}
            >
              {group.name}
            </MenuItem>
          )),
          <MenuItem key="create-new-group" onClick={handleAddToNewGroup}>创建新分组...</MenuItem>
        ].filter(Boolean)}
      </Menu>

      {/* 移动到助手菜单 */}
      <Menu
        anchorEl={moveToMenuAnchorEl}
        open={Boolean(moveToMenuAnchorEl)}
        onClose={handleCloseMoveToMenu}
      >
        {allAssistants
          .filter(assistant => assistant.id !== currentAssistant?.id)
          .map((assistant) => (
            <MenuItem
              key={assistant.id}
              onClick={() => handleMoveTo(assistant)}
            >
              {assistant.emoji && <span style={{ marginRight: 8 }}>{assistant.emoji}</span>}
              {assistant.name}
            </MenuItem>
          )).filter(Boolean)}
      </Menu>

      {/* 编辑话题对话框 */}
      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>编辑话题</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="话题名称"
            type="text"
            fullWidth
            variant="outlined"
            value={editTopicName}
            onChange={(e) => setEditTopicName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="追加提示词"
            multiline
            rows={6}
            fullWidth
            variant="outlined"
            value={editTopicPrompt}
            onChange={(e) => setEditTopicPrompt(e.target.value)}
            helperText="此提示词将追加到助手的系统提示词之后。如果助手没有系统提示词，则单独使用此提示词。"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>取消</Button>
          <Button onClick={handleSaveEdit} color="primary">保存</Button>
        </DialogActions>
      </Dialog>

      {/* 确认对话框 */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>{confirmDialogConfig.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialogConfig.content}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>
            取消
          </Button>
          <Button onClick={confirmDialogConfig.onConfirm} variant="contained" color="error">
            确认
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}