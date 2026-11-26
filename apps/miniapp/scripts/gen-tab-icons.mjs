// 生成 tabBar 图标（无第三方依赖，纯 Node zlib 编码 PNG）
// 81x81 实心风格：home / vocabulary / progress / profile
// 采用 4x 超采样绘制后再降采样，边缘带抗锯齿，接近 UI 设计稿的实心图标
import { writeFileSync, mkdirSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import path from 'node:path'

const SIZE = 81 // 输出尺寸
const SS = 4 // 超采样倍数
const W = SIZE * SS
const OUT = path.resolve('src/static')
mkdirSync(OUT, { recursive: true })

/* ---------------- PNG 编码 ---------------- */
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
function encodePng(rgba) {
  const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1))
  for (let y = 0; y < SIZE; y++) {
    const row = y * (SIZE * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < SIZE; x++) {
      const i = row + 1 + x * 4
      const p = (y * SIZE + x) * 4
      raw[i] = rgba[p]
      raw[i + 1] = rgba[p + 1]
      raw[i + 2] = rgba[p + 2]
      raw[i + 3] = rgba[p + 3]
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(SIZE, 0)
  ihdr.writeUInt32BE(SIZE, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ---------------- 超采样画布 ---------------- */
// 存预乘 alpha，降采样时不会出现透明边缘发黑
function canvas() {
  return { a: new Float32Array(W * W), r: new Float32Array(W * W), g: new Float32Array(W * W), b: new Float32Array(W * W) }
}
function cover(cv, x, y, color) {
  if (x < 0 || y < 0 || x >= W || y >= W) return
  const i = y * W + x
  cv.a[i] = 1
  cv.r[i] = color[0]
  cv.g[i] = color[1]
  cv.b[i] = color[2]
}
function uncover(cv, x, y) {
  if (x < 0 || y < 0 || x >= W || y >= W) return
  const i = y * W + x
  cv.a[i] = 0
  cv.r[i] = 0
  cv.g[i] = 0
  cv.b[i] = 0
}

// 圆角矩形：design 坐标（0..81）
function roundRect(cv, x0, y0, x1, y1, radius, color, erase = false) {
  const X0 = x0 * SS, Y0 = y0 * SS, X1 = x1 * SS, Y1 = y1 * SS, R = radius * SS
  for (let py = Math.floor(Y0); py < Math.ceil(Y1); py++) {
    for (let px = Math.floor(X0); px < Math.ceil(X1); px++) {
      const cx = Math.min(Math.max(px + 0.5, X0 + R), X1 - R)
      const cy = Math.min(Math.max(py + 0.5, Y0 + R), Y1 - R)
      const dx = px + 0.5 - cx
      const dy = py + 0.5 - cy
      if (dx * dx + dy * dy <= R * R) {
        erase ? uncover(cv, px, py) : cover(cv, px, py, color)
      }
    }
  }
}
function circle(cv, cx, cy, r, color, erase = false) {
  const CX = cx * SS, CY = cy * SS, R = r * SS
  for (let py = Math.floor(CY - R); py <= Math.ceil(CY + R); py++) {
    for (let px = Math.floor(CX - R); px <= Math.ceil(CX + R); px++) {
      const dx = px + 0.5 - CX
      const dy = py + 0.5 - CY
      if (dx * dx + dy * dy <= R * R) {
        erase ? uncover(cv, px, py) : cover(cv, px, py, color)
      }
    }
  }
}
// 半圆（用于人物肩部）
function halfDisc(cv, cx, cy, r, yMin, yMax, color) {
  const CX = cx * SS, CY = cy * SS, R = r * SS
  for (let py = Math.floor(yMin * SS); py <= Math.ceil(yMax * SS); py++) {
    for (let px = Math.floor(CX - R); px <= Math.ceil(CX + R); px++) {
      const dx = px + 0.5 - CX
      const dy = py + 0.5 - CY
      if (dx * dx + dy * dy <= R * R) cover(cv, px, py, color)
    }
  }
}
// 椭圆弧（用于人物肩部：顶部平缓、两侧宽）
function ellipseArc(cv, cx, cy, rx, ry, yMin, yMax, color) {
  const CX = cx * SS, CY = cy * SS, RX = rx * SS, RY = ry * SS
  for (let py = Math.floor(yMin * SS); py <= Math.ceil(yMax * SS); py++) {
    for (let px = Math.floor(CX - RX); px <= Math.ceil(CX + RX); px++) {
      const dx = (px + 0.5 - CX) / RX
      const dy = (py + 0.5 - CY) / RY
      if (dx * dx + dy * dy <= 1) cover(cv, px, py, color)
    }
  }
}

function polygon(cv, pts, color) {
  const P = pts.map(([x, y]) => [x * SS, y * SS])
  let minY = Infinity, maxY = -Infinity
  for (const [, y] of P) { minY = Math.min(minY, y); maxY = Math.max(maxY, y) }
  for (let py = Math.floor(minY); py <= Math.ceil(maxY); py++) {
    const yc = py + 0.5
    const xs = []
    for (let i = 0; i < P.length; i++) {
      const [x1, y1] = P[i]
      const [x2, y2] = P[(i + 1) % P.length]
      if ((y1 <= yc && y2 > yc) || (y2 <= yc && y1 > yc)) {
        xs.push(x1 + ((yc - y1) / (y2 - y1)) * (x2 - x1))
      }
    }
    xs.sort((m, n) => m - n)
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let px = Math.floor(xs[k]); px <= Math.ceil(xs[k + 1]); px++) {
        if (px + 0.5 >= xs[k] && px + 0.5 <= xs[k + 1]) cover(cv, px, py, color)
      }
    }
  }
}

/* ---------------- 图标定义（design 坐标 0..81） ---------------- */
const icons = {
  // 实心房子：屋顶 + 墙体 + 拱形门洞
  home(cv, c) {
    polygon(cv, [[40.5, 7], [2.5, 39.5], [78.5, 39.5]], c)
    roundRect(cv, 13, 33.5, 68, 73, 5, c)
    roundRect(cv, 32.5, 48, 48.5, 77, 8, null, true)
  },
  // 实心翻开的书：左右两页 + 书脊留白 + 文字线
  vocabulary(cv, c) {
    roundRect(cv, 7, 12, 38, 70, 5, c)
    roundRect(cv, 43, 12, 74, 70, 5, c)
    roundRect(cv, 13.5, 24, 31.5, 27.2, 1.6, null, true)
    roundRect(cv, 13.5, 33, 31.5, 36.2, 1.6, null, true)
    roundRect(cv, 13.5, 42, 31.5, 45.2, 1.6, null, true)
    roundRect(cv, 49.5, 24, 67.5, 27.2, 1.6, null, true)
    roundRect(cv, 49.5, 33, 67.5, 36.2, 1.6, null, true)
    roundRect(cv, 49.5, 42, 67.5, 45.2, 1.6, null, true)
  },
  // 实心柱状图：底托 + 三根柱子
  progress(cv, c) {
    roundRect(cv, 8, 62, 73, 71.5, 3.5, c)
    roundRect(cv, 15, 33, 27, 61, 3, c)
    roundRect(cv, 34.5, 17, 46.5, 61, 3, c)
    roundRect(cv, 54, 42.5, 66, 61, 3, c)
  },
  // 实心人物：圆头 + 半圆肩
  profile(cv, c) {
    circle(cv, 40.5, 23.5, 13, c)
    ellipseArc(cv, 40.5, 74, 30, 26, 47, 72.5, c)
  },
}

const GRAY = [156, 158, 167]
const GREEN = [48, 186, 110]

function downscale(cv) {
  const out = Buffer.alloc(SIZE * SIZE * 4)
  const n = SS * SS
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let sa = 0, sr = 0, sg = 0, sb = 0
      for (let dy = 0; dy < SS; dy++) {
        for (let dx = 0; dx < SS; dx++) {
          const i = (y * SS + dy) * W + (x * SS + dx)
          const a = cv.a[i]
          if (a > 0) { sa += a; sr += cv.r[i] * a; sg += cv.g[i] * a; sb += cv.b[i] * a }
        }
      }
      const o = (y * SIZE + x) * 4
      if (sa > 0) {
        out[o] = Math.round(sr / sa)
        out[o + 1] = Math.round(sg / sa)
        out[o + 2] = Math.round(sb / sa)
        out[o + 3] = Math.round((sa / n) * 255)
      }
    }
  }
  return out
}

let count = 0
for (const [name, draw] of Object.entries(icons)) {
  for (const [suffix, color] of [['', GRAY], ['-active', GREEN]]) {
    const cv = canvas()
    draw(cv, color)
    writeFileSync(path.join(OUT, `tab-${name}${suffix}.png`), encodePng(downscale(cv)))
    count++
  }
}
console.log(`Generated ${count} solid tab icons in ${OUT}`)
