a = open("E:/loop-prison/js/aiPlayer.js", "r", encoding="utf-8").read()
old = """      // 距离用完后清除外部指令
      if (this._moveDistanceRemaining <= 0 && this.externalCommand && 
          (this.externalCommand.action === 'move_left' || this.externalCommand.action === 'move_right')) {
        this.clearExternalCommand();
      }"""
new = """      // 距离用完后清除外部指令
      if (this._moveDistanceRemaining <= 0 && this.externalCommand && 
          (this.externalCommand.action === 'move_left' || this.externalCommand.action === 'move_right' ||
           this.externalCommand.action === 'move_left_jump' || this.externalCommand.action === 'move_right_jump')) {
        this.clearExternalCommand();
        if (this._adaptiveState === 'jumping') {
          this._tempJumpVelocity = null;
          this._tempStepDistance = null;
          this._adaptiveState = 'idle';
        }
      }"""
if old in a:
    a = a.replace(old, new)
    open("E:/loop-prison/js/aiPlayer.js", "w", encoding="utf-8").write(a)
    print("OK")
else:
    print("NOT FOUND")