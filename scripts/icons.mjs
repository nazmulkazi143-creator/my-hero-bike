import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)('playwright')
import { readFileSync } from 'node:fs'
const svg = readFileSync(new URL('../public/icons/favicon.svg', import.meta.url), 'utf8')
const b = await chromium.launch()
const render = async (size, name, pad = 0) => {
  const p = await b.newPage({ viewport: { width: size, height: size } })
  const inner = size - pad * 2
  await p.setContent(`<body style="margin:0;background:#0a1226;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</body>`)
  await p.screenshot({ path: new URL(`../public/icons/${name}`, import.meta.url).pathname })
  await p.close()
}
await render(192, 'icon-192.png')
await render(512, 'icon-512.png')
await render(512, 'icon-maskable-512.png', 56)
await b.close()
