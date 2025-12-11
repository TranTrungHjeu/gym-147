/**
 * Face Recognition Service for Identity Service
 * Uses face-api.js for face-based login authentication
 */

const sharp = require('sharp');

class FaceRecognitionService {
  constructor() {
    // Configuration from environment variables
    this.provider = 'face-api-js'; // Only face-api-js is supported

    // face-api.js configuration
    this.faceApiModelPath = process.env.FACE_API_JS_MODEL_PATH || './models/face-api';
    this.modelsLoaded = false;

    // Face detection settings
    this.similarityThreshold = parseFloat(process.env.FACE_SIMILARITY_THRESHOLD || '0.6');
    this.maxFaceSize = 4096; // Maximum face size in pixels

    console.log(`[FACE-RECOGNITION-AUTH] Initialized with provider: ${this.provider}`);
  }

  /**
   * Validate that face recognition is configured
   */
  isConfigured() {
    try {
      const fs = require('fs');
      const path = require('path');

      // Resolve path relative to service root (where main.js is located)
      // In Docker: /app/services/identity-service
      // In local: ./services/identity-service
      const serviceRoot = path.resolve(__dirname, '../..');
      const modelPath = path.isAbsolute(this.faceApiModelPath)
        ? this.faceApiModelPath
        : path.resolve(serviceRoot, this.faceApiModelPath);

      const exists = fs.existsSync(modelPath);

      if (!exists) {
        console.warn(`[FACE-RECOGNITION] Models not found at: ${modelPath}`);
        console.warn(`[FACE-RECOGNITION] Service root: ${serviceRoot}`);
        console.warn(`[FACE-RECOGNITION] Configured path: ${this.faceApiModelPath}`);
      }

      return exists;
    } catch (e) {
      console.error('[FACE-RECOGNITION] Error checking models:', e);
      return false;
    }
  }

  /**
   * Convert base64 string to Buffer
   */
  async base64ToBuffer(base64String) {
    try {
      // Remove data URL prefix if present
      const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
      return Buffer.from(base64Data, 'base64');
    } catch (error) {
      throw new Error(`Invalid base64 image: ${error.message}`);
    }
  }

  /**
   * Extract face encoding from image
   * @param {Buffer|string} imageInput - Image buffer or base64 string
   * @returns {Promise<Object>} Face encoding data
   */
  async extractFaceEncoding(imageInput) {
    try {
      let imageBuffer;

      // Convert to buffer if string
      if (typeof imageInput === 'string') {
        imageBuffer = await this.base64ToBuffer(imageInput);
      } else {
        imageBuffer = imageInput;
      }

      // Validate image
      const imageInfo = await sharp(imageBuffer).metadata();

      if (!imageInfo.width || !imageInfo.height) {
        throw new Error('Invalid image dimensions');
      }

      console.log('[FACE-RECOGNITION] Image info:', {
        width: imageInfo.width,
        height: imageInfo.height,
        format: imageInfo.format,
        size: imageBuffer.length,
      });

      // Preprocess image for better face detection:
      // 1. Resize to optimal size for face detection (512-1024px is optimal)
      // 2. Enhance contrast and brightness
      // 3. Convert to RGB if needed

      let processedBuffer = imageBuffer;

      // Optimal size for face detection (face-api.js works best with 512-1024px)
      const minSize = 224; // Minimum size for face detection
      const optimalSize = 800; // Optimal size for face detection (balance between quality and performance)
      const maxSize = this.maxFaceSize;

      // Build sharp pipeline
      let sharpInstance = sharp(imageBuffer);

      // Handle alpha channel (only for formats that support it, JPEG doesn't have alpha)
      if (imageInfo.hasAlpha && imageInfo.format !== 'jpeg') {
        sharpInstance = sharpInstance.flatten({ background: { r: 255, g: 255, b: 255 } });
      }

      // Resize logic: optimize for face detection
      if (imageInfo.width < minSize || imageInfo.height < minSize) {
        // Upscale small images
        const scale = Math.max(minSize / imageInfo.width, minSize / imageInfo.height);
        processedBuffer = await sharpInstance
          .resize(Math.ceil(imageInfo.width * scale), Math.ceil(imageInfo.height * scale), {
            fit: 'fill',
            kernel: sharp.kernel.lanczos3, // Better quality upscaling
          })
          .modulate({ brightness: 1.1, saturation: 1.05 }) // Slight brightness and saturation boost
          .jpeg({ quality: 95 })
          .toBuffer();
      } else if (imageInfo.width > maxSize || imageInfo.height > maxSize) {
        // Downscale very large images
        processedBuffer = await sharpInstance
          .resize(maxSize, maxSize, { fit: 'inside' })
          .modulate({ brightness: 1.1, saturation: 1.05 }) // Slight brightness and saturation boost
          .jpeg({ quality: 90 })
          .toBuffer();
      } else if (imageInfo.width > optimalSize || imageInfo.height > optimalSize) {
        // Resize large images to optimal size for better face detection
        // Keep aspect ratio, resize to fit within optimalSize
        processedBuffer = await sharpInstance
          .resize(optimalSize, optimalSize, { fit: 'inside' })
          .modulate({ brightness: 1.1, saturation: 1.05 }) // Slight brightness and saturation boost
          .jpeg({ quality: 90 })
          .toBuffer();
      } else {
        // Optimize existing image (enhance quality, ensure RGB)
        processedBuffer = await sharpInstance
          .modulate({ brightness: 1.1, saturation: 1.05 }) // Slight brightness and saturation boost
          .jpeg({ quality: 90 })
          .toBuffer();
      }

      imageBuffer = processedBuffer;

      // Log processed image info for debugging
      const processedInfo = await sharp(processedBuffer).metadata();
      console.log('[FACE-RECOGNITION] Processed image info:', {
        width: processedInfo.width,
        height: processedInfo.height,
        format: processedInfo.format,
        size: processedBuffer.length,
      });

      return await this._extractFaceEncodingFaceApi(imageBuffer);
    } catch (error) {
      console.error('[FACE-RECOGNITION-AUTH] Extract encoding error:', error);
      throw error;
    }
  }

