"""Subset OFL-licensed LXGW WenKai into outlines for the gate's twelve characters.
Run with fontTools installed; full source font stays in assets/source-models/fonts.
"""
import json
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen

font=TTFont('assets/source-models/fonts/LXGWWenKai-Regular.ttf')
glyphset=font.getGlyphSet(); cmap=font.getBestCmap(); scale=1000/font['head'].unitsPerEm
class OutlinePen(BasePen):
    def __init__(self):super().__init__(glyphset);self.commands=[]
    def point(self,p):return [str(round(p[0]*scale,2)),str(round(p[1]*scale,2))]
    def _moveTo(self,p):self.commands+=['m',*self.point(p)]
    def _lineTo(self,p):self.commands+=['l',*self.point(p)]
    def _qCurveToOne(self,c,p):self.commands+=['q',*self.point(p),*self.point(c)]
    def _curveToOne(self,a,b,p):self.commands+=['b',*self.point(p),*self.point(a),*self.point(b)]
    def _closePath(self):pass
    def _endPath(self):pass

glyphs={}
for ch in '南京大学严肃活泼团结紧张':
    name=cmap[ord(ch)];pen=OutlinePen();glyphset[name].draw(pen)
    glyphs[ch]={'ha':round(font['hmtx'][name][0]*scale),'o':' '.join(pen.commands)}
data={'glyphs':glyphs,'familyName':'Gulou Gate Lettering','resolution':1000,'boundingBox':{'yMin':-200,'yMax':1000},'underlineThickness':50,'original_font_information':{'source':'LXGW WenKai Regular; https://github.com/lxgw/LxgwWenKai','license':'SIL OFL 1.1; see OFL.txt','modified':'12-character subset, converted outline coordinates'}}
p=Path('public/assets/fonts/gate-lettering.typeface.json');p.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
print(p,len(p.read_bytes()),'bytes')
