import { useState } from 'react';
import { Box, IconButton, Drawer, useMediaQuery, useTheme } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SidebarTabs from './SidebarTabs';

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileToggle?: () => void;
  mcpMode?: 'prompt' | 'function';
  toolsEnabled?: boolean;
  onMCPModeChange?: (mode: 'prompt' | 'function') => void;
  onToolsToggle?: (enabled: boolean) => void;
  // 新增：支持桌面端收起功能
  desktopOpen?: boolean;
  onDesktopToggle?: () => void;
}

export default function Sidebar({
  mobileOpen = false,
  onMobileToggle,
  mcpMode,
  toolsEnabled,
  onMCPModeChange,
  onToolsToggle,
  // 新增参数
  desktopOpen = true,
  onDesktopToggle
}: SidebarProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [localMobileOpen, setLocalMobileOpen] = useState(false);
  const [localDesktopOpen, setLocalDesktopOpen] = useState(true);

  const drawerWidth = 308;

  const handleDrawerToggle = () => {
    if (isMobile) {
      // 移动端逻辑
      if (onMobileToggle) {
        onMobileToggle();
      } else {
        setLocalMobileOpen(!localMobileOpen);
      }
    } else {
      // 桌面端逻辑
      if (onDesktopToggle) {
        onDesktopToggle();
      } else {
        setLocalDesktopOpen(!localDesktopOpen);
      }
    }
  };

  const isOpen = isMobile
    ? (onMobileToggle ? mobileOpen : localMobileOpen)
    : (onDesktopToggle ? desktopOpen : localDesktopOpen);

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 显示收起按钮：移动端始终显示，桌面端在有控制函数时显示 */}
      {(isMobile || onDesktopToggle) && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
          <IconButton onClick={handleDrawerToggle}>
            <CloseIcon />
          </IconButton>
        </Box>
      )}
      <SidebarTabs
        mcpMode={mcpMode}
        toolsEnabled={toolsEnabled}
        onMCPModeChange={onMCPModeChange}
        onToolsToggle={onToolsToggle}
      />
    </Box>
  );

  return (
    <>
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={isOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRadius: '0 16px 16px 0'
            },
          }}
        >
          {drawer}
        </Drawer>
      ) : (
        <Drawer
          variant="persistent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            width: isOpen ? drawerWidth : 0,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              position: 'relative',
              height: '100%',
              border: 'none'
            },
          }}
          open={isOpen}
        >
          {drawer}
        </Drawer>
      )}
    </>
  );
}