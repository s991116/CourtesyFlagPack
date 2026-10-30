/**
 * Baseline JPEG with four components, one sample per pixel.
 * Stored the way a CMYK JPEG is stored: 0 is full ink and 255 is none.
 * jsPDF then sets Decode [1 0 1 0 1 0 1 0], which turns that back into
 * PDF ink (0 = none, 1 = full).
 *
 * The Huffman and quantisation tables are the ones in the JPEG standard.
 * Every component uses the luminance tables, at 4:4:4.
 */

const zigzag = [
  0, 1, 5, 6, 14, 15, 27, 28,
  2, 4, 7, 13, 16, 26, 29, 42,
  3, 8, 12, 17, 25, 30, 41, 43,
  9, 11, 18, 24, 31, 40, 44, 53,
  10, 19, 23, 32, 39, 45, 52, 54,
  20, 22, 33, 38, 46, 51, 55, 60,
  21, 34, 37, 47, 50, 56, 59, 61,
  35, 36, 48, 49, 57, 58, 62, 63,
];

const dcCounts = [0, 0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0];
const dcValues = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const acCounts = [0, 0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 0x7d];
const acValues = [
  0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12,
  0x21, 0x31, 0x41, 0x06, 0x13, 0x51, 0x61, 0x07,
  0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08,
  0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0,
  0x24, 0x33, 0x62, 0x72, 0x82, 0x09, 0x0a, 0x16,
  0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28,
  0x29, 0x2a, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39,
  0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49,
  0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
  0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69,
  0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79,
  0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
  0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98,
  0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7,
  0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6,
  0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5,
  0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4,
  0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2,
  0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea,
  0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8,
  0xf9, 0xfa,
];

const quantBase = [
  16, 11, 10, 16, 24, 40, 51, 61,
  12, 12, 14, 19, 26, 58, 60, 55,
  14, 13, 16, 24, 40, 57, 69, 56,
  14, 17, 22, 29, 51, 87, 80, 62,
  18, 22, 37, 56, 68, 109, 103, 77,
  24, 35, 55, 64, 81, 104, 113, 92,
  49, 64, 78, 87, 103, 121, 120, 101,
  72, 92, 95, 98, 112, 100, 103, 99,
];

const aan = [
  1, 1.387039845, 1.306562965, 1.175875602,
  1, 0.785694958, 0.5411961, 0.275899379,
];

type Code = { value: number; length: number };

/**
 * `ink` is width × height × 4 bytes, CMYK, 0 = no ink and 255 = full.
 */
