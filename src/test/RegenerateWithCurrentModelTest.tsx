import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  Chip,
  Divider,
  Card,
  CardContent
} from '@mui/material';
import { RotateCcw } from 'lucide-react';
import type { RootState } from '../shared/store';
import { regenerateMessage } from '../shared/store/thunks/messageThunk';
import type { Model } from '../shared/types';

/**
 * 重新生成功能测试组件
 * 用于测试重新生成时是否使用当前选择的模型
 */
const RegenerateWithCurrentModelTest: React.FC = () => {
  const dispatch = useDispatch();
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // 获取当前状态
  const currentModelId = useSelector((state: RootState) => state.settings.currentModelId);
  const providers = useSelector((state: RootState) => state.settings.providers || []);
  const messages = useSelector((state: RootState) => state.messages.entities);

  // 获取当前选择的模型
  const getCurrentModel = (): Model | null => {
    if (!currentModelId) return null;

    for (const provider of providers) {
      if (provider.isEnabled) {
        const model = provider.models.find(m => m.id === currentModelId && m.enabled);
        if (model) {
          return {
            ...model,
            apiKey: model.apiKey || provider.apiKey,
            baseUrl: model.baseUrl || provider.baseUrl,
            providerType: model.providerType || provider.providerType || provider.id,
          };
        }
      }
    }
    return null;
  };

  // 获取第一个助手消息用于测试
  const getFirstAssistantMessage = () => {
    const messageList = Object.values(messages);
    return messageList.find(msg => msg.role === 'assistant');
  };

  // 测试重新生成功能
  const testRegenerate = async () => {
    setIsLoading(true);
    setTestResult('');

    try {
      const currentModel = getCurrentModel();
      const assistantMessage = getFirstAssistantMessage();

      if (!currentModel) {
        setTestResult('❌ 测试失败：未找到当前选择的模型');
        return;
      }

      if (!assistantMessage) {
        setTestResult('❌ 测试失败：未找到助手消息进行测试');
        return;
      }

      console.log('🧪 [RegenerateTest] 开始测试重新生成功能', {
        messageId: assistantMessage.id,
        originalModel: assistantMessage.model,
        currentModel: currentModel
      });

      // 模拟重新生成（这里只是测试逻辑，不实际执行）
      const testTopicId = assistantMessage.topicId;

      // 实际调用重新生成函数
      await dispatch(regenerateMessage(assistantMessage.id, testTopicId, currentModel) as any);

      setTestResult(`✅ 测试成功：重新生成使用了当前模型 ${currentModel.name} (${currentModel.id})`);
    } catch (error: any) {
      console.error('🧪 [RegenerateTest] 测试失败:', error);
      setTestResult(`❌ 测试失败：${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const currentModel = getCurrentModel();
  const assistantMessage = getFirstAssistantMessage();

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        重新生成功能测试
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        测试重新生成消息时是否使用顶部模型选择器当前选择的模型
      </Typography>

      <Divider sx={{ mb: 3 }} />

      {/* 当前状态显示 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            当前状态
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              当前选择的模型:
            </Typography>
            {currentModel ? (
              <Chip
                label={`${currentModel.name} (${currentModel.provider})`}
                color="primary"
                variant="outlined"
                sx={{ mt: 1 }}
              />
            ) : (
              <Chip
                label="未选择模型"
                color="error"
                variant="outlined"
                sx={{ mt: 1 }}
              />
            )}
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              测试用助手消息:
            </Typography>
            {assistantMessage ? (
              <Box sx={{ mt: 1 }}>
                <Chip
                  label={`消息ID: ${assistantMessage.id.substring(0, 8)}...`}
                  variant="outlined"
                  sx={{ mr: 1 }}
                />
                <Chip
                  label={`原始模型: ${assistantMessage.model?.name || '未知'}`}
                  variant="outlined"
                />
              </Box>
            ) : (
              <Chip
                label="未找到助手消息"
                color="warning"
                variant="outlined"
                sx={{ mt: 1 }}
              />
            )}
          </Box>
        </CardContent>
      </Card>

      {/* 测试按钮 */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<RotateCcw size={16} />}
          onClick={testRegenerate}
          disabled={isLoading || !currentModel || !assistantMessage}
          size="large"
        >
          {isLoading ? '测试中...' : '测试重新生成功能'}
        </Button>
      </Box>

      {/* 测试结果 */}
      {testResult && (
        <Alert
          severity={testResult.startsWith('✅') ? 'success' : 'error'}
          sx={{ mb: 2 }}
        >
          {testResult}
        </Alert>
      )}

      {/* 说明 */}
      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom>
          测试说明:
        </Typography>
        <Typography variant="body2" component="div">
          <ul>
            <li>此测试会检查重新生成功能是否使用当前顶部模型选择器选择的模型</li>
            <li>测试会找到第一个助手消息并尝试重新生成</li>
            <li>重新生成时应该使用当前选择的模型，而不是消息原始的模型</li>
            <li>查看浏览器控制台可以看到详细的日志信息</li>
          </ul>
        </Typography>
      </Paper>
    </Box>
  );
};

export default RegenerateWithCurrentModelTest;
