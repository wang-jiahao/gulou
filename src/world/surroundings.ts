import type { MapFeature } from './campus-map.ts';

// OSM footprint, ODbL. A nearby skyline reference; facade height is estimated.
export const fireTowerFootprint: MapFeature = {
  "id": "100949347",
  "tags": {
    "name": "消防大厦",
    "building": "yes",
    "gulou:custom-model": "fire-tower",
    "source": "OpenStreetMap way 100949347",
    "confidence": "footprint from OSM; height and facade approximate"
  },
  "points": [
    [
      -47.635,
      -88.735
    ],
    [
      -29.225,
      -77.38
    ],
    [
      -17.245,
      -79.096
    ],
    [
      -7.447,
      -92.261
    ],
    [
      -8.877,
      -106.233
    ],
    [
      -26.607,
      -116.681
    ],
    [
      -37.571,
      -117.855
    ],
    [
      -51.056,
      -98.743
    ],
    [
      -47.635,
      -88.735
    ]
  ]
};
