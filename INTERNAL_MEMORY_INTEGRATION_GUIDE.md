# AetherLink 内置记忆系统集成开发文档

## 项目背景

AetherLink 是一个基于 React + TypeScript + Capacitor 的跨平台 AI 聊天应用。本次集成旨在构建一个完全内置的智能记忆系统，使用现有的 LLM API 和嵌入模型，实现用户个性化体验和上下文感知对话，无需任何外部记忆服务依赖。

### 技术栈
- **前端框架**: React 19 + TypeScript
- **状态管理**: Redux Toolkit + Redux Persist
- **UI 组件**: Material-UI + Framer Motion
- **移动端**: Capacitor 7.x
- **数据存储**: Dexie (IndexedDB) + Redux Persist
- **构建工具**: Vite 6.x
- **记忆系统**: 内置实现（使用现有 LLM + Embeddings API）

### 内置记忆系统架构
```
内置记忆系统
├── 记忆提取器 (使用现有 LLM API)
├── 语义搜索 (OpenAI Embeddings API)
├── 本地存储 (Dexie 数据库扩展)
├── 上下文构建器
└── 记忆管理器
```

### 数据流程设计
```
用户对话 → 记忆提取(LLM) → 向量化(Embeddings) → 本地存储(Dexie)
                                                           ↓
用户新输入 → 语义搜索(Embeddings) → 相关记忆检索 → 上下文增强 → LLM响应
```

## 开发准则和规范

### 代码规范
- ✅ 使用 TypeScript 严格模式，所有类型必须明确定义
- ✅ 遵循 ESLint 配置，代码必须通过 lint 检查
- ✅ 使用 camelCase 命名变量和函数，PascalCase 命名组件和类
- ✅ 所有异步操作必须有错误处理和降级机制
- ❌ **禁止在代码中使用表情符号和特殊字符**
- ❌ **禁止使用 console.log，使用 LoggerService 替代**
- ❌ **禁止直接修改 Redux state，必须通过 actions**
- ❌ **禁止在组件中直接调用 API，必须通过 services**

### 记忆系统特殊规范
- ✅ 记忆功能必须有开关控制，可随时禁用
- ✅ 记忆提取失败时必须降级到普通对话模式
- ✅ 所有记忆操作必须异步执行，不阻塞主流程
- ✅ 记忆数据必须加密存储，保护用户隐私
- ❌ **禁止在记忆中存储敏感信息（密码、API密钥等）**
- ❌ **禁止记忆功能影响现有消息处理性能**

### 文件命名规范
- 记忆服务文件：`MemoryServiceName.ts`
- 记忆组件文件：`MemoryComponentName.tsx`
- 记忆类型文件：`memoryTypes.ts`
- 记忆配置文件：`memoryConfig.ts`
- 记忆测试文件：`memoryFileName.test.ts`

### 导入顺序规范
```typescript
// 1. React 相关
import React from 'react';
import { useState, useEffect } from 'react';

// 2. 第三方库
import { useSelector, useDispatch } from 'react-redux';
import { Button, Box } from '@mui/material';

// 3. 项目内部导入
import { InternalMemoryService } from '../services/memory';
import { RootState } from '../store';
import type { MemoryRecord } from '../types/internalMemory';
```

### 错误处理规范
```typescript
// 记忆系统错误处理模式
try {
  const memories = await memoryService.searchMemories(query);
  return memories;
} catch (error) {
  LoggerService.log('ERROR', 'Memory search failed, falling back to normal mode', { 
    error, 
    query,
    userId 
  });
  // 降级到普通模式，不影响用户体验
  return [];
}
```

## 开发阶段规划

### 阶段一：基础架构搭建 (预计 3-4 天)
**目标**: 建立内置记忆系统基础架构和数据库扩展

#### 新增文件
- [ ] `src/types/internalMemory.ts` - 内置记忆类型定义
- [ ] `src/shared/config/internalMemoryConfig.ts` - 内置记忆配置
- [ ] `src/shared/database/memorySchema.ts` - 记忆数据库表结构
- [ ] `src/shared/services/memory/index.ts` - 记忆服务导出
- [ ] `src/shared/services/memory/InternalMemoryService.ts` - 内置记忆核心服务
- [ ] `src/shared/store/slices/internalMemorySlice.ts` - 记忆状态管理

#### 修改文件
- [ ] `src/shared/services/DexieStorageService.ts` - 扩展记忆数据表
- [ ] `src/shared/store/index.ts` - 集成记忆状态
- [ ] `src/shared/services/index.ts` - 导出记忆服务
- [ ] `vite.config.ts` - 构建配置优化（如需要）

#### 完成标准
- [ ] 所有新增文件创建完成
- [ ] Dexie 数据库成功扩展记忆表
- [ ] TypeScript 编译无错误
- [ ] ESLint 检查通过
- [ ] `npm run build` 构建成功
- [ ] 基础 InternalMemoryService 可以初始化

