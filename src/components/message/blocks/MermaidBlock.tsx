import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useTheme } from '@mui/material';
import { Box, Skeleton, Alert, IconButton, Tooltip, Snackbar, Chip } from '@mui/material';
import { Copy as ContentCopyIcon, ChevronDown as ExpandMoreIcon, ChevronUp as ExpandLessIcon, Code as CodeIcon } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useAppSelector } from '../../../shared/store';
import mermaid from 'mermaid';

interface MermaidBlockProps {
  code: string;
  id?: string;
  // 新增：消息角色
  messageRole?: 'user' | 'assistant' | 'system';
}

// 生成安全的 CSS ID
const generateSafeId = (baseId?: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  
  if (baseId) {
    // 清理 baseId，只保留字母、数字、连字符和下划线
    const cleanId = baseId.replace(/[^a-zA-Z0-9_-]/g, '-');
    return `mermaid-${cleanId}-${timestamp}-${random}`;
  }
  
  return `mermaid-${timestamp}-${random}`;
};

// 初始化 Mermaid 配置
const initializeMermaid = (isDarkMode: boolean) => {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    theme: isDarkMode ? 'dark' : 'default',
    themeVariables: {
      primaryColor: isDarkMode ? '#90caf9' : '#1976d2',
      primaryTextColor: isDarkMode ? '#ffffff' : '#000000',
      primaryBorderColor: isDarkMode ? '#424242' : '#e0e0e0',
      lineColor: isDarkMode ? '#616161' : '#757575',
      secondaryColor: isDarkMode ? '#424242' : '#f5f5f5',
      tertiaryColor: isDarkMode ? '#616161' : '#fafafa',
      // 添加字体大小控制
      fontSize: '12px'
    },
    flowchart: {
      useMaxWidth: false, // 禁用自动宽度
      htmlLabels: true,
      curve: 'basis'
    },
    sequence: {
      useMaxWidth: false, // 禁用自动宽度
      wrap: true
    },
    gantt: {
      useMaxWidth: false // 禁用自动宽度
    }
  });
};

