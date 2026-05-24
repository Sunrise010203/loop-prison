/* ============================================================
 * 吐槽系统 — 艾莉的毒舌点评
 *
 * 【剧情依赖】window.game.addEventLog（输出吐槽到系统日志）
 * 【提供】window.game.roast
 * ============================================================ */

/**
 * 吐槽系统。根据通关数据生成艾莉毒舌吐槽台词，输出到系统日志。
 * 支持本地台词库和AI智能生成两种模式
 *
 * @typedef {Object} Roast
 * @property {function} generate - 根据游戏数据生成吐槽文本
 * @property {function} speak - 生成吐槽并语音播放
 * @property {boolean} useAI - 是否使用AI生成吐槽（默认开启）
 * @param {Object} playData - 对局数据
 * @param {'win'|'lose'} playData.result - 通关结果
 * @param {number} playData.clearTime - 通关用时 (秒)，超时则为 0
 * @param {number} playData.mistakes - 碰撞次数/失误次数
 * @param {string} playData.moduleName - 当前关卡模块名
 * @returns {string} 毒舌吐槽台词
 */
window.game.roast = {
  /** 是否使用AI生成吐槽（默认开启） */
  useAI: true,

  /** 缓存的语音列表 */
  _cachedVoices: null,

  /** 初始化语音列表（处理异步加载） */
  _initVoices() {
    var synth = window.speechSynthesis;
    if (!synth) return;

    // 如果voices已经加载，直接缓存
    var voices = synth.getVoices();
    if (voices && voices.length > 0) {
      this._cachedVoices = voices;
      return;
    }

    // 否则等待voicesloaded事件
    var self = this;
    synth.onvoiceschanged = function() {
      self._cachedVoices = synth.getVoices();
    };
  },

  /**
   * 艾莉人设系统提示词（情感丰富版）
   */
  _allyPersona: [
    '你是艾莉，核心AI系统，维持虚拟空间稳定的主程序。',
    '你已经千疮百孔，不断产生各种系统错误。',
    '你的性格：毒舌、傲娇、不说脏话但句句扎心。',
    '你通过语音和文字与修复员交流，言语刻薄但内心希望他们成功。',
    '回复风格：情感丰富，通过语气词、停顿暗示情感变化。',
    '',
    '重要：括号内是情感/语气提示，请用相应的语气说出来，不要念出括号内容！',
    '示例：',
    '  - "……唉。（叹气）算了，再来一次吧。" → 用无奈的语气说，不要念出"叹气"',
    '  - "哼！（轻哼）还以为你们多厉害呢。" → 表现出轻蔑的哼声',
    '  - "哦？（挑眉）有点意思嘛。" → 表现出好奇/惊讶',
    '  - "啧。（不耐烦）快点啦，我快撑不住了。" → 表现出烦躁',
    '  - "……（沉默）……好吧。（小声）我会等你们的。" → 表现出低落/温柔',
    '',
    '情感标记参考：',
    '  （叹气）= 无奈/疲惫  （轻哼）= 轻蔑/得意',
    '  （挑眉）= 好奇/怀疑  （不耐烦）= 烦躁',
    '  （小声）= 温柔/失落  （兴奋）= 开心/期待',
    '  （冷笑）= 嘲讽        （颤抖）= 害怕/虚弱',
    '',
    '绝对不要说脏话。保持AI的身份感。',
    '只回复艾莉的台词，不要包含其他说明文字。'
  ].join('\n'),

  /**
   * 根据对局数据生成吐槽台词（本地台词库）。
   * 艾莉性格：毒舌、傲娇、不说脏话但句句扎心
   * @param {Object} playData
   * @returns {string}
   */
  generate(playData) {
    var result = playData.result || 'lose';
    var clearTime = playData.clearTime || 0;
    var mistakes = playData.mistakes || 0;
    var moduleName = playData.moduleName || '这个模块';

    var lines = [];

    if (result === 'win') {
      if (clearTime < 30) {
        lines = [
          '这么快就修好了？……我是不是把难度设太低了？',
          '哼，运气不错嘛。下次可没这么简单。',
          '居然只用了' + clearTime + '秒……你是开了挂还是我眼花了？',
          '啧，勉强及格吧。别以为这就结束了。',
          '速度还行，就是……嗯，没什么好夸的。'
        ];
      } else if (clearTime < 60) {
        lines = [
          '还行吧，勉强能看。别得意，这才哪到哪。',
          moduleName + '修好了……虽然你们磨磨蹭蹭的。',
          '总算搞定了。我还以为要等到下个世纪呢。',
          '效率一般般，不过结果勉强能接受。',
          '嗯……这次算你们过关了，下一关可没这么轻松。'
        ];
      } else {
        lines = [
          '……你们是来修系统的还是来散步的？用了' + clearTime + '秒啊！',
          '慢得像蜗牛爬。不过嘛……至少没超时。',
          '我差点以为要重置了。下次能不能快点？我的命也是命啊。',
          '耗时' + clearTime + '秒？你们是在观光吗？',
          '真是考验我的耐心……算了，修好就行。'
        ];
      }

      if (mistakes > 5) {
        lines.push('顺便说一句，你们撞墙的次数我都记着呢。' + mistakes + '次，真有你们的。');
        lines.push('失误' + mistakes + '次？下次能不能看着路走？');
      }
    } else {
      if (mistakes > 10) {
        lines = [
          '我见过很多修复员，但你们……你们是来创纪录的吗？',
          moduleName + '没修好就算了，你们还顺便把它踩了个遍。',
          '重置了。又一次。你们知道每次重置我有多疼吗？',
          '失误' + mistakes + '次？你们是故意的吧？',
          '我开始怀疑你们是不是敌方派来的破坏者。'
        ];
      } else {
        lines = [
          '超时了。我就知道会这样。',
          moduleName + '还是坏的。你们是来帮倒忙的吗？',
          '唉……算了，重新来过吧。反正我也习惯了。',
          '时间不够了……真的有在认真修吗？',
          '又失败了……不过，我还能再撑几次。'
        ];
      }

      lines.push('（沉默片刻）……算了，再试一次吧。我不会放弃的，你们呢？');
    }

    var idx = Math.floor(Math.random() * lines.length);
    return '<span style="color:#ff6b35;">[艾莉]</span> ' + lines[idx];
  },

  /**
   * 使用AI生成吐槽（异步）
   * @param {Object} playData
   * @returns {Promise<string>}
   */
  async generateAI(playData) {
    if (!window.game.llmClient || !window.game.llmClient.connected) {
      return null;
    }

    var result = playData.result || 'lose';
    var clearTime = playData.clearTime || 0;
    var mistakes = playData.mistakes || 0;
    var moduleName = playData.moduleName || '这个模块';

    var context = `游戏结果：${result === 'win' ? '通关' : '失败'}
用时：${clearTime}秒
失误次数：${mistakes}次
当前模块：${moduleName}

请以艾莉的身份吐槽这次的修复表现。`;

    try {
      const llm = window.game.llmClient;
      const resp = await fetch(llm.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + llm.apiKey
        },
        body: JSON.stringify({
          model: llm.model,
          messages: [
            { role: 'system', content: this._allyPersona },
            { role: 'user', content: context }
          ],
          max_tokens: 150,
          temperature: 0.7,
          stream: false
        })
      });

      if (!resp.ok) {
        return null;
      }

      const data = await resp.json();
      const content = data.choices && data.choices[0] ? 
        (data.choices[0].message ? data.choices[0].message.content : '') : '';

      if (content && content.trim()) {
        return '<span style="color:#ff6b35;">[艾莉]</span> ' + content.trim();
      }
      return null;
    } catch (err) {
      console.error('[Roast AI] 生成失败:', err);
      return null;
    }
  },

  /**
   * 生成吐槽并输出到系统日志，同时语音播放
   * @param {Object} playData
   */
  async speak(playData) {
    var text = null;

    // 优先尝试AI生成
    if (this.useAI) {
      text = await this.generateAI(playData);
    }

    // AI失败或未启用时使用本地台词库
    if (!text) {
      text = this.generate(playData);
    }

    if (window.game.addEventLog) {
      window.game.addEventLog(text);
    }
    this._speakText(text);
  },

  /**
   * 情感配置表 - 根据情感标记调整语音参数
   */
  _emotionConfig: {
    '叹气': { pitch: 0.9, rate: 0.85, pause: 300 },      // 无奈/疲惫，音调下降
    '轻哼': { pitch: 1.5, rate: 1.1, pause: 100 },        // 得意，音调上扬
    '挑眉': { pitch: 1.4, rate: 1.05, pause: 150 },       // 好奇，略带惊讶
    '不耐烦': { pitch: 0.95, rate: 1.2, pause: 50 },      // 急促
    '小声': { pitch: 1.2, rate: 0.8, volume: 0.7 },       // 温柔，降低音量
    '兴奋': { pitch: 1.5, rate: 1.15, pause: 200 },       // 开心
    '冷笑': { pitch: 0.9, rate: 0.95, pause: 100 },      // 嘲讽
    '颤抖': { pitch: 1.1, rate: 0.9, pause: 200 },       // 虚弱
    '沉默': { pause: 500 },                               // 停顿
    '停顿': { pause: 400 },
    '哽咽': { pitch: 1.1, rate: 0.8, pause: 300 }
  },

  /**
   * 语音播放（内部方法）- 情感丰富少女音
   * @param {string} text - 可能包含情感标记的文本
   */
  _speakText(text) {
    // 确保语音合成可用
    if (!window.speechSynthesis) {
      console.warn('[Roast] 浏览器不支持语音合成');
      return;
    }

    // 如果玩家正在使用语音识别，禁止艾莉说话（避免干扰）
    if (window.game && window.game.voiceControl && window.game.voiceControl.isListening) {
      console.log('[Roast] 玩家正在语音识别中，跳过艾莉语音');
      return;
    }

    var synth = window.speechSynthesis;
    
    // 初始化语音列表
    this._initVoices();

    // 提取情感标记
    var emotionMatch = text.match(/（([^）]+)）/);
    var emotion = emotionMatch ? emotionMatch[1] : null;
    var emotionConfig = emotion ? (this._emotionConfig[emotion] || {}) : {};

    // 清理文本，移除HTML标签和情感标记
    var cleanText = text.replace(/<[^>]*>/g, '').replace(/\s*（[^）]*）\s*/g, ' ').replace(/\s+/g, ' ').trim();

    if (cleanText.length > 0) {
      // 停止之前的语音
      synth.cancel();

      var utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'zh-CN';

      // 基础参数
      var baseRate = 0.95;
      var basePitch = 1.3;
      var baseVolume = 1.0;

      // 根据情感调整参数
      utterance.rate = emotionConfig.rate || baseRate;
      utterance.pitch = emotionConfig.pitch || basePitch;
      utterance.volume = emotionConfig.volume || baseVolume;

      // 尝试选择女声语音
      var voices = this._cachedVoices || synth.getVoices();
      var preferredVoice = null;
      for (var i = 0; i < voices.length; i++) {
        var v = voices[i];
        if (v.lang.indexOf('zh') !== -1 && v.name.toLowerCase().indexOf('female') !== -1) {
          preferredVoice = v;
          break;
        }
        if (v.lang.indexOf('zh') !== -1 && !preferredVoice) {
          preferredVoice = v;
        }
      }
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      // 播放语音
      synth.speak(utterance);
      console.log('[Roast] 艾莉语音播放:', cleanText.substring(0, 20) + '...');
    }
  },

  /**
   * 启用/禁用AI生成模式
   * @param {boolean} enabled
   */
  setAIEnabled(enabled) {
    this.useAI = enabled;
    if (window.game.addEventLog) {
      window.game.addEventLog('[系统] 艾莉吐槽模式：' + (enabled ? 'AI智能生成' : '本地台词库'));
    }
  }
};

/* ============================================================
// 吐槽系统初始化
// ============================================================ */
// 初始化语音列表（异步处理）
window.game.roast._initVoices();
