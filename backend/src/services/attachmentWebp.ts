import sharp from 'sharp';

/** สอดคล้อง docs/MEDIA_WEBP_POLICY.md */
export const ATTACHMENT_WEBP_QUALITY = 82;
export const ATTACHMENT_MAX_DIMENSION = 2048;

const RASTER_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/tiff',
  'image/avif',
]);

export function isRasterImageMime(mime: string): boolean {
  return RASTER_MIMES.has(mime);
}

/**
 * แปลง buffer รูป raster → WebP (rotate ตาม EXIF, ย่อด้านยาวไม่เกิน ATTACHMENT_MAX_DIMENSION)
 */
export async function rasterBufferToWebp(buffer: Buffer): Promise<Buffer> {
  let pipeline = sharp(buffer, { failOn: 'none' }).rotate();
  const meta = await pipeline.metadata();
  const w = meta.width;
  const h = meta.height;
  if (w && h && (w > ATTACHMENT_MAX_DIMENSION || h > ATTACHMENT_MAX_DIMENSION)) {
    if (w >= h) {
      pipeline = pipeline.resize({ width: ATTACHMENT_MAX_DIMENSION, withoutEnlargement: true });
    } else {
      pipeline = pipeline.resize({ height: ATTACHMENT_MAX_DIMENSION, withoutEnlargement: true });
    }
  }
  return pipeline.webp({ quality: ATTACHMENT_WEBP_QUALITY }).toBuffer();
}