  /**
   * Verify face and find matching user
   * @param {Buffer|string} imageInput - Image buffer or base64 string
   * @param {Array<Object>} usersWithFaces - Array of users with face encodings: [{id, face_encoding, ...}]
   * @returns {Promise<Object>} Verification result with userId
   */
  async verifyFaceAndFindUser(imageInput, usersWithFaces = []) {
    try {
      let imageBuffer;
      if (typeof imageInput === 'string') {
        imageBuffer = await this.base64ToBuffer(imageInput);
      } else {
        imageBuffer = imageInput;
      }

      return await this._verifyFaceFaceApi(imageBuffer, usersWithFaces);
    } catch (error) {
      console.error('[FACE-RECOGNITION-AUTH] Verify face error:', error);
      return {
        recognized: false,
        faceDetected: false,
        confidence: 0,
        error: error.message,
      };
    }
  }

  // ==================== FACE-API.JS IMPLEMENTATION ====================

  /**
   * Load face-api.js models (lazy loading)
   */
  async _loadFaceApiModels() {
    if (this.modelsLoaded) return;

    // Prevent concurrent loading attempts
    if (this._loadingPromise) {
      return this._loadingPromise;
    }

    this._loadingPromise = this._doLoadModels();
    try {
      await this._loadingPromise;
    } finally {
      this._loadingPromise = null;
    }
  }

