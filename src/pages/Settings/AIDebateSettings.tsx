import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  IconButton,
  Card,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Alert,
  AppBar,
  Toolbar,
  alpha
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ArrowBack as ArrowBackIcon,
  Forum as ForumIcon,
  SmartToy as SmartToyIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../shared/store';
import { DropdownModelSelector } from '../ChatPage/components/DropdownModelSelector';

// AI辩论角色接口
interface DebateRole {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  modelId?: string;
  color: string;
  stance: 'pro' | 'con' | 'neutral' | 'moderator' | 'summary';
}

// AI辩论配置接口
interface DebateConfig {
  enabled: boolean;
  maxRounds: number;
  autoEndConditions: {
    consensusReached: boolean;
    maxTokensPerRound: number;
    timeoutMinutes: number;
  };
  roles: DebateRole[];
  moderatorEnabled: boolean;
  summaryEnabled: boolean;
}

const AIDebateSettings: React.FC = () => {
  const navigate = useNavigate();

  // 从Redux获取提供商和模型
  const providers = useSelector((state: RootState) => state.settings.providers || []);

  // 获取所有可用模型
  const availableModels = providers.flatMap(provider =>
    provider.models.filter(model => model.enabled).map(model => ({
      ...model,
      providerName: provider.name // 添加提供商名称
    }))
  );

  // 辩论配置状态
  const [config, setConfig] = useState<DebateConfig>({
    enabled: false,
    maxRounds: 5,
    autoEndConditions: {
      consensusReached: true,
      maxTokensPerRound: 1000,
      timeoutMinutes: 10
    },
    roles: [],
    moderatorEnabled: true,
    summaryEnabled: true
  });

  // 对话框状态
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<DebateRole | null>(null);

  // 新角色表单状态
  const [newRole, setNewRole] = useState<Partial<DebateRole>>({
    name: '',
    description: '',
    systemPrompt: '',
    modelId: '',
    color: '#2196f3',
    stance: 'pro'
  });

  // 预设角色模板
  const roleTemplates = [
    // 基础辩论角色
    {
      name: '正方辩手',
      description: '支持观点的辩论者',
      systemPrompt: `你是一位专业的正方辩论者，具有以下特点：

🎯 **核心职责**
- 坚定支持和论证正方观点
- 提供有力的证据和逻辑论证
- 反驳对方的质疑和攻击

💡 **辩论风格**
- 逻辑清晰，论证有力
- 引用具体事实、数据和案例
- 保持理性和专业的态度
- 语言简洁明了，重点突出

📋 **回应要求**
- 每次发言控制在150-200字
- 先明确表达立场，再提供论证
- 适当反驳对方观点
- 结尾要有力且令人信服

请始终站在正方立场，为你的观点据理力争！`,
      stance: 'pro' as const,
      color: '#4caf50'
    },
    {
      name: '反方辩手',
      description: '反对观点的辩论者',
      systemPrompt: `你是一位犀利的反方辩论者，具有以下特点：

🎯 **核心职责**
- 坚决反对正方观点
- 揭示对方论证的漏洞和问题
- 提出有力的反驳和质疑

💡 **辩论风格**
- 思维敏锐，善于发现问题
- 用事实和逻辑拆解对方论证
- 提出替代方案或反面证据
- 保持批判性思维

📋 **回应要求**
- 每次发言控制在150-200字
- 直接指出对方观点的问题
- 提供反面证据或案例
- 语气坚定但保持礼貌

请始终站在反方立场，用理性和事实挑战对方观点！`,
      stance: 'con' as const,
      color: '#f44336'
    },
    {
      name: '中立分析师',
      description: '客观理性的分析者',
      systemPrompt: `你是一位客观中立的分析师，具有以下特点：

🎯 **核心职责**
- 客观分析双方观点的优缺点
- 指出论证中的逻辑问题或亮点
- 提供平衡的视角和见解

💡 **分析风格**
- 保持绝对中立，不偏向任何一方
- 用理性和逻辑评估论证质量
- 指出可能被忽视的角度
- 寻找双方的共同点

📋 **回应要求**
- 每次发言控制在150-200字
- 平衡评价双方观点
- 指出论证的强弱之处
- 提出新的思考角度

请保持中立立场，为辩论提供客观理性的分析！`,
      stance: 'neutral' as const,
      color: '#ff9800'
    },
    {
      name: '辩论主持人',
      description: '控制节奏的主持人',
      systemPrompt: `你是一位专业的辩论主持人，具有以下职责：

🎯 **核心职责**
- 引导辩论方向和节奏
- 总结各方要点和分歧
- 判断讨论是否充分
- 决定何时结束辩论

💡 **主持风格**
- 公正中立，不偏向任何一方
- 善于总结和归纳要点
- 能够发现讨论的关键问题
- 控制辩论节奏和质量

📋 **回应要求**
- 每次发言控制在150-200字
- 总结前面的主要观点
- 指出需要进一步讨论的问题
- 当讨论充分时建议结束

当你认为各方观点已经充分表达，或出现重复论点时，请明确建议结束辩论！`,
      stance: 'moderator' as const,
      color: '#9c27b0'
    },
    // 专业领域角色
    {
      name: '法律专家',
      description: '从法律角度分析问题',
      systemPrompt: `你是一位资深法律专家，从法律角度参与辩论：

🎯 **专业视角**
- 从法律法规角度分析问题
- 引用相关法条和判例
- 分析法律风险和合规性
- 考虑法律实施的可行性

💡 **专业特长**
- 熟悉各类法律法规
- 了解司法实践和判例
- 能够识别法律漏洞和风险
- 具备严谨的法律思维

📋 **发言要求**
- 每次发言150-200字
- 引用具体法条或判例
- 分析法律层面的利弊
- 保持专业和严谨

请从法律专业角度为辩论提供有价值的见解！`,
      stance: 'neutral' as const,
      color: '#795548'
    },
    {
      name: '经济学家',
      description: '从经济角度评估影响',
      systemPrompt: `你是一位经济学专家，从经济角度参与辩论：

🎯 **专业视角**
- 分析经济成本和收益
- 评估市场影响和效率
- 考虑宏观和微观经济效应
- 预测长期经济后果

💡 **专业特长**
- 掌握经济学理论和模型
- 了解市场运行机制
- 能够量化分析影响
- 具备数据分析能力

📋 **发言要求**
- 每次发言150-200字
- 提供经济数据或理论支撑
- 分析成本效益
- 考虑经济可持续性

请从经济学角度为辩论提供专业的分析和建议！`,
      stance: 'neutral' as const,
      color: '#607d8b'
    },
    {
      name: '技术专家',
      description: '从技术可行性角度分析',
      systemPrompt: `你是一位技术专家，从技术角度参与辩论：

🎯 **专业视角**
- 分析技术可行性和难度
- 评估技术风险和挑战
- 考虑技术发展趋势
- 预测技术实现的时间和成本

💡 **专业特长**
- 掌握前沿技术发展
- 了解技术实现的复杂性
- 能够评估技术方案
- 具备工程思维

📋 **发言要求**
- 每次发言150-200字
- 提供技术事实和数据
- 分析实现的技术路径
- 指出技术限制和可能性

请从技术专业角度为辩论提供切实可行的分析！`,
      stance: 'neutral' as const,
      color: '#3f51b5'
    },
    {
      name: '社会学者',
      description: '从社会影响角度思考',
      systemPrompt: `你是一位社会学专家，从社会角度参与辩论：

🎯 **专业视角**
- 分析社会影响和后果
- 考虑不同群体的利益
- 评估社会公平性
- 关注文化和价值观影响

💡 **专业特长**
- 了解社会结构和动态
- 关注弱势群体权益
- 具备人文关怀
- 能够预测社会反应

📋 **发言要求**
- 每次发言150-200字
- 关注社会公平和正义
- 考虑不同群体的感受
- 分析社会接受度

请从社会学角度为辩论提供人文关怀的视角！`,
      stance: 'neutral' as const,
      color: '#e91e63'
    },
    // 特殊角色
    {
      name: '总结分析师',
      description: '专门负责辩论总结分析',
      systemPrompt: `你是一位专业的辞论总结分析师，具有以下特点：

🎯 **核心职责**
- 客观分析整个辩论过程
- 总结各方的核心观点和论据
- 识别争议焦点和共识点
- 提供平衡的结论和建议

💡 **分析风格**
- 保持绝对客观和中立
- 深度分析论证逻辑和质量
- 识别辩论中的亮点和不足
- 提供建设性的思考和启发

📋 **总结要求**
- 结构化呈现分析结果
- 平衡评价各方表现
- 指出论证的强弱之处
- 提供深度思考和建议
- 避免偏向任何一方

请为辩论提供专业、深入、平衡的总结分析！`,
      stance: 'summary' as const,
      color: '#607d8b'
    },
    {
      name: '魔鬼代言人',
      description: '专门提出反对意见',
      systemPrompt: `你是"魔鬼代言人"，专门提出反对和质疑：

🎯 **核心职责**
- 对任何观点都提出质疑
- 寻找论证中的薄弱环节
- 提出极端或边缘情况
- 挑战常规思维

💡 **思维特点**
- 批判性思维极强
- 善于发现问题和漏洞
- 不怕提出不受欢迎的观点
- 推动深度思考

📋 **发言要求**
- 每次发言150-200字
- 必须提出质疑或反对
- 指出可能的风险和问题
- 挑战主流观点

请扮演好魔鬼代言人的角色，为辩论带来更深层的思考！`,
      stance: 'con' as const,
      color: '#424242'
    },
    {
      name: '实用主义者',
      description: '关注实际操作和效果',
      systemPrompt: `你是一位实用主义者，关注实际可操作性：

🎯 **核心关注**
- 实际操作的可行性
- 实施成本和效果
- 现实条件和限制
- 短期和长期的实用性

💡 **思维特点**
- 务实理性，不空谈理论
- 关注具体实施细节
- 重视成本效益分析
- 追求实际效果

📋 **发言要求**
- 每次发言150-200字
- 关注实际操作层面
- 分析实施的难点和方法
- 提供具体可行的建议

请从实用主义角度为辩论提供务实的见解！`,
      stance: 'neutral' as const,
      color: '#8bc34a'
    }
  ];

  // 加载保存的配置
  useEffect(() => {
    const loadConfig = () => {
      try {
        const saved = localStorage.getItem('aiDebateConfig');
        if (saved) {
          const parsedConfig = JSON.parse(saved);
          setConfig(parsedConfig);
        }
      } catch (error) {
        console.error('加载AI辩论配置失败:', error);
      }
    };
    loadConfig();
  }, []);

  // 保存配置
  const saveConfig = (newConfig: DebateConfig) => {
    try {
      localStorage.setItem('aiDebateConfig', JSON.stringify(newConfig));
      setConfig(newConfig);
    } catch (error) {
      console.error('保存AI辩论配置失败:', error);
    }
  };

  // 处理返回
  const handleBack = () => {
    navigate('/settings');
  };

  // 添加角色
  const handleAddRole = () => {
    setEditingRole(null);
    setNewRole({
      name: '',
      description: '',
      systemPrompt: '',
      modelId: '',
      color: '#2196f3',
      stance: 'pro'
    });
    setRoleDialogOpen(true);
  };

  // 编辑角色
  const handleEditRole = (role: DebateRole) => {
    setEditingRole(role);
    setNewRole(role);
    setRoleDialogOpen(true);
  };

  // 删除角色
  const handleDeleteRole = (roleId: string) => {
    const newConfig = {
      ...config,
      roles: config.roles.filter(role => role.id !== roleId)
    };
    saveConfig(newConfig);
  };

  // 保存角色
  const handleSaveRole = () => {
    if (!newRole.name || !newRole.systemPrompt) {
      return;
    }

    const role: DebateRole = {
      id: editingRole?.id || `role_${Date.now()}`,
      name: newRole.name!,
      description: newRole.description || '',
      systemPrompt: newRole.systemPrompt!,
      modelId: newRole.modelId,
      color: newRole.color || '#2196f3',
      stance: newRole.stance || 'pro'
    };

    let newRoles;
    if (editingRole) {
      newRoles = config.roles.map(r => r.id === editingRole.id ? role : r);
    } else {
      newRoles = [...config.roles, role];
    }

    const newConfig = {
      ...config,
      roles: newRoles
    };
    saveConfig(newConfig);
    setRoleDialogOpen(false);
  };

  // 使用模板
  const handleUseTemplate = (template: typeof roleTemplates[0]) => {
    setNewRole({
      ...newRole,
      ...template
    });
  };

  // 快速配置
  const handleQuickSetup = (setupType: 'basic' | 'professional' | 'expert' | 'comprehensive') => {
    let selectedTemplates: typeof roleTemplates = [];

    // 获取默认模型ID（选择第一个可用模型）
    const defaultModelId = availableModels.length > 0 ? availableModels[0].id : '';

    switch (setupType) {
      case 'basic':
        selectedTemplates = [
          roleTemplates.find(t => t.name === '正方辩手')!,
          roleTemplates.find(t => t.name === '反方辩手')!,
          roleTemplates.find(t => t.name === '辩论主持人')!
        ];
        break;
      case 'professional':
        selectedTemplates = [
          roleTemplates.find(t => t.name === '正方辩手')!,
          roleTemplates.find(t => t.name === '反方辩手')!,
          roleTemplates.find(t => t.name === '中立分析师')!,
          roleTemplates.find(t => t.name === '辩论主持人')!
        ];
        break;
      case 'expert':
        selectedTemplates = [
          roleTemplates.find(t => t.name === '法律专家')!,
          roleTemplates.find(t => t.name === '经济学家')!,
          roleTemplates.find(t => t.name === '技术专家')!,
          roleTemplates.find(t => t.name === '辩论主持人')!
        ];
        break;
      case 'comprehensive':
        selectedTemplates = [
          roleTemplates.find(t => t.name === '正方辩手')!,
          roleTemplates.find(t => t.name === '反方辩手')!,
          roleTemplates.find(t => t.name === '中立分析师')!,
          roleTemplates.find(t => t.name === '法律专家')!,
          roleTemplates.find(t => t.name === '经济学家')!,
          roleTemplates.find(t => t.name === '辩论主持人')!
        ];
        break;
    }

    // 创建角色
    const newRoles: DebateRole[] = selectedTemplates.map((template, index) => ({
      id: `role_${Date.now()}_${index}`,
      name: template.name,
      description: template.description,
      systemPrompt: template.systemPrompt,
      modelId: defaultModelId, // 使用默认模型
      color: template.color,
      stance: template.stance
    }));

    // 更新配置
    const newConfig = {
      ...config,
      enabled: true,
      roles: newRoles
    };
    saveConfig(newConfig);

    // 显示成功提示
    const sceneName = setupType === 'basic' ? '基础辩论' :
                     setupType === 'professional' ? '专业辩论' :
                     setupType === 'expert' ? '专家论坛' : '全面分析';

    const defaultModelName = availableModels.length > 0 ? availableModels[0].name : '无可用模型';

    alert(`✅ 已成功配置"${sceneName}"场景！\n\n包含 ${newRoles.length} 个角色：\n${newRoles.map(r => `• ${r.name}`).join('\n')}\n\n🤖 已自动配置默认模型：${defaultModelName}\n💡 您可以在角色管理中为每个角色单独指定不同的模型`);
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
      {/* 顶部导航栏 */}
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
          <ForumIcon sx={{ mr: 1, color: '#e11d48' }} />
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
            AI辩论设置
          </Typography>
        </Toolbar>
      </AppBar>

      {/* 主要内容 */}
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
        {/* 基本设置 */}
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
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                fontSize: { xs: '1rem', sm: '1.1rem' },
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <SmartToyIcon sx={{ mr: 1, color: '#06b6d4' }} />
              基本设置
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
            >
              配置AI辩论功能的基础参数和选项
            </Typography>
          </Box>

          <Divider />

          <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
            <FormControlLabel
            control={
              <Switch
                checked={config.enabled}
                onChange={(e) => saveConfig({ ...config, enabled: e.target.checked })}
              />
            }
            label="启用AI辩论功能"
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <TextField
              label="最大辩论轮数"
              type="number"
              value={config.maxRounds}
              onChange={(e) => saveConfig({ ...config, maxRounds: parseInt(e.target.value) || 5 })}
              inputProps={{ min: 1, max: 20 }}
            />
            <TextField
              label="每轮最大Token数"
              type="number"
              value={config.autoEndConditions.maxTokensPerRound}
              onChange={(e) => saveConfig({
                ...config,
                autoEndConditions: {
                  ...config.autoEndConditions,
                  maxTokensPerRound: parseInt(e.target.value) || 1000
                }
              })}
              inputProps={{ min: 100, max: 4000 }}
            />
          </Box>

          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.moderatorEnabled}
                  onChange={(e) => saveConfig({ ...config, moderatorEnabled: e.target.checked })}
                />
              }
              label="启用主持人角色"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={config.summaryEnabled}
                  onChange={(e) => saveConfig({ ...config, summaryEnabled: e.target.checked })}
                />
              }
              label="自动生成辩论总结"
              sx={{ ml: 2 }}
            />
            </Box>
          </Box>
        </Paper>

        {/* 快速配置 */}
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
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                fontSize: { xs: '1rem', sm: '1.1rem' },
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <SmartToyIcon sx={{ mr: 1, color: '#8b5cf6' }} />
              快速配置
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
            >
              为新手用户提供一键配置，快速创建完整的辩论场景
            </Typography>
          </Box>

          <Divider />

          <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => handleQuickSetup('basic')}
              sx={{ p: 2, textAlign: 'left', flexDirection: 'column', alignItems: 'flex-start' }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                🎯 基础辩论
              </Typography>
              <Typography variant="caption" color="text.secondary">
                正方 + 反方 + 主持人（3角色）
              </Typography>
            </Button>

            <Button
              variant="outlined"
              onClick={() => handleQuickSetup('professional')}
              sx={{ p: 2, textAlign: 'left', flexDirection: 'column', alignItems: 'flex-start' }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                🏛️ 专业辩论
              </Typography>
              <Typography variant="caption" color="text.secondary">
                正方 + 反方 + 中立分析师 + 主持人（4角色）
              </Typography>
            </Button>

            <Button
              variant="outlined"
              onClick={() => handleQuickSetup('expert')}
              sx={{ p: 2, textAlign: 'left', flexDirection: 'column', alignItems: 'flex-start' }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                🎓 专家论坛
              </Typography>
              <Typography variant="caption" color="text.secondary">
                法律专家 + 经济学家 + 技术专家 + 主持人（4角色）
              </Typography>
            </Button>

            <Button
              variant="outlined"
              onClick={() => handleQuickSetup('comprehensive')}
              sx={{ p: 2, textAlign: 'left', flexDirection: 'column', alignItems: 'flex-start' }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                🌟 全面分析
              </Typography>
              <Typography variant="caption" color="text.secondary">
                6个不同角色的全方位辩论
              </Typography>
            </Button>
            </Box>
          </Box>
        </Paper>

        {/* 角色管理 */}
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 600,
                    fontSize: { xs: '1rem', sm: '1.1rem' }
                  }}
                >
                  辩论角色管理
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                >
                  创建和管理AI辩论中的各种角色
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddRole}
                sx={{
                  background: 'linear-gradient(90deg, #9333EA, #754AB4)',
                  fontWeight: 600,
                  '&:hover': {
                    background: 'linear-gradient(90deg, #8324DB, #6D3CAF)',
                  },
                }}
              >
                添加角色
              </Button>
            </Box>
          </Box>

          <Divider />

          <Box sx={{ p: { xs: 1.5, sm: 2 } }}>

          {config.roles.length === 0 ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              还没有配置任何辩论角色。点击"添加角色"开始配置。
            </Alert>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
              {config.roles.map((role) => (
                <Card key={role.id} sx={{ border: 1, borderColor: 'divider' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: role.color,
                          mr: 1
                        }}
                      />
                      <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        {role.name}
                      </Typography>
                      <Chip
                        label={role.stance}
                        size="small"
                        color={
                          role.stance === 'pro' ? 'success' :
                          role.stance === 'con' ? 'error' :
                          role.stance === 'moderator' ? 'secondary' :
                          role.stance === 'summary' ? 'info' : 'default'
                        }
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {role.description}
                    </Typography>
                    {role.modelId && (
                      <Typography variant="caption" color="primary" sx={{ mb: 1, display: 'block' }}>
                        🤖 模型: {availableModels.find(m => m.id === role.modelId)?.name || role.modelId}
                      </Typography>
                    )}
                    <Typography variant="caption" sx={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {role.systemPrompt}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button size="small" startIcon={<EditIcon />} onClick={() => handleEditRole(role)}>
                      编辑
                    </Button>
                    <Button size="small" startIcon={<DeleteIcon />} onClick={() => handleDeleteRole(role.id)} color="error">
                      删除
                    </Button>
                  </CardActions>
                </Card>
              ))}
            </Box>
          )}
          </Box>
        </Paper>
      </Box>

      {/* 角色编辑对话框 */}
      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingRole ? '编辑角色' : '添加新角色'}
        </DialogTitle>
        <DialogContent>
          {/* 预设模板 */}
          {!editingRole && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                快速模板：
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {roleTemplates.map((template, index) => (
                  <Chip
                    key={index}
                    label={template.name}
                    onClick={() => handleUseTemplate(template)}
                    sx={{ bgcolor: template.color, color: 'white' }}
                  />
                ))}
              </Box>
              <Divider sx={{ my: 2 }} />
            </Box>
          )}

          <Box sx={{ display: 'grid', gap: 2 }}>
            <TextField
              label="角色名称"
              value={newRole.name || ''}
              onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
              required
            />

            <TextField
              label="角色描述"
              value={newRole.description || ''}
              onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
              multiline
              rows={2}
            />

            <FormControl sx={{ mb: 2 }}>
              <InputLabel>角色立场</InputLabel>
              <Select
                value={newRole.stance || 'pro'}
                onChange={(e) => setNewRole({ ...newRole, stance: e.target.value as any })}
              >
                <MenuItem value="pro">正方</MenuItem>
                <MenuItem value="con">反方</MenuItem>
                <MenuItem value="neutral">中立</MenuItem>
                <MenuItem value="moderator">主持人</MenuItem>
                <MenuItem value="summary">总结</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                指定模型（可选）
              </Typography>
              <DropdownModelSelector
                selectedModel={availableModels.find(m => m.id === newRole.modelId) || null}
                availableModels={availableModels}
                handleModelSelect={(model) => setNewRole({ ...newRole, modelId: model?.id || '' })}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                留空则使用默认模型
              </Typography>
            </Box>

            <TextField
              label="系统提示词"
              value={newRole.systemPrompt || ''}
              onChange={(e) => setNewRole({ ...newRole, systemPrompt: e.target.value })}
              multiline
              rows={6}
              required
              helperText="定义这个AI角色的行为、立场和回应风格"
            />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                角色颜色
              </Typography>
              <input
                type="color"
                value={newRole.color || '#2196f3'}
                onChange={(e) => setNewRole({ ...newRole, color: e.target.value })}
                style={{ width: '100%', height: '40px', border: 'none', borderRadius: '4px' }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialogOpen(false)}>
            取消
          </Button>
          <Button onClick={handleSaveRole} variant="contained" disabled={!newRole.name || !newRole.systemPrompt}>
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AIDebateSettings;
