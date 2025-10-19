const express = require('express');
const router = express.Router();
const workoutController = require('../controllers/workout.controller');

// ==================== WORKOUT PLAN ROUTES ====================

// Get member's workout plans
router.get('/members/:id/workout-plans', (req, res) =>
  workoutController.getMemberWorkoutPlans(req, res)
);

// Get workout plan by ID
router.get('/workout-plans/:id', (req, res) => workoutController.getWorkoutPlanById(req, res));

// Create workout plan
router.post('/members/:id/workout-plans', (req, res) =>
  workoutController.createWorkoutPlan(req, res)
);

// Update workout plan
router.put('/workout-plans/:id', (req, res) => workoutController.updateWorkoutPlan(req, res));

// Activate workout plan
router.put('/workout-plans/:id/activate', (req, res) =>
  workoutController.activateWorkoutPlan(req, res)
);

// Delete workout plan
router.delete('/workout-plans/:id', (req, res) => workoutController.deleteWorkoutPlan(req, res));

// ==================== AI WORKOUT PLAN ROUTES ====================

// Generate AI workout plan
router.post('/members/:id/workout-plans/ai', (req, res) =>
  workoutController.generateAIWorkoutPlan(req, res)
);

// Get workout recommendations
router.get('/members/:id/workout-recommendations', (req, res) =>
  workoutController.getWorkoutRecommendations(req, res)
);

module.exports = router;
