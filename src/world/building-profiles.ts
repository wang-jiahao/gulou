import type { MapFeature } from './campus-map.ts';

export type FacadeProfile = {
  style: 'historic' | 'modern' | 'dormitory' | 'villa' | 'glass';
  levels: number; wall: number; frame: number;
  roof: 'flat' | 'hip' | 'heritage';
  bays: number; windowWidth: number; windowHeight: number;
  ac?: boolean; bands?: boolean; balcony?: boolean; dome?: boolean;
  groundWall?: number;
  groundWindowGuards?: boolean;
  gardenGlazing?: boolean;
  arched?: boolean;
  portal?: 'stone' | 'glass' | 'columns';
  source: string; observations: string;
};
const historic: FacadeProfile = {style:'historic',levels:3,wall:0x99968a,frame:0x553d31,roof:'hip',bays:3.2,windowWidth:1.45,windowHeight:2.0,portal:'stone',source:'',observations:''};
const modern: FacadeProfile = {style:'modern',levels:4,wall:0xc5c3b7,frame:0xacaeaa,roof:'flat',bays:3.4,windowWidth:1.9,windowHeight:1.8,portal:'glass',bands:true,source:'',observations:''};
const dorm: FacadeProfile = {...modern,style:'dormitory',levels:6,wall:0xd0c9b2,windowWidth:1.65,windowHeight:1.75,ac:true};
const villa: FacadeProfile = {...historic,style:'villa',levels:2,wall:0xb4ab96,roof:'hip',windowWidth:1.1,windowHeight:1.65,portal:'columns'};
const profile = (base: FacadeProfile, source: string, observations: string, changes: Partial<FacadeProfile> = {}): FacadeProfile => ({...base,source,observations,...changes});
/** Exterior observations from the official VR, October 2026 review.
 * Counts/proportions are visual estimates. Source IDs refer to the local VR inventory.
 * Do not equate schematic-plan footprints with a surveyed building envelope. */