export function encodeCmykJpeg(
  width: number,
  height: number,
  ink: Uint8Array,
  quality = 90,
): Uint8Array {
  if (width < 1 || height < 1) throw new Error("Could not encode an empty flag image");
  if (ink.length < width * height * 4) throw new Error("Could not encode the flag image");

  const scale = quality < 50 ? Math.floor(5000 / Math.max(1, quality)) : Math.floor(200 - quality * 2);
  const quant = new Uint8Array(64);
  const factor = new Float64Array(64);
  for (let i = 0; i < 64; i += 1) {
    quant[zigzag[i]] = Math.min(255, Math.max(1, Math.floor((quantBase[i] * scale + 50) / 100)));
  }
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const index = row * 8 + col;
      factor[index] = 1 / (quant[zigzag[index]] * aan[row] * aan[col] * 8);
    }
  }

  const dcTable = huffman(dcCounts, dcValues);
  const acTable = huffman(acCounts, acValues);
  const category = new Int16Array(65536);
  const bitValue = new Int32Array(65536);
  const bitLength = new Uint8Array(65536);
  let lower = 1;
  let upper = 2;
  for (let cat = 1; cat <= 15; cat += 1) {
    for (let nr = lower; nr < upper; nr += 1) {
      category[32767 + nr] = cat;
      bitValue[32767 + nr] = nr;
      bitLength[32767 + nr] = cat;
    }
    for (let nr = -(upper - 1); nr <= -lower; nr += 1) {
      category[32767 + nr] = cat;
      bitValue[32767 + nr] = upper - 1 + nr;
      bitLength[32767 + nr] = cat;
    }
    lower <<= 1;
    upper <<= 1;
  }

  const bytes: number[] = [];
  let acc = 0;
  // Next free bit, from 7 (empty) down to 0. A finished byte resets it to 7.
  let accBits = 7;
  const writeBits = (value: number, length: number) => {
    let pos = length - 1;
    while (pos >= 0) {
      if (value & (1 << pos)) acc |= 1 << accBits;
      pos -= 1;
      accBits -= 1;
      if (accBits < 0) {
        bytes.push(acc);
        if (acc === 0xff) bytes.push(0);
        accBits = 7;
        acc = 0;
      }
    }
  };
  const writeByte = (value: number) => bytes.push(value & 255);
  const writeWord = (value: number) => {
    writeByte(value >> 8);
    writeByte(value);
  };

  writeWord(0xffd8);
  writeWord(0xffe0);
  writeWord(16);
  bytes.push(0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0);
  writeWord(1);
  writeWord(1);
  bytes.push(0, 0);
  // Adobe marker, colour transform 0: four components are CMYK, not YCCK.
  writeWord(0xffee);
  writeWord(14);
  bytes.push(0x41, 0x64, 0x6f, 0x62, 0x65, 0, 100, 0, 0, 0, 0, 0);

  writeWord(0xffdb);
  writeWord(67);
  writeByte(0);
  for (let i = 0; i < 64; i += 1) writeByte(quant[i]);

  writeWord(0xffc0);
  writeWord(8 + 3 * 4);
  writeByte(8);
  writeWord(height);
  writeWord(width);
  writeByte(4);
  for (let channel = 1; channel <= 4; channel += 1) {
    writeByte(channel);
    writeByte(0x11);
    writeByte(0);
  }

  writeWord(0xffc4);
  writeWord(2 + 17 + dcValues.length + 17 + acValues.length);
  writeByte(0);
  for (let i = 1; i <= 16; i += 1) writeByte(dcCounts[i]);
  for (const value of dcValues) writeByte(value);
  writeByte(0x10);
  for (let i = 1; i <= 16; i += 1) writeByte(acCounts[i]);
  for (const value of acValues) writeByte(value);

  writeWord(0xffda);
  writeWord(6 + 2 * 4);
  writeByte(4);
  for (let channel = 1; channel <= 4; channel += 1) {
    writeByte(channel);
    writeByte(0);
  }
  bytes.push(0, 0x3f, 0);

  const block = new Float64Array(64);
  const quantised = new Int16Array(64);
  const ordered = new Int16Array(64);
  const dc = [0, 0, 0, 0];
  const eob = acTable[0x00];
  const zrl = acTable[0xf0];

  for (let y = 0; y < height; y += 8) {
    for (let x = 0; x < width; x += 8) {
      for (let channel = 0; channel < 4; channel += 1) {
        for (let pos = 0; pos < 64; pos += 1) {
          const col = pos & 7;
          const row = pos >> 3;
          const sx = Math.min(width - 1, x + col);
          const sy = Math.min(height - 1, y + row);
          const sample = ink[(sy * width + sx) * 4 + channel];
          block[pos] = 255 - sample - 128;
        }
        dctQuant(block, factor, quantised);
        for (let i = 0; i < 64; i += 1) ordered[zigzag[i]] = quantised[i];
        const diff = ordered[0] - dc[channel];
        dc[channel] = ordered[0];
        if (diff === 0) writeBits(dcTable[0].value, dcTable[0].length);
        else {
          const index = 32767 + diff;
          writeBits(dcTable[category[index]].value, dcTable[category[index]].length);
          writeBits(bitValue[index], bitLength[index]);
        }
        let end = 63;
        while (end > 0 && ordered[end] === 0) end -= 1;
        if (end === 0) {
          writeBits(eob.value, eob.length);
          continue;
        }
        let i = 1;
        while (i <= end) {
          const start = i;
          while (ordered[i] === 0 && i <= end) i += 1;
          let zeros = i - start;
          if (zeros >= 16) {
            const runs = zeros >> 4;
            for (let run = 0; run < runs; run += 1) writeBits(zrl.value, zrl.length);
            zeros &= 15;
          }
          const index = 32767 + ordered[i];
          const symbol = (zeros << 4) + category[index];
          writeBits(acTable[symbol].value, acTable[symbol].length);
          writeBits(bitValue[index], bitLength[index]);
          i += 1;
        }
        if (end !== 63) writeBits(eob.value, eob.length);
      }
    }
  }

  if (accBits !== 7) {
    const fill = accBits + 1;
    writeBits((1 << fill) - 1, fill);
  }
  writeWord(0xffd9);
  return Uint8Array.from(bytes);
}