#### 详细实现指导

**1. 记忆数据库表结构设计** (参考 Mem0 的存储设计)
```typescript
// src/shared/database/memorySchema.ts
interface MemoryRecord {
  id: string;                    // UUID
  userId: string;                // 用户标识
  content: string;               // 记忆内容
  category: 'preference' | 'background' | 'skill' | 'habit' | 'plan';
  importance: number;            // 1-10 重要性评分
  embedding: number[];           // 向量表示
  hash: string;                  // 内容哈希，用于去重
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>; // 额外元数据
}
```

**2. 内置记忆配置结构** (参考 Mem0 配置设计)
```typescript
// src/shared/config/internalMemoryConfig.ts
interface InternalMemoryConfig {
  enabled: boolean;
  extraction: {
    model: 'gpt-4o-mini' | 'gpt-4o' | 'claude-3-haiku';
    minConversationLength: number;
    maxMemoriesPerExtraction: number;
  };
  search: {
    embeddingModel: string; // 使用项目现有的嵌入模型配置
    similarityThreshold: number;
    maxResults: number;
  };
  storage: {
    maxMemoriesPerUser: number;
    retentionDays: number;
  };
}
```

**3. 核心服务接口设计** (参考 Mem0 TypeScript 实现)
```typescript
// src/shared/services/memory/InternalMemoryService.ts
class InternalMemoryService {
  async addMemories(messages: Message[], userId: string): Promise<MemoryItem[]>;
  async searchMemories(query: string, userId: string, limit?: number): Promise<MemoryItem[]>;
  async updateMemory(memoryId: string, content: string): Promise<void>;
  async deleteMemory(memoryId: string): Promise<void>;
  async getAllMemories(userId: string): Promise<MemoryItem[]>;
}
```

---

### 阶段二：记忆提取和存储 (预计 4-5 天)
**目标**: 实现记忆提取引擎和本地存储功能

#### 新增文件
- [ ] `src/shared/services/memory/MemoryExtractor.ts` - 记忆提取器
- [ ] `src/shared/services/memory/MemoryStorageService.ts` - 记忆存储服务
- [ ] `src/shared/services/memory/EmbeddingService.ts` - 嵌入向量服务

#### 修改文件
- [ ] `src/shared/services/messages/messageService.ts` - 集成记忆提取
- [ ] `src/shared/services/messages/ResponseHandler.ts` - 响应后记忆提取
- [ ] `src/shared/services/DexieStorageService.ts` - 完善记忆存储方法

#### 完成标准
- [ ] 对话结束后自动提取记忆
- [ ] 记忆成功存储到本地数据库
- [ ] 记忆向量化和存储正常工作
- [ ] 记忆提取失败时正常降级
- [ ] `npm run build` 构建成功
- [ ] 记忆提取功能可用

#### 详细实现指导

**1. 记忆提取引擎实现** (参考 Mem0 的 FACT_RETRIEVAL_PROMPT)
```typescript
// src/shared/services/memory/MemoryExtractor.ts
class MemoryExtractor {
  private readonly FACT_EXTRACTION_PROMPT = `
你是一个个人信息整理专家，专门从对话中准确提取和整理事实、用户记忆和偏好。

需要记住的信息类型：
1. 个人偏好：喜好、厌恶、特定偏好
2. 重要个人信息：姓名、关系、重要日期
3. 计划和意图：即将到来的事件、目标、计划
4. 活动偏好：餐饮、旅行、爱好偏好
5. 健康信息：饮食限制、健身习惯
6. 职业信息：工作、职业目标
7. 其他信息：喜欢的书籍、电影、品牌等

返回JSON格式：{"facts": ["事实1", "事实2"]}
  `;

  async extractMemories(messages: Message[]): Promise<string[]> {
    try {
      const conversation = this.formatConversation(messages);
      const response = await this.llmService.chat([
        { role: "system", content: this.FACT_EXTRACTION_PROMPT },
        { role: "user", content: `对话内容：\n${conversation}` }
      ]);

      const parsed = JSON.parse(response);
      return parsed.facts || [];
    } catch (error) {
      LoggerService.log('ERROR', 'Memory extraction failed', { error });
      return []; // 降级：返回空数组
    }
  }
}
```

**2. 记忆更新决策引擎** (参考 Mem0 的 UPDATE_MEMORY_PROMPT)
```typescript
// 记忆操作决策逻辑
class MemoryUpdateDecisionEngine {
  private readonly UPDATE_DECISION_PROMPT = `
你是智能记忆管理器，可以执行四种操作：
1. ADD - 添加新记忆
2. UPDATE - 更新现有记忆
3. DELETE - 删除记忆
4. NONE - 无变化

