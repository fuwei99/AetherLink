import React, { useRef, useState, useEffect } from 'react';
import { Box, Typography, useTheme, IconButton } from '@mui/material';
// Lucide Icons - 按需导入，高端简约设计
import { Plus, Trash2, AlertTriangle, Camera, Search, ChevronLeft, BookOpen, Video } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../shared/store';
import { TopicService } from '../../shared/services/TopicService';
import { EventEmitter, EVENT_NAMES } from '../../shared/services/EventService';
import { newMessagesActions } from '../../shared/store/slices/newMessagesSlice';
import { updateSettings } from '../../shared/store/settingsSlice';
import WebSearchProviderSelector from '../WebSearchProviderSelector';
import MCPToolsButton from '../chat/MCPToolsButton';
import KnowledgeSelector from '../chat/KnowledgeSelector';

// 现代玻璃UI工具栏样式 - 2025年设计趋势
// 导出供其他组件使用
export const getGlassmorphismToolbarStyles = (isDarkMode: boolean) => {
  return {
    // 容器样式 - 玻璃容器
    container: {
      background: 'transparent',
      border: 'none',
      borderRadius: '24px',
      padding: '0 8px'
    },
    // 按钮样式 - 长方圆形玻璃背景
    button: {
      // 玻璃背景效果
      background: isDarkMode
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(255, 255, 255, 0.15)',
      // 玻璃边框
      border: isDarkMode
        ? '1px solid rgba(255, 255, 255, 0.12)'
        : '1px solid rgba(255, 255, 255, 0.25)',
      // 长方圆形设计
      borderRadius: '16px',
      padding: '8px 14px',
      // 毛玻璃效果
      backdropFilter: 'blur(12px) saturate(120%)',
      WebkitBackdropFilter: 'blur(12px) saturate(120%)', // Safari兼容
      // 阴影效果
      boxShadow: isDarkMode
        ? '0 4px 16px rgba(0, 0, 0, 0.15), 0 1px 4px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
        : '0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
      // 动画过渡
      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      minHeight: '36px',
      // 防止文本选择
      userSelect: 'none',
      WebkitUserSelect: 'none',
      // 硬件加速
      willChange: 'transform, background, box-shadow',
      transform: 'translateZ(0)'
    },
    // 按钮悬停效果 - 增强玻璃效果
    buttonHover: {
      background: isDarkMode
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(255, 255, 255, 0.25)',
      border: isDarkMode
        ? '1px solid rgba(255, 255, 255, 0.18)'
        : '1px solid rgba(255, 255, 255, 0.35)',
      backdropFilter: 'blur(16px) saturate(140%)',
      WebkitBackdropFilter: 'blur(16px) saturate(140%)',
      boxShadow: isDarkMode
        ? '0 6px 24px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
        : '0 6px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
      transform: 'translateY(-1px) translateZ(0)'
    },
    // 按钮激活效果 - 按压玻璃效果
    buttonActive: {
      background: isDarkMode
        ? 'rgba(255, 255, 255, 0.15)'
        : 'rgba(255, 255, 255, 0.3)',
      border: isDarkMode
        ? '1px solid rgba(255, 255, 255, 0.2)'
        : '1px solid rgba(255, 255, 255, 0.4)',
      backdropFilter: 'blur(20px) saturate(160%)',
      WebkitBackdropFilter: 'blur(20px) saturate(160%)',
      boxShadow: isDarkMode
        ? '0 2px 8px rgba(0, 0, 0, 0.25), inset 0 2px 4px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
        : '0 2px 8px rgba(0, 0, 0, 0.15), inset 0 2px 4px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
      transform: 'translateY(0px) scale(0.98) translateZ(0)'
    },
    // 文字样式 - 现代字体
    text: {
      fontSize: '13px',
      fontWeight: 600,
      color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)',
      textShadow: isDarkMode
        ? '0 1px 2px rgba(0, 0, 0, 0.3)'
        : '0 1px 2px rgba(255, 255, 255, 0.8)',
      letterSpacing: '0.01em'
    }
  };
};

