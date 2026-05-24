/* ============================================================
 * 玩家（Player 1）模块 — 横版平台跳跃
 *
 * 支持左右移动（A/D）、跳跃（W）、蹲下（S）、重力。
 * 分轴检测固体碰撞（水平+垂直）、单向平台站立、致命障碍即死。
 *
 * 【依赖】window.game.keys（键盘输入）
 *         window.game.map（碰撞检测、出生点）
 *         window.game.GRAVITY（重力常量）
 *         window.game.JUMP_VELOCITY（跳跃初速度）
 *         window.game.respawnPlayer（死亡重生）
 * 【提供】window.game.player1
 * ============================================================ */

window.game.player1 = {
  x: 50, y: 500,
  w: 24, h: 32,
  normalHeight: 32,
  crouchHeight: 16,
  vx: 0, vy: 0,
  speed: 180,
  crouchSpeed: 90,
  color: '#00ff41',
  isGrounded: false,
  isCrouching: false,
  collisionCount: 0,
  deaths: 0,
  _wasJumpKeyDown: false,
  _prevBottom: 0,
  _facingLeft: false,

  /**
   * 每帧由 main.js 的 gameLoop 调用。
   * 处理输入、重力、水平/垂直移动与碰撞、致命检测。
   * @param {number} dt - 距上一帧的秒数
   */
  update(dt) {
    const map = window.game.map;
    if (!map) return;
    if (window.game.state !== 'playing') return;

    const keys = window.game.keys;
    const GRAVITY = window.game.GRAVITY || 800;
    const JUMP_VELOCITY = window.game.JUMP_VELOCITY || -380;

    // ---- 蹲下切换 ----
    if (keys['KeyS'] || keys['ArrowDown']) {
      if (!this.isCrouching) {
        this.isCrouching = true;
        this.h = this.crouchHeight;
        this.y += this.normalHeight - this.crouchHeight;
      }
    } else {
      if (this.isCrouching) {
        // 检测头顶是否有固体障碍阻挡站立
        const standY = this.y - (this.normalHeight - this.crouchHeight);
        const standRect = {
          x: this.x, y: standY,
          w: this.w, h: this.normalHeight
        };
        if (!map.checkSolidCollision(standRect)) {
          this.isCrouching = false;
          this.h = this.normalHeight;
          this.y = standY;
        }
      }
    }

    // ---- 水平移动 + 固体碰撞 ----
    const speed = this.isCrouching ? this.crouchSpeed : this.speed;
    let dx = 0;
    if (!this.isCrouching) {
      if (keys['KeyA'] || keys['ArrowLeft'])  dx = -1;
      if (keys['KeyD'] || keys['ArrowRight']) dx = 1;
    } else {
      if (keys['KeyA'] || keys['ArrowLeft'])  dx = -1;
      if (keys['KeyD'] || keys['ArrowRight']) dx = 1;
    }

    // 记录水平速度与朝向（供精灵动画读取）
    this.vx = dx * speed;
    if (dx < 0) this._facingLeft = true;
    if (dx > 0) this._facingLeft = false;

    if (dx !== 0) {
      const moveX = dx * speed * dt;
      let newX = this.x + moveX;
      newX = Math.max(0, Math.min(800 - this.w, newX));

      const hRect = { x: newX, y: this.y, w: this.w, h: this.h };
      if (!map.checkSolidCollision(hRect)) {
        this.x = newX;
      } else {
        // 找到碰撞的固体障碍，推到边缘
        for (const obs of map.solidObstacles) {
          if (
            newX < obs.x + obs.w && newX + this.w > obs.x &&
            this.y < obs.y + obs.h && this.y + this.h > obs.y
          ) {
            if (dx > 0) {
              this.x = obs.x - this.w;
            } else {
              this.x = obs.x + obs.w;
            }
            break;
          }
        }
        this.x = Math.max(0, Math.min(800 - this.w, this.x));
        this.collisionCount++;
      }
    }

    // ---- 重力 ----
    this.vy += GRAVITY * dt;

    // ---- 跳跃（边缘检测，防止按住连跳） ----
    const jumpKeyDown = keys['KeyW'] || keys['ArrowUp'] || keys['Space'];
    const jumpPressed = jumpKeyDown && !this._wasJumpKeyDown;
    this._wasJumpKeyDown = jumpKeyDown;

    if (jumpPressed && this.isGrounded && !this.isCrouching) {
      this.vy = JUMP_VELOCITY;
      this.isGrounded = false;
    }

    // ---- 垂直移动 + 碰撞 ----
    this._prevBottom = this.y + this.h;
    const newY = this.y + this.vy * dt;
    const maxY = 600 - this.h;
    const clampedY = Math.min(maxY, Math.max(-this.h, newY));
    const vRect = { x: this.x, y: clampedY, w: this.w, h: this.h };

    let verticalResolved = false;

    // 先检测固体碰撞（天花板/脚下固体）
    for (const obs of map.solidObstacles) {
      if (
        vRect.x < obs.x + obs.w && vRect.x + vRect.w > obs.x &&
        vRect.y < obs.y + obs.h && vRect.y + vRect.h > obs.y
      ) {
        if (this.vy < 0) {
          // 头顶撞到天花板 → 推到固体下方
          this.y = obs.y + obs.h;
          this.vy = 0;
        } else {
          // 落在固体顶部
          this.y = obs.y - this.h;
          this.vy = 0;
          this.isGrounded = true;
        }
        verticalResolved = true;
        break;
      }
    }

    if (!verticalResolved) {
      // 平台站立检测（单向平台，仅下落时）
      const pfResult = map.checkPlatformCollision(vRect, this._prevBottom, this.vy);
      if (pfResult.hit) {
        this.y = pfResult.platformTop;
        this.vy = 0;
        this.isGrounded = true;
      } else {
        this.y = clampedY;
        // 是否踩在 Canvas 底部
        if (clampedY >= maxY) {
          this.y = maxY;
          this.vy = 0;
          this.isGrounded = true;
        } else {
          this.isGrounded = false;
        }
      }
    }

    // ---- 致命障碍检测 ----
    if (map.checkDeadlyCollision({ x: this.x, y: this.y, w: this.w, h: this.h })) {
      this.die();
    }

    // ---- 子弹碰撞检测 ----
    if (typeof map.checkBulletCollision === 'function' &&
        map.checkBulletCollision({ x: this.x, y: this.y, w: this.w, h: this.h })) {
      this.die();
    }

    // ---- 掉落函数块碰撞检测 ----
    if (typeof map.checkFallingBlockCollision === 'function' &&
        map.checkFallingBlockCollision({ x: this.x, y: this.y, w: this.w, h: this.h })) {
      this.die();
    }

    // ---- 红线屏障 ----
    if (window.game.map && window.game.map.redLineActive) {
      const rly = window.game.map.redLineY || 240;
      if (this.y < rly) {
        this.y = rly;
        this.vy = 0;
      }
    }

    // ---- 掉出屏幕底部 ----
    if (this.y > 600) {
      this.die();
    }
  },

  /**
   * 死亡处理：记录死亡次数和碰撞计数，触发重生。
   */
  die() {
    this.deaths++;
    this.collisionCount++;
    window.game.addEventLog('[警告] 你触碰到了数据裂缝！正在重置位置...');
    if (typeof window.game.respawnPlayer === 'function') {
      window.game.respawnPlayer();
    }
  },

  /**
   * 绘制玩家角色。精灵表加载后使用精灵动画，否则回退几何绘制。
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    if (!ctx) return;
    const sprites = window.game.sprites;
    if (sprites && sprites.loaded) {
      sprites.drawCharacter(ctx, 'player', this);
      return;
    }
    this.drawGeometry(ctx);
  },

  /**
   * 几何回退绘制：荧光绿矩形 + 白色内边框 + 发光阴影 + "P1" 标识。
   * @param {CanvasRenderingContext2D} ctx
   */
  drawGeometry(ctx) {
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;

    if (!this.isGrounded) {
      ctx.save();
      const shadowAlpha = 0.15 + 0.05 * Math.sin(performance.now() * 0.01);
      ctx.fillStyle = `rgba(0, 255, 65, ${shadowAlpha})`;
      ctx.beginPath();
      ctx.ellipse(cx, this.y + this.h + 4, this.w * 0.6, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.shadowColor = 'rgba(0, 255, 65, 0.6)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(this.x + 1, this.y + 1, this.w - 2, this.h - 2);
    ctx.restore();

    ctx.fillStyle = '#0a0a0a';
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.isCrouching ? 'p1' : 'P1', cx, cy);
    ctx.textAlign = 'start';
  }
};
