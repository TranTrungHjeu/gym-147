const express = require('express');
const router = express.Router();
const certificationController = require('../controllers/certification.controller');
const s3UploadService = require('../services/s3-upload.service');

// ==================== TRAINER CERTIFICATION ROUTES ====================

// Get all certifications for a trainer
router.get('/trainers/:trainerId/certifications', certificationController.getTrainerCertifications);

// Create new certification
router.post('/trainers/:trainerId/certifications', certificationController.createCertification);

// Update certification
router.put('/certifications/:certId', certificationController.updateCertification);

// Delete certification
router.delete('/certifications/:certId', certificationController.deleteCertification);

// Upload certificate file to S3
router.post('/trainers/:trainerId/upload-certificate', certificationController.uploadCertificateToS3);

// Generate presigned URL for direct upload
router.post('/trainers/:trainerId/presigned-url', certificationController.generatePresignedUrl);

// Scan certificate with AI
router.post('/scan-certificate', certificationController.scanCertificateWithAI);

// A4F AI Scan endpoint (with provider selection)
router.post('/scan-certificate-a4f', certificationController.scanCertificateWithA4F);

// Get available categories for trainer
router.get('/trainers/:trainerId/available-categories', certificationController.getAvailableCategories);

// Check category access
router.get('/trainers/:trainerId/categories/:category/access', certificationController.checkCategoryAccess);

module.exports = router;