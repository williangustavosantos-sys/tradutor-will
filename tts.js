// ============================================================
// TextToSpeechProvider — interface de voz do Tradutor Will.
// ============================================================
// Hoje a implementação padrão é o SpeechSynthesis do navegador
// (zero custo, zero chamada de rede). A interface é um contrato
// estável para que, no futuro, troquemos por Google Cloud Text-to-Speech
// chamando o backend (o backend é quem guardaria a chave da API).
//
// Contrato:
//   supported()            -> boolean
//   speak(text, opts)      -> Promise (resolve no fim do áudio ou erro)
//       opts: { lang, rate, pitch, onend, onerror }
//   cancel()               -> void
//
// Para um provedor Google Cloud TTS futuro, basta criar um objeto com a
// MESMA interface que chame POST /api/tts no backend e retorne um áudio.
// ============================================================
(function () {
  'use strict';

  function isSupported() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  function pickVoice(langId) {
    if (!isSupported()) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;
    const wanted =
      langId === 'pt-BR' ? ['pt-BR', 'pt-PT', 'pt'] :
      langId === 'en-GB' ? ['en-GB', 'en-AU', 'en-IE'] :
      ['en-US', 'en'];
    for (const prefix of wanted) {
      const match = voices.find((v) =>
        (v.lang || '').toLowerCase().startsWith(prefix.toLowerCase())
      );
      if (match) return match;
    }
    return voices.find((v) => v.default) || voices[0] || null;
  }

  const provider = {
    name: 'SpeechSynthesis',

    supported: isSupported,

    speak(text, opts) {
      const options = opts || {};
      return new Promise((resolve) => {
        if (!isSupported() || !text) {
          if (options.onend) options.onend();
          resolve();
          return;
        }

        // O Safari às vezes só descobre as vozes após este evento.
        if (!window.speechSynthesis.getVoices().length) {
          window.speechSynthesis.addEventListener('voiceschanged', function once() {
            window.speechSynthesis.removeEventListener('voiceschanged', once);
            doSpeak();
          }, { once: true });
          // Se as vozes nunca chegarem, fala mesmo assim.
          setTimeout(doSpeak, 400);
        } else {
          doSpeak();
        }

        function doSpeak() {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = options.lang || 'en-GB';
          utterance.rate = options.rate || 1;
          utterance.pitch = options.pitch || 1;
          const voice = pickVoice(utterance.lang);
          if (voice) utterance.voice = voice;

          let done = false;
          const finish = () => {
            if (done) return;
            done = true;
            if (options.onend) options.onend();
            resolve();
          };
          utterance.onend = finish;
          utterance.onerror = finish;

          // Interrompe qualquer fala anterior antes de começar a nova
          // (o app é half-duplex: uma fala da aplicação por vez).
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
        }
      });
    },

    cancel() {
      if (isSupported()) {
        try { window.speechSynthesis.cancel(); } catch (_) { /* ignore */ }
      }
    },
  };

  window.TextToSpeechProvider = provider;
})();
