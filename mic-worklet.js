// AudioWorklet processador: captura áudio do microfone, converte para Int16 PCM,
// agrupa em chunks de ~100ms e envia para o thread principal com o RMS do chunk.
// O RMS alimenta o VAD (detecção de voz) que roda no thread principal.

class MicProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Chunks de ~100ms usando o sample rate real do AudioContext.
    // No iOS/Safari, pedir 16000 Hz pode resultar em 44100/48000 Hz.
    this.chunkSize = Math.max(1, Math.round(sampleRate / 10));
    this.buffer = new Int16Array(this.chunkSize);
    this.bufferIndex = 0;
    this.rmsSum = 0;
    this.rmsCount = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const channel = input[0];

    for (let i = 0; i < channel.length; i++) {
      // Converte Float32 [-1, 1] para Int16 PCM
      let s = Math.max(-1, Math.min(1, channel[i]));
      this.buffer[this.bufferIndex++] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      this.rmsSum += s * s;
      this.rmsCount++;

      if (this.bufferIndex >= this.chunkSize) {
        const rms = Math.sqrt(this.rmsSum / Math.max(1, this.rmsCount));
        // Envia uma cópia (transferable) junto com o RMS do chunk.
        const data = this.buffer.buffer.slice(0);
        this.port.postMessage({ type: 'audio', data, rms }, [data]);
        this.bufferIndex = 0;
        this.rmsSum = 0;
        this.rmsCount = 0;
      }
    }

    return true;
  }
}

registerProcessor('mic-processor', MicProcessor);
