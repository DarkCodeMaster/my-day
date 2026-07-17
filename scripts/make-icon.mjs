// 从 public/sun.png 生成 Windows 打包用的 build/icon.ico
// 1. 裁剪为正方形（居中） 2. 导出 256x256 PNG 3. 转换为 ICO
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
image.resize({ w: 256, h: 256 });

fs.mkdirSync(outDir, { recursive: true });
await image.write(pngOut);

const ico = await pngToIco([pngOut]);
fs.writeFileSync(icoOut, ico);

console.log(`icon.png written: ${pngOut}`);
console.log(`icon.ico written: ${icoOut}`);
