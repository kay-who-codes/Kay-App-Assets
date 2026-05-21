function playClack(ctx, volume = 1.2) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const bufSize = Math.floor(ctx.sampleRate * 0.015);
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);

  for (let i = 0; i < bufSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
  }

  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  filter.type = 'bandpass';
  filter.frequency.value = 3000;
  filter.Q.value = 0.8;

  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  src.buffer = buf;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  src.start(ctx.currentTime);
}
