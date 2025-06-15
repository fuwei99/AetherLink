import React from 'react';
import { Box, Tabs, Tab, CircularProgress, useTheme } from '@mui/material';
import { useSidebarContext } from './SidebarContext';
import TabPanel, { a11yProps } from './TabPanel';
import AssistantTab from './AssistantTab/index';
import TopicTab from './TopicTab/index';
import SettingsTab from './SettingsTab/index';
import { getThemeColors } from '../../shared/utils/themeUtils';
import { useSelector } from 'react-redux';
import type { RootState } from '../../shared/store';
import { Bot, MessageSquare, Settings } from 'lucide-react';

/**
 * 侧边栏标签页内容组件
 * 使用React.memo优化性能，减少不必要的重新渲染
 */
const SidebarTabsContent = React.memo(() => {
  const {
    loading,
    value,
    setValue,
    userAssistants,
    currentAssistant,
    assistantWithTopics,
    currentTopic,
    handleSelectAssistant,
    handleAddAssistant,
    handleUpdateAssistant,
    handleDeleteAssistant,
    isPending, // 获取isPending状态
    handleSelectTopic,
    handleCreateTopic,
    handleDeleteTopic,
    handleUpdateTopic,
    settings,
    settingsArray,
    handleSettingChange,
    handleContextLengthChange,
    handleContextCountChange,
    handleMathRendererChange,
    handleThinkingEffortChange,
    mcpMode,
    toolsEnabled,
    handleMCPModeChange,
    handleToolsToggle,
    refreshTopics
  } = useSidebarContext();

  // 获取主题和主题工具
  const theme = useTheme();
  const themeStyle = useSelector((state: RootState) => state.settings.themeStyle);
  const themeColors = getThemeColors(theme, themeStyle);

  // 优化的标签页切换处理，减少日志输出和不必要的操作
  const handleChange = React.useCallback((_event: React.SyntheticEvent, newValue: number) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SidebarTabs] 标签页切换: ${value} -> ${newValue}`);
    }

    // 使用requestAnimationFrame优化性能
    requestAnimationFrame(() => {
      if (newValue === 1 && refreshTopics) { // 切换到话题标签页
        refreshTopics();
      }
      setValue(newValue);
    });
  }, [value, refreshTopics, setValue]);

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {loading || isPending ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <CircularProgress />
          {isPending && <Box sx={{ ml: 2 }}>切换助手中...</Box>}
        </Box>
      ) : (
        <>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={value}
              onChange={handleChange}
              aria-label="sidebar tabs"
              variant="fullWidth"
              sx={{
                minHeight: '48px',
                margin: '0 10px',
                padding: '10px 0',
                '& .MuiTabs-indicator': {
                  display: 'none', // 隐藏底部指示器
                },
                '& .MuiTab-root': {
                  minHeight: '32px',
                  borderRadius: '8px',
                  transition: 'background-color 0.3s',
                  '&.Mui-selected': {
                    backgroundColor: themeColors.selectedColor,
                  },
                  '&:hover': {
                    backgroundColor: themeColors.hoverColor,
                  },
                },
              }}
            >
              <Tab
                icon={<Bot size={18} />}
                label="助手"
                {...a11yProps(0)}
                sx={{
                  minHeight: '32px',
                  borderRadius: '8px',
                  '& .MuiTab-iconWrapper': {
                    marginBottom: '2px',
                  },
                }}
              />
              <Tab
                icon={<MessageSquare size={18} />}
                label="话题"
                {...a11yProps(1)}
                sx={{
                  minHeight: '32px',
                  borderRadius: '8px',
                  '& .MuiTab-iconWrapper': {
                    marginBottom: '2px',
                  },
                }}
              />
              <Tab
                icon={<Settings size={18} />}
                label="设置"
                {...a11yProps(2)}
                sx={{
                  minHeight: '32px',
                  borderRadius: '8px',
                  '& .MuiTab-iconWrapper': {
                    marginBottom: '2px',
                  },
                }}
              />
            </Tabs>
          </Box>

          <TabPanel value={value} index={0}>
            <AssistantTab
              userAssistants={userAssistants}
              currentAssistant={currentAssistant}
              onSelectAssistant={handleSelectAssistant}
              onAddAssistant={handleAddAssistant}
              onUpdateAssistant={handleUpdateAssistant}
              onDeleteAssistant={handleDeleteAssistant}
            />
          </TabPanel>

          <TabPanel value={value} index={1}>
            {/* 直接渲染组件，与最佳实例保持一致 */}
            <TopicTab
              key={assistantWithTopics?.id || currentAssistant?.id || 'no-assistant'}
              currentAssistant={assistantWithTopics || currentAssistant}
              currentTopic={currentTopic}
              onSelectTopic={handleSelectTopic}
              onCreateTopic={handleCreateTopic}
              onDeleteTopic={handleDeleteTopic}
              onUpdateTopic={handleUpdateTopic}
            />
          </TabPanel>

          <TabPanel value={value} index={2}>
            <SettingsTab
              settings={settingsArray}
              onSettingChange={handleSettingChange}
              initialContextLength={settings.contextLength}
              onContextLengthChange={handleContextLengthChange}
              initialContextCount={settings.contextCount}
              onContextCountChange={handleContextCountChange}
              initialMathRenderer={settings.mathRenderer}
              onMathRendererChange={handleMathRendererChange}
              initialThinkingEffort={settings.defaultThinkingEffort}
              onThinkingEffortChange={handleThinkingEffortChange}
              mcpMode={mcpMode}
              toolsEnabled={toolsEnabled}
              onMCPModeChange={handleMCPModeChange}
              onToolsToggle={handleToolsToggle}
            />
          </TabPanel>
        </>
      )}
    </Box>
  );
});

// 设置displayName用于调试
SidebarTabsContent.displayName = 'SidebarTabsContent';

export default SidebarTabsContent;
