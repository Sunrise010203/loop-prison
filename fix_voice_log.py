v = open("E:/loop-prison/js/voice.js", "r", encoding="utf-8").read()

# Add more detailed logging when peak is locked
old = """            console.log('[音量] 语音锁定峰值:', this.lockedPeakVolume.toFixed(2), '等级:', this.getVolumeLevel());"""

new = """            console.log('[音量] ★ 语音锁定峰值:', this.lockedPeakVolume.toFixed(2), '等级:', this.getVolumeLevel(), '语音文本:', text);
            window.game.addEventLog('[音量] 峰值=' + this.lockedPeakVolume.toFixed(2) + ' (' + this.getVolumeLevel() + ')');"""

v = v.replace(old, new)

# Also add logger in _analyzeVolume for real-time tracking (only occasionally to not spam)
old_analyze = """    // 追踪实时峰值（仅用于 UI 显示）"""

new_analyze = """    // 追踪实时峰值
    // 每 30 帧输出一次日志（避免刷屏）
    if (typeof this._logCounter === 'undefined') this._logCounter = 0;
    this._logCounter++;
    if (this._logCounter % 30 === 0 && this.volume > 0.05) {
      console.log('[音量] 实时 vol=' + this.volume.toFixed(3) + ' peak=' + this._lastPeakAtSpeech.toFixed(3));
    }"""

v = v.replace(old_analyze, new_analyze)

open("E:/loop-prison/js/voice.js", "w", encoding="utf-8").write(v)
print("Added voice debug logging")