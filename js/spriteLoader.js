/* ============================================================
 * 精灵图片加载与帧动画系统 — 《永返》
 *
 * 每个角色 5 张独立 PNG，按状态切换显示。
 * 步行用 2 帧交替播放，向左走通过 Canvas 水平翻转实现。
 * 图片加载失败自动回退到几何方块绘制。
 *
 * 文件命名约定（放入 assets/sprites/）：
 *   {角色}-idle.png    站立
 *   {角色}-walk1.png   步行帧1
 *   {角色}-walk2.png   步行帧2
 *   {角色}-jump.png    跳跃
 *   {角色}-crouch.png  下蹲
 *
 * 【依赖】window.game.ctx
 * 【提供】window.game.sprites
 * ============================================================ */

window.game.sprites = {

  // ---- 图片存储 ----
  /** { player: { idle:Image, walk1:Image, walk2:Image, jump:Image, crouch:Image } } */
  player: null,
  /** AI 同理 */
  ai: null,

  /** 环境素材 { platform, wall, spikes, finishZone, button, bgLevel1, bgLevel2 } */
  env: null,

  /** 艾莉头像 */
  ally: null,

  /** 是否至少加载了一个角色的全部图片 */
  loaded: false,

  // ---- 动画计时 ----
  _walkTimer: 0,
  /** 步行帧切换间隔（毫秒） */
  walkFrameInterval: 150,
  /** 当前显示 walk1(true) 还是 walk2(false) */
  _showWalk1: true,

  /** 帧状态名列表 */
  _states: ['idle', 'walk1', 'walk2', 'jump', 'crouch'],

  // ============================================================
  // 加载
  // ============================================================

  /**
   * 加载单个角色的全部 5 张图片
   * @param {'player'|'ai'} role
   * @returns {Promise<void>}
   */
  async _loadRole(role) {
    const folder = 'assets/sprites';
    const prefix = role === 'player' ? 'player' : 'ai';
    const images = {};

    for (const state of this._states) {
      const src = `${folder}/${prefix}-${state}.png`;
      try {
        images[state] = await this._loadImage(src);
      } catch (e) {
        console.warn(`[精灵] ${role}/${state} 加载失败: ${src}`);
        images[state] = null;
      }
    }

    if (role === 'player') {
      this.player = images;
    } else {
      this.ai = images;
    }
  },

  /**
   * 加载单张图片（带缓存破坏参数，确保加载最新版本）
   * @param {string} src
   * @returns {Promise<Image>}
   */
  _loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load ${src}`));
      img.src = src + '?v=' + Date.now();
    });
  },

  /**
   * 加载全部角色图片。缺失文件不阻塞游戏。
   * @returns {Promise<void>}
   */
  async loadAll() {
    await Promise.all([
      this._loadRole('player').catch(() => {}),
      this._loadRole('ai').catch(() => {}),
      this._loadEnv().catch(() => {}),
      this._loadAlly().catch(() => {})
    ]);

    const playerOk = this.player && Object.values(this.player).some(Boolean);
    const aiOk = this.ai && Object.values(this.ai).some(Boolean);
    this.loaded = playerOk || aiOk;

    if (this.loaded) {
      window.game.addEventLog('[系统] 角色精灵素材加载完成');
    } else {
      window.game.addEventLog('[系统] 精灵素材未找到，使用几何占位绘制');
    }
  },

  /**
   * 加载环境素材图片（平台、墙壁、尖刺、终点、按钮、背景）。
   * 缺失文件不阻塞，回退几何绘制。
   */
  async _loadEnv() {
    const folder = 'assets/sprites';
    const files = {
      platform:   'platform-tile.png',
      wall:       'wall-tile.png',
      spikes:     'spikes-tile.png',
      finishZone: 'finish-zone.png',
      button:     'button-switch.png',
      bgLevel1:   'bg-level1.png',
      bgLevel2:   'bg-level2.png'
    };
    const env = {};
    for (const [key, filename] of Object.entries(files)) {
      const src = `${folder}/${filename}`;
      try {
        env[key] = await this._loadImage(src);
      } catch (e) {
        env[key] = null;
      }
    }
    this.env = env;
    const loadedCount = Object.values(env).filter(Boolean).length;
    if (loadedCount > 0) {
      window.game.addEventLog(`[系统] 环境素材加载完成 (${loadedCount}/${Object.keys(files).length})`);
    }
  },

  /**
   * 加载艾莉头像
   * 图片路径: assets/sprites/ally-avatar.png
   */
  async _loadAlly() {
    const folder = 'assets/sprites';
    const filename = 'ally-avatar.png';
    const src = `${folder}/${filename}`;
    try {
      this.ally = await this._loadImage(src);
      window.game.addEventLog('[系统] 艾莉头像加载完成');
      // 加载成功后立即设置到DOM
      this._applyAllyAvatar();
    } catch (e) {
      this.ally = null;
      console.warn(`[精灵] 艾莉头像加载失败: ${src}`);
    }
  },

  /**
   * 将艾莉头像设置到DOM元素
   */
  _applyAllyAvatar() {
    const avatarImg = document.getElementById('ally-avatar-img');
    if (avatarImg && this.ally) {
      // 使用图片自身的src（已经通过缓存破坏参数加载）
      avatarImg.src = this.ally.src;
      console.log('[精灵] 艾莉头像已设置');
    }
  },

  // ============================================================
  // 动画
  // ============================================================

  /**
   * 每帧更新步行帧切换计时
   * @param {number} dt - 秒
   */
  updateAnim(dt) {
    this._walkTimer += dt * 1000;
    if (this._walkTimer >= this.walkFrameInterval) {
      this._walkTimer -= this.walkFrameInterval;
      this._showWalk1 = !this._showWalk1;
    }
  },

  /**
   * 根据角色状态获取当前应显示的图片 key
   * @param {object} char - 角色对象（含 isGrounded/isCrouching/vx 等）
   * @returns {'idle'|'walk1'|'walk2'|'jump'|'crouch'}
   */
  _getStateKey(char) {
    if (char.isCrouching) return 'crouch';
    if (!char.isGrounded) return 'jump';

    // 地面：有水平速度 → 步行；静止 → 站立
    const speed = char.speed || 180;
    const threshold = speed * 0.03;
    if (Math.abs(char.vx || 0) < threshold) return 'idle';

    return this._showWalk1 ? 'walk1' : 'walk2';
  },

  // ============================================================
  // 绘制
  // ============================================================

  /**
   * 绘制角色精灵。图片缺失时回退几何绘制。
   * @param {CanvasRenderingContext2D} ctx
   * @param {'player'|'ai'} role
   * @param {object} char - 角色对象
   */
  drawCharacter(ctx, role, char) {
    const images = role === 'player' ? this.player : this.ai;
    const stateKey = this._getStateKey(char);
    const img = images && images[stateKey];

    // 回退
    if (!img) {
      char.drawGeometry(ctx);
      return;
    }

    // 绘制尺寸：站立/步行/跳跃 32×32，下蹲 32×24（视觉压低）
    const drawW = 32;
    const drawH = char.isCrouching ? 24 : 32;
    // 底部对齐碰撞箱底部，水平居中
    const drawX = char.x + char.w / 2 - drawW / 2;
    const drawY = char.y + char.h - drawH;

    ctx.save();

    // 悬空阴影
    if (!char.isGrounded) {
      const a = 0.15 + 0.05 * Math.sin(performance.now() * 0.01);
      ctx.fillStyle = role === 'player'
        ? `rgba(0, 255, 65, ${a})`
        : `rgba(255, 107, 53, ${a})`;
      ctx.beginPath();
      ctx.ellipse(char.x + char.w / 2, char.y + char.h + 4, char.w * 0.6, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 朝向翻转
    if (char._facingLeft) {
      ctx.translate(drawX + drawW, drawY);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, drawW, drawH);
    } else {
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    }

    ctx.restore();
  }
};
