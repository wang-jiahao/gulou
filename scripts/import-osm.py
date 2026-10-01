"""Project the recorded OSM snapshot into a meter-scale local campus coordinate system.
Output remains ODbL 1.0. Heights and facade details are not implied by this dataset.
"""
import json
import math
from pathlib import Path
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
source = root / 'docs/sources/phase3-campus.osm'
sources = [source] if source.exists() else [root/'docs/sources/core-campus.osm',root/'docs/sources/campus.osm']
xml = ET.Element('osm');elements={}
for source in sources:
    for element in ET.parse(source).getroot():
        if 'id' in element.attrib: elements[(element.tag,element.attrib['id'])]=element
for element in elements.values(): xml.append(element)
nodes = {n.attrib['id']: (float(n.attrib['lat']), float(n.attrib['lon'])) for n in xml.findall('node')}
lat0, lon0, angle = 32.059064, 118.775750, .143
features = []
for way in xml.findall('way'):
    tags = {t.attrib['k']: t.attrib['v'] for t in way.findall('tag')}
    if not any(key in tags for key in ['building', 'highway', 'landuse', 'leisure']):
        continue
    points = []
    for n in way.findall('nd'):
        if n.attrib['ref'] not in nodes:
            continue
        lat, lon = nodes[n.attrib['ref']]
        x = (lon-lon0)*111320*math.cos(math.radians(lat0))
        z = -(lat-lat0)*111320
        points.append([round(x*math.cos(angle)-z*math.sin(angle),2),round(x*math.sin(angle)+z*math.cos(angle),2)])
    if not points or not any(abs(x)<300 and -220<z<300 for x,z in points):
        continue
    features.append({'id':way.attrib['id'],'tags':tags,'points':points})
output = {'origin':[lat0,lon0],'rotation':angle,'license':'ODbL 1.0 © OpenStreetMap contributors','sourceFiles':[p.name for p in sources],'features':features}
(root/'public/data/campus-layout.json').write_text(json.dumps(output,ensure_ascii=False))
print(f'Projected {len(features)} OSM features.')
