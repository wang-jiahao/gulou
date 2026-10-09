import * as T from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {BALL_RADIUS,RIM_RADIUS,RIM_TUBE,basketballHoops,type BasketballHoop} from '../world/basketball-layout.ts';

export function shotVelocity(from:T.Vector3,hoop:BasketballHoop,power:number){
  const direction=hoop.center.clone().sub(from);direction.y=0;
  const distance=direction.length();direction.normalize();
  const error=Math.sign(power-.72)*Math.max(0,Math.abs(power-.72)-.025)*5.5;
  const target=hoop.center.clone().addScaledVector(direction,error);
  const apex=Math.max(from.y+.9,T.MathUtils.clamp(4.6+distance*.13,4.6,6.3));
  const vy=Math.sqrt(2*9.81*(apex-from.y)),time=vy/9.81+Math.sqrt(2*(apex-target.y)/9.81);
  return new T.Vector3((target.x-from.x)/time,vy,(target.z-from.z)/time);
}

export function downwardBasket(previous:T.Vector3,current:T.Vector3,hoop:BasketballHoop){
  if(previous.y<=hoop.center.y||current.y>hoop.center.y)return false;
  const t=(hoop.center.y-previous.y)/(current.y-previous.y);
  return Math.hypot(T.MathUtils.lerp(previous.x,current.x,t)-hoop.center.x,T.MathUtils.lerp(previous.z,current.z,t)-hoop.center.z)<RIM_RADIUS-RIM_TUBE-BALL_RADIUS;
}

/** A single sleeping ball, with fixed colliders for the nine visible hoops. */
export class BasketballPhysics{
  readonly body:RAPIER.RigidBody;
  readonly collider:RAPIER.Collider;
  active=true;
  held=false;
  shots=0;
  score=0;
  lastPoints=0;
  onScore:(points:number)=>void=()=>{};
  private velocity=new T.Vector3();
  private spin=new T.Vector3();
  private previous=new T.Vector3();
  private target:BasketballHoop|null=null;
  private points=2;

  constructor(world:RAPIER.World){
    for(const hoop of basketballHoops){
      world.createCollider(RAPIER.ColliderDesc.cuboid(.9,.525,.04).setTranslation(...hoop.board.toArray()).setRotation(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),hoop.angle)).setRestitution(.55));
      for(let i=0;i<24;i++){
        const a=i*Math.PI/12,b=(i+1)*Math.PI/12;
        const p=new T.Vector3(Math.cos(a)*RIM_RADIUS,0,Math.sin(a)*RIM_RADIUS).add(hoop.center);
        const q=new T.Vector3(Math.cos(b)*RIM_RADIUS,0,Math.sin(b)*RIM_RADIUS).add(hoop.center);
        const direction=q.clone().sub(p),mid=p.clone().add(q).multiplyScalar(.5);
        world.createCollider(RAPIER.ColliderDesc.capsule(direction.length()/2,RIM_TUBE).setTranslation(...mid.toArray()).setRotation(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize())).setRestitution(.68));
      }
    }
    const start=basketballHoops.find(h=>h.court==='basket-north1')!.start;
    this.body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(...start.toArray()).setCcdEnabled(true).setAngularDamping(.18));
    this.collider=world.createCollider(RAPIER.ColliderDesc.ball(BALL_RADIUS).setMass(.62).setFriction(.65).setRestitution(.7),this.body);
    this.previous.copy(start);
  }
  get position(){const p=this.body.translation();return new T.Vector3(p.x,p.y,p.z);}
  private bodyMode(){this.body.setBodyType(this.active&&!this.held?RAPIER.RigidBodyType.Dynamic:RAPIER.RigidBodyType.KinematicPositionBased,true);this.body.setNextKinematicTranslation(this.body.translation());this.body.setNextKinematicRotation(this.body.rotation());
    // A disabled held-ball collider loses its mass after a physics step.
    // Re-enabling it does not restore the dynamic body mass automatically.
    if(this.active&&!this.held)this.body.recomputeMassPropertiesFromColliders();
  }
  prepare(active:boolean){
    if(active===this.active)return;
    if(!active){const v=this.body.linvel(),s=this.body.angvel();this.velocity.set(v.x,v.y,v.z);this.spin.set(s.x,s.y,s.z);}
    this.active=active;this.bodyMode();
    if(active&&!this.held){this.body.setLinvel(this.velocity,true);this.body.setAngvel(this.spin,true);}
  }
  hold(){if(!this.active)return false;this.held=true;this.target=null;this.collider.setEnabled(false);this.bodyMode();return true;}
  follow(position:T.Vector3){if(!this.held)return;this.body.setTranslation(position,true);this.body.setNextKinematicTranslation(position);this.previous.copy(position);}
  shoot(hoop:BasketballHoop,power:number){
    if(!this.held||!this.active)return false;
    const from=this.position;this.held=false;this.collider.setEnabled(true);this.bodyMode();
    this.body.setLinvel(shotVelocity(from,hoop,power),true);this.body.setAngvel(new T.Vector3(8*Math.cos(hoop.angle),0,-8*Math.sin(hoop.angle)),true);
    this.target=hoop;this.points=Math.hypot(from.x-hoop.center.x,from.z-hoop.center.z)>6.75?3:2;this.shots++;this.previous.copy(from);return true;
  }
  reset(position:T.Vector3){
    this.held=false;this.target=null;this.collider.setEnabled(true);this.bodyMode();this.body.setTranslation(position,true);this.body.setNextKinematicTranslation(position);
    this.velocity.set(0,0,0);this.spin.set(0,0,0);this.body.setLinvel(this.velocity,true);this.body.setAngvel(this.spin,true);this.previous.copy(position);
  }
  update(){
    const p=this.position;
    if(this.active&&!this.held&&this.target&&downwardBasket(this.previous,p,this.target)){
      this.score+=this.points;this.lastPoints=this.points;this.target=null;this.onScore(this.points);
    }
    this.previous.copy(p);
  }
}
