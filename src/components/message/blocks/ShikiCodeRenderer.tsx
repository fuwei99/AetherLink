import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { Box, IconButton, Tooltip, Snackbar, useTheme, Chip, ToggleButton, ToggleButtonGroup } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import WebIcon from '@mui/icons-material/Web';
import CodeIcon from '@mui/icons-material/Code';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CodeMirrorEditor from '../../CodeEditor/CodeMirrorEditor';
import HtmlPreview from './HtmlPreview';
import MermaidPreview from './MermaidPreview';
import SvgPreview from './SvgPreview';
import PlantUmlPreview from './PlantUmlPreview';

type ViewMode = 'source' | 'preview' | 'split';

interface Props {
  code: string;
  language: string;
  onSave?: (newContent: string) => void;
  codeBlockId?: string | null;
}

/**
 * Shiki 代码渲染组件
 * 使用 Shiki 替代 react-syntax-highlighter，提供更好的性能和更准确的语法高亮
 * 优化了流式输出时的渲染性能，减少闪烁和抖动
 */
const ShikiCodeRenderer: React.FC<Props> = ({ code, language, onSave, codeBlockId }) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('source');
  const [editedCode, setEditedCode] = useState(code);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [codeSettings, setCodeSettings] = useState({
    showLineNumbers: true,
    wordWrap: true,
    copyEnabled: true,
    editorEnabled: false
  });

  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // 判断代码类型
  const codeType = useMemo(() => {
    const lang = language.toLowerCase();
    if (lang === 'html') return 'html';
    if (lang === 'mermaid') return 'mermaid';
    if (lang === 'svg') return 'svg';
    if (lang === 'plantuml' || lang === 'puml') return 'plantuml';
    return 'code';
  }, [language]);

  const isHtmlCode = codeType === 'html';
  const isSpecialChart = ['mermaid', 'svg', 'plantuml'].includes(codeType);

  // 当原始代码变化时，更新编辑内容
  useEffect(() => {
    setEditedCode(code);
  }, [code]);

  // 当原始代码变化时，更新编辑内容
  useEffect(() => {
    setEditedCode(code);
  }, [code]);

  // 加载代码块设置
  useEffect(() => {
    const loadSettings = () => {
      try {
        const appSettingsJSON = localStorage.getItem('appSettings');
        if (appSettingsJSON) {
          const appSettings = JSON.parse(appSettingsJSON);
          const newSettings = {
            showLineNumbers: appSettings.codeShowLineNumbers ?? true,
            wordWrap: appSettings.codeWordWrap ?? true,
            copyEnabled: appSettings.codeCopyEnabled ?? true,
            editorEnabled: appSettings.codeEditorEnabled ?? false
          };
          setCodeSettings(newSettings);
        }
      } catch (error) {
        console.error('加载代码块设置失败:', error);
      }
    };

    loadSettings();
  }, []);

  // 复制代码
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(editedCode)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(err => {
        console.error('复制失败:', err);
      });
  }, [editedCode]);

  // 处理代码编辑
  const handleCodeChange = useCallback((newValue: string) => {
    setEditedCode(newValue);
    if (onSave) {
      onSave(newValue);
    }
  }, [onSave]);

  // 切换折叠状态
  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);



  // 可以在开发模式下显示代码块ID，方便调试
  const showDebugInfo = false;

  return (
    <Box
      sx={{
        marginY: 1,  // 减少上下外边距从 2 到 1 (8px)
        borderRadius: 2,
        border: isDarkMode ? '1px solid #404040' : '1px solid #d0d0d0',
        backgroundColor: isDarkMode ? '#1e1e1e' : '#f8f8f8',
        overflow: 'hidden'
      }}
    >
      {/* 代码块头部 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          backgroundColor: isDarkMode ? '#2d2d2d' : '#e8e8e8',
          borderBottom: isDarkMode ? '1px solid #404040' : '1px solid #d0d0d0'
        }}
      >
        {/* 语言标签 */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip
            label={`${language.toUpperCase()}${isSpecialChart ? ' • 图表' : ' • Shiki'}`}
            size="small"
            sx={{
              backgroundColor: isDarkMode ? '#404040' : '#ffffff',
              color: isDarkMode ? '#ffffff' : '#333333',
              fontWeight: 'bold',
              fontSize: '12px'
            }}
          />

          {/* 开发模式下显示代码块ID */}
          {showDebugInfo && codeBlockId && (
            <Chip
              label={`ID: ${codeBlockId}`}
              size="small"
              sx={{
                backgroundColor: isDarkMode ? '#555555' : '#eeeeee',
                color: isDarkMode ? '#cccccc' : '#666666',
                fontSize: '10px'
              }}
            />
          )}
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
                  backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)'
                }
              }}
            >
              {isCollapsed ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          {/* 预览切换按钮 - 支持特殊图表 */}
          {(isHtmlCode || isSpecialChart) && (
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, newMode) => newMode && setViewMode(newMode)}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  color: isDarkMode ? '#ffffff' : '#666666',
                  border: isDarkMode ? '1px solid #555' : '1px solid #ccc',
                  '&.Mui-selected': {
                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                    color: isDarkMode ? '#ffffff' : '#333333',
                  },
                  '&:hover': {
                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
                  }
                }
              }}
            >
              <ToggleButton value="source" aria-label="源代码视图">
                <Tooltip title="源代码视图">
                  <CodeIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="preview" aria-label="预览视图">
                <Tooltip title={
                  codeType === 'html' ? 'HTML 预览' :
                  codeType === 'mermaid' ? 'Mermaid 图表' :
                  codeType === 'svg' ? 'SVG 预览' :
                  codeType === 'plantuml' ? 'PlantUML 图表' :
                  '预览'
                }>
                  <WebIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
          )}

          {/* 编辑/预览切换按钮 */}
          {codeSettings.editorEnabled && (
            <Tooltip title={isEditing ? "切换到预览模式" : "切换到编辑模式"}>
              <IconButton
                size="small"
                onClick={() => setIsEditing(!isEditing)}
                sx={{
                  color: isDarkMode ? '#ffffff' : '#666666',
                  backgroundColor: isEditing ? (isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)') : 'transparent',
                  '&:hover': {
                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)'
                  }
                }}
              >
                {isEditing ? <VisibilityIcon fontSize="small" /> : <EditIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          )}

          {/* 复制按钮 */}
          {codeSettings.copyEnabled && (
            <Tooltip title="复制代码">
              <IconButton
                size="small"
                onClick={handleCopy}
                sx={{
                  color: isDarkMode ? '#ffffff' : '#666666',
                  '&:hover': {
                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)'
                  }
                }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* 代码内容区域 */}
        {isCollapsed ? (
          // 折叠状态：显示简化信息
          <Box
            sx={{
              padding: '16px',
              backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f5f5',
              border: isDarkMode ? '1px solid #333' : '1px solid #e0e0e0',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
            onClick={toggleCollapse}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CodeIcon fontSize="small" sx={{ color: isDarkMode ? '#888' : '#666' }} />
              <span style={{
                color: isDarkMode ? '#ccc' : '#666',
                fontSize: '14px'
              }}>
                {language.toUpperCase()} 代码 ({editedCode.split('\n').length} 行) • Shiki 高亮
              </span>
            </Box>
            <ExpandMoreIcon fontSize="small" sx={{ color: isDarkMode ? '#888' : '#666' }} />
          </Box>
        ) : (
          // 展开状态：显示完整代码
          <>
            {viewMode === 'preview' && !isEditing ? (
              // 预览模式 - 支持多种图表类型
              <>
                {codeType === 'html' && <HtmlPreview html={editedCode} />}
                {codeType === 'mermaid' && <MermaidPreview>{editedCode}</MermaidPreview>}
                {codeType === 'svg' && <SvgPreview>{editedCode}</SvgPreview>}
                {codeType === 'plantuml' && <PlantUmlPreview>{editedCode}</PlantUmlPreview>}
              </>
            ) : (
              // Always use CodeMirrorEditor for code display
              <CodeMirrorEditor
                value={editedCode}
                onChange={handleCodeChange}
                language={language}
                readOnly={!isEditing}
                height="auto"
                showLineNumbers={codeSettings.showLineNumbers}
                wordWrap={codeSettings.wordWrap}
                copyEnabled={false}
              />
            )}
          </>
        )}

      <Snackbar
        open={copySuccess}
        autoHideDuration={2000}
        message="代码已复制到剪贴板"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default memo(ShikiCodeRenderer);
