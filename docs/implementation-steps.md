# 执行步骤

## 第 1 步：项目骨架搭建

**输入**：无
**输出**：
- 项目目录结构（loop-prison/css/, js/, docs/, devlog/）
- 5 个占位 JS 文件（带完整 JSDoc 对象骨架）
- 4 个 docs 标准文档
- 1 个初始 devlog 条目
- 项目根目录 CLAUDE.md

**验证**：目录结构完整，所有占位文件存在

---

## 第 2 步：静态页面 UI

**输入**：第 1 步的目录结构
**输出**：
- index.html：Canvas + UI 覆盖层 + JS 引入
- css/style.css：完整终端故障风格

**验证**：Live Server 打开，看到深色终端风界面布局

---

## 第 3 步：游戏总控 main.js

**输入**：第 2 步的 index.html
**输出**：
- window.game 核心对象
- 主循环（requestAnimationFrame + deltaTime）
- 计时器系统
- 日志系统（addEventLog）
- UI 更新（updateUI）
- 键盘输入捕获（keys 对象）
- 状态机（playing/paused/win/lose）

**验证**：
- F12 → window.game 所有属性存在
- addEventLog('test') 可见日志追加
- 计时器可见倒计时
- 60 秒后自动进入 lose 状态

---

## 第 4 步：关卡配置 map.js

**输入**：第 3 步的 main.js
**输出**：
- 2 个关卡数据（levels 数组）
- window.game.map 对象
- draw() 方法（背景、障碍物、终点区）
- checkCollision(rect) 碰撞检测

**验证**：
- Canvas 可见障碍物和终点区
- checkCollision 返回正确结果

---

## 第 5 步：整合验证

**输入**：第 4 步的 map.js
**输出**：完整可运行的游戏框架

**验证**：
1. Live Server 打开 index.html
2. 界面完整：计时器 + 艾莉状态 + Canvas + 系统日志
3. window.game 完整可访问
4. 计时器倒计时正常工作
5. 超时后 UI 变为失败状态
6. 艾莉状态正确切换

## 注意事项

- 每完成一步，必须先验证再进入下一步
- 如某步验证失败，在本步内修复，不要带着问题进入下一步
- 所有修改后更新 devlog/YYYY-MM-DD.md
- 接口变更需同步更新 docs/technical-spec.md
