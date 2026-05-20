export const buildPlayerVars = (startSeconds: number, muted = false) => ({
  autoplay: 1,
  controls: 1,
  disablekb: 0,
  fs: 1,
  modestbranding: 1,
  rel: 0,
  showinfo: 0,
  start: Math.floor(startSeconds),
  iv_load_policy: 3,
  ...(muted ? { mute: 1 } : {}),
});
