import { CorsBypass } from 'capacitor-cors-bypass';

// HTTP 请求示例
export class HttpExample {
  
  // GET 请求
  async getData() {
    try {
      const response = await CorsBypass.get({
        url: 'https://api.example.com/data',
        headers: {
          'Authorization': 'Bearer your-token',
          'Content-Type': 'application/json'
        },
        params: {
          page: '1',
          limit: '10'
        },
        timeout: 10000
      });
      
      console.log('Response:', response.data);
      console.log('Status:', response.status);
      console.log('Headers:', response.headers);
    } catch (error) {
      console.error('Request failed:', error);
    }
  }

  // POST 请求
  async postData() {
    try {
      const response = await CorsBypass.post({
        url: 'https://api.example.com/users',
        headers: {
          'Authorization': 'Bearer your-token',
          'Content-Type': 'application/json'
        },
        data: {
          name: 'John Doe',
          email: 'john@example.com'
        },
        timeout: 15000
      });
      
      console.log('Created user:', response.data);
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  }

  // 通用请求方法
  async makeRequest() {
    try {
      const response = await CorsBypass.request({
        url: 'https://api.example.com/endpoint',
        method: 'PATCH',
        headers: {
          'Authorization': 'Bearer your-token',
          'Content-Type': 'application/json'
        },
        data: {
          status: 'updated'
        },
        responseType: 'json',
        withCredentials: true
      });
      
      return response;
    } catch (error) {
      throw error;
    }
  }
}

// SSE (Server-Sent Events) 示例
export class SSEExample {
  private connectionId: string | null = null;

  async startListening() {
    try {
      // 开始 SSE 连接
      const result = await CorsBypass.startSSE({
        url: 'https://api.example.com/events',
        headers: {
          'Authorization': 'Bearer your-token'
        },
        withCredentials: true,
        reconnectTimeout: 5000 // 5秒重连
      });
      
      this.connectionId = result.connectionId;
      console.log('SSE connection started:', this.connectionId);

      // 监听消息事件
      await CorsBypass.addListener('sseMessage', (event) => {
        console.log('Received SSE message:', {
          connectionId: event.connectionId,
          data: event.data,
          type: event.type,
          id: event.id
        });
        
        // 处理接收到的数据
        this.handleSSEMessage(event.data, event.type);
      });

      // 监听连接打开事件
      await CorsBypass.addListener('sseOpen', (event) => {
        console.log('SSE connection opened:', event.connectionId);
      });

      // 监听错误事件
      await CorsBypass.addListener('sseError', (event) => {
        console.error('SSE error:', event.error);
        // 可以在这里处理错误，比如显示用户友好的错误信息
      });

      // 监听连接关闭事件
      await CorsBypass.addListener('sseClose', (event) => {
        console.log('SSE connection closed:', event.connectionId);
      });

    } catch (error) {
      console.error('Failed to start SSE:', error);
    }
  }

  async stopListening() {
    if (this.connectionId) {
      try {
        await CorsBypass.stopSSE({ connectionId: this.connectionId });
        console.log('SSE connection stopped');
        this.connectionId = null;
      } catch (error) {
        console.error('Failed to stop SSE:', error);
      }
    }
  }

  private handleSSEMessage(data: string, type?: string) {
    try {
      // 尝试解析 JSON 数据
      const parsedData = JSON.parse(data);
      
      switch (type) {
        case 'notification':
          this.handleNotification(parsedData);
          break;
        case 'update':
          this.handleUpdate(parsedData);
          break;
        default:
          console.log('Unknown message type:', type, parsedData);
      }
    } catch (error) {
      // 如果不是 JSON，直接处理字符串
      console.log('Received text message:', data);
    }
  }

  private handleNotification(data: any) {
    console.log('Notification received:', data);
    // 处理通知逻辑
  }

  private handleUpdate(data: any) {
    console.log('Update received:', data);
    // 处理更新逻辑
  }

  // 清理所有监听器
  async cleanup() {
    await this.stopListening();
    await CorsBypass.removeAllListeners();
  }
}

// 完整的使用示例
export class CorsBypassExample {
  private httpExample = new HttpExample();
  private sseExample = new SSEExample();

  async init() {
    // 启动 SSE 连接
    await this.sseExample.startListening();
    
    // 发送一些 HTTP 请求
    await this.httpExample.getData();
    await this.httpExample.postData();
  }

  async cleanup() {
    await this.sseExample.cleanup();
  }
}

// 在 Ionic/Angular 组件中的使用示例
/*
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CorsBypassExample } from './cors-bypass-example';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {
  private corsBypassExample = new CorsBypassExample();

  async ngOnInit() {
    await this.corsBypassExample.init();
  }

  async ngOnDestroy() {
    await this.corsBypassExample.cleanup();
  }
}
*/
