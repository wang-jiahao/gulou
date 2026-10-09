export type AccessSensor = {
  x: number; z: number; angle: number;
  halfWidth: number; approach: number; occupied: number; clear: number;
  hold: number; sweep: number;
};
type Position = {x:number;y:number;z:number};
export type AccessTravelState = {flying?:boolean;riding?:boolean};

/** A lane sensor, not a radial proximity trigger. Keep a passage open while
 * occupied and briefly afterwards, including when the traveller pauses. */
export function updateAccessSensor(sensor:AccessSensor,position:Position,previous:Position|null,dt:number,travel:AccessTravelState={}) {
  const cos=Math.cos(sensor.angle),sin=Math.sin(sensor.angle),dx=position.x-sensor.x,dz=position.z-sensor.z;
  const across=dx*cos-dz*sin,along=dx*sin+dz*cos;
  const onGround=!travel.flying&&position.y>-.3&&position.y<.65;
  const inLane=onGround&&Math.abs(across)<sensor.halfWidth;
  const movement=previous?Math.hypot(position.x-previous.x,position.z-previous.z):0;
  const normalMovement=previous?(position.x-previous.x)*sin+(position.z-previous.z)*cos:0;
  const speed=dt>0?movement/dt:0;
  // Reject jumps beyond the grounded controller's speed range, including short
  // teleports. A nearly lateral street crossing is not a passage request.
  const toward=previous&&movement>0&&speed<=(travel.riding?9.6:4.8)&&Math.abs(normalMovement)/movement>=.65&&along*normalMovement<-.0001;
  const leadingLength=travel.riding?.95:.27;
  // The flaps sweep .53m towards one approach. Give the leading end of the
  // traveller a further quarter-second of opening time in either direction.
  // At walking speed the existing 1.25m reader range remains sufficient.
  const approach=Math.max(sensor.approach,leadingLength+sensor.sweep+speed*.25);
  const arriving=inLane&&Math.abs(along)<approach&&toward;
  const occupied=inLane&&Math.abs(along)<sensor.occupied;
  const clearing=sensor.hold>0&&onGround&&Math.abs(across)<sensor.halfWidth+.18&&Math.abs(along)<sensor.clear;
  if(arriving||occupied||clearing)sensor.hold=.55;
  else sensor.hold=Math.max(0,sensor.hold-Math.max(0,dt));
  return sensor.hold>0;
}
