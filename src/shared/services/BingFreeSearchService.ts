/**
 * 免费Bing搜索服务
 * 使用 capacitor-cors-bypass-enhanced 插件绕过CORS限制
 */

import { CorsBypass } from 'capacitor-cors-bypass-enhanced';
import { Capacitor } from '@capacitor/core';
import { v4 as uuidv4 } from 'uuid';
import { parse } from 'node-html-parser';

export interface BingSearchOptions {
  query: string;
  maxResults?: number;
  language?: string;
  region?: string;
  safeSearch?: 'strict' | 'moderate' | 'off';
  freshness?: 'day' | 'week' | 'month';
  timeout?: number;
  fetchContent?: boolean; // 是否抓取链接内容
  maxContentLength?: number; // 最大内容长度
}

export interface BingSearchResult {
  id: string;
  title: string;
  url: string;
  snippet: string;
  timestamp: string;
  provider: string;
  score?: number;
  content?: string; // 抓取的页面内容
  contentLength?: number; // 内容长度
}

export interface BingSearchResponse {
  results: BingSearchResult[];
  query: string;
  totalResults?: number;
}

/**
 * 免费Bing搜索服务类
 * 通过解析Bing搜索页面HTML来获取搜索结果
 */
export class BingFreeSearchService {
  private static instance: BingFreeSearchService;
  private readonly baseUrl = 'https://cn.bing.com'; // 使用中文版Bing

  private constructor() {}

  public static getInstance(): BingFreeSearchService {
    if (!BingFreeSearchService.instance) {
      BingFreeSearchService.instance = new BingFreeSearchService();
    }
    return BingFreeSearchService.instance;
  }

  /**
   * 执行Bing搜索
   */
  public async search(options: BingSearchOptions): Promise<BingSearchResponse> {
    const {
      query,
      maxResults = 10,
      language = 'zh-CN',
      region = 'CN',
      safeSearch = 'moderate',
      freshness,
      timeout = 30000
    } = options;

    if (!query.trim()) {
      throw new Error('搜索查询不能为空');
    }

    console.log(`[BingFreeSearchService] 开始搜索: ${query}`);

    try {
      // 构建搜索URL
      const searchUrl = this.buildSearchUrl(query, {
        language,
        region,
        safeSearch,
        freshness,
        count: Math.min(maxResults, 50) // Bing最多返回50个结果
      });

      console.log(`[BingFreeSearchService] 搜索URL: ${searchUrl}`);

      // 使用 CorsBypass 插件获取搜索页面
      const response = await this.fetchSearchPage(searchUrl, timeout);

      // 解析搜索结果 - 使用 node-html-parser
      const results = this.parseSearchResults(response.data, maxResults);

      console.log(`[BingFreeSearchService] 搜索完成，找到 ${results.length} 个结果`);

      // 如果需要抓取内容，则抓取每个链接的内容
      if (options.fetchContent && results.length > 0) {
        console.log('[BingFreeSearchService] 开始抓取链接内容...');
        await this.fetchResultsContent(results, options.maxContentLength || 2000, timeout);
      }

      return {
        results,
        query,
        totalResults: results.length
      };

    } catch (error: any) {
      console.error('[BingFreeSearchService] 搜索失败:', error);
      throw new Error(`Bing搜索失败: ${error.message}`);
    }
  }

  /**
   * 构建搜索URL
   */
  private buildSearchUrl(query: string, options: {
    language: string;
    region: string;
    safeSearch: string;
    freshness?: string;
    count: number;
  }): string {
    const params = new URLSearchParams();

    // 基本搜索参数
    params.set('q', query);
    // 移除 ensearch=1，使用本地化搜索
    params.set('count', options.count.toString());

    // 语言和地区设置
    if (options.language) {
      params.set('setlang', options.language);
    }
    if (options.region) {
      params.set('cc', options.region);
    }

    // 安全搜索设置
    if (options.safeSearch) {
      const safeSearchMap: Record<string, string> = {
        'strict': 'strict',
        'moderate': 'moderate',
        'off': 'off'
      };
      params.set('safesearch', safeSearchMap[options.safeSearch] || 'moderate');
    }

    // 时间过滤
    if (options.freshness) {
      const freshnessMap: Record<string, string> = {
        'day': 'd',
        'week': 'w',
        'month': 'm'
      };
      params.set('qft', `+filterui:age-lt${freshnessMap[options.freshness]}`);
    }

    return `${this.baseUrl}/search?${params.toString()}`;
  }

