# ttf2typeface.py — convert the glyphs needed from a TTF into a three.js typeface JSON (FontLoader format).
import json, sys
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.basePen import decomposeQuadraticSegment, decomposeSuperBezierSegment
src, out, chars = sys.argv[1], sys.argv[2], sys.argv[3]
f = TTFont(src); gs = f.getGlyphSet(); cmap = f.getBestCmap(); upm = f['head'].unitsPerEm
r = lambda v: round(v, 1)
glyphs = {}
for ch in sorted(set(chars)):
    gn = cmap.get(ord(ch))
    if gn is None: print('missing', ch); continue
    pen = DecomposingRecordingPen(gs); gs[gn].draw(pen)
    o, cur = [], None
    for op, args in pen.value:
        if op == 'moveTo': o += ['m', r(args[0][0]), r(args[0][1])]; cur = args[0]
        elif op == 'lineTo': o += ['l', r(args[0][0]), r(args[0][1])]; cur = args[0]
        elif op == 'qCurveTo':
            pts = list(args)
            if pts[-1] is None: pts = pts[:-1]   # all off-curve closed contour (rare)
            for c, e in decomposeQuadraticSegment(pts): o += ['q', r(e[0]), r(e[1]), r(c[0]), r(c[1])]; cur = e
        elif op == 'curveTo':
            for c1, c2, e in decomposeSuperBezierSegment(list(args)): o += ['b', r(e[0]), r(e[1]), r(c1[0]), r(c1[1]), r(c2[0]), r(c2[1])]; cur = e
        elif op == 'closePath' or op == 'endPath': o += ['z']
    g = gs[gn]; xs = [v for i, v in enumerate(o) if isinstance(v, float) and False]
    glyphs[ch] = {'ha': g.width, 'x_min': 0, 'x_max': g.width, 'o': ' '.join(str(v) for v in o)}
hhea = f['hhea']; head = f['head']
data = {'glyphs': glyphs, 'familyName': f['name'].getDebugName(1), 'ascender': hhea.ascent, 'descender': hhea.descent,
        'underlinePosition': f['post'].underlinePosition, 'underlineThickness': f['post'].underlineThickness,
        'boundingBox': {'xMin': head.xMin, 'yMin': head.yMin, 'xMax': head.xMax, 'yMax': head.yMax}, 'resolution': upm,
        'original_font_information': {'format': 0, 'fontFamily': f['name'].getDebugName(1)}}
json.dump(data, open(out, 'w'), ensure_ascii=False)
print('glyphs', len(glyphs), 'upm', upm)
