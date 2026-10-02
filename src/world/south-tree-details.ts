import * as T from 'three';
import {rng} from './geometry.ts';
import {insidePolygon, type CampusMap} from './campus-map.ts';
import type {TreeSpot} from './vegetation.ts';
import type {Materials} from './materials.ts';

/** Whitewashed roadside trunks and grass at their feet appear in gl-1-06/17.
 * Existing positions are approximate. These trees stand in mapped lawns, so
 * add lawn planting rather than inventing paved tree wells around them. */
export function createSouthTreeDetails(trees: TreeSpot[], map: CampusMap, mats: Materials) {
  const onLawn = (x: number, z: number) => map.lawns.some(l => insidePolygon(x, z, l));
  const roadside = trees.filter(t => t.x > -115 && t.x < 80 && t.z > 400 && t.z < 670 && onLawn(t.x, t.z)
    && Array.from({length:12}, (_, i) => i * Math.PI / 6).some(a => [1.2, 2.4, 3.2].some(d =>
      map.roads.some(r => insidePolygon(t.x + Math.cos(a) * d, t.z + Math.sin(a) * d, r)))));
  const random = rng(1317), dummy = new T.Object3D(), matrices: T.Matrix4[] = [], centers: number[][] = [];
  for (const tree of roadside) {
    tree.whitewash = true;
    for (let i = 0; i < 40; i++) {
      const angle = random() * Math.PI * 2, radius = Math.sqrt(random()) * 1.1;
      const x = tree.x + Math.cos(angle) * radius, z = tree.z + Math.sin(angle) * radius;
      if (![[0,0],[.25,0],[-.25,0],[0,.25],[0,-.25]].every(([dx,dz]) => onLawn(x+dx,z+dz))) continue;
      const width = .24 + random() * .13, height = .07 + random() * .065;
      for (const turn of [0, Math.PI/2]) {
        dummy.position.set(x, .026, z); dummy.rotation.set(0, angle + turn, 0); dummy.scale.set(width, height, 1); dummy.updateMatrix(); matrices.push(dummy.matrix.clone());
      }
      centers.push([x,z]);
    }
  }
  const geometry = new T.PlaneGeometry(1,1).translate(0,.5,0);
  const mesh = new T.InstancedMesh(geometry,mats.grassTuft,matrices.length);
  matrices.forEach((m,i) => mesh.setMatrixAt(i,m)); mesh.receiveShadow = true; mesh.castShadow = false; mesh.computeBoundingSphere();
  mesh.name = 'Nanyuan roadside tree ground planting';
  mesh.userData.trees = roadside.map(t => ({...t})); mesh.userData.centers = centers;
  mesh.userData.source = 'gl-1-06 / gl-1-17; selective approximate treatment of existing lawn-side trees';
  return mesh;
}
