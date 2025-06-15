import { defineConfig } from 'vite'
import reactOxc from '@vitejs/plugin-react-oxc'  // Oxc 处理 React
import reactSwc from '@vitejs/plugin-react-swc'  // SWC 处理 Vue 中的 TS
import vue from '@vitejs/plugin-vue'

// Rolldown-Vite 混合配置：Oxc + SWC
// Oxc 处理 React (最快)，SWC 处理 Vue 中的 TypeScript (最稳定)
export default defineConfig({
  plugins: [
    // Oxc 处理纯 React 文件 - 最快性能
    reactOxc({
      include: /\.(jsx|tsx)$/,  // 只处理 JSX/TSX 文件
      exclude: [/\.vue$/, /node_modules/]
    }),

    // SWC 处理普通 JS/TS 文件 - 稳定兼容性
    reactSwc(),
    vue({
      template: {
        compilerOptions: {
          // 将所有带vue-前缀的标签视为自定义元素
          isCustomElement: tag => tag.startsWith('vue-')
        }
      }
    })
    // 注意：Rolldown-Vite 内置了类型检查，不需要额外的 checker 插件
  ],

  // 开发服务器配置
  server: {
    port: 5173,
    cors: false, // 完全禁用 CORS 检查
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': '*',
      'Access-Control-Allow-Headers': '*',
    },
    proxy: {
      // Exa API代理
      '/api/exa': {
        target: 'https://api.exa.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/exa/, ''),
        headers: {
          'Origin': 'https://api.exa.ai'
        }
      },
      // Bocha API代理
      '/api/bocha': {
        target: 'https://api.bochaai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/bocha/, ''),
        headers: {
          'Origin': 'https://api.bochaai.com'
        }
      },
      // Firecrawl API代理
      '/api/firecrawl': {
        target: 'https://api.firecrawl.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/firecrawl/, ''),
        headers: {
          'Origin': 'https://api.firecrawl.dev'
        }
      },
      // MCP SSE 代理 - glama.ai
      '/api/mcp-glama': {
        target: 'https://glama.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mcp-glama/, ''),
        headers: {
          'Origin': 'https://glama.ai',
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        }
      },
      // MCP SSE 代理 - modelscope
      '/api/mcp-modelscope': {
        target: 'https://mcp.api-inference.modelscope.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mcp-modelscope/, ''),
        headers: {
          'Origin': 'https://mcp.api-inference.modelscope.net',
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        }
      },
      // MCP HTTP Stream 代理 - router.mcp.so
      '/api/mcp-router': {
        target: 'https://router.mcp.so',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mcp-router/, ''),
        headers: {
          'Origin': 'https://router.mcp.so',
          'Accept': 'application/json, text/event-stream',
          'Cache-Control': 'no-cache'
        }
      },
      // Notion API代理
      '/api/notion': {
        target: 'https://api.notion.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/notion/, ''),
        headers: {
          'Origin': 'https://api.notion.com'
        }
      }
    }
  },

  // 构建配置 - Rolldown-Vite 会自动使用 Oxc 进行优化
  build: {
    sourcemap: false, // 生产环境不生成sourcemap
    target: 'es2022', // 现代浏览器目标，生成更小的代码
    outDir: 'dist',
    rollupOptions: {
      output: {
        // 使用 static 目录结构
        chunkFileNames: 'static/js/[name]-[hash].js',
        entryFileNames: 'static/js/[name]-[hash].js',
        assetFileNames: 'static/[ext]/[name]-[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 500
  },
  // 优化依赖预构建 - Rolldown-Vite 会自动优化
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@mui/material',
      '@mui/system',
      '@mui/utils',
      '@reduxjs/toolkit',
      'vue'
    ],
    force: true
    // 注意：Rolldown-Vite 使用 Oxc 替代 esbuild，不需要 esbuildOptions
  },

  // 缓存配置
  cacheDir: 'node_modules/.vite',

  // 解析配置
  resolve: {
    alias: {
      '@': '/src'
    }
  },

  // 定义全局常量
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __PROD__: JSON.stringify(process.env.NODE_ENV === 'production'),
  },
})
