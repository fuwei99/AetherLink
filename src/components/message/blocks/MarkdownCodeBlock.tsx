import React, { memo, useMemo } from 'react';
import { useTheme } from '@mui/material';
import { useAppSelector } from '../../../shared/store';
import CodeBlock from './CodeBlock';
import EnhancedCodeBlock from './EnhancedCodeBlock';
import type { CodeMessageBlock } from '../../../shared/types/newMessage';

interface MarkdownCodeBlockProps {
  children: string;
  className?: string;
  id?: string;
  onSave?: (id: string, newContent: string) => void;
  [key: string]: any;
}

/**
 * Markdown 中的代码块组件
 * 将 Markdown 的 props 适配到我们的 CodeBlock 组件
 */
const MarkdownCodeBlock: React.FC<MarkdownCodeBlockProps> = ({
  children,
  className,
  id
}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // 从 Redux store 获取代码块设置
  const { codeEditor, codeShowLineNumbers, codeCollapsible, codeWrappable } = useAppSelector(state => state.settings);

  // 判断是否使用增强版代码块（当启用了任何高级功能时）
  const useEnhancedCodeBlock = codeEditor || codeShowLineNumbers || codeCollapsible || codeWrappable;

  // 解析语言
  const match = /language-([\w-+]+)/.exec(className || '');
  const language = match?.[1] ?? 'text';
  const isCodeBlock = !!match || children?.includes('\n');

  // 注意：数学公式由 Markdown 层面的插件处理
  // CodeBlock 专注于代码渲染

  // 如果不是代码块，返回行内代码
  if (!isCodeBlock) {
    return (
      <code 
        className={className} 
        style={{ 
          textWrap: 'wrap',
          fontFamily: 'monospace',
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          padding: '2px 4px',
          borderRadius: '4px'
        }}
      >
        {children}
      </code>
    );
  }

  // 移除数学公式特殊处理，统一由 Markdown 层面处理

  // 创建适配的代码块对象 - 使用 useMemo 来稳定对象引用
  const codeBlock: CodeMessageBlock = useMemo(() => ({
    id: id || `code-${children.slice(0, 50).replace(/\W/g, '')}-${language}`,
    messageId: 'markdown',
    type: 'code' as const,
    content: children,
    language: language,
    createdAt: new Date().toISOString(),
    status: 'success' as const
  }), [id, children, language]);

  // 根据设置选择使用哪个代码块组件
  if (useEnhancedCodeBlock) {
    return <EnhancedCodeBlock block={codeBlock} />;
  } else {
    return <CodeBlock block={codeBlock} />;
  }
};

export default memo(MarkdownCodeBlock);