比较新提取的事实与现有记忆，为每个新事实决定操作类型。
返回JSON格式：
{
  "memory": [
    {
      "id": "记忆ID",
      "text": "记忆内容",
      "event": "操作类型",
      "old_memory": "旧记忆内容(仅UPDATE时需要)"
    }
  ]
}
  `;

  async decideMemoryOperations(
    existingMemories: MemoryRecord[],
    newFacts: string[]
  ): Promise<MemoryOperation[]> {
    // 实现记忆操作决策逻辑
  }
}
```

**3. 向量化服务实现** (复用现有嵌入模型配置)
```typescript
// src/shared/services/memory/EmbeddingService.ts
import { getEmbeddingModelConfig } from '../../config/embeddingModels';
import { EmbeddingService as ExistingEmbeddingService } from '../EmbeddingService';

class MemoryEmbeddingService {
  private embeddingService: ExistingEmbeddingService;
  private embeddingModel: string;

  constructor(embeddingModel: string = 'text-embedding-3-small') {
    this.embeddingModel = embeddingModel;
    this.embeddingService = new ExistingEmbeddingService();

    // 验证模型是否在项目配置中
    const modelConfig = getEmbeddingModelConfig(embeddingModel);
    if (!modelConfig) {
      LoggerService.log('WARN', `Embedding model ${embeddingModel} not found in config, using default`);
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // 使用项目现有的嵌入服务
      const embedding = await this.embeddingService.generateEmbedding(
        text,
        this.embeddingModel
      );
      return embedding;
    } catch (error) {
      LoggerService.log('ERROR', 'Memory embedding generation failed', {
        error,
        text: text.substring(0, 100), // 只记录前100字符
        model: this.embeddingModel
      });
      throw new Error('Failed to generate memory embedding');
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      // 批量生成嵌入向量，提高效率
      const embeddings = await Promise.all(
        texts.map(text => this.generateEmbedding(text))
      );
      return embeddings;
    } catch (error) {
      LoggerService.log('ERROR', 'Batch embedding generation failed', { error });
      throw new Error('Failed to generate batch embeddings');
    }
  }

  calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vector dimensions must match for similarity calculation');
    }

    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0; // 避免除零错误
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  getEmbeddingDimensions(): number {
    const modelConfig = getEmbeddingModelConfig(this.embeddingModel);
    return modelConfig?.dimensions || 1536; // 默认维度
  }
}
```

---

### 阶段三：语义搜索和上下文增强 (预计 5-7 天)
**目标**: 实现语义搜索和智能上下文构建

#### 新增文件
- [ ] `src/shared/services/memory/SemanticSearchService.ts` - 语义搜索服务
- [ ] `src/shared/services/memory/ContextBuilder.ts` - 上下文构建器
- [ ] `src/components/Memory/MemoryProvider.tsx` - 记忆上下文提供者

#### 修改文件
- [ ] `src/shared/services/messages/messageService.ts` - 集成语义搜索
- [ ] `src/shared/services/TopicService.ts` - 话题级记忆关联
- [ ] `src/shared/store/slices/newMessagesSlice.ts` - 消息状态记忆增强
- [ ] `src/App.tsx` - 集成 MemoryProvider

#### 完成标准
- [ ] 用户输入时自动搜索相关记忆
- [ ] 相关记忆正确注入到 AI 上下文
- [ ] 语义搜索准确率达到预期
- [ ] 上下文构建不影响响应速度
- [ ] `npm run build` 构建成功
- [ ] 完整记忆功能可用

#### 详细实现指导

**1. 语义搜索服务实现** (参考 Mem0 的搜索逻辑)
```typescript
// src/shared/services/memory/SemanticSearchService.ts
class SemanticSearchService {
  async searchSimilarMemories(
    query: string,
    userId: string,
    limit: number = 5
  ): Promise<MemoryRecord[]> {
    try {
      // 1. 生成查询向量
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);

      // 2. 从数据库获取用户所有记忆
      const allMemories = await this.memoryStorage.getUserMemories(userId);

      // 3. 计算相似度并排序
      const similarities = allMemories.map(memory => ({
        memory,
        similarity: this.embeddingService.calculateCosineSimilarity(
          queryEmbedding,
          memory.embedding
        )
      }));

      // 4. 过滤和排序
      return similarities
        .filter(item => item.similarity > this.config.search.similarityThreshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map(item => item.memory);

    } catch (error) {
      LoggerService.log('ERROR', 'Semantic search failed', { error, query, userId });
      return []; // 降级：返回空数组
    }
  }
}
```

