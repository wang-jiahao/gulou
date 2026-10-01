type Track = { title: string; artist?: string; url: string };
export class Music {
  readonly audio = new Audio();
  tracks: Track[] = [];
  index = 0;
  volume = .28;
  enabled = true;
  started = false;
  onChange = () => {};
  onError: (message: string) => void = () => {};
  private objectUrls: string[] = [];
  private shuffleBag: number[] = [];
  private lastPlayed: number | null = null;
  constructor() {
    this.audio.preload = 'metadata';
    this.audio.addEventListener('ended', () => this.next());
    this.audio.addEventListener('error', () => { this.onError('这首音乐暂时无法播放，可以切换下一首或导入音乐。'); this.onChange(); });
  }
  async load() {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}data/music.json`);
      if (response.ok) {
        const data = await response.json();
        this.tracks = (data.tracks ?? []).filter((t: Track) => typeof t.title === 'string' && typeof t.url === 'string');
      }
    } catch { /* Music is optional; local file import remains available. */ }
    this.onChange();
    this.shuffleBag = []; this.lastPlayed = null;
    if (this.started) this.next();
  }
  start() { this.started = true; if (!this.audio.src && this.tracks.length) this.next(); else this.play(); }
  private play() {
    if (!this.enabled || !this.started || !this.tracks.length) return;
    this.audio.volume = this.volume;
    void this.audio.play().then(() => this.onChange()).catch(() => { this.onError('点击音乐播放按钮即可继续播放。'); this.onChange(); });
  }
  select(index: number) {
    if (!this.tracks.length) return;
    this.index = ((index % this.tracks.length) + this.tracks.length) % this.tracks.length;
    this.lastPlayed = this.index;
    this.shuffleBag = this.shuffleBag.filter(i => i !== this.index);
    this.audio.src = this.tracks[this.index].url; this.play(); this.onChange();
  }
  next() {
    if (!this.tracks.length) return;
    if (!this.shuffleBag.length) {
      this.shuffleBag = this.tracks.map((_, i) => i);
      for (let i = this.shuffleBag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.shuffleBag[i], this.shuffleBag[j]] = [this.shuffleBag[j], this.shuffleBag[i]];
      }
      const last = this.shuffleBag.length - 1;
      if (last > 0 && this.shuffleBag[last] === this.lastPlayed) [this.shuffleBag[0], this.shuffleBag[last]] = [this.shuffleBag[last], this.shuffleBag[0]];
    }
    this.select(this.shuffleBag.pop()!);
  }
  toggle() { this.enabled = !this.enabled; if (this.enabled) this.start(); else this.audio.pause(); this.onChange(); }
  setVolume(value: number) { this.volume = Math.max(0, Math.min(1, value)); this.audio.volume = this.volume; }
  import(files: File[]) {
    const accepted = files.filter(f => f.type.startsWith('audio/') || /\.(mp3|ogg|wav|m4a|flac)$/i.test(f.name));
    if (!accepted.length) { this.onError('请选择音频文件，例如 MP3、OGG 或 WAV。'); return; }
    this.audio.pause(); this.audio.removeAttribute('src'); this.audio.load();
    this.objectUrls.forEach(url => URL.revokeObjectURL(url)); this.objectUrls = [];
    this.tracks = accepted.map(file => { const url = URL.createObjectURL(file); this.objectUrls.push(url); return { title: file.name.replace(/\.[^.]+$/, ''), url }; });
    this.shuffleBag = []; this.lastPlayed = null;
    this.enabled = this.started = true; this.next();
  }
  get snapshot() { return { order: 'shuffle', tracks: this.tracks.length, title: this.tracks[this.index]?.title ?? '', enabled: this.enabled, paused: this.audio.paused, volume: this.volume, currentTime: this.audio.currentTime }; }
}