// 透明样式工具栏样式 - 简约设计
// 导出供其他组件使用
export const getTransparentToolbarStyles = (isDarkMode: boolean) => {
  return {
    // 容器样式 - 透明容器
    container: {
      background: 'transparent',
      border: 'none',
      borderRadius: '24px',
      padding: '0 8px'
    },
    // 按钮样式 - 简约透明
    button: {
      background: 'transparent',
      border: 'none',
      borderRadius: '20px',
      padding: '6px 12px',
      transition: 'all 0.15s ease',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      minHeight: '32px'
    },
    // 按钮悬停效果 - 轻微
    buttonHover: {
      background: isDarkMode
        ? 'rgba(255, 255, 255, 0.06)'
        : 'rgba(0, 0, 0, 0.04)'
    },
    // 按钮激活效果 - 简单
    buttonActive: {
      background: isDarkMode
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(0, 0, 0, 0.06)',
      transform: 'scale(0.96)'
    },
    // 文字样式 - 小字体
    text: {
      fontSize: '13px',
      fontWeight: 500,
      color: isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.75)'
    }
  };
};

interface ChatToolbarProps {
  onClearTopic?: () => void;
  imageGenerationMode?: boolean; // 是否处于图像生成模式
  toggleImageGenerationMode?: () => void; // 切换图像生成模式
  videoGenerationMode?: boolean; // 是否处于视频生成模式
  toggleVideoGenerationMode?: () => void; // 切换视频生成模式
  webSearchActive?: boolean; // 是否处于网络搜索模式
  toggleWebSearch?: () => void; // 切换网络搜索模式
  toolsEnabled?: boolean; // 是否启用工具调用
  onToolsEnabledChange?: (enabled: boolean) => void; // 切换工具调用
}

/**
 * 聊天工具栏组件
 * 提供新建话题和清空话题内容功能
 * 使用独立气泡式设计，支持横向滑动
 */
