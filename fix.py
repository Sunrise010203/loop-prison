a = open("E:/loop-prison/js/aiPlayer.js", "r", encoding="utf-8").read()

old_methods = """  // ==========================================================
  // 自适应跳跃系统
  // ==========================================================

  /**
   * 扫描前方障碍物，返回最近的障碍信息
   * @returns {{type: string, x: number, y: number, w: number, h: number, requiredHeight: number, requiredDistance: number}|null}
   */
  _scanObstaclesAhead() {
    const map = window.game.map;
    if (!map) return null;

    const dir = 1; // AI 始终向右扫描（关卡从左到右）
    const startX = this.x + this.w;
    const endX = startX + this.adaptiveScanRange;
    const aiBottom = this.y + this.h;
    const aiTop = this.y;

    let nearest = null;
    let nearestDist = Infinity;

    // 扫描致命障碍（地面裂缝等）
    for (const obs of map.deadlyObstacles) {
      if (obs.x > startX && obs.x < endX) {
        const dist = obs.x - startX;
        if (dist < nearestDist) {
          nearestDist = dist;
          // 需要跳过裂缝：跳越距离 = 裂缝宽度 + 余量
          const requiredDist = (obs.x + obs.w) - this.x + 20;
          // 需要高度：让 AI 底部高于障碍物顶部
          const obsTop = obs.y;
          const requiredHeight = (obsTop - aiBottom) + 30;
          nearest = { type: 'deadly', x: obs.x, y: obs.y, w: obs.w, h: obs.h, requiredHeight: Math.max(requiredHeight, 60), requiredDistance: Math.max(requiredDist, 100) };
        }
      }
    }

    // 扫描固体障碍（墙、平台柱等）
    if (!nearest) {
      for (const obs of map.solidObstacles) {
        if (obs.x > startX && obs.x < endX) {
          const dist = obs.x - startX;
          if (dist < nearestDist) {
            nearestDist = dist;
            const requiredDist = (obs.x + obs.w) - this.x + 20;
            const obsTop = obs.y;
            const requiredHeight = (obsTop - aiBottom) + 20;
            nearest = { type: 'solid', x: obs.x, y: obs.y, w: obs.w, h: obs.h, requiredHeight: Math.max(requiredHeight, 50), requiredDistance: Math.max(requiredDist, 80) };
          }
        }
      }
    }

    // 扫描前方平台（需要跳上去的平台）
    if (!nearest) {
      for (const pf of map.platforms) {
        // 平台在 AI 前方且高于 AI 当前位置
        if (pf.x > startX && pf.x < endX && pf.y < aiBottom) {
          const dist = pf.x - startX;
          if (dist < nearestDist) {
            nearestDist = dist;
            const requiredHeight = (aiBottom - pf.y) + 20;
            const requiredDist = (pf.x + pf.w) - this.x + 10;
            nearest = { type: 'platform', x: pf.x, y: pf.y, w: pf.w, h: pf.h, requiredHeight: Math.max(requiredHeight, 50), requiredDistance: Math.max(requiredDist, 60) };
          }
        }
      }
    }

    return nearest;
  },

  /**
   * 根据障碍信息计算最优跳跃参数
   */
  _calcAdaptiveParams(obstacle) {
    if (!obstacle) return { jumpVel: -500, stepDist: 160 };

    // 重力加速度
    const G = window.game.GRAVITY || 800;
    const h = obstacle.requiredHeight;  // 需要跨越的高度（像素）
    const d = obstacle.requiredDistance; // 需要跨越的水平距离

    // 根据物理公式计算所需初速度：v = sqrt(2 * g * h)
    // 加 20% 余量确保能跳过
    const requiredVel = -Math.sqrt(2 * G * h) * 1.2;
    // 限制最大跳跃速度
    const jumpVel = Math.max(-800, Math.min(-350, Math.round(requiredVel)));

    // 步进距离：需要跨越的水平距离 + 余量
    const stepDist = Math.min(300, Math.max(d, 100));

    console.log('[AI] 自适应参数: 高度=' + h + 'px 距离=' + d + 'px 初速=' + jumpVel + ' 步进=' + stepDist);
    return { jumpVel: jumpVel, stepDist: stepDist };
  },

  /**
   * 执行自适应跳跃
   */
  _doAdaptiveJump() {
    const obs = this._scanObstaclesAhead();
    if (obs) {
      const params = this._calcAdaptiveParams(obs);
      this._tempJumpVelocity = params.jumpVel;
      this._tempStepDistance = params.stepDist;
      // 用计算出的距离覆盖
      this._moveDistanceRemaining = params.stepDist;
      this._adaptiveState = 'jumping';

      // 设置外部指令让 AI 向前跳
      this.externalCommand = {
        action: 'move_right_jump',
        timestamp: performance.now()
      };

      window.game.addEventLog('[AI] 自适应跳跃：初速=' + params.jumpVel + ' 距离=' + params.stepDist + 'px');
    } else {
      // 没检测到障碍，普通跳跃
      this.externalCommand = {
        action: 'jump',
        timestamp: performance.now()
      };
      window.game.addEventLog('[AI] 前方无障碍，执行普通跳跃');
    }
  },"""

new_methods = """  // ==========================================================
  // 自适应跳跃系统（双向扫描 + 方向感知）
  // ==========================================================

  /**
   * 扫描指定方向上的障碍物
   * @param {number} dir - 扫描方向：1=向右，-1=向左
   * @returns {{type: string, x: number, y: number, w: number, h: number, requiredHeight: number, requiredDistance: number, direction: number}|null}
   */
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
    if (!obstacle) return { jumpVel: -500, stepDist: 160, direction: 1 };

    const G = window.game.GRAVITY || 800;
    const h = obstacle.requiredHeight;
    const d = obstacle.requiredDistance;

    const requiredVel = -Math.sqrt(2 * G * h) * 1.3;
    const jumpVel = Math.max(-900, Math.min(-350, Math.round(requiredVel)));
    const stepDist = Math.min(350, Math.max(d, 100));

    console.log('[AI] 自适应: dir=' + (obstacle.direction > 0 ? '右' : '左') + ' 高度=' + h + 'px 距离=' + d + 'px 初速=' + jumpVel + ' 步进=' + stepDist);
    return { jumpVel: jumpVel, stepDist: stepDist, direction: obstacle.direction };
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
  },"""

a = a.replace(old_methods, new_methods)
open("E:/loop-prison/js/aiPlayer.js", "w", encoding="utf-8").write(a)
print("Replaced adaptive jump system")