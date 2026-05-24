a = open("E:/loop-prison/js/aiPlayer.js", "r", encoding="utf-8").read()

# Add _distanceSet flag to setExternalCommand
old_set = """  setExternalCommand(action) {
    console.log('[AI] setExternalCommand:', action);
    this.externalCommand = {
      action: action,
      timestamp: performance.now()
    };
    this._lastExternalCommandTime = performance.now();
    // 移动类指令设置固定移动距离
    if (action === 'move_left' || action === 'move_right' ||
        action === 'move_left_jump' || action === 'move_right_jump') {
      this._moveDistanceRemaining = this.moveStepDistance;
      console.log('[AI] 设置移动距离:', this.moveStepDistance, 'px');
    }
  },"""

new_set = """  setExternalCommand(action) {
    console.log('[AI] setExternalCommand:', action);
    this.externalCommand = {
      action: action,
      timestamp: performance.now()
    };
    this._lastExternalCommandTime = performance.now();
    // 标记距离未设置，由 switch 中的 _setVolumeScaledDistance 处理
    this._distanceSetForCommand = false;
  },"""

a = a.replace(old_set, new_set)

# Update _setVolumeScaledDistance to check the flag
old_svsd = """  _setVolumeScaledDistance() {
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
  },"""

new_svsd = """  _setVolumeScaledDistance() {
    // 每个指令只设置一次距离
    if (this._distanceSetForCommand) return;
    this._distanceSetForCommand = true;

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
    console.log("[AI] 音量缩放距离: peakVol=" + vol.toFixed(2) + " factor=" + factor.toFixed(2) + " dist=" + this._moveDistanceRemaining);
  },"""

a = a.replace(old_svsd, new_svsd)

# Clear the flag on clearExternalCommand
old_clear = """  clearExternalCommand() {
    this.externalCommand = null;
  },"""

new_clear = """  clearExternalCommand() {
    this.externalCommand = null;
    this._distanceSetForCommand = false;
  },"""

a = a.replace(old_clear, new_clear)

# Add _distanceSetForCommand property
old_prop = """  /** 碰撞到墙后是否自动清除移动指令 */
  clearOnWallHit: true,"""

new_prop = """  /** 碰撞到墙后是否自动清除移动指令 */
  clearOnWallHit: true,

  /** 当前指令是否已设置过移动距离（防止每帧重置） */
  _distanceSetForCommand: false,"""

a = a.replace(old_prop, new_prop)

open("E:/loop-prison/js/aiPlayer.js", "w", encoding="utf-8").write(a)
print("Fixed distance reset bug")