/**
 * 错误块测试组件
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import ErrorBlock from '../components/message/blocks/ErrorBlock';
import { MessageBlockType, MessageBlockStatus } from '../shared/types/newMessage';
import type { ErrorMessageBlock } from '../shared/types/newMessage';

const ApiKeyErrorTest: React.FC = () => {
  // 测试错误样例
  const testErrors = [
    {
      name: '401 认证失败',
      error: {
        status: 401,
        message: 'API key 无效',
        response: {
          error: {
            message: "Incorrect API key provided: sk-proj-****. You can find your API key at https://platform.openai.com/account/api-keys.",
            type: "invalid_request_error",
            param: null,
            code: "invalid_api_key"
          }
        }
      }
    },
    {
      name: '403 权限拒绝',
      error: {
        status: 403,
        message: 'API key 已暂停',
        data: "You exceeded your current quota, please check your plan and billing details."
      }
    },
    {
      name: '500 服务器错误',
      error: {
        status: 500,
        message: '服务器内部错误',
        details: "The server had an error while processing your request. Sorry about that!"
      }
    },
    {
      name: '普通错误',
      error: {
        message: '网络连接失败',
        response: "Connection timeout after 30 seconds"
      }
    }
  ];

  const createErrorBlock = (error: any): ErrorMessageBlock => ({
    id: `error-${Math.random()}`,
    messageId: 'test',
    type: MessageBlockType.ERROR,
    content: error.message,
    createdAt: new Date().toISOString(),
    status: MessageBlockStatus.ERROR,
    error
  });

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        错误块测试
      </Typography>

      {testErrors.map((testCase, index) => (
        <Box key={index} sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {testCase.name}
          </Typography>
          <ErrorBlock block={createErrorBlock(testCase.error)} />
        </Box>
      ))}
    </Box>
  );
};

export default ApiKeyErrorTest;
