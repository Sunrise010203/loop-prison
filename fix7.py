a = open("E:/loop-prison/js/aiPlayer.js", "r", encoding="utf-8").read()

# 1. Increase base moveStepDistance
a = a.replace("moveStepDistance: 300,", "moveStepDistance: 400,")

# 2. Update _calcAdaptiveParams to use getPeakVolume instead of getVolume
old_calc = """  _calcAdaptiveParams(obstacle) {
    if (!obstacle) return { jumpVel: -500, stepDist: 300, direction: 1, speed: 140 };

    // 读取当前音量（0~1）
    var vol = 0.5;
    if (window.game.voiceControl && typeof window.game.voiceControl.getVolume === "function") {
      vol = Math.max(0.1, Math.min(1, window.game.voiceControl.getVolume()));
    }
    // 音量映射：0.1(耳语)=>0.5  0.5(正常)=>1.0  1.0(大喊)=>1.8
    var volFactor = 0.3 + vol * 1.5;

    const G = window.game.GRAVITY || 800;
    const h = obstacle.requiredHeight;
    const d = obstacle.requiredDistance;

    // 跳跃速度 = 基础值 * 音量倍率（大声=跳更高）
    const requiredVel = -Math.sqrt(2 * G * h) * 1.3 * volFactor;
    const jumpVel = Math.max(-1200, Math.min(-300, Math.round(requiredVel)));

    // 步进距离 = 障碍宽度 * 1.5 * 音量倍率
    const stepDist = Math.min(600, Math.max(d * 1.5 * volFactor, 150));

    // 水平速度 = 障碍宽度 * 0.8 * 音量倍率
    const speed = Math.min(350, Math.max(120, Math.round(d * 0.8 * volFactor)));

    console.log("[AI] 自适应: vol=" + vol.toFixed(2) + "x" + volFactor.toFixed(2) + " 初速=" + jumpVel + " 步进=" + stepDist + " 速度=" + speed + " dir=" + (obstacle.direction > 0 ? "R" : "L"));
    return { jumpVel: jumpVel, stepDist: stepDist, direction: obstacle.direction, speed: speed };
  },"""

new_calc = """  _calcAdaptiveParams(obstacle) {
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
  },"""

a = a.replace(old_calc, new_calc)

# 3. Update move_left/move_right to use getPeakVolume
old_move = """        case 'move_left':
          dx = -1;
          // 根据音量调整移动距离
          if (window.game.voiceControl && typeof window.game.voiceControl.getVolume === "function") {
            var v = Math.max(0.1, Math.min(1, window.game.voiceControl.getVolume()));
            var factor = 0.3 + v * 1.4;
            this._moveDistanceRemaining = Math.round(this.moveStepDistance * factor);
          }
          break;
        case 'move_right':
          dx = 1;
          // 根据音量调整移动距离
          if (window.game.voiceControl && typeof window.game.voiceControl.getVolume === "function") {
            var v = Math.max(0.1, Math.min(1, window.game.voiceControl.getVolume()));
            var factor = 0.3 + v * 1.4;
            this._moveDistanceRemaining = Math.round(this.moveStepDistance * factor);
          }
          break;"""

new_move = """        case 'move_left':
          dx = -1;
          this._setVolumeScaledDistance();
          break;
        case 'move_right':
          dx = 1;
          this._setVolumeScaledDistance();
          break;"""

a = a.replace(old_move, new_move)

# Also move_left_jump and move_right_jump need volume scaling
old_mj = """        case 'move_left_jump':
          dx = -1;
          shouldJump = true;
          break;
        case 'move_right_jump':
          dx = 1;
          shouldJump = true;
          break;"""

new_mj = """        case 'move_left_jump':
          dx = -1;
          shouldJump = true;
          this._setVolumeScaledDistance();
          break;
        case 'move_right_jump':
          dx = 1;
          shouldJump = true;
          this._setVolumeScaledDistance();
          break;"""

a = a.replace(old_mj, new_mj)

# Add the helper method before _scanDirection
old_scan = """  _scanDirection(dir) {"""

new_scan = """  /**
   * 根据语音峰值音量缩放移动距离
   */
  _setVolumeScaledDistance() {
    var vol = 0.6;
    if (window.game.voiceControl) {
      if (typeof window.game.voiceControl.getPeakVolume === "function") {
        vol = Math.max(0.15, Math.min(1, window.game.voiceControl.getPeakVolume()));
      } else if (typeof window.game.voiceControl.getVolume === "function") {
        vol = Math.max(0.15, Math.min(1, window.game.voiceControl.getVolume()));
      }
    }
    var factor = 0.3 + vol * 1.7;
    this._moveDistanceRemaining = Math.round(this.moveStepDistance * factor);
    console.log("[AI] 音量缩放距离: vol=" + vol.toFixed(2) + " factor=" + factor.toFixed(2) + " dist=" + this._moveDistanceRemaining);
  },

  _scanDirection(dir) {"""

a = a.replace(old_scan, new_scan)

open("E:/loop-prison/js/aiPlayer.js", "w", encoding="utf-8").write(a)
print("aiPlayer.js updated with peak volume")