  /**
   * Internal method to actually load models
   */
  async _doLoadModels() {
    try {
      // Dynamically import face-api.js only when needed
      const faceapi = require('@vladmandic/face-api');

      // Try to use tfjs-node first (faster), fallback to tfjs (CPU-only) if not available
      let tf;
      try {
        tf = require('@tensorflow/tfjs-node');
        console.log('[FACE-API-JS-AUTH] Using @tensorflow/tfjs-node (native acceleration)');
      } catch (e) {
        console.warn(
          '[FACE-API-JS-AUTH] @tensorflow/tfjs-node not available, falling back to CPU-only version'
        );
        tf = require('@tensorflow/tfjs');
        console.log(
          '[FACE-API-JS-AUTH] Using @tensorflow/tfjs (CPU-only - slower but works everywhere)'
        );
      }

      const canvas = require('canvas');
      const { Canvas, Image, ImageData } = canvas;
      const path = require('path');

      // Monkey patch for Node.js environment
      faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

      // Resolve path relative to service root (where main.js is located)
      const serviceRoot = path.resolve(__dirname, '../..');
      const modelPath = path.isAbsolute(this.faceApiModelPath)
        ? this.faceApiModelPath
        : path.resolve(serviceRoot, this.faceApiModelPath);

      console.log(`[FACE-API-JS-AUTH] Loading models from: ${modelPath}`);

      // Load all required models
      await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
      await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
      await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
      // Also load TinyFaceDetector as fallback
      try {
        await faceapi.nets.tinyFaceDetector.loadFromDisk(modelPath);
        console.log('[FACE-API-JS-AUTH] TinyFaceDetector model loaded as fallback');
      } catch (e) {
        console.warn('[FACE-API-JS-AUTH] TinyFaceDetector model not available, skipping fallback');
      }

      // Store references
      this.faceapi = faceapi;
      this.canvas = canvas;
      this.modelsLoaded = true;

      console.log('[FACE-API-JS-AUTH] Models loaded successfully');

      // Mark as loaded only after successful load
      this.modelsLoaded = true;
    } catch (error) {
      console.error('[FACE-API-JS-AUTH] Failed to load models:', error);
      console.error('[FACE-API-JS-AUTH] Error details:', error.message);
      console.error('[FACE-API-JS-AUTH] Stack:', error.stack);

      // Reset loading state on error
      this.modelsLoaded = false;
      this._loadingPromise = null;

      // Provide helpful error message for Windows users
      if (
        (error.message && error.message.includes('node-pre-gyp')) ||
        error.message.includes('node-gyp')
      ) {
        throw new Error(
          `Failed to load face-api.js models. This is likely a Windows build issue.\n` +
            `Solutions:\n` +
            `1. Install Visual Studio Build Tools: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022\n` +
            `2. Restart terminal after installing Build Tools\n` +
            `3. Try: npm install again\n` +
            `See docs/FACE-API-JS-WINDOWS-INSTALL.md for details.`
        );
      }

      throw new Error(`Failed to load face-api.js models: ${error.message}`);
    }
  }