  /**
   * 获取搜索页面
   */
  private async fetchSearchPage(url: string, timeout: number): Promise<any> {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      // 移除压缩请求头，避免解压问题
      // 'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    };

    if (Capacitor.isNativePlatform()) {
      // 移动端使用 CorsBypass 插件
      console.log('[BingFreeSearchService] 使用 CorsBypass 插件请求');

      const response = await CorsBypass.request({
        url,
        method: 'GET',
        headers,
        timeout, // 保持毫秒
        responseType: 'text'
      });

      console.log('[BingFreeSearchService] 插件响应:', {
        status: response.status,
        dataLength: response.data?.length || 0,
        headers: Object.keys(response.headers || {})
      });

      return response;
    } else {
      // Web端使用标准fetch（可能需要代理）
      console.log('[BingFreeSearchService] 使用标准 fetch 请求');

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(timeout)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.text();
      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      };
    }
  }

  /**
   * 使用 node-html-parser 解析搜索结果
   * 高性能、强容错性的HTML解析
   */
  private parseSearchResults(html: string, maxResults: number): BingSearchResult[] {
    const results: BingSearchResult[] = [];

    try {
      console.log('[BingFreeSearchService] 使用 node-html-parser 解析搜索结果，HTML长度:', html.length);

      // 使用 node-html-parser 解析HTML
      const root = parse(html, {
        lowerCaseTagName: false,
        comment: false,
        fixNestedATags: true,
        parseNoneClosedTags: true,
        blockTextElements: {
          script: false,
          noscript: false,
          style: false,
          pre: true
        }
      });

      // 尝试多种选择器策略，但使用统一的 node-html-parser API
      const selectors = [
        '.b_algo',           // 主要的Bing搜索结果选择器
        '.b_result',         // 备用选择器
        '.b_ans',            // 答案框选择器
        '.b_web',            // 网页结果选择器
        '[data-priority]'    // 带优先级的结果
      ];

      let resultElements: any[] = [];

      // 尝试不同的选择器
      for (const selector of selectors) {
        resultElements = root.querySelectorAll(selector);
        if (resultElements.length > 0) {
          console.log(`[BingFreeSearchService] 使用选择器 "${selector}" 找到 ${resultElements.length} 个结果`);
          break;
        }
      }

      // 如果没有找到结果，尝试更宽泛的查找
      if (resultElements.length === 0) {
        console.log('[BingFreeSearchService] 主要选择器未找到结果，尝试通用链接查找');
        const allLinks = root.querySelectorAll('a[href]');
        resultElements = allLinks.filter((link: any) => {
          const href = link.getAttribute('href') || '';
          const text = link.text?.trim() || '';
          return href &&
                 !href.startsWith('#') &&
                 !href.includes('bing.com/search') &&
                 !href.includes('bing.com/images') &&
                 text.length > 10;
        }).slice(0, maxResults);
      }

      // 解析每个结果元素
      resultElements.forEach((element: any, index: number) => {
        if (results.length >= maxResults) return;

        try {
          // 提取标题和链接
          let title = '';
          let url = '';
          let snippet = '';

          // 尝试多种方式提取标题和链接
          const titleSelectors = ['h2 a', 'h3 a', '.b_title a', 'a[href]'];
          let titleElement: any = null;

          for (const selector of titleSelectors) {
            titleElement = element.querySelector(selector);
            if (titleElement) {
              title = this.cleanText(titleElement.text || '');
              url = titleElement.getAttribute('href') || '';
              if (title && url) break;
            }
          }

          // 如果当前元素本身就是链接
          if (!title && element.tagName === 'A') {
            title = this.cleanText(element.text || '');
            url = element.getAttribute('href') || '';
          }

          // 提取描述文本
          const contentSelectors = ['.b_caption p', '.b_snippet', '.b_descript', 'p', 'span'];
          for (const selector of contentSelectors) {
            const contentElement = element.querySelector(selector);
            if (contentElement) {
              const text = this.cleanText(contentElement.text || '');
              if (text && text.length > snippet.length) {
                snippet = text;
              }
            }
          }

          // 如果没有找到描述，从父元素中查找
          if (!snippet) {
            const parentText = this.cleanText(element.text || '');
            if (parentText.length > title.length) {
              snippet = parentText.substring(title.length).trim();
            }
          }

          if (title && url) {
            results.push({
              id: uuidv4(),
              title,
              url: this.normalizeUrl(url),
              snippet: snippet || '无描述',
              timestamp: new Date().toISOString(),
              provider: 'bing-free',
              score: 1.0 - (index * 0.1) // 根据位置给予不同分数
            });

            console.log(`[BingFreeSearchService] 解析成功 ${results.length}: ${title.substring(0, 50)}`);
          }
        } catch (error) {
          console.warn(`[BingFreeSearchService] 解析单个结果失败:`, error);
        }
      });

      console.log(`[BingFreeSearchService] node-html-parser 解析完成，找到 ${results.length} 个结果`);

    } catch (error) {
      console.error('[BingFreeSearchService] node-html-parser 解析失败:', error);
    }

    return results;
  }



  /**
   * 清理文本内容
   */
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // 合并多个空白字符
      .replace(/[\r\n\t]/g, ' ') // 替换换行和制表符
      .trim();
  }

  /**
   * 标准化URL
   */
  private normalizeUrl(url: string): string {
    try {
      // 如果是相对URL，转换为绝对URL
      if (url.startsWith('/')) {
        return `${this.baseUrl}${url}`;
      }

      // 如果是Bing重定向URL，提取真实URL
      if (url.includes('bing.com/ck/a?')) {
        const urlParts = url.split('?');
        const queryString = urlParts.length > 1 ? urlParts[1] : '';
        if (queryString) {
          const urlParams = new URLSearchParams(queryString);
          const realUrl = urlParams.get('u');
          if (realUrl) {
            return decodeURIComponent(realUrl);
          }
        }
      }

      return url;
    } catch (error) {
      console.warn('[BingFreeSearchService] URL标准化失败:', error);
      return url;
    }
  }

  /**
   * 抓取搜索结果的页面内容
   */
  private async fetchResultsContent(results: BingSearchResult[], maxContentLength: number, timeout: number): Promise<void> {
    const fetchPromises = results.map(async (result, index) => {
      try {
        console.log(`[BingFreeSearchService] 抓取内容 ${index + 1}/${results.length}: ${result.url}`);

        const content = await this.fetchPageContent(result.url, maxContentLength, timeout);
        result.content = content;
        result.contentLength = content.length;

        console.log(`[BingFreeSearchService] 内容抓取成功 ${index + 1}: ${content.length} 字符`);
      } catch (error) {
        console.warn(`[BingFreeSearchService] 内容抓取失败 ${index + 1}:`, error);
        result.content = `内容抓取失败: ${error}`;
        result.contentLength = 0;
      }
    });

    // 并发抓取，但限制并发数量避免过载
    const batchSize = 3; // 同时最多抓取3个页面
    for (let i = 0; i < fetchPromises.length; i += batchSize) {
      const batch = fetchPromises.slice(i, i + batchSize);
      await Promise.all(batch);
    }
  }

  /**
   * 抓取单个页面内容
   */
  private async fetchPageContent(url: string, maxLength: number, timeout: number): Promise<string> {
    // 跳过一些不适合抓取的URL
    if (this.shouldSkipUrl(url)) {
      return '跳过此类型的链接';
    }

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    };

    if (Capacitor.isNativePlatform()) {
      // 移动端使用 CorsBypass 插件
      const response = await CorsBypass.request({
        url,
        method: 'GET',
        headers,
        timeout: Math.min(timeout, 15000), // 限制单个页面抓取时间
        responseType: 'text'
      });

      if (response.status >= 400) {
        throw new Error(`HTTP ${response.status}`);
      }

      return this.extractTextContent(response.data, maxLength);
    } else {
      // Web端使用标准fetch
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(Math.min(timeout, 15000))
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      return this.extractTextContent(html, maxLength);
    }
  }

  /**
   * 判断是否应该跳过某些URL
   */
  private shouldSkipUrl(url: string): boolean {
    const skipPatterns = [
      /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|7z)$/i,
      /\.(jpg|jpeg|png|gif|bmp|svg|webp)$/i,
      /\.(mp3|mp4|avi|mov|wmv|flv)$/i,
      /^mailto:/,
      /^tel:/,
      /^javascript:/,
      /#$/
    ];

    return skipPatterns.some(pattern => pattern.test(url));
  }

  /**
   * 从HTML中提取纯文本内容
   */
  private extractTextContent(html: string, maxLength: number): string {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // 移除脚本和样式标签
      const scripts = doc.querySelectorAll('script, style, nav, header, footer, aside');
      scripts.forEach(el => el.remove());

      // 优先提取主要内容区域
      const contentSelectors = [
        'main',
        'article',
        '.content',
        '.main-content',
        '.post-content',
        '.entry-content',
        '#content',
        '.container'
      ];

      let textContent = '';
      for (const selector of contentSelectors) {
        const element = doc.querySelector(selector);
        if (element) {
          textContent = element.textContent || '';
          break;
        }
      }

      // 如果没找到主要内容区域，使用body
      if (!textContent) {
        textContent = doc.body?.textContent || '';
      }

      // 清理文本
      textContent = textContent
        .replace(/\s+/g, ' ') // 合并空白字符
        .replace(/\n\s*\n/g, '\n') // 合并多个换行
        .trim();

      // 限制长度
      if (textContent.length > maxLength) {
        textContent = textContent.substring(0, maxLength) + '...';
      }

      return textContent || '无法提取内容';
    } catch (error) {
      console.warn('[BingFreeSearchService] 文本提取失败:', error);
      return '内容解析失败';
    }
  }

  /**
   * 批量搜索
   */
  public async batchSearch(queries: string[], options: Omit<BingSearchOptions, 'query'> = {}): Promise<BingSearchResponse[]> {
    const promises = queries.map(query =>
      this.search({ ...options, query }).catch(error => {
        console.error(`[BingFreeSearchService] 批量搜索失败 - ${query}:`, error);
        return { results: [], query, totalResults: 0 };
      })
    );

    return Promise.all(promises);
  }
}

// 导出单例实例
export const bingFreeSearchService = BingFreeSearchService.getInstance();
