import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
  alpha
} from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../shared/store';
import { updateSettings } from '../../shared/store/settingsSlice';

const InputBoxSettings: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);

  // 获取输入框相关设置
  const inputBoxStyle = settings.inputBoxStyle || 'default';
  const inputLayoutStyle = (settings as any).inputLayoutStyle || 'default';

  const handleBack = () => {
    navigate('/settings/appearance');
  };

  // 事件处理函数
  const handleInputBoxStyleChange = (event: { target: { value: any } }) => {
    dispatch(updateSettings({
      inputBoxStyle: event.target.value
    }));
  };

  const handleInputLayoutStyleChange = (event: { target: { value: any } }) => {
    dispatch(updateSettings({
      inputLayoutStyle: event.target.value
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
            <ArrowLeft size={20} />
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
            输入框管理设置
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
        {/* 输入框风格设置 */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #eee' }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            输入框风格
          </Typography>

          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel>输入框风格</InputLabel>
            <Select
              value={inputBoxStyle}
              onChange={handleInputBoxStyleChange}
              label="输入框风格"
              MenuProps={{
                disableAutoFocus: true,
                disableRestoreFocus: true
              }}
            >
              <MenuItem value="default">默认风格</MenuItem>
              <MenuItem value="modern">现代风格</MenuItem>
              <MenuItem value="minimal">简约风格</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            选择聊天输入框和工具栏的视觉风格。默认风格保持原有设计，现代风格采用更时尚的外观，简约风格则更加简洁。
          </Typography>
        </Paper>

        {/* 输入框布局样式设置 */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #eee' }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            输入框布局样式
          </Typography>

          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel>布局样式</InputLabel>
            <Select
              value={inputLayoutStyle}
              onChange={handleInputLayoutStyleChange}
              label="布局样式"
              MenuProps={{
                disableAutoFocus: true,
                disableRestoreFocus: true
              }}
            >
              <MenuItem value="default">默认样式（工具栏+输入框分离）</MenuItem>
              <MenuItem value="compact">聚合样式（输入框+功能图标集成）</MenuItem>
              <MenuItem value="integrated">集成样式（工具菜单+垂直布局）</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            选择聊天输入区域的布局方式：
            <br />• 默认样式：工具栏和输入框分别显示，功能清晰分离
            <br />• 聚合样式：输入框上方，下方为功能图标行，点击+号可展开更多功能
            <br />• 集成样式：工具菜单集成到输入框，采用垂直布局和现代化设计
          </Typography>
        </Paper>

        {/* 底部间距 */}
        <Box sx={{ height: '20px' }} />
      </Box>
    </Box>
  );
};

export default InputBoxSettings;
