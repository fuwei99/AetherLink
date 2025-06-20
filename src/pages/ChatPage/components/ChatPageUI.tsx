import React, { useMemo, useCallback } from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton } from '@mui/material';
import { Settings, Plus, Trash2 } from 'lucide-react';
import { CustomIcon } from '../../../components/icons';

import MessageList from '../../../components/message/MessageList';
import { ChatInput, CompactChatInput, IntegratedChatInput, ChatToolbar } from '../../../components/input';
import { Sidebar } from '../../../components/TopicManagement';
import { ModelSelector } from './ModelSelector';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../../shared/store';
import type { SiliconFlowImageFormat } from '../../../shared/types';
import { EventEmitter, EVENT_NAMES } from '../../../shared/services/EventService';
import { TopicService } from '../../../shared/services/TopicService';
import { newMessagesActions } from '../../../shared/store/slices/newMessagesSlice';
import { getThemeColors } from '../../../shared/utils/themeUtils';
import { generateBackgroundStyle } from '../../../shared/utils/backgroundUtils';
import { useTheme } from '@mui/material/styles';
import { useSidebarSwipeGesture } from '../../../hooks/useSwipeGesture';



// 默认设置常量 - 避免每次渲染时创建新对象
const DEFAULT_TOP_TOOLBAR_SETTINGS = {
  showSettingsButton: true,
  showModelSelector: true,
  modelSelectorStyle: 'full',
  showChatTitle: true,
  showTopicName: false,
  showNewTopicButton: false,
  showClearButton: false,
  showMenuButton: true,
  leftComponents: ['menuButton', 'chatTitle', 'topicName', 'newTopicButton', 'clearButton'],
  rightComponents: ['modelSelector', 'settingsButton'],
  componentPositions: [],
} as const;

// 所有从父组件传入的props类型
interface ChatPageUIProps {
  currentTopic: any;
  currentMessages: any[];
  isStreaming: boolean;
  isLoading: boolean;
  isMobile: boolean;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  navigate: (path: string) => void;
  selectedModel: any;
  availableModels: any[];
  handleModelSelect: (model: any) => void;
  handleModelMenuClick: () => void;
  handleModelMenuClose: () => void;
  menuOpen: boolean;
  handleClearTopic: () => void;
  handleDeleteMessage: (messageId: string) => void;
  handleRegenerateMessage: (messageId: string) => void;
  handleSwitchMessageVersion: (versionId: string) => void;
  handleResendMessage: (messageId: string) => void;
  webSearchActive: boolean;
  imageGenerationMode: boolean;
  videoGenerationMode: boolean;
  toolsEnabled: boolean;
  mcpMode: 'prompt' | 'function';
  toggleWebSearch: () => void;
  toggleImageGenerationMode: () => void;
  toggleVideoGenerationMode: () => void;
  toggleToolsEnabled: () => void;
  handleMCPModeChange: (mode: 'prompt' | 'function') => void;
  handleMessageSend: (content: string, images?: any[], toolsEnabled?: boolean, files?: any[]) => void;
  handleMultiModelSend?: (content: string, models: any[], images?: SiliconFlowImageFormat[], toolsEnabled?: boolean, files?: any[]) => void;
  handleStopResponseClick: () => void;
  isDebating?: boolean;
  handleStartDebate?: (question: string, config: any) => void;
  handleStopDebate?: () => void;
}