**2. 智能上下文构建器** (参考 Mem0 的上下文增强)
```typescript
// src/shared/services/memory/ContextBuilder.ts
class ContextBuilder {
  async buildEnhancedContext(
    userMessage: string,
    userId: string,
    assistantId?: string
  ): Promise<string> {
    try {
      // 1. 搜索相关记忆
      const relevantMemories = await this.semanticSearch.searchSimilarMemories(
        userMessage,
        userId,
        this.config.search.maxResults
      );

      if (relevantMemories.length === 0) {
        return userMessage; // 无记忆时返回原始消息
      }

      // 2. 构建记忆上下文
      const memoryContext = this.formatMemoryContext(relevantMemories);

      // 3. 构建增强上下文
      return this.buildContextPrompt(userMessage, memoryContext, assistantId);

    } catch (error) {
      LoggerService.log('ERROR', 'Context building failed', { error, userMessage });
      return userMessage; // 降级：返回原始消息
    }
  }

  private formatMemoryContext(memories: MemoryRecord[]): string {
    const categorizedMemories = this.categorizeMemories(memories);

    let context = "用户背景信息：\n";

    if (categorizedMemories.preferences.length > 0) {
      context += "偏好设置：\n";
      categorizedMemories.preferences.forEach(mem => {
        context += `- ${mem.content}\n`;
      });
    }

    if (categorizedMemories.background.length > 0) {
      context += "背景信息：\n";
      categorizedMemories.background.forEach(mem => {
        context += `- ${mem.content}\n`;
      });
    }

    // 其他分类...

    return context;
  }

  private buildContextPrompt(
    userMessage: string,
    memoryContext: string,
    assistantId?: string
  ): string {
    return `${memoryContext}

当前用户请求：${userMessage}

请根据用户的背景信息和偏好，提供个性化的回答。`;
  }
}
```

**3. 记忆感知消息服务集成**
```typescript
// 在现有 messageService.ts 中集成记忆功能
class MemoryEnhancedMessageService {
  async processMessageWithMemory(
    message: string,
    userId: string,
    assistantId?: string
  ): Promise<string> {
    try {
      // 1. 构建增强上下文
      const enhancedContext = await this.contextBuilder.buildEnhancedContext(
        message,
        userId,
        assistantId
      );

      // 2. 调用原有的 AI 服务
      const response = await this.originalMessageService.processMessage(enhancedContext);

      // 3. 异步提取和保存新记忆（不阻塞响应）
      this.extractAndSaveMemories([
        { role: 'user', content: message },
        { role: 'assistant', content: response }
      ], userId).catch(error => {
        LoggerService.log('ERROR', 'Memory extraction failed', { error });
      });

      return response;

    } catch (error) {
      LoggerService.log('ERROR', 'Memory-enhanced message processing failed', { error });
      // 降级到原有服务
      return await this.originalMessageService.processMessage(message);
    }
  }
}
```

---

### 阶段四：用户界面和管理功能 (预计 1 周)
**目标**: 实现记忆管理界面和用户控制功能

#### 新增文件
- [ ] `src/pages/Memory/MemorySettingsPage.tsx` - 独立的记忆设置页面
- [ ] `src/components/Memory/MemorySettings.tsx` - 记忆设置面板
- [ ] `src/components/Memory/MemoryInsights.tsx` - 记忆洞察组件
- [ ] `src/components/Memory/MemoryManager.tsx` - 记忆管理界面
- [ ] `src/components/Memory/MemoryList.tsx` - 记忆列表组件
- [ ] `src/components/Memory/MemoryCard.tsx` - 单个记忆卡片组件
- [ ] `src/components/Memory/MemorySearch.tsx` - 记忆搜索组件
- [ ] `src/components/Memory/MemoryStats.tsx` - 记忆统计组件

#### 修改文件
- [ ] `src/shared/services/assistant/AssistantManager.ts` - 助手个性化记忆
- [ ] `src/components/Chat/ChatInterface.tsx` - 聊天界面记忆增强
- [ ] `src/pages/Settings/SettingsPage.tsx` - 添加记忆设置入口
- [ ] `src/shared/router/routes.tsx` - 添加记忆设置页面路由
- [ ] `src/components/Navigation/NavigationMenu.tsx` - 添加记忆设置导航

#### 完成标准
- [ ] 独立的记忆设置页面可访问
- [ ] 用户可以查看和管理个人记忆
- [ ] 记忆设置界面功能完整
- [ ] 记忆洞察数据准确显示
- [ ] 用户可以控制记忆功能开关
- [ ] 记忆搜索和过滤功能正常
- [ ] 记忆统计数据准确显示
- [ ] `npm run build` 构建成功
- [ ] 用户界面完整可用

#### 详细实现指导

