import React, { useState, useEffect, useCallback, useReducer } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Collapse,
  useTheme,
  Chip,
  Avatar,
  Tooltip
} from '@mui/material';
import {
  Lightbulb,
  Copy,
  ChevronDown,
  Brain,
  Sparkles,
  BarChart
} from 'lucide-react';
import { styled } from '@mui/material/styles';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../shared/store';
import type { ThinkingMessageBlock } from '../../../shared/types/newMessage';
import { MessageBlockStatus } from '../../../shared/types/newMessage';
import Markdown from '../Markdown';
import { EventEmitter, EVENT_NAMES } from '../../../shared/services/EventEmitter';
import { useDeepMemo } from '../../../hooks/useMemoization';
import { formatThinkingTimeSeconds } from '../../../shared/utils/thinkingUtils';
import { getThinkingScrollbarStyles, getCompactScrollbarStyles } from '../../../shared/utils/scrollbarStyles';

// 思考过程显示样式类型
export type ThinkingDisplayStyle = 'compact' | 'full' | 'hidden' | 'minimal' | 'bubble' | 'timeline' | 'card' | 'inline' |
  'stream' | 'dots' | 'wave' | 'sidebar' | 'overlay' | 'breadcrumb' | 'floating' | 'terminal';

// 思考过程显示样式常量
export const ThinkingDisplayStyle = {
  COMPACT: 'compact' as ThinkingDisplayStyle,
  FULL: 'full' as ThinkingDisplayStyle,
  HIDDEN: 'hidden' as ThinkingDisplayStyle,
  MINIMAL: 'minimal' as ThinkingDisplayStyle,
  BUBBLE: 'bubble' as ThinkingDisplayStyle,
  TIMELINE: 'timeline' as ThinkingDisplayStyle,
  CARD: 'card' as ThinkingDisplayStyle,
  INLINE: 'inline' as ThinkingDisplayStyle,
  // 2025年新增的先进样式
  STREAM: 'stream' as ThinkingDisplayStyle,
  DOTS: 'dots' as ThinkingDisplayStyle,
  WAVE: 'wave' as ThinkingDisplayStyle,
  SIDEBAR: 'sidebar' as ThinkingDisplayStyle,
  OVERLAY: 'overlay' as ThinkingDisplayStyle,
  BREADCRUMB: 'breadcrumb' as ThinkingDisplayStyle,
  FLOATING: 'floating' as ThinkingDisplayStyle,
  TERMINAL: 'terminal' as ThinkingDisplayStyle
};

interface Props {
  block: ThinkingMessageBlock;
}

/**
 * 思考块组件
 * 显示AI的思考过程，可折叠/展开
 */
