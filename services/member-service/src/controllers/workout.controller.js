const aiService = require('../services/ai.service');
const challengeService = require('../services/challenge.service.js');
// Use the shared Prisma client from lib/prisma.js
const { prisma } = require('../lib/prisma');

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

      // Get member to check membership type and validate workout plan limits
      const member = await prisma.member.findUnique({
        where: { id },
        select: { 
          id: true,
          membership_type: true,
        },
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found',
          data: null,
        });
      }

      // Check workout plan limits based on membership type
      const existingPlansCount = await prisma.workoutPlan.count({
        where: { member_id: id },
      });

      const membershipLimits = {
        BASIC: 0,
        STUDENT: 0,
        PREMIUM: 1,
        VIP: 3,
      };

      const maxPlans = membershipLimits[member.membership_type] || 0;

      if (existingPlansCount >= maxPlans) {
        return res.status(403).json({
          success: false,
          message: `You have reached the maximum number of workout plans (${maxPlans}) for your membership type (${member.membership_type}). ${member.membership_type === 'PREMIUM' ? 'Upgrade to VIP to create up to 3 plans.' : 'Upgrade your membership to create more plans.'}`,
          data: {
            current_count: existingPlansCount,
            max_allowed: maxPlans,
            membership_type: member.membership_type,
          },
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
      const { goal, difficulty, duration_weeks, preferences, custom_prompt } = req.body;

      // Get member's profile, membership type, and recent activity
      const member = await prisma.member.findUnique({
        where: { id },
        select: {
          id: true,
          membership_type: true,
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

      // Check workout plan limits based on membership type
      const existingPlansCount = await prisma.workoutPlan.count({
        where: { member_id: id },
      });

      const membershipLimits = {
        BASIC: 0,
        STUDENT: 0,
        PREMIUM: 1,
        VIP: 3,
      };

      const maxPlans = membershipLimits[member.membership_type] || 0;

      if (existingPlansCount >= maxPlans) {
        return res.status(403).json({
          success: false,
          message: `You have reached the maximum number of workout plans (${maxPlans}) for your membership type (${member.membership_type}). ${member.membership_type === 'PREMIUM' ? 'Upgrade to VIP to create up to 3 plans.' : 'Upgrade your membership to create more plans.'}`,
          data: {
            current_count: existingPlansCount,
            max_allowed: maxPlans,
            membership_type: member.membership_type,
          },
        });
      }

      // Get recent equipment usage to understand preferences
      const recentEquipment = await prisma.equipmentUsage.findMany({
        where: {
          member_id: id,
          start_time: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
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
      const aiResult = await aiService.generateWorkoutPlan({
        goal: goal || member.fitness_goals[0] || 'GENERAL_FITNESS',
        difficulty: difficulty || 'INTERMEDIATE',
        duration_weeks: duration_weeks || 4,
        member,
        recentEquipment,
        preferences,
        custom_prompt, // Pass custom prompt from user
      });

      // Nếu AI fail thì throw error, không dùng fallback
      if (!aiResult.success) {
        console.log('\n===== AI GENERATION FAILED =====');
        console.log('Error:', aiResult.error);
        console.log('='.repeat(60));

        return res.status(500).json({
          success: false,
          message: 'AI workout plan generation failed. Please try again.',
          error: aiResult.error,
          data: null,
        });
      }

      // Log AI success
      console.log('\n===== AI-GENERATED PLAN SUCCESS =====');
      console.log('Plan Name:', aiResult.data.name);
      console.log('Description:', aiResult.data.description);
      console.log('Exercises Count:', aiResult.data.exercises.length);
      console.log(
        'Sample Exercises:',
        aiResult.data.exercises
          .slice(0, 3)
          .map(ex => `${ex.name} (${ex.sets} sets x ${ex.reps} reps, rest: ${ex.rest})`)
          .join('\n   ')
      );
      console.log('='.repeat(60));

      const aiWorkoutPlan = {
        name: aiResult.data.name,
        description: aiResult.data.description,
        difficulty: difficulty || 'INTERMEDIATE',
        duration_weeks: duration_weeks || 4,
        goal: goal || member.fitness_goals[0] || 'GENERAL_FITNESS',
        exercises: aiResult.data.exercises,
      };

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

    // Flatten exercises into a single array for frontend
    // Frontend expects: [{ name, sets, reps, rest }, ...]
    const flatExercises = exercises;

    return {
      name: planName,
      description: `AI-generated ${difficulty.toLowerCase()} workout plan focused on ${goal
        .replace('_', ' ')
        .toLowerCase()}`,
      difficulty,
      duration_weeks,
      goal,
      exercises: flatExercises,
    };
  }

  generateWeightLossExercises(difficulty, equipmentCategories) {
    const baseExercises = [
      {
        name: 'Treadmill Running',
        category: 'CARDIO',
        sets: 1,
        reps: '20 phút',
        intensity: 'MODERATE',
        rest: '2 phút',
      },
      {
        name: 'Burpees',
        category: 'FUNCTIONAL',
        sets: 3,
        reps: 15,
        intensity: 'HIGH',
        rest: '1 phút',
      },
      {
        name: 'Mountain Climbers',
        category: 'FUNCTIONAL',
        sets: 3,
        reps: 20,
        intensity: 'HIGH',
        rest: '45 giây',
      },
      {
        name: 'Jumping Jacks',
        category: 'CARDIO',
        sets: 3,
        reps: '5 phút',
        intensity: 'MODERATE',
        rest: '1 phút',
      },
      {
        name: 'High Knees',
        category: 'CARDIO',
        sets: 3,
        reps: '5 phút',
        intensity: 'HIGH',
        rest: '1 phút',
      },
      {
        name: 'Plank',
        category: 'STRENGTH',
        sets: 3,
        reps: '60s',
        intensity: 'MODERATE',
        rest: '1 phút',
      },
      {
        name: 'Squats',
        category: 'STRENGTH',
        sets: 3,
        reps: 15,
        intensity: 'MODERATE',
        rest: '1 phút',
      },
      {
        name: 'Push-ups',
        category: 'STRENGTH',
        sets: 3,
        reps: 10,
        intensity: 'MODERATE',
        rest: '1 phút',
      },
      {
        name: 'Lunges',
        category: 'STRENGTH',
        sets: 3,
        reps: 12,
        intensity: 'MODERATE',
        rest: '1 phút',
      },
      {
        name: 'Bicycle Crunches',
        category: 'STRENGTH',
        sets: 3,
        reps: 20,
        intensity: 'MODERATE',
        rest: '45 giây',
      },
    ];

    return this.adjustExercisesForDifficulty(baseExercises, difficulty);
  }

  generateMuscleGainExercises(difficulty, equipmentCategories) {
    const baseExercises = [
      {
        name: 'Bench Press',
        category: 'STRENGTH',
        sets: 4,
        reps: 8,
        intensity: 'HIGH',
        rest: '2 phút',
      },
      {
        name: 'Squats',
        category: 'STRENGTH',
        sets: 4,
        reps: 10,
        intensity: 'HIGH',
        rest: '2 phút',
      },
      {
        name: 'Deadlifts',
        category: 'STRENGTH',
        sets: 4,
        reps: 6,
        intensity: 'HIGH',
        rest: '3 phút',
      },
      {
        name: 'Pull-ups',
        category: 'STRENGTH',
        sets: 3,
        reps: 8,
        intensity: 'HIGH',
        rest: '2 phút',
      },
      {
        name: 'Overhead Press',
        category: 'STRENGTH',
        sets: 3,
        reps: 10,
        intensity: 'HIGH',
        rest: '2 phút',
      },
      {
        name: 'Rows',
        category: 'STRENGTH',
        sets: 3,
        reps: 10,
        intensity: 'HIGH',
        rest: '1 phút 30 giây',
      },
      {
        name: 'Bicep Curls',
        category: 'STRENGTH',
        sets: 3,
        reps: 12,
        intensity: 'MODERATE',
        rest: '1 phút',
      },
      {
        name: 'Tricep Dips',
        category: 'STRENGTH',
        sets: 3,
        reps: 12,
        intensity: 'MODERATE',
        rest: '1 phút',
      },
      {
        name: 'Leg Press',
        category: 'STRENGTH',
        sets: 3,
        reps: 12,
        intensity: 'HIGH',
        rest: '1 phút 30 giây',
      },
      {
        name: 'Calf Raises',
        category: 'STRENGTH',
        sets: 4,
        reps: 15,
        intensity: 'MODERATE',
        rest: '1 phút',
      },
    ];

    return this.adjustExercisesForDifficulty(baseExercises, difficulty);
  }

  generateCardioExercises(difficulty, equipmentCategories) {
    const baseExercises = [
      {
        name: 'Treadmill Running',
        category: 'CARDIO',
        reps: '25 phút',
        sets: 1,
        intensity: 'MODERATE',
        rest: '2 phút',
      },
      {
        name: 'Cycling',
        category: 'CARDIO',
        reps: '20 phút',
        sets: 1,
        intensity: 'MODERATE',
        rest: '2 phút',
      },
      {
        name: 'Rowing Machine',
        category: 'CARDIO',
        reps: '15 phút',
        sets: 1,
        intensity: 'HIGH',
        rest: '2 phút',
      },
      {
        name: 'Elliptical',
        category: 'CARDIO',
        reps: '20 phút',
        sets: 1,
        intensity: 'MODERATE',
        rest: '2 phút',
      },
      {
        name: 'Jump Rope',
        category: 'CARDIO',
        reps: '10 phút',
        sets: 3,
        intensity: 'HIGH',
        rest: '1 phút',
      },
      {
        name: 'Stair Climbing',
        category: 'CARDIO',
        reps: '15 phút',
        sets: 1,
        intensity: 'HIGH',
        rest: '2 phút',
      },
      {
        name: 'Swimming',
        category: 'CARDIO',
        reps: '20 phút',
        sets: 1,
        intensity: 'MODERATE',
        rest: '2 phút',
      },
      {
        name: 'HIIT Circuit',
        category: 'CARDIO',
        reps: '20 phút',
        sets: 1,
        intensity: 'HIGH',
        rest: '3 phút',
      },
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
      BEGINNER: { sets: 0.7, reps: 0.8, intensity: 'LOW', rest: '1 phút 30 giây' },
      INTERMEDIATE: { sets: 1, reps: 1, intensity: 'MODERATE', rest: '1 phút' },
      ADVANCED: { sets: 1.2, reps: 1.1, intensity: 'HIGH', rest: '45 giây' },
      EXPERT: { sets: 1.5, reps: 1.2, intensity: 'HIGH', rest: '30 giây' },
    };

    const multiplier = difficultyMultipliers[difficulty] || difficultyMultipliers['INTERMEDIATE'];

    return exercises.map(exercise => {
      // Preserve existing rest time or use difficulty default
      const restTime = exercise.rest || multiplier.rest;

      return {
        name: exercise.name,
        sets: exercise.sets ? Math.round(exercise.sets * multiplier.sets) : 1,
        reps:
          typeof exercise.reps === 'number'
            ? Math.round(exercise.reps * multiplier.reps)
            : exercise.reps, // Keep string reps as-is (like "60s", "20 phút")
        rest: restTime,
        // Optional: keep category and intensity for backend reference
        category: exercise.category,
        intensity: multiplier.intensity,
      };
    });
  }

  // Get workout plan recommendations (AI-powered)
  async getWorkoutRecommendations(req, res) {
    try {
      const { id } = req.params;
      const { useAI = 'true' } = req.query; // Default to AI if available

      // Get member profile
      const member = await prisma.member.findUnique({
        where: { id },
        select: {
          id: true,
          height: true,
          weight: true,
          fitness_goals: true,
          medical_conditions: true,
          allergies: true,
        },
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found',
          data: null,
        });
      }

      // Get member's current active plan
      const activePlan = await prisma.workoutPlan.findFirst({
        where: {
          member_id: id,
          is_active: true,
        },
      });

      // Get recent equipment usage (last 30 days)
      const recentEquipment = await prisma.equipmentUsage.findMany({
        where: {
          member_id: id,
          start_time: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
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
        take: 50,
      });

      // Get recent gym sessions (last 30 days)
      const recentSessions = await prisma.gymSession.findMany({
        where: {
          member_id: id,
          entry_time: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { entry_time: 'desc' },
        take: 20,
      });

      // Get health metrics (last 90 days for trend analysis)
      const recentMetrics = await prisma.healthMetric.findMany({
        where: {
          member_id: id,
          recorded_at: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { recorded_at: 'desc' },
        take: 20,
      });

      let recommendations = [];
      let analysis = null;

      // Try AI-powered recommendations first
      if (useAI === 'true') {
        try {
          const aiResult = await aiService.generateWorkoutRecommendations({
            member,
            activePlan,
            recentEquipment,
            recentMetrics,
            recentSessions,
            fitnessGoals: member.fitness_goals,
          });

          if (aiResult.success && aiResult.recommendations.length > 0) {
            recommendations = aiResult.recommendations;
            analysis = aiResult.analysis;
            console.log('[SUCCESS] AI recommendations generated:', recommendations.length);
          } else {
            console.log('[WARNING] AI recommendations failed, falling back to rule-based');
            // Fall back to rule-based recommendations
            recommendations = this.generateRecommendations({
              activePlan,
              recentEquipment,
              recentMetrics,
              recentSessions,
            });
          }
        } catch (aiError) {
          console.error('AI recommendations error:', aiError);
          // Fall back to rule-based recommendations
          recommendations = this.generateRecommendations({
            activePlan,
            recentEquipment,
            recentMetrics,
            recentSessions,
          });
        }
      } else {
        // Use rule-based recommendations
        recommendations = this.generateRecommendations({
          activePlan,
          recentEquipment,
          recentMetrics,
          recentSessions,
        });
      }

      res.json({
        success: true,
        message: 'Workout recommendations retrieved successfully',
        data: {
          recommendations,
          analysis,
          generatedAt: new Date().toISOString(),
        },
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

  generateRecommendations({ activePlan, recentEquipment, recentMetrics, recentSessions }) {
    const recommendations = [];

    // Check if member has been active
    if (recentSessions && recentSessions.length === 0 && recentEquipment.length === 0) {
      recommendations.push({
        type: 'ACTIVITY',
        priority: 'HIGH',
        title: 'Start Your Fitness Journey',
        message:
          "You haven't been active recently. Consider starting with a beginner workout plan.",
        action: 'CREATE_WORKOUT_PLAN',
        data: { difficulty: 'BEGINNER' },
        reasoning: 'No recent gym sessions or equipment usage detected',
      });
    } else if (recentSessions && recentSessions.length > 0) {
      const daysSinceLastSession = Math.floor(
        (Date.now() - new Date(recentSessions[0].entry_time).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastSession > 7) {
        recommendations.push({
          type: 'ACTIVITY',
          priority: 'HIGH',
          title: 'Get Back on Track',
          message: `It's been ${daysSinceLastSession} days since your last workout. Time to get back to the gym!`,
          action: 'CREATE_WORKOUT_PLAN',
          data: { difficulty: 'BEGINNER' },
          reasoning: `Last session was ${daysSinceLastSession} days ago`,
        });
      }
    }

    // Check for variety in equipment usage
    if (recentEquipment && recentEquipment.length > 0) {
      const categories = [...new Set(recentEquipment.map(usage => usage.equipment?.category).filter(Boolean))];
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
          reasoning: `Only using ${categories.length} equipment category`,
        });
      }
    }

    // Check if current plan is getting stale
    if (activePlan) {
      const planAge = Math.floor(
        (Date.now() - new Date(activePlan.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (planAge > 30) {
        recommendations.push({
          type: 'PLAN_UPDATE',
          priority: 'MEDIUM',
          title: 'Update Your Workout Plan',
          message:
            'Your current workout plan is over a month old. Consider updating it for continued progress.',
          action: 'UPDATE_WORKOUT_PLAN',
          data: { planId: activePlan.id },
          reasoning: `Plan is ${planAge} days old`,
        });
      }
    } else if (recentSessions && recentSessions.length > 3) {
      // Has been active but no plan
      recommendations.push({
        type: 'PLAN_UPDATE',
        priority: 'MEDIUM',
        title: 'Create a Workout Plan',
        message: 'You\'ve been working out regularly! Consider creating a structured workout plan for better results.',
        action: 'CREATE_WORKOUT_PLAN',
        data: {},
        reasoning: 'Active but no workout plan',
      });
    }

    // Check for progress indicators
    if (recentMetrics && recentMetrics.length > 0) {
      const weightMetrics = recentMetrics.filter(m => m.metric_type === 'WEIGHT');
      if (weightMetrics.length >= 2) {
        const trend = weightMetrics[0].value - weightMetrics[weightMetrics.length - 1].value;
        if (Math.abs(trend) > 2) {
          recommendations.push({
            type: 'PROGRESS',
            priority: 'MEDIUM',
            title: trend > 0 ? 'Weight Gain Detected' : 'Weight Loss Progress',
            message: trend > 0
              ? 'You\'ve gained weight. Consider adjusting your workout plan to maintain your goals.'
              : 'Great progress on weight loss! Keep up the good work and consider adjusting your plan.',
            action: 'UPDATE_WORKOUT_PLAN',
            data: {},
            reasoning: `Weight ${trend > 0 ? 'increased' : 'decreased'} by ${Math.abs(trend).toFixed(1)}kg`,
          });
        }
      }
    }

    return recommendations;
  }

  // ==================== WORKOUT SESSION COMPLETION ====================

  /**
   * Complete a workout plan session and calculate calories
   * This endpoint is called when user completes a workout from a workout plan
   */
  async completeWorkoutSession(req, res) {
    try {
      const { id: memberId } = req.params; // Member ID
      const { workout_plan_id, completed_exercises, duration_minutes } = req.body;

      if (!workout_plan_id || !completed_exercises || !Array.isArray(completed_exercises)) {
        return res.status(400).json({
          success: false,
          message: 'workout_plan_id and completed_exercises array are required',
          data: null,
        });
      }

      // Get workout plan
      const workoutPlan = await prisma.workoutPlan.findUnique({
        where: { id: workout_plan_id },
        select: {
          id: true,
          member_id: true,
          name: true,
          exercises: true,
        },
      });

      if (!workoutPlan) {
        return res.status(404).json({
          success: false,
          message: 'Workout plan not found',
          data: null,
        });
      }

      // Verify member owns the workout plan
      if (workoutPlan.member_id !== memberId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this workout plan',
          data: null,
        });
      }

      // Parse exercises from JSON if needed
      const exercises = Array.isArray(workoutPlan.exercises)
        ? workoutPlan.exercises
        : typeof workoutPlan.exercises === 'string'
        ? JSON.parse(workoutPlan.exercises)
        : [];

      // Calculate calories from completed exercises
      const totalCalories = this.calculateCaloriesFromWorkoutExercises(
        exercises,
        completed_exercises
      );

      console.log('🔥 Workout session calories calculation:', {
        workoutPlanId: workout_plan_id,
        workoutPlanName: workoutPlan.name,
        totalExercises: exercises.length,
        completedExercises: completed_exercises.length,
        totalCalories,
        duration_minutes,
      });

      // Get or create active gym session
      let activeSession = await prisma.gymSession.findFirst({
        where: {
          member_id: memberId,
          exit_time: null,
        },
        orderBy: { entry_time: 'desc' },
      });

      if (!activeSession) {
        // Create a new gym session for this workout
        console.log('[PROCESS] Creating new gym session for workout plan completion');
        activeSession = await prisma.gymSession.create({
          data: {
            member_id: memberId,
            entry_method: 'MOBILE_APP',
            entry_gate: 'Workout Plan',
            entry_time: new Date(Date.now() - (duration_minutes || 60) * 60 * 1000), // Start time based on duration
          },
        });
        console.log('[SUCCESS] Created gym session:', activeSession.id);
      }

      // Get current calories from session
      const currentCalories = activeSession.calories_burned || 0;
      const newTotalCalories = currentCalories + totalCalories;

      // Update gym session with calories from workout plan
      const updatedSession = await prisma.gymSession.update({
        where: { id: activeSession.id },
        data: {
          calories_burned: newTotalCalories,
          notes: activeSession.notes
            ? `${activeSession.notes}\n\nCompleted workout plan: ${workoutPlan.name}. Burned ${totalCalories} kcal from ${completed_exercises.length} exercises.`
            : `Completed workout plan: ${workoutPlan.name}. Burned ${totalCalories} kcal from ${completed_exercises.length} exercises.`,
        },
      });

      console.log('[SUCCESS] Updated gym session with workout calories:', {
        sessionId: updatedSession.id,
        previousCalories: currentCalories,
        workoutCalories: totalCalories,
        newTotalCalories,
      });

      // [SUCCESS] Fix: Auto-update FITNESS challenges (async, don't wait)
      challengeService
        .autoUpdateFitnessChallenges(memberId, totalCalories, 1)
        .catch((err) => {
          console.error('Auto-update fitness challenges error:', err);
        });

      res.json({
        success: true,
        message: 'Workout session completed successfully',
        data: {
          session: updatedSession,
          workoutPlan: {
            id: workoutPlan.id,
            name: workoutPlan.name,
          },
          calories: {
            from_workout: totalCalories,
            total_in_session: newTotalCalories,
          },
          completed_exercises: completed_exercises.length,
          total_exercises: exercises.length,
        },
      });
    } catch (error) {
      console.error('Complete workout session error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message,
        data: null,
      });
    }
  }

  /**
   * Calculate calories from workout plan exercises
   * @param {Array} exercises - All exercises in the workout plan
   * @param {Array} completedExercises - Exercises that were actually completed
   * @returns {number} Total calories burned
   */
  calculateCaloriesFromWorkoutExercises(exercises, completedExercises) {
    // Calorie rates per minute based on exercise category/intensity
    const calorieRates = {
      CARDIO: {
        LOW: 8,
        MODERATE: 12,
        HIGH: 16,
      },
      STRENGTH: {
        LOW: 4,
        MODERATE: 6,
        HIGH: 8,
      },
      FUNCTIONAL: {
        LOW: 6,
        MODERATE: 8,
        HIGH: 12,
      },
      // Default rates
      default: {
        LOW: 5,
        MODERATE: 7,
        HIGH: 10,
      },
    };

    let totalCalories = 0;

    // Process each completed exercise
    completedExercises.forEach((completed) => {
      // Find matching exercise in workout plan
      const exercise = exercises.find(
        (ex) => ex.id === completed.id || ex.name === completed.name
      );

      if (!exercise) {
        console.warn(`[WARNING] Exercise not found in workout plan: ${completed.id || completed.name}`);
        return;
      }

      // Determine exercise category
      const category = exercise.category || completed.category || 'STRENGTH';
      const intensity = exercise.intensity || completed.intensity || 'MODERATE';

      // Get calorie rate for this category/intensity
      const rates = calorieRates[category] || calorieRates.default;
      const caloriesPerMinute = rates[intensity] || rates.MODERATE;

      // Calculate duration for this exercise
      let durationMinutes = 0;

      // If exercise has duration (cardio exercises like running)
      if (exercise.duration || completed.duration) {
        const durationSeconds =
          completed.duration || exercise.duration || 0;
        durationMinutes = durationSeconds / 60;
      } else if (exercise.rest || completed.rest) {
        // Calculate duration from sets, reps, and rest time
        const sets = completed.sets || exercise.sets || 1;
        const reps = completed.reps || exercise.reps || 10;

        // Parse rest time (e.g., "1 phút" -> 60 seconds, "45 giây" -> 45 seconds, or number in seconds)
        let restSeconds = 60; // default 1 minute
        const restTime = exercise.rest || completed.rest || '1 phút';

        if (typeof restTime === 'number') {
          restSeconds = restTime;
        } else if (typeof restTime === 'string') {
          const minutesMatch = restTime.match(/(\d+)\s*phút/i);
          const secondsMatch = restTime.match(/(\d+)\s*giây/i);
          if (minutesMatch) {
            restSeconds = parseInt(minutesMatch[1]) * 60;
          } else if (secondsMatch) {
            restSeconds = parseInt(secondsMatch[1]);
          } else {
            // Try to extract number
            const numMatch = restTime.match(/(\d+)/);
            if (numMatch) {
              restSeconds = parseInt(numMatch[1]);
            }
          }
        }

        // Estimate exercise time per set based on reps
        // Assume 2 seconds per rep for strength, 1 second per rep for cardio
        const timePerRep = category === 'CARDIO' ? 1 : 2;
        const repsNumber =
          typeof reps === 'number' ? reps : parseInt(String(reps).match(/\d+/)?.[0] || '10');
        const secondsPerSet = repsNumber * timePerRep;

        // Total duration: (sets * time_per_set) + (sets - 1) * rest_time
        const totalSeconds =
          sets * secondsPerSet + Math.max(0, sets - 1) * restSeconds;
        durationMinutes = totalSeconds / 60;
      } else {
        // Fallback: estimate based on sets and reps
        const sets = completed.sets || exercise.sets || 1;
        const repsNumber =
          typeof (completed.reps || exercise.reps) === 'number'
            ? completed.reps || exercise.reps
            : 10;

        // Estimate 3 minutes per set for strength, 5 minutes per set for cardio
        const minutesPerSet = category === 'CARDIO' ? 5 : 3;
        durationMinutes = sets * minutesPerSet;
      }

      // Calculate calories for this exercise
      const exerciseCalories = Math.round(durationMinutes * caloriesPerMinute);

      console.log(`  [STATS] Exercise: ${exercise.name}`, {
        category,
        intensity,
        sets: completed.sets || exercise.sets,
        reps: completed.reps || exercise.reps,
        duration_minutes: durationMinutes.toFixed(2),
        calories_per_minute: caloriesPerMinute,
        calories: exerciseCalories,
      });

      totalCalories += exerciseCalories;
    });

    // Ensure at least some calories if exercises were completed
    if (totalCalories === 0 && completedExercises.length > 0) {
      // Fallback: estimate 50 calories per exercise
      totalCalories = completedExercises.length * 50;
      console.log(`[WARNING] Using fallback calorie estimation: ${totalCalories} kcal`);
    }

    return totalCalories;
  }
}

module.exports = new WorkoutController();