export const buildingProfiles: Record<string, FacadeProfile> = {
  'plan-1': profile(modern,'gl-4-04','pale stone grid, dark blue vertical glazing, glazed ground floor',{levels:7,wall:0xc1b6a4,style:'glass',windowHeight:2.2}),
  'plan-2': profile(modern,'gl-4-02','light rectangular wings, rooftop service enclosure',{levels:6,wall:0xd1d0c4}),
  'plan-3': profile(modern,'gl-3-18','wide horizontal window bands, warm stone piers, deep entrance canopy',{levels:7,wall:0xc7baa5,bays:3.6,windowWidth:2.7}),
  'plan-4': profile(modern,'gl-3 / gl-4-02','19-storey B tower plus low A wings; separated in specific-buildings using official description and VR',{levels:19,wall:0xc6c1b4}),
  'plan-5': profile(modern,'gl-4-02','tall pale academic facade; aerial view supports massing only',{levels:12,wall:0xcac5b6}),
  'plan-6': profile(modern,'gl-3-17','low sports building with broad glazing under flat roof',{levels:3,windowWidth:2.6,bays:3.2}),
  'plan-8': profile(modern,'gl-4-02','pale academic block beside northwest entrance, aerial reference',{levels:8}),
  'plan-10': profile(modern,'gl-4-10','beige piers, large recessed entrance and projecting canopy',{levels:10,wall:0xc0b29a,portal:'columns',windowWidth:2.1}),
  'plan-12': profile(modern,'gl-4-10','cream academic block with horizontal slab lines and roof parapet',{levels:6,wall:0xc6c4af}),
  'plan-13': profile(modern,'gl-3-03','pool hall, rounded-looking corner banding and horizontal glazing',{levels:4,wall:0xd3d2c5,windowWidth:2.7,bays:3.3}),
  'plan-14': profile(modern,'gl-3-02','three-level pale facade, narrow upright windows and modest entrance',{levels:3,windowWidth:1.2,windowHeight:1.65,ac:true}),
  'plan-16': profile(villa,'gl-2-28','brick residence behind wall, pitched roof, recessed windows',{wall:0x9e8970,portal:'stone'}),
  'plan-17': profile(modern,'gl-4-08 / gl-4-09','tall pale arts building, projecting entrance, small window grid',{levels:11,wall:0xc1beb1,ac:true}),
  'plan-18': profile(historic,'gl-3-08 / gl-3-11','Tiangan group, dark tiled pitched roofs and masonry bands',{levels:2,roof:'heritage'}),
  'plan-20': profile(historic,'gl-3-02 / gl-3-15','historic pitched roof block near northeast corner',{levels:2,roof:'heritage'}),
  'plan-22': profile(modern,'gl-4-05','white stone wings, blue glass vertical connector and covered entry',{levels:6,wall:0xcacbc2,style:'glass',windowWidth:2.35}),
  'plan-25': profile(historic,'gl-3-08','low historic Tiangan wing, grey tile roof and stone base',{levels:2,roof:'heritage'}),
  'plan-28': profile(historic,'gl-4-13 / gl-3-08','masonry academic wing in aerial context',{levels:3}),
  'plan-29': profile(historic,'gl-3-08 / gl-3-11','Tiangan wing with continuous tiled roof',{levels:2,roof:'heritage'}),
  'plan-34': profile(modern,'gl-4-13 / gl-3-01','cream seven-level grid, low entry link, dark grouped windows',{levels:7,wall:0xc6bea5,windowWidth:2.35,bays:3.25}),
  'plan-35': profile(historic,'gl-3-08','southern Tiangan wing, dark tiled roof and recessed openings',{levels:2,roof:'heritage'}),
  'plan-36': profile(modern,'gl-3-16','pale stone teaching/laboratory wing with glazing and sheltered portal',{levels:5,wall:0xc7c3b7}),
  'plan-38': profile(historic,'gl-2-04 / gl-2-07','historic academic facade, central portico and grey tile roof',{levels:3,roof:'heritage',portal:'columns'}),
  'teaching-priority': profile(historic,'gl-2-10 / gl-2-02','five floors, white vertical entrance bay, paired windows and arch crown',{levels:5,roof:'flat',wall:0xa8a395,frame:0xbab9ae,windowWidth:1.6,bands:true}),
  'plan-41': profile(historic,'gl-2-45 / gl-4-06','grey brick, pale windows, three arched entrance bays, observatory dome',{levels:3,roof:'flat',frame:0xd0d1c6,dome:true,portal:'stone'}),
  'plan-44': profile(historic,'gl-2-12','three-storey grey masonry, red door, tiled hip roof and raised stone portal',{levels:3,roof:'heritage'}),
  'plan-45': profile(modern,'gl-2-03','plain pale engineering facade behind boundary gate',{levels:3,wall:0xc8cac0}),
  'plan-50': profile(historic,'gl-2-05','academic wing behind memorial residence: grey brick and pale horizontal trim',{levels:3,roof:'hip',frame:0xc9c7bb}),
  'plan-51': profile(historic,'gl-2-06','wide three-storey masonry front, tiled roof and central stone entrance',{levels:3,roof:'heritage',portal:'stone',windowWidth:1.6}),
  'plan-52': profile(historic,'gl-2-09 / gl-2-35 / gl-2-49','low chapel, pale arched window surrounds and dark roof',{levels:1,roof:'hip',windowHeight:2.5,wall:0x969381,arched:true}),
  'plan-56': profile(modern,'gl-2-13','three-storey cream tiled facade with recessed horizontal bays',{levels:3,wall:0xc9c2a7,windowWidth:2.8,bays:3.8,balcony:true}),
  'plan-58': profile(modern,'gl-2-17','cream plaster, green arched windows and doors, restrained flat parapet',{levels:2,roof:'flat',wall:0xd1ceb0,frame:0x436b58,arched:true,bands:false,windowWidth:1.1,windowHeight:2.1,portal:'stone'}),
  'plan-62': profile(modern,'gl-2-23','science hall podium with pale stone cladding and tall vertical glass',{levels:4,wall:0xbdbdb0,style:'glass',windowHeight:2.5}),
  'plan-64': profile(modern,'gl-2-16','pale acoustic laboratory, horizontal bands, elevated portico',{levels:4,wall:0xb8baad,portal:'columns'}),
  'plan-65': profile(modern,'gl-2-16','acoustic wing and restrained pale window grid',{levels:4,wall:0xb8baad}),
  'plan-66': profile(historic,'gl-2-21 / gl-2-46','former library/history museum: red lattice, green eaves, layered traditional roof',{levels:3,roof:'heritage',wall:0xa6a194,frame:0x693f2e,windowWidth:2.1,bays:3.2}),
  'plan-69': profile(modern,'2024 campus plan; inner-court facade unverified','inner research block; retain approximate facade and height until its use and elevations are verified',{levels:5,wall:0xc8c4b1,portal:'columns',windowHeight:2.1}),
  'plan-70': profile(modern,'gl-2-15 / 2024 campus plan','physics building: five storeys, four square columns, three entry bays, gold lettering and projecting AC louvres; hidden sides approximate',{levels:5,windowWidth:2.4}),
  'plan-71': profile(modern,'gl-2-23 / gl-2-39','tall science tower, pale stone vertical ribs and roof service blocks',{levels:18,wall:0xbfc0b6,style:'glass'}),
  'plan-74': profile(villa,'gl-2-18','brick former laboratory/residence, arched doorway and tall window proportions',{wall:0x9e8a70,portal:'stone'}),
  'plan-75': profile(villa,'gl-2-31','two-storey ochre house, recessed upper porch and pale window frames',{wall:0xc2ae88,frame:0xd0c9b6,balcony:true}),
  'plan-77': profile(villa,'gl-1-04','yellow two-storey residence, white porch columns and grey base',{wall:0xd0c28f,frame:0xc6c7b5,portal:'columns'}),
  'plan-78': profile(dorm,'gl-1-24','south-campus dormitory massing from aerial scene',{levels:6}),
  'plan-82': profile(dorm,'gl-1-24','northwestern south-campus dormitory block, pale facade',{levels:6}),
  'plan-83': profile(dorm,'gl-1-24','parallel south-campus dormitory row, pale facade',{levels:6}),
  'plan-84': profile(dorm,'gl-1-24','dormitory row, rooftop enclosure and regular window grid',{levels:6}),
  'plan-85': profile(historic,'gl-1-02','grey masonry building by fountain, gable end and barred windows',{levels:2,roof:'hip',frame:0xb6b7a8}),
  'plan-86': profile(modern,'gl-1-03 / gl-1-04','blue-grey teaching wing, broad blue ground-floor garden glazing with pale mullions; upper windows and north entry retained, hidden elevations approximate',{levels:3,wall:0xa3b1af,windowWidth:2.2,gardenGlazing:true}),
  'plan-88': profile(dorm,'gl-1-06 / gl-1-24','pale dormitory block with utility units and window bars'),
  'plan-90': profile(dorm,'gl-1-06 / gl-1-24','cream residential grid, small air-conditioning units'),
  'plan-92': profile(dorm,'gl-1-24','south-campus residential row visible from above'),
  'plan-94': profile(dorm,'gl-1-17 / gl-1-06','cream six-storey dormitory, tall grey ground-floor band; visible window guards inform partial ground-floor detail, hidden elevations remain approximate',{wall:0xc7c3ad,groundWall:0x777f7d,groundWindowGuards:true}),
  'plan-95': profile(dorm,'gl-1-06','dormitory courtyard elevation, pale paint and metal window frames'),
  'plan-97': profile(dorm,'gl-1-24','western dormitory row, regular pale window grid'),
  'plan-99': profile(dorm,'gl-1-06 / gl-1-24','courtyard dormitory with service units and flat roof'),
  'plan-101': profile(dorm,'gl-1-06 / gl-1-24','central dormitory row, repeated window modules'),
  'plan-102': profile(dorm,'gl-1-24','southern dormitory block, pale plaster'),
  'plan-103': profile(dorm,'gl-1-07','apartment elevation opposite Taoyuan, pale facade and exposed AC'),
  'plan-104': profile(modern,'gl-1-21','cream hotel, deep horizontal ledges, small window openings',{levels:3,wall:0xc5bfa8,ac:true,windowHeight:1.45}),
  'plan-105': profile(modern,'gl-1-13','low teaching block, pale facade, generous windows and pitched crown',{levels:3,roof:'hip',wall:0xb8bbaa}),
  'plan-106': profile(dorm,'gl-1-24','central residential row, pale plaster and rooftop enclosure'),
  'plan-107': profile(dorm,'gl-1-24','east-side residence named on campus plan; aerial context only, height retains the prior estimate',{levels:2}),
  'plan-110': profile(dorm,'gl-1-22','pale residential tower with narrow windows and AC units',{levels:7,wall:0xc9c7bc}),
  'plan-111': profile(modern,'gl-1-15','bathhouse facade with large blue glazed upper bay and sheltered entry',{levels:3,style:'glass',windowWidth:2.5}),
  'plan-112': profile(dorm,'gl-1-22 / gl-1-24','Taoyuan residential block, pale paint and metal sashes'),
  'plan-113': profile(modern,'gl-1-15','service/commercial podium, horizontal glazing and pale cladding',{levels:3,windowWidth:2.8}),
  'plan-114': profile(modern,'gl-1-10','student centre, broad white balcony bands and shaded openings',{levels:5,wall:0xd4d7cd,balcony:true,windowWidth:2.5}),
  'plan-115': profile(dorm,'gl-1-24','six-storey residence within south-campus row'),
  'plan-116': profile(historic,'gl-1-07','two-storey grey masonry, red windows and central pale portal',{levels:2,roof:'heritage',frame:0x76433d}),
  'plan-118': profile(dorm,'gl-1-24','south-campus residential block with regular grid'),
  'plan-119': profile(dorm,'gl-1-07 / gl-1-24','pale residential row, utility units on facade'),
  'plan-120': profile(modern,'gl-1-23','foreign-teacher apartments, broad blue glazing, deep canopy and pale frame',{levels:6,style:'glass',ac:true,windowWidth:2.6}),
  'plan-122': profile(dorm,'gl-1-14 / gl-1-24','pale dormitory beside southern grounds'),
  'plan-123': profile(dorm,'gl-1-05 / gl-1-12','six-storey cream dormitory, grey plinth; NOT a traditional tiled building',{levels:6,wall:0xcfc9b4,roof:'flat'}),
  'plan-124': profile(dorm,'gl-1-14 / gl-1-24','south-east residential block, regular pale grid'),
  'plan-125': profile(villa,'gl-1-08','memorial compound ancillary building, grey masonry and pitched roof',{wall:0xa39b86}),
  'plan-126': profile(historic,'gl-1-01','Nanyuan hotel: grey masonry, traditional tiled eaves, low entry canopy',{levels:3,roof:'heritage',wall:0x9c9988,windowWidth:1.6}),
  'plan-127': profile(dorm,'gl-1-14 / gl-1-24','southern residential row, beige paint and repetitive sashes'),
  'plan-128': profile(villa,'gl-1-08','Rabe house: grey masonry, pale mouldings and balustraded upper porch',{wall:0x999688,frame:0xd1cbbb,portal:'columns',balcony:true}),
};

export function getBuildingProfile(f: MapFeature): FacadeProfile {
  if (buildingProfiles[f.id]) return buildingProfiles[f.id];
  const base = f.kind === 'dormitory' ? dorm : f.kind === 'historic' ? historic : modern;
  const estimated = Number(f.tags['building:levels']);
  return {...base,levels:Number.isFinite(estimated)&&estimated>0?estimated:base.levels,source:'typology only; individual facade not verified',observations:'shared campus construction details; retain source-plan footprint'};
}
