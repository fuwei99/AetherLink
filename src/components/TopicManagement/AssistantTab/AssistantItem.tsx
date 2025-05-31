import React, { startTransition, useCallback, useMemo, memo } from 'react';
import {
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Typography,
  Box,
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
  // 使用 useCallback 缓存事件处理函数，避免每次渲染都创建新函数
  const handleAssistantClick = useCallback(() => {
    // 先触发切换到话题标签页事件，确保UI已经切换到话题标签页
    EventEmitter.emit(EVENT_NAMES.SHOW_TOPIC_SIDEBAR);

    // 使用startTransition包装状态更新，减少渲染阻塞，提高性能
    // 这会告诉React这是一个低优先级更新，可以被中断
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
    return assistant.topics?.length || assistant.topicIds?.length || 0;
  }, [assistant.topics?.length, assistant.topicIds?.length]);

  // 缓存头像显示内容 - 支持Lucide图标
  const avatarContent = useMemo(() => {
    const iconOrEmoji = assistant.emoji || assistant.name.charAt(0);

    // 如果是Lucide图标名称，渲染Lucide图标
    if (isLucideIcon(iconOrEmoji)) {
      return (
        <LucideIconRenderer
          iconName={iconOrEmoji}
          size={18}
          color={isSelected ? 'white' : 'inherit'}
        />
      );
    }

    // 否则显示emoji或首字母
    return iconOrEmoji;
  }, [assistant.emoji, assistant.name, isSelected]);

  // 缓存样式对象，避免每次渲染都创建新对象
  const avatarSx = useMemo(() => ({
    width: 32,
    height: 32,
    fontSize: '1.2rem',
    bgcolor: isSelected ? 'primary.main' : 'grey.300',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  }), [isSelected]);

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
        <Avatar sx={avatarSx}>
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
  return (
    prevProps.assistant.id === nextProps.assistant.id &&
    prevProps.assistant.name === nextProps.assistant.name &&
    prevProps.assistant.emoji === nextProps.assistant.emoji &&
    prevProps.isSelected === nextProps.isSelected &&
    (prevProps.assistant.topics?.length || 0) === (nextProps.assistant.topics?.length || 0) &&
    (prevProps.assistant.topicIds?.length || 0) === (nextProps.assistant.topicIds?.length || 0)
  );
});

export default AssistantItem;
