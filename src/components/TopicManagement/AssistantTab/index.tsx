import {
  Box,
  List,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Menu,
  MenuItem,
  Typography,
  Tooltip,
  TextField,
  Divider,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Plus,
  Sparkles,
  FolderPlus,
  Edit3,
  Image,
  Copy,
  Trash2,
  ArrowUpAZ,
  ArrowDownAZ,
  Trash
} from 'lucide-react';
import type { Assistant } from '../../../shared/types/Assistant';
import VirtualizedAssistantGroups from './VirtualizedAssistantGroups';
import VirtualizedAssistantList from './VirtualizedAssistantList';

import PresetAssistantItem from './PresetAssistantItem';
import GroupDialog from '../GroupDialog';
import AssistantIconPicker from './AssistantIconPicker';
import { useAssistantTabLogic } from './useAssistantTabLogic';
import type { Group } from '../../../shared/types';
import AgentPromptSelector from '../../AgentPromptSelector';

// 组件属性定义
interface AssistantTabProps {
  userAssistants: Assistant[];
  currentAssistant: Assistant | null;
  onSelectAssistant: (assistant: Assistant) => void;
  onAddAssistant: (assistant: Assistant) => void;
  onUpdateAssistant?: (assistant: Assistant) => void;
  onDeleteAssistant?: (assistantId: string) => void;
}

/**
 * 助手选项卡组件 - 只负责渲染UI
 */
