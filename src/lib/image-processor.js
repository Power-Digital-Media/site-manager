/**
 * Power Digital Media — Site Manager
 * Image Auto-Processing Pipeline ("The Automatic Tailor")
 * 
 * Every image uploaded by a client passes through this pipeline before
 * hitting Firebase Storage. The system enforces design-safe guardrails:
 * 
 *   1. Validate minimum resolution (reject tiny/garbage images)
 *   2. Center-crop to the required aspect ratio for the target slot
 *   3. Resize to the target dimensions
 *   4. Compress aggressively (target < 200KB for most slots)
 *   5. Convert to WebP for modern delivery
 * 
 * The client thinks they "just uploaded a photo."
 * In reality, we tailored it to fit the design perfectly.
 * 
 * Usage:
 *   import { ImageProcessor } from './image-processor.js';
 *   const processed = await ImageProcessor.process(file, 'teamMember');
 *   // processed = { blob, previewUrl, width, height, originalSize, processedSize }
 *   // Then upload processed.blob instead of the original File
 */

import imageCompression from 'browser-image-compression';
import { IMAGE_SLOTS } from '../constants.js';

// ─── Slot Presets ────────────────────────────────────────────────
// Maps slot names from IMAGE_SLOTS to processing configs.
// aspect: [w, h] ratio. null height = preserve original aspect.
// maxWidth/maxHeight: target output dimensions.
// quality: WebP quality (0.0–1.0). Lower = smaller file.
// maxSizeKB: target file size ceiling.

const PROCESSING_PRESETS = {
  heroBanner: {
    aspect: [16, 9],
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.82,
    maxSizeKB: 300,
    minSourceWidth: 1200,
    minSourceHeight: 675,
  },
  imageBanner: {
    aspect: [12, 5],
    maxWidth: 1920,
    maxHeight: 800,
    quality: 0.82,
    maxSizeKB: 300,
    minSourceWidth: 1200,
    minSourceHeight: 500,
  },
  aboutImage: {
    aspect: [4, 3],
    maxWidth: 800,
    maxHeight: 600,
    quality: 0.80,
    maxSizeKB: 200,
    minSourceWidth: 600,
    minSourceHeight: 450,
  },
  blogFeatured: {
    aspect: [1.9, 1],
    maxWidth: 1200,
    maxHeight: 630,
    quality: 0.80,
    maxSizeKB: 200,
    minSourceWidth: 800,
    minSourceHeight: 420,
  },
  galleryPhoto: {
    aspect: null, // preserve original aspect
    maxWidth: 1200,
    maxHeight: 1600, // cap very tall images
    quality: 0.80,
    maxSizeKB: 250,
    minSourceWidth: 600,
    minSourceHeight: 400,
  },
  teamMember: {
    aspect: [1, 1],
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.80,
    maxSizeKB: 100,
    minSourceWidth: 200,
    minSourceHeight: 200,
  },
  productImage: {
    aspect: [1, 1],
    maxWidth: 800,
    maxHeight: 800,
    quality: 0.80,
    maxSizeKB: 150,
    minSourceWidth: 400,
    minSourceHeight: 400,
  },
};

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Load an image file into an HTMLImageElement.
 * @param {File|Blob} file 
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image. The file may be corrupted.'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Center-crop an image to a target aspect ratio using Canvas.
 * Returns a new canvas with the cropped result.
 * 
 * @param {HTMLImageElement} img 
 * @param {number} targetW - aspect ratio width component
 * @param {number} targetH - aspect ratio height component
 * @returns {HTMLCanvasElement}
 */
function centerCrop(img, targetW, targetH) {
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;

  const targetAspect = targetW / targetH;
  const srcAspect = srcW / srcH;

  let cropW, cropH, cropX, cropY;

  if (srcAspect > targetAspect) {
    // Image is wider than target → crop sides
    cropH = srcH;
    cropW = Math.round(srcH * targetAspect);
    cropX = Math.round((srcW - cropW) / 2);
    cropY = 0;
  } else {
    // Image is taller than target → crop top/bottom
    cropW = srcW;
    cropH = Math.round(srcW / targetAspect);
    cropX = 0;
    cropY = Math.round((srcH - cropH) / 2);
  }

  const canvas = document.createElement('canvas');
  canvas.width = cropW;
  canvas.height = cropH;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  return canvas;
}

/**
 * Resize a canvas to target dimensions while maintaining quality.
 * Uses step-down resizing for better results when downscaling > 2x.
 * 
 * @param {HTMLCanvasElement} srcCanvas 
 * @param {number} targetW 
 * @param {number} targetH 
 * @returns {HTMLCanvasElement}
 */
