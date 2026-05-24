/* ============================================================
 * 地图/关卡配置 — 《永返》横版平台跳跃
 *
 * 将关卡设计包装为"系统模块修复场景"。
 * 关卡为横版平台结构：地面 + 多层平台 + 物理障碍 + 致命障碍 + 终点。
 *
 * 【依赖】window.game.ctx（Canvas 绘图上下文）
 *         window.game.levels（关卡数组，由本文件填充）
 * 【提供】window.game.map —— 当前关卡数据、绘制方法、碰撞检测
 *         window.game.levels —— 所有关卡定义
 * ============================================================ */

// ============================================================
// 关卡数据定义
// ============================================================

/**
 * @typedef {Object} LevelData
 * @property {string} moduleName - 模块名称（剧情中的修复模块名）
 * @property {string} background - Canvas 背景色
 * @property {Array<{x:number, y:number, w:number, h:number}>} platforms - 可站立平台
 * @property {Array<{x:number, y:number, w:number, h:number}>} solidObstacles - 物理障碍
 * @property {Array<{x:number, y:number, w:number, h:number}>} deadlyObstacles - 致命障碍
 * @property {{x:number, y:number, w:number, h:number, label:string}} finishZone - 终点区
 * @property {{x:number, y:number}} playerSpawn - 玩家出生点
 * @property {{x:number, y:number}} aiSpawn - AI 出生点
 * @property {number} timeLimit - 限时（秒）
 */

window.game.levels = [
  // ==========================================
  // 关卡 1：模块-防火墙重启（复杂版）
  // 剧情：防火墙规则堆栈崩溃，需绕过五层规则封锁到达重启开关
  // 路径：地面→石墩→P1→P2（尖刺半覆）→空中石梁→P3→P4（回头）→P5→P6→终点
  // 共 6 个平台，S 形之字上升，考验双向跳跃与精准落点
  // ==========================================
  {
    moduleName: '模块：防火墙重启',
    background: '#0a0a1a',
    timeLimit: 55,
    playerSpawn: { x: 30, y: 500 },
    aiSpawn: { x: 720, y: 500 },
    platforms: [
      // 地面（中间断裂，需通过平台跨越）
      { x: 0,   y: 560, w: 230, h: 40 },   // 左地面
      { x: 450, y: 560, w: 350, h: 40 },   // 右地面

      // 6 层平台，S 形上升
      { x: 70,  y: 495, w: 80,  h: 14 },   // P1：起跳第一站（离左地面65px）
      { x: 470, y: 480, w: 80,  h: 14 },
      { x: 210, y: 435, w: 70,  h: 14 },   // P2：右侧覆致命尖刺，仅左40px安全，有长红消除的
      { x: 380, y: 395, w: 70,  h: 14 },   // P3：跨越断裂地面，左侧有尖刺，有短红消除的
      { x: 530, y: 340, w: 65,  h: 14 },   // P4：回头向左跳！窄台（仅65px宽）第三行石阶
      { x: 380, y: 285, w: 65,  h: 14 },   // P5：再向右跳，窄台精准落点
      { x: 560, y: 220, w: 70,  h: 14 },   // P6：终点前最后一跳
    ],
    solidObstacles: [
      { x: 340, y: 435, w: 35, h: 14 },    // P2→P3空中石梁：可选中间落点，降低跨断裂难度
    ],
    deadlyObstacles: [
      { x: 230, y: 550, w: 220, h: 10 },   // 地面断裂区：掉下即死，必须从平台跨越
      { x: 250, y: 421, w: 30,  h: 14 },   // P2 右半侧尖刺：只能踩平台左半边
      { x: 380, y: 381, w: 20,  h: 14 },   // P3 左侧尖刺：只能踩平台右半边
      { x: 600, y: 550, w: 100, h: 10 },   // 右地面末端尖刺：防直接跑向终点
    ],
    finishZone: {
      x: 580, y: 160, w: 50, h: 60,
      label: '重启开关'
    },
    bulletHeights: [532, 407, 312]
  },

  // ==========================================
  // 关卡 2：模块-内存碎片整理（左右对称版）
  // 剧情：系统内存严重碎片化，左右两侧镜像路径，双方需各自攀登后汇聚中央终点
  // 左路径：左地面→L1→L2（右半尖刺）→L3（回头）→L4→中央平台→终点
  // 右路径：右地面→R1→R2（左半尖刺）→R3（回头）→R4→中央平台→终点
  // 左右各 4 层平台，完全镜像对称，中央宽平台汇聚
  // ==========================================
  {
    moduleName: '模块：内存碎片整理',
    background: '#0f0a1a',
    timeLimit: 50,
    playerSpawn: { x: 30, y: 500 },
    aiSpawn: { x: 720, y: 500 },
    platforms: [
      // 地面（左右对称两段，中央断裂）
      { x: 0,   y: 560, w: 180, h: 40 },   // 左地面
      { x: 620, y: 560, w: 180, h: 40 },   // 右地面（镜像）

      // 左侧路径 4 层
      { x: 60,  y: 490, w: 70, h: 14 },   // L1：起跳第一站
      { x: 170, y: 420, w: 60, h: 14 },   // L2：右半尖刺，仅左 30px 安全
      { x: 90,  y: 350, w: 55, h: 14 },   // L3：回头向左，窄台 55px
      { x: 230, y: 290, w: 55, h: 14 },   // L4：向右上朝中央

      // 右侧路径 4 层（左侧镜像）
      { x: 670, y: 490, w: 70, h: 14 },   // R1：起跳第一站
      { x: 570, y: 420, w: 60, h: 14 },   // R2：左半尖刺，仅右 30px 安全
      { x: 655, y: 350, w: 55, h: 14 },   // R3：回头向右，窄台 55px
      { x: 515, y: 290, w: 55, h: 14 },   // R4：向左上朝中央

      // 中央汇聚平台
      { x: 340, y: 220, w: 120, h: 14 },  // C1：双方汇聚点，宽台
    ],
    deadlyObstacles: [
      // 中央地面裂缝（掉落即死）
      { x: 180, y: 550, w: 440, h: 10 },
      // 平台尖刺（镜像）
      { x: 200, y: 406, w: 30, h: 14 },   // L2 右半尖刺：仅左 30px 可踩
      { x: 570, y: 406, w: 30, h: 14 },   // R2 左半尖刺：仅右 30px 可踩
    ],
    finishZone: {
      x: 360, y: 170, w: 80, h: 50,
      label: '整理完成区'
    },
    bulletHeights: [532, 392, 192]
  }
];

