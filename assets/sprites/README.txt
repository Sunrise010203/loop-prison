将 AI 生成的 PNG 图片放入此目录。

命名规则：{角色}-{状态}.png

玩家角色（黑客，荧光绿主题）：
  player-idle.png      站立待机
  player-walk1.png     步行帧1（左腿前迈）
  player-walk2.png     步行帧2（右腿前迈）
  player-jump.png      跳跃
  player-crouch.png    下蹲

AI 队友（机器人，橙色主题）：
  ai-idle.png          站立待机
  ai-walk1.png         步行帧1
  ai-walk2.png         步行帧2
  ai-jump.png          跳跃
  ai-crouch.png        下蹲

全部为 48×48 像素 PNG，纯黑背景。
向左走由代码层 Canvas 水平翻转实现，无需单独的向左素材。
