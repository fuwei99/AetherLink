import type { Message } from '../shared/types/newMessage';
import { getMainTextContent, findThinkingBlocks, findCitationBlocks } from '../shared/utils/messageUtils';
import { convertMathFormula, removeSpecialCharactersForFileName } from './formats';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Clipboard } from '@capacitor/clipboard';

import dayjs from 'dayjs';
import html2canvas from 'html2canvas';

/**
 * 获取消息标题
 */
export async function getMessageTitle(message: Message): Promise<string> {
  const content = getMainTextContent(message);
  if (!content) return 'Untitled';

  // 取前50个字符作为标题
  const title = content.substring(0, 50).replace(/\n/g, ' ').trim();
  return title || 'Untitled';
}

/**
 * 创建基础Markdown内容
 */
function createBaseMarkdown(message: Message, includeReasoning = false, forceDollarMathInMarkdown = true) {
  const content = getMainTextContent(message);
  const thinkingBlocks = findThinkingBlocks(message);
  const citationBlocks = findCitationBlocks(message);

  // 标题部分
  const titleSection = message.role === 'user' ? '## 用户' : '## 助手';

  // 推理部分
  let reasoningSection = '';
  if (includeReasoning && thinkingBlocks.length > 0) {
    const thinkingContent = thinkingBlocks.map(block => block.content).join('\n\n');
    if (thinkingContent.trim()) {
      reasoningSection = `### 思考过程\n\n${thinkingContent}\n\n### 回答\n\n`;
    }
  }

  // 内容部分
  const contentSection = forceDollarMathInMarkdown ? convertMathFormula(content) : content;

  // 引用部分
  let citation = '';
  if (citationBlocks.length > 0) {
    const citationContent = citationBlocks.map(block => block.content).join('\n\n');
    if (citationContent.trim()) {
      citation = `### 引用\n\n${citationContent}`;
    }
  }

  return { titleSection, reasoningSection, contentSection, citation };
}

/**
 * 将消息转换为Markdown格式
 */
export function messageToMarkdown(message: Message): string {
  const { titleSection, contentSection, citation } = createBaseMarkdown(message);
  return [titleSection, '', contentSection, citation].filter(Boolean).join('\n\n');
}

/**
 * 将消息转换为包含推理的Markdown格式
 */
export function messageToMarkdownWithReasoning(message: Message): string {
  const { titleSection, reasoningSection, contentSection, citation } = createBaseMarkdown(message, true);
  return [titleSection, '', reasoningSection + contentSection, citation].filter(Boolean).join('\n\n');
}

/**
 * 将多个消息转换为Markdown格式
 */
export function messagesToMarkdown(messages: Message[], exportReasoning = false): string {
  return messages
    .map(message => exportReasoning ? messageToMarkdownWithReasoning(message) : messageToMarkdown(message))
    .join('\n\n---\n\n');
}

/**
 * 导出消息为Markdown文件
 */
