async page => {
  const routes = [
    '/dashboard', '/accounting', '/factorlib', '/gis', '/trajectory', '/grid',
    '/soil', '/sewage', '/asset', '/pcf', '/report', '/tools', '/auth/login', '/auth/register',
  ]
  const results = []
  for (const path of routes) {
    await page.goto(`http://127.0.0.1:4173${path}`)
    await page.waitForTimeout(450)
    results.push(await page.evaluate((route) => ({
      route,
      title: document.title,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      canvases: document.querySelectorAll('canvas').length,
      mainVisible: Boolean(document.querySelector('main, .auth-layout')),
    }), path))
  }
  return results
}
