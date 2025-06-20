import React, { startTransition, useCallback, useMemo, memo, useEffect, useState } from 'react';
import {
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Typography,
  Box,
  useTheme,
} from '@mui/material';
import { MoreVertical, Trash } from 'lucide-react';
import type { Assistant } from '../../../shared/types/Assistant';
import { EventEmitter, EVENT_NAMES } from '../../../shared/services/EventService';
import LucideIconRenderer, { isLucideIcon } from './LucideIconRenderer';

interface AssistantItemProps {
  assistant: Assistant;
  isSelected: boolean;
  onSelectAssistant: (assistant: Assistant) => void;
  onOpenMenu: (event: React.MouseEvent, assistant: Assistant) => void;
  onDeleteAssistant: (assistantId: string, event: React.MouseEvent) => void;
}

/**
 * 单个助手项组件 - 使用 memo 优化重复渲染
 */
const AssistantItem = memo(function AssistantItem({
  assistant,
  isSelected,
  onSelectAssistant,
  onOpenMenu,
  onDeleteAssistant
}: AssistantItemProps) {
  // 获取主题信息，用于修复图标颜色问题
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // 添加本地状态来强制更新话题数显示
  const [forceUpdateKey, setForceUpdateKey] = useState(0);

  // 监听话题清空事件
  useEffect(() => {
    const handleTopicsCleared = (event: CustomEvent) => {
      const { assistantId } = event.detail;
      if (assistantId === assistant.id) {
        console.log(`[AssistantItem] 收到话题清空事件，助手: ${assistant.name}`);
        // 强制更新组件以刷新话题数显示
        setForceUpdateKey(prev => prev + 1);
      }
    };

    // 监听助手更新事件
    const handleAssistantUpdated = (event: CustomEvent) => {
      const { assistant: updatedAssistant } = event.detail;
      if (updatedAssistant.id === assistant.id) {
        console.log(`[AssistantItem] 收到助手更新事件，助手: ${assistant.name}`);
        // 强制更新组件
        setForceUpdateKey(prev => prev + 1);
      }
    };

    window.addEventListener('topicsCleared', handleTopicsCleared as EventListener);
    window.addEventListener('assistantUpdated', handleAssistantUpdated as EventListener);

    return () => {
      window.removeEventListener('topicsCleared', handleTopicsCleared as EventListener);
      window.removeEventListener('assistantUpdated', handleAssistantUpdated as EventListener);
    };
  }, [assistant.id, assistant.name]);

  // 简化助手点击处理函数，移除复杂的事件链
  const handleAssistantClick = useCallback(() => {
    // 直接使用状态更新，无需事件驱动
    startTransition(() => {
      onSelectAssistant(assistant);
    });
  }, [assistant, onSelectAssistant]);

  const handleOpenMenu = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onOpenMenu(event, assistant);
  }, [assistant, onOpenMenu]);

  const handleDeleteClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onDeleteAssistant(assistant.id, event);
  }, [assistant.id, onDeleteAssistant]);

  // 使用 useMemo 缓存计算结果，避免每次渲染都重新计算
  const topicCount = useMemo(() => {
    const count = assistant.topics?.length || assistant.topicIds?.length || 0;
    return count;
  }, [assistant.id, assistant.topics?.length, assistant.topicIds?.length, forceUpdateKey, assistant.name]);

  // 缓存头像显示内容 - 支持自定义头像、Lucide图标和emoji
  const avatarContent = useMemo(() => {
    // 如果有自定义头像，直接返回null（让Avatar组件使用src属性）
    if (assistant.avatar) {
      return null;
    }

    const iconOrEmoji = assistant.emoji || assistant.name.charAt(0);

    // 如果是Lucide图标名称，渲染Lucide图标
    if (isLucideIcon(iconOrEmoji)) {
      // 修复图标颜色逻辑：
      // - 选中状态：白色图标（因为背景是primary.main蓝色）
      // - 未选中状态：根据主题模式决定颜色
      //   - 深色模式：白色图标（因为背景是grey.300浅灰色）
      //   - 浅色模式：深色图标（因为背景是grey.300浅灰色）
      const iconColor = isSelected
        ? 'white'
        : isDarkMode
          ? '#ffffff'
          : '#424242';

      return (
        <LucideIconRenderer
          iconName={iconOrEmoji}
          size={18}
          color={iconColor}
        />
      );
    }

    // 否则显示emoji或首字母
    return iconOrEmoji;
  }, [assistant.avatar, assistant.emoji, assistant.name, isSelected, isDarkMode]);

  // 缓存样式对象，避免每次渲染都创建新对象
  const avatarSx = useMemo(() => {
    // 修复背景颜色逻辑：
    // - 选中状态：使用primary.main（蓝色）
    // - 未选中状态：根据主题模式使用合适的背景色
    //   - 深色模式：使用较深的灰色
    //   - 浅色模式：使用较浅的灰色
    const bgColor = isSelected
      ? 'primary.main'
      : isDarkMode
        ? 'grey.700'  // 深色模式用深灰色背景
        : 'grey.300'; // 浅色模式用浅灰色背景

    return {
      width: 32,
      height: 32,
      fontSize: '1.2rem',
      bgcolor: bgColor,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: '25%', // 方圆形头像
    };
  }, [isSelected, isDarkMode]);

  const primaryTextSx = useMemo(() => ({
    fontWeight: isSelected ? 600 : 400,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  }), [isSelected]);

  return (
    <ListItemButton
      onClick={handleAssistantClick}
      selected={isSelected}
      sx={{
        borderRadius: '8px',
        mb: 1,
        '&.Mui-selected': {
          backgroundColor: 'rgba(25, 118, 210, 0.08)',
        },
        '&.Mui-selected:hover': {
          backgroundColor: 'rgba(25, 118, 210, 0.12)',
        }
      }}
    >
      <ListItemAvatar>
        <Avatar
          src={assistant.avatar}
          sx={{
            ...avatarSx,
            // 如果有自定义头像，调整背景色
            bgcolor: assistant.avatar
              ? 'transparent'
              : isSelected
                ? 'primary.main'
                : isDarkMode
                  ? 'grey.700'  // 深色模式用深灰色背景
                  : 'grey.300'  // 浅色模式用浅灰色背景
          }}
        >
          {avatarContent}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Typography
            variant="body2"
            sx={primaryTextSx}
          >
            {assistant.name}
          </Typography>
        }
        secondary={
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block' }}
          >
            {topicCount} 个话题
          </Typography>
        }
      />
      <Box sx={{ display: 'flex' }}>
        <IconButton
          size="small"
          onClick={handleOpenMenu}
          sx={{ opacity: 0.6 }}
        >
          <MoreVertical size={16} />
        </IconButton>
        <IconButton
          size="small"
          onClick={handleDeleteClick}
          sx={{ opacity: 0.6, '&:hover': { color: 'error.main' } }}
        >
          <Trash size={16} />
        </IconButton>
      </Box>
    </ListItemButton>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数，避免不必要的重新渲染
  // 优化：更严格的比较，减少不必要的重新渲染
  const shouldSkipRender = (
    prevProps.assistant.id === nextProps.assistant.id &&
    prevProps.assistant.name === nextProps.assistant.name &&
    prevProps.assistant.emoji === nextProps.assistant.emoji &&
    prevProps.assistant.avatar === nextProps.assistant.avatar &&
    prevProps.isSelected === nextProps.isSelected &&
    (prevProps.assistant.topics?.length || 0) === (nextProps.assistant.topics?.length || 0) &&
    (prevProps.assistant.topicIds?.length || 0) === (nextProps.assistant.topicIds?.length || 0) &&
    prevProps.forceUpdateKey === nextProps.forceUpdateKey
  );

  // 只在开发环境记录变化日志
  if (process.env.NODE_ENV === 'development' && !shouldSkipRender) {
    const changes = [];
    if (prevProps.assistant.id !== nextProps.assistant.id) changes.push('id');
    if (prevProps.assistant.name !== nextProps.assistant.name) changes.push('name');
    if (prevProps.assistant.emoji !== nextProps.assistant.emoji) changes.push('emoji');
    if (prevProps.assistant.avatar !== nextProps.assistant.avatar) changes.push('avatar');
    if (prevProps.isSelected !== nextProps.isSelected) changes.push('isSelected');
    if ((prevProps.assistant.topics?.length || 0) !== (nextProps.assistant.topics?.length || 0)) changes.push('topics.length');
    if ((prevProps.assistant.topicIds?.length || 0) !== (nextProps.assistant.topicIds?.length || 0)) changes.push('topicIds.length');
    if (prevProps.forceUpdateKey !== nextProps.forceUpdateKey) changes.push('forceUpdateKey');

    console.log(`[AssistantItem] 重新渲染 ${nextProps.assistant.name}，变化: ${changes.join(', ')}`);
  }

  return shouldSkipRender;
});

export default AssistantItem;
