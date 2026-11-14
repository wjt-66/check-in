/**
 * PWA 图标生成脚本（纯 Node 实现，不依赖任何第三方图片库）
 * 生成 public/icons 下的 pwa-192x192.png、pwa-512x512.png、apple-touch-icon.png
 * 图案：靛蓝→紫色渐变圆角背景 + 白色对勾
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../public/icons')
mkdirSync(outDir, { recursive: true })

/* ---------- PNG 编码基础 ---------- */
const CRC_TABLE = []
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1
  CRC_TABLE[n] = c >>> 0
}
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const head = Buffer.alloc(4)
  head.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const tail = Buffer.alloc(4)
  tail.writeUInt32BE(crc32(body))
  return Buffer.concat([head, body, tail])
}
function encodePNG(size, pixels) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // 位深
  ihdr[9] = 6 // 颜色类型：RGBA
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0 // 每行 filter: none
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

/* ---------- 绘制 ---------- */
function drawIcon(size) {
  const px = Buffer.alloc(size * size * 4)
  const SS = 3 // 3x3 超采样，让边缘平滑
  const radius = size * 0.22 // 圆角半径
  const stroke = size * 0.075 // 对勾线宽
  const A = [size * 0.3, size * 0.545]
  const B = [size * 0.455, size * 0.7]
  const C = [size * 0.735, size * 0.345]

  const distSeg = (x, y, ax, ay, bx, by) => {
    const dx = bx - ax
    const dy = by - ay
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)))
    return Math.hypot(x - (ax + t * dx), y - (ay + t * dy))
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const cx = x + (sx + 0.5) / SS
          const cy = y + (sy + 0.5) / SS
          // 圆角矩形 SDF（负值在内部）
          const qx = Math.abs(cx - size / 2) - (size / 2 - radius)
          const qy = Math.abs(cy - size / 2) - (size / 2 - radius)
          const dist =
            Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius
          if (dist > 0) continue // 圆角外透明
          a += 255
          const onMark =
            distSeg(cx, cy, A[0], A[1], B[0], B[1]) <= stroke ||
            distSeg(cx, cy, B[0], B[1], C[0], C[1]) <= stroke
          if (onMark) {
            r += 255
            g += 255
            b += 255
          } else {
            // 对角线渐变 #4F46E5 → #A855F7
            const t = (cx + cy) / (2 * size)
            r += 79 + 89 * t
            g += 70 + 15 * t
            b += 229 + 18 * t
          }
        }
      }
      const n = SS * SS
      const i = (y * size + x) * 4
      px[i] = Math.round(r / n)
      px[i + 1] = Math.round(g / n)
      px[i + 2] = Math.round(b / n)
      px[i + 3] = Math.round(a / n)
    }
  }
  return px
}

for (const s of [192, 512, 180]) {
  const name = s === 180 ? 'apple-touch-icon.png' : `pwa-${s}x${s}.png`
  writeFileSync(resolve(outDir, name), encodePNG(s, drawIcon(s)))
  console.log('generated:', name)
}
