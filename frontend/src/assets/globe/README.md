# Globe geographic source

- Source: Natural Earth `ne_110m_land`, downloaded from the official `nvkelso/natural-earth-vector` repository on 2026-10-13.
- Source URL: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson
- Terms: Natural Earth map data is public domain. https://www.naturalearthdata.com/about/terms-of-use/
- Transformation: deterministic Fibonacci-sphere sampling, filtered against the land polygons, capped at 11,000 points and quantized to 0.01 degree. Antarctica below 72°S is omitted for the Hero composition.
- Files: `land-points.json` contains the generated longitude/latitude pairs; `globe-fallback.svg` is a static orthographic rendering derived from the same points.
- Meaning: these points describe generalized land geometry for a brand visual. They are not emission sites, sensors, observations, customers, or live data.
