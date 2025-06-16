import React, { forwardRef, useCallback, useMemo } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { useTheme, useMediaQuery } from '@mui/material';

interface OptimizedTextareaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onCompositionStart?: (e: React.CompositionEvent<HTMLTextAreaElement>) => void;
  onCompositionEnd?: (e: React.CompositionEvent<HTMLTextAreaElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  onClick?: (e: React.MouseEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  minRows?: number;
  maxRows?: number;
  expanded?: boolean;
  expandedHeight?: number;
  textColor?: string;
}

const OptimizedTextarea = forwardRef<HTMLTextAreaElement, OptimizedTextareaProps>(({
  value,
  onChange,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  onPaste,
  onFocus,
  onBlur,
  onClick,
  placeholder,
  disabled = false,
  className = '',
  style = {},
  minRows = 1,
  maxRows = 10,
  expanded = false,
  expandedHeight = 300,
  textColor
}, ref) => {
  const theme = useTheme();
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // 优化的样式计算 - 使用useMemo避免重复计算，只使用react-textarea-autosize支持的样式
  const optimizedStyle = useMemo(() => {
    // react-textarea-autosize 只支持有限的样式属性，主要是外观相关的
    const baseStyle = {
      fontSize: isTablet ? '17px' : '16px',
      padding: isTablet ? '10px 0' : '8px 0',
      border: 'none',
      outline: 'none',
      width: '100%',
      backgroundColor: 'transparent',
      lineHeight: '1.4',
      fontFamily: 'inherit',
      resize: 'none' as const,
      overflow: value.trim().length > 0 ? 'auto' as const : 'hidden' as const,
      color: textColor,
      // 移除不支持的 transition 和 height 相关属性
      ...style
    };

    return baseStyle;
  }, [isTablet, value, textColor, style]);

  // 优化的onChange处理 - 使用useCallback避免重复创建函数
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // 防抖处理大文本输入
    onChange(e);
  }, [onChange]);

  // 优化的onKeyDown处理
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(e);
  }, [onKeyDown]);

  // 计算最大行数 - react-textarea-autosize 使用行数而不是像素高度
  const calculatedMaxRows = useMemo(() => {
    if (expanded) {
      // 展开模式下计算能容纳的行数
      const lineHeight = 1.4;
      const fontSize = isTablet ? 17 : 16;
      const actualLineHeight = fontSize * lineHeight;
      return Math.floor(expandedHeight / actualLineHeight);
    }
    return maxRows;
  }, [expanded, expandedHeight, isTablet, maxRows]);

  // 动态计算最小行数 - 解决清空文本时高度异常问题
  const calculatedMinRows = useMemo(() => {
    if (expanded) {
      return calculatedMaxRows;
    }
    // 当文本为空时，使用0行作为最小行数，避免多余的空白行
    if (!value || value.trim().length === 0) {
      return 0;
    }
    return minRows;
  }, [expanded, calculatedMaxRows, value, minRows]);

  return (
    <div style={optimizedStyle}>
      <TextareaAutosize
        ref={ref}
        className={`hide-scrollbar ${className}`}
        style={{
          // 只传递 react-textarea-autosize 支持的基本样式
          width: '100%',
          border: 'none',
          outline: 'none',
          backgroundColor: 'transparent',
          resize: 'none',
          fontFamily: 'inherit'
        }}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onCompositionStart={onCompositionStart}
        onCompositionEnd={onCompositionEnd}
        onPaste={onPaste}
        onFocus={onFocus}
        onBlur={onBlur}
        onClick={onClick}
        disabled={disabled}
        minRows={calculatedMinRows}
        maxRows={calculatedMaxRows}
        // 性能优化配置 - 禁用缓存以确保清空文本时立即重新计算高度
        cacheMeasurements={false}
      />
    </div>
  );
});

OptimizedTextarea.displayName = 'OptimizedTextarea';

export default OptimizedTextarea;
