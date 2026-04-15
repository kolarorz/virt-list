import { flushSync } from 'react-dom';

// ==========================================
//  flushSync 兼容
// ==========================================
export const flushSyncCompat: (callback: () => void) => void = (async () => {
  if (typeof flushSync === 'function') {
    return flushSync;
  }
  return (callback) => callback();
});
