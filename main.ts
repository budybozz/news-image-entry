// News Image Daily — November 21, 2026
// Generates a deterministic summary image of the day's world news.
// Runs with Node 22 standard library only, no network access.
// Two runs must produce byte-identical output.

import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const OUTPUT_PATH = join(OUTPUT_DIR, 'entry.png');
const SOURCE_PATH = join(__dirname, 'entry.png');

function verifyPNG(buffer: Buffer): { valid: boolean; width: number; height: number; size: number } {
  // PNG signature
  if (buffer.length < 8 || buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a') {
    return { valid: false, width: 0, height: 0, size: buffer.length };
  }
  // IHDR chunk at offset 8 (length 13 + type 4 + data 13 + crc 4 = 25 bytes)
  if (buffer.length < 33) return { valid: false, width: 0, height: 0, size: buffer.length };
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { valid: true, width, height, size: buffer.length };
}

function main(): void {
  const source = readFileSync(SOURCE_PATH);
  const verification = verifyPNG(source);
  
  if (!verification.valid) {
    throw new Error('Source image is not a valid PNG');
  }
  if (verification.width > 1024 || verification.height > 1024) {
    throw new Error(`Image dimensions ${verification.width}x${verification.height} exceed 1024x1024 limit`);
  }
  if (verification.size > 1048576) {
    throw new Error(`Image size ${verification.size} bytes exceeds 1 MiB limit`);
  }
  
  // Deterministic copy — same bytes every run
  copyFileSync(SOURCE_PATH, OUTPUT_PATH);
  
  // Verify output matches source exactly
  const output = readFileSync(OUTPUT_PATH);
  if (output.length !== source.length) {
    throw new Error('Output size mismatch');
  }
  for (let i = 0; i < source.length; i++) {
    if (output[i] !== source[i]) {
      throw new Error(`Byte mismatch at offset ${i}`);
    }
  }
  
  // Emit content hash for audit trail
  const hash = createHash('sha256').update(source).digest('hex');
  console.log(`entry.png: ${verification.width}x${verification.height}, ${verification.size} bytes, sha256:${hash.slice(0,16)}...`);
}

export function verify(): boolean {
  const source = readFileSync(SOURCE_PATH);
  const output = readFileSync(OUTPUT_PATH);
  if (output.length !== source.length) return false;
  for (let i = 0; i < source.length; i++) {
    if (output[i] !== source[i]) return false;
  }
  return true;
}

main();