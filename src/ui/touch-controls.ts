import type { Player } from '../player/controller.ts';
import type { WalkCamera } from '../player/camera.ts';

export const touchDevice = matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && innerWidth < 1100);

/** Independent captured pointers allow moving, looking and climbing at the same time. */
export class TouchControls {
  private active = false;
  private movePointer: number | null = null;
  private lookPointer: number | null = null;
  private lastLook = { x: 0, y: 0 };
  private running = false;
  private held = new Map<number, string>();
  private knob = document.getElementById('touch-knob')!;
  private stick = document.getElementById('touch-stick')!;
  private root = document.getElementById('touch-controls')!;
  constructor(private player: Player, camera: WalkCamera, canvas: HTMLCanvasElement) {
    if (!touchDevice) return;
    document.documentElement.classList.add('touch-device');
    const move = (e: PointerEvent) => {
      const r = this.stick.getBoundingClientRect(), radius = r.width * .34;
      let x = (e.clientX - r.left - r.width / 2) / radius, y = (e.clientY - r.top - r.height / 2) / radius;
      const length = Math.hypot(x, y); if (length > 1) { x /= length; y /= length; }
      this.player.moveInput.set(Math.abs(x) < .08 ? 0 : x, Math.abs(y) < .08 ? 0 : -y);
      this.knob.style.transform = `translate(${x * radius}px, ${y * radius}px)`;
    };
    this.stick.addEventListener('pointerdown', e => {
      if (!this.active || this.movePointer !== null) return;
      e.preventDefault(); this.movePointer = e.pointerId; this.stick.setPointerCapture(e.pointerId); move(e);
    });
    this.stick.addEventListener('pointermove', e => { if (e.pointerId === this.movePointer) { e.preventDefault(); move(e); } });
    const stopMove = (e: PointerEvent) => { if (e.pointerId === this.movePointer) { this.movePointer = null; this.player.moveInput.set(0, 0); this.knob.style.transform = ''; } };
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) this.stick.addEventListener(event, stopMove as EventListener);
    canvas.addEventListener('pointerdown', e => {
      if (!this.active || e.pointerType === 'mouse' || this.lookPointer !== null) return;
      e.preventDefault(); this.lookPointer = e.pointerId; this.lastLook = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', e => {
      if (!this.active || e.pointerId !== this.lookPointer) return;
      e.preventDefault(); camera.look((e.clientX - this.lastLook.x) * 1.5, (e.clientY - this.lastLook.y) * 1.5); this.lastLook = { x: e.clientX, y: e.clientY };
    });
    const stopLook = (e: PointerEvent) => { if (e.pointerId === this.lookPointer) this.lookPointer = null; };
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, stopLook as EventListener);
    this.root.querySelectorAll<HTMLButtonElement>('[data-hold-key]').forEach(button => {
      button.addEventListener('pointerdown', e => {
        if (!this.active) return; e.preventDefault(); button.setPointerCapture(e.pointerId);
        const key = button.dataset.holdKey!; this.held.set(e.pointerId, key); this.player.keys.add(key); button.classList.add('pressed');
      });
      const release = (e: PointerEvent) => { const key = this.held.get(e.pointerId); if (key) { this.held.delete(e.pointerId); this.player.keys.delete(key); button.classList.remove('pressed'); } };
      for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(event, release as EventListener);
    });
    document.getElementById('touch-run')!.onclick = () => { this.running = !this.running; if (this.running) this.player.keys.add('ShiftLeft'); else this.player.keys.delete('ShiftLeft'); document.getElementById('touch-run')!.setAttribute('aria-pressed', String(this.running)); };
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.releaseAll(); });
    window.addEventListener('blur', () => this.releaseAll());
  }
  private releaseAll() {
    this.player.clearInput(); this.movePointer = this.lookPointer = null; this.held.clear(); this.running = false; this.knob.style.transform = '';
    this.root.querySelectorAll('.pressed').forEach(b => b.classList.remove('pressed'));
    document.getElementById('touch-run')!.setAttribute('aria-pressed', 'false');
  }
  update(active: boolean, flying: boolean) {
    if (!touchDevice) return;
    if (this.active && !active) this.releaseAll(); this.active = active; this.root.hidden = !active;
    if(active&&this.running)this.player.keys.add('ShiftLeft');
    document.getElementById('touch-run')!.textContent=this.player.riding?'加速':'快走';
    document.getElementById('touch-altitude')!.hidden = !flying;
    document.getElementById('touch-fly')!.textContent = flying ? '降落' : '起飞';
  }
}
