# 📱 Capacitor CORS Bypass 移动端集成指南

## 🎯 集成步骤

### 1. 创建 Ionic/Angular 项目

```bash
# 安装 Ionic CLI
npm install -g @ionic/cli

# 创建新项目
ionic start mcp-mobile-app tabs --type=angular --capacitor

# 进入项目目录
cd mcp-mobile-app
```

### 2. 安装 CORS Bypass 插件

```bash
# 从本地安装插件
npm install ../capacitor-cors-bypass

# 或者从 npm 安装（如果已发布）
# npm install capacitor-cors-bypass

# 同步 Capacitor
npx cap sync
```

### 3. 配置 Android

```bash
# 添加 Android 平台
npx cap add android

# 打开 Android Studio
npx cap open android
```

在 `android/app/src/main/java/.../MainActivity.java` 中注册插件：

```java
import com.capacitor.cors.CorsBypassPlugin;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    
    // 注册插件
    this.init(savedInstanceState, new ArrayList<Class<? extends Plugin>>() {{
      add(CorsBypassPlugin.class);
    }});
  }
}
```

### 4. 配置 iOS

```bash
# 添加 iOS 平台
npx cap add ios

# 打开 Xcode
npx cap open ios
```

iOS 插件会自动注册，无需额外配置。

### 5. 在应用中使用插件

```typescript
import { CorsBypass } from 'capacitor-cors-bypass';

// 创建 MCP 传输层
const mcpTransport = await CorsBypass.createMCPTransport({
  baseUrl: 'https://router.mcp.so/mcp/wylmr9mb0z1xyx',
  headers: {
    'Content-Type': 'application/json'
  }
});

// 连接并初始化 MCP
await mcpTransport.startListening();
const response = await mcpTransport.send({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: { roots: { listChanged: true } },
    clientInfo: { name: 'mobile-app', version: '1.0.0' }
  }
});
```

## 🔧 完整示例

### Angular Service

```typescript
import { Injectable } from '@angular/core';
import { CorsBypass } from 'capacitor-cors-bypass';

@Injectable({
  providedIn: 'root'
})
export class MCPService {
  private mcpTransport: any = null;
  private isConnected = false;

  async connectToMCP() {
    try {
      this.mcpTransport = await CorsBypass.createMCPTransport({
        baseUrl: 'https://router.mcp.so/mcp/wylmr9mb0z1xyx',
        headers: { 'Content-Type': 'application/json' }
      });

      await this.mcpTransport.startListening();
      
      const response = await this.mcpTransport.send({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: { roots: { listChanged: true } },
          clientInfo: { name: 'mobile-app', version: '1.0.0' }
        }
      });

      this.isConnected = true;
      return response;
    } catch (error) {
      console.error('MCP 连接失败:', error);
      throw error;
    }
  }

  async getTools() {
    if (!this.isConnected) throw new Error('未连接到 MCP');
    
    return await this.mcpTransport.send({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/list'
    });
  }

  async callTool(name: string, arguments_: any) {
    if (!this.isConnected) throw new Error('未连接到 MCP');
    
    return await this.mcpTransport.send({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name, arguments: arguments_ }
    });
  }

  async disconnect() {
    if (this.mcpTransport) {
      await this.mcpTransport.close();
      this.mcpTransport = null;
      this.isConnected = false;
    }
  }
}
```

### Angular Component

```typescript
import { Component } from '@angular/core';
import { MCPService } from '../services/mcp.service';

@Component({
  selector: 'app-mcp-demo',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>MCP Demo</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-card>
        <ion-card-header>
          <ion-card-title>MCP 连接状态</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-button (click)="connectMCP()" [disabled]="isConnected">
            连接 MCP 服务器
          </ion-button>
          <ion-button (click)="getTools()" [disabled]="!isConnected">
            获取工具列表
          </ion-button>
          <ion-button (click)="testTool()" [disabled]="!isConnected">
            测试工具
          </ion-button>
        </ion-card-content>
      </ion-card>

      <ion-card *ngIf="logs.length > 0">
        <ion-card-header>
          <ion-card-title>日志</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div *ngFor="let log of logs" class="log-entry">
            {{ log }}
          </div>
        </ion-card-content>
      </ion-card>
    </ion-content>
  `
})
export class MCPDemoComponent {
  isConnected = false;
  logs: string[] = [];

  constructor(private mcpService: MCPService) {}

  async connectMCP() {
    try {
      this.addLog('正在连接 MCP 服务器...');
      const response = await this.mcpService.connectToMCP();
      this.isConnected = true;
      this.addLog(`连接成功: ${JSON.stringify(response)}`);
    } catch (error) {
      this.addLog(`连接失败: ${error.message}`);
    }
  }

  async getTools() {
    try {
      this.addLog('获取工具列表...');
      const response = await this.mcpService.getTools();
      this.addLog(`工具列表: ${JSON.stringify(response.result?.tools)}`);
    } catch (error) {
      this.addLog(`获取工具失败: ${error.message}`);
    }
  }

  async testTool() {
    try {
      this.addLog('测试库解析工具...');
      const response = await this.mcpService.callTool('resolve-library-id', {
        libraryName: 'react'
      });
      this.addLog(`工具调用结果: ${JSON.stringify(response.result)}`);
    } catch (error) {
      this.addLog(`工具调用失败: ${error.message}`);
    }
  }

  private addLog(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    this.logs.push(`[${timestamp}] ${message}`);
  }
}
```

## 🚀 构建和运行

### Android

```bash
# 构建并运行
ionic capacitor run android

# 或者在 Android Studio 中运行
npx cap open android
```

### iOS

```bash
# 构建并运行
ionic capacitor run ios

# 或者在 Xcode 中运行
npx cap open ios
```

## 🔧 调试技巧

### 1. 查看原生日志

**Android:**
```bash
# 查看 Android 日志
adb logcat | grep -i "CorsBypass"
```

**iOS:**
```bash
# 在 Xcode 中查看控制台日志
```

### 2. 网络调试

在 `capacitor.config.ts` 中启用调试：

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.mcpapp',
  appName: 'MCP App',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    CorsBypass: {
      debug: true // 启用调试日志
    }
  }
};

export default config;
```

## ⚠️ 注意事项

1. **网络权限**: 确保应用有网络访问权限
2. **HTTPS**: 生产环境建议使用 HTTPS
3. **错误处理**: 添加完善的错误处理机制
4. **内存管理**: 及时关闭不需要的连接
5. **安全性**: 不要在客户端硬编码敏感信息

## 🎯 最佳实践

1. **连接池管理**: 复用 MCP 连接
2. **离线处理**: 处理网络断开情况
3. **用户体验**: 添加加载状态和错误提示
4. **性能优化**: 避免频繁的连接建立/断开
5. **日志记录**: 记录关键操作用于调试

这样你就可以在移动端完美使用 MCP 功能了！🚀
