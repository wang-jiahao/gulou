import { createModelTrees } from './model-trees.ts';
import type { Materials } from './materials.ts';
import type { TreeSpot } from './vegetation.ts';

// Official gl-4-05 l/b shows mature, whitewashed street trees outside the
// pale perimeter plinth. Positions and heights are approximate, aligned to
// the plan-derived fence rather than inferred as surveyed planting points.
export const jinyinStreetTrees: TreeSpot[] = [
  { x: -371.62, z: -111, height: 16, whitewash: true },
  { x: -372.79, z: -104, height: 15.2, whitewash: true },
  { x: -373.95, z: -97, height: 16.8, whitewash: true },
  { x: -375.07, z: -89.5, height: 15.8, whitewash: true },
  { x: -374.83, z: -82, height: 17.2, whitewash: true },
  { x: -374.27, z: -74.5, height: 16.2, whitewash: true },
  { x: -372.4, z: -68, height: 15.4, whitewash: true },
];

export async function createJinyinStreetTrees(mats: Materials) {
  // A separate batch preserves all previous trees' transforms and variants.
  // Reuse the existing model/material caches and spatially culled foliage LOD.
  const trees = await createModelTrees(jinyinStreetTrees, 'far', mats.leaves);
  trees.group.name = 'Jinyin Street roadside trees';
  return trees;
}
