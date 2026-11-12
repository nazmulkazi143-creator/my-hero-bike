// Injects the list of built files into dist/sw.js so everything is cached on first load.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { createHash } from 'node:crypto'

const dist = new URL('../dist/', import.meta.url).pathname
const files = []
const walk = (d) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f)
    if (statSync(p).isDirectory()) walk(p)
    else files.push(relative(dist, p))
  }
}
walk(dist)
const list = files.filter((f) => f !== 'sw.js').map((f) => './' + f)
list.push('./')
const hash = createHash('sha1')
for (const f of files.filter((f) => f !== 'sw.js').sort()) hash.update(f).update(readFileSync(join(dist, f)))
const sw = readFileSync(join(dist, 'sw.js'), 'utf8')
  .replace('__PRECACHE__', JSON.stringify(list))
  .replace('__VERSION__', hash.digest('hex').slice(0, 10))
writeFileSync(join(dist, 'sw.js'), sw)
console.log(`sw.js: precaching ${list.length} files`)
