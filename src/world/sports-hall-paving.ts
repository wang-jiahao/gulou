import * as T from 'three';
import { Builder, rng } from './geometry.ts';
import type { CampusMap, MapPolygon } from './campus-map.ts';
import type { Materials } from './materials.ts';
import { terrainSurface } from './courtyard-terrain.ts';

/** Registered to the two hall footprints and the northeast sports fence.
 * VR gl-3-03 f/l/r establishes continuous concrete, planted strips and bays;
 * outline, joint spacing and tree-pit dimensions are approximate. */
export function sportsHallPavingLayout(map: CampusMap) {
  const gym = map.features.find(f => f.id === 'plan-6')!, swim = map.features.find(f => f.id === 'plan-13')!;
  const outline: MapPolygon = { points: [
    [-153, -110.3], gym.points[2], gym.points[3], [-98.827, -98.5],
    swim.points[3], swim.points[4], swim.points[5], swim.points[6],
    [-138, -52.8], [-140, -68], [-147, -84], [-156, -94], [-153, -100],
  ] };
  const beds: MapPolygon[] = [], pits: MapPolygon[] = [], markings: MapPolygon[] = [], borders: MapPolygon[] = [];
  for (const [feature, index] of [[gym, 2], [swim, 5]] as const) {
    const [x, z] = feature.points[index], [xx, zz] = feature.points[(index + 1) % feature.points.length], length = Math.hypot(xx - x, zz - z);
    const nx = -(zz - z) / length, nz = (xx - x) / length;
    const rectangle = (u: number, v: number, w: number, d: number): MapPolygon => ({ points: [[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b]) => [(x + xx) / 2 + (u + a*w/2)*nz + (v + b*d/2)*nx, (z + zz) / 2 - (u + a*w/2)*nx + (v + b*d/2)*nz]) });
    if (feature === swim) {
      for (const side of [-1, 1]) {
        const bed = rectangle(side*14.475, 1.875, 15.05, 3.05); beds.push(bed);
        borders.push({ ...rectangle(side*14.475, 1.875, 15.41, 3.41), holes: [bed.points] });
        // Bays face the planted strips, leaving the middle approach open.
        for (let i = 0; i < 6; i++) markings.push(rectangle(side*(7.2+i*2.55), 7.6, .10, 5.1));
        markings.push(rectangle(side*13.575, 5.05, 12.85, .10));
      }
    } else {
      for (const [u,v,w] of [[-7,1.9,1.4],[7.8,1.8,1.4],[-19.7,2.9,1.7],[-13.9,2.6,1.7],[5.8,2.6,1.7]]) {
        const pit = rectangle(u,v,w,w); pits.push(pit); borders.push({...rectangle(u,v,w+.24,w+.24),holes:[pit.points]});
      }
    }
  }
  return { outline, surface: { ...outline, holes: [...beds, ...pits].map(p => p.points) }, beds, pits, markings, borders };
}
export type SportsPavingLayout = ReturnType<typeof sportsHallPavingLayout>;

export function createSportsHallPaving(layout: SportsPavingLayout, mats: Materials) {
  const b = new Builder();
  const concrete = new T.MeshStandardMaterial({ name: 'sports forecourt jointed concrete', map: concreteTexture(), roughness: .96, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const paint = new T.MeshStandardMaterial({ name: 'sports forecourt parking paint', color: 0xe3e1cd, roughness: .94, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const soil = new T.MeshStandardMaterial({ name: 'sports forecourt tree soil', color: 0x71664c, roughness: 1 });
  const surface = terrainSurface(layout.surface, .036), uv = surface.getAttribute('uv'), p = surface.getAttribute('position');
  for (let i=0; i<p.count; i++) uv.setXY(i, (p.getX(i)*.9986+p.getZ(i)*.0528)/4.8, (-p.getX(i)*.0528+p.getZ(i)*.9986)/4.8);
  b.add(surface, concrete);
  for (const bed of layout.beds) b.add(terrainSurface(bed, .036), mats.grass);
  for (const pit of layout.pits) b.add(terrainSurface(pit, .036), soil);
  for (const border of layout.borders) b.add(terrainSurface(border, .042), mats.stone);
  for (const marking of layout.markings) b.add(terrainSurface(marking, .043), paint);
  const group = b.finish('continuous sports hall paving');
  for (const child of group.children) child.castShadow = false;
  group.userData = { source: 'official VR scene_gl-3-03 f/l/r', approximate: true, ...layout };
  return group;
}

function concreteTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const g = canvas.getContext('2d')!, rand = rng(4103), pixels = g.createImageData(512,512);
  for(let i=0; i<pixels.data.length; i+=4) {
    const shade = (rand()-.5)*9; pixels.data[i]=183+shade; pixels.data[i+1]=181+shade; pixels.data[i+2]=169+shade; pixels.data[i+3]=255;
  }
  g.putImageData(pixels,0,0); g.fillStyle='rgba(79,77,69,.46)'; g.fillRect(0,0,1.6,512); g.fillRect(0,0,512,1.6);
  const texture = new T.CanvasTexture(canvas); texture.colorSpace=T.SRGBColorSpace; texture.wrapS=texture.wrapT=T.RepeatWrapping; texture.anisotropy=4; return texture;
}
