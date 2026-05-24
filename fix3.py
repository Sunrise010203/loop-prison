a = open("E:/loop-prison/js/aiPlayer.js", "r", encoding="utf-8").read()

# Make adaptive jump also boost speed for wide gaps
old_calc = """  _calcAdaptiveParams(obstacle) {
    if (!obstacle) return { jumpVel: -500, stepDist: 160, direction: 1 };

    const G = window.game.GRAVITY || 800;
    const h = obstacle.requiredHeight;
    const d = obstacle.requiredDistance;

    const requiredVel = -Math.sqrt(2 * G * h) * 1.3;
    const jumpVel = Math.max(-900, Math.min(-350, Math.round(requiredVel)));
    const stepDist = Math.min(350, Math.max(d, 100));

    console.log("[AI] 自适应: dir=" + (obstacle.direction > 0 ? "右" : "左") + " 高度=" + h + "px 距离=" + d + "px 初速=" + jumpVel + " 步进=" + stepDist);
    return { jumpVel: jumpVel, stepDist: stepDist, direction: obstacle.direction };
  },"""

new_calc = """  _calcAdaptiveParams(obstacle) {
    if (!obstacle) return { jumpVel: -500, stepDist: 300, direction: 1, speed: 140 };

    const G = window.game.GRAVITY || 800;
    const h = obstacle.requiredHeight;
    const d = obstacle.requiredDistance;

    const requiredVel = -Math.sqrt(2 * G * h) * 1.4;
    const jumpVel = Math.max(-1000, Math.min(-350, Math.round(requiredVel)));

    // 宽障碍需要更大步进 + 更高速度
    const stepDist = Math.min(450, Math.max(d * 1.5, 200));
    // 根据距离自动提升速度（宽裂缝需要更快水平速度）
    const speed = Math.min(250, Math.max(140, Math.round(d * 0.8)));

    console.log("[AI] 自适应: dir=" + (obstacle.direction > 0 ? "右" : "左") + " 高度=" + h + "px 距离=" + d + "px 初速=" + jumpVel + " 步进=" + stepDist + " 速度=" + speed);
    return { jumpVel: jumpVel, stepDist: stepDist, direction: obstacle.direction, speed: speed };
  },"""

a = a.replace(old_calc, new_calc)

# Update _doAdaptiveJump to apply temp speed
old_do = """      this._tempJumpVelocity = params.jumpVel;
      this._tempStepDistance = params.stepDist;
      this._moveDistanceRemaining = params.stepDist;
      this._adaptiveState = 'jumping';"""

new_do = """      this._tempJumpVelocity = params.jumpVel;
      this._tempStepDistance = params.stepDist;
      this._moveDistanceRemaining = params.stepDist;
      this._tempMoveSpeed = params.speed || 140;
      // 临时覆盖移动速度
      this.moveSpeed = this._tempMoveSpeed;
      this._adaptiveState = 'jumping';"""

a = a.replace(old_do, new_do)

# Add tempMoveSpeed property
old_prop = """  /** 临时移动距离覆盖 */
  _tempStepDistance: null,"""

new_prop = """  /** 临时移动距离覆盖 */
  _tempStepDistance: null,
  /** 临时移动速度覆盖 */
  _tempMoveSpeed: null,"""

a = a.replace(old_prop, new_prop)

# Reset speed on landing
old_reset = """if (this._adaptiveState === 'jumping') {
          this._tempJumpVelocity = null;
          this._tempStepDistance = null;
          this._adaptiveState = 'idle';
          console.log('[AI] 自适应跳跃完成，参数已恢复');
        }"""

new_reset = """if (this._adaptiveState === 'jumping') {
          this._tempJumpVelocity = null;
          this._tempStepDistance = null;
          this._tempMoveSpeed = null;
          this.moveSpeed = 140;
          this._adaptiveState = 'idle';
          console.log('[AI] 自适应跳跃完成，参数已恢复');
        }"""

a = a.replace(old_reset, new_reset)

# Also reset in the distance clear code
old_reset2 = """if (this._adaptiveState === 'jumping') {
          this._tempJumpVelocity = null;
          this._tempStepDistance = null;
          this._adaptiveState = 'idle';
        }"""

new_reset2 = """if (this._adaptiveState === 'jumping') {
          this._tempJumpVelocity = null;
          this._tempStepDistance = null;
          this._tempMoveSpeed = null;
          this.moveSpeed = 140;
          this._adaptiveState = 'idle';
        }"""

a = a.replace(old_reset2, new_reset2)

# Also reset in maxY landing
old_maxy_adapt = """if (this._adaptiveState === 'jumping') {
            this._tempJumpVelocity = null;
            this._tempStepDistance = null;
            this._adaptiveState = 'idle';
          }"""

new_maxy_adapt = """if (this._adaptiveState === 'jumping') {
            this._tempJumpVelocity = null;
            this._tempStepDistance = null;
            this._tempMoveSpeed = null;
            this.moveSpeed = 140;
            this._adaptiveState = 'idle';
          }"""

a = a.replace(old_maxy_adapt, new_maxy_adapt)

open("E:/loop-prison/js/aiPlayer.js", "w", encoding="utf-8").write(a)
print("Updated adaptive jump with speed boost")