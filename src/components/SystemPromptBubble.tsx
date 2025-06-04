import React from 'react';
import { Box, Typography, Paper, useTheme } from '@mui/material';
import { Edit, Brain } from 'lucide-react';
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
          ? 'rgba(255, 255, 255, 0.02)'
          : 'rgba(0, 0, 0, 0.02)',
        border: `1px solid`,
        borderColor: theme.palette.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(0, 0, 0, 0.08)',
        transition: 'all 0.2s ease',
        '&:hover': {
          backgroundColor: theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.05)'
            : 'rgba(0, 0, 0, 0.04)',
          borderColor: theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.2)'
            : 'rgba(0, 0, 0, 0.15)',
        },
        position: 'relative',
        zIndex: 10
      }}
    >
      <Brain
        size={20}
        style={{
          marginRight: 12,
          color: theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.6)'
            : 'rgba(0, 0, 0, 0.6)'
        }}
      />

      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <Typography
          variant="caption"
          component="div"
          sx={{
            color: theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.7)'
              : 'rgba(0, 0, 0, 0.7)',
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

      <Edit
        size={18}
        style={{
          marginLeft: 8,
          color: theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.5)'
            : 'rgba(0, 0, 0, 0.5)'
        }}
      />
    </Paper>
  );
});

// 设置displayName便于调试
SystemPromptBubble.displayName = 'SystemPromptBubble';

export default SystemPromptBubble;