import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
  Typography,
  Box,
  Alert,
  useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { ChatTopic, Assistant } from '../shared/types/Assistant';
import { TopicService } from '../shared/services/TopicService';
import { updateTopic } from '../shared/store/slices/assistantsSlice';
import { useAppDispatch, useAppSelector } from '../shared/store';
// 移除旧的系统提示词选择器，使用默认提示词
// import { selectActiveSystemPrompt } from '../shared/store/slices/systemPromptsSlice';
import { dexieStorage } from '../shared/services/DexieStorageService';

interface SystemPromptDialogProps {
  open: boolean;
  onClose: () => void;
  topic: ChatTopic | null;
  assistant: Assistant | null;
  onSave?: (updatedTopic: ChatTopic) => void;
}

/**
 * 系统提示词编辑对话框
 * 用于编辑当前话题的系统提示词
 */
const SystemPromptDialog: React.FC<SystemPromptDialogProps> = ({
  open,
  onClose,
  topic,
  assistant,
  onSave
}) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const [prompt, setPrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const [tokensCount, setTokensCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // 使用默认提示词替代旧的系统提示词
  const activeSystemPrompt = '';

  // 当对话框打开时，初始化提示词
  useEffect(() => {
    if (open) {
      // 🔥 修复：与气泡组件保持一致的优先级 - 优先显示助手的系统提示词
      // 优先级：助手提示词 > 话题提示词 > 默认提示词
      setPrompt(assistant?.systemPrompt || topic?.prompt || activeSystemPrompt || '');

      // 简单估算token数量 (英文按照单词计算，中文按照字符计算)
      const text = assistant?.systemPrompt || topic?.prompt || activeSystemPrompt || '';
      const estimatedTokens = Math.ceil(text.split(/\s+/).length +
        text.replace(/[\u4e00-\u9fa5]/g, '').length / 4);
      setTokensCount(estimatedTokens);

      // 重置错误状态
      setError(null);
    }
  }, [open, topic, assistant, activeSystemPrompt]);

  // 保存提示词 - 🔥 修复：添加助手提示词保存逻辑，使用侧边栏编辑助手的保存逻辑
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // 🔥 新增：如果有助手且当前显示的是助手提示词，保存到助手
      // 判断逻辑：如果有助手，且当前提示词来源于助手（优先级最高）
      if (assistant && (assistant.systemPrompt || (!topic?.prompt && !activeSystemPrompt))) {
        console.log('[SystemPromptDialog] 保存助手系统提示词:', {
          assistantId: assistant.id,
          assistantName: assistant.name,
          systemPrompt: prompt.trim().substring(0, 50) + (prompt.trim().length > 50 ? '...' : '')
        });

        const updatedAssistant = {
          ...assistant,
          systemPrompt: prompt.trim()
        };

        // 🔥 使用侧边栏编辑助手的保存逻辑：直接保存到数据库，确保数据持久化
        await dexieStorage.saveAssistant(updatedAssistant);
        console.log('[SystemPromptDialog] 已保存助手系统提示词到数据库');

        // 🔥 派发事件通知其他组件更新，与侧边栏编辑助手保持一致
        window.dispatchEvent(new CustomEvent('assistantUpdated', {
          detail: { assistant: updatedAssistant }
        }));
        console.log('[SystemPromptDialog] 已派发助手更新事件');

        onClose();
        return;
      }

      // 如果没有话题但有助手，先创建话题
      if (!topic && assistant) {
        console.log('[SystemPromptDialog] 没有当前话题，尝试创建新话题');
        const newTopic = await TopicService.createNewTopic();

        if (newTopic) {
          console.log('[SystemPromptDialog] 成功创建新话题:', newTopic.id);

          // 更新新话题的提示词
          // 虽然prompt属性已弃用，但目前仍需要使用它，因为ChatTopic类型定义中没有systemPrompt属性
          // 这是一个临时解决方案，未来应该迁移到新的属性
          newTopic.prompt = prompt.trim();
          await TopicService.saveTopic(newTopic);
          console.log('[SystemPromptDialog] 已保存话题提示词');

          onClose();
          return;
        } else {
          throw new Error('创建话题失败');
        }
      }

      // 更新现有话题提示词
      if (topic) {
        console.log('[SystemPromptDialog] 更新现有话题的系统提示词');
        // 虽然prompt属性已弃用，但目前仍需要使用它，因为ChatTopic类型定义中没有systemPrompt属性
        // 这是一个临时解决方案，未来应该迁移到新的属性
        const updatedTopic = { ...topic, prompt: prompt.trim() };

        // 保存到数据库
        await TopicService.saveTopic(updatedTopic);
        console.log('[SystemPromptDialog] 已保存话题提示词到数据库');

        // 强制刷新Redux状态
        if (assistant) {
          dispatch(updateTopic({
            assistantId: assistant.id,
            topic: updatedTopic
          }));
          console.log('[SystemPromptDialog] 已通过Redux更新话题状态');
        }

        // 调用保存回调，通知父组件更新
        if (onSave) {
          console.log('[SystemPromptDialog] 调用onSave回调，通知父组件更新');
          onSave(updatedTopic);
        }
      }

      onClose();
    } catch (error) {
      console.error('[SystemPromptDialog] 保存系统提示词失败:', error);
      setError(error instanceof Error ? error.message : '保存系统提示词失败');
    } finally {
      setSaving(false);
    }
  };

  // 当提示词变化时，更新token计数
  const handlePromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setPrompt(text);

    // 简单估算token数量
    const estimatedTokens = Math.ceil(text.split(/\s+/).length +
      text.replace(/[\u4e00-\u9fa5]/g, '').length / 4);
    setTokensCount(estimatedTokens);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: '12px',
          margin: '16px',
        }
      }}
    >
      <DialogTitle sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: `1px solid ${theme.palette.divider}`,
        pb: 1
      }}>
        系统提示词设置
        <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2, pb: 1 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!topic && !saving && (
          <Alert severity="info" sx={{ mb: 2 }}>
            保存将创建新话题并应用此系统提示词
          </Alert>
        )}

        <TextField
          autoFocus
          multiline
          fullWidth
          variant="outlined"
          placeholder="输入系统提示词..."
          value={prompt}
          onChange={handlePromptChange}
          rows={8}
          sx={{ mb: 1 }}
        />

        <Box sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          color: theme.palette.text.secondary,
          fontSize: '0.75rem'
        }}>
          <Typography variant="caption">
            估计Token数量: {tokensCount}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{
        padding: '8px 24px 16px 24px',
        borderTop: `1px solid ${theme.palette.divider}`,
      }}>
        <Button onClick={onClose} color="inherit">
          取消
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          disabled={saving}
        >
          {saving ? '保存中...' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SystemPromptDialog;