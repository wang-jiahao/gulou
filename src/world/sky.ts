import * as T from 'three';

/** A lightweight clear afternoon sky with distant, static procedural clouds. */
export function createSkyDome() {
  const material = new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, toneMapped: false,
    vertexShader: `varying vec3 vDirection; void main(){ vDirection = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `
      varying vec3 vDirection;
      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
      float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.02+vec2(9.2,3.7);a*=.5;}return v; }
      void main(){
        vec3 d=normalize(vDirection); float t=pow(max(d.y,0.),.45);
        vec3 color=mix(vec3(.79,.87,.91),vec3(.31,.57,.80),t);
        vec2 p=d.xz/(max(d.y,0.)+.16)*2.5;
        float cloud=smoothstep(.54,.72,fbm(p))*smoothstep(.04,.2,d.y);
        color=mix(color,vec3(.99,.985,.955),cloud*.87);
        gl_FragColor=vec4(pow(color,vec3(2.2)),1.);
        #include <colorspace_fragment>
      }`,
  });
  const sky = new T.Mesh(new T.SphereGeometry(490, 16, 12), material); sky.renderOrder = -10; sky.frustumCulled = false; return sky;
}
