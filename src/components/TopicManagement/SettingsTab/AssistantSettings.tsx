import React, { useState, useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Avatar,
  Chip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TuneIcon from '@mui/icons-material/Tune';
import PersonIcon from '@mui/icons-material/Person';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../shared/store';
import type { Assistant } from '../../../shared/types/Assistant';

/**
 * 助手设置主页面
 */
const AssistantSettings: React.FC = () => {
  const navigate = useNavigate();
  const [selectedAssistant, setSelectedAssistant] = useState<Assistant | null>(null);
  
  // 从Redux获取当前助手和助手列表
  const currentAssistant = useSelector((state: RootState) => state.assistants.currentAssistant);
  const allAssistants = useSelector((state: RootState) => state.assistants.assistants);

  useEffect(() => {
    // 默认选择当前助手
    if (currentAssistant) {
      setSelectedAssistant(currentAssistant);
    } else if (allAssistants.length > 0) {
      setSelectedAssistant(allAssistants[0]);
    }
  }, [currentAssistant, allAssistants]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleSelectAssistant = (assistant: Assistant) => {
    setSelectedAssistant(assistant);
  };

  const handleOpenModelSettings = () => {
    if (selectedAssistant) {
      navigate('/settings/assistant-model-settings', { 
        state: { assistant: selectedAssistant } 
      });
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部导航栏 */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconButton
            edge="start"
            onClick={handleBack}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            助手设置
          </Typography>
        </Toolbar>
      </AppBar>

      {/* 内容区域 */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {/* 当前选中的助手信息 */}
        {selectedAssistant && (
          <Box sx={{ p: 2, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.main' }}>
                {selectedAssistant.emoji || selectedAssistant.name.charAt(0)}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                  {selectedAssistant.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedAssistant.description || '暂无描述'}
                </Typography>
                {selectedAssistant.isSystem && (
                  <Chip 
                    label="系统助手" 
                    size="small" 
                    color="primary" 
                    sx={{ mt: 0.5 }}
                  />
                )}
              </Box>
            </Box>
          </Box>
        )}

        {/* 助手列表 */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ p: 2, fontWeight: 'medium' }}>
            选择助手
          </Typography>
          <List sx={{ pt: 0 }}>
            {allAssistants.map((assistant) => (
              <ListItem
                key={assistant.id}
                button
                selected={selectedAssistant?.id === assistant.id}
                onClick={() => handleSelectAssistant(assistant)}
                sx={{
                  '&.Mui-selected': {
                    bgcolor: 'primary.light',
                    '&:hover': {
                      bgcolor: 'primary.light',
                    },
                  },
                }}
              >
                <ListItemIcon>
                  <Avatar sx={{ width: 32, height: 32 }}>
                    {assistant.emoji || <PersonIcon />}
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={assistant.name}
                  secondary={assistant.description}
                  primaryTypographyProps={{ fontWeight: 'medium' }}
                />
                {assistant.isSystem && (
                  <Chip 
                    label="系统" 
                    size="small" 
                    variant="outlined" 
                    sx={{ mr: 1 }}
                  />
                )}
              </ListItem>
            ))}
          </List>
        </Box>

        <Divider />

        {/* 设置选项 */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" sx={{ p: 2, fontWeight: 'medium' }}>
            设置选项
          </Typography>
          <List sx={{ pt: 0 }}>
            <ListItem
              button
              onClick={handleOpenModelSettings}
              disabled={!selectedAssistant}
            >
              <ListItemIcon>
                <TuneIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="模型设置"
                secondary="配置助手的模型参数和行为"
              />
              <ListItemSecondaryAction>
                <ChevronRightIcon />
              </ListItemSecondaryAction>
            </ListItem>
            
            {/* 预留其他设置选项 */}
            <ListItem disabled>
              <ListItemIcon>
                <TuneIcon color="disabled" />
              </ListItemIcon>
              <ListItemText
                primary="提示词设置"
                secondary="即将推出"
              />
              <ListItemSecondaryAction>
                <ChevronRightIcon color="disabled" />
              </ListItemSecondaryAction>
            </ListItem>

            <ListItem disabled>
              <ListItemIcon>
                <TuneIcon color="disabled" />
              </ListItemIcon>
              <ListItemText
                primary="知识库设置"
                secondary="即将推出"
              />
              <ListItemSecondaryAction>
                <ChevronRightIcon color="disabled" />
              </ListItemSecondaryAction>
            </ListItem>

            <ListItem disabled>
              <ListItemIcon>
                <TuneIcon color="disabled" />
              </ListItemIcon>
              <ListItemText
                primary="MCP设置"
                secondary="即将推出"
              />
              <ListItemSecondaryAction>
                <ChevronRightIcon color="disabled" />
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </Box>
      </Box>
    </Box>
  );
};

export default AssistantSettings;