**1. 独立记忆设置页面设计** (核心页面)
```typescript
// src/pages/Memory/MemorySettingsPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Tabs,
  Tab,
  Box,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import { MemoryManager } from '../../components/Memory/MemoryManager';
import { MemoryInsights } from '../../components/Memory/MemoryInsights';
import { MemorySettings } from '../../components/Memory/MemorySettings';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const MemorySettingsPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [memoryEnabled, setMemoryEnabled] = useState(true);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom>
        记忆管理
      </Typography>

      {/* 主要开关 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <FormControlLabel
            control={
              <Switch
                checked={memoryEnabled}
                onChange={(e) => setMemoryEnabled(e.target.checked)}
              />
            }
            label="启用智能记忆功能"
          />
          <Typography variant="body2" color="text.secondary">
            AI 将记住您的偏好和重要信息，提供更个性化的体验
          </Typography>
        </CardContent>
      </Card>

      {/* 标签页 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="我的记忆" />
          <Tab label="设置" />
          <Tab label="洞察分析" />
        </Tabs>
      </Box>

      {/* 标签页内容 */}
      <TabPanel value={tabValue} index={0}>
        <MemoryManager />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <MemorySettings />
      </TabPanel>
      <TabPanel value={tabValue} index={2}>
        <MemoryInsights />
      </TabPanel>
    </Container>
  );
};

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

export default MemorySettingsPage;
```

**2. 记忆管理界面组件** (我的记忆标签页)
```typescript
// src/components/Memory/MemoryManager.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { MemoryList } from './MemoryList';
import { MemoryStats } from './MemoryStats';
import { useMemoryService } from '../../hooks/useMemoryService';

export const MemoryManager: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [memories, setMemories] = useState([]);
  const memoryService = useMemoryService();

  useEffect(() => {
    loadMemories();
  }, [searchQuery, categoryFilter]);

  const loadMemories = async () => {
    try {
      const userMemories = await memoryService.searchMemories(
        searchQuery,
        'current-user',
        { category: categoryFilter }
      );
      setMemories(userMemories);
    } catch (error) {
      console.error('Failed to load memories:', error);
    }
  };

  return (
    <Box>
      {/* 统计概览 */}
      <MemoryStats />

      {/* 搜索和过滤 */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              placeholder="搜索记忆内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>分类</InputLabel>
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <MenuItem value="all">全部</MenuItem>
                <MenuItem value="preference">偏好设置</MenuItem>
                <MenuItem value="background">背景信息</MenuItem>
                <MenuItem value="skill">技能专长</MenuItem>
                <MenuItem value="habit">使用习惯</MenuItem>
                <MenuItem value="plan">计划目标</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {/* 记忆列表 */}
      <MemoryList memories={memories} onMemoryUpdate={loadMemories} />
    </Box>
  );
};
```

**3. 记忆列表和卡片组件**
```typescript
// src/components/Memory/MemoryList.tsx
import React from 'react';
import { Grid, Typography, Box } from '@mui/material';
import { MemoryCard } from './MemoryCard';
import type { MemoryRecord } from '../../types/internalMemory';

interface MemoryListProps {
  memories: MemoryRecord[];
  onMemoryUpdate: () => void;
}

export const MemoryList: React.FC<MemoryListProps> = ({
  memories,
  onMemoryUpdate
}) => {
  if (memories.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="h6" color="text.secondary">
          暂无记忆数据
        </Typography>
        <Typography variant="body2" color="text.secondary">
          开始与 AI 对话，系统会自动学习和记住您的偏好
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2}>
      {memories.map((memory) => (
        <Grid item xs={12} key={memory.id}>
          <MemoryCard
            memory={memory}
            onUpdate={onMemoryUpdate}
            onDelete={onMemoryUpdate}
          />
        </Grid>
      ))}
    </Grid>
  );
};

// src/components/Memory/MemoryCard.tsx
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField
} from '@mui/material';
import {
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

interface MemoryCardProps {
  memory: MemoryRecord;
  onUpdate: () => void;
  onDelete: () => void;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({
  memory,
  onUpdate,
  onDelete
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState(memory.content);

  const getCategoryColor = (category: string) => {
    const colors = {
      preference: 'primary',
      background: 'secondary',
      skill: 'success',
      habit: 'warning',
      plan: 'info'
    };
    return colors[category] || 'default';
  };

  const handleEdit = async () => {
    try {
      await memoryService.updateMemory(memory.id, editContent);
      setEditDialogOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to update memory:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await memoryService.deleteMemory(memory.id);
      onDelete();
    } catch (error) {
      console.error('Failed to delete memory:', error);
    }
  };

  return (
    <>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box flex={1}>
              <Typography variant="body1" gutterBottom>
                {memory.content}
              </Typography>
              <Box display="flex" gap={1} alignItems="center">
                <Chip
                  label={memory.category}
                  size="small"
                  color={getCategoryColor(memory.category)}
                />
                <Typography variant="caption" color="text.secondary">
                  重要性: {memory.importance}/10
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(memory.createdAt).toLocaleDateString()}
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
              <MoreIcon />
            </IconButton>
          </Box>
        </CardContent>
      </Card>

      {/* 操作菜单 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => {
          setEditDialogOpen(true);
          setAnchorEl(null);
        }}>
          <EditIcon sx={{ mr: 1 }} />
          编辑
        </MenuItem>
        <MenuItem onClick={() => {
          handleDelete();
          setAnchorEl(null);
        }}>
          <DeleteIcon sx={{ mr: 1 }} />
          删除
        </MenuItem>
      </Menu>

      {/* 编辑对话框 */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>编辑记忆</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>取消</Button>
          <Button onClick={handleEdit} variant="contained">保存</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
```

