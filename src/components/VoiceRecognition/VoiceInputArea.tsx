import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  CircularProgress,
  Tooltip,
  Fade
} from '@mui/material';
import { Mic, Send, X, Edit, MicOff, Plus, Volume2 } from 'lucide-react';

interface VoiceInputAreaProps {
  isListening: boolean;
  recognitionText: string;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSendMessage: (message: string) => void;
  onCancel: () => void;
  onInsertText: (text: string) => void;
  isDarkMode?: boolean;
  silenceTimeout?: number;  // 静音超时时间（毫秒）
  showVolumeIndicator?: boolean; // 是否显示音量指示器
}

const VoiceInputArea: React.FC<VoiceInputAreaProps> = ({
  isListening,
  recognitionText,
  onStartRecording,
  onStopRecording,
  onSendMessage,
  onCancel,
  onInsertText,
  isDarkMode = false,
  silenceTimeout = 5000,
  showVolumeIndicator = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(recognitionText);
  const [showPreview, setShowPreview] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 当识别文本变化时更新编辑文本
  useEffect(() => {
    setEditedText(recognitionText);
    
    // 如果有识别文本且不再录音，显示预览
    if (recognitionText && !isListening) {
      setShowPreview(true);
    }
  }, [recognitionText, isListening]);

  // 监控录音状态变化
  useEffect(() => {
    if (isListening) {
      if (showVolumeIndicator) {
        setupAudioAnalyser();
      }
    } else {
      cleanupAudioAnalyser();
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        setSilenceTimer(null);
      }
    }
    
    return () => {
      cleanupAudioAnalyser();
      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }
    };
  }, [isListening]);

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
        if (!isListening || !analyser) return;
        
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
              onStopRecording();
              // 有识别的文字时自动跳转到预览界面
              if (recognitionText) {
                setShowPreview(true);
              }
            }, silenceTimeout);
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
  };

  // 处理开始/停止录音
  const handleToggleRecording = () => {
    if (isListening) {
      onStopRecording();
    } else {
      setShowPreview(false);
      onStartRecording();
    }
  };

  // 处理插入到输入框
  const handleInsertToInput = () => {
    const textToInsert = isEditing ? editedText : recognitionText;
    if (textToInsert && textToInsert.trim()) {
      onInsertText(textToInsert.trim());
      setShowPreview(false);
      onCancel();
    }
  };

  // 处理直接发送
  const handleSendDirectly = () => {
    const textToSend = isEditing ? editedText : recognitionText;
    if (textToSend && textToSend.trim()) {
      onSendMessage(textToSend.trim());
      setShowPreview(false);
    }
  };

  // 处理丢弃文本
  const handleDiscardText = () => {
    setShowPreview(false);
    setEditedText('');
    onCancel();
  };

  // 处理编辑
  const handleEdit = () => {
    setIsEditing(true);
  };

  // 处理编辑文本变化
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedText(e.target.value);
  };

  // 完成编辑
  const handleEditComplete = () => {
    setIsEditing(false);
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

  // 如果正在录音，显示录音界面
  if (isListening) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '16px',
          background: isDarkMode ? 'rgba(42, 42, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          border: `2px solid #ff4444`,
          borderRadius: '12px',
          minHeight: '80px',
          width: '100%',
          position: 'relative',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 20px rgba(255, 68, 68, 0.3)',
        }}
      >
        {/* 录音状态指示 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 68, 68, 0.2)',
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
                border: '2px solid #ff4444',
                animation: 'ripple 1.5s infinite ease-out',
                '@keyframes ripple': {
                  '0%': { transform: 'scale(0.8)', opacity: 1 },
                  '100%': { transform: 'scale(1.5)', opacity: 0 },
                },
              }}
            />
            <Mic
              size={28}
              color="#f44336"
              style={getMicAnimation()}
            />
          </Box>
          <Typography variant="body2" sx={{ color: '#ff4444', fontWeight: 600 }}>
            正在录音...
          </Typography>
        </Box>

        {/* 实时识别文本 */}
        {recognitionText && (
          <Paper
            elevation={1}
            sx={{
              p: 2,
              mb: 2,
              width: '100%',
              backgroundColor: isDarkMode ? 'rgba(60, 60, 60, 0.7)' : 'rgba(250, 250, 250, 0.9)',
              borderRadius: '8px',
              maxHeight: '100px',
              overflowY: 'auto',
              border: '1px solid',
              borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: isDarkMode ? '#fff' : '#333',
                wordBreak: 'break-word',
                lineHeight: 1.5,
              }}
            >
              {recognitionText}
            </Typography>
          </Paper>
        )}

        {/* 操作按钮 */}
        <Box sx={{ display: 'flex', gap: 2, width: '100%', justifyContent: 'center' }}>
          <Button
            variant="contained"
            color="error"
            onClick={handleToggleRecording}
            startIcon={<MicOff size={16} />}
            sx={{
              borderRadius: '20px',
              px: 3,
              boxShadow: '0 2px 8px rgba(255,68,68,0.3)',
              '&:hover': {
                backgroundColor: '#d32f2f',
                boxShadow: '0 4px 12px rgba(255,68,68,0.5)',
              },
            }}
          >
            停止录音
          </Button>

          <Button
            variant="outlined"
            color="inherit"
            onClick={onCancel}
            startIcon={<X size={16} />}
            sx={{
              borderRadius: '20px',
              px: 3,
              borderColor: isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
              color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
            }}
          >
            取消
          </Button>
        </Box>

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
            静音检测中，即将自动停止...
          </Typography>
        )}
      </Box>
    );
  }

  // 如果有识别结果且需要预览，显示预览界面
  if (showPreview && recognitionText) {
    return (
      <Paper
        elevation={3}
        sx={{
          p: 2,
          background: isDarkMode ? '#2A2A2A' : '#FFFFFF',
          border: `1px solid ${isDarkMode ? '#444' : '#ddd'}`,
          borderRadius: '12px',
          position: 'relative',
          width: '100%',
        }}
      >
        {/* 标题 */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Volume2 size={20} color={isDarkMode ? '#90caf9' : '#1976d2'} style={{ marginRight: 8 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              语音识别结果
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleDiscardText}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* 识别文本显示/编辑 */}
        <Box sx={{ mb: 3 }}>
          {isEditing ? (
            <textarea
              value={editedText}
              onChange={handleTextChange}
              onBlur={handleEditComplete}
              autoFocus
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: `1px solid ${isDarkMode ? '#555' : '#ddd'}`,
                backgroundColor: isDarkMode ? '#333' : '#fff',
                color: isDarkMode ? '#fff' : '#000',
                resize: 'none',
                minHeight: '80px',
                fontSize: '0.95rem',
                fontFamily: 'inherit',
                outline: 'none',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
              }}
            />
          ) : (
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                backgroundColor: isDarkMode ? '#333' : '#f5f5f5',
                borderRadius: '8px',
                minHeight: '60px',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: isDarkMode ? '#3a3a3a' : '#f0f0f0',
                },
                borderColor: isDarkMode ? '#444' : '#e0e0e0',
              }}
              onClick={handleEdit}
            >
              <Typography
                variant="body2"
                sx={{
                  wordBreak: 'break-word',
                  fontSize: '0.95rem',
                  lineHeight: 1.5,
                }}
              >
                {recognitionText}
              </Typography>
            </Paper>
          )}
        </Box>

        {/* 操作按钮 */}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="primary"
            size="medium"
            startIcon={<Plus size={16} />}
            onClick={handleInsertToInput}
            sx={{ 
              borderRadius: '8px',
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
            startIcon={<Send size={16} />}
            onClick={handleSendDirectly}
            sx={{ 
              borderRadius: '8px',
              textTransform: 'none',
              boxShadow: '0 2px 5px rgba(0,0,0,0.08)',
            }}
          >
            直接发送
          </Button>

          <Button
            variant="outlined"
            size="medium"
            startIcon={<Edit size={16} />}
            onClick={handleEdit}
            sx={{ 
              borderRadius: '8px',
              textTransform: 'none',
              ml: 'auto',
            }}
          >
            编辑
          </Button>
        </Box>
      </Paper>
    );
  }

  // 默认状态：显示开始录音按钮
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        background: isDarkMode ? 'rgba(42, 42, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)',
        border: `1px solid ${isDarkMode ? '#444' : '#ddd'}`,
        borderRadius: '20px',
        minHeight: '48px',
        position: 'relative',
        width: '100%',
        transition: 'all 0.2s ease-in-out',
        backdropFilter: 'blur(5px)',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      }}
    >
      <Button
        variant="contained"
        color="primary"
        onClick={handleToggleRecording}
        startIcon={<Mic size={16} />}
        sx={{
          borderRadius: '20px',
          px: 3,
          backgroundColor: isDarkMode ? '#1976d2' : '#2196f3',
          boxShadow: '0 2px 8px rgba(33,150,243,0.3)',
          '&:hover': {
            backgroundColor: isDarkMode ? '#1565c0' : '#1976d2',
            boxShadow: '0 4px 12px rgba(33,150,243,0.5)',
          },
        }}
      >
        开始语音识别
      </Button>

      <IconButton
        size="small"
        onClick={onCancel}
        sx={{
          position: 'absolute',
          right: '8px',
          top: '8px',
          color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
          '&:hover': {
            color: isDarkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)',
          },
        }}
      >
        <X size={16} />
      </IconButton>
    </Box>
  );
};

export default VoiceInputArea;
