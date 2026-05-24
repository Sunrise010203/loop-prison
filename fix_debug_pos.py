a = open("E:/loop-prison/js/aiPlayer.js", "r", encoding="utf-8").read()

old_debug = """    // Debug overlay (bottom of screen)
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

new_debug = """    // Debug overlay (top of canvas, above map module name)
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, 800, 16);
    ctx.fillStyle = '#ff6b35';
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.textAlign = 'left';
    var peakVol = 0.6;
    if (window.game && window.game.voiceControl) {
      peakVol = window.game.voiceControl.getPeakVolume ? window.game.voiceControl.getPeakVolume() : 0.6;
    }
    var mode = this._hasValidExternalCommand() ? "CMD:" + (this.externalCommand ? this.externalCommand.action : "?") : "IDLE";
    var dbg = "[" + mode + "] VOL:" + peakVol.toFixed(2) + " JV:" + jv + " STP:" + Math.round(this._moveDistanceRemaining) + " SPD:" + Math.round(this.moveSpeed);
    ctx.fillText(dbg, 4, 12);
    ctx.textAlign = 'start';
    ctx.restore();"""

a = a.replace(old_debug, new_debug)
open("E:/loop-prison/js/aiPlayer.js", "w", encoding="utf-8").write(a)
print("Moved debug bar to top")