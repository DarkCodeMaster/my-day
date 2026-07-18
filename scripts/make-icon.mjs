// 从 public/sun.png 生成打包图标
// 1. 裁剪为正方形（居中）
// 2. 导出 512x512 PNG（mac 打包要求 ≥512x512）
// 3. 导出 256x256 ICO（Windows 打包用）
import { Jimp } from 'jimp';
import pngToIco from 'png-to-ico';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(__dirname, '../public/sun.png');
const outDir = path.join(__dirname, '../build');
const pngOut = path.join(outDir, 'icon.png');
const icoOut = path.join(outDir, 'icon.ico');

const image = await Jimp.read(src);
const { width, height } = image.bitmap;
const side = Math.min(width, height);
const x = Math.floor((width - side) / 2);
const y = Math.floor((height - side) / 2);
image.crop({ x, y, w: side, h: side });

fs.mkdirSync(outDir, { recursive: true });

// mac 用 512x512 PNG
const pngImage = image.clone().resize({ w: 512, h: 512 });
await pngImage.write(pngOut);

// Windows 用 256x256 ICO
const icoImage = image.clone().resize({ w: 256, h: 256 });
const icoPngBuffer = await icoImage.getBuffer('image/png');
const ico = await pngToIco([icoPngBuffer]);
fs.writeFileSync(icoOut, ico);

console.log(`icon.png written: ${pngOut} (512x512)`);
console.log(`icon.ico written: ${icoOut} (256x256)`);
