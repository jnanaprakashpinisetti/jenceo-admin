// src/utils/imageOptimizer.js
// Browser-side image optimizer. No extra npm packages needed.
// - Images (JPG/PNG/GIF/WEBP) larger than the limit are resized + re-compressed
//   to JPEG until they fit under the limit.
// - Images already under the limit are returned untouched (no quality loss).
// - PDFs cannot be compressed in the browser, so they are only size-checked.

const MAX_INPUT_BYTES = 15 * 1024 * 1024; // refuse to even try on files > 15 MB

const PRESETS = {
  // profile photos: small is fine
  photo: { maxDimension: 800, minDimension: 240, minQuality: 0.4 },
  // ID proofs: keep text readable, so larger dimensions and higher quality floor
  id: { maxDimension: 1600, minDimension: 700, minQuality: 0.5 },
};

export const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This image could not be read. Please choose another file."));
    };
    img.src = url;
  });

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

const toJpgName = (name = "image") => {
  const base = name.replace(/\.[^/.]+$/, "") || "image";
  return `${base}.jpg`;
};

export const compressImage = async (file, { maxBytes, maxDimension, minDimension, minQuality }) => {
  if (file.size <= maxBytes) return file; // already small enough

  const img = await loadImage(file);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const qualities = [0.85, 0.75, 0.65, 0.55, 0.45, 0.4].filter((q) => q >= minQuality - 0.001);

  let scale = Math.min(1, maxDimension / Math.max(srcW, srcH));

  for (let attempt = 0; attempt < 12; attempt++) {
    const w = Math.max(1, Math.round(srcW * scale));
    const h = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff"; // PNG transparency -> white (JPEG has no alpha)
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);

    for (const q of qualities) {
      const blob = await canvasToBlob(canvas, "image/jpeg", q);
      if (blob && blob.size <= maxBytes) {
        return new File([blob], toJpgName(file.name), {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
      }
    }

    if (Math.max(w, h) <= minDimension) break;
    scale *= 0.8; // shrink and try again
  }

  throw new Error(
    `Could not reduce this image below ${Math.round(maxBytes / 1024)}KB without making it unreadable. Please choose a smaller image.`
  );
};

/**
 * Main helper used by the forms.
 *   const { file, optimized, originalSize, finalSize } =
 *     await optimizeUpload(file, { maxKB: 150, kind: "photo" | "id" });
 * Throws an Error with a user-friendly message if the file cannot be used.
 */
export const optimizeUpload = async (file, { maxKB, kind = "photo" } = {}) => {
  const maxBytes = maxKB * 1024;
  const originalSize = file.size;

  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name || "");
  if (isPdf) {
    if (file.size > maxBytes) {
      throw new Error(
        `This PDF is ${formatSize(file.size)}. PDFs cannot be compressed automatically - please upload a PDF under ${maxKB}KB, or upload a JPG/PNG photo of the document instead.`
      );
    }
    return { file, optimized: false, originalSize, finalSize: file.size };
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Unsupported file type.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error(`Image is too large (${formatSize(file.size)}). Please choose an image under 15 MB.`);
  }

  const out = await compressImage(file, { maxBytes, ...(PRESETS[kind] || PRESETS.photo) });
  return { file: out, optimized: out !== file, originalSize, finalSize: out.size };
};
