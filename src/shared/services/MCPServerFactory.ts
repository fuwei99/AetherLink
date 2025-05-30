import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { BraveSearchServer } from './mcpServers/BraveSearchServer';
import { FetchServer } from './mcpServers/FetchServer';
import { MemoryServer } from './mcpServers/MemoryServer';
import { ThinkingServer } from './mcpServers/ThinkingServer';
import { FileSystemServer } from './mcpServers/FileSystemServer';
import { DifyKnowledgeServer } from './mcpServers/DifyKnowledgeServer';
import { LocalGoogleSearchServer } from './mcpServers/LocalGoogleSearchServer';
import { CalculatorServer } from './mcpServers/CalculatorServer';
import { getBuiltinMCPServers, isBuiltinServer, getBuiltinServerConfig } from '../config/builtinMCPServers';

/**
 * 创建内存 MCP 服务器
 * 移植自最佳实例的内置服务器工厂
 */
export function createInMemoryMCPServer(name: string, args: string[] = [], envs: Record<string, string> = {}): Server {
  console.log(`[MCP] 创建内存 MCP 服务器: ${name}，参数: ${args}，环境变量: ${JSON.stringify(envs)}`);

  switch (name) {
    case '@aether/memory': {
      const envPath = envs.MEMORY_FILE_PATH;
      return new MemoryServer(envPath).server;
    }

    case '@aether/sequentialthinking': {
      return new ThinkingServer().server;
    }

    case '@aether/brave-search': {
      return new BraveSearchServer(envs.BRAVE_API_KEY).server;
    }

    case '@aether/fetch': {
      return new FetchServer().server;
    }

    case '@aether/filesystem': {
      return new FileSystemServer(args).server;
    }

    case '@aether/dify-knowledge': {
      const difyKey = envs.DIFY_KEY;
      return new DifyKnowledgeServer(difyKey, args).server;
    }

    case '@aether/local-google-search': {
      return new LocalGoogleSearchServer().server;
    }

    case '@aether/calculator': {
      return new CalculatorServer().server;
    }

    default:
      throw new Error(`未知的内置 MCP 服务器: ${name}`);
  }
}

// 导出配置文件中的函数，保持向后兼容
export { getBuiltinMCPServers, isBuiltinServer, getBuiltinServerConfig };
