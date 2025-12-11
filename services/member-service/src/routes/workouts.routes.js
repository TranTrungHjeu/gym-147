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
// Increase timeout for this route to handle long AI processing (10 minutes)
router.post('/members/:id/workout-plans/ai', (req, res, next) => {
  // Set timeout for this specific request
  req.setTimeout(600000); // 10 minutes
  res.setTimeout(600000); // 10 minutes
  workoutController.generateAIWorkoutPlan(req, res).catch(next);
});

// Get workout recommendations
router.get('/members/:id/workout-recommendations', (req, res) =>
  workoutController.getWorkoutRecommendations(req, res)
);

// ==================== WORKOUT SESSION ROUTES ====================

// Complete workout plan session and calculate calories
router.post('/members/:id/workout-sessions/complete', (req, res) =>
  workoutController.completeWorkoutSession(req, res)
);

module.exports = router;