**4. 记忆统计组件**
```typescript
// src/components/Memory/MemoryStats.tsx
import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress
} from '@mui/material';
import {
  Memory as MemoryIcon,
  TrendingUp as TrendingIcon,
  Category as CategoryIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';

interface MemoryStats {
  totalMemories: number;
  categoryCounts: Record<string, number>;
  recentGrowth: number;
  averageImportance: number;
}

export const MemoryStats: React.FC = () => {
  const [stats, setStats] = useState<MemoryStats>({
    totalMemories: 0,
    categoryCounts: {},
    recentGrowth: 0,
    averageImportance: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const memoryStats = await memoryService.getMemoryStats('current-user');
      setStats(memoryStats);
    } catch (error) {
      console.error('Failed to load memory stats:', error);
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color?: string;
  }> = ({ title, value, icon, color = 'primary' }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" gap={2}>
          <Box color={`${color}.main`}>{icon}</Box>
          <Box>
            <Typography variant="h4" component="div">
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        记忆统计
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={6} md={3}>
          <StatCard
            title="总记忆数"
            value={stats.totalMemories}
            icon={<MemoryIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            title="本周新增"
            value={`+${stats.recentGrowth}`}
            icon={<TrendingIcon />}
            color="success"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            title="分类数量"
            value={Object.keys(stats.categoryCounts).length}
            icon={<CategoryIcon />}
            color="info"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            title="平均重要性"
            value={`${stats.averageImportance.toFixed(1)}/10`}
            icon={<ScheduleIcon />}
            color="warning"
          />
        </Grid>
      </Grid>

      {/* 分类分布 */}
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            分类分布
          </Typography>
          {Object.entries(stats.categoryCounts).map(([category, count]) => (
            <Box key={category} sx={{ mb: 1 }}>
              <Box display="flex" justifyContent="space-between" mb={0.5}>
                <Typography variant="body2">{category}</Typography>
                <Typography variant="body2">{count}</Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(count / stats.totalMemories) * 100}
              />
            </Box>
          ))}
        </CardContent>
      </Card>
    </Box>
  );
};
```

**5. 路由配置和导航集成**
```typescript
// 在 src/shared/router/routes.tsx 中添加
import { MemorySettingsPage } from '../../pages/Memory/MemorySettingsPage';

// 添加路由
{
  path: '/memory',
  element: <MemorySettingsPage />,
  meta: {
    title: '记忆管理',
    requiresAuth: true
  }
}

// 在 src/components/Navigation/NavigationMenu.tsx 中添加
import { Memory as MemoryIcon } from '@mui/icons-material';

// 添加导航项
{
  label: '记忆管理',
  path: '/memory',
  icon: <MemoryIcon />,
  badge: memoryCount > 0 ? memoryCount : undefined
}
```

**6. 记忆设置详细配置组件**
```typescript
// src/components/Memory/MemorySettings.tsx
import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert
} from '@mui/material';

export const MemorySettings: React.FC = () => {
  const [settings, setSettings] = useState({
    autoExtraction: true,
    extractionSensitivity: 7,
    maxMemoriesPerUser: 1000,
    retentionDays: 90,
    extractionModel: 'gpt-4o-mini'
  });

  const handleSave = async () => {
    try {
      await memoryService.updateSettings(settings);
      // 显示成功消息
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        记忆设置
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            自动记忆提取
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={settings.autoExtraction}
                onChange={(e) => setSettings({
                  ...settings,
                  autoExtraction: e.target.checked
                })}
              />
            }
            label="自动从对话中提取记忆"
          />
          <Typography variant="body2" color="text.secondary">
            启用后，AI 会自动分析对话内容并提取重要信息
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            提取敏感度
          </Typography>
          <Slider
            value={settings.extractionSensitivity}
            onChange={(_, value) => setSettings({
              ...settings,
              extractionSensitivity: value as number
            })}
            min={1}
            max={10}
            marks
            valueLabelDisplay="auto"
          />
          <Typography variant="body2" color="text.secondary">
            数值越高，提取的记忆越详细（可能包含更多细节）
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            存储限制
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>最大记忆数量</InputLabel>
            <Select
              value={settings.maxMemoriesPerUser}
              onChange={(e) => setSettings({
                ...settings,
                maxMemoriesPerUser: e.target.value as number
              })}
            >
              <MenuItem value={500}>500 条</MenuItem>
              <MenuItem value={1000}>1000 条</MenuItem>
              <MenuItem value={2000}>2000 条</MenuItem>
              <MenuItem value={-1}>无限制</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>记忆保留时间</InputLabel>
            <Select
              value={settings.retentionDays}
              onChange={(e) => setSettings({
                ...settings,
                retentionDays: e.target.value as number
              })}
            >
              <MenuItem value={30}>30 天</MenuItem>
              <MenuItem value={90}>90 天</MenuItem>
              <MenuItem value={180}>180 天</MenuItem>
              <MenuItem value={365}>1 年</MenuItem>
              <MenuItem value={-1}>永久保留</MenuItem>
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            数据管理
          </Typography>
          <Box display="flex" gap={2}>
            <Button variant="outlined" color="warning">
              导出记忆数据
            </Button>
            <Button variant="outlined" color="error">
              清除所有记忆
            </Button>
          </Box>
          <Alert severity="info" sx={{ mt: 2 }}>
            记忆数据仅存储在您的设备上，完全由您控制
          </Alert>
        </CardContent>
      </Card>

      <Button variant="contained" onClick={handleSave}>
        保存设置
      </Button>
    </Box>
  );
};
```

