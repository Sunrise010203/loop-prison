a = open("E:/loop-prison/js/aiPlayer.js", "r", encoding="utf-8").read()

# Replace the existing param display with a more detailed one
old_display = """    // Show movement params
    ctx.fillStyle = 'rgba(0, 255, 65, 0.25)';
    ctx.font = '9px "Courier New", monospace';
    ctx.textAlign = 'left';
    var pText = 'SPD:' + this.moveSpeed + ' JMP:' + (this.jumpVelocity !== null ? this.jumpVelocity : 'def') + ' STP:' + this.moveStepDistance;
    ctx.fillText(pText, this.x, this.y - 3);
    ctx.textAlign = 'start';"""

new_display = """    // Show movement params (top of AI)
    ctx.fillStyle = 'rgba(0, 255, 65, 0.25)';
    ctx.font = '9px "Courier New", monospace';
    ctx.textAlign = 'left';
    var jv = this._tempJumpVelocity !== null ? this._tempJumpVelocity : (this.jumpVelocity !== null ? this.jumpVelocity : window.game.JUMP_VELOCITY || -380);
    var pText = 'SPD:' + Math.round(this.moveSpeed) + ' JV:' + jv + ' STP:' + Math.round(this._moveDistanceRemaining);
    ctx.fillText(pText, this.x, this.y - 3);
    ctx.textAlign = 'start';

    // Debug overlay (bottom of screen)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 580, 800, 20);
    ctx.fillStyle = '#00ff41';
    ctx.font = '10px "Courier New", monospace';
    ctx.textAlign = 'left';
    var peakVol = 0.6;
    if (window.game && window.game.voiceControl) {
      peakVol = window.game.voiceControl.getPeakVolume ? window.game.voiceControl.getPeakVolume() : 0.6;
    }
    var mode = this._hasValidExternalCommand() ? "CMD:" + (this.externalCommand ? this.externalCommand.action : "?") : "IDLE";
    var dbg = mode + " VOL:" + peakVol.toFixed(2) + " JV:" + jv + " STP:" + Math.round(this._moveDistanceRemaining) + " SPD:" + Math.round(this.moveSpeed);
    ctx.fillText(dbg, 4, 594);
    ctx.textAlign = 'start';"""

a = a.replace(old_display, new_display)
open("E:/loop-prison/js/aiPlayer.js", "w", encoding="utf-8").write(a)
print("Added debug overlay")