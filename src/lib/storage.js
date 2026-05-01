/**
 * Power Digital Media — Site Manager
 * Firebase Storage Service
 * 
 * Handles all file upload/download operations for site assets.
 * Files are organized under: /sites/{siteId}/{category}/{filename}
 * 
 * All image uploads pass through the ImageProcessor pipeline
 * ("The Automatic Tailor") which auto-crops, resizes, compresses,
 * and converts to WebP before upload. Clients upload any image;
 * the system ensures it fits the design perfectly.
 * 
 * Categories:
 *   - images/blog      → Blog post featured images
 *   - images/products   → Product photos
 *   - images/gallery    → Gallery album photos
 *   - images/team       → Team member headshots
 *   - images/site       → General site assets (logo, hero, etc.)
 *   - documents         → PDFs, docs uploaded by clients
 */

import { storage } from '../firebase.js';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
} from 'firebase/storage';
import { Store } from '../store.js';
import { ImageProcessor } from './image-processor.js';

// ─── Constants ──────────────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB (matches storage.rules)
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const ALLOWED_DOC_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

const CATEGORIES = {
  BLOG: 'images/blog',
  PRODUCTS: 'images/products',
  GALLERY: 'images/gallery',
  TEAM: 'images/team',
  SITE: 'images/site',
  DOCUMENTS: 'documents',
};

// ─── Helpers ────────────────────────────────────────────────────

/**
 * Generate a unique, URL-safe filename.
 * Preserves the original extension, adds a timestamp + random suffix.
 */
function generateFilename(originalName) {
  const ext = originalName.split('.').pop().toLowerCase();
  const baseName = originalName
    .replace(/\.[^/.]+$/, '')          // strip extension
    .replace(/[^a-zA-Z0-9_-]/g, '_')  // sanitize
    .substring(0, 60);                 // truncate
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 6);
  return `${baseName}_${timestamp}_${random}.${ext}`;
}

/**
 * Get the storage path for a file within the current site.
 */
function getStoragePath(category, filename) {
  const siteId = Store.getSiteId();
  if (!siteId) throw new Error('Storage: No active site. Cannot determine upload path.');
  return `sites/${siteId}/${category}/${filename}`;
}

// ─── Storage Service ────────────────────────────────────────────

