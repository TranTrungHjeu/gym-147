const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class WorkoutController {
  // ==================== WORKOUT PLAN MANAGEMENT ====================

  // Get member's workout plans
  async getMemberWorkoutPlans(req, res) {
    try {
      const { id } = req.params;
      const { active_only = false } = req.query;

      const where = { member_id: id };
      if (active_only === 'true') {
        where.is_active = true;
      }

      const workoutPlans = await prisma.workoutPlan.findMany({
        where,
        orderBy: { created_at: 'desc' },
      });

      res.json({
        success: true,
        message: 'Workout plans retrieved successfully',
        data: { workoutPlans },
      });
    } catch (error) {
      console.error('Get member workout plans error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Get workout plan by ID
  async getWorkoutPlanById(req, res) {
    try {
      const { id } = req.params;

      const workoutPlan = await prisma.workoutPlan.findUnique({
        where: { id },
      });

      if (!workoutPlan) {
        return res.status(404).json({
          success: false,
          message: 'Workout plan not found',
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Workout plan retrieved successfully',
        data: { workoutPlan },
      });
    } catch (error) {
      console.error('Get workout plan by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Create workout plan
  async createWorkoutPlan(req, res) {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        difficulty,
        duration_weeks,
        goal,
        exercises,
        ai_generated = false,
        created_by,
      } = req.body;

      // Validate required fields
      if (!name || !difficulty || !duration_weeks || !goal || !exercises) {
        return res.status(400).json({
          success: false,
          message: 'Name, difficulty, duration_weeks, goal, and exercises are required',
          data: null,
        });
      }

      // Validate difficulty
      const validDifficulties = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
      if (!validDifficulties.includes(difficulty)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid difficulty level',
          data: null,
        });
      }

      // If this is not AI generated, deactivate other active plans
      if (!ai_generated) {
        await prisma.workoutPlan.updateMany({
          where: {
            member_id: id,
            is_active: true,
          },
          data: { is_active: false },
        });
      }

      const workoutPlan = await prisma.workoutPlan.create({
        data: {
          member_id: id,
          name,
          description,
          difficulty,
          duration_weeks: parseInt(duration_weeks),
          goal,
          exercises: typeof exercises === 'string' ? JSON.parse(exercises) : exercises,
          ai_generated,
          created_by,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Workout plan created successfully',
        data: { workoutPlan },
      });
    } catch (error) {
      console.error('Create workout plan error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Update workout plan
  async updateWorkoutPlan(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Remove fields that shouldn't be updated directly
      delete updateData.id;
      delete updateData.member_id;
      delete updateData.created_at;

      // Convert exercises to JSON if it's a string
      if (updateData.exercises && typeof updateData.exercises === 'string') {
        updateData.exercises = JSON.parse(updateData.exercises);
      }

      const workoutPlan = await prisma.workoutPlan.update({
        where: { id },
        data: {
          ...updateData,
          updated_at: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'Workout plan updated successfully',
        data: { workoutPlan },
      });
    } catch (error) {
      console.error('Update workout plan error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Activate workout plan
  async activateWorkoutPlan(req, res) {
    try {
      const { id } = req.params;

      // Deactivate all other plans for this member
      const workoutPlan = await prisma.workoutPlan.findUnique({
        where: { id },
        select: { member_id: true },
      });

      if (!workoutPlan) {
        return res.status(404).json({
          success: false,
          message: 'Workout plan not found',
          data: null,
        });
      }

      await prisma.workoutPlan.updateMany({
        where: {
          member_id: workoutPlan.member_id,
          is_active: true,
        },
        data: { is_active: false },
      });

      // Activate the selected plan
      const activatedPlan = await prisma.workoutPlan.update({
        where: { id },
        data: { is_active: true },
      });

      res.json({
        success: true,
        message: 'Workout plan activated successfully',
        data: { workoutPlan: activatedPlan },
      });
    } catch (error) {
      console.error('Activate workout plan error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Delete workout plan
  async deleteWorkoutPlan(req, res) {
    try {
      const { id } = req.params;

      await prisma.workoutPlan.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Workout plan deleted successfully',
        data: null,
      });
    } catch (error) {
      console.error('Delete workout plan error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // ==================== AI WORKOUT PLAN GENERATION ====================

  // Generate AI workout plan
  async generateAIWorkoutPlan(req, res) {
    try {
      const { id } = req.params;
      const { goal, difficulty, duration_weeks, preferences } = req.body;

      // Get member's profile and recent activity
      const member = await prisma.member.findUnique({
        where: { id },
        select: {
          fitness_goals: true,
          medical_conditions: true,
          allergies: true,
          height: true,
          weight: true,
        },
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found',
          data: null,
        });
      }

      // Get recent equipment usage to understand preferences
      const recentEquipment = await prisma.equipmentUsage.findMany({
        where: {
          member_id: id,
          start_time: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
        },
        include: {
          equipment: {
            select: {
              category: true,
              name: true,
            },
          },
        },
        orderBy: { start_time: 'desc' },
        take: 20,
      });

      // Simple AI logic (in real implementation, this would call an AI service)
      const aiWorkoutPlan = this.generateSimpleWorkoutPlan({
        goal: goal || member.fitness_goals[0] || 'GENERAL_FITNESS',
        difficulty: difficulty || 'INTERMEDIATE',
        duration_weeks: duration_weeks || 4,
        member,
        recentEquipment,
        preferences,
      });

      // Deactivate other AI-generated plans
      await prisma.workoutPlan.updateMany({
        where: {
          member_id: id,
          ai_generated: true,
          is_active: true,
        },
        data: { is_active: false },
      });

      // Create the AI-generated workout plan
      const workoutPlan = await prisma.workoutPlan.create({
        data: {
          member_id: id,
          name: aiWorkoutPlan.name,
          description: aiWorkoutPlan.description,
          difficulty: aiWorkoutPlan.difficulty,
          duration_weeks: aiWorkoutPlan.duration_weeks,
          goal: aiWorkoutPlan.goal,
          exercises: aiWorkoutPlan.exercises,
          ai_generated: true,
          created_by: 'AI_SYSTEM',
        },
      });

      res.status(201).json({
        success: true,
        message: 'AI workout plan generated successfully',
        data: { workoutPlan },
      });
    } catch (error) {
      console.error('Generate AI workout plan error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Simple workout plan generator (placeholder for real AI)
  generateSimpleWorkoutPlan({
    goal,
    difficulty,
    duration_weeks,
    member,
    recentEquipment,
    preferences,
  }) {
    const planName = `${goal.replace('_', ' ')} - ${difficulty} - ${duration_weeks} weeks`;

    // Analyze equipment preferences
    const equipmentCategories = {};
    recentEquipment.forEach(usage => {
      const category = usage.equipment.category;
      equipmentCategories[category] = (equipmentCategories[category] || 0) + 1;
    });

    // Generate exercises based on goal and preferences
    let exercises = [];

    switch (goal) {
      case 'WEIGHT_LOSS':
        exercises = this.generateWeightLossExercises(difficulty, equipmentCategories);
        break;
      case 'MUSCLE_GAIN':
        exercises = this.generateMuscleGainExercises(difficulty, equipmentCategories);
        break;
      case 'CARDIO_FITNESS':
        exercises = this.generateCardioExercises(difficulty, equipmentCategories);
        break;
      case 'STRENGTH':
        exercises = this.generateStrengthExercises(difficulty, equipmentCategories);
        break;
      default:
        exercises = this.generateGeneralFitnessExercises(difficulty, equipmentCategories);
    }

    return {
      name: planName,
      description: `AI-generated ${difficulty.toLowerCase()} workout plan focused on ${goal.replace('_', ' ').toLowerCase()}`,
      difficulty,
      duration_weeks,
      goal,
      exercises: {
        weeks: Array.from({ length: duration_weeks }, (_, weekIndex) => ({
          week: weekIndex + 1,
          days: Array.from({ length: 4 }, (_, dayIndex) => ({
            day: dayIndex + 1,
            exercises: exercises.slice(dayIndex * 3, (dayIndex + 1) * 3),
          })),
        })),
      },
    };
  }

  generateWeightLossExercises(difficulty, equipmentCategories) {
    const baseExercises = [
      { name: 'Treadmill Running', category: 'CARDIO', duration: 20, intensity: 'MODERATE' },
      { name: 'Burpees', category: 'FUNCTIONAL', sets: 3, reps: 15, intensity: 'HIGH' },
      { name: 'Mountain Climbers', category: 'FUNCTIONAL', sets: 3, reps: 20, intensity: 'HIGH' },
      { name: 'Jumping Jacks', category: 'CARDIO', duration: 5, intensity: 'MODERATE' },
      { name: 'High Knees', category: 'CARDIO', duration: 5, intensity: 'HIGH' },
      { name: 'Plank', category: 'STRENGTH', duration: 30, intensity: 'MODERATE' },
      { name: 'Squats', category: 'STRENGTH', sets: 3, reps: 15, intensity: 'MODERATE' },
      { name: 'Push-ups', category: 'STRENGTH', sets: 3, reps: 10, intensity: 'MODERATE' },
      { name: 'Lunges', category: 'STRENGTH', sets: 3, reps: 12, intensity: 'MODERATE' },
      { name: 'Bicycle Crunches', category: 'STRENGTH', sets: 3, reps: 20, intensity: 'MODERATE' },
    ];

    return this.adjustExercisesForDifficulty(baseExercises, difficulty);
  }

  generateMuscleGainExercises(difficulty, equipmentCategories) {
    const baseExercises = [
      { name: 'Bench Press', category: 'STRENGTH', sets: 4, reps: 8, intensity: 'HIGH' },
      { name: 'Squats', category: 'STRENGTH', sets: 4, reps: 10, intensity: 'HIGH' },
      { name: 'Deadlifts', category: 'STRENGTH', sets: 4, reps: 6, intensity: 'HIGH' },
      { name: 'Pull-ups', category: 'STRENGTH', sets: 3, reps: 8, intensity: 'HIGH' },
      { name: 'Overhead Press', category: 'STRENGTH', sets: 3, reps: 10, intensity: 'HIGH' },
      { name: 'Rows', category: 'STRENGTH', sets: 3, reps: 10, intensity: 'HIGH' },
      { name: 'Bicep Curls', category: 'STRENGTH', sets: 3, reps: 12, intensity: 'MODERATE' },
      { name: 'Tricep Dips', category: 'STRENGTH', sets: 3, reps: 12, intensity: 'MODERATE' },
      { name: 'Leg Press', category: 'STRENGTH', sets: 3, reps: 12, intensity: 'HIGH' },
      { name: 'Calf Raises', category: 'STRENGTH', sets: 4, reps: 15, intensity: 'MODERATE' },
    ];

    return this.adjustExercisesForDifficulty(baseExercises, difficulty);
  }

  generateCardioExercises(difficulty, equipmentCategories) {
    const baseExercises = [
      { name: 'Treadmill Running', category: 'CARDIO', duration: 25, intensity: 'MODERATE' },
      { name: 'Cycling', category: 'CARDIO', duration: 20, intensity: 'MODERATE' },
      { name: 'Rowing Machine', category: 'CARDIO', duration: 15, intensity: 'HIGH' },
      { name: 'Elliptical', category: 'CARDIO', duration: 20, intensity: 'MODERATE' },
      { name: 'Jump Rope', category: 'CARDIO', duration: 10, intensity: 'HIGH' },
      { name: 'Stair Climbing', category: 'CARDIO', duration: 15, intensity: 'HIGH' },
      { name: 'Swimming', category: 'CARDIO', duration: 20, intensity: 'MODERATE' },
      { name: 'HIIT Circuit', category: 'CARDIO', duration: 20, intensity: 'HIGH' },
    ];

    return this.adjustExercisesForDifficulty(baseExercises, difficulty);
  }

  generateStrengthExercises(difficulty, equipmentCategories) {
    return this.generateMuscleGainExercises(difficulty, equipmentCategories);
  }

  generateGeneralFitnessExercises(difficulty, equipmentCategories) {
    const cardioExercises = this.generateCardioExercises(difficulty, equipmentCategories);
    const strengthExercises = this.generateMuscleGainExercises(difficulty, equipmentCategories);

    return [...cardioExercises.slice(0, 5), ...strengthExercises.slice(0, 5)];
  }

  adjustExercisesForDifficulty(exercises, difficulty) {
    const difficultyMultipliers = {
      BEGINNER: { sets: 0.7, reps: 0.8, duration: 0.8, intensity: 'LOW' },
      INTERMEDIATE: { sets: 1, reps: 1, duration: 1, intensity: 'MODERATE' },
      ADVANCED: { sets: 1.2, reps: 1.1, duration: 1.2, intensity: 'HIGH' },
      EXPERT: { sets: 1.5, reps: 1.2, duration: 1.5, intensity: 'HIGH' },
    };

    const multiplier = difficultyMultipliers[difficulty] || difficultyMultipliers['INTERMEDIATE'];

    return exercises.map(exercise => ({
      ...exercise,
      sets: exercise.sets ? Math.round(exercise.sets * multiplier.sets) : exercise.sets,
      reps: exercise.reps ? Math.round(exercise.reps * multiplier.reps) : exercise.reps,
      duration: exercise.duration
        ? Math.round(exercise.duration * multiplier.duration)
        : exercise.duration,
      intensity: multiplier.intensity,
    }));
  }

  // Get workout plan recommendations
  async getWorkoutRecommendations(req, res) {
    try {
      const { id } = req.params;

      // Get member's current active plan
      const activePlan = await prisma.workoutPlan.findFirst({
        where: {
          member_id: id,
          is_active: true,
        },
      });

      // Get recent equipment usage
      const recentEquipment = await prisma.equipmentUsage.findMany({
        where: {
          member_id: id,
          start_time: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
        },
        include: {
          equipment: {
            select: {
              category: true,
              name: true,
            },
          },
        },
      });

      // Get health metrics
      const recentMetrics = await prisma.healthMetric.findMany({
        where: {
          member_id: id,
          recorded_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
        },
        orderBy: { recorded_at: 'desc' },
        take: 10,
      });

      // Generate recommendations based on data
      const recommendations = this.generateRecommendations({
        activePlan,
        recentEquipment,
        recentMetrics,
      });

      res.json({
        success: true,
        message: 'Workout recommendations retrieved successfully',
        data: { recommendations },
      });
    } catch (error) {
      console.error('Get workout recommendations error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  generateRecommendations({ activePlan, recentEquipment, recentMetrics }) {
    const recommendations = [];

    // Check if member has been active
    if (recentEquipment.length === 0) {
      recommendations.push({
        type: 'ACTIVITY',
        priority: 'HIGH',
        title: 'Start Your Fitness Journey',
        message:
          "You haven't been active recently. Consider starting with a beginner workout plan.",
        action: 'CREATE_WORKOUT_PLAN',
        data: { difficulty: 'BEGINNER' },
      });
    }

    // Check for variety in equipment usage
    const categories = [...new Set(recentEquipment.map(usage => usage.equipment.category))];
    if (categories.length < 2) {
      recommendations.push({
        type: 'VARIETY',
        priority: 'MEDIUM',
        title: 'Add Variety to Your Workouts',
        message: 'Try incorporating different types of exercises for better results.',
        action: 'SUGGEST_EXERCISES',
        data: {
          missingCategories: ['CARDIO', 'STRENGTH', 'FUNCTIONAL'].filter(
            cat => !categories.includes(cat)
          ),
        },
      });
    }

    // Check if current plan is getting stale
    if (activePlan && activePlan.created_at < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
      recommendations.push({
        type: 'PLAN_UPDATE',
        priority: 'MEDIUM',
        title: 'Update Your Workout Plan',
        message:
          'Your current workout plan is over a month old. Consider updating it for continued progress.',
        action: 'UPDATE_WORKOUT_PLAN',
        data: { planId: activePlan.id },
      });
    }

    return recommendations;
  }
}

module.exports = new WorkoutController();