const ThinkingBlock: React.FC<Props> = ({ block }) => {
  // 从设置中获取思考过程显示样式
  const thinkingDisplayStyle = useSelector((state: RootState) =>
    (state.settings as any).thinkingDisplayStyle || 'compact'
  );

  // 从设置中获取是否自动折叠思考过程
  const thoughtAutoCollapse = useSelector((state: RootState) =>
    (state.settings as any).thoughtAutoCollapse !== false
  );

  const [expanded, setExpanded] = useState(!thoughtAutoCollapse);
  const theme = useTheme();
  const isThinking = block.status === MessageBlockStatus.STREAMING;
  // 修复：使用稳定的思考时间，避免每次渲染都变化
  const [thinkingTime, setThinkingTime] = useState(() => block.thinking_millsec || 0);
  const [copied, setCopied] = useState(false);

  // 新增状态用于高级样式
  const [streamText, setStreamText] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);

  // 添加强制更新机制
  const [updateCounter, forceUpdate] = useReducer(state => state + 1, 0);
  const [content, setContent] = useState(block.content || '');

  // 使用记忆化的block内容，避免不必要的重渲染
  const memoizedContent = useDeepMemo(() => content, [content, updateCounter]);

  // 格式化思考时间（毫秒转为秒，保留1位小数）
  const formattedThinkingTime = formatThinkingTimeSeconds(thinkingTime).toFixed(1);

  // 复制思考内容到剪贴板
  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发折叠/展开
    if (block.content) {
      navigator.clipboard.writeText(block.content);
      // 显示复制成功状态
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      // 发送复制事件
      EventEmitter.emit(EVENT_NAMES.UI_COPY_SUCCESS || 'ui:copy_success', { content: '已复制思考内容' });
    }
  }, [block.content]);

  // 切换折叠/展开状态
  const toggleExpanded = useCallback(() => {
    setExpanded(!expanded);
  }, [expanded]);

  // 监听内容变化
  useEffect(() => {
    setContent(block.content || '');
  }, [block.content]);

  // 添加流式输出事件监听 - 改进版本，确保不丢失内容
  useEffect(() => {
    // 检查是否正在流式输出
    if (isThinking) {
      // 监听流式输出事件
      const thinkingDeltaHandler = () => {
        const newContent = block.content || '';
        setContent(newContent);
        forceUpdate();
      };

      // 订阅思考增量和完成事件
      const unsubscribeThinkingDelta = EventEmitter.on(EVENT_NAMES.STREAM_THINKING_DELTA, thinkingDeltaHandler);
      const unsubscribeThinkingComplete = EventEmitter.on(EVENT_NAMES.STREAM_THINKING_COMPLETE, thinkingDeltaHandler);

      return () => {
        unsubscribeThinkingDelta();
        unsubscribeThinkingComplete();
      };
    }
  }, [isThinking, block.content]);

  // 确保内容与block同步
  useEffect(() => {
    const newContent = block.content || '';
    if (newContent !== content) {
      setContent(newContent);
    }
  }, [block.content, content]);

  // 修复：分离思考时间更新和自动折叠逻辑
  // 思考时间计时器 - 只在思考状态变化时更新
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (isThinking) {
      // 如果正在思考，每100毫秒更新一次计时
      timer = setInterval(() => {
        setThinkingTime(prev => prev + 100);
      }, 100);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isThinking]); // 只依赖思考状态

  // 修复：只在思考完成时设置最终时间，避免重复设置
  useEffect(() => {
    if (!isThinking && block.thinking_millsec && block.thinking_millsec !== thinkingTime) {
      // 只有当思考完成且服务器返回的时间与当前时间不同时才更新
      setThinkingTime(block.thinking_millsec);
    }
  }, [isThinking, block.thinking_millsec]); // 移除 thinkingTime 依赖避免循环

  // 自动折叠逻辑 - 独立处理
  useEffect(() => {
    if (!isThinking && thoughtAutoCollapse) {
      setExpanded(false);
    }
  }, [isThinking, thoughtAutoCollapse]);

  // 如果设置为隐藏思考过程，则不显示
  if (thinkingDisplayStyle === 'hidden') {
    return null;
  }

  // 根据显示样式选择不同的渲染方式
  const renderCompactStyle = () => (
    <StyledPaper
      onClick={toggleExpanded}
      elevation={0}
      sx={{
        cursor: 'pointer',
        mb: 2,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: '8px',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        width: '100%', // 固定占满屏幕宽度
        maxWidth: '100%', // 确保不超出屏幕
        minWidth: 0, // 允许收缩
        '&:hover': {
          backgroundColor: theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.05)'
            : 'rgba(0, 0, 0, 0.02)',
        }
      }}
    >
      {/* 标题栏 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 1.5,
          borderBottom: expanded ? `1px solid ${theme.palette.divider}` : 'none'
        }}
      >
        <Lightbulb
          size={20}
          color={isThinking ? theme.palette.warning.main : theme.palette.text.secondary}
          style={{
            marginRight: theme.spacing(1),
            animation: isThinking ? 'pulse 1.5s infinite' : 'none'
          }}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, gap: 1 }}>
          <Typography variant="subtitle2" component="span">
            思考过程
          </Typography>
          <Chip
            label={isThinking ? `思考中... ${formattedThinkingTime}s` : `思考完成 ${formattedThinkingTime}s`}
            size="small"
            color={isThinking ? "warning" : "default"}
            variant="outlined"
            sx={{ height: 20 }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            size="small"
            onClick={handleCopy}
            sx={{ mr: 1 }}
            color={copied ? "success" : "default"}
          >
            <Copy size={16} />
          </IconButton>

          <ChevronDown
            size={20}
            style={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }}
          />
        </Box>
      </Box>

      {/* 内容区域 */}
      <Collapse in={expanded}>
        <Box sx={{
          p: 2,
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          ...getThinkingScrollbarStyles(theme)
        }}>
          <Markdown content={memoizedContent} allowHtml={false} />
        </Box>
      </Collapse>
    </StyledPaper>
  );

  // 完整显示样式
  const renderFullStyle = () => (
    <StyledPaper
      elevation={0}
      sx={{
        mb: 2,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: '8px',
        overflow: 'hidden',
        width: '100%', // 固定占满屏幕宽度
        maxWidth: '100%', // 确保不超出屏幕
        minWidth: 0 // 允许收缩
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 1.5,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}
      >
        <Lightbulb
          size={20}
          color={isThinking ? theme.palette.warning.main : theme.palette.primary.main}
          style={{ marginRight: theme.spacing(1) }}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, gap: 1 }}>
          <Typography variant="subtitle2" component="span">
            {isThinking ? '正在深度思考...' : '深度思考过程'}
          </Typography>
          <Chip
            label={`${formattedThinkingTime}s`}
            size="small"
            color={isThinking ? "warning" : "primary"}
            sx={{ height: 20 }}
          />
        </Box>

        <IconButton
          size="small"
          onClick={handleCopy}
          color={copied ? "success" : "default"}
        >
          <Copy size={16} />
        </IconButton>
      </Box>

      <Box sx={{
        p: 2,
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        ...getThinkingScrollbarStyles(theme)
      }} key={`thinking-content-${updateCounter}`}>
        <Markdown content={memoizedContent} allowHtml={false} />
      </Box>
    </StyledPaper>
  );

  // 极简模式 - 只显示一个小图标
  const renderMinimalStyle = () => (
    <Box sx={{ position: 'relative', display: 'inline-block', mb: 1 }}>
      <Tooltip title={`思考过程 (${formattedThinkingTime}s)`} placement="top">
        <Box
          onClick={toggleExpanded}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            cursor: 'pointer',
            p: 0.5,
            borderRadius: '50%',
            backgroundColor: isThinking ? theme.palette.warning.light : theme.palette.grey[200],
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: isThinking ? theme.palette.warning.main : theme.palette.grey[300],
            }
          }}
        >
          <Lightbulb
            size={16}
            color={isThinking ? theme.palette.warning.contrastText : theme.palette.text.secondary}
            style={{
              animation: isThinking ? 'pulse 1.5s infinite' : 'none'
            }}
          />
        </Box>
      </Tooltip>
      {expanded && (
        <Box sx={{
          position: 'absolute',
          top: '100%',
          left: 0,
          mt: 1,
          zIndex: 999, // 降低z-index，确保不会超过输入框
          minWidth: 300,
          maxWidth: 500
        }}>
          <Paper
            elevation={4}
            sx={{
              borderRadius: '18px 18px 18px 4px',
              overflow: 'hidden',
              backgroundColor: theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.95)'
                : 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  思考过程 ({formattedThinkingTime}s)
                </Typography>
                <IconButton
                  size="small"
                  onClick={handleCopy}
                  color={copied ? "success" : "default"}
                >
                  <Copy size={16} />
                </IconButton>
              </Box>
            </Box>
            <Box sx={{
              p: 2,
              ...getThinkingScrollbarStyles(theme)
            }}>
              <Markdown content={memoizedContent} allowHtml={false} />
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );

  // 气泡模式 - 类似聊天气泡
  const renderBubbleStyle = () => (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
      <Avatar
        sx={{
          width: 32,
          height: 32,
          mr: 1,
          backgroundColor: isThinking ? theme.palette.warning.main : theme.palette.primary.main
        }}
      >
        <Brain size={18} />
      </Avatar>
      <Box
        onClick={toggleExpanded}
        sx={{
          backgroundColor: theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.08)'
            : 'rgba(0, 0, 0, 0.04)',
          borderRadius: '18px 18px 18px 4px',
          p: 1.5,
          cursor: 'pointer',
          maxWidth: '80%',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.12)'
              : 'rgba(0, 0, 0, 0.08)',
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: expanded ? 1 : 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }} component="span">
              💭 {isThinking ? '思考中...' : '思考完成'}
            </Typography>
            <Chip
              label={`${formattedThinkingTime}s`}
              size="small"
              variant="outlined"
              sx={{ height: 18, fontSize: '0.7rem' }}
            />
          </Box>
          <IconButton
            size="small"
            onClick={handleCopy}
            sx={{ ml: 1, p: 0.5 }}
            color={copied ? "success" : "default"}
          >
            <Copy size={14} />
          </IconButton>
        </Box>
        <Collapse in={expanded}>
          <Box sx={{
            mt: 1,
            ...getThinkingScrollbarStyles(theme)
          }}>
            <Markdown content={memoizedContent} allowHtml={false} />
          </Box>
        </Collapse>
      </Box>
    </Box>
  );

  // 时间线模式 - 左侧有时间线指示器
  const renderTimelineStyle = () => (
    <Box sx={{ display: 'flex', mb: 2 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mr: 2 }}>
        <Box
          sx={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: isThinking ? theme.palette.warning.main : theme.palette.success.main,
            animation: isThinking ? 'pulse 1.5s infinite' : 'none',
            '@keyframes pulse': {
              '0%': { transform: 'scale(1)' },
              '50%': { transform: 'scale(1.2)' },
              '100%': { transform: 'scale(1)' }
            }
          }}
        />
        <Box
          sx={{
            width: 2,
            flex: 1,
            backgroundColor: theme.palette.divider,
            mt: 1
          }}
        />
      </Box>
      <Box sx={{ flex: 1 }}>
        <Box
          onClick={toggleExpanded}
          sx={{
            cursor: 'pointer',
            p: 1.5,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
            backgroundColor: theme.palette.background.paper,
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: theme.palette.primary.main,
              boxShadow: `0 0 0 1px ${theme.palette.primary.main}20`
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: expanded ? 1 : 0 }}>
            <BarChart size={20} color={theme.palette.text.secondary} style={{ marginRight: theme.spacing(1) }} />
            <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, gap: 1 }}>
              <Typography variant="subtitle2" component="span">
                {isThinking ? '正在思考...' : '思考过程'}
              </Typography>
              <Chip
                label={`${formattedThinkingTime}s`}
                size="small"
                color={isThinking ? "warning" : "default"}
              />
            </Box>
            <IconButton
              size="small"
              onClick={handleCopy}
              color={copied ? "success" : "default"}
            >
              <Copy size={16} />
            </IconButton>
            <ChevronDown
              size={20}
              style={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s'
              }}
            />
          </Box>
          <Collapse in={expanded}>
            <Box sx={{
              pl: 4,
              ...getThinkingScrollbarStyles(theme)
            }}>
              <Markdown content={memoizedContent} allowHtml={false} />
            </Box>
          </Collapse>
        </Box>
      </Box>
    </Box>
  );

  // 卡片模式 - 更突出的卡片设计
  const renderCardStyle = () => (
    <Box
      sx={{
        mb: 2,
        borderRadius: 3,
        background: `linear-gradient(135deg, ${theme.palette.primary.main}10, ${theme.palette.secondary.main}10)`,
        border: `2px solid ${theme.palette.primary.main}20`,
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 25px ${theme.palette.primary.main}20`,
          border: `2px solid ${theme.palette.primary.main}40`,
        }
      }}
    >
      <Box
        onClick={toggleExpanded}
        sx={{
          cursor: 'pointer',
          p: 2,
          background: `linear-gradient(90deg, ${theme.palette.primary.main}05, transparent)`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: expanded ? 1.5 : 0 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: isThinking ? theme.palette.warning.main : theme.palette.primary.main,
              mr: 2,
              animation: isThinking ? 'glow 2s infinite' : 'none',
              '@keyframes glow': {
                '0%': { boxShadow: `0 0 5px ${theme.palette.warning.main}` },
                '50%': { boxShadow: `0 0 20px ${theme.palette.warning.main}` },
                '100%': { boxShadow: `0 0 5px ${theme.palette.warning.main}` }
              }
            }}
          >
            <Sparkles size={20} color="white" />
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              {isThinking ? '🧠 AI 正在深度思考' : '✨ 思考过程完成'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              耗时 {formattedThinkingTime} 秒
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              size="small"
              onClick={handleCopy}
              color={copied ? "success" : "primary"}
              sx={{
                backgroundColor: theme.palette.background.paper,
                '&:hover': { backgroundColor: theme.palette.action.hover }
              }}
            >
              <Copy size={16} />
            </IconButton>
            <ChevronDown
              size={20}
              color={theme.palette.primary.main}
              style={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s'
              }}
            />
          </Box>
        </Box>
        <Collapse in={expanded}>
          <Box
            sx={{
              p: 2,
              backgroundColor: theme.palette.background.paper,
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
              ...getThinkingScrollbarStyles(theme)
            }}
          >
            <Markdown content={memoizedContent} allowHtml={false} />
          </Box>
        </Collapse>
      </Box>
    </Box>
  );

  // 内联模式 - 嵌入在消息中
  const renderInlineStyle = () => (
    <Box sx={{ position: 'relative', width: '100%', mb: 1 }}>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          backgroundColor: theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.05)'
            : 'rgba(0, 0, 0, 0.03)',
          borderRadius: 1,
          p: 0.5,
          border: `1px dashed ${theme.palette.divider}`,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.08)'
              : 'rgba(0, 0, 0, 0.06)',
          }
        }}
        onClick={toggleExpanded}
      >
        <Lightbulb
          size={14}
          color={isThinking ? theme.palette.warning.main : theme.palette.text.secondary}
          style={{
            marginRight: theme.spacing(0.5),
            animation: isThinking ? 'pulse 1.5s infinite' : 'none'
          }}
        />
        <Typography variant="caption" sx={{ mr: 0.5 }}>
          {isThinking ? '思考中' : '思考'}
        </Typography>
        <Chip
          label={`${formattedThinkingTime}s`}
          size="small"
          variant="outlined"
          sx={{ height: 16, fontSize: '0.6rem', mr: 0.5 }}
        />
        <IconButton
          size="small"
          onClick={handleCopy}
          sx={{ p: 0.25 }}
          color={copied ? "success" : "default"}
        >
          <Copy size={12} />
        </IconButton>
      </Box>
      {expanded && (
        <Box
          sx={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            right: 0, // 使气泡占满整个容器宽度
            mb: 0.5,
            zIndex: 1000,
            width: '100%' // 使用100%宽度，自适应父容器
          }}
        >
          <Paper
            elevation={6}
            sx={{
              borderRadius: '18px 18px 18px 4px',
              overflow: 'hidden',
              backgroundColor: theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.95)'
                : 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(10px)',
              width: '100%' // 确保Paper也占满宽度
            }}
          >
            <Box sx={{ p: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="caption" color="text.secondary">
                思考内容:
              </Typography>
            </Box>
            <Box sx={{
              p: 1.5,
              ...getCompactScrollbarStyles(theme)
            }}>
              <Markdown content={memoizedContent} allowHtml={false} />
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );

  // 流式文字显示模式 - 逐字显示思考内容
  const renderStreamStyle = () => {
    // 流式文字效果
    useEffect(() => {
      if (isThinking && content) {
        let index = 0;
        const timer = setInterval(() => {
          if (index < content.length) {
            setStreamText(content.slice(0, index + 1));
            index++;
          } else {
            clearInterval(timer);
          }
        }, 50); // 每50ms显示一个字符

        return () => clearInterval(timer);
      } else {
        setStreamText(content);
      }
    }, [content, isThinking]);

    return (
      <Box sx={{ mb: 2, position: 'relative' }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          mb: 1,
          p: 1,
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          borderRadius: 1,
          border: `1px solid ${theme.palette.divider}`
        }}>
          <Lightbulb size={16} color={theme.palette.primary.main} style={{ marginRight: 8 }} />
          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
            {isThinking ? '正在思考...' : '思考完成'} ({formattedThinkingTime}s)
          </Typography>
          <Box sx={{ ml: 'auto' }}>
            <IconButton size="small" onClick={handleCopy} color={copied ? "success" : "default"}>
              <Copy size={14} />
            </IconButton>
          </Box>
        </Box>
        <Box sx={{
          fontFamily: 'monospace',
          fontSize: '0.9rem',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          p: 2,
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
          minHeight: 60,
          position: 'relative',
          '&::after': isThinking ? {
            content: '"▋"',
            animation: 'blink 1s infinite',
            '@keyframes blink': {
              '0%, 50%': { opacity: 1 },
              '51%, 100%': { opacity: 0 }
            }
          } : {}
        }}>
          {streamText || (isThinking ? '思考中...' : content)}
        </Box>
      </Box>
    );
  };

  // 思考点动画模式 - 类似聊天应用的"正在输入"
  const renderDotsStyle = () => (
    <Box sx={{ mb: 2, position: 'relative' }}>
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1.5,
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        borderRadius: '20px',
        minWidth: isThinking ? 120 : 'auto',
        transition: 'all 0.3s ease'
      }}>
        <Brain size={18} color={theme.palette.primary.main} />
        {isThinking ? (
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <Typography variant="body2" sx={{ mr: 1 }}>AI正在思考</Typography>
            {[0, 1, 2].map((i) => (
              <Box
                key={i}
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: theme.palette.primary.main,
                  animation: `bounce 1.4s infinite ease-in-out`,
                  animationDelay: `${i * 0.16}s`,
                  '@keyframes bounce': {
                    '0%, 80%, 100%': { transform: 'scale(0)' },
                    '40%': { transform: 'scale(1)' }
                  }
                }}
              />
            ))}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2">思考完成</Typography>
            <Chip label={`${formattedThinkingTime}s`} size="small" />
            <IconButton size="small" onClick={toggleExpanded}>
              <ChevronDown
                size={16}
                style={{
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}
              />
            </IconButton>
            <IconButton size="small" onClick={handleCopy} color={copied ? "success" : "default"}>
              <Copy size={14} />
            </IconButton>
          </Box>
        )}
      </Box>

      {/* 展开的思考内容 */}
      {!isThinking && expanded && (
        <Box sx={{
          mt: 1,
          p: 2,
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          boxShadow: theme.shadows[4]
        }}>
          <Markdown content={memoizedContent} allowHtml={false} />
        </Box>
      )}
    </Box>
  );

  // 波浪形思维流动可视化
  const renderWaveStyle = () => (
    <Box sx={{ mb: 2, position: 'relative' }}>
      <Box sx={{
        height: 60,
        background: `linear-gradient(90deg, ${theme.palette.primary.main}20, ${theme.palette.secondary.main}20)`,
        borderRadius: 2,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        px: 2
      }}>
        {/* 波浪动画背景 */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: isThinking ?
            `repeating-linear-gradient(90deg, transparent, transparent 10px, ${theme.palette.primary.main}10 10px, ${theme.palette.primary.main}10 20px)` :
            'none',
          animation: isThinking ? 'wave 2s linear infinite' : 'none',
          '@keyframes wave': {
            '0%': { transform: 'translateX(-20px)' },
            '100%': { transform: 'translateX(20px)' }
          }
        }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, zIndex: 1 }}>
          <Sparkles size={20} color={theme.palette.primary.main} />
          <Typography variant="body2">
            {isThinking ? '思维波动中...' : '思考完成'} ({formattedThinkingTime}s)
          </Typography>
          <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
            <IconButton size="small" onClick={toggleExpanded}>
              <ChevronDown
                size={16}
                style={{
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}
              />
            </IconButton>
            <IconButton size="small" onClick={handleCopy} color={copied ? "success" : "default"}>
              <Copy size={16} />
            </IconButton>
          </Box>
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{
          mt: 1,
          p: 2,
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2
        }}>
          <Markdown content={memoizedContent} allowHtml={false} />
        </Box>
      </Collapse>
    </Box>
  );

  // 侧边栏滑出式显示
  const renderSidebarStyle = () => (
    <Box sx={{ mb: 2 }}>
      <Box
        onClick={() => setSidebarOpen(!sidebarOpen)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 1,
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          borderRadius: 1,
          cursor: 'pointer',
          border: `1px solid ${theme.palette.divider}`,
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          }
        }}
      >
        <Brain size={18} color={theme.palette.primary.main} style={{ marginRight: 8 }} />
        <Typography variant="body2">
          {isThinking ? '正在思考...' : '查看思考过程'} ({formattedThinkingTime}s)
        </Typography>
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" onClick={handleCopy} color={copied ? "success" : "default"}>
            <Copy size={14} />
          </IconButton>
          <ChevronDown
            size={16}
            style={{
              transform: sidebarOpen ? 'rotate(-90deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s'
            }}
          />
        </Box>
      </Box>

      {/* 侧边栏内容 */}
      <Box sx={{
        position: 'fixed',
        top: 0,
        right: sidebarOpen ? 0 : '-400px',
        width: 400,
        height: '100vh',
        backgroundColor: theme.palette.background.paper,
        boxShadow: theme.shadows[8],
        zIndex: 1300,
        transition: 'right 0.3s ease',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Box sx={{
          p: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Typography variant="h6">AI思考过程</Typography>
          <IconButton onClick={() => setSidebarOpen(false)}>
            <ChevronDown size={20} style={{ transform: 'rotate(90deg)' }} />
          </IconButton>
        </Box>
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          <Markdown content={memoizedContent} allowHtml={false} />
        </Box>
      </Box>

      {/* 遮罩层 */}
      {sidebarOpen && (
        <Box
          onClick={() => setSidebarOpen(false)}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 1299
          }}
        />
      )}
    </Box>
  );

  // 全屏半透明覆盖层
  const renderOverlayStyle = () => (
    <Box sx={{ mb: 2 }}>
      <Box
        onClick={() => setOverlayOpen(!overlayOpen)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 1.5,
          backgroundColor: theme.palette.primary.main + '10',
          borderRadius: 2,
          cursor: 'pointer',
          border: `2px dashed ${theme.palette.primary.main}40`,
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: theme.palette.primary.main + '20',
            border: `2px dashed ${theme.palette.primary.main}60`,
          }
        }}
      >
        <Lightbulb size={20} color={theme.palette.primary.main} style={{ marginRight: 12 }} />
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {isThinking ? '🧠 AI正在深度思考...' : '💡 点击查看完整思考过程'} ({formattedThinkingTime}s)
        </Typography>
        <Box sx={{ ml: 'auto' }}>
          <IconButton size="small" onClick={handleCopy} color={copied ? "success" : "default"}>
            <Copy size={16} />
          </IconButton>
        </Box>
      </Box>

      {/* 全屏覆盖层 */}
      {overlayOpen && (
        <Box sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(10px)',
          zIndex: 1400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4
        }}>
          <Box sx={{
            maxWidth: '80%',
            maxHeight: '80%',
            backgroundColor: theme.palette.background.paper,
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: theme.shadows[24]
          }}>
            <Box sx={{
              p: 3,
              borderBottom: `1px solid ${theme.palette.divider}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                🧠 AI思考过程详情
              </Typography>
              <IconButton onClick={() => setOverlayOpen(false)} size="large">
                <ChevronDown size={24} style={{ transform: 'rotate(45deg)' }} />
              </IconButton>
            </Box>
            <Box sx={{ p: 3, overflow: 'auto', maxHeight: 'calc(80vh - 120px)' }}>
              <Markdown content={memoizedContent} allowHtml={false} />
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );

  // 面包屑式步骤展示
  const renderBreadcrumbStyle = () => {
    const steps = content.split('\n').filter(line => line.trim()).slice(0, 5); // 取前5行作为步骤

    return (
      <Box sx={{ mb: 2 }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          mb: 2,
          p: 1,
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          borderRadius: 1
        }}>
          <BarChart size={16} color={theme.palette.primary.main} style={{ marginRight: 8 }} />
          <Typography variant="caption">
            思考步骤 ({formattedThinkingTime}s)
          </Typography>
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
            {!isThinking && (
              <IconButton size="small" onClick={toggleExpanded}>
                <ChevronDown
                  size={14}
                  style={{
                    transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }}
                />
              </IconButton>
            )}
            <IconButton size="small" onClick={handleCopy} color={copied ? "success" : "default"}>
              <Copy size={14} />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          {steps.map((step, index) => (
            <React.Fragment key={index}>
              <Chip
                label={`${index + 1}. ${step.slice(0, 30)}${step.length > 30 ? '...' : ''}`}
                size="small"
                variant={index === steps.length - 1 && isThinking ? "filled" : "outlined"}
                color={index === steps.length - 1 && isThinking ? "primary" : "default"}
                sx={{
                  maxWidth: 200,
                  animation: index === steps.length - 1 && isThinking ? 'pulse 2s infinite' : 'none'
                }}
              />
              {index < steps.length - 1 && (
                <ChevronDown size={16} style={{ transform: 'rotate(-90deg)', color: theme.palette.text.secondary }} />
              )}
            </React.Fragment>
          ))}
          {isThinking && (
            <>
              <ChevronDown size={16} style={{ transform: 'rotate(-90deg)', color: theme.palette.text.secondary }} />
              <Box sx={{
                display: 'flex',
                gap: 0.5,
                alignItems: 'center',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                backgroundColor: theme.palette.primary.main + '20'
              }}>
                {[0, 1, 2].map((i) => (
                  <Box
                    key={i}
                    sx={{
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      backgroundColor: theme.palette.primary.main,
                      animation: `bounce 1.4s infinite ease-in-out`,
                      animationDelay: `${i * 0.16}s`
                    }}
                  />
                ))}
              </Box>
            </>
          )}
        </Box>

        {expanded && (
          <Box sx={{
            mt: 2,
            p: 2,
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2
          }}>
            <Markdown content={memoizedContent} allowHtml={false} />
          </Box>
        )}
      </Box>
    );
  };

  // 悬浮气泡跟随鼠标
  const renderFloatingStyle = () => {
    return (
      <Box sx={{ mb: 2, position: 'relative' }}>
        <Box
          onClick={toggleExpanded}
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: 1,
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            borderRadius: '20px',
            cursor: 'pointer',
            border: `1px solid ${theme.palette.primary.main}40`,
            position: 'relative',
            overflow: 'hidden',
            '&:hover': {
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }
          }}
        >
          <Sparkles size={18} color={theme.palette.primary.main} style={{ marginRight: 8 }} />
          <Typography variant="body2">
            {isThinking ? '💫 思维粒子活跃中...' : '✨ 悬浮查看思考过程'} ({formattedThinkingTime}s)
          </Typography>
          <Box sx={{ ml: 'auto' }}>
            <IconButton size="small" onClick={handleCopy} color={copied ? "success" : "default"}>
              <Copy size={14} />
            </IconButton>
          </Box>

          {/* 悬浮粒子效果 */}
          {isThinking && (
            <Box sx={{
              position: 'absolute',
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: theme.palette.primary.main,
              left: `${Math.random() * 100}%`,
              animation: 'float 3s infinite ease-in-out',
              '@keyframes float': {
                '0%': { transform: 'translateY(0px) scale(0)', opacity: 0 },
                '50%': { transform: 'translateY(-20px) scale(1)', opacity: 1 },
                '100%': { transform: 'translateY(-40px) scale(0)', opacity: 0 }
              }
            }} />
          )}
        </Box>

        {expanded && (
          <Box sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            mt: 1,
            maxWidth: 500,
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
            boxShadow: theme.shadows[8],
            zIndex: 1200,
            p: 2
          }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              💫 思考内容详情
            </Typography>
            <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
              <Markdown content={memoizedContent} allowHtml={false} />
            </Box>
          </Box>
        )}
      </Box>
    );
  };

  // 终端命令行式逐行显示
  const renderTerminalStyle = () => {
    const lines = content.split('\n').filter(line => line.trim());

    return (
      <Box sx={{ mb: 2 }}>
        <Box sx={{
          backgroundColor: '#1a1a1a',
          color: '#00ff00',
          fontFamily: 'Monaco, "Cascadia Code", "Fira Code", monospace',
          fontSize: '0.85rem',
          borderRadius: 1,
          overflow: 'hidden',
          border: '1px solid #333'
        }}>
          {/* 终端标题栏 */}
          <Box sx={{
            backgroundColor: '#333',
            color: '#fff',
            p: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ff5f56' }} />
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ffbd2e' }} />
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#27ca3f' }} />
            </Box>
            <Typography variant="caption" sx={{ color: '#ccc', ml: 1 }}>
              AI-思考进程 - {isThinking ? '运行中' : '已完成'} ({formattedThinkingTime}s)
            </Typography>
            <Box sx={{ ml: 'auto' }}>
              <IconButton size="small" onClick={handleCopy} sx={{ color: '#ccc' }}>
                <Copy size={14} />
              </IconButton>
            </Box>
          </Box>

          {/* 终端内容 */}
          <Box sx={{ p: 2, minHeight: 120 }}>
            <Typography component="div" sx={{ mb: 1, color: '#00ff00' }}>
              $ ai-think --process --verbose
            </Typography>

            {isThinking ? (
              <Box>
                <Typography component="div" sx={{ color: '#ffff00', mb: 1 }}>
                  [INFO] 初始化思考模块...
                </Typography>
                <Typography component="div" sx={{ color: '#00ffff', mb: 1 }}>
                  [PROC] 正在分析问题空间...
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography component="span" sx={{ color: '#ff9500' }}>
                    [EXEC] 思考中
                  </Typography>
                  {[0, 1, 2].map((i) => (
                    <Box
                      key={i}
                      component="span"
                      sx={{
                        color: '#00ff00',
                        animation: `blink 1s infinite`,
                        animationDelay: `${i * 0.3}s`,
                        '@keyframes blink': {
                          '0%, 50%': { opacity: 1 },
                          '51%, 100%': { opacity: 0 }
                        }
                      }}
                    >
                      .
                    </Box>
                  ))}
                </Box>
              </Box>
            ) : (
              <Box>
                {lines.slice(0, 3).map((line, index) => (
                  <Typography key={index} component="div" sx={{ color: '#ccc', mb: 0.5 }}>
                    [OUT] {line.slice(0, 60)}...
                  </Typography>
                ))}
                <Typography component="div" sx={{ color: '#00ff00', mt: 1 }}>
                  [DONE] 思考完成 - 退出代码: 0
                </Typography>
                <Typography component="div" sx={{ color: '#00ff00' }}>
                  $ █
                </Typography>
              </Box>
            )}

            {expanded && !isThinking && (
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #333' }}>
                <Typography component="div" sx={{ color: '#ffff00', mb: 1 }}>
                  $ cat thinking_output.log
                </Typography>
                <Box sx={{ color: '#ccc', whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>
                  {content}
                </Box>
              </Box>
            )}
          </Box>
        </Box>

        {!isThinking && (
          <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
            <IconButton size="small" onClick={toggleExpanded}>
              <ChevronDown
                size={16}
                style={{
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}
              />
            </IconButton>
          </Box>
        )}
      </Box>
    );
  };

  // 根据样式选择渲染方法
  switch (thinkingDisplayStyle) {
    case 'stream':
      return renderStreamStyle();
    case 'dots':
      return renderDotsStyle();
    case 'wave':
      return renderWaveStyle();
    case 'sidebar':
      return renderSidebarStyle();
    case 'overlay':
      return renderOverlayStyle();
    case 'breadcrumb':
      return renderBreadcrumbStyle();
    case 'floating':
      return renderFloatingStyle();
    case 'terminal':
      return renderTerminalStyle();
    case 'full':
      return renderFullStyle();
    case 'minimal':
      return renderMinimalStyle();
    case 'bubble':
      return renderBubbleStyle();
    case 'timeline':
      return renderTimelineStyle();
    case 'card':
      return renderCardStyle();
    case 'inline':
      return renderInlineStyle();
    case 'compact':
    default:
      return renderCompactStyle();
  }
};

// 样式化组件
const StyledPaper = styled(Paper)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  boxShadow: 'none',
  transition: theme.transitions.create(['background-color', 'box-shadow']),
  // 性能优化：固定布局属性，避免重排
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  // 启用硬件加速
  transform: 'translateZ(0)',
  willChange: 'background-color, box-shadow'
}));

export default React.memo(ThinkingBlock);
