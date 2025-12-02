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
      return fs.existsSync(path.resolve(this.faceApiModelPath));
    } catch (e) {
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

      // Resize if too large
      if (imageInfo.width > this.maxFaceSize || imageInfo.height > this.maxFaceSize) {
        imageBuffer = await sharp(imageBuffer)
          .resize(this.maxFaceSize, this.maxFaceSize, { fit: 'inside' })
          .jpeg({ quality: 90 })
          .toBuffer();
      }

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

      const modelPath = path.resolve(this.faceApiModelPath);

      console.log(`[FACE-API-JS-AUTH] Loading models from: ${modelPath}`);

      // Load all required models
      await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
      await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
      await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);

      // Store references
      this.faceapi = faceapi;
      this.canvas = canvas;
      this.modelsLoaded = true;

      console.log('[FACE-API-JS-AUTH] Models loaded successfully');
    } catch (error) {
      console.error('[FACE-API-JS-AUTH] Failed to load models:', error);
      console.error('[FACE-API-JS-AUTH] Error details:', error.message);

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
      await this._loadFaceApiModels();

      // Convert buffer to canvas
      const img = await this.canvas.loadImage(imageBuffer);
      const imgCanvas = this.canvas.createCanvas(img.width, img.height);
      const ctx = imgCanvas.getContext('2d');
      ctx.drawImage(img, 0, 0, img.width, img.height);

      // Detect faces and extract descriptors
      const detections = await this.faceapi
        .detectAllFaces(imgCanvas)
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (!detections || detections.length === 0) {
        return {
          faceDetected: false,
          message: 'No face detected in image',
        };
      }

      // Get first face descriptor (128D Float32Array)
      const descriptor = detections[0].descriptor;

      // Convert Float32Array to Buffer for storage
      const descriptorBuffer = Buffer.from(descriptor.buffer);

      return {
        faceDetected: true,
        encoding: descriptorBuffer, // Store as Buffer (Bytes)
        descriptor: descriptor, // Keep original for comparison
        confidence: detections[0].detection.score,
        landmarks: detections[0].landmarks,
      };
    } catch (error) {
      console.error('[FACE-API-JS-AUTH] Extract encoding error:', error);
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

      for (const user of usersWithFaces) {
        if (!user.face_encoding) continue;

        // Convert stored encoding from Buffer to Float32Array
        let storedDescriptor;
        if (Buffer.isBuffer(user.face_encoding)) {
          storedDescriptor = new Float32Array(user.face_encoding.buffer);
        } else if (Array.isArray(user.face_encoding)) {
          storedDescriptor = new Float32Array(user.face_encoding);
        } else {
          continue;
        }

        // Calculate euclidean distance
        const distance = this._euclideanDistance(probeResult.descriptor, storedDescriptor);

        // Lower distance = more similar
        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = user;
        }
      }

      // face-api.js threshold: distance < 0.6 usually means same person
      const threshold = this.similarityThreshold || 0.6;

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
