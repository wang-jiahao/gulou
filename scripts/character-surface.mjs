import * as T from 'three';

/** One Catmull–Clark pass with face-varying UVs and shared geometric normals.
 * Source faces contain [positionIndex, uvIndex] pairs. UV seam copies share
 * the same position and normal, but retain distinct texture coordinates.
 */
export function subdivideCharacterSurface(vertices, uvs, faces, include) {
  const selected = faces.filter(face => include(face.reduce((sum, [i]) => sum.add(vertices[i]), new T.Vector3()).divideScalar(face.length)));
  const edgeKey = (a, b) => a < b ? `${a}:${b}` : `${b}:${a}`;
  const edges = new Map(), adjacent = new Map(), centres = [];
  for (const [fi, face] of selected.entries()) {
    if (face.length < 3) throw new Error('Character surface contains a degenerate face');
    centres.push(face.reduce((sum, [i]) => sum.add(vertices[i]), new T.Vector3()).divideScalar(face.length));
    face.forEach(([a], j) => {
      const b = face[(j + 1) % face.length][0], previous = face[(j + face.length - 1) % face.length][0], key = edgeKey(a, b);
      if (!edges.has(key)) edges.set(key, { a, b, faces: [] });
      edges.get(key).faces.push(fi);
      if (!adjacent.has(a)) adjacent.set(a, { faces: [], edges: new Set() });
      adjacent.get(a).faces.push(fi);
      adjacent.get(a).edges.add(key);
      adjacent.get(a).edges.add(edgeKey(previous, a));
    });
  }
  const points = [], pointIds = new Map();
  const addPoint = (key, point) => { pointIds.set(key, points.length); points.push(point); };
  for (const [i, neighbours] of adjacent) {
    const incident = [...neighbours.edges].map(key => edges.get(key));
    const boundary = incident.filter(e => e.faces.length === 1).map(e => vertices[e.a === i ? e.b : e.a]);
    let point;
    if (boundary.length === 2) {
      point = vertices[i].clone().multiplyScalar(.75).addScaledVector(boundary[0], .125).addScaledVector(boundary[1], .125);
    } else {
      const n = neighbours.faces.length;
      const f = neighbours.faces.reduce((sum, fi) => sum.add(centres[fi]), new T.Vector3()).divideScalar(n);
      const r = incident.reduce((sum, e) => sum.add(vertices[e.a]).add(vertices[e.b]), new T.Vector3()).divideScalar(incident.length * 2);
      point = vertices[i].clone().multiplyScalar(n - 3).add(f).addScaledVector(r, 2).divideScalar(n);
    }
    addPoint(`v${i}`, point);
  }
  for (const [key, edge] of edges) {
    if (edge.faces.length > 2) throw new Error(`Non-manifold character edge ${key}`);
    const point = vertices[edge.a].clone().add(vertices[edge.b]);
    if (edge.faces.length === 2) point.add(centres[edge.faces[0]]).add(centres[edge.faces[1]]).multiplyScalar(.25);
    else point.multiplyScalar(.5);
    addPoint(`e${key}`, point);
  }
  centres.forEach((point, i) => addPoint(`f${i}`, point));

  const quads = [], triangles = [];
  for (const [fi, face] of selected.entries()) {
    const centreUV = face.reduce((sum, [, i]) => sum.add(new T.Vector2(...uvs[i])), new T.Vector2()).divideScalar(face.length);
    face.forEach(([a, ua], j) => {
      const [b, ub] = face[(j + 1) % face.length], [c, uc] = face[(j + face.length - 1) % face.length];
      const ids = [pointIds.get(`v${a}`), pointIds.get(`e${edgeKey(a, b)}`), pointIds.get(`f${fi}`), pointIds.get(`e${edgeKey(c, a)}`)];
      const texcoords = [new T.Vector2(...uvs[ua]), new T.Vector2(...uvs[ua]).lerp(new T.Vector2(...uvs[ub]), .5), centreUV, new T.Vector2(...uvs[uc]).lerp(new T.Vector2(...uvs[ua]), .5)];
      quads.push({ ids, texcoords });
      triangles.push(ids[0], ids[1], ids[2], ids[0], ids[2], ids[3]);
    });
  }
  // Compute normals before UV seam splitting, so a texture seam is not a
  // visible lighting seam. Preserve the original subdivision's diagonals.
  const canonical = new T.BufferGeometry();
  canonical.setAttribute('position', new T.Float32BufferAttribute(points.flatMap(p => p.toArray()), 3));
  canonical.setIndex(triangles); canonical.computeVertexNormals();
  const sourceNormals = canonical.getAttribute('normal');
  const splitIds = new Map(), positions = [], texcoords = [], normals = [], indices = [];
  function split(id, uv) {
    const key = `${id}/${uv.x.toPrecision(15)}/${uv.y.toPrecision(15)}`;
    if (splitIds.has(key)) return splitIds.get(key);
    const result = positions.length / 3; splitIds.set(key, result);
    positions.push(...points[id].toArray()); texcoords.push(uv.x, uv.y);
    normals.push(sourceNormals.getX(id), sourceNormals.getY(id), sourceNormals.getZ(id));
    return result;
  }
  for (const quad of quads) {
    const ids = quad.ids.map((id, i) => split(id, quad.texcoords[i]));
    indices.push(ids[0], ids[1], ids[2], ids[0], ids[2], ids[3]);
  }
  canonical.dispose();
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new T.Float32BufferAttribute(texcoords, 2));
  geometry.setIndex(indices);
  return geometry;
}
