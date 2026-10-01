import * as T from 'three';
export type CollisionMesh = { vertices: Float32Array; indices: Uint32Array };

/** Bake GLB node transforms after decoding normalized/quantized positions. */
export function collisionMesh(mesh: T.Mesh, upward = false): CollisionMesh {
  mesh.updateWorldMatrix(true, false);
  const p = mesh.geometry.getAttribute('position'), vertices = new Float32Array(p.count * 3), point = new T.Vector3();
  for (let i = 0; i < p.count; i++) { point.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld); vertices.set(point.toArray(), i * 3); }
  const source = mesh.geometry.getIndex(), indices = new Uint32Array(source ? source.count : p.count);
  for (let i = 0; i < indices.length; i++) indices[i] = source ? source.getX(i) : i;
  if (upward) for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3, b = indices[i+1] * 3, c = indices[i+2] * 3;
    const normalY = (vertices[b+2]-vertices[a+2])*(vertices[c]-vertices[a])-(vertices[b]-vertices[a])*(vertices[c+2]-vertices[a+2]);
    if (normalY < 0) [indices[i+1], indices[i+2]] = [indices[i+2], indices[i+1]];
  }
  return { vertices, indices };
}
