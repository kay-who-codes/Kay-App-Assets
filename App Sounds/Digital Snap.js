function playSnap(ctx, volume = 1.8) {
  const bufSize = Math.floor(ctx.sampleRate * 0.03);
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);

  for (let i = 0; i < bufSize; i++) {
    const attack = bufSize * 0.1;
    const env = i < attack
      ? i / attack
      : Math.pow(1 - (i - attack) / (bufSize - attack), 2);
    data[i] = (Math.random() * 2 - 1) * env;
  }

  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  filter.type = 'highpass';
  filter.frequency.value = 1800;

  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  src.buffer = buf;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    0.0001, ctx.currentTime + 0.03
  );
  src.start(ctx.currentTime);
}