export default function AssistantTab({
  userAssistants,
  currentAssistant,
  onSelectAssistant,
  onAddAssistant,
  onUpdateAssistant,
  onDeleteAssistant
}: AssistantTabProps) {
  // 使用自定义hook获取所有逻辑和状态
  const {
    // 状态
    assistantDialogOpen,
    selectedAssistantId,
    assistantGroups,
    assistantGroupMap,
    ungroupedAssistants,
    notification,
    assistantMenuAnchorEl,
    selectedMenuAssistant,
    addToGroupMenuAnchorEl,
    groupDialogOpen,
    editDialogOpen,
    editAssistantName,
    editAssistantPrompt,
    promptSelectorOpen,
    iconPickerOpen,

    // 处理函数
    handleCloseNotification,
    handleOpenAssistantDialog,
    handleCloseAssistantDialog,
    handleSelectAssistant,
    handleSelectAssistantFromList,
    handleAddAssistant,
    handleOpenGroupDialog,
    handleCloseGroupDialog,
    handleOpenMenu,
    handleCloseAssistantMenu,
    handleOpenAddToGroupMenu,
    handleCloseAddToGroupMenu,
    handleAddToNewGroup,
    handleDeleteAssistantAction,
    handleOpenEditDialog,
    handleCloseEditDialog,
    handleSaveAssistant,
    handleCopyAssistant,
    handleClearTopics,
    handleSelectEmoji,
    handleSortByPinyinAsc,
    handleSortByPinyinDesc,
    handleAddToGroup,
    handleEditNameChange,
    handleEditPromptChange,
    handleOpenPromptSelector,
    handleClosePromptSelector,
    handleSelectPrompt,
    handleOpenIconPicker,
    handleCloseIconPicker,

    // 数据
    predefinedAssistantsData
  } = useAssistantTabLogic(
    userAssistants,
    currentAssistant,
    onSelectAssistant,
    onAddAssistant,
    onUpdateAssistant,
    onDeleteAssistant
  );

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 标题和按钮区域 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1" fontWeight="medium">所有助手</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="创建分组">
            <Button
              variant="outlined"
              size="small"
              startIcon={<FolderPlus size={16} />}
              onClick={handleOpenGroupDialog}
            >
              创建分组
            </Button>
          </Tooltip>
          <Tooltip title="创建新助手">
            <Button
              variant="outlined"
              size="small"
              startIcon={<Plus size={16} />}
              onClick={handleOpenAssistantDialog}
            >
              添加助手
            </Button>
          </Tooltip>
        </Box>
      </Box>

      {/* 分组区域 - 使用虚拟化组件 */}
      <VirtualizedAssistantGroups
        assistantGroups={assistantGroups || []}
        userAssistants={userAssistants}
        assistantGroupMap={assistantGroupMap || {}}
        currentAssistant={currentAssistant}
        onSelectAssistant={handleSelectAssistantFromList}
        onOpenMenu={handleOpenMenu}
        onDeleteAssistant={handleDeleteAssistantAction}
        isGroupEditMode={false}
        onAddItem={handleOpenGroupDialog}
      />

      {/* 未分组助手列表 - 使用虚拟化组件 */}
      <VirtualizedAssistantList
        assistants={ungroupedAssistants || []}
        currentAssistant={currentAssistant}
        onSelectAssistant={handleSelectAssistantFromList}
        onOpenMenu={handleOpenMenu}
        onDeleteAssistant={handleDeleteAssistantAction}
        title="未分组助手"
        height="calc(100vh - 400px)" // 动态计算高度
        emptyMessage="暂无未分组助手"
        itemHeight={72}

      />

      {/* 助手选择对话框 */}
      <Dialog open={assistantDialogOpen} onClose={handleCloseAssistantDialog}>
        <DialogTitle>选择助手</DialogTitle>
        <DialogContent>
          <DialogContentText>
            选择一个预设助手来添加到你的助手列表中
          </DialogContentText>
          <List sx={{ pt: 1 }}>
            {predefinedAssistantsData.map((assistant: Assistant) => (
              <PresetAssistantItem
                key={assistant.id}
                assistant={assistant}
                isSelected={selectedAssistantId === assistant.id}
                onSelect={handleSelectAssistant}
              />
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAssistantDialog}>取消</Button>
          <Button onClick={handleAddAssistant} color="primary">
            添加
          </Button>
        </DialogActions>
      </Dialog>

      {/* 分组对话框 */}
      <GroupDialog
        open={groupDialogOpen}
        onClose={handleCloseGroupDialog}
        type="assistant"
      />

      {/* 助手菜单 */}
      <Menu
        anchorEl={assistantMenuAnchorEl}
        open={Boolean(assistantMenuAnchorEl)}
        onClose={handleCloseAssistantMenu}
      >
        <MenuItem onClick={handleOpenAddToGroupMenu}>
          <FolderPlus size={18} style={{ marginRight: 8 }} />
          添加到分组...
        </MenuItem>
        <MenuItem onClick={handleOpenEditDialog}>
          <Edit3 size={18} style={{ marginRight: 8 }} />
          编辑助手
        </MenuItem>
        <MenuItem onClick={handleOpenIconPicker}>
          <Image size={18} style={{ marginRight: 8 }} />
          修改图标
        </MenuItem>
        <MenuItem onClick={handleCopyAssistant}>
          <Copy size={18} style={{ marginRight: 8 }} />
          复制助手
        </MenuItem>
        <MenuItem onClick={handleClearTopics}>
          <Trash2 size={18} style={{ marginRight: 8 }} />
          清空话题
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleSortByPinyinAsc}>
          <ArrowUpAZ size={18} style={{ marginRight: 8 }} />
          按拼音升序排列
        </MenuItem>
        <MenuItem onClick={handleSortByPinyinDesc}>
          <ArrowDownAZ size={18} style={{ marginRight: 8 }} />
          按拼音降序排列
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => {
          if (selectedMenuAssistant) handleDeleteAssistantAction(selectedMenuAssistant.id);
        }}>
          <Trash size={18} style={{ marginRight: 8 }} />
          删除助手
        </MenuItem>
      </Menu>

      {/* 添加到分组菜单 */}
      <Menu
        anchorEl={addToGroupMenuAnchorEl}
        open={Boolean(addToGroupMenuAnchorEl)}
        onClose={handleCloseAddToGroupMenu}
      >
        {(assistantGroups || []).map((group: Group) => (
          <MenuItem
            key={group.id}
            onClick={() => handleAddToGroup(group.id)}
          >
            {group.name}
          </MenuItem>
        ))}
        <MenuItem onClick={handleAddToNewGroup}>创建新分组...</MenuItem>
      </Menu>

      {/* 编辑助手对话框 */}
      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>编辑助手</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="助手名称"
            type="text"
            fullWidth
            variant="outlined"
            value={editAssistantName}
            onChange={handleEditNameChange}
            sx={{ mb: 2 }}
          />
          <Box sx={{ position: 'relative' }}>
            <TextField
              margin="dense"
              label="系统提示词"
              multiline
              rows={6}
              fullWidth
              variant="outlined"
              value={editAssistantPrompt}
              onChange={handleEditPromptChange}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<Sparkles size={16} />}
              onClick={handleOpenPromptSelector}
              sx={{
                mt: 1,
                borderColor: 'primary.main',
                color: 'primary.main',
                '&:hover': {
                  borderColor: 'primary.dark',
                  backgroundColor: 'primary.50'
                }
              }}
            >
              选择预设提示词
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>取消</Button>
          <Button onClick={handleSaveAssistant} color="primary">保存</Button>
        </DialogActions>
      </Dialog>

      {/* 智能体提示词选择器 */}
      <AgentPromptSelector
        open={promptSelectorOpen}
        onClose={handleClosePromptSelector}
        onSelect={handleSelectPrompt}
        currentPrompt={editAssistantPrompt}
      />

      {/* 助手图标选择器 */}
      <AssistantIconPicker
        open={iconPickerOpen}
        onClose={handleCloseIconPicker}
        onSelectEmoji={handleSelectEmoji}
        currentEmoji={selectedMenuAssistant?.emoji}
      />

      {/* 通知提示 */}
      <Snackbar
        open={notification.open}
        autoHideDuration={3000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}