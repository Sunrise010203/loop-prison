# 永返 — 项目 CLAUDE.md

## 项目概述
双人 2D 俯视合作闯关网页游戏。纯前端 HTML5 Canvas + 原生 JS，所有公共接口挂载在 window.game 上。

## 标准文件路径

| 文件 | 路径 |
|------|------|
| 需求文档 | docs/requirements.md |
| 技术规范 | docs/technical-spec.md |
| 设计规范 | docs/design-spec.md |
| 执行步骤 | docs/implementation-steps.md |
| 开发日志 | devlog/YYYY-MM-DD.md |

## 工作说明

1. 开始任何开发任务前，先阅读 docs/ 中的规范文件
2. 每次修改代码后，更新 devlog/ 当日日志
3. 遵循分步开发计划（docs/implementation-steps.md），每完成一步验证后再进行下一步
4. 所有公共接口必须挂载在 window.game 上，保持与 docs/technical-spec.md 中的接口定义一致
5. 新增接口需同步更新 docs/technical-spec.md
6. JS 文件加载顺序：main.js → spriteLoader.js → map.js → player.js → aiPlayer.js → llmClient.js → events.js → voice.js → roast.js

## 接口约定速查

| 模块 | 挂载点 | 关键方法 |
|------|--------|----------|
| 总控 | window.game | addEventLog, loadLevel, updateUI, gameLoop, startGame |
| 地图 | window.game.map | draw, checkCollision |
| 玩家 | window.game.player1 | update, draw |
| AI | window.game.aiPlayer | update, draw |
| 事件 | window.game.triggerEvent | (覆写函数) |
| 语音 | window.game.voiceControl | start, stop, currentCommand |
| 吐槽 | window.game.roast | generate |
| 精灵 | window.game.sprites | loadAll, loadSheet, drawCharacter, getFrameIndex, updateAnim |
