/**
 * Entry point. Boots the game and surfaces any failure to the player rather
 * than leaving them on a loading screen that never ends.
 */

import { GameApp } from './game/bootstrap/GameApp.js';

/**
 * ?reset — start clean.
 *
 * When something goes wrong on a device you cannot open a console on, the only
 * honest recovery is to throw away the saved document and start again. Adding
 * ?reset to the address does exactly that, before anything has a chance to read
 * it. It is deliberately the first thing this file does: if a stored document
 * is what stops the app opening, nothing later would get the chance to clear it.
 */
if (/[?&]reset\b/.test(window.location.search)) {
  try { window.localStorage.removeItem('vrindavan-dham.v1'); } catch { /* private mode */ }
  try {
    const cap = window.Capacitor;
    cap?.Plugins?.Preferences?.remove({ key: 'vrindavan-dham.v1' })?.catch?.(() => {});
  } catch { /* not running as an app */ }
  console.info('[vrindavan] saved data cleared by ?reset');
}

const app = new GameApp();
window.vrindavan = app;   // a handle for the console during development

app.boot().catch((err) => {
  console.error('[vrindavan] boot failed', err);
  // put the message where a phone can show it — a device with no console is
  // exactly where this matters
  try {
    const bar = document.createElement('div');
    bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9999;padding:12px 14px;'
      + 'background:#2b1d14;color:#f5e8c8;font:12px/1.5 system-ui,sans-serif;'
      + 'max-height:42vh;overflow:auto;white-space:pre-wrap';
    bar.textContent = String(err && (err.stack || err.message) || err)
      + '\n\nAdd ?reset to the address to clear saved data and start again.';
    document.body.appendChild(bar);
  } catch { /* nothing more we can do */ }
  const note = document.getElementById('load-note');
  const loading = document.getElementById('loading');
  if (note) {
    note.textContent = 'Could not open the Dham';
    note.style.color = '#c8452a';
    note.style.letterSpacing = '.06em';
    note.style.textTransform = 'none';
    const detail = document.createElement('div');
    detail.style.cssText = 'margin-top:12px;max-width:min(80vw,420px);font-size:11px;line-height:1.6;color:#8a7057;font-family:monospace;word-break:break-word';
    detail.textContent = String(err && err.message ? err.message : err);
    note.parentElement.appendChild(detail);
  }
  if (loading) loading.classList.remove('gone');
});
