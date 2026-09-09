import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('IMAGE_DECODE_FAILED')); };
    image.src = url;
  });
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error('WEBP_ENCODE_FAILED')),
    'image/webp',
    quality,
  ));
}

export async function compressGuideImage(file: File) {
  const image = await loadImage(file);
  const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  for (const dimensionScale of [1, .85, .7, .55]) {
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale * dimensionScale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale * dimensionScale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('CANVAS_UNAVAILABLE');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [.84, .72, .6, .48, .36, .25]) {
      const blob = await canvasBlob(canvas, quality);
      if (blob.size <= 200 * 1024) return blob;
    }
  }
  throw new Error('圖片壓縮後仍超過 200KB，請改用較簡單或較小的圖片。');
}

export async function uploadGuideImage(
  familyId: string,
  tripId: string,
  itemId: string,
  index: number,
  file: File,
) {
  const blob = await compressGuideImage(file);
  const object = ref(storage, `families/${familyId}/trips/${tripId}/guide/${itemId}-${index}.webp`);
  await uploadBytes(object, blob, { contentType: 'image/webp' });
  return getDownloadURL(object);
}
