/* ============================================================
 * LLM 客户端模块 -- 接入大模型驱动 AI 队友动作
 *
 * 支持 OpenAI 兼容 API（可自定义 endpoint + model）
 * 接收语音转文字结果，发送给 LLM，解析返回的结构化动作指令
 *
 * 挂载点：window.game.llmClient
 * 依赖：无
 * ============================================================ */

window.game.llmClient = {
  apiKey: '',
  endpoint: 'https://api.deepseek.com/chat/completions',
  model: 'deepseek-chat',
  connected: false,
  lastRawResponse: '',
  lastAction: null,
  lastTranscript: '',
  _isProcessing: false,
  _onComplete: null,
  _isTesting: false,
  _pendingTranscript: '',

  // 系统提示词（精简版）
  _systemPrompt: [
    '2D平台跳跃游戏，800x600。你是AI队友。根据语音指令选一个动作返回JSON，不要多余文字。',
    '可用动作：move_left, move_right, jump, crouch, stop, move_left_jump, move_right_jump, jump_over',
    '{"action":"动作","reason":"中文原因"}'
  ].join('\n'),

  setApiKey(key) { this.apiKey = (key || "").trim(); },

  setEndpoint(endpoint, model) {
    if (endpoint) {
      this.endpoint = (endpoint || "").trim();
      if (!this.endpoint.startsWith('http://') && !this.endpoint.startsWith('https://')) {
        this.endpoint = 'https://' + this.endpoint;
      }
    }
    if (model) this.model = (model || "").trim();
  },

  async testConnection() {
    if (!this.apiKey) {
      window.game.addEventLog('[LLM] 错误：未设置 API 密钥');
      return { ok: false, error: 'API Key 未设置' };
    }
    console.log('[LLM] testConnection 开始, endpoint:', this.endpoint, 'model:', this.model);
    this._isTesting = true;
    try {
      let url = this.endpoint;
      if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
        url = 'https://api.deepseek.com/chat/completions';
        console.warn('[LLM] 端点 URL 无效，使用默认值:', url);
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(function() { controller.abort(); }, 10000);
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + this.apiKey
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: '你是一个游戏AI助手。请回复一个简短的确认消息。' },
            { role: 'user', content: '回复"连接成功"四个字' }
          ],
          max_tokens: 20,
          temperature: 0.1,
          stream: false
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      console.log('[LLM] 响应状态:', resp.status, resp.statusText);
      if (!resp.ok) {
        let errBody = '';
        try { errBody = await resp.text(); } catch(e) {}
        console.error('[LLM] HTTP 错误:', resp.status, errBody.slice(0, 300));
        window.game.addEventLog('[LLM] 连接失败：HTTP ' + resp.status + ' ' + resp.statusText);
        this.connected = false;
        this._isTesting = false;
        return { ok: false, error: 'HTTP ' + resp.status + ': ' + (errBody.slice(0, 150) || resp.statusText) };
      }
      const data = await resp.json();
      console.log('[LLM] 连接测试成功:', data.choices ? data.choices[0].message.content : '(no choices)');
      this.connected = true;
      window.game.addEventLog('[LLM] 连接成功！模型：' + this.model);
      this._isTesting = false;
      return { ok: true };
    } catch (err) {
      console.error('[LLM] fetch 异常:', err.name, err.message);
      window.game.addEventLog('[LLM] 连接失败：' + err.message);
      this.connected = false;
      this._isTesting = false;
      return { ok: false, error: err.message };
    }
  },

  async sendCommand(transcript) {
    // 并发保护：忙时缓存指令，不丢弃
    if (this._isProcessing) {
      if (transcript && transcript.trim()) {
        this._pendingTranscript = transcript;
        console.log('[LLM] 忙，已缓存指令:', transcript);
      }
      return null;
    }
    if (!this.apiKey) {
      window.game.addEventLog('[LLM] 请先设置 API 密钥');
      return null;
    }
    if (!transcript || transcript.trim() === '') return null;

    this.lastTranscript = transcript;
    this._isProcessing = true;
    console.log('[LLM] sendCommand:', transcript);
    window.game.addEventLog('[语音] 识别：' + transcript);

    try {
      var fetchUrl = this.endpoint;
      if (!fetchUrl || (!fetchUrl.startsWith("http://") && !fetchUrl.startsWith("https://"))) {
        fetchUrl = "https://api.deepseek.com/chat/completions";
        console.warn("[LLM] sendCommand: invalid endpoint, using default:", fetchUrl);
      }
      if (!this.apiKey) {
        window.game.addEventLog("[LLM] API Key 为空");
        this.notifyComplete();
        return { action: "stop", reason: "API Key 为空" };
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(function() { controller.abort(); }, 8000);
      const resp = await fetch(fetchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + this.apiKey
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: this._systemPrompt },
            { role: 'user', content: '玩家的语音指令是："' + transcript + '"' }
          ],
          max_tokens: 100,
          temperature: 0.3,
          stream: true
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!resp.ok) {
        let errBody = '';
        try { errBody = await resp.text(); } catch(e) {}
        console.error('[LLM] sendCommand HTTP错误:', resp.status, errBody.slice(0, 200));
        window.game.addEventLog('[LLM] API 错误：HTTP ' + resp.status);
        this.notifyComplete();
        if (window.game.aiPlayer && typeof window.game.aiPlayer.setExternalCommand === 'function') {
          window.game.aiPlayer.setExternalCommand('stop');
        }
        return { action: 'stop', reason: 'API 错误' };
      }

      // --- 流式 SSE 解析 ---
      var fullContent = '';
      var reader = resp.body.getReader();
      var decoder = new TextDecoder();
      var buffer = '';
      while (true) {
        var readResult = await reader.read();
        if (readResult.done) break;
        buffer += decoder.decode(readResult.value, { stream: true });
        var lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i];
          if (line.startsWith('data: ')) {
            var data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              var chunk = JSON.parse(data);
              var delta = chunk.choices && chunk.choices[0] && chunk.choices[0].delta
                ? chunk.choices[0].delta.content || '' : '';
              if (delta) fullContent += delta;
            } catch (e) {}
          }
        }
      }
      this.lastRawResponse = fullContent;
      console.log('[LLM] 流式响应完成, 内容:', fullContent.slice(0, 200));

      let parsed = null;
      try {
        parsed = JSON.parse(fullContent);
      } catch (e) {
        const jsonMatch = fullContent.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
        if (jsonMatch) {
          try { parsed = JSON.parse(jsonMatch[1]); } catch (e2) {}
        }
      }

      if (parsed && parsed.action) {
        this.lastAction = parsed;
        console.log('[LLM] 解析动作:', parsed.action, parsed.reason || '');
        window.game.addEventLog('[LLM] 动作：' + parsed.action + '（' + (parsed.reason || '无说明') + '）');
        if (window.game.aiPlayer && typeof window.game.aiPlayer.setExternalCommand === 'function') {
          window.game.aiPlayer.setExternalCommand(parsed.action);
        }
        this.notifyComplete();
        return parsed;
      } else {
        console.warn('[LLM] 无法解析响应:', fullContent.slice(0, 100));
        window.game.addEventLog('[LLM] 无法解析响应');
        this.notifyComplete();
        if (window.game.aiPlayer && typeof window.game.aiPlayer.setExternalCommand === 'function') {
          window.game.aiPlayer.setExternalCommand('stop');
        }
        return { action: 'stop', reason: '解析失败' };
      }
    } catch (err) {
      console.error('[LLM] 请求异常:', err.name, err.message);
      window.game.addEventLog('[LLM] 请求异常：' + err.message);
      this.notifyComplete();
      if (window.game.aiPlayer && typeof window.game.aiPlayer.setExternalCommand === 'function') {
        window.game.aiPlayer.setExternalCommand('stop');
      }
      return { action: 'stop', reason: '网络错误' };
    }
  },
  notifyComplete() {
    this._isProcessing = false;
    if (window.game.voiceControl && typeof window.game.voiceControl._onCommandComplete === 'function') {
      window.game.voiceControl._onCommandComplete();
    }
    // 检查缓存指令，有则自动发送
    if (this._pendingTranscript) {
      var pending = this._pendingTranscript;
      this._pendingTranscript = '';
      console.log('[LLM] 发送缓存指令:', pending);
      this.sendCommand(pending);
    }
  },
};