export async function exportMessageAsMarkdown(message: Message, exportReasoning = false): Promise<void> {
  try {
    const title = await getMessageTitle(message);
    const timestamp = dayjs().format('YYYY-MM-DD-HH-mm-ss');
    const fileName = `${removeSpecialCharactersForFileName(title)}_${timestamp}.md`;
    const markdown = exportReasoning ? messageToMarkdownWithReasoning(message) : messageToMarkdown(message);

    if (Capacitor.isNativePlatform()) {
      // 移动端：直接使用分享API，让用户选择保存位置
      try {
        // 创建临时文件
        const tempFileName = `temp_${Date.now()}.md`;
        await Filesystem.writeFile({
          path: tempFileName,
          data: markdown,
          directory: Directory.Cache,
          encoding: Encoding.UTF8
        });

        // 获取文件URI
        const fileUri = await Filesystem.getUri({
          path: tempFileName,
          directory: Directory.Cache
        });

        // 使用分享API
        await Share.share({
          title: '导出Markdown文件',
          text: markdown,
          url: fileUri.uri,
          dialogTitle: '保存Markdown文件'
        });

        // 清理临时文件
        try {
          await Filesystem.deleteFile({
            path: tempFileName,
            directory: Directory.Cache
          });
        } catch (deleteError) {
          console.warn('清理临时文件失败:', deleteError);
        }

      } catch (shareError) {
        console.warn('分享失败，尝试复制到剪贴板:', shareError);
        // 回退到复制到剪贴板
        await Clipboard.write({ string: markdown });
        alert('分享失败，内容已复制到剪贴板');
      }
    } else {
      // Web端：使用下载链接
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('导出Markdown失败:', error);
    alert('导出失败: ' + (error as Error).message);
  }
}

/**
 * 复制消息为Markdown格式到剪贴板
 */
export async function copyMessageAsMarkdown(message: Message, exportReasoning = false): Promise<void> {
  try {
    const markdown = exportReasoning ? messageToMarkdownWithReasoning(message) : messageToMarkdown(message);

    // 优先使用Capacitor Clipboard插件（移动端）
    try {
      await Clipboard.write({
        string: markdown
      });
    } catch (capacitorError) {
      // 如果Capacitor失败，回退到Web API
      await navigator.clipboard.writeText(markdown);
    }

    // 复制成功，可以考虑使用更优雅的提示方式
    alert('Markdown内容已复制到剪贴板');
  } catch (error) {
    console.error('复制Markdown失败:', error);
    alert('复制失败');
  }
}

/**
 * 导出到Obsidian（通过URL Scheme）
 */
export async function exportToObsidian(message: Message, options: {
  vault?: string;
  folder?: string;
  processingMethod?: '1' | '2' | '3'; // 1: append, 2: prepend, 3: overwrite
  includeReasoning?: boolean;
} = {}): Promise<void> {
  try {
    const title = await getMessageTitle(message);
    const markdown = options.includeReasoning ?
      messageToMarkdownWithReasoning(message) :
      messageToMarkdown(message);

    // 复制内容到剪贴板
    await Clipboard.write({ string: markdown });

    // 构建Obsidian URL
    const fileName = removeSpecialCharactersForFileName(title) + '.md';
    const filePath = options.folder ? `${options.folder}/${fileName}` : fileName;

    let obsidianUrl = `obsidian://new?file=${encodeURIComponent(filePath)}&clipboard=true`;

    if (options.vault) {
      obsidianUrl += `&vault=${encodeURIComponent(options.vault)}`;
    }

    if (options.processingMethod === '3') {
      obsidianUrl += '&overwrite=true';
    } else if (options.processingMethod === '2') {
      obsidianUrl += '&prepend=true';
    } else if (options.processingMethod === '1') {
      obsidianUrl += '&append=true';
    }

    // 打开Obsidian
    window.open(obsidianUrl, '_system');
    // 简化提示，避免过多弹窗
    alert('正在打开Obsidian...');
  } catch (error) {
    console.error('导出到Obsidian失败:', error);
    alert('导出到Obsidian失败');
  }
}

/**
 * 分享消息内容
 */
export async function shareMessage(message: Message, format: 'text' | 'markdown' = 'text'): Promise<void> {
  try {
    let content: string;
    let title: string;

    if (format === 'markdown') {
      content = messageToMarkdown(message);
      title = '分享Markdown内容';
    } else {
      content = getMainTextContent(message);
      title = '分享消息内容';
    }

    if (Capacitor.isNativePlatform()) {
      await Share.share({
        title,
        text: content,
        dialogTitle: title
      });
    } else {
      // Web端回退到复制到剪贴板
      await navigator.clipboard.writeText(content);
      alert('内容已复制到剪贴板');
    }
  } catch (error) {
    console.error('分享失败:', error);
    alert('分享失败');
  }
}

/**
 * 截图消息并复制到剪贴板
 */
export async function captureMessageAsImage(messageElement: HTMLElement): Promise<void> {
  try {
    const canvas = await html2canvas(messageElement, {
      backgroundColor: null,
      scale: 2, // 提高清晰度
      useCORS: true,
      allowTaint: true
    });

    if (Capacitor.isNativePlatform()) {
      // 移动端：转换为base64并复制
      const dataUrl = canvas.toDataURL('image/png');
      const base64Data = dataUrl.split(',')[1];

      try {
        // 在移动端，我们将图片保存为临时文件然后分享
        const tempFileName = `temp_image_${Date.now()}.png`;
        await Filesystem.writeFile({
          path: tempFileName,
          data: base64Data,
          directory: Directory.Cache
        });

        const fileUri = await Filesystem.getUri({
          path: tempFileName,
          directory: Directory.Cache
        });

        await Share.share({
          title: '复制图片',
          url: fileUri.uri,
          dialogTitle: '复制图片'
        });

        // 清理临时文件
        try {
          await Filesystem.deleteFile({
            path: tempFileName,
            directory: Directory.Cache
          });
        } catch (deleteError) {
          console.warn('清理临时文件失败:', deleteError);
        }

      } catch (shareError) {
        console.warn('分享失败:', shareError);
        alert('复制图片失败');
      }
    } else {
      // Web端：转换为blob并复制到剪贴板
      canvas.toBlob(async (blob) => {
        if (!blob) {
          throw new Error('截图失败');
        }

        try {
          // 尝试复制到剪贴板
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          alert('图片已复制到剪贴板');
        } catch (clipboardError) {
          console.warn('复制到剪贴板失败，尝试下载:', clipboardError);

          // 回退到下载
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `message_${dayjs().format('YYYY-MM-DD-HH-mm-ss')}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    }
  } catch (error) {
    console.error('截图失败:', error);
    alert('截图失败');
  }
}

/**
 * 截图消息并保存为文件
 */
export async function exportMessageAsImage(messageElement: HTMLElement): Promise<void> {
  try {
    const canvas = await html2canvas(messageElement, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      allowTaint: true
    });

    const timestamp = dayjs().format('YYYY-MM-DD-HH-mm-ss');
    const fileName = `message_${timestamp}.png`;

    if (Capacitor.isNativePlatform()) {
      // 移动端：转换为base64并通过分享API保存
      const dataUrl = canvas.toDataURL('image/png');
      const base64Data = dataUrl.split(',')[1];

      try {
        // 创建临时文件
        const tempFileName = `temp_export_${Date.now()}.png`;
        await Filesystem.writeFile({
          path: tempFileName,
          data: base64Data,
          directory: Directory.Cache
        });

        // 获取文件URI
        const fileUri = await Filesystem.getUri({
          path: tempFileName,
          directory: Directory.Cache
        });

        // 使用分享API让用户选择保存位置
        await Share.share({
          title: '导出消息图片',
          url: fileUri.uri,
          dialogTitle: '保存图片'
        });

        // 清理临时文件
        try {
          await Filesystem.deleteFile({
            path: tempFileName,
            directory: Directory.Cache
          });
        } catch (deleteError) {
          console.warn('清理临时文件失败:', deleteError);
        }

      } catch (shareError) {
        console.warn('分享失败:', shareError);
        alert('导出图片失败');
      }
    } else {
      // Web端：直接下载
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    }
  } catch (error) {
    console.error('导出图片失败:', error);
    alert('导出图片失败');
  }
}
