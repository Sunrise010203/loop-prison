h = open("E:/loop-prison/index.html", "r", encoding="utf-8").read()

# 1. Add volume indicator line
old1 = '<span id="voice-interim" class="voice-interim">🎤 等待语音指令...</span>'
new1 = '<span id="voice-interim" class="voice-interim">🎤 等待语音指令...</span>\n      <div class="llm-row llm-row-info">\n        <span id="volume-indicator" class="volume-indicator">🔇 音量：--</span>\n      </div>'
h = h.replace(old1, new1)

# 2. Update onInterimUpdate callback to include volume
old2 = """          window.game.voiceControl.onInterimUpdate = function(state) {
            if (state.isListening) {
              if (state.interimText) {
                voiceInterim.textContent = '🎤 ' + state.interimText;
                voiceInterim.className = 'voice-interim voice-interim-listening';
              } else {
                voiceInterim.textContent = '🎤 正在聆听...';
                voiceInterim.className = 'voice-interim voice-interim-listening';
              }
            } else {
              voiceInterim.textContent = '🎤 语音待命';
              voiceInterim.className = 'voice-interim';
            }
          };"""

new2 = """          window.game.voiceControl.onInterimUpdate = function(state) {
            var volEl = document.getElementById('volume-indicator');
            if (state.isListening) {
              if (state.interimText) {
                voiceInterim.textContent = '🎤 ' + state.interimText;
                voiceInterim.className = 'voice-interim voice-interim-listening';
              } else {
                voiceInterim.textContent = '🎤 正在聆听...';
                voiceInterim.className = 'voice-interim voice-interim-listening';
              }
              if (volEl) {
                var vol = state.volume || 0;
                var bars = Math.round(vol * 10);
                var barStr = '';
                for (var i = 0; i < Math.max(1, Math.min(10, bars)); i++) { barStr += '█'; }
                var icon = vol < 0.1 ? '🔇' : vol < 0.3 ? '🔈' : vol < 0.6 ? '🔉' : '🔊';
                volEl.textContent = icon + ' 音量：' + barStr + ' (' + state.volumeLevel + ')';
                volEl.className = vol > 0.6 ? 'volume-indicator volume-loud' : 'volume-indicator';
              }
            } else {
              voiceInterim.textContent = '🎤 语音待命';
              voiceInterim.className = 'voice-interim';
              if (volEl) { volEl.textContent = '🔇 音量：--'; volEl.className = 'volume-indicator'; }
            }
          };"""

h = h.replace(old2, new2)
open("E:/loop-prison/index.html", "w", encoding="utf-8").write(h)
print("HTML updated")