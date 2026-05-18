// AudioWorklet processador: captura áudio do microfone, converte para Int16 PCM,
// agrupa em chunks e envia para o thread principal a cada ~100ms.

class MicProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // 16000 Hz * 0.1 s = 1600 amostras por chunk (~100ms)
    this.chunkSize = 1600;
    this.buffer = new Int16Array(this.chunkSize);
    this.bufferIndex = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const channel = input[0];

    for (let i = 0; i < channel.length; i++) {
      // Converte Float32 [-1, 1] para Int16 PCM
      let s = Math.max(-1, Math.min(1, channel[i]));
      this.buffer[this.bufferIndex++] = s < 0 ? s * 0x8000 : s * 0x7FFF;

      if (this.bufferIndex >= this.chunkSize) {
        // Envia uma cópia (transferable) para o thread principal
        this.port.postMessage(this.buffer.buffer.slice(0));
        this.bufferIndex = 0;
      }
    }

    return true;
  }
}

registerProcessor('mic-processor', MicProcessor);
