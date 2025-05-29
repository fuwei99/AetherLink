import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  CircularProgress,
  Tooltip,
  Slide
} from '@mui/material';
import {
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Send as SendIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  Add as AddIcon,
  VolumeUp as VolumeUpIcon
} from '@mui/icons-material';
import { useVoiceRecognition } from '../../shared/hooks/useVoiceRecognition';

interface EnhancedVoiceInputProps {
  isDarkMode?: boolean;
  onClose: () => void;
  onSendMessage: (text: string) => void;
  onInsertText: (text: string) => void;
}

const EnhancedVoiceInput: React.FC<EnhancedVoiceInputProps> = ({
  isDarkMode = false,
  onClose,
  onSendMessage,
  onInsertText
}) => {
  // 语音识别状态
  const {
    isListening,
    recognitionText,
    permissionStatus,
    startRecognition,
    stopRecognition,
    checkAndRequestPermissions
  } = useVoiceRecognition();

  // 组件状态
  const [mode, setMode] = useState<'initial' | 'recording' | 'preview'>('initial');
  const [editingText, setEditingText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);

  // 音频分析器相关引用
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // 处理识别文本更新
  useEffect(() => {
    if (recognitionText) {
      setEditingText(recognitionText);
    }
  }, [recognitionText]);
  
  // 处理录音状态变化
  useEffect(() => {
    if (isListening) {
      setMode('recording');
      setupAudioAnalyser();
    } else if (recognitionText && mode === 'recording') {
      setMode('preview');
      cleanupAudioAnalyser();
    }
    
    return () => {
      cleanupAudioAnalyser();
      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }
    };
  }, [isListening, recognitionText]);
  
  // 设置音频分析器
  const setupAudioAnalyser = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;
      
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateVolume = () => {
        if (!analyser || mode !== 'recording') return;
        
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        
        // 计算平均音量级别 (0-100)
        const average = sum / dataArray.length;
        const normalizedVolume = Math.min(100, Math.max(0, average * 2));
        setVolumeLevel(normalizedVolume);
        
        // 如果音量低于阈值，考虑为静音
        if (average < 5) { // 静音阈值
          if (!silenceTimer) {
            const timer = setTimeout(() => {
              // 静音超时，自动停止录音
              handleStopRecording();
            }, 3000); // 3秒静音自动停止
            setSilenceTimer(timer);
          }
        } else if (silenceTimer) {
          // 有声音了，清除静音定时器
          clearTimeout(silenceTimer);
          setSilenceTimer(null);
        }
        
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      
      updateVolume();
      
    } catch (error) {
      console.error('无法访问麦克风:', error);
      setErrorMessage('无法访问麦克风，请检查权限设置');
    }
  };
  
  // 清理音频分析器
  const cleanupAudioAnalyser = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    
    analyserRef.current = null;
    
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      setSilenceTimer(null);
    }
  };
  
  // 处理开始录音
  const handleStartRecording = async () => {
    setErrorMessage(null);
    try {
      // 先检查权限
      const hasPermission = await checkAndRequestPermissions();
      if (!hasPermission) {
        setErrorMessage('麦克风权限被拒绝');
        return;
      }
      
      await startRecognition({
        language: 'zh-CN',
        maxResults: 1,
        partialResults: true, 
        popup: false
      });
      
    } catch (error) {
      console.error('启动语音识别失败:', error);
      setErrorMessage('启动语音识别失败');
    }
  };
  
  // 处理停止录音
  const handleStopRecording = async () => {
    try {
      await stopRecognition();
    } catch (error) {
      console.error('停止语音识别失败:', error);
    }
  };
  
  // 处理文本编辑
  const handleTextEdit = () => {
    setIsEditing(true);
  };
  
  // 处理文本变化
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditingText(e.target.value);
  };
  
  // 处理编辑完成
  const handleEditComplete = () => {
    setIsEditing(false);
  };
  
  // 处理插入文本
  const handleInsertText = () => {
    if (editingText.trim()) {
      onInsertText(editingText.trim());
      handleClose();
    }
  };
  
  // 处理发送消息
  const handleSendMessage = () => {
    if (editingText.trim()) {
      onSendMessage(editingText.trim());
      handleClose();
      
      // 添加触觉反馈 (如果支持)
      if ('navigator' in window && 'vibrate' in navigator) {
        try {
          navigator.vibrate(50); // 短振动反馈
        } catch (e) {
          // 忽略振动API错误
        }
      }
    }
  };
  
  // 处理关闭
  const handleClose = () => {
    // 如果正在录音，先停止
    if (isListening) {
      stopRecognition().catch(console.error);
    }
    
    // 动画效果：先隐藏控制按钮，再关闭组件
    setShowControls(false);
    setTimeout(() => {
      onClose();
    }, 150);
  };
  
  // 麦克风根据音量展示波动效果
  const getMicAnimation = () => {
    const baseScale = 1;
    const scaleIncrement = volumeLevel / 100 * 0.5; // 最大增加0.5倍
    const scale = baseScale + scaleIncrement;
    
    return {
      transform: `scale(${scale})`,
      transition: 'transform 0.1s ease',
    };
  };
  
  // 渲染初始状态
  if (mode === 'initial') {
    return (
      <Slide direction="up" in={true}>
        <Paper
          elevation={3}
          sx={{
            p: 2.5,
            borderRadius: '16px',
            background: isDarkMode ? '#2A2A2A' : '#FFFFFF',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <IconButton
            size="small"
            onClick={handleClose}
            sx={{
              position: 'absolute',
              right: '8px',
              top: '8px',
              color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
          
          <Typography
            variant="h6"
            sx={{
              mb: 3,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              color: isDarkMode ? '#fff' : '#333',
            }}
          >
            <VolumeUpIcon sx={{ mr: 1, color: '#2196f3' }} />
            语音输入
          </Typography>
          
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<MicIcon />}
            onClick={handleStartRecording}
            sx={{
              borderRadius: '30px',
              py: 1.5,
              px: 4,
              mt: 1,
              mb: 3,
              backgroundColor: '#2196f3',
              boxShadow: '0 4px 12px rgba(33,150,243,0.3)',
              '&:hover': {
                backgroundColor: '#1976d2',
                boxShadow: '0 6px 16px rgba(33,150,243,0.4)',
              },
            }}
          >
            开始录音
          </Button>
          
          {permissionStatus === 'denied' && (
            <Typography
              variant="body2"
              color="error"
              sx={{ mt: 1, textAlign: 'center' }}
            >
              麦克风权限被拒绝，请在浏览器设置中允许访问麦克风。
            </Typography>
          )}
          
          {errorMessage && (
            <Typography
              variant="body2"
              color="error"
              sx={{ mt: 1, textAlign: 'center' }}
            >
              {errorMessage}
            </Typography>
          )}
        </Paper>
      </Slide>
    );
  }
  
  // 渲染录音状态
  if (mode === 'recording') {
    return (
      <Slide direction="up" in={true}>
        <Paper
          elevation={3}
          sx={{
            p: 2.5,
            borderRadius: '16px',
            background: isDarkMode ? 'rgba(42, 42, 42, 0.97)' : 'rgba(255, 255, 255, 0.97)',
            border: '2px solid #f44336',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* 录音状态指示 */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: 'rgba(244, 67, 54, 0.15)',
                position: 'relative',
                mb: 2,
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  border: '2px solid #f44336',
                  animation: 'ripple 1.5s infinite ease-out',
                  '@keyframes ripple': {
                    '0%': { transform: 'scale(0.8)', opacity: 1 },
                    '100%': { transform: 'scale(1.5)', opacity: 0 },
                  },
                }}
              />
              <MicIcon 
                color="error" 
                sx={{ 
                  fontSize: 32,
                  ...getMicAnimation()
                }} 
              />
            </Box>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                color: '#f44336', 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              正在录音
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  '&::after': {
                    content: '""',
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#f44336',
                    borderRadius: '50%',
                    animation: 'blink 1s infinite',
                    '@keyframes blink': {
                      '0%': { opacity: 1 },
                      '50%': { opacity: 0.3 },
                      '100%': { opacity: 1 },
                    },
                  },
                }}
              />
            </Typography>
          </Box>

          {/* 实时识别文本 */}
          {recognitionText && (
            <Paper
              elevation={1}
              sx={{
                p: 2,
                mb: 3,
                width: '100%',
                backgroundColor: isDarkMode ? 'rgba(60, 60, 60, 0.7)' : 'rgba(250, 250, 250, 0.9)',
                borderRadius: '12px',
                maxHeight: '120px',
                overflowY: 'auto',
                border: '1px solid',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              }}
            >
              <Typography
                variant="body1"
                sx={{
                  color: isDarkMode ? '#fff' : '#333',
                  wordBreak: 'break-word',
                  lineHeight: 1.6,
                  fontWeight: 400,
                }}
              >
                {recognitionText}
              </Typography>
            </Paper>
          )}

          {/* 操作按钮 */}
          <Slide direction="up" in={showControls}>
            <Box sx={{ display: 'flex', gap: 2, width: '100%', justifyContent: 'center' }}>
              <Button
                variant="contained"
                color="error"
                onClick={handleStopRecording}
                startIcon={<MicOffIcon />}
                sx={{
                  borderRadius: '24px',
                  px: 3,
                  py: 1,
                  boxShadow: '0 2px 8px rgba(244,67,54,0.3)',
                  '&:hover': {
                    backgroundColor: '#d32f2f',
                    boxShadow: '0 4px 12px rgba(244,67,54,0.5)',
                  },
                }}
              >
                停止录音
              </Button>
              
              <Button
                variant="outlined"
                color="inherit"
                onClick={handleClose}
                startIcon={<CloseIcon />}
                sx={{
                  borderRadius: '24px',
                  px: 3,
                  py: 1,
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                  color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
                }}
              >
                取消
              </Button>
            </Box>
          </Slide>

          {/* 静音提示 */}
          {silenceTimer && (
            <Typography
              variant="caption"
              sx={{
                color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                mt: 2,
                fontStyle: 'italic',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <CircularProgress size={12} color="inherit" />
              检测到静音，即将自动停止...
            </Typography>
          )}
        </Paper>
      </Slide>
    );
  }
  
  // 渲染预览状态
  return (
    <Slide direction="up" in={true}>
      <Paper
        elevation={3}
        sx={{
          p: 2.5,
          borderRadius: '16px',
          background: isDarkMode ? '#2A2A2A' : '#FFFFFF',
          width: '100%',
          position: 'relative',
        }}
      >
        {/* 标题 */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <VolumeUpIcon sx={{ mr: 1, color: isDarkMode ? '#90caf9' : '#2196f3', fontSize: 20 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              语音识别结果
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* 识别文本显示/编辑 */}
        <Box sx={{ mb: 3 }}>
          {isEditing ? (
            <textarea
              value={editingText}
              onChange={handleTextChange}
              onBlur={handleEditComplete}
              autoFocus
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: `1px solid ${isDarkMode ? '#555' : '#ddd'}`,
                backgroundColor: isDarkMode ? '#333' : '#fff',
                color: isDarkMode ? '#fff' : '#000',
                resize: 'none',
                minHeight: '100px',
                fontSize: '1rem',
                fontFamily: 'inherit',
                outline: 'none',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
              }}
            />
          ) : (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                backgroundColor: isDarkMode ? '#333' : '#f5f5f5',
                borderRadius: '8px',
                minHeight: '80px',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: isDarkMode ? '#3a3a3a' : '#f0f0f0',
                },
                borderColor: isDarkMode ? '#444' : '#e0e0e0',
              }}
              onClick={handleTextEdit}
            >
              <Typography
                variant="body1"
                sx={{
                  wordBreak: 'break-word',
                  fontSize: '1rem',
                  lineHeight: 1.6,
                }}
              >
                {editingText || recognitionText}
              </Typography>
            </Paper>
          )}
        </Box>

        {/* 操作按钮 */}
        <Slide direction="up" in={showControls}>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="primary"
              size="medium"
              startIcon={<AddIcon />}
              onClick={handleInsertText}
              sx={{ 
                borderRadius: '24px',
                minWidth: '120px',
                textTransform: 'none',
                boxShadow: '0 2px 5px rgba(0,0,0,0.08)',
              }}
            >
              插入输入框
            </Button>
            
            <Button
              variant="contained"
              color="success"
              size="medium"
              startIcon={<SendIcon />}
              onClick={handleSendMessage}
              sx={{ 
                borderRadius: '24px',
                minWidth: '120px',
                textTransform: 'none',
                boxShadow: '0 2px 5px rgba(0,0,0,0.08)',
              }}
            >
              直接发送
            </Button>

            <Button
              variant="outlined"
              size="medium"
              startIcon={<EditIcon />}
              onClick={handleTextEdit}
              sx={{ 
                borderRadius: '24px',
                ml: 'auto',
                textTransform: 'none',
              }}
            >
              编辑
            </Button>
          </Box>
        </Slide>
      </Paper>
    </Slide>
  );
};

export default EnhancedVoiceInput; 