export const ChatPageUI: React.FC<ChatPageUIProps> = ({
  currentTopic,
  currentMessages,
  isStreaming,
  isLoading,
  isMobile,
  drawerOpen,
  setDrawerOpen,
  navigate,
  selectedModel,
  availableModels,
  handleModelSelect,
  handleModelMenuClick,
  handleModelMenuClose,
  menuOpen,
  handleClearTopic,
  handleDeleteMessage,
  handleRegenerateMessage,
  handleSwitchMessageVersion,
  handleResendMessage,
  webSearchActive,
  imageGenerationMode,
  videoGenerationMode,
  toolsEnabled,
  mcpMode,
  toggleWebSearch,
  toggleImageGenerationMode,
  toggleVideoGenerationMode,
  toggleToolsEnabled,
  handleMCPModeChange,
  handleMessageSend,
  handleMultiModelSend,
  handleStopResponseClick,
  isDebating,
  handleStartDebate,
  handleStopDebate
}) => {
  // ==================== Hooks 和基础状态 ====================
  const dispatch = useDispatch();
  const theme = useTheme();

  // 本地状态

  // Redux 状态选择器
  const themeStyle = useSelector((state: RootState) => state.settings.themeStyle);
  const inputLayoutStyle = useSelector((state: RootState) =>
    (state.settings as any).inputLayoutStyle
  ) || 'default';
  const topToolbarSettings = useSelector((state: RootState) =>
    (state.settings as any).topToolbar
  );
  const chatBackground = useSelector((state: RootState) =>
    state.settings.chatBackground || {
      enabled: false,
      imageUrl: '',
      opacity: 0.3,
      size: 'cover',
      position: 'center',
      repeat: 'no-repeat'
    }
  );

  // ==================== 计算属性和样式 ====================
  const themeColors = getThemeColors(theme, themeStyle);

  const mergedTopToolbarSettings = useMemo(() => ({
    ...DEFAULT_TOP_TOOLBAR_SETTINGS,
    ...topToolbarSettings
  }), [topToolbarSettings]);

  const shouldShowToolbar = useMemo(() =>
    inputLayoutStyle === 'default',
    [inputLayoutStyle]
  );

  // 生成背景样式
  const backgroundStyle = useMemo(() =>
    generateBackgroundStyle(chatBackground),
    [chatBackground]
  );

  const dynamicStyles = useMemo(() => ({
    mainContainer: {
      display: 'flex',
      flexDirection: { xs: 'column', sm: 'row' },
      height: '100vh',
      bgcolor: themeColors.background
    },
    contentContainer: {
      flexGrow: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
      bgcolor: themeColors.background
    },
    appBar: {
      bgcolor: themeColors.paper,
      color: themeColors.textPrimary,
      borderBottom: '1px solid',
      borderColor: themeColors.borderColor,
    },
    messageContainer: {
      flexGrow: 1,
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      maxWidth: '100%',
      backgroundColor: themeColors.background,
    },
    welcomeContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '80%',
      p: 3,
      textAlign: 'center',
      bgcolor: themeColors.background,
    },
    welcomeText: {
      fontWeight: 400,
      color: themeColors.textPrimary,
      mb: 1,
    }
  }), [themeColors]);

  // ==================== 事件处理函数 ====================

  // 滑动手势处理
  const handleOpenSidebar = useCallback(() => {
    if (!drawerOpen) {
      setDrawerOpen(true);
      try {
        localStorage.setItem('sidebar-swipe-hint-seen', 'true');
      } catch (error) {
        console.warn('无法保存滑动提示状态:', error);
      }
    }
  }, [drawerOpen, setDrawerOpen]);

  const handleCloseSidebar = useCallback(() => {
    if (drawerOpen) {
      setDrawerOpen(false);
      try {
        localStorage.setItem('sidebar-swipe-hint-seen', 'true');
      } catch (error) {
        console.warn('无法保存滑动提示状态:', error);
      }
    }
  }, [drawerOpen, setDrawerOpen]);

  const { swipeHandlers } = useSidebarSwipeGesture(
    handleOpenSidebar,
    drawerOpen ? handleCloseSidebar : undefined,
    true
  );

  // 话题管理
  const handleCreateTopic = useCallback(async () => {
    EventEmitter.emit(EVENT_NAMES.ADD_NEW_TOPIC);
    console.log('[ChatPageUI] Emitted ADD_NEW_TOPIC event.');

    const newTopic = await TopicService.createNewTopic();
    if (newTopic) {
      console.log('[ChatPageUI] 成功创建新话题，自动跳转:', newTopic.id);
      dispatch(newMessagesActions.setCurrentTopicId(newTopic.id));

      setTimeout(() => {
        EventEmitter.emit(EVENT_NAMES.SHOW_TOPIC_SIDEBAR);
        setTimeout(() => {
          dispatch(newMessagesActions.setCurrentTopicId(newTopic.id));
        }, 50);
      }, 100);
    }
  }, [dispatch]);

  // 工具栏组件渲染
  const renderToolbarComponent = useCallback((componentId: string) => {
    switch (componentId) {
      case 'menuButton':
        return mergedTopToolbarSettings.showMenuButton ? (
          <IconButton
            key={componentId}
            edge="start"
            color="inherit"
            onClick={() => setDrawerOpen(!drawerOpen)}
            sx={{ mr: 1 }}
          >
            <CustomIcon name="documentPanel" size={20} />
          </IconButton>
        ) : null;

      case 'chatTitle':
        return mergedTopToolbarSettings.showChatTitle ? (
          <Typography key={componentId} variant="h6" noWrap component="div">
            对话
          </Typography>
        ) : null;

      case 'topicName':
        return mergedTopToolbarSettings.showTopicName && currentTopic ? (
          <Typography key={componentId} variant="body1" noWrap sx={{ color: 'text.secondary', ml: 1 }}>
            {currentTopic.name}
          </Typography>
        ) : null;

      case 'newTopicButton':
        return mergedTopToolbarSettings.showNewTopicButton ? (
          <IconButton
            key={componentId}
            color="inherit"
            onClick={handleCreateTopic}
            size="small"
            sx={{ ml: 1 }}
          >
            <Plus size={20} />
          </IconButton>
        ) : null;

      case 'clearButton':
        return mergedTopToolbarSettings.showClearButton && currentTopic ? (
          <IconButton
            key={componentId}
            color="inherit"
            onClick={handleClearTopic}
            size="small"
            sx={{ ml: 1 }}
          >
            <Trash2 size={20} />
          </IconButton>
        ) : null;

      case 'modelSelector':
        return mergedTopToolbarSettings.showModelSelector ? (
          <ModelSelector
            key={componentId}
            selectedModel={selectedModel}
            availableModels={availableModels}
            handleModelSelect={handleModelSelect}
            handleMenuClick={handleModelMenuClick}
            handleMenuClose={handleModelMenuClose}
            menuOpen={menuOpen}
          />
        ) : null;

      case 'settingsButton':
        return mergedTopToolbarSettings.showSettingsButton ? (
          <IconButton key={componentId} color="inherit" onClick={() => navigate('/settings')}>
            <Settings size={20} />
          </IconButton>
        ) : null;

      default:
        return null;
    }
  }, [
    mergedTopToolbarSettings,
    setDrawerOpen,
    drawerOpen,
    currentTopic,
    handleCreateTopic,
    handleClearTopic,
    selectedModel,
    availableModels,
    handleModelSelect,
    handleModelMenuClick,
    handleModelMenuClose,
    menuOpen,
    navigate
  ]);

  // ==================== 消息处理函数 ====================
  const handleSendMessage = useCallback((content: string, images?: SiliconFlowImageFormat[], toolsEnabled?: boolean, files?: any[]) => {
    if (currentTopic) {
      handleMessageSend(content, images, toolsEnabled, files);
    } else {
      console.log('没有当前话题，无法发送消息');
    }
  }, [currentTopic, handleMessageSend]);

  const handleSendMultiModelMessage = useCallback((content: string, models: any[], images?: SiliconFlowImageFormat[], toolsEnabled?: boolean, files?: any[]) => {
    if (currentTopic) {
      handleMultiModelSend?.(content, models, images, toolsEnabled, files);
    } else {
      console.log('没有当前话题，无法发送多模型消息');
    }
  }, [currentTopic, handleMultiModelSend]);

  const handleSendImagePrompt = useCallback((prompt: string) => {
    handleMessageSend(prompt);
  }, [handleMessageSend]);

  // ==================== 组件配置和渲染 ====================

  const commonProps = useMemo(() => {
    const props = {
      onSendMessage: handleSendMessage,
      availableModels,
      isLoading,
      allowConsecutiveMessages: true,
      imageGenerationMode,
      videoGenerationMode,
      onSendImagePrompt: handleSendImagePrompt,
      webSearchActive,
      onStopResponse: handleStopResponseClick,
      isStreaming,
      isDebating,
      toolsEnabled
    };

    if (handleMultiModelSend && handleSendMultiModelMessage) {
      (props as any).onSendMultiModelMessage = handleSendMultiModelMessage;
    }

    if (handleStartDebate && handleStopDebate) {
      (props as any).onStartDebate = handleStartDebate;
      (props as any).onStopDebate = handleStopDebate;
    }

    return props;
  }, [
    handleSendMessage,
    availableModels,
    isLoading,
    imageGenerationMode,
    videoGenerationMode,
    handleSendImagePrompt,
    webSearchActive,
    handleStopResponseClick,
    isStreaming,
    isDebating,
    toolsEnabled,
    handleMultiModelSend,
    handleSendMultiModelMessage,
    handleStartDebate,
    handleStopDebate
  ]);

  const inputComponent = useMemo(() => {
    if (inputLayoutStyle === 'compact') {
      return (
        <CompactChatInput
          key="compact-input"
          {...commonProps}
          onClearTopic={handleClearTopic}
          onNewTopic={handleCreateTopic}
          toggleImageGenerationMode={toggleImageGenerationMode}
          toggleWebSearch={toggleWebSearch}
          toggleToolsEnabled={toggleToolsEnabled}
        />
      );
    } else if (inputLayoutStyle === 'integrated') {
      return (
        <IntegratedChatInput
          key="integrated-input"
          {...commonProps}
          onClearTopic={handleClearTopic}
          toggleImageGenerationMode={toggleImageGenerationMode}
          toggleVideoGenerationMode={toggleVideoGenerationMode}
          toggleWebSearch={toggleWebSearch}
          onToolsEnabledChange={toggleToolsEnabled}
        />
      );
    } else {
      return <ChatInput key="default-input" {...commonProps} />;
    }
  }, [
    inputLayoutStyle,
    commonProps,
    handleClearTopic,
    handleCreateTopic,
    toggleImageGenerationMode,
    toggleWebSearch,
    toggleToolsEnabled
  ]);

  const InputContainer = useMemo(() => {
    return (
      <Box sx={{
        width: '100%',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 2,
        backgroundColor: 'transparent',
        boxShadow: 'none',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        {shouldShowToolbar && (
          <Box sx={{
            width: '100%',
            maxWidth: '800px',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <ChatToolbar
              onClearTopic={handleClearTopic}
              imageGenerationMode={imageGenerationMode}
              toggleImageGenerationMode={toggleImageGenerationMode}
              videoGenerationMode={videoGenerationMode}
              toggleVideoGenerationMode={toggleVideoGenerationMode}
              webSearchActive={webSearchActive}
              toggleWebSearch={toggleWebSearch}
              toolsEnabled={toolsEnabled}
              onToolsEnabledChange={toggleToolsEnabled}
            />
          </Box>
        )}

        <Box sx={{
          width: '100%',
          maxWidth: '800px',
          display: 'flex',
          justifyContent: 'center'
        }}>
          {inputComponent}
        </Box>
      </Box>
    );
  }, [
    shouldShowToolbar,
    handleClearTopic,
    imageGenerationMode,
    toggleImageGenerationMode,
    videoGenerationMode,
    toggleVideoGenerationMode,
    webSearchActive,
    toggleWebSearch,
    toolsEnabled,
    toggleToolsEnabled,
    inputComponent
  ]);

  // ==================== 组件渲染 ====================

  return (
    <Box
      sx={dynamicStyles.mainContainer}
      {...swipeHandlers} // 添加滑动手势处理
    >
      {/* 桌面端可收起侧边栏，移动端可隐藏 */}
      {!isMobile && (
        <Sidebar
          mcpMode={mcpMode}
          toolsEnabled={toolsEnabled}
          onMCPModeChange={handleMCPModeChange}
          onToolsToggle={toggleToolsEnabled}
          desktopOpen={drawerOpen}
          onDesktopToggle={() => setDrawerOpen(!drawerOpen)}
        />
      )}

      {/* 主内容区域 */}
      <Box sx={dynamicStyles.contentContainer}>
        {/* 顶部应用栏 */}
        <AppBar
          position="static"
          elevation={0}
          className="status-bar-safe-area"
          sx={dynamicStyles.appBar}
        >
          <Toolbar sx={{
            position: 'relative',
            minHeight: '56px !important',
            justifyContent: mergedTopToolbarSettings.componentPositions?.length > 0 ? 'center' : 'space-between',
            userSelect: 'none', // 禁止工具栏文本选择
          }}>
            {/* 如果有DIY布局，使用绝对定位渲染组件 */}
            {mergedTopToolbarSettings.componentPositions?.length > 0 ? (
              <>
                {mergedTopToolbarSettings.componentPositions.map((position: any) => {
                  const component = renderToolbarComponent(position.id);
                  if (!component) return null;

                  return (
                    <Box
                      key={position.id}
                      sx={{
                        position: 'absolute',
                        left: `${position.x}%`,
                        top: `${position.y}%`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 10,
                        userSelect: 'none' // 禁止DIY布局组件文本选择
                      }}
                    >
                      {component}
                    </Box>
                  );
                })}
              </>
            ) : (
              /* 传统左右布局 */
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, userSelect: 'none' }}>
                  {mergedTopToolbarSettings.leftComponents?.map(renderToolbarComponent).filter(Boolean)}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, userSelect: 'none' }}>
                  {mergedTopToolbarSettings.rightComponents?.map(renderToolbarComponent).filter(Boolean)}
                </Box>
              </>
            )}
          </Toolbar>
        </AppBar>

        {/* 移动端侧边栏 */}
        {isMobile && (
          <Sidebar
            mobileOpen={drawerOpen}
            onMobileToggle={() => setDrawerOpen(!drawerOpen)}
            mcpMode={mcpMode}
            toolsEnabled={toolsEnabled}
            onMCPModeChange={handleMCPModeChange}
            onToolsToggle={toggleToolsEnabled}
          />
        )}

        {/* 聊天内容区域 */}
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 64px)',
          width: '100%',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {currentTopic ? (
            <>
              {/* 消息列表应该有固定的可滚动区域，不会被输入框覆盖 */}
              <Box sx={{
                ...dynamicStyles.messageContainer,
                ...backgroundStyle
              }}>
                <MessageList
                  messages={currentMessages}
                  onRegenerate={handleRegenerateMessage}
                  onDelete={handleDeleteMessage}
                  onSwitchVersion={handleSwitchMessageVersion}
                  onResend={handleResendMessage}
                />
              </Box>

              {/* 输入框容器，固定在底部 */}
              {InputContainer}
            </>
          ) : (
            <>
              <Box
                sx={{
                  ...dynamicStyles.messageContainer,
                  ...backgroundStyle,
                  marginBottom: '100px', // 为输入框留出足够空间
                }}
              >
                <Box sx={dynamicStyles.welcomeContainer}>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={dynamicStyles.welcomeText}
                  >
                    对话开始了，请输入您的问题
                  </Typography>
                </Box>
              </Box>

              {/* 即使没有当前话题，也显示输入框 */}
              {InputContainer}
            </>
          )}
        </Box>
      </Box>


    </Box>
  );
};