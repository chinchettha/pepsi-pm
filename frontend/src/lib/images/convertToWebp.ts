/**
 * แปลงรูป raster → WebP ในเบราว์เซอร์ (Canvas) ก่อนส่ง `FormData` / `fetch`
 * สอดคล้อง docs/MEDIA_WEBP_POLICY.md — ค่าเริ่มต้น quality / ขนาดสอด backend `attachmentWebp.ts`
 */
export const DEFAULT_WEBP_QUALITY = 0.82;
export const DEFAULT_MAX_DIMENSION = 2048;

export class WebpEncodeUnsupportedError extends Error {
  constructor(message = 'Browser cannot encode image/webp (toBlob returned null or unsupported)') {
    super(message);
    this.name = 'WebpEncodeUnsupportedError';
  }
}

/** ตรวจว่าเบราว์เซอร์ encode WebP ได้หรือไม่ (Safari รุ่นเก่าอาจ false) */
export function canEncodeWebp(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }
  const c = document.createElement('canvas');
  c.width = 1;
  c.height = 1;
  const dataUrl = c.toDataURL('image/webp');
  return dataUrl.startsWith('data:image/webp');
}

export async function convertFileToWebp(
  file: File,
  options?: { quality?: number; maxDimension?: number }
): Promise<Blob> {
  const blob = new Blob([await file.arrayBuffer()], { type: file.type || 'application/octet-stream' });
  return convertImageBlobToWebp(blob, options);
}

/**
 * @param quality 0–1 ส่งต่อให้ `canvas.toBlob` (เช่น 0.82)
 */
export async function convertImageBlobToWebp(
  blob: Blob,
  options?: { quality?: number; maxDimension?: number }
): Promise<Blob> {
  const quality = options?.quality ?? DEFAULT_WEBP_QUALITY;
  const maxDimension = options?.maxDimension ?? DEFAULT_MAX_DIMENSION;

  if (!canEncodeWebp()) {
    throw new WebpEncodeUnsupportedError();
  }

  const bmp = await createImageBitmap(blob);
  try {
    const { width, height } = bmp;
    let dw = width;
    let dh = height;
    if (width > maxDimension || height > maxDimension) {
      const scale = maxDimension / Math.max(width, height);
      dw = Math.round(width * scale);
      dh = Math.round(height * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = dw;
    canvas.height = dh;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable');
    }
    ctx.drawImage(bmp, 0, 0, dw, dh);

    const out = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/webp', quality);
    });
    if (!out) {
      throw new WebpEncodeUnsupportedError();
    }
    return out;
  } finally {
    bmp.close();
  }
}

/** สร้าง `File` ชื่อ `.webp` สำหรับอัปโหลด */
export function webpBlobToFile(blob: Blob, baseName: string): File {
  const stem = baseName.replace(/\.[^.]+$/, '') || 'image';
  return new File([blob], `${stem}.webp`, { type: 'image/webp' });
}
