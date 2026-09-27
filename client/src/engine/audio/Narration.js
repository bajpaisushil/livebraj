/**
 * Narration — reading a story card aloud.
 *
 * Uses the browser's own speech synthesis, which costs nothing, needs no
 * server, and on most phones works with the network off. The brief asked for an
 * optional "Listen" on each story; this is it, and it matters more than it
 * sounds: a lot of the people this is for would rather be told than read,
 * and some of them cannot read English comfortably at all.
 *
 * It picks an Indian English voice where the device has one, because a story
 * about Vrindavan read in an American accent lands wrong.
 */

const PREFERRED = [
  /en[-_]IN/i,            // Indian English, by far the best fit
  /hi[-_]IN/i,            // Hindi voice, which handles the Devanagari names
  /en[-_]GB/i,
  /en/i,
];

export class Narration {
  constructor(ctx) {
    this.ctx = ctx;
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.available = !!this.synth;
    this.speaking = false;
    this._voice = null;

    if (!this.available) {
      console.info('[narration] speech synthesis unavailable');
      return;
    }
    // voices load asynchronously on most browsers
    this._pickVoice();
    this.synth.addEventListener?.('voiceschanged', () => this._pickVoice());
  }

  _pickVoice() {
    let voices = [];
    try { voices = this.synth.getVoices() || []; } catch { return; }
    if (!voices.length) return;
    for (const pattern of PREFERRED) {
      const found = voices.find((v) => pattern.test(v.lang));
      if (found) { this._voice = found; break; }
    }
    if (!this._voice) this._voice = voices[0];
  }

  /**
   * Read a location's story. Returns true if it started.
   * Speech is deliberately slowed a little: this is not a news bulletin.
   */
  speak(loc, onEnd) {
    if (!this.available || !loc) return false;
    this.stop();

    const story = loc.story || {};
    const text = [
      loc.name,
      story.long || story.short || '',
    ].filter(Boolean).join('. ');

    if (!text.trim()) return false;

    const u = new SpeechSynthesisUtterance(text);
    if (this._voice) u.voice = this._voice;
    u.rate = 0.88;
    u.pitch = 1.0;
    u.volume = Math.max(0.15, this.ctx.state.settings.volume ?? 0.7);

    u.onend = () => { this.speaking = false; if (onEnd) onEnd(); };
    u.onerror = () => { this.speaking = false; if (onEnd) onEnd(); };

    try {
      this.synth.speak(u);
      this.speaking = true;
      // the ambient beds step back so the voice is clear
      if (this.ctx.audio && this.ctx.audio.duck) this.ctx.audio.duck(0.3, 1000);
      return true;
    } catch {
      this.speaking = false;
      return false;
    }
  }

  stop() {
    if (!this.available) return;
    try { this.synth.cancel(); } catch { /* ignore */ }
    this.speaking = false;
  }

  dispose() { this.stop(); }
}
