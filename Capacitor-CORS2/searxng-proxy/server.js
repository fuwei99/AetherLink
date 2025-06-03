import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Bing 搜索配置
const BING_CONFIG = {
  baseUrl: 'https://www.bing.com/search',
  imageUrl: 'https://www.bing.com/images/search',
  newsUrl: 'https://www.bing.com/news/search',
  videoUrl: 'https://www.bing.com/videos/search'
};

// 启用 CORS 和 JSON 解析
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['*'],
  credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    searchEngine: 'Bing',
    service: 'Bing Search CORS Proxy'
  });
});

// 获取搜索引擎信息
app.get('/engines', (req, res) => {
  res.json({
    engine: 'Bing',
    categories: ['general', 'images', 'news', 'videos'],
    languages: ['zh-CN', 'en-US', 'ja-JP', 'ko-KR', 'fr-FR', 'de-DE', 'es-ES'],
    config: BING_CONFIG
  });
});

// 测试 Bing 搜索可用性
app.get('/test-bing', async (req, res) => {
  try {
    const startTime = Date.now();
    const testUrl = `${BING_CONFIG.baseUrl}?q=test`;
    
    const response = await fetch(testUrl, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      engine: 'Bing',
      status: response.ok ? 'online' : 'error',
      responseTime: responseTime,
      statusCode: response.status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      engine: 'Bing',
      status: 'offline',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Bing 搜索代理
app.get('/search', async (req, res) => {
  const query = req.query.q;
  const category = req.query.category || 'general';
  const language = req.query.language || 'zh-CN';
  const page = req.query.page || 1;
  const count = req.query.count || 10;
  
  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  console.log(`[SEARCH] Bing Query: "${query}", Category: ${category}, Language: ${language}`);

  try {
    // 构建 Bing 搜索 URL
    let searchUrl;
    switch (category) {
      case 'images':
        searchUrl = new URL(BING_CONFIG.imageUrl);
        break;
      case 'news':
        searchUrl = new URL(BING_CONFIG.newsUrl);
        break;
      case 'videos':
        searchUrl = new URL(BING_CONFIG.videoUrl);
        break;
      default:
        searchUrl = new URL(BING_CONFIG.baseUrl);
    }
    
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('count', count);
    searchUrl.searchParams.set('first', ((page - 1) * count) + 1);
    
    // 设置语言
    if (language) {
      searchUrl.searchParams.set('setlang', language.split('-')[0]);
    }

    console.log(`[SEARCH] Bing URL: ${searchUrl.toString()}`);

    const response = await fetch(searchUrl.toString(), {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://www.bing.com/',
        'Cookie': 'SRCHHPGUSR=ADLT=OFF'
      }
    });

    if (!response.ok) {
      throw new Error(`Bing returned ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const results = parseBingResults(html, category, query);
    
    console.log(`[SEARCH] Bing success: found ${results.results.length} results`);
    
    res.json({
      query,
      results: results.results,
      number_of_results: results.results.length,
      meta: {
        engine: 'Bing',
        category,
        language,
        page: parseInt(page),
        count: parseInt(count),
        timestamp: new Date().toISOString(),
        proxy: 'Bing-CORS-Proxy/1.0.0'
      }
    });

  } catch (error) {
    console.error(`[SEARCH] Bing search failed:`, error.message);
    res.status(500).json({
      error: `Bing search failed: ${error.message}`,
      query,
      timestamp: new Date().toISOString()
    });
  }
});

// 解析 Bing 搜索结果
function parseBingResults(html, category, query) {
  const $ = cheerio.load(html);
  const results = [];

  switch (category) {
    case 'images':
      // 解析图片搜索结果
      $('.iusc').each((index, element) => {
        try {
          const $img = $(element);
          const dataM = $img.attr('m');
          if (dataM) {
            const imgData = JSON.parse(dataM);
            results.push({
              title: imgData.t || '',
              url: imgData.purl || '',
              imageUrl: imgData.murl || '',
              thumbnailUrl: imgData.turl || '',
              width: imgData.w || 0,
              height: imgData.h || 0,
              source: imgData.md || '',
              index: index + 1
            });
          }
        } catch (e) {
          // 忽略解析错误
        }
      });
      break;

    case 'news':
      // 解析新闻搜索结果
      $('.news-card').each((index, element) => {
        const $news = $(element);
        const title = $news.find('.title').text().trim();
        const url = $news.find('.title a').attr('href');
        const content = $news.find('.snippet').text().trim();
        const source = $news.find('.source').text().trim();
        const time = $news.find('.time').text().trim();

        if (title && url) {
          results.push({
            title,
            url,
            content,
            source,
            publishTime: time,
            index: index + 1
          });
        }
      });
      break;

    case 'videos':
      // 解析视频搜索结果
      $('.dg_u').each((index, element) => {
        const $video = $(element);
        const title = $video.find('.vrhdata').attr('vrhm');
        const url = $video.find('a').attr('href');
        const thumbnail = $video.find('img').attr('src');
        const duration = $video.find('.vdur').text().trim();

        if (title && url) {
          try {
            const videoData = JSON.parse(title);
            results.push({
              title: videoData.title || '',
              url: url,
              thumbnailUrl: thumbnail,
              duration: duration,
              source: videoData.author || '',
              index: index + 1
            });
          } catch (e) {
            // 如果解析失败，使用基本信息
            results.push({
              title: $video.find('a').attr('title') || '',
              url: url,
              thumbnailUrl: thumbnail,
              duration: duration,
              index: index + 1
            });
          }
        }
      });
      break;

    default:
      // 解析普通搜索结果
      $('.b_algo').each((index, element) => {
        const $result = $(element);
        const title = $result.find('h2 a').text().trim();
        const url = $result.find('h2 a').attr('href');
        const content = $result.find('.b_caption p').text().trim();

        if (title && url) {
          results.push({
            title,
            url,
            content,
            index: index + 1
          });
        }
      });
  }

  return { results };
}

// 网页内容抓取代理
app.get('/fetch', async (req, res) => {
  const url = req.query.url;
  const extract = req.query.extract; // 'text', 'title', 'links', 'images'

  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  console.log(`[FETCH] Fetching: ${url}`);

  try {
    const response = await fetch(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `HTTP ${response.status}: ${response.statusText}`,
        url
      });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    let result = {
      url,
      status: response.status,
      timestamp: new Date().toISOString()
    };

    switch (extract) {
      case 'text':
        result.content = $('body').text().replace(/\s+/g, ' ').trim();
        break;

      case 'title':
        result.title = $('title').text().trim();
        result.description = $('meta[name="description"]').attr('content') || '';
        break;

      case 'links':
        result.links = [];
        $('a[href]').each((i, el) => {
          const href = $(el).attr('href');
          const text = $(el).text().trim();
          if (href && text) {
            result.links.push({ href, text });
          }
        });
        break;

      case 'images':
        result.images = [];
        $('img[src]').each((i, el) => {
          const src = $(el).attr('src');
          const alt = $(el).attr('alt') || '';
          if (src) {
            result.images.push({ src, alt });
          }
        });
        break;

      default:
        // 返回完整的解析结果
        result.title = $('title').text().trim();
        result.description = $('meta[name="description"]').attr('content') || '';
        result.content = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 2000);
        result.links = [];
        $('a[href]').slice(0, 10).each((i, el) => {
          const href = $(el).attr('href');
          const text = $(el).text().trim();
          if (href && text) {
            result.links.push({ href, text });
          }
        });
        break;
    }

    console.log(`[FETCH] Success: ${url}`);
    res.json(result);

  } catch (error) {
    console.error(`[FETCH] Error fetching ${url}:`, error.message);
    res.status(500).json({
      error: error.message,
      url,
      timestamp: new Date().toISOString()
    });
  }
});

// 通用 CORS 代理端点
app.all('/proxy/*', async (req, res) => {
  const targetUrl = req.url.replace('/proxy/', '');

  console.log(`[PROXY] ${req.method} ${targetUrl}`);

  try {
    const headers = { ...req.headers };
    delete headers.host;
    delete headers.origin;
    delete headers.referer;

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined
    });

    const data = await response.text();

    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'content-encoding') {
        res.set(key, value);
      }
    });

    res.send(data);
  } catch (error) {
    console.error('[PROXY] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🔍 Bing Search CORS Proxy Server running on http://localhost:${PORT}`);
  console.log(`🌐 Search endpoint: http://localhost:${PORT}/search?q=your-query`);
  console.log(`📄 Fetch endpoint: http://localhost:${PORT}/fetch?url=target-url`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Test Bing: http://localhost:${PORT}/test-bing`);
  console.log(`🌐 CORS proxy: http://localhost:${PORT}/proxy/[target-url]`);
  console.log(`📁 Static files: http://localhost:${PORT}/`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Bing search proxy server...');
  process.exit(0);
});

export default app;
