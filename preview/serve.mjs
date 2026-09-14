import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml' }

createServer(async (req, res) => {
  try {
    const url = req.url === '/' ? '/post-service-redesign.html' : req.url.split('?')[0]
    const file = normalize(join(root, url))
    if (!file.startsWith(normalize(root))) throw new Error('forbidden')
    const data = await readFile(file)
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' })
    res.end(data)
  } catch {
    res.writeHead(404)
    res.end('Not found')
  }
}).listen(3003, () => console.log('preview on http://localhost:3003'))
