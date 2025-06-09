import { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Typography,
  Avatar,
  IconButton,
  Tooltip
} from '@mui/material';
import { User, Sliders, Cog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { MathRendererType } from '../../../shared/types';
import type { ThinkingOption } from '../../../shared/config/reasoningConfig';
import SettingGroups from './SettingGroups';
import AvatarUploader from '../../settings/AvatarUploader';
import MCPSidebarControls from '../../chat/MCPSidebarControls';
import ThrottleLevelSelector from './ThrottleLevelSelector';
import ContextSettings from './ContextSettings';
import CodeBlockSettings from './CodeBlockSettings';
import InputSettings from './InputSettings';


interface Setting {
  id: string;
  name: string;
  description: string;
  defaultValue: boolean | string;
  type?: 'switch' | 'select';
  options?: Array<{ value: string; label: string }>;
}

interface SettingsTabProps {
  settings?: Setting[];
  onSettingChange?: (settingId: string, value: boolean | string) => void;
  onContextLengthChange?: (value: number) => void;
  onContextCountChange?: (value: number) => void;
  onMaxOutputTokensChange?: (value: number) => void;
  onMathRendererChange?: (value: MathRendererType) => void;
  onThinkingEffortChange?: (value: ThinkingOption) => void;
  onThinkingBudgetChange?: (value: number) => void;
  initialContextLength?: number;
  initialContextCount?: number;
  initialMaxOutputTokens?: number;
  initialMathRenderer?: MathRendererType;
  initialThinkingEffort?: ThinkingOption;
  initialThinkingBudget?: number;
  mcpMode?: 'prompt' | 'function';
  toolsEnabled?: boolean;
  onMCPModeChange?: (mode: 'prompt' | 'function') => void;
  onToolsToggle?: (enabled: boolean) => void;
}

/**
 * 设置选项卡主组件
 */
export default function SettingsTab({
  settings = [],
  onSettingChange,
  onContextLengthChange,
  onContextCountChange,
  onMaxOutputTokensChange,
  onMathRendererChange,
  onThinkingEffortChange,
  onThinkingBudgetChange,
  initialContextLength = 16000,
  initialContextCount = 5,
  initialMaxOutputTokens = 4096,
  initialMathRenderer = 'KaTeX',
  initialThinkingEffort = 'medium',
  initialThinkingBudget = 1024,
  mcpMode = 'function',
  toolsEnabled = true,
  onMCPModeChange,
  onToolsToggle
}: SettingsTabProps) {
  const navigate = useNavigate();

  // 本地状态
  const [contextLength, setContextLength] = useState<number>(initialContextLength);
  const [contextCount, setContextCount] = useState<number>(initialContextCount);
  const [maxOutputTokens, setMaxOutputTokens] = useState<number>(initialMaxOutputTokens);
  const [mathRenderer, setMathRenderer] = useState<MathRendererType>(initialMathRenderer);
  const [thinkingEffort, setThinkingEffort] = useState<ThinkingOption>(initialThinkingEffort);
  const [thinkingBudget, setThinkingBudget] = useState<number>(initialThinkingBudget);
  const [userAvatar, setUserAvatar] = useState<string>("");
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);

  // 从localStorage加载设置和头像
  useEffect(() => {
    try {
      const appSettingsJSON = localStorage.getItem('appSettings');
      if (appSettingsJSON) {
        const appSettings = JSON.parse(appSettingsJSON);
        if (appSettings.contextLength) setContextLength(appSettings.contextLength);
        if (appSettings.contextCount) setContextCount(appSettings.contextCount);
        if (appSettings.maxOutputTokens) setMaxOutputTokens(appSettings.maxOutputTokens);
        if (appSettings.mathRenderer) setMathRenderer(appSettings.mathRenderer);
        if (appSettings.defaultThinkingEffort) setThinkingEffort(appSettings.defaultThinkingEffort);
        if (appSettings.thinkingBudget) setThinkingBudget(appSettings.thinkingBudget);


      }

      // 加载用户头像
      const savedUserAvatar = localStorage.getItem('user_avatar');
      if (savedUserAvatar) {
        setUserAvatar(savedUserAvatar);
      }
    } catch (error) {
      console.error('加载设置失败', error);
    }
  }, []);

  // 如果没有传入设置，使用默认设置
  const availableSettings = settings.length ? settings : [
    { id: 'streamOutput', name: '流式输出', defaultValue: true, description: '实时显示AI回答，打字机效果' },
    { id: 'showMessageDivider', name: '对话分割线', defaultValue: true, description: '在对话轮次之间显示分割线' },
    { id: 'copyableCodeBlocks', name: '代码块可复制', defaultValue: true, description: '允许复制代码块的内容' },
    { id: 'renderUserInputAsMarkdown', name: '渲染用户输入', defaultValue: true, description: '是否渲染用户输入的Markdown格式（关闭后用户消息将显示为纯文本）' },
  ];

  // 处理头像上传
  const handleAvatarDialogOpen = () => {
    setIsAvatarDialogOpen(true);
  };

  const handleAvatarDialogClose = () => {
    setIsAvatarDialogOpen(false);
  };

  const handleSaveAvatar = (avatarDataUrl: string) => {
    setUserAvatar(avatarDataUrl);
    localStorage.setItem('user_avatar', avatarDataUrl);
  };

  const handleSettingChange = (settingId: string, value: boolean | string) => {
    // 保存到localStorage
    try {
      const appSettingsJSON = localStorage.getItem('appSettings');
      const appSettings = appSettingsJSON ? JSON.parse(appSettingsJSON) : {};
      localStorage.setItem('appSettings', JSON.stringify({
        ...appSettings,
        [settingId]: value
      }));

      // 触发自定义事件，通知其他组件设置已变化
      window.dispatchEvent(new CustomEvent('appSettingsChanged', {
        detail: { settingId, value }
      }));
    } catch (error) {
      console.error('保存设置失败', error);
    }

    if (onSettingChange) {
      onSettingChange(settingId, value);
    }
  };

  // 将设置分组
  const settingGroups = [
    {
      id: 'general',
      title: '常规设置',
      settings: availableSettings
    }
  ];

  return (
    <List
      sx={{
        p: 0,
        // 优化滚动性能
        contain: 'layout style paint', // 优化渲染性能
        // 防止不必要的重绘
        backfaceVisibility: 'hidden',
        // 优化移动端滚动
        '& .MuiListItem-root': {
          // 优化列表项的触摸响应
          touchAction: 'manipulation',
          // 防止文本选择干扰滚动
          userSelect: 'none',
          // 优化点击反馈
          '@media (hover: none)': {
            '&:active': {
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
              transition: 'background-color 0.1s ease-out'
            }
          }
        }
      }}
    >
      <ListItemButton
        onClick={() => navigate('/settings')}
        sx={{
          px: 2,
          py: 0.75,
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: 'rgba(25, 118, 210, 0.04)',
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: '40px' }}>
          <Cog size={20} color="#1976d2" />
        </ListItemIcon>
        <ListItemText
          primary="设置"
          secondary="进入完整设置页面"
          primaryTypographyProps={{ fontWeight: 'medium', fontSize: '0.95rem', lineHeight: 1.2 }}
          secondaryTypographyProps={{ fontSize: '0.75rem', lineHeight: 1.2 }}
        />
        <ListItemSecondaryAction>
          <Tooltip title="模型设置">
            <IconButton
              size="small"
              color="primary"
              onClick={(e) => {
                e.stopPropagation(); // 防止触发父级的点击事件
                navigate('/settings/assistant-settings');
              }}
              sx={{
                bgcolor: 'rgba(255, 193, 7, 0.1)',
                border: '2px solid #ffc107',
                borderRadius: '50%',
                '&:hover': {
                  bgcolor: 'rgba(255, 193, 7, 0.2)',
                }
              }}
            >
              <Sliders size={16} />
            </IconButton>
          </Tooltip>
        </ListItemSecondaryAction>
      </ListItemButton>

      <Divider sx={{ my: 0.5 }} />

      {/* 用户头像设置区域 */}
      <ListItem sx={{
        px: 2,
        py: 1,
        display: 'flex',
        justifyContent: 'space-between',
        bgcolor: 'rgba(255, 193, 7, 0.1)', // 黄色背景提示区域
        borderLeft: '3px solid #ffc107' // 左侧黄色线条
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar
            src={userAvatar}
            sx={{
              width: 36,
              height: 36,
              mr: 1.5,
              bgcolor: userAvatar ? 'transparent' : '#87d068'
            }}
          >
            {!userAvatar && "我"}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.9rem', lineHeight: 1.2 }}>
              用户头像
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', lineHeight: 1.2 }}>
              设置您的个人头像
            </Typography>
          </Box>
        </Box>
        <Tooltip title="设置头像">
          <IconButton
            size="small"
            color="primary"
            onClick={handleAvatarDialogOpen}
            sx={{
              bgcolor: 'rgba(0, 0, 0, 0.04)',
              '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.1)' }
            }}
          >
            <User size={16} />
          </IconButton>
        </Tooltip>
      </ListItem>

      <Divider sx={{ my: 0.5 }} />

      {/* 使用SettingGroups渲染设置分组 */}
      <SettingGroups groups={settingGroups} onSettingChange={handleSettingChange} />
      <Divider sx={{ my: 0.5 }} />

      {/* 输入设置 */}
      <InputSettings />
      <Divider sx={{ my: 0.5 }} />

      {/* 节流强度选择器 */}
      <ThrottleLevelSelector />
      <Divider sx={{ my: 0.5 }} />

      {/* 代码块设置 */}
      <CodeBlockSettings onSettingChange={handleSettingChange} />
      <Divider sx={{ my: 0.5 }} />

      {/* 可折叠的上下文设置 */}
      <ContextSettings
        contextLength={contextLength}
        contextCount={contextCount}
        maxOutputTokens={maxOutputTokens}
        mathRenderer={mathRenderer}
        thinkingEffort={thinkingEffort}
        thinkingBudget={thinkingBudget}
        onContextLengthChange={(value) => {
          setContextLength(value);
          if (onContextLengthChange) {
            onContextLengthChange(value);
          }
          // 保存到localStorage
          try {
            const appSettingsJSON = localStorage.getItem('appSettings');
            const appSettings = appSettingsJSON ? JSON.parse(appSettingsJSON) : {};
            localStorage.setItem('appSettings', JSON.stringify({
              ...appSettings,
              contextLength: value
            }));
          } catch (error) {
            console.error('保存设置失败', error);
          }
        }}
        onContextCountChange={(value) => {
          setContextCount(value);
          if (onContextCountChange) {
            onContextCountChange(value);
          }
          // 保存到localStorage
          try {
            const appSettingsJSON = localStorage.getItem('appSettings');
            const appSettings = appSettingsJSON ? JSON.parse(appSettingsJSON) : {};
            localStorage.setItem('appSettings', JSON.stringify({
              ...appSettings,
              contextCount: value
            }));
          } catch (error) {
            console.error('保存设置失败', error);
          }
        }}
        onMaxOutputTokensChange={async (value) => {
          setMaxOutputTokens(value);
          if (onMaxOutputTokensChange) {
            onMaxOutputTokensChange(value);
          }
          // 保存到localStorage
          try {
            const appSettingsJSON = localStorage.getItem('appSettings');
            const appSettings = appSettingsJSON ? JSON.parse(appSettingsJSON) : {};
            localStorage.setItem('appSettings', JSON.stringify({
              ...appSettings,
              maxOutputTokens: value
            }));
          } catch (error) {
            console.error('保存最大输出Token设置失败', error);
          }

          // 同步更新所有助手的maxTokens
          try {
            const { dexieStorage } = await import('../../../shared/services/DexieStorageService');
            const assistants = await dexieStorage.getAllAssistants();

            for (const assistant of assistants) {
              // 使用saveAssistant方法更新助手
              const updatedAssistant = { ...assistant, maxTokens: value };
              await dexieStorage.saveAssistant(updatedAssistant);
            }

            console.log(`[ContextSettings] 已同步更新 ${assistants.length} 个助手的maxTokens为 ${value}`);
          } catch (error) {
            console.error('同步助手maxTokens失败:', error);
          }
        }}
        onMathRendererChange={(value) => {
          setMathRenderer(value);
          if (onMathRendererChange) {
            onMathRendererChange(value);
          }
          // 保存到localStorage
          try {
            const appSettingsJSON = localStorage.getItem('appSettings');
            const appSettings = appSettingsJSON ? JSON.parse(appSettingsJSON) : {};
            localStorage.setItem('appSettings', JSON.stringify({
              ...appSettings,
              mathRenderer: value
            }));

            // 触发自定义事件，通知其他组件设置已更改
            window.dispatchEvent(new CustomEvent('appSettingsChanged', {
              detail: { mathRenderer: value }
            }));
          } catch (error) {
            console.error('保存设置失败', error);
          }
        }}
        onThinkingEffortChange={(value) => {
          setThinkingEffort(value);
          if (onThinkingEffortChange) {
            onThinkingEffortChange(value);
          }
          // 保存到localStorage
          try {
            const appSettingsJSON = localStorage.getItem('appSettings');
            const appSettings = appSettingsJSON ? JSON.parse(appSettingsJSON) : {};
            localStorage.setItem('appSettings', JSON.stringify({
              ...appSettings,
              defaultThinkingEffort: value
            }));
          } catch (error) {
            console.error('保存思维链长度设置失败', error);
          }
        }}
        onThinkingBudgetChange={(value) => {
          setThinkingBudget(value);
          if (onThinkingBudgetChange) {
            onThinkingBudgetChange(value);
          }
          // 保存到localStorage
          try {
            const appSettingsJSON = localStorage.getItem('appSettings');
            const appSettings = appSettingsJSON ? JSON.parse(appSettingsJSON) : {};
            localStorage.setItem('appSettings', JSON.stringify({
              ...appSettings,
              thinkingBudget: value
            }));
          } catch (error) {
            console.error('保存思考预算设置失败', error);
          }
        }}
      />
      <Divider sx={{ my: 0.5 }} />

      {/* MCP 工具控制 */}
      <MCPSidebarControls
        mcpMode={mcpMode}
        toolsEnabled={toolsEnabled}
        onMCPModeChange={onMCPModeChange}
        onToolsToggle={onToolsToggle}
      />

      {/* 头像上传对话框 */}
      <AvatarUploader
        open={isAvatarDialogOpen}
        onClose={handleAvatarDialogClose}
        onSave={handleSaveAvatar}
      />
    </List>
  );
}