// ============================================================
// 当前关卡地图对象（挂载到 window.game.map）
// ============================================================

window.game.map = {
  currentLevel: 0,
  moduleName: '',
  background: '#0a0a1a',
  platforms: [],
  solidObstacles: [],
  deadlyObstacles: [],
  finishZone: { x: 0, y: 0, w: 0, h: 0, label: '' },
  playerSpawn: { x: 50, y: 500 },
  aiSpawn: { x: 700, y: 500 },
  timeLimit: 60,

  // 致命障碍绘制闪烁计时器
  _deadlyFlashTimer: 0,

  // 子弹系统
  bullets: [],
  _bulletSpawnTimer: 0,
  _bulletInterval: 3,
  _bulletHeights: null,  // 手动指定子弹 Y 坐标数组，null 则自动计算

  // 顶部滴落函数块系统
  fallingBlocks: [],
  _fallingSpawnTimer: 0,
  _fallingInterval: 3,
  _fallingColors: ['#00ff41', '#ff6b35', '#00ccff', '#ff66aa', '#ffdd44'],
  _fallingTexts: ['fn', 'var', 'if', 'loop', 'bug', 'err', 'int', 'ref'],

  // ==========================================================
  // 从关卡数据加载到当前 map
  // ==========================================================

  /**
   * 将 LevelData 同步到当前 map 对象的属性。
   * @param {LevelData} data - 关卡数据
   */
  loadLevelData(data) {
    this.moduleName = data.moduleName;
    this.background = data.background;
    this.platforms = data.platforms;
    this.solidObstacles = data.solidObstacles || [];
    this.deadlyObstacles = data.deadlyObstacles || [];
    this.finishZone = data.finishZone;
    this.playerSpawn = data.playerSpawn || { x: 50, y: 500 };
    this.aiSpawn = data.aiSpawn || { x: 700, y: 500 };
    this.timeLimit = data.timeLimit || 60;
    this.bullets = [];
    this._bulletSpawnTimer = 1.5;
    this._bulletInterval = 3;
    this._bulletHeights = data.bulletHeights || null;
    this.fallingBlocks = [];
    this._fallingSpawnTimer = 1.5;
    this._fallingInterval = 3;
  },

  // ==========================================================
  // 绘制当前关卡（横版平台风格）
  // ==========================================================

  /**
   * 绘制关卡背景、平台、物理障碍、致命障碍、终点区。
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    if (!ctx) return;

    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // --- 背景 ---
    ctx.fillStyle = this.background;
    ctx.fillRect(0, 0, W, H);

    // --- 背景网格线 ---
    ctx.strokeStyle = 'rgba(0, 255, 65, 0.04)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < W; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // --- 背景装饰线（模拟数据流动感） ---
    ctx.strokeStyle = 'rgba(0, 255, 65, 0.03)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) {
      const lx = (performance.now() * 0.02 + i * 200) % 800;
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx - 100, H);
      ctx.stroke();
    }

    // --- 平台 ---
    this.platforms.forEach((p) => {
      // 平台主体
      ctx.fillStyle = '#2a2a3a';
      ctx.fillRect(p.x, p.y, p.w, p.h);

      // 顶部亮边（可站立的视觉提示）
      ctx.fillStyle = '#4a4a6a';
      ctx.fillRect(p.x, p.y, p.w, 3);

      // 边框
      ctx.strokeStyle = '#555577';
      ctx.lineWidth = 1;
      ctx.strokeRect(p.x, p.y, p.w, p.h);

      // 宽度超过 80 的平台显示标签
      if (p.w >= 80 && p.h >= 12) {
        ctx.fillStyle = '#666688';
        ctx.font = '8px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PLATFORM', p.x + p.w / 2, p.y + p.h / 2);
        ctx.textAlign = 'start';
      }
    });

    // --- 固体障碍（墙壁/石块） ---
    this.solidObstacles.forEach((obs) => {
      // 主体
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h);

      // 边框
      ctx.strokeStyle = '#666688';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);

      // 内部电路线
      ctx.strokeStyle = 'rgba(100, 100, 150, 0.3)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(obs.x + 3, obs.y + obs.h / 2);
      ctx.lineTo(obs.x + obs.w - 3, obs.y + obs.h / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(obs.x + obs.w / 2, obs.y + 3);
      ctx.lineTo(obs.x + obs.w / 2, obs.y + obs.h - 3);
      ctx.stroke();

      // 标签
      if (obs.w >= 30 && obs.h >= 18) {
        ctx.fillStyle = '#888888';
        ctx.font = '8px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('WALL', obs.x + obs.w / 2, obs.y + obs.h / 2);
        ctx.textAlign = 'start';
      }
    });

    // --- 致命障碍（尖刺/数据裂缝） ---
    this._deadlyFlashTimer += 0.016; // 约 60fps 增量
    const flashAlpha = 0.5 + 0.3 * Math.sin(this._deadlyFlashTimer * 6);

    this.deadlyObstacles.forEach((obs) => {
      // 红色警示主体
      ctx.fillStyle = `rgba(200, 30, 30, ${flashAlpha})`;
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h);

      // 红色边框
      ctx.strokeStyle = '#ff3333';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);

      // 内部锯齿线（模拟尖刺）
      ctx.strokeStyle = 'rgba(255, 80, 80, 0.7)';
      ctx.lineWidth = 1;
      const spikeCount = Math.floor(obs.w / 8);
      for (let i = 0; i < spikeCount; i++) {
        const sx = obs.x + i * 8 + 4;
        ctx.beginPath();
        ctx.moveTo(sx, obs.y);
        ctx.lineTo(sx, obs.y + obs.h);
        ctx.stroke();
      }

      // "危险"标签
      if (obs.w >= 30) {
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 8px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('DANGER', obs.x + obs.w / 2, obs.y + obs.h / 2);
        ctx.textAlign = 'start';
      }
    });

    // --- 终点区 ---
    const fz = this.finishZone;
    // 半透明绿色底
    ctx.fillStyle = 'rgba(0, 255, 65, 0.12)';
    ctx.fillRect(fz.x, fz.y, fz.w, fz.h);

    // 虚线边框（流动感）
    ctx.strokeStyle = 'rgba(0, 255, 65, 0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(fz.x, fz.y, fz.w, fz.h);
    ctx.setLineDash([]);

    // 终点标签
    ctx.fillStyle = '#00ff41';
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fz.label || '终点', fz.x + fz.w / 2, fz.y + fz.h / 2);
    ctx.textAlign = 'start';

    // --- 底部模块名称 ---
    const moduleY = H - 16;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, moduleY - 8, W, 28);

    ctx.fillStyle = '#00ff41';
    ctx.font = '12px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`● 当前修复任务：${this.moduleName} ●`, W / 2, moduleY + 5);
    ctx.textAlign = 'start';
  },

  // ==========================================================
  // 碰撞检测：平台站立（单向平台）
  // ==========================================================

  /**
   * 检测角色是否应该站在某个平台上。
   * 单向平台逻辑：仅当角色下落（vy >= 0）且前一帧底部在平台上方时才碰撞。
   *
   * @param {{x:number, y:number, w:number, h:number}} rect - 角色当前矩形
   * @param {number} prevBottom - 角色移动前的底部 Y 坐标
   * @param {number} vy - 角色当前垂直速度
   * @returns {{ hit: boolean, platformTop: number }}
   *   hit 为 true 时 platformTop 是应该站立的 Y 坐标（平台顶部 - 角色高度）
   */
  checkPlatformCollision(rect, prevBottom, vy) {
    if (vy < 0) return { hit: false, platformTop: 0 }; // 上升中不站平台

    const rectBottom = rect.y + rect.h;

    for (const p of this.platforms) {
      // 水平重叠检测
      if (
        rect.x < p.x + p.w &&
        rect.x + rect.w > p.x &&
        // 前一帧在平台上方或与平台顶部齐平
        prevBottom <= p.y + 2 &&
        // 当前帧底部到达或超过平台顶部
        rectBottom >= p.y
      ) {
        return { hit: true, platformTop: p.y - rect.h };
      }
    }

    return { hit: false, platformTop: 0 };
  },

  // ==========================================================
  // 碰撞检测：固体障碍（物理阻挡，水平+垂直）
  // ==========================================================

  /**
   * AABB 碰撞检测 —— 检测角色矩形是否与任意固体障碍重叠。
   * 用于水平移动阻挡、天花板碰撞、地面固体站立。
   *
   * @param {{x:number, y:number, w:number, h:number}} rect - 待检测矩形
   * @returns {boolean} true = 碰撞，false = 无碰撞
   */
  checkSolidCollision(rect) {
    for (const obs of this.solidObstacles) {
      if (
        rect.x < obs.x + obs.w &&
        rect.x + rect.w > obs.x &&
        rect.y < obs.y + obs.h &&
        rect.y + rect.h > obs.y
      ) {
        return true;
      }
    }
    return false;
  },

  // ==========================================================
  // 碰撞检测：致命障碍（即死）
  // ==========================================================

  /**
   * AABB 碰撞检测 —— 检测角色是否碰到致命障碍。
   *
   * @param {{x:number, y:number, w:number, h:number}} rect - 待检测矩形
   * @returns {boolean} true = 碰到致命障碍，触发死亡
   */
  checkDeadlyCollision(rect) {
    for (const obs of this.deadlyObstacles) {
      if (
        rect.x < obs.x + obs.w &&
        rect.x + rect.w > obs.x &&
        rect.y < obs.y + obs.h &&
        rect.y + rect.h > obs.y
      ) {
        return true;
      }
    }
    return false;
  },

  // ==========================================================
  // 碰撞检测：合并（保留兼容旧接口）
  // ==========================================================

  /**
   * 合并检测 —— 固体障碍 + 致命障碍。
   * 保留旧接口，供可能的外部调用。
   *
   * @param {{x:number, y:number, w:number, h:number}} rect
   * @returns {boolean}
   */
  checkCollision(rect) {
    return this.checkSolidCollision(rect) || this.checkDeadlyCollision(rect);
  },

  // ==========================================================
  // 子弹系统：从右向左飞行，命中站立角色即死，蹲下可躲避
  // ==========================================================

  /**
   * 在多个高度同时发射函数块弹幕，每行 4 个。
   * 各行之间至少间隔 60px 垂直距离。
   */
  _spawnBulletBurst() {
    // 手动指定了子弹高度 → 直接使用
    if (this._bulletHeights && this._bulletHeights.length > 0) {
      const count = 4;
      const spacing = 50;
      for (const by of this._bulletHeights) {
        for (let i = 0; i < count; i++) {
          this.bullets.push({
            x: 800 + i * spacing,
            y: by,
            w: 36,
            h: 14,
            vx: -300,
            text: this._fallingTexts[Math.floor(Math.random() * this._fallingTexts.length)]
          });
        }
      }
      window.game.addEventLog(`[警告] 函数碎片从右侧袭来！${this._bulletHeights.length} 行弹幕，蹲下回避。`);
      return;
    }

    // 自动计算：选取垂直间距 ≥ 60px 的平台，子弹在站立角色上身高度
    if (this.platforms.length === 0) return;
    const rowCount = Math.min(2 + Math.floor(Math.random() * 2), this.platforms.length);
    const sorted = [...this.platforms].sort((a, b) => a.y - b.y);
    const picked = [];
    for (const p of sorted) {
      if (picked.length === 0) {
        picked.push(p);
      } else if (Math.abs(p.y - picked[picked.length - 1].y) >= 60) {
        picked.push(p);
      }
      if (picked.length >= rowCount) break;
    }
    if (picked.length < rowCount) {
      const remaining = sorted.filter(p => !picked.includes(p));
      const shuffled = remaining.sort(() => Math.random() - 0.5);
      for (const p of shuffled) {
        if (picked.every(existing => Math.abs(p.y - existing.y) >= 60)) {
          picked.push(p);
        }
        if (picked.length >= rowCount) break;
      }
    }

    const count = 4;
    const spacing = 50;
    for (const p of picked) {
      // bulletY = p.y - 28: 子弹覆盖 [p.y-28, p.y-14]
      //   站立角色 [p.y-24, p.y] → 重叠 [p.y-24, p.y-14] ✓ 击中
      //   蹲下角色 [p.y-12, p.y] → p.y-14 < p.y-12 无重叠 ✓ 躲过
      const bulletY = p.y - 28;
      for (let i = 0; i < count; i++) {
        this.bullets.push({
          x: 800 + i * spacing,
          y: bulletY,
          w: 36,
          h: 14,
          vx: -300,
          text: this._fallingTexts[Math.floor(Math.random() * this._fallingTexts.length)]
        });
      }
    }
    window.game.addEventLog(`[警告] 函数碎片从右侧袭来！${picked.length} 行弹幕，蹲下回避。`);
  },

  /**
   * 每帧更新子弹位置，移除飞出屏幕的子弹，按间隔生成新子弹。
   * @param {number} dt
   */
  updateBullets(dt) {
    for (const b of this.bullets) {
      b.x += b.vx * dt;
    }
    this.bullets = this.bullets.filter(b => b.x + b.w > 0);

    this._bulletSpawnTimer += dt;
    if (this._bulletSpawnTimer >= this._bulletInterval) {
      this._bulletSpawnTimer = 0;
      this._bulletInterval = 3;
      this._spawnBulletBurst();
    }
  },

  /**
   * 绘制所有子弹：函数块外观 —— 带语法高亮色的小代码块。
   * @param {CanvasRenderingContext2D} ctx
   */
  drawBullets(ctx) {
    for (const b of this.bullets) {
      ctx.save();
      ctx.shadowColor = 'rgba(255, 107, 53, 0.7)';
      ctx.shadowBlur = 8;

      // 主体
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(b.x, b.y, b.w, b.h);

      // 左边色条
      ctx.fillStyle = '#ff6b35';
      ctx.fillRect(b.x, b.y, 3, b.h);

      // 边框
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ff6b35';
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x, b.y, b.w, b.h);

      // 函数名文本
      ctx.fillStyle = '#ff6b35';
      ctx.font = 'bold 9px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.text + '()', b.x + b.w / 2 + 2, b.y + b.h / 2);
      ctx.textAlign = 'start';

      ctx.restore();

      // 拖尾粒子
      ctx.fillStyle = 'rgba(255, 107, 53, 0.3)';
      ctx.beginPath();
      ctx.arc(b.x + b.w + 5, b.y + b.h / 2, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(b.x + b.w + 14, b.y + b.h / 2, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  /**
   * AABB 碰撞检测 —— 检测角色矩形是否与任意子弹重叠。
   * @param {{x:number, y:number, w:number, h:number}} rect
   * @returns {boolean}
   */
  checkBulletCollision(rect) {
    for (const b of this.bullets) {
      if (
        rect.x < b.x + b.w &&
        rect.x + rect.w > b.x &&
        rect.y < b.y + b.h &&
        rect.y + rect.h > b.y
      ) {
        return true;
      }
    }
    return false;
  },

  // ==========================================================
  // 顶部滴落函数块：从顶部掉落彩色代码块，碰到台阶即消除
  // ==========================================================

  /**
   * 在随机平台上方生成滴落函数块。
   */
  _spawnFallingBlock() {
    if (this.platforms.length === 0) return;
    const count = 2 + Math.floor(Math.random() * 2); // 2~3 个同时滴落
    for (let i = 0; i < count; i++) {
      const p = this.platforms[Math.floor(Math.random() * this.platforms.length)];
      const spawnX = p.x + Math.random() * (p.w - 20);
      const color = this._fallingColors[Math.floor(Math.random() * this._fallingColors.length)];
      const text = this._fallingTexts[Math.floor(Math.random() * this._fallingTexts.length)];
      this.fallingBlocks.push({
        x: spawnX,
        y: -20 - i * 40,
        w: 20,
        h: 14,
        vy: 180,
        color: color,
        text: text
      });
    }
  },

  /**
   * 每帧更新滴落块：下落，碰到平台或掉出屏幕即消除。
   * @param {number} dt
   */
  updateFallingBlocks(dt) {
    const toRemove = [];
    for (let i = 0; i < this.fallingBlocks.length; i++) {
      const fb = this.fallingBlocks[i];
      fb.y += fb.vy * dt;
      // 碰到平台即消除
      let hitPlatform = false;
      for (const p of this.platforms) {
        if (
          fb.x < p.x + p.w &&
          fb.x + fb.w > p.x &&
          fb.y + fb.h >= p.y &&
          fb.y + fb.h - fb.vy * dt <= p.y + 2
        ) {
          hitPlatform = true;
          break;
        }
      }
      if (hitPlatform || fb.y > 620) {
        toRemove.push(i);
      }
    }
    // 倒序移除
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.fallingBlocks.splice(toRemove[i], 1);
    }

    this._fallingSpawnTimer += dt;
    if (this._fallingSpawnTimer >= this._fallingInterval) {
      this._fallingSpawnTimer = 0;
      this._fallingInterval = 3;
      this._spawnFallingBlock();
    }
  },

  /**
   * 绘制所有滴落函数块：彩色代码块 + 下落拖尾。
   * @param {CanvasRenderingContext2D} ctx
   */
  drawFallingBlocks(ctx) {
    for (const fb of this.fallingBlocks) {
      ctx.save();
      ctx.shadowColor = fb.color;
      ctx.shadowBlur = 6;

      // 主体
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(fb.x, fb.y, fb.w, fb.h);

      // 顶部色条
      ctx.fillStyle = fb.color;
      ctx.fillRect(fb.x, fb.y, fb.w, 3);

      // 边框
      ctx.shadowBlur = 0;
      ctx.strokeStyle = fb.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(fb.x, fb.y, fb.w, fb.h);

      // 文本
      ctx.fillStyle = fb.color;
      ctx.font = 'bold 7px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fb.text, fb.x + fb.w / 2, fb.y + fb.h / 2 + 1);
      ctx.textAlign = 'start';

      ctx.restore();

      // 拖尾粒子
      ctx.fillStyle = 'rgba(255, 107, 53, 0.25)';
      ctx.beginPath();
      ctx.arc(fb.x + fb.w / 2, fb.y - 4, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(fb.x + fb.w / 2, fb.y - 10, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  /**
   * AABB 碰撞检测 —— 检测角色是否碰到滴落函数块。
   * @param {{x:number, y:number, w:number, h:number}} rect
   * @returns {boolean}
   */
  checkFallingBlockCollision(rect) {
    for (const fb of this.fallingBlocks) {
      if (
        rect.x < fb.x + fb.w &&
        rect.x + rect.w > fb.x &&
        rect.y < fb.y + fb.h &&
        rect.y + rect.h > fb.y
      ) {
        return true;
      }
    }
    return false;
  }
};
