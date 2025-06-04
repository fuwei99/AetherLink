import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Tooltip,
  IconButton,
  AppBar,
  Toolbar,
  Divider,
  alpha,
  FormControlLabel,
  Switch
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InfoIcon from '@mui/icons-material/Info';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../shared/store';
import { updateSettings } from '../../shared/store/settingsSlice';

const MessageBubbleSettings: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);

  // 获取版本切换样式设置，默认为'popup'
  const versionSwitchStyle = (settings as any).versionSwitchStyle || 'popup';
  
  // 获取小功能气泡显示设置，默认为true
  const showMicroBubbles = (settings as any).showMicroBubbles !== false;

  const handleBack = () => {
    navigate('/settings/appearance');
  };

  // 版本切换样式变更事件处理函数
  const handleVersionSwitchStyleChange = (event: { target: { value: any } }) => {
    dispatch(updateSettings({
      versionSwitchStyle: event.target.value
    }));
  };
  
  // 小功能气泡显示设置变更处理函数
  const handleMicroBubblesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(updateSettings({
      showMicroBubbles: event.target.checked
    }));
  };

  return (
    <Box sx={{
      flexGrow: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      bgcolor: (theme) => theme.palette.mode === 'light'
        ? alpha(theme.palette.primary.main, 0.02)
        : alpha(theme.palette.background.default, 0.9),
    }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: 1,
          borderColor: 'divider',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleBack}
            aria-label="back"
            sx={{
              color: (theme) => theme.palette.primary.main,
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography
            variant="h6"
            component="div"
            sx={{
              flexGrow: 1,
              fontWeight: 600,
              backgroundImage: 'linear-gradient(90deg, #9333EA, #754AB4)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            信息气泡管理
          </Typography>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          p: { xs: 1, sm: 2 },
          mt: 8,
          '&::-webkit-scrollbar': {
            width: { xs: '4px', sm: '6px' },
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0,0,0,0.1)',
            borderRadius: '3px',
          },
        }}
      >
        {/* 版本切换样式设置和小功能气泡显示设置 */}
        <Paper
          elevation={0}
          sx={{
            mb: 2,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
            bgcolor: 'background.paper',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          }}
        >
          <Box sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: 'rgba(0,0,0,0.01)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: '1rem', sm: '1.1rem' }
                }}
              >
                气泡功能设置
              </Typography>
              <Tooltip title="设置信息气泡的功能和显示方式">
                <IconButton size="small" sx={{ ml: 1 }}>
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
            >
              自定义消息版本历史和功能气泡的显示方式
            </Typography>
          </Box>

          <Divider />

          <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
            {/* 小功能气泡显示设置 */}
            <FormControlLabel
              control={
                <Switch
                  checked={showMicroBubbles}
                  onChange={handleMicroBubblesChange}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    显示功能气泡
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                    在消息气泡上方显示播放和版本切换的小功能气泡
                  </Typography>
                </Box>
              }
              sx={{ 
                display: 'flex',
                alignItems: 'flex-start',
                mb: 2,
                mt: 1
              }}
            />
            
            {/* 分隔线 */}
            <Divider sx={{ my: 2 }} />

            <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
              <InputLabel>版本切换样式</InputLabel>
              <Select
                value={versionSwitchStyle}
                onChange={handleVersionSwitchStyleChange}
                label="版本切换样式"
                disabled={!showMicroBubbles}
              >
                <MenuItem value="popup">弹出列表（默认）</MenuItem>
                <MenuItem value="arrows">箭头式切换 &lt; 2 &gt;</MenuItem>
              </Select>
            </FormControl>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 1,
                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                lineHeight: 1.5
              }}
            >
              设置版本历史的显示和切换方式：
              <br />• 弹出列表：点击版本历史按钮，弹出所有版本列表（默认方式）
              <br />• 箭头式切换：使用左右箭头在版本间切换，类似 &lt; 2 &gt; 的形式
            </Typography>
          </Box>
        </Paper>

        {/* 可以添加更多信息气泡相关的设置项 */}

        {/* 底部间距 */}
        <Box sx={{ height: '20px' }} />
      </Box>
    </Box>
  );
};

export default MessageBubbleSettings; 