---

### 阶段五：性能优化和测试 (预计 1 周)
**目标**: 优化性能，完善测试覆盖，准备生产部署

#### 新增文件
- [ ] `src/shared/services/memory/InternalMemoryService.test.ts` - 记忆服务测试
- [ ] `src/components/Memory/MemoryProvider.test.tsx` - 记忆提供者测试
- [ ] `src/shared/services/memory/PerformanceOptimizer.ts` - 性能优化器

#### 修改文件
- [ ] 所有记忆相关文件 - 性能优化和代码重构
- [ ] `src/shared/config/internalMemoryConfig.ts` - 生产环境配置

#### 完成标准
- [ ] 单元测试覆盖率 > 80%
- [ ] 性能基准测试通过
- [ ] 内存泄漏检查通过
- [ ] 移动端性能测试通过
- [ ] 记忆功能对现有性能影响 < 5%
- [ ] `npm run build` 构建成功
- [ ] 生产环境就绪

---

## 构建和验证流程

### 每个阶段完成后必须执行
```bash
# 1. 类型检查
npm run type-check

# 2. 代码规范检查
npm run lint

# 3. 构建验证
npm run build

# 4. 移动端构建验证（阶段三后开始）
npm run build:android
npm run build:ios

# 5. 功能测试（阶段二后开始）
npm test -- --testPathPattern=memory
```

### 验证清单
- [ ] TypeScript 编译无错误无警告
- [ ] ESLint 检查无错误无警告
- [ ] Vite 构建成功
- [ ] 移动端构建成功
- [ ] 现有功能无回归问题
- [ ] 新功能按预期工作
- [ ] 记忆功能可以正常开启/关闭

## 配置管理

### 复用现有项目配置
**重要**: 记忆系统将完全复用项目现有的配置，无需额外配置：

- ✅ **嵌入模型**: 使用 `src/shared/config/embeddingModels.ts` 中的配置
- ✅ **LLM 模型**: 使用现有的 OpenAI、Anthropic、Gemini 配置
- ✅ **API 密钥**: 使用现有的环境变量和密钥管理
- ✅ **数据库**: 扩展现有的 Dexie 数据库
- ✅ **日志系统**: 使用现有的 LoggerService

### 内置记忆系统配置
```typescript
// src/shared/config/internalMemoryConfig.ts
export const internalMemoryConfig = {
  // 功能开关
  enabled: true,
  autoExtraction: true,
  semanticSearch: true,
  
  // 记忆提取配置
  extraction: {
    minConversationLength: 3,
    extractionModel: 'gpt-4o-mini',
    maxMemoriesPerExtraction: 5
  },
  
  // 语义搜索配置
  search: {
    embeddingModel: 'text-embedding-3-small', // 使用项目现有配置
    similarityThreshold: 0.7,
    maxResults: 5
  },
  
  // 存储配置
  storage: {
    maxMemoriesPerUser: 1000,
    cleanupOldMemories: true,
    retentionDays: 90
  }
};
```

### 环境变量（可选）
```env
# 记忆功能开关（可选，默认从配置文件读取）
VITE_MEMORY_ENABLED=true
VITE_MEMORY_DEBUG=true
VITE_MEMORY_AUTO_EXTRACTION=true
```

## 故障排除

### 常见问题
1. **记忆提取失败**
   - 检查 LLM API 配额和连接
   - 查看 LoggerService 详细日志
   - 确认记忆提取模型配置正确

2. **语义搜索不准确**
   - 检查 Embeddings API 配额
   - 调整相似度阈值
   - 检查记忆向量存储是否正确

3. **性能影响过大**
   - 检查记忆缓存配置
   - 优化记忆检索频率
   - 确保异步处理正常工作

### 调试工具
- 使用 LoggerService 记录详细的记忆操作日志
- 使用 Redux DevTools 查看记忆状态变化
- 使用 Chrome DevTools 分析记忆功能性能影响
- 使用 Dexie 调试工具检查记忆数据存储

