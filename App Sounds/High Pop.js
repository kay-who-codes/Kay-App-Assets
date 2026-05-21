function playTick(ctx, volume = 0.6) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(
    800, ctx.currentTime + 0.04
  );

  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    0.0001, ctx.currentTime + 0.04
  );

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.04);
}
