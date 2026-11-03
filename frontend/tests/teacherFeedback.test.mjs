import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRegionMask, buildChinaHighlight, globePosition } from '../src/components/landing/chinaRegion.ts'
const region=JSON.parse(readFileSync(new URL('../src/assets/globe/china-region.json',import.meta.url),'utf8'))
test('Regional highlight includes mainland, Hainan, Taiwan and Hong Kong/Macao geometries',()=>{
 const inside=createRegionMask(region.coordinates)
 for(const point of [[116.4,39.9],[87.6,43.8],[91.1,29.65],[110.35,19.2],[121,23.7],[114.15,22.4],[113.54,22.22]])assert.equal(inside(...point),true,point.join(','))
 for(const point of [[139.7,35.7],[127,37],[85,20],[0,0]])assert.equal(inside(...point),false,point.join(','))
 assert.ok(Math.abs(Math.hypot(...globePosition(116.4,39.9,1.08))-1.08)<1e-12)
})
test('Regional geometry stays finite and uses outward surface triangles on the original globe',()=>{
 const points=JSON.parse(readFileSync(new URL('../src/assets/globe/land-points.json',import.meta.url),'utf8'))
 const model=buildChinaHighlight(region.coordinates,points)
 assert.ok(model.surface.length>0&&model.points.length>0&&model.outline.length>0)
 assert.equal(model.surface.length%9,0);assert.equal(model.outline.length%6,0)
 for(const values of Object.values(model))assert.ok(values.every(Number.isFinite))
 for(let i=0;i<model.surface.length;i+=9){
  const [ax,ay,az,bx,by,bz,cx,cy,cz]=model.surface.slice(i,i+9)
  const ux=bx-ax,uy=by-ay,uz=bz-az,vx=cx-ax,vy=cy-ay,vz=cz-az
  assert.ok((uy*vz-uz*vy)*ax+(uz*vx-ux*vz)*ay+(ux*vy-uy*vx)*az>0)
 }
 const source=readFileSync(new URL('../src/components/landing/PointCloudGlobe.vue',import.meta.url),'utf8')
 assert.doesNotMatch(source,/chinaMarker|chinaAnchor|北京定位/)
 assert.match(source,/buildChinaHighlight/)
})
test('Existing headline text and breaks retained with smaller bounded typography',()=>{
 const source=readFileSync(new URL('../src/components/landing/LandingHero.vue',import.meta.url),'utf8')
 assert.match(source,/看清排放<br \/>理解空间<br \/>让决策有据/)
 assert.match(source,/clamp\(40px, 4.6vw, 66px\)/)
})
