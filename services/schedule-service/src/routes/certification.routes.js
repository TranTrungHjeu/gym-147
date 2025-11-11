const express = require('express');
const router = express.Router();
const certificationController = require('../controllers/certification.controller');
const adminCertificationController = require('../controllers/admin-certification.controller');
const s3UploadService = require('../services/s3-upload.service');

// ==================== CERTIFICATION ROUTES ====================
// NOTE: Routes for /trainers/:trainerId/certifications have been moved to trainer.routes.js
// to avoid route conflicts. Only non-trainer-specific routes remain here.

// Update certification
router.put('/certifications/:certId', certificationController.updateCertification);

// Delete certification
router.delete('/certifications/:certId', certificationController.deleteCertification);

// Scan certificate with AI
router.post('/scan-certificate', certificationController.scanCertificateWithAI);

// A4F AI Scan endpoint (with provider selection)
router.post('/scan-certificate-a4f', certificationController.scanCertificateWithA4F);

// ==================== ADMIN CERTIFICATION ROUTES ====================
// Get all pending certifications for admin review
router.get('/admin/certifications/pending', adminCertificationController.getPendingCertifications);

// Get all certifications with filters
router.get('/admin/certifications', adminCertificationController.getAllCertifications);

// Get certification by ID
router.get('/admin/certifications/:certId', adminCertificationController.getCertificationById);

// Verify (approve) a certification
router.put('/admin/certifications/:certId/verify', adminCertificationController.verifyCertification);

// Reject a certification
router.put('/admin/certifications/:certId/reject', adminCertificationController.rejectCertification);

// Suspend a certification
router.put('/admin/certifications/:certId/suspend', adminCertificationController.suspendCertification);

// Get certification statistics
router.get('/admin/certifications/stats', adminCertificationController.getCertificationStats);

// NOTE: All /trainers/:trainerId/... routes have been moved to trainer.routes.js to avoid route conflicts:
// - GET /trainers/:trainerId/certifications
// - POST /trainers/:trainerId/certifications
// - POST /trainers/:trainerId/upload-certificate
// - POST /trainers/:trainerId/presigned-url
// - GET /trainers/:trainerId/available-categories
// - GET /trainers/:trainerId/categories/:category/access

module.exports = router;