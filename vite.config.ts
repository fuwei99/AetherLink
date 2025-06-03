import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'  // 使用SWC版本
import vue from '@vitejs/plugin-vue'
// import { muiIconsPlugin } from './scripts/vite-mui-icons-plugin'
import checker from 'vite-plugin-checker' // 保留检查器用于开发模式

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // MUI图标动态分析插件（暂时注释，保持SWC构建纯净）
    // muiIconsPlugin({
    //   scanDirs: ['src'],
    //   enableCache: true,
    //   verbose: true
    // }),
    react({
      // SWC 优化配置
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
    // TypeScript 类型检查器 - 在构建时启用
    checker({
      typescript: {
        buildMode: true, // 构建时进行类型检查
        tsconfigPath: './tsconfig.app.json'
      },
      enableBuild: true // 生产构建时启用类型检查
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
    minify: 'terser', // 使用terser进行更强的压缩
    terserOptions: {
      compress: {
        drop_console: false, // 保留console以便调试
        drop_debugger: true, // 移除debugger语句
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // 将React相关库拆分到单独的chunk
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // 将UI库拆分到单独的chunk
          'mui-vendor': ['@mui/material', '@mui/system', '@mui/utils'],
          // MUI图标会由muiIconsPlugin动态添加
          'mui-icons': [],
          // 将工具库拆分到单独的chunk
          'utils-vendor': ['redux', '@reduxjs/toolkit', 'lodash'],
          // Vue相关库
          'vue-vendor': ['vue'],
          //  升级：语法高亮相关 - 使用 Shiki
          'syntax-vendor': ['shiki'],
          // 日期处理相关
          'date-vendor': ['date-fns'],
          // 动画相关
          'animation-vendor': ['framer-motion']
        },
        // 限制chunk大小
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // 限制chunk大小警告阈值
    chunkSizeWarningLimit: 2000,
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
      // MUI图标会由muiIconsPlugin动态添加
    ],
    // 强制预构建这些依赖，即使它们没有被直接导入
    force: true
  },
  // 启用esbuild优化
  esbuild: {
    pure: ['console.log', 'console.debug', 'console.trace'],
    legalComments: 'none',
  },

  // 缓存配置
  cacheDir: 'node_modules/.vite',

  // 定义全局常量
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __PROD__: JSON.stringify(process.env.NODE_ENV === 'production'),
  },
})
