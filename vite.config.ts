import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'  // 使用SWC版本
import vue from '@vitejs/plugin-vue'
import checker from 'vite-plugin-checker' // 保留检查器用于开发模式

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // SWC 优化配置 - 使用现代 ES 目标以获得更好的性能
      devTarget: 'es2022'
    }),
    vue({
      template: {
        compilerOptions: {
          // 将所有带vue-前缀的标签视为自定义元素
          isCustomElement: tag => tag.startsWith('vue-')
        }
      }
    }),
    // TypeScript 类型检查器 - 优化配置
    checker({
      typescript: {
        buildMode: false, // 开发模式下不使用构建模式
        tsconfigPath: './tsconfig.app.json'
      },
      enableBuild: true, // 生产构建时启用类型检查
      overlay: {
        initialIsOpen: false, // 不自动打开错误覆盖层
        position: 'tl' // 错误显示在左上角
      }
    })
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
      }
    }
  },

  // 优化构建配置
  build: {
    sourcemap: false, // 生产环境不生成sourcemap
    minify: 'esbuild', // 使用 esbuild 进行更快的压缩（基于 Go，比 Terser 快很多）
    target: 'es2022', // 现代浏览器目标，生成更小的代码
    // 参考电脑版策略 - 简单稳定的默认分割
    rollupOptions: {
      output: {
        // 不设置 manualChunks，使用 Vite 默认的智能分割
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // 限制chunk大小警告阈值 - 设置为500KB
    chunkSizeWarningLimit: 500
  },
  // 优化依赖预构建
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
    // 强制预构建这些依赖，即使它们没有被直接导入
    force: true,
    // 增加并行处理数量
    esbuildOptions: {
      // 使用多核并行处理
      target: 'es2022',
      // 启用更激进的优化
      treeShaking: true,
      // 移除调试信息
      drop: ['console', 'debugger'],
      // 优化标识符
      minifyIdentifiers: true,
      minifySyntax: true,
      minifyWhitespace: true
    }
  },
  // 启用esbuild优化 - 最大化性能
  esbuild: {
    // 移除调试相关代码
    pure: ['console.log', 'console.debug', 'console.trace'],
    // 移除法律注释以减小文件大小
    legalComments: 'none',
    // 启用更激进的优化
    treeShaking: true,
    // 目标现代浏览器
    target: 'es2022',
    // 启用压缩
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
  },

  // 缓存配置
  cacheDir: 'node_modules/.vite',

  // 性能优化配置
  worker: {
    // 使用 esbuild 处理 worker
    format: 'es',
    plugins: () => []
  },

  // 实验性功能优化
  experimental: {
    // 启用更快的依赖扫描
    skipSsrTransform: true
  },

  // 定义全局常量
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __PROD__: JSON.stringify(process.env.NODE_ENV === 'production'),
  },
})