function resizeCanvas(srcCanvas, targetW, targetH) {
  let current = srcCanvas;

  // Step-down: halve dimensions iteratively for smoother results
  // This prevents the blocky look you get from a single large downscale.
  while (current.width > targetW * 2 || current.height > targetH * 2) {
    const stepCanvas = document.createElement('canvas');
    stepCanvas.width = Math.round(current.width / 2);
    stepCanvas.height = Math.round(current.height / 2);
    const ctx = stepCanvas.getContext('2d');
    ctx.drawImage(current, 0, 0, stepCanvas.width, stepCanvas.height);
    current = stepCanvas;
  }

  // Final resize to exact target dimensions
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = targetW;
  finalCanvas.height = targetH;
  const ctx = finalCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(current, 0, 0, targetW, targetH);
  return finalCanvas;
}

/**
 * Convert a canvas to a WebP Blob.
 * @param {HTMLCanvasElement} canvas 
 * @param {number} quality - 0.0 to 1.0
 * @returns {Promise<Blob>}
 */
function canvasToWebP(canvas, quality = 0.80) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to convert image to WebP.'));
      },
      'image/webp',
      quality
    );
  });
}

/**
 * Fallback compression using browser-image-compression.
 * Used when the WebP output is still too large after initial conversion.
 * 
 * @param {Blob} blob 
 * @param {number} maxSizeKB 
 * @returns {Promise<Blob>}
 */
async function compressBlob(blob, maxSizeKB) {
  const file = new File([blob], 'image.webp', { type: 'image/webp' });
  return imageCompression(file, {
    maxSizeMB: maxSizeKB / 1024,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/webp',
  });
}

// ─── Image Processor ─────────────────────────────────────────────

