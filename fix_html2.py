h = open("E:/loop-prison/index.html", "r", encoding="utf-8").read()

# Update the callback to also show peak volume
old_cb = """          window.game.voiceControl.onInterimUpdate = function(state) {
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

new_cb = """          window.game.voiceControl.onInterimUpdate = function(state) {
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
                var peak = state.peakVolume || 0;
                var bars = Math.round(vol * 10);
                var peakBars = Math.round(peak * 10);
                var barStr = '';
                for (var i = 0; i < Math.max(1, Math.min(10, bars)); i++) { barStr += '█'; }
                var peakStr = '';
                for (var i = 0; i < Math.max(0, Math.min(10, peakBars)); i++) { peakStr += '▓'; }
                var icon = peak < 0.1 ? '🔇' : peak < 0.3 ? '🔈' : peak < 0.6 ? '🔉' : '🔊';
                volEl.textContent = icon + ' ' + barStr + ' | ' + peakStr + ' (' + state.volumeLevel + ', peak:' + peak.toFixed(2) + ')';
                volEl.className = peak > 0.6 ? 'volume-indicator volume-loud' : 'volume-indicator';
              }
            } else {
              voiceInterim.textContent = '🎤 语音待命';
              voiceInterim.className = 'voice-interim';
              if (volEl) { volEl.textContent = '🔇 音量：--'; volEl.className = 'volume-indicator'; }
            }
          };"""

h = h.replace(old_cb, new_cb)
open("E:/loop-prison/index.html", "w", encoding="utf-8").write(h)
print("HTML updated with peak volume display")