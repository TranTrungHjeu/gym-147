const { Router } = require('express');
const path = require('path');

const router = Router();

/**
 * Serve Privacy Policy page
 * GET /legal/privacy-policy
 */
router.get('/privacy-policy', (req, res) => {
  const filePath = path.join(__dirname, '../../../docs/privacy-policy.html');
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error serving privacy policy:', err);
      res.status(404).json({
        success: false,
        message: 'Privacy policy not found',
      });
    }
  });
});

/**
 * Serve Data Deletion page
 * GET /legal/data-deletion
 */
router.get('/data-deletion', (req, res) => {
  const filePath = path.join(__dirname, '../../../docs/data-deletion.html');
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error serving data deletion page:', err);
      res.status(404).json({
        success: false,
        message: 'Data deletion page not found',
      });
    }
  });
});

module.exports = { legalRoutes: router };


