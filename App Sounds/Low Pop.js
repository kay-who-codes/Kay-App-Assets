function playPop(ctx, volume = 0.7) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(
    80, ctx.currentTime + 0.08
  );

  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(
    volume, ctx.currentTime + 0.005
  );
  gain.gain.exponentialRampToValueAtTime(
    0.0001, ctx.currentTime + 0.08
  );

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.08);
}
