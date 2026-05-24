/* ============================================================
 * 语音指挥系统 -- 实时语音识别 + 音量分析
 *
 * 实时模式特性：
 * 1. 语音识别（Web Speech API）：连续监听 + 中间结果
 * 2. 音量分析（Web Audio API）：实时获取麦克风音量
 * 3. 峰值锁定：语音识别完成时锁定峰值音量，供 LLM 响应调参
 *
 * 挂载点：window.game.voiceControl
 * ============================================================ */

window.game.voiceControl = {
  /** 语音识别是否正在运行 */
  isListening: false,

  /** 浏览器是否支持语音识别 */
  supported: false,

  /** 最后一次完整识别的文本 */
  currentCommand: '',

  /** 实时的中间识别文本 */
  interimText: '',

  /** Web Speech API 的识别器实例 */
  _recognition: null,

  /** 自动重启标志 */
  _autoRestart: false,
  /** 重启延迟计时器 */
  _restartTimeout: null,
  /** _rebuildRecognition 重入锁 */
  _rebuilding: false,
  /** 看门狗：上次 onresult 时间戳 */
  _lastResultTime: 0,
  /** 看门狗定时器 */
  _watchdogInterval: null,
  /** 识别器代际计数器（防止废弃实例的回调覆盖状态） */
  _generation: 0,

  /** UI 更新回调 */
  onInterimUpdate: null,

  /** 上次发送给 LLM 的文本 */
  _lastSentText: '',
  _silenceTimer: null,
  _silenceTimeout: 300,
  _silenceCheckText: "",
  _onCommandComplete: null,

  // ============================================================
  // 音量分析系统
  // ============================================================

  /** 当前实时音量（0~1） */
  volume: 0,

  /** 语音识别锁定时的峰值音量（供 LLM 响应使用） */
  lockedPeakVolume: 0.6,

  /** 最后一次语音识别结果时的峰值 */
  _lastPeakAtSpeech: 0.6,

  /** Web Audio 相关 */
  _audioContext: null,
  _analyser: null,
  _mediaStream: null,
  _animationId: null,

  /**
   * 获取当前音量
   */
  getVolume() {
    return this.volume;
  },

  /**
   * 获取锁定的峰值音量（语音识别完成时的峰值）
   * 这个值在每次语音识别出结果时更新，一直保持到下次语音识别
   */
  getPeakVolume() {
    return this.lockedPeakVolume;
  },

  /**
   * 获取音量等级描述
   */
  getVolumeLevel() {
    const v = this.lockedPeakVolume;
    if (v < 0.15) return 'quiet';
    if (v < 0.3) return 'low';
    if (v < 0.55) return 'normal';
    if (v < 0.75) return 'loud';
    return 'very_loud';
  },

  /**
   * 启动音量分析（Web Audio API）
   */
  _startVolumeAnalysis() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        console.log('[音量] 不支持 Web Audio API');
        return;
      }

      this._audioContext = new AudioContext();

      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        this._mediaStream = stream;
        const source = this._audioContext.createMediaStreamSource(stream);
        this._analyser = this._audioContext.createAnalyser();
        this._analyser.fftSize = 256;
        source.connect(this._analyser);
        this._analyzeVolume();
      }).catch((err) => {
        console.log('[音量] 麦克风访问被拒绝:', err.message);
      });
    } catch (err) {
      console.log('[音量] 启动失败:', err.message);
    }
  },

  /**
   * 持续分析音量
   */
  _analyzeVolume() {
    if (!this._analyser || !this.isListening) return;

    const dataArray = new Uint8Array(this._analyser.frequencyBinCount);
    this._analyser.getByteTimeDomainData(dataArray);

    // 计算 RMS 音量
    let sumSquares = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = (dataArray[i] - 128) / 128;
      sumSquares += normalized * normalized;
    }
    const rms = Math.sqrt(sumSquares / dataArray.length);

    // 映射到 0~1（正常说话 rms≈0.1~0.3，大声≈0.5+）
    this.volume = Math.min(1, Math.max(0, rms * 3));

    // 追踪实时峰值
    // 每 30 帧输出一次日志（避免刷屏）
    if (typeof this._logCounter === 'undefined') this._logCounter = 0;
    this._logCounter++;
    if (this._logCounter % 30 === 0 && this.volume > 0.05) {
      console.log('[音量] 实时 vol=' + this.volume.toFixed(3) + ' peak=' + this._lastPeakAtSpeech.toFixed(3));
    }
    if (this.volume > this._lastPeakAtSpeech) {
      this._lastPeakAtSpeech = this.volume;
    }

    this._updateUI();
    this._animationId = requestAnimationFrame(() => this._analyzeVolume());
  },

  /**
   * 停止音量分析
   */
  _stopVolumeAnalysis() {
    if (this._animationId) {
      cancelAnimationFrame(this._animationId);
      this._animationId = null;
    }
    if (this._mediaStream) {
      this._mediaStream.getTracks().forEach(t => t.stop());
      this._mediaStream = null;
    }
    if (this._audioContext) {
      this._audioContext.close().catch(() => {});
      this._audioContext = null;
      this._analyser = null;
    }
    this.volume = 0;
  },

  // ============================================================
  // 语音识别
  // ============================================================

  /**
   * 检测浏览器是否支持语音识别
   */
  checkSupport() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.supported = !!SpeechRecognition;
    return this.supported;
  },

  /**
   * 启动语音识别 + 音量分析
   */
  start() {
    if (this.isListening) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      window.game.addEventLog('[语音] 错误：浏览器不支持 Web Speech API，请使用 Chrome/Edge');
      return;
    }

    try {
      this._recognition = new SpeechRecognition();
      this._recognition.continuous = true;
      this._recognition.interimResults = true;
      this._recognition.lang = 'zh-CN';
      this._recognition.maxAlternatives = 1;

      var gen = this._generation;
      this._recognition.onresult = (event) => {
        if (gen !== this._generation) return;
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
            this.interimText = result[0].transcript;
          } else {
            this.interimText = result[0].transcript;
          }
        }
        this._lastResultTime = performance.now();
          // only restart silence timer if text actually changed
        // _lastResultTime already updated above, periodic check handles the rest
        this._updateUI();
        if (finalTranscript.trim()) {
          const text = finalTranscript.trim();
          if (text) {
            this.lockedPeakVolume = Math.max(0.2, Math.min(1, this._lastPeakAtSpeech));
            this._lastPeakAtSpeech = 0;
            console.log("[volume] peak locked:", this.lockedPeakVolume.toFixed(2), "text:", text);
          }
        }
      };

      var genErr = this._generation;
      this._recognition.onerror = (event) => {
        if (genErr !== this._generation) return;
        if (event.error !== 'no-speech') {
          window.game.addEventLog('[语音] 错误：' + event.error);
        }
        // 严重错误时重建识别器
        if (event.error === 'aborted' || event.error === 'language-not-supported' || event.error === 'service-not-allowed') {
          if (this._autoRestart && this.isListening) {
            clearTimeout(this._restartTimeout);
            this._rebuildRecognition();
          }
        } else {
          // no-speech: skip rebuild, let onend handle it
          if (event.error === 'no-speech') return;
          // 轻微错误也走重建，比直接 .start() 更稳健
          if (this._autoRestart && this.isListening) {
            this._rebuildRecognition();
          }
        }
      };

      var genEnd = this._generation;
      this._recognition.onend = () => {
        if (genEnd !== this._generation) return;
        if (this._autoRestart && this.isListening) {
          // 先尝试立即重建（浏览器通常允许），失败再延迟重试
          clearTimeout(this._restartTimeout);
          this._rebuildRecognition();
        }
      };

      this._recognition.start();
      this.isListening = true;
      this._autoRestart = true;
      this._lastSentText = '';
          this._silenceCheckText = '';
      this.lockedPeakVolume = 0.6;
      this._lastPeakAtSpeech = 0;

      this._startVolumeAnalysis();
      this._startWatchdog();
      this._startSilenceCheck();
      window.game.addEventLog('[语音] 🟢 实时监听 + 音量分析已启动');
    } catch (err) {
      window.game.addEventLog('[语音] 启动失败：' + err.message);
    }
  },

  /**
   * 停止
   */
  stop() {
    this._autoRestart = false;
    this.isListening = false;

    clearTimeout(this._restartTimeout);
    this._restartTimeout = null;
    if (this._watchdogInterval) {
      clearInterval(this._watchdogInterval);
      this._watchdogInterval = null;
    }
    this._rebuilding = false;

    if (this._recognition) {
      try { this._recognition.stop(); } catch (e) {}
      try { this._recognition.abort(); } catch (e) {}
      this._recognition = null;
    }

    this._stopSilenceCheck();
    this._stopVolumeAnalysis();
    this.interimText = '';
    this.lockedPeakVolume = 0.6;
    this._lastPeakAtSpeech = 0;
    this._updateUI();
    window.game.addEventLog('[语音] 已停止');
  },

  /**
   * 切换
   */
  toggle() {
    if (this.isListening) {
      this.stop();
    } else {
      this.start();
    }
  },

  /**
   * 重建语音识别器（onend 或严重错误时调用）
   * 完全重新创建 SpeechRecognition 实例，避免状态污染
   */
  /**
   * 启动看门狗：定期检查识别器是否还活着
   * 如果超过 15 秒没有 onresult 事件，强制重建
   */
  _startWatchdog() {
    this._lastResultTime = performance.now();
    if (this._watchdogInterval) clearInterval(this._watchdogInterval);
    this._watchdogInterval = setInterval(() => {
      if (!this.isListening) {
        clearInterval(this._watchdogInterval);
        this._watchdogInterval = null;
        return;
      }
      const elapsed = performance.now() - this._lastResultTime;
      if (elapsed > 8000) {
        console.log('[语音] 看门狗：15秒无识别结果，强制重建识别器');
        window.game.addEventLog('[语音] 看门狗触发，重建识别器');
        this._rebuildRecognition();
      }
    }, 5000);
  },

  _rebuildRecognition() {
    if (!this._autoRestart || !this.isListening) return;
    // 防止递归重入
    if (this._rebuilding) return;
    this._rebuilding = true;
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) return;

      // 清除旧实例
      if (this._recognition) {
        try { this._recognition.abort(); } catch (e) {}
        try { this._recognition.stop(); } catch (e) {}
        this._recognition = null;
      }

      // 重建新实例
      this._generation++;
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'zh-CN';
      rec.maxAlternatives = 1;

      // 恢复事件处理器
      var rebuildGen = this._generation;
      rec.onresult = (event) => {
        if (rebuildGen !== this._generation) return;
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
            this.interimText = result[0].transcript;  // also update interimText for silence timer
          } else {
            this.interimText = result[0].transcript;
          }
        }
        this._lastResultTime = performance.now();
                  // only restart silence timer if text actually changed
        // _lastResultTime already updated above, periodic check handles the rest
        this._updateUI();
        if (finalTranscript.trim()) {
          const text = finalTranscript.trim();
          // Just update peak volume, silence timer handles sending to LLM
          if (text) {
            this.lockedPeakVolume = Math.max(0.2, Math.min(1, this._lastPeakAtSpeech));
            this._lastPeakAtSpeech = 0;
            console.log("[volume] peak locked:", this.lockedPeakVolume.toFixed(2), "text:", text);
          }
        }
      };

      var rebuildGenErr = this._generation;
      rec.onerror = (event) => {
        if (rebuildGenErr !== this._generation) return;
        if (event.error !== 'no-speech') {
          window.game.addEventLog('[语音] 错误：' + event.error);
        }
        if (event.error === 'aborted' || event.error === 'language-not-supported' || event.error === 'service-not-allowed') {
          if (this._autoRestart && this.isListening) {
            clearTimeout(this._restartTimeout);
            this._rebuildRecognition();
          }
        } else {
          if (event.error !== 'no-speech') {
            this._rebuildRecognition();
          }
        }
      };

      var rebuildGenEnd = this._generation;
      rec.onend = () => {
        if (rebuildGenEnd !== this._generation) return;
        if (this._autoRestart && this.isListening) {
          clearTimeout(this._restartTimeout);
          this._rebuildRecognition();
        }
      };

      this._recognition = rec;
      rec.start();
      this._rebuilding = false;
      console.log('[语音] 识别器已重建并重新启动');
    } catch (err) {
      this._rebuilding = false;
      console.log('[语音] 重建识别器失败:', err.message);
      if (this._autoRestart && this.isListening) {
        clearTimeout(this._restartTimeout);
        this._restartTimeout = setTimeout(() => { if (this._autoRestart && this.isListening) this._rebuildRecognition(); }, 500);
      }
    }
  },

  /**
   * 更新 UI
   */

  _startSilenceCheck() {
    this._stopSilenceCheck();
    var self = this;
    this._checkInterval = setInterval(function() {
      var elapsed = performance.now() - self._lastResultTime;
      var text = self.interimText.trim();
      if (elapsed >= 300 && text && text !== self._lastSentText) {
        self._lastSentText = text;
        self.currentCommand = text;
        console.log("[voice] silence 1s detected, sending to LLM, text=" + text + " peak=" + self.lockedPeakVolume.toFixed(2));
        if (window.game.llmClient && typeof window.game.llmClient.sendCommand === 'function') {
          window.game.llmClient.sendCommand(text);
        }
      }
    }, 500);
  },

  _stopSilenceCheck() {
    if (this._checkInterval) {
      clearInterval(this._checkInterval);
      this._checkInterval = null;
    }
  },

  _clearSilenceTimer() {
    if (this._silenceTimer) {
      clearTimeout(this._silenceTimer);
      this._silenceTimer = null;
    }
  },

  /** Called by llmClient when command processing is complete */
  _onCommandComplete() {
    // 静默检测自己维护去重，这里覆盖会导致新指令在 interimText 中被误标记为"已发送"而永久丢失
    // this._lastSentText = this.interimText;  // 已移除——防指令丢失
    // this._silenceCheckText = this.interimText;  // 已移除——防指令丢失
    this.currentCommand = "";
    console.log("[voice] LLM done, ready for next command");
  },
  _updateUI() {
    if (typeof this.onInterimUpdate === 'function') {
      this.onInterimUpdate({
        isListening: this.isListening,
        interimText: this.interimText,
        currentCommand: this.currentCommand,
        volume: this.volume,
        peakVolume: this.lockedPeakVolume,
        volumeLevel: this.getVolumeLevel()
      });
    }
  }
};
