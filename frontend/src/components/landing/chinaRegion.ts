// Generalized geographic land mask, shared by regional fill, points and regression tests.
// Natural Earth public-domain source and included land areas: assets/globe/README.md.
export type RegionPolygons = number[][][][]
export function globePosition(lon: number, lat: number, radius: number): [number, number, number] {
  const longitude = lon * Math.PI / 180, latitude = lat * Math.PI / 180
  return [radius * Math.cos(latitude) * Math.cos(longitude), radius * Math.sin(latitude), radius * Math.cos(latitude) * Math.sin(longitude)]
}
export function createRegionMask(polygons: RegionPolygons) {
  const areas = polygons.map(rings => ({ rings, west: Math.min(...rings[0].map(p=>p[0])), east: Math.max(...rings[0].map(p=>p[0])), south: Math.min(...rings[0].map(p=>p[1])), north: Math.max(...rings[0].map(p=>p[1])) }))
  function inRing(lon: number, lat: number, ring: number[][]) {
    let inside = false
    for (let i=0,j=ring.length-1;i<ring.length;j=i++) {
      const [x,y]=ring[i], [px,py]=ring[j]
      if ((y>lat)!==(py>lat) && lon<(px-x)*(lat-y)/(py-y)+x) inside=!inside
    }
    return inside
  }
  return (lon: number, lat: number) => areas.some(a => lon>=a.west && lon<=a.east && lat>=a.south && lat<=a.north && inRing(lon,lat,a.rings[0]) && !a.rings.slice(1).some(r=>inRing(lon,lat,r)))
}
export function buildChinaHighlight(polygons: RegionPolygons, landPoints: number[]) {
  const inside=createRegionMask(polygons), surface:number[]=[], points:number[]=[], outline:number[]=[]
  // Reuse the existing dot pattern. The fill is a bounded grid with inward coastal cells omitted.
  for(let i=0;i<landPoints.length;i+=2) {
    const lon=landPoints[i]/100,lat=landPoints[i+1]/100
    if(inside(lon,lat)) points.push(...globePosition(lon,lat,1.081))
  }
  const step=.6,west=73,south=17,columns=Math.ceil((136-west)/step),rows=Math.ceil((55-south)/step)
  const grid=Array.from({length:rows+1},(_,y)=>Array.from({length:columns+1},(_,x)=>inside(west+x*step,south+y*step)))
  for(let y=0;y<rows;y++) for(let x=0;x<columns;x++) {
    const a=[west+x*step,south+y*step],b=[a[0]+step,a[1]],c=[a[0],a[1]+step],d=[b[0],c[1]]
    if(grid[y][x]&&grid[y+1][x]&&grid[y][x+1]) for(const p of [a,c,b])surface.push(...globePosition(p[0],p[1],1.074))
    if(grid[y][x+1]&&grid[y+1][x]&&grid[y+1][x+1])for(const p of [b,c,d])surface.push(...globePosition(p[0],p[1],1.074))
  }
  for(const rings of polygons)for(const ring of rings)for(let i=1;i<ring.length;i++) {
    const a=ring[i-1],b=ring[i],count=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.5))
    for(let n=0;n<count;n++)for(const t of [n/count,(n+1)/count])outline.push(...globePosition(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,1.082))
  }
  return {surface:new Float32Array(surface),points:new Float32Array(points),outline:new Float32Array(outline)}
}
