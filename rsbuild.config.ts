import { defineConfig } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'
import { pluginVue } from '@rsbuild/plugin-vue'
import { pluginTypeCheck } from '@rsbuild/plugin-type-check'

export default defineConfig({
  plugins: [
    pluginReact({
      // 使用SWC进行React编译，对应您原来的配置
      swcReactOptions: {
        development: process.env.NODE_ENV === 'development',
        runtime: 'automatic'
      }
    }),
    pluginVue(),
    // 类型检查插件，替代vite-plugin-checker
    pluginTypeCheck()
  ],

  // HTML模板配置
  html: {
    template: './index.html'
  },

  // 入口配置
  source: {
    entry: {
      index: './src/main.tsx'
    },
    // 环境变量定义，对应您原来的define配置
    define: {
      __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
      __PROD__: JSON.stringify(process.env.NODE_ENV === 'production'),
    }
  },

  // 开发服务器配置，对应您原来的server配置
  server: {
    port: 5173,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': '*',
      'Access-Control-Allow-Headers': '*',
    },
    // 修复静态资源服务 - 更精确的 historyApiFallback 配置
    historyApiFallback: {
      // 只对 HTML 请求启用 fallback，避免影响 JS/CSS 等静态资源
      rewrites: [
        { from: /^\/(?!static\/).*$/, to: '/index.html' }
      ],
      disableDotRule: true,
    },
    proxy: {
      // Exa API代理
      '/api/exa': {
        target: 'https://api.exa.ai',
        changeOrigin: true,
        pathRewrite: { '^/api/exa': '' },
        headers: {
          'Origin': 'https://api.exa.ai'
        }
      },
      // Bocha API代理
      '/api/bocha': {
        target: 'https://api.bochaai.com',
        changeOrigin: true,
        pathRewrite: { '^/api/bocha': '' },
        headers: {
          'Origin': 'https://api.bochaai.com'
        }
      },
      // Firecrawl API代理
      '/api/firecrawl': {
        target: 'https://api.firecrawl.dev',
        changeOrigin: true,
        pathRewrite: { '^/api/firecrawl': '' },
        headers: {
          'Origin': 'https://api.firecrawl.dev'
        }
      },
      // Notion API代理
      '/api/notion': {
        target: 'https://api.notion.com',
        changeOrigin: true,
        pathRewrite: { '^/api/notion': '' },
        headers: {
          'Origin': 'https://api.notion.com'
        }
      }
    }
  },

  // 构建输出配置
  output: {
    target: 'web',
    distPath: {
      root: 'dist'
    },
    // 对应您的现代浏览器目标 - 修复browserslist查询
    overrideBrowserslist: [
      'Chrome >= 87',
      'Firefox >= 78',
      'Safari >= 14',
      'Edge >= 88'
    ],
    // 启用polyfill，对应您的优化配置
    polyfill: 'usage',
    // 修复文件名配置，避免路径问题
    filename: {
      js: 'static/js/[name]-[contenthash:8].js',
      css: 'static/css/[name]-[contenthash:8].css'
    },
    // 确保正确的资源路径
    assetPrefix: '/'
  },

  // 性能优化配置
  performance: {
    // 开发环境禁用代码分割，避免模块加载问题
    chunkSplit: process.env.NODE_ENV === 'development'
      ? { strategy: 'all-in-one' }
      : {
          strategy: 'split-by-size',
          minSize: 20000,
          maxSize: 500000
        }
  },

  // 工具配置
  tools: {
    rspack: {
      optimization: {
        minimize: process.env.NODE_ENV === 'production',
        sideEffects: false
      }
    }
  }
})