  /**
   * Extract face encoding using face-api.js
   */
  async _extractFaceEncodingFaceApi(imageBuffer) {
    if (!this.isConfigured()) {
      throw new Error('face-api.js models not found. Please set FACE_API_JS_MODEL_PATH.');
    }

    try {
      // Load models with timeout to prevent hanging
      const loadPromise = this._loadFaceApiModels();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Model loading timeout after 60 seconds')), 60000)
      );

      await Promise.race([loadPromise, timeoutPromise]);

      // Convert buffer to canvas
      const img = await this.canvas.loadImage(imageBuffer);
      const imgCanvas = this.canvas.createCanvas(img.width, img.height);
      const ctx = imgCanvas.getContext('2d');
      ctx.drawImage(img, 0, 0, img.width, img.height);

      // Detect faces and extract descriptors
      // Use lower minConfidence for better detection
      // Must use SsdMobilenetv1Options instance, not plain object
      let detections = await this.faceapi
        .detectAllFaces(
          imgCanvas,
          new this.faceapi.SsdMobilenetv1Options({
            minConfidence: 0.2, // Very low threshold for better detection (default is 0.5)
          })
        )
        .withFaceLandmarks()
        .withFaceDescriptors();

      // If no faces detected with ssdMobilenetv1, try with TinyFaceDetector as fallback
      if (!detections || detections.length === 0) {
        console.log(
          '[FACE-API-JS-AUTH] No faces detected with ssdMobilenetv1, trying TinyFaceDetector...'
        );
        try {
          // Check if TinyFaceDetector is loaded
          if (this.faceapi.nets.tinyFaceDetector && this.faceapi.nets.tinyFaceDetector.isLoaded) {
            detections = await this.faceapi
              .detectAllFaces(
                imgCanvas,
                new this.faceapi.TinyFaceDetectorOptions({
                  inputSize: 512, // Higher input size for better detection
                  scoreThreshold: 0.3, // Lower threshold
                })
              )
              .withFaceLandmarks()
              .withFaceDescriptors();
            if (detections && detections.length > 0) {
              console.log('[FACE-API-JS-AUTH] Face detected using TinyFaceDetector fallback');
            }
          } else {
            console.log('[FACE-API-JS-AUTH] TinyFaceDetector not loaded, skipping fallback');
          }
        } catch (fallbackError) {
          console.log(
            '[FACE-API-JS-AUTH] TinyFaceDetector fallback failed:',
            fallbackError.message
          );
        }
      }

      if (!detections || detections.length === 0) {
        console.log('[FACE-API-JS-AUTH] No faces detected in image');
        return {
          faceDetected: false,
          message: 'No face detected in image',
        };
      }

      console.log(`[FACE-API-JS-AUTH] Detected ${detections.length} face(s) in image`);

      // Get first face descriptor (128D Float32Array)
      const descriptor = detections[0].descriptor;

      if (!descriptor || descriptor.length !== 128) {
        console.error(
          `[FACE-API-JS-AUTH] Invalid descriptor: length=${descriptor?.length || 0}, expected 128`
        );
        throw new Error('Invalid face descriptor extracted');
      }

      console.log(
        `[FACE-API-JS-AUTH] Face descriptor extracted: length=${
          descriptor.length
        }, confidence=${detections[0].detection.score.toFixed(4)}`
      );

      // Convert Float32Array to Buffer for storage
      const descriptorBuffer = Buffer.from(descriptor.buffer);

      // Clean up canvas resources to free memory
      try {
        if (imgCanvas) {
          const ctx = imgCanvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, imgCanvas.width, imgCanvas.height);
          }
          // Note: We don't dispose the canvas as it might be reused
          // but we clear it to free image data
        }
      } catch (cleanupError) {
        // Ignore cleanup errors
        console.warn('[FACE-API-JS-AUTH] Canvas cleanup warning:', cleanupError.message);
      }

      return {
        faceDetected: true,
        encoding: descriptorBuffer, // Store as Buffer (Bytes)
        descriptor: descriptor, // Keep original for comparison
        confidence: detections[0].detection.score,
        landmarks: detections[0].landmarks,
      };
    } catch (error) {
      console.error('[FACE-API-JS-AUTH] Extract encoding error:', error);
      console.error('[FACE-API-JS-AUTH] Error stack:', error.stack);

      // Clean up resources if possible
      try {
        if (imgCanvas) {
          const ctx = imgCanvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, imgCanvas.width, imgCanvas.height);
          }
        }
      } catch (cleanupError) {
        // Ignore cleanup errors
      }

      // Re-throw with more context
      if (
        error.message &&
        !error.message.includes('Face detection') &&
        !error.message.includes('timeout')
      ) {
        throw new Error(`Face encoding extraction failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Verify face using face-api.js
   */
  async _verifyFaceFaceApi(imageBuffer, usersWithFaces = []) {
    if (!this.isConfigured()) {
      throw new Error('face-api.js models not found');
    }

    try {
      // Extract probe face descriptor
      const probeResult = await this._extractFaceEncodingFaceApi(imageBuffer);

      if (!probeResult.faceDetected || !probeResult.descriptor) {
        return {
          recognized: false,
          faceDetected: false,
          confidence: 0,
          message: 'No face detected in image',
        };
      }

      if (!usersWithFaces || usersWithFaces.length === 0) {
        return {
          recognized: false,
          faceDetected: true,
          confidence: 0,
          message: 'No users with face encodings to compare',
        };
      }

      // Compare with stored encodings
      let bestMatch = null;
      let bestDistance = Infinity;

      console.log(
        `[FACE-API-JS-AUTH] Comparing with ${usersWithFaces.length} users with face encodings`
      );

      for (const user of usersWithFaces) {
        if (!user.face_encoding) {
          console.log(`[FACE-API-JS-AUTH] Skipping user ${user.id}: no face_encoding`);
          continue;
        }

        // Convert stored encoding from Buffer to Float32Array
        let storedDescriptor;
        try {
          if (Buffer.isBuffer(user.face_encoding)) {
            // Check if buffer has correct length (128 * 4 bytes = 512 bytes for Float32Array)
            const expectedLength = 128 * 4; // 512 bytes
            if (user.face_encoding.length < expectedLength) {
              console.warn(
                `[FACE-API-JS-AUTH] User ${user.id} has invalid face_encoding length: ${user.face_encoding.length} bytes (expected at least ${expectedLength})`
              );
              continue;
            }

            // Create Float32Array from buffer
            // Handle both cases: buffer might be aligned or not
            if (user.face_encoding.byteOffset % 4 === 0) {
              // Buffer is aligned, can use directly
              storedDescriptor = new Float32Array(
                user.face_encoding.buffer,
                user.face_encoding.byteOffset,
                128
              );
            } else {
              // Buffer is not aligned, need to copy
              const alignedBuffer = Buffer.allocUnsafe(512);
              user.face_encoding.copy(
                alignedBuffer,
                0,
                0,
                Math.min(user.face_encoding.length, 512)
              );
              storedDescriptor = new Float32Array(
                alignedBuffer.buffer,
                alignedBuffer.byteOffset,
                128
              );
            }
          } else if (Array.isArray(user.face_encoding)) {
            if (user.face_encoding.length !== 128) {
              console.warn(
                `[FACE-API-JS-AUTH] User ${user.id} has invalid face_encoding array length: ${user.face_encoding.length} (expected 128)`
              );
              continue;
            }
            storedDescriptor = new Float32Array(user.face_encoding);
          } else if (user.face_encoding instanceof Uint8Array) {
            // Handle Uint8Array from Prisma
            if (user.face_encoding.length < 512) {
              console.warn(
                `[FACE-API-JS-AUTH] User ${user.id} has invalid face_encoding Uint8Array length: ${user.face_encoding.length} bytes (expected at least 512)`
              );
              continue;
            }
            // Convert Uint8Array to Buffer first, then to Float32Array
            const buffer = Buffer.from(user.face_encoding);
            storedDescriptor = new Float32Array(buffer.buffer, buffer.byteOffset, 128);
          } else {
            console.warn(
              `[FACE-API-JS-AUTH] User ${
                user.id
              } has invalid face_encoding type: ${typeof user.face_encoding}, constructor: ${
                user.face_encoding?.constructor?.name
              }`
            );
            continue;
          }

          // Validate descriptor length
          if (!storedDescriptor || storedDescriptor.length !== 128) {
            console.warn(
              `[FACE-API-JS-AUTH] User ${user.id} has invalid descriptor length: ${
                storedDescriptor?.length || 0
              } (expected 128)`
            );
            continue;
          }

          // Calculate euclidean distance
          const distance = this._euclideanDistance(probeResult.descriptor, storedDescriptor);

          console.log(
            `[FACE-API-JS-AUTH] User ${user.id} (${user.email}): distance = ${distance.toFixed(4)}`
          );

          // Lower distance = more similar
          if (distance < bestDistance) {
            bestDistance = distance;
            bestMatch = user;
          }
        } catch (conversionError) {
          console.error(
            `[FACE-API-JS-AUTH] Error converting face_encoding for user ${user.id}:`,
            conversionError.message
          );
          continue;
        }
      }

      // face-api.js threshold: distance < 0.6 usually means same person
      const threshold = this.similarityThreshold || 0.6;

      console.log(
        `[FACE-API-JS-AUTH] Best match: ${
          bestMatch ? bestMatch.id : 'none'
        }, distance: ${bestDistance.toFixed(4)}, threshold: ${threshold}`
      );

      // Convert distance to similarity (0-1)
      const similarity = Math.max(0, 1 - Math.min(bestDistance / threshold, 1));

      if (bestDistance <= threshold && bestMatch) {
        return {
          recognized: true,
          faceDetected: true,
          confidence: similarity,
          distance: bestDistance,
          userId: bestMatch.id,
          message: 'Face recognized',
        };
      }

      return {
        recognized: false,
        faceDetected: true,
        confidence: similarity,
        distance: bestDistance,
        message: `Face not recognized (distance: ${bestDistance.toFixed(
          3
        )}, threshold: ${threshold})`,
      };
    } catch (error) {
      console.error('[FACE-API-JS-AUTH] Verify face error:', error);
      return {
        recognized: false,
        faceDetected: false,
        confidence: 0,
        error: error.message,
      };
    }
  }

  /**
   * Calculate euclidean distance between two face descriptors
   */
  _euclideanDistance(desc1, desc2) {
    if (!desc1 || !desc2) return Infinity;

    // Ensure both are Float32Array
    const arr1 = desc1 instanceof Float32Array ? desc1 : new Float32Array(desc1);
    const arr2 = desc2 instanceof Float32Array ? desc2 : new Float32Array(desc2);

    if (arr1.length !== arr2.length) return Infinity;

    let sum = 0;
    for (let i = 0; i < arr1.length; i++) {
      const diff = arr1[i] - arr2[i];
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  }
}

module.exports = new FaceRecognitionService();
