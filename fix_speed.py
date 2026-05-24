a = open("E:/loop-prison/js/aiPlayer.js", "r", encoding="utf-8").read()

old_svsd = """  _setVolumeScaledDistance() {
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
    console.log("[AI] 音量缩放距离: peakVol=" + vol.toFixed(2) + " factor=" + factor.toFixed(2) + " dist=" + this._moveDistanceRemaining + " moveStep=" + this.moveStepDistance);
    window.game.addEventLog("[AI] 距离: peakVol=" + vol.toFixed(2) + " => " + Math.round(this._moveDistanceRemaining) + "px");
  },"""

new_svsd = """  _setVolumeScaledDistance() {
    // 每个指令只设置一次
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
    // 音量缩放因子
    var factor = 0.3 + vol * 1.7;

    // 步进距离受音量影响
    this._moveDistanceRemaining = Math.round(this.moveStepDistance * factor);

    // 移动速度受音量影响（基础 120~350）
    this.moveSpeed = Math.min(350, Math.max(120, Math.round(140 * factor)));

    // 跳跃速度也受音量影响（基础 -350~-1200）
    var baseJumpVel = this.jumpVelocity !== null ? this.jumpVelocity : (window.game.JUMP_VELOCITY || -380);
    var scaledJv = Math.round(baseJumpVel * factor);
    this._tempJumpVelocity = Math.max(-1200, Math.min(-300, scaledJv));

    console.log("[AI] 音量全参: vol=" + vol.toFixed(2) + " factor=" + factor.toFixed(2) + " dist=" + this._moveDistanceRemaining + " spd=" + this.moveSpeed + " jv=" + this._tempJumpVelocity);
    window.game.addEventLog("[AI] 音量: " + vol.toFixed(2) + " => 步进=" + Math.round(this._moveDistanceRemaining) + "px 速度=" + this.moveSpeed + " 跳跃=" + this._tempJumpVelocity);
  },"""

a = a.replace(old_svsd, new_svsd)

open("E:/loop-prison/js/aiPlayer.js", "w", encoding="utf-8").write(a)
print("Updated _setVolumeScaledDistance with all params")