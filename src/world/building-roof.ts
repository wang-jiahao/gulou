import * as T from 'three';

/** Give an extrusion's existing upward cap the roof material. Adding another
 * nearly coplanar cap produces depth stripes at campus-wide camera distances.
 * The input stays intact so its closed shell can also serve collision. */
export function splitBuildingRoof(geometry: T.BufferGeometry) {
  const normal = geometry.getAttribute('normal');
  const count = geometry.index?.count ?? geometry.getAttribute('position').count;
  const vertex = (i: number) => geometry.index?.getX(i) ?? i;
  const roofIndices: number[] = [], wallIndices: number[] = [];
  for (let i = 0; i < count; i += 3) {
    const a = vertex(i), b = vertex(i + 1), c = vertex(i + 2);
    const target = [a, b, c].every(v => normal.getY(v) > .99) ? roofIndices : wallIndices;
    target.push(a, b, c);
  }
  const subset = (indices: number[]) => {
    const part = new T.BufferGeometry();
    for (const [name, attribute] of Object.entries(geometry.attributes)) {
      const values = new Float32Array(indices.length * attribute.itemSize);
      for (let i = 0; i < indices.length; i++) for (let j = 0; j < attribute.itemSize; j++) {
        values[i * attribute.itemSize + j] = attribute.getComponent(indices[i], j);
      }
      part.setAttribute(name, new T.Float32BufferAttribute(values, attribute.itemSize));
    }
    return part;
  };
  return { roof: subset(roofIndices), walls: subset(wallIndices) };
}