export const ImageProcessor = {

  /**
   * Get the available slot names and their configs.
   */
  getSlots() {
    return { ...PROCESSING_PRESETS };
  },

  /**
   * Get the config for a specific slot.
   * @param {string} slotName - e.g. 'teamMember', 'blogFeatured'
   * @returns {Object|null}
   */
  getSlotConfig(slotName) {
    return PROCESSING_PRESETS[slotName] || null;
  },

  /**
   * Validate that a file is an acceptable image BEFORE processing.
   * This is a fast gate — rejects obviously bad files.
   * 
   * @param {File} file 
   * @returns {{ valid: boolean, error?: string }}
   */
  validateFile(file) {
    if (!file) return { valid: false, error: 'No file provided.' };

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: `Unsupported format: ${file.type}. Use JPG, PNG, WebP, or GIF.` };
    }

    // 15MB raw upload limit (processed output will be much smaller)
    const maxRawSize = 15 * 1024 * 1024;
    if (file.size > maxRawSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return { valid: false, error: `File is ${sizeMB}MB — maximum raw upload is 15MB.` };
    }

    return { valid: true };
  },

  /**
   * Process an image for a specific design slot.
   * 
   * Pipeline: Validate → Load → Crop → Resize → WebP → Compress
   * 
   * @param {File}   file     - The raw File object from an <input>
   * @param {string} slotName - Key from PROCESSING_PRESETS (e.g. 'teamMember')
   * @param {Object} [opts]
   * @param {Function} [opts.onStep] - Progress callback: (step: string, detail?: string) => void
   * 
   * @returns {Promise<{
   *   blob: Blob,
   *   previewUrl: string,
   *   width: number,
   *   height: number,
   *   originalSize: number,
   *   processedSize: number,
   *   compressionRatio: string,
   *   format: string,
   *   slot: string
   * }>}
   * 
   * @throws {Error} If the image doesn't meet minimum requirements
   */
  async process(file, slotName, opts = {}) {
    const step = opts.onStep || (() => {});
    const preset = PROCESSING_PRESETS[slotName];
    if (!preset) {
      throw new Error(`Unknown image slot: "${slotName}". Valid slots: ${Object.keys(PROCESSING_PRESETS).join(', ')}`);
    }

    // ── Step 1: Validate the raw file ─────────────────────────
    step('validating', 'Checking file format and size...');
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // ── Step 2: Load into an Image element ────────────────────
    step('loading', 'Reading image data...');
    const img = await loadImage(file);
    const originalW = img.naturalWidth;
    const originalH = img.naturalHeight;

    // ── Step 3: Validate minimum resolution ───────────────────
    step('checking-resolution', `Source: ${originalW}×${originalH}px`);
    if (originalW < preset.minSourceWidth || originalH < preset.minSourceHeight) {
      // Clean up the object URL
      URL.revokeObjectURL(img.src);
      throw new Error(
        `Image too small (${originalW}×${originalH}px). ` +
        `This slot requires at least ${preset.minSourceWidth}×${preset.minSourceHeight}px. ` +
        `Please use a higher-resolution photo.`
      );
    }

    // ── Step 4: Center-crop to target aspect ratio ────────────
    let canvas;
    if (preset.aspect) {
      step('cropping', `Cropping to ${preset.aspect[0]}:${preset.aspect[1]} aspect ratio...`);
      canvas = centerCrop(img, preset.aspect[0], preset.aspect[1]);
    } else {
      // No forced aspect — just draw the full image onto a canvas
      step('preparing', 'Preserving original aspect ratio...');
      canvas = document.createElement('canvas');
      canvas.width = originalW;
      canvas.height = originalH;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
    }

    // Clean up the object URL from loadImage
    URL.revokeObjectURL(img.src);

    // ── Step 5: Resize to target dimensions ───────────────────
    let targetW = preset.maxWidth;
    let targetH = preset.maxHeight;

    if (!preset.aspect) {
      // For free-aspect slots (gallery), scale proportionally
      const scale = Math.min(
        preset.maxWidth / canvas.width,
        preset.maxHeight / canvas.height,
        1 // never upscale
      );
      targetW = Math.round(canvas.width * scale);
      targetH = Math.round(canvas.height * scale);
    }

    // Only resize if the canvas is larger than the target
    if (canvas.width > targetW || canvas.height > targetH) {
      step('resizing', `Resizing to ${targetW}×${targetH}px...`);
      canvas = resizeCanvas(canvas, targetW, targetH);
    }

    // ── Step 6: Convert to WebP ───────────────────────────────
    step('converting', 'Converting to WebP...');
    let blob = await canvasToWebP(canvas, preset.quality);

    // ── Step 7: Compress if still too large ───────────────────
    const maxSizeBytes = preset.maxSizeKB * 1024;
    if (blob.size > maxSizeBytes) {
      step('compressing', `Compressing to target size (${preset.maxSizeKB}KB)...`);
      blob = await compressBlob(blob, preset.maxSizeKB);
    }

    // ── Step 8: Generate preview URL ──────────────────────────
    step('finalizing', 'Generating preview...');
    const previewUrl = URL.createObjectURL(blob);

    const result = {
      blob,
      previewUrl,
      width: canvas.width,
      height: canvas.height,
      originalSize: file.size,
      processedSize: blob.size,
      compressionRatio: `${((1 - blob.size / file.size) * 100).toFixed(0)}% smaller`,
      format: 'image/webp',
      slot: slotName,
    };

    step('done', `Processed: ${result.width}×${result.height}px, ${(result.processedSize / 1024).toFixed(0)}KB (${result.compressionRatio})`);
    return result;
  },

  /**
   * Process an image and return a File object (instead of Blob).
   * This is a convenience wrapper for upload functions that expect File objects.
   * 
   * @param {File}   file 
   * @param {string} slotName 
   * @param {Object} [opts] 
   * @returns {Promise<{ file: File, previewUrl: string, ...metadata }>}
   */
  async processToFile(file, slotName, opts = {}) {
    const result = await this.process(file, slotName, opts);
    
    // Create a File from the Blob with a .webp extension
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const processedFile = new File(
      [result.blob],
      `${baseName}.webp`,
      { type: 'image/webp' }
    );

    return {
      file: processedFile,
      previewUrl: result.previewUrl,
      width: result.width,
      height: result.height,
      originalSize: result.originalSize,
      processedSize: result.processedSize,
      compressionRatio: result.compressionRatio,
      format: result.format,
      slot: result.slot,
    };
  },

  /**
   * Revoke a preview URL when it's no longer needed.
   * Call this when the user accepts or rejects the preview.
   * @param {string} previewUrl 
   */
  revokePreview(previewUrl) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  },

  /**
   * Get human-readable requirements for a slot.
   * Useful for displaying "Best size: 1200×800px" labels.
   * 
   * @param {string} slotName 
   * @returns {{ label: string, dimensions: string, minSize: string, maxFileSize: string }}
   */
  getSlotRequirements(slotName) {
    const preset = PROCESSING_PRESETS[slotName];
    if (!preset) return null;

    const labels = {
      heroBanner: 'Hero Banner',
      blogFeatured: 'Blog Featured Image',
      galleryPhoto: 'Gallery Photo',
      teamMember: 'Team Headshot',
      productImage: 'Product Image',
    };

    return {
      label: labels[slotName] || slotName,
      dimensions: preset.aspect
        ? `${preset.maxWidth}×${preset.maxHeight}px (${preset.aspect[0]}:${preset.aspect[1]})`
        : `Up to ${preset.maxWidth}×${preset.maxHeight}px`,
      minSize: `${preset.minSourceWidth}×${preset.minSourceHeight}px minimum`,
      maxFileSize: `Output: ~${preset.maxSizeKB}KB or less`,
      aspect: preset.aspect ? `${preset.aspect[0]}:${preset.aspect[1]}` : 'Any',
    };
  },
};
