import React from 'react';
import { Box, Typography, Paper, useTheme } from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';
import PsychologyIcon from '@mui/icons-material/Psychology';
import type { ChatTopic, Assistant } from '../shared/types/Assistant';
// 移除不再使用的useAppSelector导入
// import { useAppSelector } from '../shared/store';
// 移除旧的系统提示词选择器，使用默认提示词
// import { selectActiveSystemPrompt } from '../shared/store/slices/systemPromptsSlice';

interface SystemPromptBubbleProps {
  topic: ChatTopic | null;
  assistant: Assistant | null;
  onClick: () => void;
}

/**
 * 系统提示词气泡组件
 * 显示在消息列表顶部，点击可以编辑系统提示词
 *  优化：使用React.memo避免不必要的重新渲染
 */
const SystemPromptBubble: React.FC<SystemPromptBubbleProps> = React.memo(({ topic, assistant, onClick }) => {
  const theme = useTheme();
  
  // 使用默认提示词替代旧的系统提示词
  const activeSystemPrompt = '';

  // 获取系统提示词 - 优先显示助手的系统提示词，与编辑对话框保持一致
  // 如果没有助手提示词，则显示话题提示词或默认提示词
  const systemPrompt =
    (assistant?.systemPrompt || topic?.prompt || activeSystemPrompt || '点击此处编辑系统提示词');

  return (
    <Paper
      elevation={1}
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        margin: '0 8px 16px 8px',
        borderRadius: '8px',
        cursor: 'pointer',
        backgroundColor: theme.palette.mode === 'dark'
          ? 'rgba(25, 118, 210, 0.08)'
          : 'rgba(25, 118, 210, 0.04)',
        border: `1px solid ${theme.palette.primary.main}`,
        borderColor: theme.palette.mode === 'dark'
          ? 'rgba(25, 118, 210, 0.5)'
          : 'rgba(25, 118, 210, 0.25)',
        transition: 'all 0.2s ease',
        '&:hover': {
          backgroundColor: theme.palette.mode === 'dark'
            ? 'rgba(25, 118, 210, 0.15)'
            : 'rgba(25, 118, 210, 0.08)',
          borderColor: theme.palette.primary.main,
        },
        position: 'relative',
        zIndex: 10
      }}
    >
      <PsychologyIcon
        fontSize="small"
        sx={{
          mr: 1.5,
          color: theme.palette.primary.main,
          fontSize: '20px'
        }}
      />

      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <Typography
          variant="caption"
          component="div"
          sx={{
            color: theme.palette.mode === 'dark'
              ? theme.palette.primary.light
              : theme.palette.primary.main,
            fontSize: '12px',
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {systemPrompt}
        </Typography>
      </Box>

      <EditNoteIcon
        fontSize="small"
        sx={{
          ml: 1,
          color: theme.palette.primary.main,
          fontSize: '18px'
        }}
      />
    </Paper>
  );
});

// 设置displayName便于调试
SystemPromptBubble.displayName = 'SystemPromptBubble';

export default SystemPromptBubble;