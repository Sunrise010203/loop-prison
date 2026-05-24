v = open("E:/loop-prison/js/voice.js", "r", encoding="utf-8").read()

# Add peakVolume tracking
old_props = """  /** 当前音量值（0~1，平滑后的 RMS 音量） */
  volume: 0,"""

new_props = """  /** 当前音量值（0~1，平滑后的 RMS 音量） */
  volume: 0,

  /** 语音识别期间的峰值音量（用于 LLM 响应时调参） */
  peakVolume: 0,

  /** 当前是否在说话（检测到语音） */
  isSpeaking: false,

  /** 说话结束后的静音计时器 */
  _silenceTimer: 0,"""

v = v.replace(old_props, new_props)

# Update _analyzeVolume to track peak
old_analyze = """    // 映射到 0~1（经验值：正常说话 rms≈0.1~0.3，大声≈0.5+）
    this.volume = Math.min(1, Math.max(0, avgRms * 3));

    // 触发 UI 更新
    this._updateUI();"""

new_analyze = """    // 映射到 0~1（经验值：正常说话 rms≈0.1~0.3，大声≈0.5+）
    this.volume = Math.min(1, Math.max(0, avgRms * 3));

    // 峰值追踪：有语音时记录最高音量
    if (this.volume > 0.08) {
      // 正在说话
      this.isSpeaking = true;
      this._silenceTimer = 0;
      if (this.volume > this.peakVolume) {
        this.peakVolume = this.volume;
      }
    } else if (this.isSpeaking) {
      // 刚说完：等待 500ms 静音再重置峰值
      this._silenceTimer += 16; // ~每帧 16ms
      if (this._silenceTimer > 500) {
        this.isSpeaking = false;
        this._silenceTimer = 0;
      }
    }

    // 触发 UI 更新
    this._updateUI();"""

v = v.replace(old_analyze, new_analyze)

# Add getPeakVolume method
old_getvol = """  getVolume() {
    return this.volume;
  },"""

new_getvol = """  getVolume() {
    return this.volume;
  },

  /**
   * 获取语音识别期间的峰值音量（0~1）
   * 这个值在用户说完话后会保持一段时间，供 LLM 响应时读取
   */
  getPeakVolume() {
    if (this.isSpeaking || this._silenceTimer > 0) {
      return this.peakVolume;
    }
    // 没有说话时返回当前音量（兜底）
    return Math.max(this.volume, 0.3);
  },

  /**
   * 手动重置峰值音量（在发送 LLM 请求后调用）
   */
  resetPeakVolume() {
    this.peakVolume = 0;
    this.isSpeaking = false;
    this._silenceTimer = 0;
  },"""

v = v.replace(old_getvol, new_getvol)

# In the speech onresult handler, reset peak when new final result comes
old_result = """        if (finalTranscript.trim()) {
          const text = finalTranscript.trim();
          if (text !== this._lastSentText) {
            this._lastSentText = text;
            this.currentCommand = text;"""

new_result = """        if (finalTranscript.trim()) {
          const text = finalTranscript.trim();
          if (text !== this._lastSentText) {
            this._lastSentText = text;
            this.currentCommand = text;
            // 发送语音时锁定当前峰值音量"""

v = v.replace(old_result, new_result)

# Update UI to include peakVolume
old_ui_update = """      this.onInterimUpdate({
        isListening: this.isListening,
        interimText: this.interimText,
        currentCommand: this.currentCommand,
        volume: this.volume,
        volumeLevel: this.getVolumeLevel()
      });"""

new_ui_update = """      this.onInterimUpdate({
        isListening: this.isListening,
        interimText: this.interimText,
        currentCommand: this.currentCommand,
        volume: this.volume,
        peakVolume: this.peakVolume,
        volumeLevel: this.getVolumeLevel()
      });"""

v = v.replace(old_ui_update, new_ui_update)

open("E:/loop-prison/js/voice.js", "w", encoding="utf-8").write(v)
print("voice.js updated with peak volume tracking")