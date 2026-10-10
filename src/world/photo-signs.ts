import signs from './photo-signs.json';

/** Reconstructed painted contours; reference photographs remain local. */
export function drawPhotoSign(c:CanvasRenderingContext2D,name:keyof typeof signs,w:number,h:number){
 for(const shape of signs[name].shapes){
  c.beginPath();
  for(const points of [shape.outline,...shape.holes]){
   points.forEach(([x,y],i)=>i?c.lineTo(x*w,y*h):c.moveTo(x*w,y*h));c.closePath();
  }
  c.fill('evenodd');
 }
}
