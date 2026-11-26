#!/usr/bin/env python3
"""Génère la maquette Lego du quartier des Gratte-Ciel (Villeurbanne) pour events-map.html.

Les bâtiments viennent de la BD TOPO de l'IGN (service WFS de la Géoplateforme) ;
chaque colonne de la grille vaut un tenon, sa hauteur est arrondie en briques.

Usage :
    python3 _tools/lego_gratte_ciel.py            # écrit assets/data/lego-gratte-ciel.json
"""
import json
import math
import urllib.parse
import urllib.request
from pathlib import Path

# Emprise : de l'Hôtel de ville aux tours de l'avenue Henri-Barbusse
LAT0, LAT1 = 45.7640, 45.7712
LON0, LON1 = 4.8752, 4.8848
STUD_M = 4.0                    # 1 tenon = 4 m au sol
BRICK_M = STUD_M * 1.2          # proportions d'une brique Lego (9,6 mm de haut pour 8 mm de pas)
OUT = Path(__file__).resolve().parent.parent / 'assets' / 'data' / 'lego-gratte-ciel.json'


def fetch():
    feats, start = [], 0
    while True:
        q = urllib.parse.urlencode({
            'SERVICE': 'WFS', 'VERSION': '2.0.0', 'REQUEST': 'GetFeature',
            'TYPENAMES': 'BDTOPO_V3:batiment', 'OUTPUTFORMAT': 'application/json',
            'SRSNAME': 'EPSG:4326', 'COUNT': 1000, 'STARTINDEX': start,
            'BBOX': f'{LAT0},{LON0},{LAT1},{LON1},urn:ogc:def:crs:EPSG::4326',
        })
        with urllib.request.urlopen('https://data.geopf.fr/wfs/ows?' + q, timeout=60) as r:
            page = json.load(r)['features']
        feats += page
        if len(page) < 1000:
            return feats
        start += 1000


def inside(x, y, ring):
    c = False
    for i in range(len(ring)):
        x1, y1 = ring[i][:2]
        x2, y2 = ring[i - 1][:2]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


def main():
    feats = fetch()
    k = math.cos(math.radians((LAT0 + LAT1) / 2))
    cols = round((LON1 - LON0) * 111320 * k / STUD_M)
    rows = round((LAT1 - LAT0) * 111320 / STUD_M)
    dlon, dlat = (LON1 - LON0) / cols, (LAT1 - LAT0) / rows
    h = [[0] * cols for _ in range(rows)]
    use = [[0] * cols for _ in range(rows)]
    for f in feats:
        p = f['properties']
        hm = p.get('hauteur') or 0
        if hm <= 0 or not f['geometry']:
            continue
        bricks = max(1, round(hm / BRICK_M))
        cls = 1 if p.get('usage_1') == 'Résidentiel' else 2
        g = f['geometry']
        polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        for poly in polys:
            outer, holes = poly[0], poly[1:]
            xs = [c[0] for c in outer]; ys = [c[1] for c in outer]
            c0 = max(0, int((min(xs) - LON0) / dlon)); c1 = min(cols - 1, int((max(xs) - LON0) / dlon))
            r0 = max(0, int((min(ys) - LAT0) / dlat)); r1 = min(rows - 1, int((max(ys) - LAT0) / dlat))
            for r in range(r0, r1 + 1):
                y = LAT0 + (r + 0.5) * dlat
                for c in range(c0, c1 + 1):
                    x = LON0 + (c + 0.5) * dlon
                    if inside(x, y, outer) and not any(inside(x, y, hl) for hl in holes) and bricks > h[r][c]:
                        h[r][c] = bricks; use[r][c] = cls
    # une chaîne par rangée (sud → nord) : hauteur en base 36, puis classe d'usage (0 vide, 1 logement, 2 autre)
    alpha = '0123456789abcdefghijklmnopqrstuvwxyz'
    data = {
        'source': 'BD TOPO® IGN (Géoplateforme WFS BDTOPO_V3:batiment), voxelisé en briques',
        'lat0': LAT0, 'lon0': LON0, 'lat1': LAT1, 'lon1': LON1,
        'cols': cols, 'rows': rows, 'studM': STUD_M, 'brickM': BRICK_M,
        'heights': [''.join(alpha[min(35, v)] for v in row) for row in h],
        'usage': [''.join(str(v) for v in row) for row in use],
    }
    OUT.write_text(json.dumps(data, separators=(',', ':')))
    n = sum(v for row in h for v in row)
    print(f'{len(feats)} bâtiments → {cols}×{rows} tenons, {n} briques, max {max(max(r) for r in h)} briques → {OUT}')


if __name__ == '__main__':
    main()
