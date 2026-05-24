# 项目需求文档

## 游戏概述

《永返》是一款双人 2D 俯视合作闯关网页游戏。

- **类型**：双人合作解谜闯关
- **平台**：Web 浏览器（纯前端）
- **视角**：俯视自由移动
- **操作**：P1 键盘（WASD），P2 AI 队友（自动寻路 + 语音指挥）

## 剧情设定

玩家和 AI 队友是系统修复员，被困在崩溃的虚拟空间"永返"。核心 AI"艾莉"维持着空间的稳定，但她不断产生错误事件。你们必须在限时内修复各模块，否则世界重置，艾莉受伤。目标——让她活下去。

## 功能需求清单

### 核心框架（本次实现）
- [x] Canvas 800×600 游戏画布
- [x] 深色终端/故障艺术风格 UI
- [x] 计时器系统（倒计时，超时失败）
- [x] 艾莉状态显示（存活/受损）
- [x] 系统日志面板（剧情文字输出）
- [x] 游戏状态机（playing/paused/win/lose）
- [x] 关卡配置（至少 2 关）
- [x] 碰撞检测系统

### 角色系统（成员 A）
- [ ] 玩家角色：WASD 移动 + 碰撞检测
- [ ] AI 队友：寻路算法 + 自动移动
- [ ] 角色绘制（精灵图替换占位矩形）

### 语音与事件系统（成员 B）
- [ ] 语音指挥 AI 队友（Web Speech API）
- [ ] 突发事件随机触发（临时障碍/减速效果）
- [ ] 事件管理（触发、持续、清理）

### 吐槽系统（成员 C）
- [ ] 根据游戏数据生成毒舌吐槽台词
- [ ] 吐槽输出到系统日志

## 各模块职责分工

| 模块 | 负责人 | 挂载点 | 依赖 |
|------|--------|--------|------|
| 总控 | 框架（本次） | window.game | 无 |
| 地图 | 框架（本次） | window.game.map | window.game.ctx |
| 玩家 | 成员 A | window.game.player1 | window.game.keys, window.game.map.checkCollision |
| AI | 成员 A | window.game.aiPlayer | window.game.map.finishZone, window.game.map.checkCollision |
| 事件 | 成员 B | window.game.triggerEvent | window.game.events, window.game.addEventLog |
| 语音 | 成员 B | window.game.voiceControl | window.game.aiPlayer |
| 吐槽 | 成员 C | window.game.roast | window.game.addEventLog |
