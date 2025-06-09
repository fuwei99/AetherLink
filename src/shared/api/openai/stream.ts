/**
 * OpenAI流式响应模块
 * 负责处理流式响应
 * 使用与最佳实例一致的for await循环处理流式响应
 */
import { logApiRequest } from '../../services/LoggerService';
import { EventEmitter, EVENT_NAMES } from '../../services/EventEmitter';
import { hasToolUseTags } from '../../utils/mcpToolParser';
import { ChunkType } from '../../types/chunk';

/**
 * 流式完成请求
 * @param openai OpenAI客户端实例
 * @param modelId 模型ID
 * @param messages 消息数组
 * @param temperature 温度参数
 * @param maxTokens 最大token数
 * @param onUpdate 更新回调函数
 * @param additionalParams 额外请求参数
 * @returns 响应内容
 */
export async function streamCompletion(
  openai: any, // 使用any类型代替OpenAI类型
  modelId: string,
  messages: any[], // 使用any[]类型代替OpenAI.Chat.ChatCompletionMessageParam[]
  temperature?: number,
  maxTokens?: number,
  onUpdate?: (content: string, reasoning?: string) => void,
  additionalParams?: Record<string, any>,
  onChunk?: (chunk: any) => void
): Promise<string | { content: string; reasoning?: string; reasoningTime?: number }> {
  try {




    // 创建流式请求参数
    const streamParams: any = {
      model: modelId,
      messages: messages,
      temperature: temperature,
      max_tokens: maxTokens,
      stream: true,
    };

    // 合并额外参数，但确保必要的参数不被覆盖
    if (additionalParams) {
      // 先删除基本参数和内部参数以确保它们不会被覆盖
      const {
        model,
        messages,
        stream,
        enableTools,
        mcpTools,
        enableReasoning,
        signal,
        ...otherParams
      } = additionalParams;
      Object.assign(streamParams, otherParams);
    }



    // 记录API请求
    logApiRequest('OpenAI Chat Completions Stream', 'INFO', {
      model: modelId,
      messages: messages.map(m => ({ role: m.role, content: typeof m.content === 'string' ? m.content.substring(0, 50) + '...' : '[complex content]' })),
      temperature,
      max_tokens: maxTokens,
      stream: true,
      ...streamParams
    });

    // 获取中断信号
    const signal = additionalParams?.signal;

    // 创建流式响应，支持中断
    const stream = await openai.chat.completions.create({
      ...streamParams,
      signal // 添加中断信号支持
    }) as unknown as AsyncIterable<any>;

    // 初始化变量
    let fullContent = '';
    let fullReasoning = '';
    let previousReasoningLength = 0; // 记录上次推理内容的长度，用于计算增量
    let hasReasoningContent = false;
    let reasoningStartTime = 0;
    let reasoningEndTime = 0;
    let isFirstChunk = true;

    // 用于处理<think>标签的状态
    let contentBuffer = ''; // 缓冲区，用于处理跨chunk的标签
    let isInThinkTag = false; // 是否在<think>标签内
    let thinkBuffer = ''; // 思考内容缓冲区

    // 检查是否启用推理
    const enableReasoning = additionalParams?.enableReasoning !== false;

    try {
      // 直接使用for await循环处理流式响应
      for await (const chunk of stream) {
        // 检查是否已被中断
        if (signal?.aborted) {
          console.log('[streamCompletion] 检测到中断信号，停止处理流式响应');
          break;
        }

        // 提取delta内容
        const delta = chunk.choices[0]?.delta;
        const content = delta?.content || '';
        // 支持多种推理内容字段：reasoning（OpenAI）、reasoning_content（Grok、DeepSeek）
        const reasoning = delta?.reasoning || delta?.reasoning_content || '';

        // 处理推理内容
        if (reasoning && reasoning.trim() && enableReasoning) {
          if (!hasReasoningContent) {
            hasReasoningContent = true;
            reasoningStartTime = Date.now();
            console.log('[streamCompletion] 开始接收推理内容');
          }
          fullReasoning += reasoning;

          // 计算推理内容的增量
          const reasoningDelta = fullReasoning.slice(previousReasoningLength);
          previousReasoningLength = fullReasoning.length;

          console.log(`[streamCompletion] 推理增量: "${reasoningDelta}", 总长度: ${fullReasoning.length}`);

          // 如果有推理增量，单独调用回调传递推理内容
          if (reasoningDelta && onUpdate) {
            onUpdate('', reasoningDelta); // 只传递推理增量，内容为空
          }
        }

        // 处理普通内容，包括<think>标签的解析
        if (content) {
          // 将当前内容添加到缓冲区
          contentBuffer += content;

          // 处理<think>标签
          while (contentBuffer.length > 0) {
            if (!isInThinkTag) {
              // 查找<think>开始标签
              const thinkStartIndex = contentBuffer.indexOf('<think>');
              if (thinkStartIndex !== -1) {
                // 处理<think>标签之前的普通内容
                const beforeThink = contentBuffer.substring(0, thinkStartIndex);
                if (beforeThink) {
                  fullContent += beforeThink;
                  if (onUpdate) {
                    onUpdate(beforeThink);
                  }

                  EventEmitter.emit(EVENT_NAMES.STREAM_TEXT_DELTA, {
                    text: beforeThink,
                    isFirstChunk: isFirstChunk,
                    chunkLength: beforeThink.length,
                    fullContentLength: fullContent.length,
                    timestamp: Date.now()
                  });

                  if (isFirstChunk && beforeThink.trim()) {
                    EventEmitter.emit(EVENT_NAMES.STREAM_TEXT_FIRST_CHUNK, {
                      text: beforeThink,
                      fullContent: beforeThink,
                      timestamp: Date.now()
                    });
                    isFirstChunk = false;
                  }
                }

                // 进入思考模式
                isInThinkTag = true;
                if (!hasReasoningContent) {
                  hasReasoningContent = true;
                  reasoningStartTime = Date.now();
                  console.log('[streamCompletion] 开始接收<think>标签思考内容');
                }

                // 移除已处理的内容
                contentBuffer = contentBuffer.substring(thinkStartIndex + 7); // 7 = '<think>'.length
              } else {
                // 没有找到<think>标签，处理所有普通内容
                if (contentBuffer) {
                  fullContent += contentBuffer;
                  if (onUpdate) {
                    onUpdate(contentBuffer);
                  }

                  EventEmitter.emit(EVENT_NAMES.STREAM_TEXT_DELTA, {
                    text: contentBuffer,
                    isFirstChunk: isFirstChunk,
                    chunkLength: contentBuffer.length,
                    fullContentLength: fullContent.length,
                    timestamp: Date.now()
                  });

                  if (isFirstChunk && contentBuffer.trim()) {
                    EventEmitter.emit(EVENT_NAMES.STREAM_TEXT_FIRST_CHUNK, {
                      text: contentBuffer,
                      fullContent: contentBuffer,
                      timestamp: Date.now()
                    });
                    isFirstChunk = false;
                  }
                }
                contentBuffer = '';
                break;
              }
            } else {
              // 在<think>标签内，查找</think>结束标签
              const thinkEndIndex = contentBuffer.indexOf('</think>');
              if (thinkEndIndex !== -1) {
                // 处理思考内容
                const thinkContent = contentBuffer.substring(0, thinkEndIndex);
                if (thinkContent) {
                  thinkBuffer += thinkContent;
                  fullReasoning += thinkContent;
                  // 发送思考内容事件
                  if (onChunk) {
                    onChunk({
                      type: ChunkType.THINKING_DELTA,
                      text: thinkContent,
                      thinking_millsec: Date.now() - reasoningStartTime
                    });
                  }
                }

                // 退出思考模式
                isInThinkTag = false;
                if (hasReasoningContent && reasoningEndTime === 0) {
                  reasoningEndTime = Date.now();
                }

                // 移除已处理的内容
                contentBuffer = contentBuffer.substring(thinkEndIndex + 8); // 8 = '</think>'.length
              } else {
                // 没有找到结束标签，将所有内容作为思考内容
                if (contentBuffer) {
                  thinkBuffer += contentBuffer;
                  fullReasoning += contentBuffer;
                  // 发送思考内容片段事件
                  if (onChunk) {
                    onChunk({
                      type: ChunkType.THINKING_DELTA,
                      text: contentBuffer,
                      thinking_millsec: Date.now() - reasoningStartTime
                    });
                  }
                }
                contentBuffer = '';
                break;
              }
            }
          }
        }

        // 处理完成原因
        const finishReason = chunk.choices[0]?.finish_reason;
        if (finishReason) {
          // 在处理完成之前，确保缓冲区中的所有内容都已处理
          if (contentBuffer.length > 0) {
            if (isInThinkTag) {
              // 如果还在思考标签内，将剩余内容作为思考内容
              thinkBuffer += contentBuffer;
              fullReasoning += contentBuffer;
              if (onChunk) {
                onChunk({
                  type: ChunkType.THINKING_DELTA,
                  text: contentBuffer,
                  thinking_millsec: Date.now() - reasoningStartTime
                });
              }
            } else {
              // 否则作为普通内容处理
              fullContent += contentBuffer;
              if (onUpdate) {
                onUpdate(contentBuffer);
              }

              EventEmitter.emit(EVENT_NAMES.STREAM_TEXT_DELTA, {
                text: contentBuffer,
                isFirstChunk: isFirstChunk,
                chunkLength: contentBuffer.length,
                fullContentLength: fullContent.length,
                timestamp: Date.now()
              });

              if (isFirstChunk && contentBuffer.trim()) {
                EventEmitter.emit(EVENT_NAMES.STREAM_TEXT_FIRST_CHUNK, {
                  text: contentBuffer,
                  fullContent: contentBuffer,
                  timestamp: Date.now()
                });
                isFirstChunk = false;
              }
            }
            contentBuffer = '';
          }

          // 如果有推理内容但还没记录结束时间，现在记录
          if (hasReasoningContent && reasoningEndTime === 0) {
            reasoningEndTime = Date.now();
          }

          console.log(`[streamCompletion] 流式响应完成，最终内容长度: ${fullContent.length}, 推理长度: ${fullReasoning.length}`);

          // 发送完成事件
          EventEmitter.emit(EVENT_NAMES.STREAM_TEXT_COMPLETE, {
            text: fullContent,
            reasoning: fullReasoning || undefined,
            reasoningTime: hasReasoningContent ? reasoningEndTime - reasoningStartTime : undefined,
            timestamp: Date.now()
          });

          break;
        }
      }
    } catch (error: any) {
      // 检查是否为中断错误
      if (signal?.aborted || error?.name === 'AbortError' || error?.message?.includes('aborted')) {
        console.log('[streamCompletion] 流式响应被中断，返回当前内容');

        // 在内容末尾添加中断警告（这里只是标记，实际警告在 ResponseHandler 中添加）
        // 这样可以让上层知道这是被中断的响应

        // 发送完成事件而不是错误事件
        EventEmitter.emit(EVENT_NAMES.STREAM_TEXT_COMPLETE, {
          text: fullContent,
          reasoning: fullReasoning || undefined,
          reasoningTime: hasReasoningContent ? reasoningEndTime - reasoningStartTime : undefined,
          timestamp: Date.now(),
          interrupted: true // 标记为被中断
        });

        // 返回当前已处理的内容
        if (hasReasoningContent && fullReasoning) {
          const reasoningTime = reasoningEndTime > reasoningStartTime ? reasoningEndTime - reasoningStartTime : 0;
          return {
            content: fullContent,
            reasoning: fullReasoning,
            reasoningTime
          };
        }
        return fullContent;
      }

      // 发送错误事件
      EventEmitter.emit(EVENT_NAMES.STREAM_ERROR, {
        error,
        timestamp: Date.now()
      });

      throw error;
    }

    // 检查是否需要处理工具调用
    const enableTools = additionalParams?.enableTools;
    const mcpTools = additionalParams?.mcpTools;

    if (enableTools && mcpTools && mcpTools.length > 0 && fullContent) {
      // 检查是否包含工具调用
      const hasTools = hasToolUseTags(fullContent, mcpTools);

      if (hasTools) {

        // 这里我们需要触发工具调用处理
        // 但由于 streamCompletion 是底层函数，我们只能返回特殊标记
        // 让上层的 Provider 处理工具调用
        return {
          content: fullContent,
          reasoning: fullReasoning,
          reasoningTime: hasReasoningContent && fullReasoning ? (reasoningEndTime > reasoningStartTime ? reasoningEndTime - reasoningStartTime : 0) : undefined,
          hasToolCalls: true
        } as any;
      }
    }

    // 返回结果 - 如果有推理内容，返回对象；否则返回字符串
    if (hasReasoningContent && fullReasoning) {
      const reasoningTime = reasoningEndTime > reasoningStartTime ? reasoningEndTime - reasoningStartTime : 0;
      return {
        content: fullContent,
        reasoning: fullReasoning,
        reasoningTime
      };
    }

    return fullContent;
  } catch (error: any) {
    console.error('[streamCompletion] 流式响应处理失败:', error);
    console.error('[streamCompletion] 错误详情:', error.message);

    // 直接抛出错误，不进行重试 - 与最佳实例保持一致
    throw error;
  }
}
