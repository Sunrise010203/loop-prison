a = open("E:/loop-prison/js/aiPlayer.js", "r", encoding="utf-8").read()

# In _doAdaptiveJump, set the flag after setting distance
old = """      this._tempJumpVelocity = params.jumpVel;
      this._tempStepDistance = params.stepDist;
      this._moveDistanceRemaining = params.stepDist;
      this._tempMoveSpeed = params.speed || 140;"""

new = """      this._tempJumpVelocity = params.jumpVel;
      this._tempStepDistance = params.stepDist;
      this._moveDistanceRemaining = params.stepDist;
      // 自适应跳跃已设置距离，标记防止被 _setVolumeScaledDistance 覆盖
      this._distanceSetForCommand = true;
      this._tempMoveSpeed = params.speed || 140;"""

a = a.replace(old, new)

open("E:/loop-prison/js/aiPlayer.js", "w", encoding="utf-8").write(a)
print("Fixed adaptive jump distance flag")