const MermaidBlock: React.FC<MermaidBlockProps> = ({ code, id, messageRole }) => {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // 从 Redux store 获取 mermaid 设置
  const mermaidEnabled = useAppSelector(state => state.settings.mermaidEnabled);
  
  // 新逻辑：用户输入的Mermaid不渲染，只有AI回答才渲染
  const shouldRender = mermaidEnabled && messageRole === 'assistant';
  
  const isDarkMode = theme.palette.mode === 'dark';
  
  // 生成唯一且安全的ID
  const mermaidId = useRef(generateSafeId(id));

  // 复制代码功能
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(err => {
        console.error('复制失败:', err);
      });
  }, [code]);

  // 切换折叠状态
  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  useEffect(() => {
    let mounted = true;
    
    const renderDiagram = async () => {
      if (!containerRef.current || !code.trim()) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        // 重新初始化以应用主题变化
        initializeMermaid(isDarkMode);
        
        // 验证语法
        const isValid = await mermaid.parse(code);
        if (!isValid) {
          throw new Error('Invalid Mermaid syntax');
        }
        
        // 渲染图表
        const { svg } = await mermaid.render(mermaidId.current, code);
        
        if (mounted && containerRef.current) {
          containerRef.current.innerHTML = svg;
          
          // 设置固定宽度样式，类似代码块
          const svgElement = containerRef.current.querySelector('svg');
          // 在 useEffect 中的 SVG 样式设置部分
          if (svgElement) {
          // 设置更合适的宽度和居中显示
          svgElement.style.width = '100%';
          svgElement.style.maxWidth = '600px'; // 从 800px 调整为 600px
          svgElement.style.height = 'auto';
          svgElement.style.display = 'block';
          svgElement.style.margin = '0 auto';
          
            // 确保 viewBox 存在以支持缩放
            if (!svgElement.getAttribute('viewBox')) {
              const bbox = svgElement.getBBox();
              svgElement.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
            }
          }
        }
      } catch (err) {
        console.error('Mermaid render error:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to render diagram');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    if (mermaidEnabled) {
      renderDiagram();
    } else {
      setIsLoading(false);
    }
    
    return () => {
      mounted = false;
    };
  }, [code, isDarkMode, mermaidEnabled]);
  
  // 如果禁用了 mermaid，则渲染为普通代码块
  if (!shouldRender) {
    return (
      <Box
        sx={{
          marginY: 1,
          borderRadius: 2,
          border: isDarkMode ? '1px solid #3d4852' : '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: isDarkMode
            ? '0 1px 3px rgba(0, 0, 0, 0.3)'
            : '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* 代码块头部 */}
        <Box sx={{ /* ... */ }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip label="MERMAID"
              size="small"
              sx={{
                backgroundColor: isDarkMode ? '#475569' : '#e2e8f0',
                color: isDarkMode ? '#e2e8f0' : '#475569',
                fontWeight: 'bold',
                fontSize: '11px'
              }}
            />
            <Chip
              label={messageRole === 'user' ? "用户输入" : "已禁用"}
              size="small"
              sx={{
                backgroundColor: isDarkMode ? '#dc2626' : '#fef2f2',
                color: isDarkMode ? '#fca5a5' : '#dc2626',
                fontWeight: 'bold',
                fontSize: '11px'
              }}
            />
          </Box>

          {/* 工具栏 */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {/* 折叠/展开按钮 */}
            <Tooltip title={isCollapsed ? "展开代码块" : "折叠代码块"}>
              <IconButton
                size="small"
                onClick={toggleCollapse}
                sx={{
                  color: isDarkMode ? '#ffffff' : '#666666',
                  '&:hover': {
                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                  }
                }}
              >
                {isCollapsed ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
              </IconButton>
            </Tooltip>

            {/* 复制按钮 */}
            <Tooltip title="复制代码">
              <IconButton
                size="small"
                onClick={handleCopy}
                sx={{
                  color: isDarkMode ? '#ffffff' : '#666666',
                  '&:hover': {
                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                  }
                }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* 代码内容区域 */}
        {isCollapsed ? (
          // 折叠状态：显示简化信息
          <Box
            sx={{
              padding: '16px',
              color: isDarkMode ? '#94a3b8' : '#64748b',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(248, 250, 252, 0.5)'
              }
            }}
            onClick={toggleCollapse}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CodeIcon size={16} color={isDarkMode ? '#888' : '#666'} />
              <span style={{
                color: isDarkMode ? '#ccc' : '#666',
                fontSize: '14px'
              }}>
                Mermaid 代码 ({code.split('\n').length} 行) - 图表渲染已禁用
              </span>
            </Box>
            <ExpandMoreIcon size={16} color={isDarkMode ? '#888' : '#666'} />
          </Box>
        ) : (
          // 展开状态：显示完整代码（带语法高亮）
          <SyntaxHighlighter
            language="mermaid"
            style={isDarkMode ? vscDarkPlus : vs}
            customStyle={{
              margin: 0,
              padding: '1rem',
              fontSize: '14px',
              lineHeight: 1.5,
              border: 'none',
              borderRadius: 0,
              overflow: 'auto',
              maxHeight: '500px',
              minWidth: '100%'
            }}
            codeTagProps={{
              style: {
                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, source-code-pro, monospace',
                display: 'block'
              }
            }}
          >
            {code}
          </SyntaxHighlighter>
        )}

        <Snackbar
          open={copySuccess}
          autoHideDuration={2000}
          message="代码已复制到剪贴板"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 2, mx: 1 }}>
        Mermaid渲染错误: {error}
      </Alert>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '600px', // 从 800px 调整为 600px
        minHeight: isLoading ? '120px' : 'auto',
        overflow: 'visible',
        my: 1,
        mx: 'auto', // 居中显示
        p: 2,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        backgroundColor: 'background.paper',
        boxShadow: 0.5,
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        // 优化SVG样式
        '& svg': {
          maxWidth: '600px !important', // 从 800px 调整为 600px
          width: '100% !important',
          height: 'auto !important',
          display: 'block !important',
          margin: '0 auto !important'
        },
        // 移动端适配
        '@media (max-width: 600px)': {
          maxWidth: '100%',
          mx: 1,
          p: 1,
          '& svg': {
            maxWidth: '100% !important'
          }
        }
      }}
    >
      {isLoading && (
        <Box 
          sx={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100px',
            gap: 1.5
          }}
        >
          <Skeleton 
            variant="rectangular" 
            width="70%" 
            height={80} 
            sx={{ borderRadius: 1 }}
          />
          <Box sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
            正在渲染图表...
          </Box>
        </Box>
      )}
      <div 
        ref={containerRef} 
        style={{
          textAlign: 'center',
          lineHeight: 'normal',
          overflow: 'visible',
          width: '100%',
          minHeight: '50px'
        }}
      />
    </Box>
  );
};

export default MermaidBlock;