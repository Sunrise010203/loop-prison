# 技术规范

## 技术栈

- **前端**：HTML5 Canvas + 原生 JavaScript（ES6+）
- **样式**：CSS3（无预处理器）
- **无第三方依赖**：不引入任何库/框架
- **LLM 集成**：OpenAI 兼容 API（用户自备 API Key）

## 文件加载顺序

```
js/main.js        → 游戏总控（最先加载，初始化 window.game）
js/spriteLoader.js → 精灵图加载与动画（挂载 window.game.sprites）
js/map.js         → 关卡配置（挂载 window.game.map）
js/player.js      → 玩家角色（挂载 window.game.player1）
js/aiPlayer.js    → AI 队友（挂载 window.game.aiPlayer）
js/events.js      → 突发事件（覆写 window.game.triggerEvent）
js/llmClient.js   → LLM 客户端（挂载 window.game.llmClient）
js/voice.js       → 语音指挥（挂载 window.game.voiceControl）
js/roast.js       → 吐槽系统（挂载 window.game.roast）
```

## window.game 完整接口定义

```js
window.game = {
  // === Canvas 相关 ===
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,

  // === 游戏状态 ===
  state: 'playing' | 'paused' | 'win' | 'lose',
  allyStatus: 'alive' | 'damaged',
  timer: number,               // 当前剩余秒数
  currentLevelIndex: number,   // 当前关卡索引
  levels: Array,               // 关卡数据数组（由 map.js 填充）
  // === 角色引用（由各自的 js 文件挂载）===
  player1: null | Player,
  aiPlayer: null | AIPlayer,
  map: null | MapData,

  // === 语音 / LLM ===
  voiceControl: null | VoiceControl,
  llmClient: null | LLMClient,

  // === 突发事件 ===
  events: Array,     // 当前活跃事件列表

  // === 输入状态 ===
  keys: Object,      // 键盘按键状态，如 { 'KeyW': true, 'KeyA': false, ... }

  // === 方法 ===
  addEventLog(text): void,
  triggerEvent(eventObj): void,
  loadLevel(index): void,
  updateUI(): void,
  checkWinCondition(): boolean,
  gameLoop(timestamp): void,
  startGame(): void,
  respawnPlayer(): void,
  respawnAI(): void
};
```

## LLM 客户端接口（window.game.llmClient）

```js
window.game.llmClient = {
  apiKey: string,        // API 密钥
  endpoint: string,      // API 端点 URL
  model: string,         // 模型名称
  connected: boolean,    // 连接状态
  lastAction: object,    // 最后一次解析的动作 { action, reason }
  lastTranscript: string, // 最后一次语音识别文本
  _isProcessing: boolean, // LLM 请求中

  setApiKey(key): void,
  setEndpoint(endpoint, model): void,
  testConnection(): Promise<boolean>,
  sendCommand(transcript): Promise<{action, reason}>
};
```

## AI 队友外部指令接口（window.game.aiPlayer）

```js
window.game.aiPlayer = {
  // ...原有属性...
  externalCommand: { action: string, timestamp: number }, // 外部指令
  externalCommandTimeout: number, // 超时时间(ms)

  setExternalCommand(action): void,  // 接收 LLM 指令
  clearExternalCommand(): void,      // 清除指令
  // ...
};
```

## 语音指挥接口（window.game.voiceControl）

```js
window.game.voiceControl = {
  isListening: boolean,
  currentCommand: string,

  start(): void,   // 启动语音识别（Web Speech API）
  stop(): void,    // 停止语音识别
  toggle(): void   // 切换状态
};
```

## 精灵动画接口（window.game.sprites）

```js
window.game.sprites = {
  player: { idle, walk1, walk2, jump, crouch: Image|null },
  ai:    { idle, walk1, walk2, jump, crouch: Image|null },
  loaded: boolean,
  walkFrameInterval: 150,  // 步行帧切换间隔(ms)

  loadAll(): Promise<void>,
  updateAnim(dt): void,
  drawCharacter(ctx, role, char): void
};
```

**角色图片命名**（48×48px PNG，纯黑背景）：
| 文件 | 状态 |
|------|------|
| `player-idle.png` / `ai-idle.png` | 站立 |
| `player-walk1.png` / `ai-walk1.png` | 步行帧1 |
| `player-walk2.png` / `ai-walk2.png` | 步行帧2 |
| `player-jump.png` / `ai-jump.png` | 跳跃 |
| `player-crouch.png` / `ai-crouch.png` | 下蹲 |

- 步行 2 帧交替播放（150ms 间隔）
- 向左走通过 Canvas `scale(-1, 1)` 水平翻转
- 图片缺失自动回退几何方块绘制

## 动作指令列表（LLM 输出）

| 指令 | 说明 |
|------|------|
| move_left | 向左移动 |
| move_right | 向右移动 |
| jump | 跳跃 |
| crouch | 蹲下 |
| stop | 停止移动 |
| move_left_jump | 向左跳 |
| move_right_jump | 向右跳 |
| wait | 原地等待 |

## 坐标系

- Canvas 尺寸：800 × 600 像素
- 坐标原点：左上角 (0, 0)
- X 轴：向右递增
- Y 轴：向下递增
- 所有障碍物和终点区坐标均在此范围内

## 命名规范

- JS 变量/函数：camelCase
- CSS 类名：kebab-case
- HTML ID：kebab-case
- 常量：UPPER_SNAKE_CASE（如有）

## 碰撞检测
- 使用 AABB（轴对齐矩形包围盒）算法
- `window.game.map.checkCollision(rect)` — rect 格式 `{x, y, w, h}`
- 与当前关卡所有 obstacles 逐一比对
- 返回 `true`（碰撞）或 `false`（无碰撞）