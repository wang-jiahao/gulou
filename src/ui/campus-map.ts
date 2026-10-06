import {featureCenter, extraPlaces} from '../world/place-index.ts';
import type { CampusMap, MapPolygon } from '../world/campus-map.ts';
import { bounds, insidePolygon } from '../world/campus-map.ts';

export class CampusMapView {
  onSelect: (x: number, z: number, name: string) => void = () => {};
  onClear: () => void = () => {};
  private destination: [number, number] | null = null;
  private playerPoint: [number, number] = [0, 0];
  private ctx: CanvasRenderingContext2D;
  private region = { ...bounds };
  private size = { scale: 1, x: 0, z: 0 };
  private background = document.createElement('canvas');
  constructor(private canvas: HTMLCanvasElement, private map: CampusMap, private selection: HTMLElement) {
    canvas.width = 1000; canvas.height = 740; this.background.width = 1000; this.background.height = 740;
    this.ctx = canvas.getContext('2d')!; this.setRegion('core');
    canvas.addEventListener('click', event => {
      const rect = canvas.getBoundingClientRect(), px = (event.clientX - rect.left) / rect.width * canvas.width, py = (event.clientY - rect.top) / rect.height * canvas.height;
      const x = (px - this.size.x) / this.size.scale, z = (py - this.size.z) / this.size.scale;
      if (x < bounds.minX || x > bounds.maxX || z < bounds.minZ || z > bounds.maxZ) return;
      this.selectPoint(x, z);
    });
    canvas.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const directions: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      const direction = directions[event.key];
      if (!direction && event.key !== 'Home') return;
      event.preventDefault();
      const origin = event.key === 'Home' ? this.playerPoint : this.destination ?? this.playerPoint;
      const step = event.shiftKey ? 10 : 2;
      const x = origin[0] + (direction?.[0] ?? 0) * step;
      const z = origin[1] + (direction?.[1] ?? 0) * step;
      this.selectPoint(
        Math.max(Math.max(bounds.minX, this.region.minX), Math.min(Math.min(bounds.maxX, this.region.maxX), x)),
        Math.max(Math.max(bounds.minZ, this.region.minZ), Math.min(Math.min(bounds.maxZ, this.region.maxZ), z)),
      );
    });
  }
  private selectPoint(x: number, z: number) {
    const feature = this.map.features.find(f => insidePolygon(x, z, f));
    const marker = extraPlaces.find(p => Math.hypot(p.x - x, p.z - z) < 12);
    const name = marker?.name ?? feature?.tags.name ?? '地图上的位置';
    const distance = Math.round(Math.hypot(x - this.playerPoint[0], z - this.playerPoint[1]));
    this.selection.textContent = `已选择：${name} · 距当前位置约 ${distance} 米`;
    this.destination = [x, z]; this.onSelect(x, z, name);
  }
  setRegion(region: string) {
    this.destination = null; this.onClear();
    this.region = region === 'core' ? { minX: -170, maxX: 100, minZ: -40, maxZ: 372 } : region === 'south' ? { minX: -230, maxX: 150, minZ: 344, maxZ: 745 } : { ...bounds };
    const r = this.region, w = this.canvas.width, h = this.canvas.height;
    const scale = Math.min((w - 90) / (r.maxX - r.minX), (h - 60) / (r.maxZ - r.minZ));
    this.size = { scale, x: (w - (r.maxX - r.minX) * scale) / 2 - r.minX * scale, z: (h - (r.maxZ - r.minZ) * scale) / 2 - r.minZ * scale };
    const c = this.background.getContext('2d')!; c.fillStyle = '#e9e9dc'; c.fillRect(0, 0, w, h);
    const surface = (p: MapPolygon, color: string) => {
      c.beginPath();
      for (const ring of [p.points, ...(p.holes ?? [])]) { ring.forEach(([x, z], i) => { const q = this.project(x, z); if (i === 0) c.moveTo(...q); else c.lineTo(...q); }); c.closePath(); }
      c.fillStyle = color; c.fill('evenodd');
    };
    this.map.lawns.forEach(p => surface(p, '#b0c4a0'));
    this.map.roads.forEach(p => surface(p, '#b6bab0'));
    this.map.features.forEach(p => surface(p, p.tags.leisure ? '#c0a391' : p.tags.garden === 'south' ? '#d0bca4' : '#9caeaa'));
    const route = [[0, 18], [0, 83], [-24, 83], [-24, 99], [-18, 114], [-18, 145], [-85, 147], [-85, 182], [-85.6, 255], [-91, 352]];
    c.beginPath(); route.forEach(([x, z], i) => { const q = this.project(x, z); if (!i) c.moveTo(...q); else c.lineTo(...q); }); c.strokeStyle = '#bd8151'; c.lineWidth = 4; c.setLineDash([8, 6]); c.stroke(); c.setLineDash([]);
    const labels: [string, number, number][] = [['北大楼', 0, 0], ['金大路', 0, 59], ['东大楼', 52, 48], ['西大楼', -51, 46], ['大礼堂', -53, 99], ['教学楼', -85, 128], ['中大路', -85, 235], ['汉口路校门', -91, 350], ['南园', -55, 480], ['广州路校门', -35, 715], ['苏浙运动场', -195, -20]];
    // Every footprint gets its plan number; full labels are placed only where
    // they fit. Clicking a building and the searchable directory expose all names.
    c.font='12px system-ui';c.textAlign='center';c.textBaseline='middle';
    for(const f of this.map.features){const[x,z]=featureCenter(f);if(x<r.minX||x>r.maxX||z<r.minZ||z>r.maxZ)continue;const q=this.project(x,z);c.fillStyle='#f8f6ed';c.beginPath();c.arc(q[0],q[1],10,0,Math.PI*2);c.fill();c.fillStyle='#284438';c.fillText(f.tags.plan_id??'·',...q);}
    labels.push(...extraPlaces.map(p=>[p.name,p.x,p.z] as [string,number,number]));
    const occupied:[number,number,number,number][]=[];
    const priority=['图书馆','逸夫馆','费彝民楼群','蒙民伟楼','南园综合楼与学生餐厅','南芳园餐厅'];
    const features=[...this.map.features].sort((a,b)=>Number(priority.includes(b.tags.name))-Number(priority.includes(a.tags.name)));
    labels.push(...features.filter(f=>!labels.some(l=>l[0]===f.tags.name)).map(f=>[f.tags.name,...featureCenter(f)] as [string,number,number]));
    c.font = '14px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const [text, x, z] of labels) {
      if (x < r.minX || x > r.maxX || z < r.minZ || z > r.maxZ) continue;
      const q = this.project(x, z), width = c.measureText(text).width + 14;
      const box:[number,number,number,number]=[q[0]-width/2,q[1]-12,q[0]+width/2,q[1]+12];
      if(occupied.some(a=>a[0]<box[2]&&a[2]>box[0]&&a[1]<box[3]&&a[3]>box[1]))continue;occupied.push(box);
      c.fillStyle = '#f8f6edec'; c.fillRect(q[0] - width / 2, q[1] - 12, width, 24); c.fillStyle = '#334c43'; c.fillText(text, ...q);
    }
    c.fillStyle = '#4c6057'; c.textAlign = 'left'; c.fillText('↑ 北', 26, 28);
    this.selection.textContent = '数字对应平面图编号；点击建筑查看名称，或搜索地点；虚线是重点路线';
  }
  private project(x: number, z: number): [number, number] { return [this.size.x + x * this.size.scale, this.size.z + z * this.size.scale]; }
  update(x: number, z: number, yaw: number) {
    this.playerPoint = [x, z];
    const c = this.ctx; c.drawImage(this.background, 0, 0);
    if (this.destination) { const q = this.project(...this.destination); c.beginPath(); c.arc(...q, 9, 0, Math.PI * 2); c.strokeStyle = '#bf8149'; c.lineWidth = 4; c.stroke(); }
    const p = this.project(x, z);
    c.save(); c.translate(...p); c.rotate(-yaw); c.fillStyle = '#b84f37'; c.strokeStyle = '#fff'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(0, -13); c.lineTo(9, 10); c.lineTo(0, 6); c.lineTo(-9, 10); c.closePath(); c.fill(); c.stroke(); c.restore();
  }
}
