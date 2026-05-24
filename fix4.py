a = open("E:/loop-prison/js/aiPlayer.js", "r", encoding="utf-8").read()

old_calc = """  _calcAdaptiveParams(obstacle) {
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

new_calc = """  _calcAdaptiveParams(obstacle) {
    if (!obstacle) return { jumpVel: -500, stepDist: 300, direction: 1, speed: 140 };

    // 读取当前音量（0~1）
    var vol = 0.5;
    if (window.game.voiceControl && typeof window.game.voiceControl.getVolume === "function") {
      vol = Math.max(0.1, Math.min(1, window.game.voiceControl.getVolume()));
    }
    // 音量映射系数：0.1(耳语)→0.6  0.5(正常)→1.0  1.0(大喊)→1.8
    var volFactor = 0.4 + vol * 1.4;

    const G = window.game.GRAVITY || 800;
    const h = obstacle.requiredHeight;
    const d = obstacle.requiredDistance;

    // 跳跃速度受音量影响：越大声跳越高
    const requiredVel = -Math.sqrt(2 * G * h) * 1.4 * volFactor;
    const jumpVel = Math.max(-1200, Math.min(-300, Math.round(requiredVel)));

    // 步进距离受音量影响：越大声跳越远
    const stepDist = Math.min(600, Math.max(d * 1.5 * volFactor, 150));
    // 水平速度受音量影响
    const speed = Math.min(350, Math.max(120, Math.round(d * 0.8 * volFactor)));

    console.log("[AI] 自适应: 音量=" + vol.toFixed(2) + "倍率=" + volFactor.toFixed(2) + " 初速=" + jumpVel + " 步进=" + stepDist + " 速度=" + speed + " dir=" + (obstacle.direction > 0 ? "右" : "左"));
    return { jumpVel: jumpVel, stepDist: stepDist, direction: obstacle.direction, speed: speed };
  },"""

a = a.replace(old_calc, new_calc)

# Also update the base movement commands (non-adaptive) to use volume
# For move_left / move_right in the switch, scale step distance by volume
old_move_left = """        case 'move_left':
          dx = -1;
          break;
        case 'move_right':
          dx = 1;
          break;"""

new_move_left = """        case 'move_left':
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

a = a.replace(old_move_left, new_move_left)

open("E:/loop-prison/js/aiPlayer.js", "w", encoding="utf-8").write(a)
print("Volume-aware adaptive jump added")