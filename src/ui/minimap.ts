import { bounds, type CampusMap, type MapPolygon } from '../world/campus-map.ts';

/** Cache the static map once; moving the player only crops this small image. */
export class Minimap {
  private readonly background = document.createElement('canvas');
  private readonly ctx: CanvasRenderingContext2D;
  private readonly scale = 1.5;
  private lastDraw = -Infinity;
  constructor(private readonly canvas: HTMLCanvasElement, map: CampusMap) {
    canvas.width = canvas.height = 384;
    this.ctx = canvas.getContext('2d')!;
    this.background.width = Math.ceil((bounds.maxX - bounds.minX) * this.scale);
    this.background.height = Math.ceil((bounds.maxZ - bounds.minZ) * this.scale);
    const c = this.background.getContext('2d')!;
    c.fillStyle = '#dfe6d1'; c.fillRect(0, 0, this.background.width, this.background.height);
    c.translate(-bounds.minX * this.scale, -bounds.minZ * this.scale); c.scale(this.scale, this.scale);
    const polygon = (p: MapPolygon, fill: string, stroke?: string) => {
      c.beginPath();
      for (const ring of [p.points, ...(p.holes ?? [])]) { ring.forEach(([x, z], i) => i ? c.lineTo(x, z) : c.moveTo(x, z)); c.closePath(); }
      c.fillStyle = fill; c.fill('evenodd');
      if (stroke) { c.strokeStyle = stroke; c.lineWidth = .6; c.stroke(); }
    };
    map.lawns.forEach(p => polygon(p, '#a6bd91'));
    map.roads.forEach(p => polygon(p, '#f8f4e8'));
    map.features.forEach(p => polygon(p, p.tags.leisure ? '#bfa58f' : '#91a49b', '#728c80'));
  }
  update(x: number, z: number, yaw: number, flying: boolean, now = performance.now()) {
    if (now - this.lastDraw < 80) return;
    this.lastDraw = now;
    const c = this.ctx, size = this.canvas.width, span = flying ? 270 : 170, sourceSize = span * this.scale;
    c.fillStyle = '#dfe6d1'; c.fillRect(0, 0, size, size);
    c.drawImage(this.background, (x - bounds.minX) * this.scale - sourceSize / 2, (z - bounds.minZ) * this.scale - sourceSize / 2, sourceSize, sourceSize, 0, 0, size, size);
    c.save(); c.translate(size / 2, size / 2); c.rotate(-yaw);
    c.fillStyle = '#bf563a'; c.strokeStyle = '#fffdf2'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(0, -17); c.lineTo(12, 12); c.lineTo(0, 7); c.lineTo(-12, 12); c.closePath(); c.fill(); c.stroke(); c.restore();
    c.fillStyle = '#274b3a'; c.font = 'bold 23px system-ui'; c.textAlign = 'center'; c.fillText('N ↑', size / 2, 32);
    const ruler = size * 50 / span;
    c.strokeStyle = '#274b3a'; c.lineWidth = 3; c.beginPath(); c.moveTo(22, size - 28); c.lineTo(22 + ruler, size - 28); c.stroke();
    c.font = '18px system-ui'; c.textAlign = 'left'; c.fillText('50 m', 22, size - 38);
  }
}
