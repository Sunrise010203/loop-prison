/* ============================================================
 * AI 队友模块 - 横版平台跳跃 + 语音/LLM 外部指令支持
 *
 * 支持两种模式：
 *   1. 外部指令模式（语音 → LLM）：通过 setExternalCommand() 接收动作指令
 *   2. 等待模式（默认）：无指令时原地静止，不会自主寻路
 *
 * 依赖：window.game.map, window.game.GRAVITY / JUMP_VELOCITY
 *        window.game.respawnAI, window.game.state
 * 提供：window.game.aiPlayer
 * ============================================================ */

window.game.aiPlayer = {
  x: 700, y: 500,
  w: 24, h: 32,
  normalHeight: 32,
  crouchHeight: 16,
  vx: 0, vy: 0,
  speed: 120,
  color: '#ff6b35',
  isGrounded: false,
  isCrouching: false,
  collisionCount: 0,
  deaths: 0,
  _prevBottom: 0,
  _stuckTimer: 0,
  _jumpCooldown: 0,
  _prevX: 0,
  _prevY: 0,
  _facingLeft: false,

  // === 外部指令系统（语音 → LLM）===
  /** 当前外部指令：{ action: string, timestamp: number } */
  externalCommand: null,
  /** 外部指令有效时长（毫秒） */
  externalCommandTimeout: 8000,
  /** 上次执行外部指令的时间戳 */
  _lastExternalCommandTime: 0,

  /** 当前移动指令剩余距离（像素），每帧递减，归零后停止 */
  _moveDistanceRemaining: 0,

  /** 每次指令移动的固定距离（像素） */
  moveStepDistance: 200,

  // === 运动参数（可在控制台实时调整） ===
  /** 移动速度（像素/秒） */
  moveSpeed: 140,
  /** 蹲下移动速度（像素/秒） */
  crouchMoveSpeed: 80,
  /** 跳跃初速度（负值=向上），设为 null 则使用全局 JUMP_VELOCITY */
  jumpVelocity: -300,
  /** 空中水平控制系数（0=空中不能转向，1=空中和地面一样灵活） */
  airControl: 0.8,
  /** 碰撞到墙后是否自动清除移动指令 */
  clearOnWallHit: true,

  /** 当前指令是否已设置过移动距离（防止每帧重置） */
  _distanceSetForCommand: false,
  /** 当前指令是否已执行过跳跃（防连跳） */
  _hasJumpedForCommand: false,

  // === 自适应跳跃参数 ===
  /** 临时跳跃速度覆盖（自适应跳跃时使用） */
  _tempJumpVelocity: null,
  /** 临时移动距离覆盖 */
  _tempStepDistance: null,
  /** 临时移动速度覆盖 */
  _tempMoveSpeed: null,
  /** 自适应跳跃状态：'idle' | 'scanning' | 'jumping' */
  _adaptiveState: 'idle',
  /** 自适应跳跃检测距离（像素） */
  adaptiveScanRange: 400,

  /**
   * 接收 LLM 解析后的外部动作指令
   */
  setExternalCommand(action) {
    console.log('[AI] setExternalCommand:', action);
    this.externalCommand = {
      action: action,
      timestamp: performance.now()
    };
    this._lastExternalCommandTime = performance.now();
    // 重置所有状态，确保新指令从干净状态开始
    this._moveDistanceRemaining = 0;
    this._distanceSetForCommand = false;
    this._tempJumpVelocity = null;
    this._hasJumpedForCommand = false;
  },

  /**
   * 清除外部指令
   */
  clearExternalCommand() {
    this.externalCommand = null;
    this._distanceSetForCommand = false;
  },

  /**
   * 判断是否处于外部指令有效期内
   */
  _hasValidExternalCommand() {
    if (!this.externalCommand) return false;
    const elapsed = performance.now() - this.externalCommand.timestamp;
    return elapsed < this.externalCommandTimeout;
  },

  /**
   * 每帧由 main.js 的 gameLoop 调用
   */

  // ==========================================================
  // 自适应跳跃系统（双向扫描 + 方向感知）
  // ==========================================================

  /**
   * 扫描指定方向上的障碍物
   * @param {number} dir - 扫描方向：1=向右，-1=向左
   * @returns {{type: string, x: number, y: number, w: number, h: number, requiredHeight: number, requiredDistance: number, direction: number}|null}
   */
  /**
   * 根据语音峰值音量缩放移动距离
   */
  _setVolumeScaledDistance() {
    // 每个指令只设置一次距离
    if (this._distanceSetForCommand) return;
    this._distanceSetForCommand = true;
    this._hasJumpedForCommand = false;

    var vol = 0.6;
    if (window.game.voiceControl) {
      if (typeof window.game.voiceControl.getPeakVolume === "function") {
        vol = Math.max(0.15, Math.min(1, window.game.voiceControl.getPeakVolume()));
      } else if (typeof window.game.voiceControl.getVolume === "function") {
        vol = Math.max(0.15, Math.min(1, window.game.voiceControl.getVolume()));
      }
    }
    // 线性连续映射：factor = 0.3 + vol * 1.7（vol∈[0.15,1] → factor∈[0.555,2.0]）
    var factor = 0.3 + vol * 1.7;
    var baseSpeed = 140;
    var baseJumpVel = this.jumpVelocity !== null ? this.jumpVelocity : (window.game.JUMP_VELOCITY || -380);
    // 音量线性缩放：距离、速度、跳跃初速度，无钳制保证纯线性
    this._moveDistanceRemaining = Math.round(this.moveStepDistance * factor);
    this.moveSpeed = Math.round(baseSpeed * factor);
    this._tempJumpVelocity = Math.round(baseJumpVel * factor);
    console.log("[AI] 音量全参: peakVol=" + vol.toFixed(2) + " factor=" + factor.toFixed(2)
      + " dist=" + this._moveDistanceRemaining + " spd=" + this.moveSpeed + " jv=" + this._tempJumpVelocity);
  },

  _scanDirection(dir) {
    const map = window.game.map;
    if (!map) return null;

    const scanStart = dir > 0 ? this.x + this.w : this.x - this.adaptiveScanRange;
    const scanEnd = dir > 0 ? this.x + this.w + this.adaptiveScanRange : this.x;
    const aiBottom = this.y + this.h;

    let nearest = null;
    let nearestDist = Infinity;

    // 封装检测函数
    function checkInRange(x) {
      return dir > 0 ? (x > scanStart && x < scanEnd) : (x < scanStart && x > scanEnd);
    }

    // 1. 扫描致命障碍
    for (const obs of map.deadlyObstacles) {
      const obsX = dir > 0 ? obs.x : obs.x + obs.w;
      if (checkInRange(obsX)) {
        const dist = Math.abs(obsX - (dir > 0 ? this.x + this.w : this.x));
        if (dist < nearestDist) {
          nearestDist = dist;
          const requiredDist = Math.abs((obs.x + obs.w) - this.x) + 30;
          const requiredHeight = Math.max((obs.y - aiBottom) + 35, 60);
          nearest = { type: 'deadly', x: obs.x, y: obs.y, w: obs.w, h: obs.h, requiredHeight: requiredHeight, requiredDistance: Math.max(requiredDist, 100), direction: dir };
        }
      }
    }

    // 2. 扫描固体障碍
    if (!nearest) {
      for (const obs of map.solidObstacles) {
        const obsX = dir > 0 ? obs.x : obs.x + obs.w;
        if (checkInRange(obsX)) {
          const dist = Math.abs(obsX - (dir > 0 ? this.x + this.w : this.x));
          if (dist < nearestDist) {
            nearestDist = dist;
            const requiredDist = Math.abs((obs.x + obs.w) - this.x) + 20;
            const requiredHeight = Math.max((obs.y - aiBottom) + 20, 50);
            nearest = { type: 'solid', x: obs.x, y: obs.y, w: obs.w, h: obs.h, requiredHeight: requiredHeight, requiredDistance: Math.max(requiredDist, 80), direction: dir };
          }
        }
      }
    }

    // 3. 扫描前方平台（需要跳上去的）
    if (!nearest) {
      for (const pf of map.platforms) {
        const pX = dir > 0 ? pf.x : pf.x + pf.w;
        if (checkInRange(pX) && pf.y < aiBottom) {
          const dist = Math.abs(pX - (dir > 0 ? this.x + this.w : this.x));
          if (dist < nearestDist) {
            nearestDist = dist;
            const requiredHeight = (aiBottom - pf.y) + 20;
            const requiredDist = Math.abs((pf.x + pf.w) - this.x) + 10;
            nearest = { type: 'platform', x: pf.x, y: pf.y, w: pf.w, h: pf.h, requiredHeight: Math.max(requiredHeight, 50), requiredDistance: Math.max(requiredDist, 60), direction: dir };
          }
        }
      }
    }

    return nearest;
  },

  /**
   * 扫描所有方向，返回最近的障碍物
   */
  _scanObstacles() {
    // 扫描左右两个方向，取最近的障碍
    const right = this._scanDirection(1);
    const left = this._scanDirection(-1);

    if (!right && !left) return null;
    if (!right) return left;
    if (!left) return right;

    // 取更近的那个
    const distR = Math.abs((right.x + right.w/2) - (this.x + this.w/2));
    const distL = Math.abs((left.x + left.w/2) - (this.x + this.w/2));
    return distR <= distL ? right : left;
  },

  /**
   * 根据障碍信息计算最优跳跃参数
   */
    _calcAdaptiveParams(obstacle) {
    if (!obstacle) return { jumpVel: -500, stepDist: 400, direction: 1, speed: 160 };

    // 读取语音峰值音量（LLM 响应时用户已说完，用峰值而不是当前值）
    var vol = 0.6;
    if (window.game.voiceControl) {
      if (typeof window.game.voiceControl.getPeakVolume === "function") {
        vol = Math.max(0.15, Math.min(1, window.game.voiceControl.getPeakVolume()));
      } else if (typeof window.game.voiceControl.getVolume === "function") {
        vol = Math.max(0.15, Math.min(1, window.game.voiceControl.getVolume()));
      }
    }
    // 音量映射：0.15(耳语)=>0.5  0.5(正常)=>1.0  1.0(大喊)=>2.0
    var volFactor = 0.3 + vol * 1.7;

    const G = window.game.GRAVITY || 800;
    const h = Math.max(obstacle.requiredHeight, 80);
    const d = Math.max(obstacle.requiredDistance, 200);

    // 跳跃速度 = 基础值 * 音量倍率
    const requiredVel = -Math.sqrt(2 * G * h) * 1.3 * volFactor;
    const jumpVel = Math.max(-1400, Math.min(-350, Math.round(requiredVel)));

    // 步进距离 = 障碍宽度 * 1.5 * 音量倍率
    const stepDist = Math.min(700, Math.max(d * 1.5 * volFactor, 200));

    // 水平速度
    const speed = Math.min(400, Math.max(140, Math.round(d * 0.8 * volFactor)));

    console.log("[AI] 自适应: peakVol=" + vol.toFixed(2) + "x" + volFactor.toFixed(2) + " 初速=" + jumpVel + " 步进=" + stepDist + " 速度=" + speed);
    return { jumpVel: jumpVel, stepDist: stepDist, direction: obstacle.direction, speed: speed };
  },

  /**
   * 执行自适应跳跃
   */
  _doAdaptiveJump() {
    const obs = this._scanObstacles();
    if (obs) {
      const params = this._calcAdaptiveParams(obs);
      this._tempJumpVelocity = params.jumpVel;
      this._tempStepDistance = params.stepDist;
      this._moveDistanceRemaining = params.stepDist;
      // 自适应跳跃已设置距离，标记防止被 _setVolumeScaledDistance 覆盖
      this._distanceSetForCommand = true;
      this._tempMoveSpeed = params.speed || 140;
      // 临时覆盖移动速度
      this.moveSpeed = this._tempMoveSpeed;
      this._adaptiveState = 'jumping';

      // 根据障碍方向选择跳跃方向
      const jumpAction = params.direction > 0 ? 'move_right_jump' : 'move_left_jump';
      this.externalCommand = {
        action: jumpAction,
        timestamp: performance.now()
      };

      window.game.addEventLog('[AI] 自适应跳跃：' + (params.direction > 0 ? '右' : '左') + ' 初速=' + params.jumpVel + ' 距离=' + params.stepDist + 'px');
    } else {
      this.externalCommand = {
        action: 'jump',
        timestamp: performance.now()
      };
      window.game.addEventLog('[AI] 无障碍，普通跳跃');
    }
  },

  update(dt) {
    const map = window.game.map;
    if (!map || !map.finishZone) return;
    if (window.game.state !== 'playing') return;

    const GRAVITY = window.game.GRAVITY || 800;
    const JUMP_VELOCITY = window.game.JUMP_VELOCITY || -380;

    const useExternal = this._hasValidExternalCommand();

    let dx = 0;
    let shouldJump = false;
    let shouldCrouch = false;

    // ======== 指令处理 ========
    if (useExternal && this.externalCommand) {
      // ---- 外部指令模式（语音 → LLM） ----
      const action = this.externalCommand.action;
      console.log('[AI] 执行外部指令:', action);
      switch (action) {
        case 'move_left':
          dx = -1;
          this._setVolumeScaledDistance();
          break;
        case 'move_right':
          dx = 1;
          this._setVolumeScaledDistance();
          break;
        case 'jump':
          shouldJump = true;
          this.clearExternalCommand();
          break;
        case 'crouch':
          shouldCrouch = true;
          this.clearExternalCommand();
          break;
        case 'stop':
          dx = 0;
          break;
        case 'move_left_jump':
          dx = -1;
          shouldJump = true;
          this._setVolumeScaledDistance();
          break;
        case 'move_right_jump':
          dx = 1;
          shouldJump = true;
          this._setVolumeScaledDistance();
          break;
        case 'jump_over':
          // 自适应跳跃：扫描障碍→计算参数→执行
          this._doAdaptiveJump();
          // 让当前帧处理跳转动作
          if (this.externalCommand) {
            const cmdAction = this.externalCommand.action;
            if (cmdAction === 'move_right_jump') { dx = 1; shouldJump = true; }
            else if (cmdAction === 'jump') { shouldJump = true; }
            else { dx = 0; }
          }
          break;
        case 'wait':
        default:
          dx = 0;
          break;
      }
    } else {
      // ---- 等待模式（无指令时静止不动，等待语音唤醒） ----
      if (this.externalCommand) {
        this.clearExternalCommand();
      }
      dx = 0;
      shouldJump = false;
      shouldCrouch = false;
    }

    // ---- 蹲下处理 ----
    if (shouldCrouch && !this.isCrouching && this.isGrounded) {
      this.isCrouching = true;
      this.h = this.crouchHeight;
      this.y += this.normalHeight - this.crouchHeight;
      // 蹲下时降低移动速度
      this.moveSpeed = this.crouchMoveSpeed;
      console.log('[AI] 蹲下，速度降至:', this.crouchMoveSpeed);
    } else if (!shouldCrouch && this.isCrouching) {
      const standY = this.y - (this.normalHeight - this.crouchHeight);
      const standRect = { x: this.x, y: standY, w: this.w, h: this.normalHeight };
      if (!map.checkSolidCollision(standRect)) {
        this.isCrouching = false;
        this.h = this.normalHeight;
        this.y = standY;
        // 恢复移动速度
        this.moveSpeed = 120;
        console.log('[AI] 站起，速度恢复至: 120');
      }
    }

    // 记录水平速度与朝向（供精灵动画读取）
    this.vx = dx * (this.isGrounded ? this.moveSpeed : this.moveSpeed * this.airControl);
    if (dx < 0) this._facingLeft = true;
    if (dx > 0) this._facingLeft = false;

    // ---- 水平移动 + 固体碰撞（距离制） ----
    if (dx !== 0) {
      // 如果还有剩余移动距离
      if (this._moveDistanceRemaining > 0) {
        // 空中控制系数：空中只能发挥 airControl 比例的速度
        const effectiveSpeed = this.isGrounded ? this.moveSpeed : (this.moveSpeed * this.airControl);
        const moveX = dx * effectiveSpeed * dt;
        const actualMove = Math.min(Math.abs(moveX), this._moveDistanceRemaining) * Math.sign(moveX);
        this._moveDistanceRemaining -= Math.abs(actualMove);
        let newX = this.x + actualMove;
        newX = Math.max(0, Math.min(800 - this.w, newX));
        const hRect = { x: newX, y: this.y, w: this.w, h: this.h };
        if (!map.checkSolidCollision(hRect)) {
          if (map.checkDeadlyCollision(hRect)) {
            this._moveDistanceRemaining = 0;
            this.clearExternalCommand();
            window.game.addEventLog('[AI] 前方危险，停止移动');
          } else {
            this.x = newX;
          }
        } else {
          for (const obs of map.solidObstacles) {
            if (newX < obs.x + obs.w && newX + this.w > obs.x && this.y < obs.y + obs.h && this.y + this.h > obs.y) {
              this.x = dx > 0 ? obs.x - this.w : obs.x + obs.w;
              break;
            }
          }
          this.x = Math.max(0, Math.min(800 - this.w, this.x));
          this.collisionCount++;
          // 撞墙后清除移动距离，AI 停下
          if (this.clearOnWallHit) {
            this._moveDistanceRemaining = 0;
            if (this.externalCommand && 
                (this.externalCommand.action === 'move_left' || this.externalCommand.action === 'move_right')) {
              this.clearExternalCommand();
              window.game.addEventLog('[AI] 撞墙停下');
            }
          }
        }
      }
      // 距离用完后清除外部指令
      if (this._moveDistanceRemaining <= 0 && this.externalCommand && 
          (this.externalCommand.action === 'move_left' || this.externalCommand.action === 'move_right' ||
           this.externalCommand.action === 'move_left_jump' || this.externalCommand.action === 'move_right_jump')) {
        this.clearExternalCommand();
        if (this._adaptiveState === 'jumping') {
          this._tempJumpVelocity = null;
          this._tempStepDistance = null;
          this._tempMoveSpeed = null;
          this.moveSpeed = 140;
          this._adaptiveState = 'idle';
        }
      }
    }

    // ---- 重力 ----
    this.vy += GRAVITY * dt;

    // ---- 跳跃 ----
    if (this._jumpCooldown > 0) {
      this._jumpCooldown = Math.max(0, this._jumpCooldown - dt);
    }
    if (shouldJump && this.isGrounded && this._jumpCooldown <= 0 && !this._hasJumpedForCommand) {
      // 优先使用自适应跳跃的临时速度
      const actualJumpVel = (this._tempJumpVelocity !== null ? this._tempJumpVelocity : (this.jumpVelocity !== null ? this.jumpVelocity : JUMP_VELOCITY));
      this.vy = actualJumpVel;
      this.isGrounded = false;
      this._jumpCooldown = 0.3;
      // 标记已跳跃，同一指令不再重复跳跃（防连跳）
      this._hasJumpedForCommand = true;
    }

    // ---- 垂直移动 + 碰撞 ----
    this._prevBottom = this.y + this.h;
    const newY = this.y + this.vy * dt;
    const maxY = 600 - this.h;
    const clampedY = Math.min(maxY, Math.max(-this.h, newY));
    const vRect = { x: this.x, y: clampedY, w: this.w, h: this.h };

    let verticalResolved = false;
    for (const obs of map.solidObstacles) {
      if (vRect.x < obs.x + obs.w && vRect.x + vRect.w > obs.x && vRect.y < obs.y + obs.h && vRect.y + vRect.h > obs.y) {
        if (this.vy < 0) { this.y = obs.y + obs.h; this.vy = 0; }
        else { this.y = obs.y - this.h; this.vy = 0; this.isGrounded = true; }
        verticalResolved = true;
        break;
      }
    }
    if (!verticalResolved) {
      const pfResult = map.checkPlatformCollision(vRect, this._prevBottom, this.vy);
      if (pfResult.hit) {
        this.y = pfResult.platformTop; this.vy = 0; this.isGrounded = true;
        // 自适应跳跃落地后恢复参数
        if (this._adaptiveState === 'jumping') {
          this._tempJumpVelocity = null;
          this._tempStepDistance = null;
          this._tempMoveSpeed = null;
          this.moveSpeed = 140;
          this._adaptiveState = 'idle';
          console.log('[AI] 自适应跳跃完成，参数已恢复');
        }
      }
      else {
        this.y = clampedY;
        if (clampedY >= maxY) {
          this.y = maxY; this.vy = 0; this.isGrounded = true;
          if (this._adaptiveState === 'jumping') {
            this._tempJumpVelocity = null;
            this._tempStepDistance = null;
            this._tempMoveSpeed = null;
            this.moveSpeed = 140;
            this._adaptiveState = 'idle';
          }
        }
        else { this.isGrounded = false; }
      }
    }

    // 跳跃着陆后立即停止水平移动
    if (this._hasJumpedForCommand && this.isGrounded) {
      this._moveDistanceRemaining = 0;
    }

    // ---- 红线屏障 ----
    if (window.game.map && window.game.map.redLineActive) {
      const rly = window.game.map.redLineY || 240;
      if (this.y < rly) {
        this.y = rly;
        this.vy = 0;
      }
    }

    // ---- 致命障碍检测 ----
    if (map.checkDeadlyCollision({ x: this.x, y: this.y, w: this.w, h: this.h })) {
      this.die();
    }

    // （AI 免疫子弹和掉落函数块伤害）

    // ---- 掉出屏幕底部 ----
    if (this.y > 600) { this.die(); }
  },

  die() {
    this.deaths++;
    this.collisionCount++;
    // 死亡时清除当前指令和移动距离，防止复活后继续执行旧指令
    this._moveDistanceRemaining = 0;
    this.clearExternalCommand();
    window.game.addEventLog('[警告] AI 队友触碰到了数据裂缝！正在重置位置...');
    if (typeof window.game.respawnAI === 'function') {
      window.game.respawnAI();
    }
  },

  /**
   * 绘制AI队友。精灵表加载后使用精灵动画，否则回退几何绘制。
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    if (!ctx) return;
    const sprites = window.game.sprites;
    if (sprites && sprites.loaded) {
      sprites.drawCharacter(ctx, 'ai', this);
      return;
    }
    this.drawGeometry(ctx);
  },

  /**
   * 几何回退绘制：橙色矩形 + 白色内边框 + 发光阴影 + 状态标识。
   * @param {CanvasRenderingContext2D} ctx
   */
  drawGeometry(ctx) {
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;

    if (!this.isGrounded) {
      ctx.save();
      const shadowAlpha = 0.15 + 0.05 * Math.sin(performance.now() * 0.01 + 1);
      ctx.fillStyle = 'rgba(255, 107, 53, ' + shadowAlpha + ')';
      ctx.beginPath();
      ctx.ellipse(cx, this.y + this.h + 4, this.w * 0.6, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.shadowColor = 'rgba(255, 107, 53, 0.6)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(this.x + 1, this.y + 1, this.w - 2, this.h - 2);
    ctx.restore();

    ctx.fillStyle = this._hasValidExternalCommand() ? '#ff6b35' : '#0a0a0a';
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this._hasValidExternalCommand() ? 'VO' : 'AI', cx, cy);
    ctx.textAlign = 'start';

  }
};