## 技术优势

### 完全自主控制
- ✅ 无外部 API 依赖，使用现有 LLM 和 Embeddings API
- ✅ 数据完全本地化存储，隐私安全可控
- ✅ 成本可预测，复用现有 API 配额
- ✅ 可离线工作（基于本地缓存）

### 性能优化设计
- ✅ 异步记忆处理，不阻塞主要对话流程
- ✅ 智能缓存机制，减少重复计算
- ✅ 分批处理记忆操作，优化资源使用
- ✅ 降级机制，记忆功能故障时自动切换到普通模式

### 成本效益分析
- **Embeddings 成本**: OpenAI text-embedding-3-small 约 $0.00002/1K tokens
- **平均记忆成本**: 每条记忆约 50 tokens，成本约 $0.000001
- **1000 条记忆总成本**: 约 $0.001（非常经济）
- **LLM 提取成本**: 复用现有 API 配额，无额外成本

## 数据隐私和安全

### 隐私保护措施
- 记忆数据仅存储在用户本地设备
- 敏感信息自动过滤，不进入记忆系统
- 用户完全控制记忆的查看、编辑和删除
- 支持记忆数据导出和完全清除

### 安全设计
- 记忆数据加密存储在 IndexedDB
- 记忆向量数据无法反向解析出原始内容
- 记忆功能可随时完全禁用
- 不同用户的记忆完全隔离

## 项目里程碑

- [ ] **里程碑 1**: 基础架构搭建完成
- [ ] **里程碑 2**: 记忆提取和存储完成
- [ ] **里程碑 3**: 语义搜索和上下文增强完成
- [ ] **里程碑 4**: 用户界面和管理功能完成
- [ ] **里程碑 5**: 性能优化和测试完成
- [ ] **里程碑 6**: 生产环境部署就绪

## 预期效果

### 用户体验提升
- 减少重复解释背景信息 60%+
- 提高 AI 回答相关性 40%+
- 增强对话连贯性和个性化体验
- 提升用户满意度和应用粘性

### 技术指标目标
- 记忆检索响应时间 < 200ms
- 记忆准确率 > 85%
- 对现有功能性能影响 < 5%
- 系统稳定性保持 > 99.5%

## Mem0 参考资料分析

### 核心架构学习
基于下载的 Mem0 项目 (`mem0-reference/`) 分析，我们可以学习以下关键设计：

#### 1. **记忆提取流程** (参考: `mem0/configs/prompts.py`)
```
用户对话 → 事实提取(LLM) → 记忆更新决策(LLM) → 向量存储
```

#### 2. **关键提示词模板** (参考实现)
- **事实提取提示词**: `FACT_RETRIEVAL_PROMPT` - 从对话中提取用户偏好和重要信息
- **记忆更新提示词**: `DEFAULT_UPDATE_MEMORY_PROMPT` - 决定添加/更新/删除记忆的逻辑
- **记忆分类**: 个人偏好、重要细节、计划意图、活动偏好、健康信息、职业信息等

#### 3. **TypeScript 实现参考** (参考: `mem0-ts/src/oss/src/memory/index.ts`)
- 配置管理和工厂模式
- 异步记忆处理流程
- 错误处理和降级机制
- 向量搜索和相似度计算

#### 4. **数据结构设计** (参考: `mem0-ts/src/oss/src/types/`)
```typescript
interface MemoryItem {
  id: string;
  memory: string;
  hash?: string;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
}

interface SearchResult {
  results: MemoryItem[];
  relations?: any[];
}
```

### 关键学习点
1. **双阶段LLM处理**: 先提取事实，再决策记忆操作
2. **UUID映射技术**: 防止LLM产生幻觉UUID
3. **向量相似度搜索**: 使用embedding检索相关记忆
4. **元数据管理**: 用户ID、代理ID、会话ID的层级管理
5. **事件驱动设计**: ADD/UPDATE/DELETE/NONE 操作类型

## 实现参考文件

### 参考提示词文件
- `mem0-reference/mem0/configs/prompts.py` - 完整的提示词模板
- `mem0-reference/mem0-ts/src/oss/src/prompts/index.ts` - TypeScript版本提示词

### 参考实现文件
- `mem0-reference/mem0/memory/main.py` - Python核心实现
- `mem0-reference/mem0-ts/src/oss/src/memory/index.ts` - TypeScript核心实现
- `mem0-reference/mem0/memory/utils.py` - 工具函数
- `mem0-reference/mem0-ts/src/oss/src/utils/memory.ts` - TypeScript工具函数

### 参考配置文件
- `mem0-reference/mem0/configs/base.py` - 配置结构
- `mem0-reference/mem0-ts/src/oss/src/config/` - TypeScript配置管理

---

**最后更新**: 2025年1月
**文档版本**: v2.1 (内置记忆系统版本 + Mem0参考)
**负责人**: 开发团队
