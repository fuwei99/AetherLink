/**
 * 免费Bing搜索服务
 * 使用 capacitor-cors-bypass-enhanced 插件绕过CORS限制
 */

import { CorsBypass } from 'capacitor-cors-bypass-enhanced';
import { Capacitor } from '@capacitor/core';
import { v4 as uuidv4 } from 'uuid';

export interface BingSearchOptions {
  query: string;
  maxResults?: number;
  language?: string;
  region?: string;
  safeSearch?: 'strict' | 'moderate' | 'off';
  freshness?: 'day' | 'week' | 'month';
  timeout?: number;
}

export interface BingSearchResult {
  id: string;
  title: string;
  url: string;
  snippet: string;
  timestamp: string;
  provider: string;
  score?: number;
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
  private readonly baseUrl = 'https://www.bing.com';

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
      
      // 解析搜索结果
      const results = this.parseSearchResults(response.data, maxResults);

      console.log(`[BingFreeSearchService] 搜索完成，找到 ${results.length} 个结果`);

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
    params.set('ensearch', '1'); // 启用英文搜索
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
   * 解析搜索结果HTML
   * 基于你的searxng-proxy脚本中的成功实现
   */
  private parseSearchResults(html: string, maxResults: number): BingSearchResult[] {
    const results: BingSearchResult[] = [];

    try {
      // 创建DOM解析器
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      console.log('[BingFreeSearchService] HTML长度:', html.length);
      console.log('[BingFreeSearchService] 开始解析搜索结果...');

      // 输出HTML片段用于调试
      console.log('[BingFreeSearchService] HTML前1000字符:', html.substring(0, 1000));

      // 检查是否包含搜索结果的关键词
      console.log('[BingFreeSearchService] HTML包含b_algo:', html.includes('b_algo'));
      console.log('[BingFreeSearchService] HTML包含b_caption:', html.includes('b_caption'));

      // 直接按照你的脚本逻辑：$('.b_algo').each()
      const resultElements = doc.querySelectorAll('.b_algo');
      console.log('[BingFreeSearchService] 找到 .b_algo 元素:', resultElements.length);

      // 如果没找到，尝试其他可能的选择器
      if (resultElements.length === 0) {
        const alternativeSelectors = [
          'li.b_algo',
          '.b_algoheader',
          '.b_algo_group .b_algo',
          '[data-priority]',
          '.b_results .b_algo'
        ];

        for (const selector of alternativeSelectors) {
          const elements = doc.querySelectorAll(selector);
          console.log(`[BingFreeSearchService] 尝试选择器 "${selector}":`, elements.length);
        }
      }

      resultElements.forEach((element) => {
        if (results.length >= maxResults) return;

        // 完全按照你的脚本逻辑：
        // const title = $result.find('h2 a').text().trim();
        // const url = $result.find('h2 a').attr('href');
        // const content = $result.find('.b_caption p').text().trim();

        const titleElement = element.querySelector('h2 a');
        const title = this.cleanText(titleElement?.textContent || '');
        const url = titleElement?.getAttribute('href') || '';
        const contentElement = element.querySelector('.b_caption p');
        const content = this.cleanText(contentElement?.textContent || '');

        if (title && url) {
          results.push({
            id: uuidv4(),
            title,
            url: this.normalizeUrl(url),
            snippet: content,
            timestamp: new Date().toISOString(),
            provider: 'bing-free',
            score: 1.0
          });

          console.log(`[BingFreeSearchService] 解析成功 ${results.length}:`, title.substring(0, 50));
        }
      });

      console.log(`[BingFreeSearchService] 最终解析到 ${results.length} 个结果`);

      // 如果没有找到结果，创建一个调试结果显示HTML信息
      if (results.length === 0) {
        results.push({
          id: uuidv4(),
          title: `调试信息 - HTML长度: ${html.length}`,
          url: '#debug',
          snippet: `HTML前500字符: ${html.substring(0, 500)}... | 包含b_algo: ${html.includes('b_algo')} | 包含b_caption: ${html.includes('b_caption')}`,
          timestamp: new Date().toISOString(),
          provider: 'bing-free-debug',
          score: 0
        });
      }

    } catch (error) {
      console.error('[BingFreeSearchService] HTML解析失败:', error);
      // 创建一个错误调试结果
      results.push({
        id: uuidv4(),
        title: `解析错误: ${error}`,
        url: '#error',
        snippet: `HTML长度: ${html?.length || 0}`,
        timestamp: new Date().toISOString(),
        provider: 'bing-free-error',
        score: 0
      });
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
        const urlParams = new URLSearchParams(url.split('?')[1]);
        const realUrl = urlParams.get('u');
        if (realUrl) {
          return decodeURIComponent(realUrl);
        }
      }

      return url;
    } catch (error) {
      console.warn('[BingFreeSearchService] URL标准化失败:', error);
      return url;
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
