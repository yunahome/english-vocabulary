// 生成 tabBar 图标（无第三方依赖，纯 Node zlib 编码 PNG）
// 81x81，线性图标：home / vocabulary / progress / profile
import { writeFileSync, mkdirSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import path from 'node:path'

const SIZE = 81
const OUT = path.resolve('src/static')
mkdirSync(OUT, { recursive: true })

function crc32(buf) {
  let c = ~0
  for (const b of buf) {
    c ^= b
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crc])
}
function png(pixels) {
  const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1))
  for (let y = 0; y < SIZE; y++) {
    const row = y * (SIZE * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < SIZE; x++) {
      const i = row + 1 + x * 4
      const p = pixels[y * SIZE + x]
      raw[i] = p[0]; raw[i + 1] = p[1]; raw[i + 2] = p[2]; raw[i + 3] = p[3]
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(SIZE, 0); ihdr.writeUInt32BE(SIZE, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function canvas() {
  return Array.from({ length: SIZE * SIZE }, () => [0, 0, 0, 0])
}
function set(px, x, y, color) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return
  px[y * SIZE + x] = [...color, 255]
}
function line(px, x0, y0, x1, y1, color, w = 3) {
  const dx = x1 - x0, dy = y1 - y0
  const steps = Math.max(Math.abs(dx), Math.abs(dy)) * 2
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x0 + (dx * i) / steps)
    const y = Math.round(y0 + (dy * i) / steps)
    for (let a = -w; a <= w; a++) for (let b = -w; b <= w; b++) set(px, x + a, y + b, color)
  }
}
function rect(px, x0, y0, x1, y1, color, w = 3) {
  line(px, x0, y0, x1, y0, color, w)
  line(px, x1, y0, x1, y1, color, w)
  line(px, x1, y1, x0, y1, color, w)
  line(px, x0, y1, x0, y0, color, w)
}
function circle(px, cx, cy, r, color, w = 3) {
  for (let a = 0; a < 360; a += 2) {
    const rad = (a * Math.PI) / 180
    for (let t = -w; t <= w; t++) {
      set(px, Math.round(cx + (r + t) * Math.cos(rad)), Math.round(cy + (r + t) * Math.sin(rad)), color)
    }
  }
}
function disc(px, cx, cy, r, color) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    if (x * x + y * y <= r * r) set(px, cx + x, cy + y, color)
  }
}

const icons = {
  home(px, c) {
    line(px, 16, 40, 40, 16, c, 3)
    line(px, 40, 16, 64, 40, c, 3)
    rect(px, 23, 38, 57, 66, c, 3)
    rect(px, 36, 52, 44, 66, c, 2)
  },
  vocabulary(px, c) {
    rect(px, 14, 18, 36, 64, c, 3)
    rect(px, 45, 18, 67, 64, c, 3)
    line(px, 36, 22, 36, 60, c, 2)
    line(px, 19, 30, 31, 30, c, 2)
    line(px, 50, 30, 62, 30, c, 2)
  },
  progress(px, c) {
    line(px, 20, 66, 20, 44, c, 4)
    line(px, 40, 66, 40, 30, c, 4)
    line(px, 60, 66, 60, 50, c, 4)
    line(px, 14, 68, 68, 68, c, 2)
  },
  profile(px, c) {
    disc(px, 40, 28, 12, c)
    for (let a = 180; a <= 360; a += 2) {
      const rad = (a * Math.PI) / 180
      for (let t = -3; t <= 3; t++) {
        set(px, Math.round(40 + (24 + t) * Math.cos(rad)), Math.round(62 + (24 + t) * Math.sin(rad)), c)
      }
    }
  },
}

const GRAY = [154, 154, 154]
const GREEN = [76, 175, 125]
for (const [name, draw] of Object.entries(icons)) {
  for (const [suffix, color] of [['', GRAY], ['-active', GREEN]]) {
    const px = canvas()
    draw(px, color)
    writeFileSync(path.join(OUT, `tab-${name}${suffix}.png`), png(px))
  }
}
console.log('Generated 8 tab icons in', OUT)