function huffman(counts: number[], values: number[]): Code[] {
  const table: Code[] = [];
  let code = 0;
  let index = 0;
  for (let length = 1; length <= 16; length += 1) {
    for (let n = 0; n < counts[length]; n += 1) {
      table[values[index]] = { value: code, length };
      index += 1;
      code += 1;
    }
    code <<= 1;
  }
  return table;
}

function dctQuant(data: Float64Array, factor: Float64Array, out: Int16Array): void {
  for (let row = 0; row < 8; row += 1) {
    const offset = row * 8;
    const d0 = data[offset];
    const d1 = data[offset + 1];
    const d2 = data[offset + 2];
    const d3 = data[offset + 3];
    const d4 = data[offset + 4];
    const d5 = data[offset + 5];
    const d6 = data[offset + 6];
    const d7 = data[offset + 7];
    const tmp0 = d0 + d7;
    const tmp7 = d0 - d7;
    const tmp1 = d1 + d6;
    const tmp6 = d1 - d6;
    const tmp2 = d2 + d5;
    const tmp5 = d2 - d5;
    const tmp3 = d3 + d4;
    const tmp4 = d3 - d4;
    const tmp10 = tmp0 + tmp3;
    const tmp13 = tmp0 - tmp3;
    const tmp11 = tmp1 + tmp2;
    const tmp12 = tmp1 - tmp2;
    data[offset] = tmp10 + tmp11;
    data[offset + 4] = tmp10 - tmp11;
    const z1 = (tmp12 + tmp13) * 0.707106781;
    data[offset + 2] = tmp13 + z1;
    data[offset + 6] = tmp13 - z1;
    const sum45 = tmp4 + tmp5;
    const sum56 = tmp5 + tmp6;
    const sum67 = tmp6 + tmp7;
    const z5 = (sum45 - sum67) * 0.382683433;
    const z2 = 0.5411961 * sum45 + z5;
    const z4 = 1.306562965 * sum67 + z5;
    const z3 = sum56 * 0.707106781;
    const z11 = tmp7 + z3;
    const z13 = tmp7 - z3;
    data[offset + 5] = z13 + z2;
    data[offset + 3] = z13 - z2;
    data[offset + 1] = z11 + z4;
    data[offset + 7] = z11 - z4;
  }
  for (let col = 0; col < 8; col += 1) {
    const d0 = data[col];
    const d1 = data[col + 8];
    const d2 = data[col + 16];
    const d3 = data[col + 24];
    const d4 = data[col + 32];
    const d5 = data[col + 40];
    const d6 = data[col + 48];
    const d7 = data[col + 56];
    const tmp0 = d0 + d7;
    const tmp7 = d0 - d7;
    const tmp1 = d1 + d6;
    const tmp6 = d1 - d6;
    const tmp2 = d2 + d5;
    const tmp5 = d2 - d5;
    const tmp3 = d3 + d4;
    const tmp4 = d3 - d4;
    const tmp10 = tmp0 + tmp3;
    const tmp13 = tmp0 - tmp3;
    const tmp11 = tmp1 + tmp2;
    const tmp12 = tmp1 - tmp2;
    data[col] = tmp10 + tmp11;
    data[col + 32] = tmp10 - tmp11;
    const z1 = (tmp12 + tmp13) * 0.707106781;
    data[col + 16] = tmp13 + z1;
    data[col + 48] = tmp13 - z1;
    const sum45 = tmp4 + tmp5;
    const sum56 = tmp5 + tmp6;
    const sum67 = tmp6 + tmp7;
    const z5 = (sum45 - sum67) * 0.382683433;
    const z2 = 0.5411961 * sum45 + z5;
    const z4 = 1.306562965 * sum67 + z5;
    const z3 = sum56 * 0.707106781;
    const z11 = tmp7 + z3;
    const z13 = tmp7 - z3;
    data[col + 40] = z13 + z2;
    data[col + 24] = z13 - z2;
    data[col + 8] = z11 + z4;
    data[col + 56] = z11 - z4;
  }
  for (let i = 0; i < 64; i += 1) {
    const value = data[i] * factor[i];
    out[i] = value > 0 ? (value + 0.5) | 0 : (value - 0.5) | 0;
  }
}
