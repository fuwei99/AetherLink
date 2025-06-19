
import { SidebarProvider } from './SidebarContext';
import { useSidebarState } from './hooks/useSidebarState';
import { useAssistantManagement } from './hooks/useAssistantManagement';
import { useTopicManagement } from './hooks/useTopicManagement';
import { useSettingsManagement } from './hooks/useSettingsManagement';
import SidebarTabsContent from './SidebarTabsContent';

interface SidebarTabsProps {
  mcpMode?: 'prompt' | 'function';
  toolsEnabled?: boolean;
  onMCPModeChange?: (mode: 'prompt' | 'function') => void;
  onToolsToggle?: (enabled: boolean) => void;
}

/**
 * 侧边栏标签页组件
 *
 * 这是一个容器组件，负责管理状态和提供上下文
 */
export default function SidebarTabs({
  mcpMode,
  toolsEnabled,
  onMCPModeChange,
  onToolsToggle
}: SidebarTabsProps) {
  // 使用各种钩子获取状态和方法
  const {
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
    refreshTopics
  } = useSidebarState();

  // 助手管理 - 传递标签页切换函数
  const {
    handleSelectAssistant,
    handleAddAssistant,
    handleUpdateAssistant,
    handleDeleteAssistant,
    isPending // 获取isPending状态
  } = useAssistantManagement({
    currentAssistant,
    setCurrentAssistant,
    setUserAssistants,
    currentTopic,
    switchToTopicTab: () => setValue(1) // 🔥 传递切换到话题标签页的函数
  });

  // 话题管理
  const {
    handleCreateTopic,
    handleSelectTopic,
    handleDeleteTopic,
    handleUpdateTopic
  } = useTopicManagement({
    currentAssistant,
    setCurrentAssistant,
    assistantWithTopics,
    currentTopic,
    refreshTopics,
    updateAssistantTopic
  });

  // 设置管理
  const {
    settings,
    settingsArray,
    handleSettingChange,
    handleContextLengthChange,
    handleContextCountChange,
    handleMathRendererChange,
    handleThinkingEffortChange
  } = useSettingsManagement();



  // 将所有状态和方法传递给上下文提供者
  const contextValue = {
    // 状态
    loading,
    value,
    userAssistants,
    currentAssistant,
    assistantWithTopics,
    currentTopic,

    // 设置状态的函数
    setValue,
    setCurrentAssistant,

    // 助手管理函数
    handleSelectAssistant,
    handleAddAssistant,
    handleUpdateAssistant,
    handleDeleteAssistant,
    isPending, // 添加isPending状态到上下文

    // 话题管理函数
    handleCreateTopic,
    handleSelectTopic,
    handleDeleteTopic,
    handleUpdateTopic,

    // 设置管理
    settings,
    settingsArray,
    handleSettingChange,
    handleContextLengthChange,
    handleContextCountChange,
    handleMathRendererChange,
    handleThinkingEffortChange,

    // MCP 相关状态和函数
    mcpMode,
    toolsEnabled,
    handleMCPModeChange: onMCPModeChange,
    handleToolsToggle: onToolsToggle,

    // 刷新函数
    refreshTopics
  };

  return (
    <SidebarProvider value={contextValue}>
      <SidebarTabsContent />
    </SidebarProvider>
  );
}