const ChatToolbar: React.FC<ChatToolbarProps> = ({
  onClearTopic,
  imageGenerationMode = false,
  toggleImageGenerationMode,
  videoGenerationMode = false,
  toggleVideoGenerationMode,
  webSearchActive = false,
  toggleWebSearch,
  toolsEnabled = true,
  onToolsEnabledChange
}) => {
  // ==================== 状态定义区域 ====================
  const scrollRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [showProviderSelector, setShowProviderSelector] = useState(false);
  const [clearConfirmMode, setClearConfirmMode] = useState(false);
  const [showKnowledgeSelector, setShowKnowledgeSelector] = useState(false);

  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const dispatch = useDispatch();

  // ==================== Redux状态获取区域 ====================
  // 从Redux获取网络搜索设置
  const webSearchSettings = useSelector((state: RootState) => state.webSearch);
  const webSearchEnabled = webSearchSettings?.enabled || false;
  const currentProvider = webSearchSettings?.provider;

  // 获取工具栏显示样式设置
  const toolbarDisplayStyle = useSelector((state: RootState) =>
    (state.settings as any).toolbarDisplayStyle || 'both'
  );

  // 获取工具栏折叠状态
  const toolbarCollapsedFromStore = useSelector((state: RootState) =>
    (state.settings as any).toolbarCollapsed || false
  );

  // 使用本地状态来立即响应UI变化，避免等待异步保存
  const [localToolbarCollapsed, setLocalToolbarCollapsed] = useState(toolbarCollapsedFromStore);


  // 根据设置选择样式
  const toolbarStyle = useSelector((state: RootState) => state.settings.toolbarStyle || 'glassmorphism');

  // 获取工具栏按钮配置
  const toolbarButtons = useSelector((state: RootState) => state.settings.toolbarButtons || {
    order: ['mcp-tools', 'new-topic', 'clear-topic', 'generate-image', 'generate-video', 'knowledge', 'web-search'],
    visibility: {
      'mcp-tools': true,
      'new-topic': true,
      'clear-topic': true,
      'generate-image': true,
      'generate-video': true,
      'knowledge': true,
      'web-search': true
    }
  });

  // ==================== 计算属性区域 ====================
  const currentStyles = toolbarStyle === 'glassmorphism'
    ? getGlassmorphismToolbarStyles(isDarkMode)
    : getTransparentToolbarStyles(isDarkMode);

  // 获取按钮的当前样式
  const getButtonCurrentStyle = (isActive: boolean) => {
    const baseStyle = {
      ...currentStyles.button,
      // 激活状态的特殊效果（仅在玻璃样式下）
      ...(isActive && toolbarStyle === 'glassmorphism' && {
        background: isDarkMode
          ? 'rgba(255, 255, 255, 0.18)'
          : 'rgba(255, 255, 255, 0.35)',
        border: isDarkMode
          ? '1px solid rgba(255, 255, 255, 0.25)'
          : '1px solid rgba(255, 255, 255, 0.45)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        boxShadow: isDarkMode
          ? '0 4px 20px rgba(0, 0, 0, 0.2), 0 1px 6px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
          : '0 4px 20px rgba(0, 0, 0, 0.1), 0 1px 6px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)'
      }),
      // 激活状态的透明样式效果
      ...(isActive && toolbarStyle === 'transparent' && {
        background: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'
      })
    };

    return baseStyle;
  };

  // ==================== useEffect区域 ====================
  // 自动重置确认模式（3秒后）
  useEffect(() => {
    if (clearConfirmMode) {
      const timer = setTimeout(() => {
        setClearConfirmMode(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [clearConfirmMode]);

  // 同步本地状态与store状态
  useEffect(() => {
    setLocalToolbarCollapsed(toolbarCollapsedFromStore);
  }, [toolbarCollapsedFromStore]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // ==================== 事件处理函数区域 ====================

  // ---------- 工具栏控制相关 ----------
  // 切换工具栏折叠状态
  const toggleToolbarCollapse = () => {
    const newCollapsedState = !localToolbarCollapsed;
    // 立即更新本地状态，提供即时反馈
    setLocalToolbarCollapsed(newCollapsedState);

    // 清除之前的保存定时器
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // 防抖保存：500ms后才保存到store，避免频繁点击时的性能问题
    saveTimeoutRef.current = setTimeout(() => {
      dispatch(updateSettings({
        toolbarCollapsed: newCollapsedState
      }));
    }, 500);
  };

  // ---------- 话题操作相关 ----------
  // 处理清空内容的二次确认
  const handleClearTopic = () => {
    if (clearConfirmMode) {
      // 第二次点击，执行清空
      onClearTopic?.();
      setClearConfirmMode(false);
    } else {
      // 第一次点击，进入确认模式
      setClearConfirmMode(true);
    }
  };

  // 优化的创建新话题函数，减少嵌套异步调用
  const handleCreateTopic = async () => {
    // 触发新建话题事件
    EventEmitter.emit(EVENT_NAMES.ADD_NEW_TOPIC);
    if (process.env.NODE_ENV === 'development') {
      console.log('[ChatToolbar] Emitted ADD_NEW_TOPIC event.');
    }

    // 创建新话题
    const newTopic = await TopicService.createNewTopic();

    // 如果成功创建话题，自动跳转到新话题
    if (newTopic) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[ChatToolbar] 成功创建新话题，自动跳转:', newTopic.id);
      }

      // 使用requestAnimationFrame批量处理状态更新
      requestAnimationFrame(() => {
        // 设置当前话题
        dispatch(newMessagesActions.setCurrentTopicId(newTopic.id));

        // 延迟触发侧边栏显示，确保状态更新完成
        setTimeout(() => {
          EventEmitter.emit(EVENT_NAMES.SHOW_TOPIC_SIDEBAR);
        }, 50);
      });
    }
  };

  // ---------- 拖动滑动相关 ----------
  // 优化的拖动滑动处理 - 增加齿轮感和流畅度
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // 移除折叠状态检查，因为折叠时工具栏已经隐藏
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current!.offsetLeft);
    setScrollLeft(scrollRef.current!.scrollLeft);
    // 添加抓取光标
    if (scrollRef.current) {
      scrollRef.current.style.cursor = 'grabbing';
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // 恢复光标
    if (scrollRef.current) {
      scrollRef.current.style.cursor = 'grab';
    }
    // 添加惯性滚动效果
    addInertiaScrolling();
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    if (scrollRef.current) {
      scrollRef.current.style.cursor = 'grab';
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current!.offsetLeft;
    const walk = (x - startX) * 1.5; // 调整滚动速度，更流畅
    const newScrollLeft = scrollLeft - walk;

    // 添加边界检查和回弹效果
    if (scrollRef.current) {
      const maxScroll = scrollRef.current.scrollWidth - scrollRef.current.clientWidth;
      if (newScrollLeft < 0) {
        scrollRef.current.scrollLeft = newScrollLeft * 0.3; // 回弹效果
      } else if (newScrollLeft > maxScroll) {
        scrollRef.current.scrollLeft = maxScroll + (newScrollLeft - maxScroll) * 0.3;
      } else {
        scrollRef.current.scrollLeft = newScrollLeft;
      }
    }
  };

  // 添加惯性滚动效果
  const addInertiaScrolling = () => {
    // 这里可以添加惯性滚动的实现
    // 暂时简化处理
  };

  // 触摸设备的处理 - 优化触摸体验
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    // 移除折叠状态检查，因为折叠时工具栏已经隐藏
    setIsDragging(true);
    setStartX(e.touches[0].pageX - scrollRef.current!.offsetLeft);
    setScrollLeft(scrollRef.current!.scrollLeft);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    addInertiaScrolling();
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const x = e.touches[0].pageX - scrollRef.current!.offsetLeft;
    const walk = (x - startX) * 1.5;
    const newScrollLeft = scrollLeft - walk;

    if (scrollRef.current) {
      const maxScroll = scrollRef.current.scrollWidth - scrollRef.current.clientWidth;
      if (newScrollLeft < 0) {
        scrollRef.current.scrollLeft = newScrollLeft * 0.3;
      } else if (newScrollLeft > maxScroll) {
        scrollRef.current.scrollLeft = maxScroll + (newScrollLeft - maxScroll) * 0.3;
      } else {
        scrollRef.current.scrollLeft = newScrollLeft;
      }
    }
  };

  // ---------- 功能切换相关 ----------
  // 处理知识库按钮点击
  const handleKnowledgeClick = () => {
    setShowKnowledgeSelector(true);
  };

  // 处理知识库选择
  const handleKnowledgeSelect = (knowledgeBase: any, searchResults: any[]) => {
    console.log('选择了知识库:', knowledgeBase, '搜索结果:', searchResults);

    // 存储选中的知识库信息到sessionStorage（风格：新模式）
    const knowledgeData = {
      knowledgeBase: {
        id: knowledgeBase.id,
        name: knowledgeBase.name
      },
      isSelected: true,
      searchOnSend: true // 标记需要在发送时搜索
    };

    console.log('[ChatToolbar] 保存知识库选择到sessionStorage:', knowledgeData);
    window.sessionStorage.setItem('selectedKnowledgeBase', JSON.stringify(knowledgeData));

    // 验证保存是否成功
    const saved = window.sessionStorage.getItem('selectedKnowledgeBase');
    console.log('[ChatToolbar] sessionStorage保存验证:', saved);

    // 关闭选择器
    setShowKnowledgeSelector(false);
  };

  // 处理网络搜索按钮点击
  const handleWebSearchClick = () => {
    if (webSearchActive) {
      // 如果当前处于搜索模式，则关闭搜索
      toggleWebSearch?.();
    } else {
      // 如果当前不在搜索模式，显示提供商选择器
      setShowProviderSelector(true);
    }
  };

  // 处理提供商选择
  const handleProviderSelect = (providerId: string) => {
    if (providerId && toggleWebSearch) {
      // 选择了提供商，激活搜索模式
      toggleWebSearch();
    }
  };

  // ==================== 按钮配置区域 ====================
  // 定义所有可用的按钮配置
  const allButtonConfigs = {
    'mcp-tools': onToolsEnabledChange ? {
      id: 'mcp-tools',
      component: 'MCPToolsButton', // 标记这是一个特殊组件
      isActive: toolsEnabled
    } : null,
    'new-topic': {
      id: 'new-topic',
      icon: <Plus
        size={16}
        color={isDarkMode ? 'rgba(76, 175, 80, 0.8)' : 'rgba(76, 175, 80, 0.7)'}
      />,
      label: '新建话题',
      onClick: handleCreateTopic,
      isActive: false
    },
    'clear-topic': {
      id: 'clear-topic',
      icon: clearConfirmMode
        ? <AlertTriangle
            size={16}
            color={isDarkMode ? 'rgba(244, 67, 54, 0.8)' : 'rgba(244, 67, 54, 0.7)'}
          />
        : <Trash2
            size={16}
            color={isDarkMode ? 'rgba(33, 150, 243, 0.8)' : 'rgba(33, 150, 243, 0.7)'}
          />,
      label: clearConfirmMode ? '确认清空' : '清空内容',
      onClick: handleClearTopic,
      isActive: clearConfirmMode
    },
    'generate-image': {
      id: 'generate-image',
      icon: <Camera
        size={16}
        color={imageGenerationMode
          ? (isDarkMode ? 'rgba(156, 39, 176, 0.9)' : 'rgba(156, 39, 176, 0.8)')
          : (isDarkMode ? 'rgba(156, 39, 176, 0.6)' : 'rgba(156, 39, 176, 0.5)')
        }
      />,
      label: imageGenerationMode ? '取消生成' : '生成图片',
      onClick: toggleImageGenerationMode,
      isActive: imageGenerationMode
    },
    'generate-video': {
      id: 'generate-video',
      icon: <Video
        size={16}
        color={videoGenerationMode
          ? (isDarkMode ? 'rgba(233, 30, 99, 0.9)' : 'rgba(233, 30, 99, 0.8)')
          : (isDarkMode ? 'rgba(233, 30, 99, 0.6)' : 'rgba(233, 30, 99, 0.5)')
        }
      />,
      label: videoGenerationMode ? '取消生成' : '生成视频',
      onClick: toggleVideoGenerationMode,
      isActive: videoGenerationMode
    },
    'knowledge': {
      id: 'knowledge',
      icon: <BookOpen
        size={16}
        color={isDarkMode ? 'rgba(5, 150, 105, 0.8)' : 'rgba(5, 150, 105, 0.7)'}
      />,
      label: '知识库',
      onClick: handleKnowledgeClick,
      isActive: false
    },
    'web-search': webSearchEnabled && toggleWebSearch ? {
      id: 'web-search',
      icon: <Search
        size={16}
        color={webSearchActive
          ? (isDarkMode ? 'rgba(59, 130, 246, 0.9)' : 'rgba(59, 130, 246, 0.8)')
          : (isDarkMode ? 'rgba(59, 130, 246, 0.6)' : 'rgba(59, 130, 246, 0.5)')
        }
      />,
      label: webSearchActive ? '关闭搜索' : (webSearchSettings?.providers?.find(p => p.id === currentProvider)?.name || '搜索'),
      onClick: handleWebSearchClick,
      isActive: webSearchActive
    } : null
  };

  // 根据设置生成按钮数组
  const buttons = toolbarButtons.order
    .filter(buttonId => {
      // 过滤掉不可见的按钮和不存在的按钮配置
      return toolbarButtons.visibility[buttonId] && allButtonConfigs[buttonId as keyof typeof allButtonConfigs];
    })
    .map(buttonId => allButtonConfigs[buttonId as keyof typeof allButtonConfigs])
    .filter((button): button is NonNullable<typeof button> => button !== null); // 过滤掉null值并修复类型

  // ==================== 渲染逻辑区域 ====================

  return (
    <Box
      sx={{
        padding: '4px 0 0 0',
        backgroundColor: 'transparent',
        width: '100%',
        position: 'relative',
        overflow: 'visible',
        zIndex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          maxWidth: '800px',
          position: 'relative',
          ...currentStyles.container
        }}
      >
        {/* 动态样式折叠按钮 */}
        <IconButton
          onClick={toggleToolbarCollapse}
          size="small"
          sx={{
            ...(toolbarStyle === 'glassmorphism' ? {
              // 玻璃背景效果
              background: isDarkMode
                ? 'rgba(255, 255, 255, 0.06)'
                : 'rgba(255, 255, 255, 0.12)',
              // 玻璃边框
              border: isDarkMode
                ? '1px solid rgba(255, 255, 255, 0.08)'
                : '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '14px',
              width: 32,
              height: 32,
              // 毛玻璃效果
              backdropFilter: 'blur(10px) saturate(120%)',
              WebkitBackdropFilter: 'blur(10px) saturate(120%)',
              // 阴影效果
              boxShadow: isDarkMode
                ? '0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
                : '0 2px 8px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              marginRight: 1,
              '&:hover': {
                background: isDarkMode
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(255, 255, 255, 0.2)',
                border: isDarkMode
                  ? '1px solid rgba(255, 255, 255, 0.12)'
                  : '1px solid rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(12px) saturate(140%)',
                WebkitBackdropFilter: 'blur(12px) saturate(140%)',
                boxShadow: isDarkMode
                  ? '0 4px 12px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.12)'
                  : '0 4px 12px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
                transform: 'translateY(-1px)'
              },
              '&:active': {
                transform: 'translateY(0px) scale(0.95)',
                boxShadow: isDarkMode
                  ? '0 1px 4px rgba(0, 0, 0, 0.2), inset 0 2px 4px rgba(0, 0, 0, 0.1)'
                  : '0 1px 4px rgba(0, 0, 0, 0.1), inset 0 2px 4px rgba(0, 0, 0, 0.05)'
              }
            } : {
              // 透明样式
              background: 'transparent',
              borderRadius: '16px',
              width: 28,
              height: 28,
              transition: 'all 0.15s ease',
              marginRight: 0.5,
              '&:hover': {
                background: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)'
              }
            }),
            color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
            flexShrink: 0,
          }}
        >
          <ChevronLeft
            size={16}
            style={{
              transition: 'transform 0.2s ease',
              transform: localToolbarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)'
            }}
          />
        </IconButton>

        {/* 工具栏内容 */}
        <Box
          sx={{
            display: localToolbarCollapsed ? 'none' : 'flex', // 简单的显示/隐藏
            alignItems: 'center',
            flex: 1, // 占据剩余空间
            overflow: 'hidden' // 防止溢出
          }}
        >
          <Box
            ref={scrollRef}
            sx={{
              display: 'flex',
              overflowX: 'auto',
              padding: '0 8px',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': {
                display: 'none'
              },
              whiteSpace: 'nowrap',
              minHeight: '38px',
              alignItems: 'center',
              justifyContent: { xs: 'flex-start', md: 'center' },
              cursor: 'grab',
              willChange: 'transform', // 优化性能
              transform: 'translateZ(0)', // 启用硬件加速
              width: '100%', // 占满容器
              '&:active': {
                cursor: 'grabbing'
              }
            }}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
          >
          {/* 动态样式按钮渲染 */}
          {buttons.map((button) => {
            // 特殊处理MCP工具按钮
            if ('component' in button && button.component === 'MCPToolsButton') {
              return (
                <Box key={button.id} sx={{ mr: 1 }}>
                  <MCPToolsButton
                    toolsEnabled={toolsEnabled}
                    onToolsEnabledChange={onToolsEnabledChange}
                  />
                </Box>
              );
            }

            // 普通按钮渲染
            // 类型守卫：确保button有普通按钮的属性
            if (!('onClick' in button) || !('icon' in button) || !('label' in button)) {
              return null;
            }

            const buttonStyle = getButtonCurrentStyle(button.isActive);

            return (
              <Box
                key={button.id}
                onClick={button.onClick}
                sx={{
                  ...buttonStyle,
                  margin: toolbarStyle === 'glassmorphism' ? '0 4px' : '0 2px',
                  '&:hover': {
                    ...currentStyles.buttonHover
                  },
                  '&:active': {
                    ...currentStyles.buttonActive
                  }
                }}
              >
                {toolbarDisplayStyle !== 'text' && button.icon}
                {toolbarDisplayStyle !== 'icon' && (
                  <Typography
                    variant="body2"
                    sx={{
                      ...currentStyles.text,
                      ml: toolbarDisplayStyle === 'both' ? 0.5 : 0
                    }}
                  >
                    {button.label}
                  </Typography>
                )}
              </Box>
            );
          })}
          </Box>
        </Box>
      </Box>

      {/* 网络搜索提供商选择器 */}
      <WebSearchProviderSelector
        open={showProviderSelector}
        onClose={() => setShowProviderSelector(false)}
        onProviderSelect={handleProviderSelect}
      />

      {/* 知识库选择器 */}
      <KnowledgeSelector
        open={showKnowledgeSelector}
        onClose={() => setShowKnowledgeSelector(false)}
        onSelect={handleKnowledgeSelect}
      />
    </Box>
  );
};

export default ChatToolbar;