export const StorageService = {
  CATEGORIES,

  /**
   * Upload a file to Firebase Storage with progress tracking.
   * 
   * @param {File}     file      - The File object from an <input type="file">
   * @param {string}   category  - One of CATEGORIES (e.g. 'images/blog')
   * @param {Object}   [options] - Optional overrides
   * @param {string}   [options.filename]    - Custom filename (auto-generated if omitted)
   * @param {Function} [options.onProgress]  - Callback: (percent: number) => void
   * @param {Object}   [options.metadata]    - Custom metadata to attach to the file
   * 
   * @returns {Promise<{ url: string, path: string, filename: string, metadata: Object }>}
   */
  async upload(file, category, options = {}) {
    // ── Validation ────────────────────────────────────────────
    if (!file) throw new Error('No file provided.');
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      throw new Error(`File too large (${sizeMB} MB). Maximum is 10 MB.`);
    }

    // Determine allowed types based on category
    const isDocument = category === CATEGORIES.DOCUMENTS;
    const allowedTypes = isDocument ? [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES] : ALLOWED_IMAGE_TYPES;
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type "${file.type}" is not allowed. Accepted: ${allowedTypes.join(', ')}`);
    }

    // ── Build path ────────────────────────────────────────────
    const filename = options.filename || generateFilename(file.name);
    const fullPath = getStoragePath(category, filename);
    const storageRef = ref(storage, fullPath);

    // ── Custom metadata ───────────────────────────────────────
    const customMetadata = {
      uploadedBy: Store.getAuth().name || 'Unknown',
      uploadedAt: new Date().toISOString(),
      originalName: file.name,
      ...(options.metadata || {}),
    };

    const uploadMetadata = {
      contentType: file.type,
      customMetadata,
    };

    // ── Upload with progress ──────────────────────────────────
    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file, uploadMetadata);

      uploadTask.on('state_changed',
        // Progress handler
        (snapshot) => {
          const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          if (options.onProgress) options.onProgress(percent);
        },
        // Error handler
        (error) => {
          console.error('Storage: upload failed', error);
          switch (error.code) {
            case 'storage/unauthorized':
              reject(new Error('You do not have permission to upload files for this site.'));
              break;
            case 'storage/canceled':
              reject(new Error('Upload was cancelled.'));
              break;
            case 'storage/quota-exceeded':
              reject(new Error('Storage quota exceeded. Contact PDM support.'));
              break;
            default:
              reject(new Error(`Upload failed: ${error.message}`));
          }
        },
        // Success handler
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({
              url,
              path: fullPath,
              filename,
              metadata: {
                contentType: file.type,
                size: file.size,
                ...customMetadata,
              },
            });
          } catch (err) {
            reject(new Error('Upload completed but failed to get download URL.'));
          }
        }
      );
    });
  },

  /**
   * Upload multiple files in parallel, with individual progress tracking.
   * 
   * @param {File[]}   files     - Array of File objects
   * @param {string}   category  - Storage category
   * @param {Object}   [options]
   * @param {Function} [options.onFileProgress]  - (index, percent) => void
   * @param {Function} [options.onFileComplete]  - (index, result) => void
   * @param {Function} [options.onFileError]     - (index, error) => void
   * 
   * @returns {Promise<Array<{ url, path, filename, metadata }>>}
   */
  async uploadMultiple(files, category, options = {}) {
    const results = [];
    const promises = Array.from(files).map((file, index) => {
      return this.upload(file, category, {
        onProgress: (percent) => {
          if (options.onFileProgress) options.onFileProgress(index, percent);
        },
        metadata: options.metadata,
      })
        .then((result) => {
          results[index] = result;
          if (options.onFileComplete) options.onFileComplete(index, result);
          return result;
        })
        .catch((err) => {
          results[index] = { error: err.message };
          if (options.onFileError) options.onFileError(index, err);
          return null;
        });
    });

    await Promise.allSettled(promises);
    return results;
  },

  /**
   * Delete a file from Firebase Storage.
   * 
   * @param {string} path - The full storage path (e.g. 'sites/bsrw/images/blog/photo_abc.jpg')
   */
  async deleteFile(path) {
    try {
      const fileRef = ref(storage, path);
      await deleteObject(fileRef);
    } catch (err) {
      if (err.code === 'storage/object-not-found') {
        console.warn('Storage: file not found, may already be deleted:', path);
        return; // Not an error — file is already gone
      }
      throw new Error(`Failed to delete file: ${err.message}`);
    }
  },

  /**
   * Get the download URL for an existing file.
   * 
   * @param {string} path - Full storage path
   * @returns {Promise<string>}
   */
  async getURL(path) {
    const fileRef = ref(storage, path);
    return getDownloadURL(fileRef);
  },

  /**
   * List all files in a category for the current site.
   * 
   * @param {string} category - e.g. 'images/blog'
   * @returns {Promise<Array<{ name, path, url }>>}
   */
  async listFiles(category) {
    const siteId = Store.getSiteId();
    if (!siteId) throw new Error('Storage: No active site.');

    const listRef = ref(storage, `sites/${siteId}/${category}`);
    const result = await listAll(listRef);

    const files = await Promise.all(
      result.items.map(async (itemRef) => {
        const url = await getDownloadURL(itemRef);
        return {
          name: itemRef.name,
          path: itemRef.fullPath,
          url,
        };
      })
    );

    return files;
  },

  /**
   * Get file metadata.
   * 
   * @param {string} path - Full storage path
   * @returns {Promise<Object>}
   */
  async getFileMetadata(path) {
    const fileRef = ref(storage, path);
    return getMetadata(fileRef);
  },

  // ═════════════════════════════════════════════════════════════
  // AUTO-PROCESSED UPLOADS ("The Automatic Tailor")
  // These methods process images through the pipeline before upload.
  // Client uploads any image → auto-crop → resize → WebP → compress → upload.
  // ═════════════════════════════════════════════════════════════

  /**
   * Process an image through the Automatic Tailor pipeline, then upload.
   * This is the preferred method for all image uploads.
   * 
   * @param {File}     file       - Raw file from <input type="file">
   * @param {string}   slotName   - Image slot (e.g. 'teamMember', 'blogFeatured')
   * @param {string}   category   - Storage category (e.g. CATEGORIES.TEAM)
   * @param {Object}   [options]
   * @param {Function} [options.onProgress]   - Upload progress: (percent) => void
   * @param {Function} [options.onStep]       - Processing step: (step, detail) => void
   * @param {boolean}  [options.skipProcessing] - Skip the pipeline (for pre-processed files)
   * @param {Object}   [options.metadata]     - Custom metadata
   * 
   * @returns {Promise<{ url, path, filename, metadata, processing }>}
   */
  async processAndUpload(file, slotName, category, options = {}) {
    let uploadFile = file;
    let processingResult = null;

    // Process through the Automatic Tailor (unless explicitly skipped)
    if (!options.skipProcessing && ImageProcessor.getSlotConfig(slotName)) {
      const processed = await ImageProcessor.processToFile(file, slotName, {
        onStep: options.onStep,
      });
      uploadFile = processed.file;
      processingResult = {
        originalSize: processed.originalSize,
        processedSize: processed.processedSize,
        compressionRatio: processed.compressionRatio,
        dimensions: `${processed.width}×${processed.height}`,
        previewUrl: processed.previewUrl,
      };
    }

    // Upload the processed file
    const result = await this.upload(uploadFile, category, {
      onProgress: options.onProgress,
      metadata: {
        ...(options.metadata || {}),
        processedSlot: slotName,
        originalName: file.name,
        processedDimensions: processingResult?.dimensions || 'unprocessed',
      },
    });

    return {
      ...result,
      processing: processingResult,
    };
  },

  /**
   * Upload a blog post featured image.
   * Auto-processes: 1200×630px, 1.9:1 aspect, WebP, ~200KB.
   */
  async uploadBlogImage(file, onProgress, onStep) {
    return this.processAndUpload(file, 'blogFeatured', CATEGORIES.BLOG, { onProgress, onStep });
  },

  /**
   * Upload a product image.
   * Auto-processes: 800×800px, 1:1 aspect, WebP, ~150KB.
   */
  async uploadProductImage(file, onProgress, onStep) {
    return this.processAndUpload(file, 'productImage', CATEGORIES.PRODUCTS, { onProgress, onStep });
  },

  /**
   * Upload a gallery photo.
   * Auto-processes: up to 1200×1600px, preserves aspect, WebP, ~250KB.
   */
  async uploadGalleryPhoto(file, onProgress, onStep) {
    return this.processAndUpload(file, 'galleryPhoto', CATEGORIES.GALLERY, { onProgress, onStep });
  },

  /**
   * Upload a team member headshot.
   * Auto-processes: 400×400px, 1:1 square crop, WebP, ~100KB.
   */
  async uploadTeamPhoto(file, onProgress, onStep) {
    return this.processAndUpload(file, 'teamMember', CATEGORIES.TEAM, { onProgress, onStep });
  },

  /**
   * Upload a general site image (logo, hero, etc.).
   * Auto-processes: 1920×1080px, 16:9 aspect, WebP, ~300KB.
   */
  async uploadSiteImage(file, onProgress, onStep) {
    return this.processAndUpload(file, 'heroBanner', CATEGORIES.SITE, { onProgress, onStep });
  },

  /**
   * Upload a raw file WITHOUT auto-processing (e.g. documents, SVGs).
   * Use this for non-image files or when you've already processed the image.
   */
  async uploadRaw(file, category, onProgress) {
    return this.upload(file, category, { onProgress });
  },

  /**
   * Get human-readable requirements for a slot.
   * Pass-through to ImageProcessor for UI labels.
   * @param {string} slotName 
   */
  getImageRequirements(slotName) {
    return ImageProcessor.getSlotRequirements(slotName);
  },

  /**
   * Check if Firebase Storage is available and configured.
   * Useful for showing/hiding upload UI when storage isn't ready.
   */
  async isAvailable() {
    try {
      const siteId = Store.getSiteId();
      if (!siteId) return false;
      // Try to list root — if Storage isn't enabled, this will fail
      const testRef = ref(storage, `sites/${siteId}`);
      await listAll(testRef);
      return true;
    } catch (err) {
      console.warn('Storage: not available', err.message);
      return false;
    }
  },
};
