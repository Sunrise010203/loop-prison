a = open("E:/loop-prison/js/aiPlayer.js", "r", encoding="utf-8").read()

# Add more logging to _setVolumeScaledDistance
old_log = """    console.log("[AI] �������ž���: peakVol=" + vol.toFixed(2) + " factor=" + factor.toFixed(2) + " dist=" + this._moveDistanceRemaining);"""

new_log = """    console.log("[AI] �������ž���: peakVol=" + vol.toFixed(2) + " factor=" + factor.toFixed(2) + " dist=" + this._moveDistanceRemaining + " moveStep=" + this.moveStepDistance);
    window.game.addEventLog("[AI] ����: peakVol=" + vol.toFixed(2) + " => " + Math.round(this._moveDistanceRemaining) + "px");"""

a = a.replace(old_log, new_log)

# Also log in _calcAdaptiveParams
old_calc_log = """    console.log("[AI] ����Ӧ: peakVol=" + vol.toFixed(2) + "x" + volFactor.toFixed(2) + " ����=" + jumpVel + " ����=" + stepDist + " �ٶ�=" + speed + " dir=" + (obstacle.direction > 0 ? "R" : "L"));"""

new_calc_log = """    console.log("[AI] ADAPT: peakVol=" + vol.toFixed(2) + " x" + volFactor.toFixed(2) + " jumpVel=" + jumpVel + " step=" + stepDist + " spd=" + speed);
    window.game.addEventLog("[AI] 自适应跳跃: v=" + vol.toFixed(2) + " => jump=" + jumpVel + " step=" + stepDist + "px");"""

a = a.replace(old_calc_log, new_calc_log)

open("E:/loop-prison/js/aiPlayer.js", "w", encoding="utf-8").write(a)
print("Added debug logging")