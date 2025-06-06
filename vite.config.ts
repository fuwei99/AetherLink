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
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // 第三方库分割
          if (id.includes('node_modules')) {
            // React 生态系统
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }

            // MUI 核心库
            if (id.includes('@mui/material') || id.includes('@mui/system')) {
              return 'mui-core';
            }

            // Redux 状态管理
            if (id.includes('redux') || id.includes('@reduxjs/toolkit')) {
              return 'redux-vendor';
            }

            // Vue 相关
            if (id.includes('vue')) {
              return 'vue-vendor';
            }

            // Capacitor 相关
            if (id.includes('@capacitor')) {
              return 'capacitor-vendor';
            }

            // 语法高亮
            if (id.includes('shiki') || id.includes('highlight')) {
              return 'syntax-vendor';
            }

            // 工具库
            if (id.includes('lodash') || id.includes('date-fns') || id.includes('uuid')) {
              return 'utils-vendor';
            }

            // 动画库
            if (id.includes('framer-motion') || id.includes('lottie')) {
              return 'animation-vendor';
            }

            // 其他大型第三方库
            if (id.includes('monaco-editor')) {
              return 'editor-vendor';
            }

            // 图表和可视化库
            if (id.includes('chart') || id.includes('d3') || id.includes('echarts')) {
              return 'chart-vendor';
            }

            // 数学和科学计算库
            if (id.includes('math') || id.includes('ml-') || id.includes('tensorflow')) {
              return 'math-vendor';
            }

            // 网络请求相关
            if (id.includes('axios') || id.includes('fetch') || id.includes('request')) {
              return 'http-vendor';
            }

            // 文件处理相关
            if (id.includes('file-') || id.includes('blob') || id.includes('buffer')) {
              return 'file-vendor';
            }

            // 加密和安全相关
            if (id.includes('crypto') || id.includes('hash') || id.includes('encrypt')) {
              return 'crypto-vendor';
            }

            // 解析器相关
            if (id.includes('parser') || id.includes('ast') || id.includes('babel')) {
              return 'parser-vendor';
            }

            // 按大小进一步分割剩余的第三方库
            // 大型库（通常 > 100KB）
            if (id.includes('moment') || id.includes('antd') || id.includes('material-ui') ||
                id.includes('three') || id.includes('babylon') || id.includes('codemirror')) {
              return 'large-vendor';
            }

            // 中型库（通常 50-100KB）
            if (id.includes('styled-components') || id.includes('emotion') ||
                id.includes('formik') || id.includes('yup') || id.includes('joi')) {
              return 'medium-vendor';
            }

            // 剩余的小型第三方库
            return 'small-vendor';
          }

          // 应用代码分割
          // 设置页面相关
          if (id.includes('/pages/Settings') || id.includes('/components/settings')) {
            return 'settings';
          }

          // 聊天页面相关
          if (id.includes('/pages/ChatPage') || id.includes('/components/chat')) {
            return 'chat';
          }

          // 消息相关组件
          if (id.includes('/components/message')) {
            return 'message-components';
          }

          // 知识库相关
          if (id.includes('/pages/KnowledgeBase') || id.includes('/components/KnowledgeManagement')) {
            return 'knowledge';
          }

          // Vue 组件
          if (id.includes('/components/VueComponents') || id.includes('/pages/VueDemo')) {
            return 'vue-components';
          }

          // 主题管理相关
          if (id.includes('/components/TopicManagement')) {
            return 'topic-management';
          }

          // 服务层
          if (id.includes('/shared/services')) {
            return 'services';
          }

          // 工具函数
          if (id.includes('/shared/utils')) {
            return 'utils';
          }

          // Store 相关
          if (id.includes('/shared/store')) {
            return 'store';
          }

          // API 相关
          if (id.includes('/shared/api')) {
            return 'api';
          }

          // 开发工具
          if (id.includes('/pages/DevToolsPage') || id.includes('/components/DevTools')) {
            return 'dev-tools';
          }
        },
        // 限制chunk大小 - 设置更小的阈值
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // 限制chunk大小警告阈值 - 设置为500KB
    chunkSizeWarningLimit: 500,
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
    force: true
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

  // 定义全局常量
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __PROD__: JSON.stringify(process.env.NODE_ENV === 'production'),
  },
})
