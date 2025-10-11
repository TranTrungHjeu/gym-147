const express = require('express');
const { TenantController } = require('../controllers/tenant.controller.js');
const { authMiddleware } = require('../middleware/auth.middleware.js');

const router = express.Router();
const tenantController = new TenantController();

// Multi-tenant support routes
router.post('/join-gym', authMiddleware, (req, res) => tenantController.joinGym(req, res));
router.delete('/leave-gym/:gymId', authMiddleware, (req, res) =>
  tenantController.leaveGym(req, res)
);
router.get('/gym-memberships', authMiddleware, (req, res) =>
  tenantController.getGymMemberships(req, res)
);
router.put('/primary-gym', authMiddleware, (req, res) => tenantController.setPrimaryGym(req, res));

module.exports = { tenantRoutes: router };
