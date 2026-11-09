import {
  AVATAR_DIMENSIONS_ERROR,
  AVATAR_ERROR,
  AVATAR_INVALID_IMAGE,
  AVATAR_MAX_BYTES,
  AVATAR_MAX_SIDE,
  AVATAR_TYPES,
} from './avatar.constants.ts';

const JPEG_FRAME_MARKERS = [
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
];

function maxSide(width: number, height: number): number | undefined {
  return width > 0 && height > 0 ? Math.max(width, height) : undefined;
}

function readPngSize(data: DataView): number | undefined {
  if (data.byteLength < 33 || data.getUint32(0) !== 0x89504e47 || data.getUint32(4) !== 0x0d0a1a0a
    || data.getUint32(8) !== 13 || data.getUint32(12) !== 0x49484452) {
    return undefined;
  }
  return maxSide(data.getUint32(16), data.getUint32(20));
}

/** Ищет кадр JPEG, пропуская сегменты метаданных. */
function readJpegSize(data: DataView): number | undefined {
  if (data.byteLength < 2 || data.getUint16(0) !== 0xffd8) {
    return undefined;
  }
  let offset = 2;
  while (offset < data.byteLength && data.getUint8(offset++) === 0xff) {
    while (offset < data.byteLength && data.getUint8(offset) === 0xff) {
      offset += 1;
    }
    if (offset + 3 > data.byteLength) {
      return undefined;
    }
    const marker = data.getUint8(offset++);
    if (marker === 0xda || marker === 0xd9 || marker === 0) {
      return undefined;
    }
    const length = data.getUint16(offset);
    if (length < 2 || offset + length > data.byteLength) {
      return undefined;
    }
    if (JPEG_FRAME_MARKERS.includes(marker)) {
      return length >= 8 ? maxSide(data.getUint16(offset + 5), data.getUint16(offset + 3)) : undefined;
    }
    offset += length;
  }
  return undefined;
}

function readUint24(data: DataView, offset: number): number {
  return data.getUint16(offset, true) + data.getUint8(offset + 2) * 65536;
}

/** Проверяет размеры холста и закодированных кадров WebP. */
function readWebpChunks(data: DataView, start: number, end: number, frame = false): number | undefined {
  let largest = 0;
  let hasImage = false;
  let offset = start;
  while (offset + 8 <= end) {
    const type = data.getUint32(offset);
    const length = data.getUint32(offset + 4, true);
    const body = offset + 8;
    offset = body + length + (length % 2);
    if (offset > end) {
      return undefined;
    }

    let size: number | undefined;
    switch (type) {
      case 0x56503858: // VP8X
        if (frame || length !== 10) {
          return undefined;
        }
        size = maxSide(readUint24(data, body + 4) + 1, readUint24(data, body + 7) + 1);
        break;
      case 0x56503820: // VP8
        if (length < 10 || (data.getUint8(body) & 1) !== 0
          || data.getUint8(body + 3) !== 0x9d || data.getUint16(body + 4) !== 0x012a) {
          return undefined;
        }
        size = maxSide(data.getUint16(body + 6, true) & 0x3fff, data.getUint16(body + 8, true) & 0x3fff);
        hasImage = true;
        break;
      case 0x5650384c: { // VP8L
        if (length < 5 || data.getUint8(body) !== 0x2f) {
          return undefined;
        }
        const bits = data.getUint32(body + 1, true);
        size = maxSide((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
        hasImage = true;
        break;
      }
      case 0x414e4d46: { // ANMF
        if (frame || length < 16) {
          return undefined;
        }
        const image = readWebpChunks(data, body + 16, body + length, true);
        if (image === undefined) {
          return undefined;
        }
        size = Math.max(image, readUint24(data, body + 6) + 1, readUint24(data, body + 9) + 1);
        hasImage = true;
        break;
      }
      default:
        continue;
    }
    if (size === undefined) {
      return undefined;
    }
    largest = Math.max(largest, size);
  }
  return hasImage && offset === end ? largest : undefined;
}

function readWebpSize(data: DataView): number | undefined {
  if (data.byteLength < 12 || data.getUint32(0) !== 0x52494646 || data.getUint32(8) !== 0x57454250) {
    return undefined;
  }
  const end = 8 + data.getUint32(4, true);
  return end <= data.byteLength ? readWebpChunks(data, 12, end) : undefined;
}

/** Проверяет тип, вес и размеры аватара до декодирования. */
export async function validateAvatar(file: File): Promise<string | null> {
  if (!AVATAR_TYPES.includes(file.type) || file.size > AVATAR_MAX_BYTES) {
    return AVATAR_ERROR;
  }
  try {
    const data = new DataView(await file.arrayBuffer());
    const size = file.type === 'image/png' ? readPngSize(data)
      : file.type === 'image/jpeg' ? readJpegSize(data) : readWebpSize(data);
    if (size === undefined) {
      return AVATAR_INVALID_IMAGE;
    }
    return size > AVATAR_MAX_SIDE ? AVATAR_DIMENSIONS_ERROR : null;
  } catch {
    return AVATAR_INVALID_IMAGE;
  }
}
