/// <reference types="@rsbuild/core/types" />

// 扩展全局变量定义
declare const __DEV__: boolean;
declare const __PROD__: boolean;

// CSS模块声明
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}

// 扩展import.meta类型以支持Rsbuild特性
interface ImportMeta {
  readonly env: ImportMetaEnv;
  // Rsbuild支持的webpack context功能
  webpackContext?: (
    directory: string,
    options?: {
      recursive?: boolean;
      regExp?: RegExp;
    }
  ) => {
    keys(): string[];
    (id: string): any;
  };
}

interface ImportMetaEnv {
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly PROD: boolean;
  readonly DEV: boolean;
  readonly SSR: boolean;
  // 您可以在这里添加自定义环境变量的类型定义
  // readonly VITE_SOME_KEY: string;
  [key: string]: any;
}
