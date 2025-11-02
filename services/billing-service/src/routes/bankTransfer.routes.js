const express = require('express');
const router = express.Router();
const bankTransferController = require('../controllers/bankTransfer.controller');

// Create bank transfer for payment
router.post('/create', bankTransferController.createBankTransfer);

// Get bank transfer by payment ID
router.get('/:paymentId', bankTransferController.getBankTransfer);

// Verify bank transfer manually
router.post('/:id/verify', bankTransferController.verifyBankTransfer);

// Cancel bank transfer
router.post('/:id/cancel', bankTransferController.cancelBankTransfer);

// Sepay webhook endpoint (no auth required)
router.post('/webhook/sepay', bankTransferController.handleSepayWebhook);

module.exports = router;
