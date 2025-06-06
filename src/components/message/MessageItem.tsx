import React from 'react';
import type { MessageItemProps } from './types/MessageComponent';
import { useMessageData } from './hooks/useMessageData';
import { useMessageBlocks } from './hooks/useMessageBlocks';
import BubbleStyleMessage from './styles/BubbleStyleMessage';
import MinimalStyleMessage from './styles/MinimalStyleMessage';

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  showAvatar = true,
  isCompact = false,
  messageIndex,
  onRegenerate,
  onDelete,
  onSwitchVersion,
  onResend,
  forceUpdate
}) => {
  // 使用自定义hooks获取消息数据
  const messageData = useMessageData(message);
  const { loading } = useMessageBlocks(message, messageData.blocks, forceUpdate);

  // 准备传递给样式组件的props
  const styleProps = {
    message,
    showAvatar,
    isCompact,
    loading,
    modelAvatar: messageData.modelAvatar,
    userAvatar: messageData.userAvatar,
    showUserAvatar: messageData.showUserAvatar,
    showUserName: messageData.showUserName,
    showModelAvatar: messageData.showModelAvatar,
    showModelName: messageData.showModelName,
    showMessageDivider: messageData.showMessageDivider,
    settings: messageData.settings,
    themeColors: messageData.themeColors,
    themeStyle: messageData.themeStyle,
    theme: messageData.theme,
    getProviderName: messageData.getProviderName,
    messageIndex,
    onRegenerate,
    onDelete,
    onSwitchVersion,
    onResend
  };

  // 根据样式设置选择对应的组件
  if (messageData.isBubbleStyle) {
    return <BubbleStyleMessage {...styleProps} />;
  } else {
    return <MinimalStyleMessage {...styleProps} />;
  }
};

export default MessageItem;
