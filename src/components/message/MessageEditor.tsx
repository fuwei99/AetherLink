import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, useMediaQuery, useTheme } from '@mui/material';
import { useDispatch } from 'react-redux';
import { newMessagesActions } from '../../shared/store/slices/newMessagesSlice';
import type { Message } from '../../shared/types/newMessage.ts';
import { UserMessageStatus, AssistantMessageStatus } from '../../shared/types/newMessage.ts';
import { dexieStorage } from '../../shared/services/DexieStorageService';
// 开发环境日志工具 - 减少日志输出
const isDev = process.env.NODE_ENV === 'development';
const devLog = (..._args: any[]) => {}; // 禁用详细日志
const devError = isDev ? console.error : () => {};

interface MessageEditorProps {
  message: Message;
  topicId?: string;
  open: boolean;
  onClose: () => void;
}

const MessageEditor: React.FC<MessageEditorProps> = ({ message, topicId, open, onClose }) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // 🚀 简化：只在保存时需要查找主文本块，移除不必要的selector

  // � 修复：确保消息块加载到Redux后再获取内容
  const loadInitialContent = useCallback(async () => {
    devLog('[MessageEditor] 开始加载内容，消息ID:', message.id);
    devLog('[MessageEditor] 消息blocks:', message.blocks);

    // 方法1: 检查消息的content字段
    if (typeof (message as any).content === 'string' && (message as any).content.trim()) {
      const content = (message as any).content.trim();
      devLog('[MessageEditor] 从消息content字段获取内容:', content.length);
      return content;
    }

    // 方法2: 确保消息块已加载到Redux，然后获取内容
    if (message.blocks && message.blocks.length > 0) {
      try {
        // 首先从数据库加载所有消息块到Redux
        const messageBlocks: any[] = [];
        for (const blockId of message.blocks) {
          const block = await dexieStorage.getMessageBlock(blockId);
          if (block) {
            messageBlocks.push(block);
            devLog(`[MessageEditor] 从数据库加载块 ${blockId}:`, {
              type: block.type,
              hasContent: !!(block as any).content,
              contentLength: typeof (block as any).content === 'string' ? (block as any).content.length : 0
            });
          } else {
            devLog(`[MessageEditor] 数据库中找不到块: ${blockId}`);
          }
        }

        // 将块加载到Redux
        if (messageBlocks.length > 0) {
          dispatch({ type: 'messageBlocks/upsertMany', payload: messageBlocks });
          devLog('[MessageEditor] 已将块加载到Redux，数量:', messageBlocks.length);
        }

        // 现在从加载的块中获取主文本内容
        for (const block of messageBlocks) {
          if ((block.type === 'main_text' || block.type === 'unknown') && (block as any).content) {
            const content = (block as any).content;
            devLog('[MessageEditor] 找到主文本内容，长度:', content.length);
            return content;
          }
        }
      } catch (error) {
        devError('[MessageEditor] 加载消息块失败:', error);
      }
    }

    devLog('[MessageEditor] 未找到任何内容');
    return '';
  }, [message, dispatch]);

  const [editedContent, setEditedContent] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const isUser = message.role === 'user';

  // � 修复：异步加载内容的逻辑
  useEffect(() => {
    if (open && !isInitialized) {
      const initContent = async () => {
        const content = await loadInitialContent();
        devLog('[MessageEditor] 初始化编辑内容:', content.substring(0, 50));
        setEditedContent(content);
        setIsInitialized(true);
      };
      initContent();
    } else if (!open) {
      // Dialog关闭时重置状态
      setIsInitialized(false);
      setEditedContent('');
    }
  }, [open, isInitialized, loadInitialContent]);

  // 🚀 性能优化：保存逻辑 - 减少数据库调用和日志输出
  const handleSave = useCallback(async () => {
    // 获取编辑后的文本内容
    const editedText = typeof editedContent === 'string'
      ? editedContent.trim()
      : '';

    devLog('[MessageEditor] 保存编辑内容:', {
      messageId: message.id,
      topicId,
      editedTextLength: editedText.length,
      hasBlocks: message.blocks?.length > 0
    });

    if (!topicId || !editedText) {
      devError('[MessageEditor] 保存失败: 缺少topicId或内容为空');
      return;
    }

    try {
      // 🚀 简化：直接从数据库查找主文本块
      let mainTextBlockId: string | undefined;
      if (message.blocks && message.blocks.length > 0) {
        for (const blockId of message.blocks) {
          const block = await dexieStorage.getMessageBlock(blockId);
          if (block && (block.type === 'main_text' || block.type === 'unknown')) {
            mainTextBlockId = blockId;
            break;
          }
        }
      }

      devLog('[MessageEditor] 找到主文本块:', mainTextBlockId);

      // � 性能优化：批量更新数据库和Redux状态
      const updatedAt = new Date().toISOString();
      const messageUpdates = {
        status: isUser ? UserMessageStatus.SUCCESS : AssistantMessageStatus.SUCCESS,
        updatedAt,
        content: editedText
      };

      // 🚀 性能优化：使用事务批量更新数据库，减少I/O操作
      try {
        await dexieStorage.transaction('rw', [dexieStorage.messages, dexieStorage.message_blocks, dexieStorage.topics], async () => {
          // 更新消息块
          if (mainTextBlockId) {
            await dexieStorage.updateMessageBlock(mainTextBlockId, {
              content: editedText,
              updatedAt
            });
          }

          // 更新消息
          await dexieStorage.updateMessage(message.id, messageUpdates);

          // 更新话题中的消息（如果需要）
          if (topicId) {
            await dexieStorage.updateMessageInTopic(topicId, message.id, {
              ...message,
              ...messageUpdates
            });
          }
        });

        devLog('[MessageEditor] 批量数据库更新完成');
      } catch (dbError) {
        devError('[MessageEditor] 数据库更新失败:', dbError);
        throw dbError; // 重新抛出错误以便后续处理
      }

      // 🚀 性能优化：批量更新Redux状态
      if (mainTextBlockId) {
        dispatch({
          type: 'messageBlocks/updateOneBlock',
          payload: {
            id: mainTextBlockId,
            changes: {
              content: editedText,
              updatedAt
            }
          }
        });
      }

      dispatch(newMessagesActions.updateMessage({
        id: message.id,
        changes: messageUpdates
      }));

      devLog('[MessageEditor] Redux状态更新完成');

      // � 性能优化：直接关闭Dialog，移除不必要的延迟和事件
      // Redux状态更新是同步的，不需要额外的延迟或全局事件
      onClose();

    } catch (error) {
      devError('[MessageEditor] 保存失败:', error);
      alert('保存失败，请重试');
    }
  }, [editedContent, topicId, message, dispatch, isUser, onClose]);

  // 🚀 性能优化：关闭处理 - 使用useCallback
  const handleClose = useCallback(() => {
    devLog('[MessageEditor] 关闭编辑器');
    onClose();
  }, [onClose]);

  // 🚀 性能优化：内容变更处理 - 使用useCallback
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedContent(e.target.value);
  }, []);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth={isMobile ? "xs" : "sm"} // 移动端使用更小的宽度
      // 移动端优化：确保Dialog正确显示
      slotProps={{
        paper: {
          sx: {
            margin: isMobile ? 1 : 3,
            maxHeight: isMobile ? '90vh' : '80vh',
            // 移动端确保内容可见
            ...(isMobile && {
              position: 'fixed',
              top: '5%',
              left: '5%',
              right: '5%',
              bottom: 'auto',
              transform: 'none'
            })
          }
        }
      }}
      // 移动端禁用backdrop点击关闭，避免意外关闭
      disableEscapeKeyDown={isMobile}
    >
      <DialogTitle sx={{
        pb: 1,
        fontWeight: 500,
        fontSize: isMobile ? '1.1rem' : '1.25rem' // 移动端字体调整
      }}>
        编辑{isUser ? '消息' : '回复'}
      </DialogTitle>
      <DialogContent sx={{
        pt: 2,
        pb: isMobile ? 1 : 2 // 移动端减少底部间距
      }}>
        <TextField
          multiline
          fullWidth
          minRows={isMobile ? 3 : 4} // 移动端减少最小行数
          maxRows={isMobile ? 8 : 10} // 移动端调整最大行数
          value={editedContent}
          onChange={handleContentChange}
          variant="outlined"
          placeholder={isInitialized ? "请输入内容..." : "正在加载内容..."}
          disabled={!isInitialized} // 未初始化时禁用输入
          autoFocus={isInitialized && !isMobile} // 移动端不自动聚焦，避免键盘弹出问题
          sx={{
            '& .MuiOutlinedInput-root': {
              fontSize: isMobile ? '16px' : '14px', // 移动端使用16px避免缩放
              lineHeight: 1.5
            }
          }}
        />
      </DialogContent>
      <DialogActions sx={{
        px: 3,
        pb: 2,
        gap: 1 // 按钮间距
      }}>
        <Button
          onClick={handleClose}
          color="inherit"
          size={isMobile ? "medium" : "small"}
          sx={{ minWidth: isMobile ? 80 : 'auto' }}
        >
          取消
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={!isInitialized || !editedContent || !editedContent.trim()}
          size={isMobile ? "medium" : "small"}
          sx={{
            mr: 1,
            minWidth: isMobile ? 80 : 'auto'
          }}
        >
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MessageEditor;