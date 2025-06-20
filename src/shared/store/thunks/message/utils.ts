import { dexieStorage } from '../../../services/DexieStorageService';
import { throttle } from 'lodash';
import type { Message, MessageBlock } from '../../../types/newMessage';

export const saveMessageAndBlocksToDB = async (message: Message, blocks: MessageBlock[]) => {
  try {
    // 使用事务保证原子性
    await dexieStorage.transaction('rw', [
      dexieStorage.topics,
      dexieStorage.messages,
      dexieStorage.message_blocks
    ], async () => {
      // 保存消息块
      if (blocks.length > 0) {
        await dexieStorage.bulkSaveMessageBlocks(blocks);
      }

      // 保存消息到messages表（保持兼容性）
      await dexieStorage.messages.put(message);

      // 更新topics表中的messages数组（改造为：按时间顺序存储）
      const topic = await dexieStorage.topics.get(message.topicId);
      if (topic) {
        // 确保messages数组存在
        if (!topic.messages) {
          topic.messages = [];
        }

        // 查找消息在数组中的位置
        const messageIndex = topic.messages.findIndex((m: Message) => m.id === message.id);

        if (messageIndex >= 0) {
          // 更新现有消息
          topic.messages[messageIndex] = message;
          console.log(`[saveMessageAndBlocksToDB] 更新现有消息 ${message.id} 在位置 ${messageIndex}`);
        } else {
          // ：按时间顺序插入新消息
          const newMessageTime = new Date(message.createdAt).getTime();
          let insertIndex = topic.messages.length;

          // 找到正确的插入位置（保持时间升序）
          for (let i = topic.messages.length - 1; i >= 0; i--) {
            const existingMessage = topic.messages[i];
            const existingTime = new Date(existingMessage.createdAt).getTime();
            if (newMessageTime >= existingTime) {
              insertIndex = i + 1;
              break;
            }
            insertIndex = i;
          }

          // 在正确位置插入消息
          topic.messages.splice(insertIndex, 0, message);
          console.log(`[saveMessageAndBlocksToDB] 插入新消息 ${message.id} 到位置 ${insertIndex}，时间: ${message.createdAt}`);
        }

        // 同时更新messageIds数组（保持兼容性和顺序）
        if (!topic.messageIds) {
          topic.messageIds = [];
        }

        // 重新构建messageIds数组以保持与messages数组的顺序一致
        topic.messageIds = topic.messages.map((m: Message) => m.id);

        // 更新话题的lastMessageTime
        topic.lastMessageTime = message.createdAt || message.updatedAt || new Date().toISOString();

        // 保存更新后的话题
        await dexieStorage.topics.put(topic);
        console.log(`[saveMessageAndBlocksToDB] 话题 ${topic.id} 现有 ${topic.messages.length} 条有序消息`);
      }
    });
  } catch (error) {
    console.error('保存消息和块到数据库失败:', error);
    throw error;
  }
};

export const throttledBlockUpdate = throttle(async (id: string, blockUpdate: Partial<MessageBlock>) => {
  // 只更新数据库，Redux状态由ResponseHandler处理
  await dexieStorage.updateMessageBlock(id, blockUpdate);
}, 150);