const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class HealthController {
  // ==================== HEALTH METRICS MANAGEMENT ====================

  // Get member's health metrics
  async getMemberHealthMetrics(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20, metric_type, start_date, end_date } = req.query;
      const skip = (page - 1) * limit;

      const where = { member_id: id };
      if (metric_type) where.metric_type = metric_type;
      if (start_date || end_date) {
        where.recorded_at = {};
        if (start_date) where.recorded_at.gte = new Date(start_date);
        if (end_date) where.recorded_at.lte = new Date(end_date);
      }

      const [metrics, total] = await Promise.all([
        prisma.healthMetric.findMany({
          where,
          skip: parseInt(skip),
          take: parseInt(limit),
          orderBy: { recorded_at: 'desc' },
        }),
        prisma.healthMetric.count({ where }),
      ]);

      res.json({
        success: true,
        message: 'Health metrics retrieved successfully',
        data: {
          metrics,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error('Get member health metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Record health metric
  async recordHealthMetric(req, res) {
    try {
      const { id } = req.params;
      const { metric_type, value, unit, source, notes } = req.body;

      // Validate required fields
      if (!metric_type || value === undefined || !unit) {
        return res.status(400).json({
          success: false,
          message: 'Metric type, value, and unit are required',
          data: null,
        });
      }

      // Validate metric type
      const validTypes = [
        'WEIGHT',
        'HEIGHT',
        'BODY_FAT',
        'MUSCLE_MASS',
        'BMI',
        'HEART_RATE',
        'BLOOD_PRESSURE',
        'FLEXIBILITY',
        'ENDURANCE',
      ];
      if (!validTypes.includes(metric_type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid metric type',
          data: null,
        });
      }

      const metric = await prisma.healthMetric.create({
        data: {
          member_id: id,
          metric_type,
          value: parseFloat(value),
          unit,
          source: source || 'MANUAL',
          notes,
        },
      });

      // If this is weight or height, calculate and store BMI
      if (metric_type === 'WEIGHT' || metric_type === 'HEIGHT') {
        await this.calculateAndStoreBMI(id);
      }

      res.status(201).json({
        success: true,
        message: 'Health metric recorded successfully',
        data: { metric },
      });
    } catch (error) {
      console.error('Record health metric error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Calculate and store BMI
  async calculateAndStoreBMI(memberId) {
    try {
      // Get latest weight and height
      const [latestWeight, latestHeight] = await Promise.all([
        prisma.healthMetric.findFirst({
          where: {
            member_id: memberId,
            metric_type: 'WEIGHT',
          },
          orderBy: { recorded_at: 'desc' },
        }),
        prisma.healthMetric.findFirst({
          where: {
            member_id: memberId,
            metric_type: 'HEIGHT',
          },
          orderBy: { recorded_at: 'desc' },
        }),
      ]);

      if (latestWeight && latestHeight) {
        // Convert height from cm to meters
        const heightInMeters = latestHeight.value / 100;
        const bmi = latestWeight.value / (heightInMeters * heightInMeters);

        // Store BMI
        await prisma.healthMetric.create({
          data: {
            member_id: memberId,
            metric_type: 'BMI',
            value: Math.round(bmi * 10) / 10, // Round to 1 decimal place
            unit: 'kg/m²',
            source: 'CALCULATED',
            notes: 'Auto-calculated from weight and height',
          },
        });
      }
    } catch (error) {
      console.error('Calculate BMI error:', error);
    }
  }

  // Get health trends
  async getHealthTrends(req, res) {
    try {
      const { id } = req.params;
      const { metric_type, period = '90' } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));

      const where = {
        member_id: id,
        recorded_at: { gte: startDate },
      };

      if (metric_type) {
        where.metric_type = metric_type;
      }

      const metrics = await prisma.healthMetric.findMany({
        where,
        orderBy: { recorded_at: 'asc' },
      });

      // Group metrics by type
      const trends = {};
      metrics.forEach(metric => {
        if (!trends[metric.metric_type]) {
          trends[metric.metric_type] = {
            type: metric.metric_type,
            unit: metric.unit,
            data: [],
          };
        }
        trends[metric.metric_type].data.push({
          date: metric.recorded_at,
          value: metric.value,
          source: metric.source,
        });
      });

      // Calculate trends (simple linear regression for trend direction)
      Object.keys(trends).forEach(type => {
        const data = trends[type].data;
        if (data.length >= 2) {
          const firstValue = data[0].value;
          const lastValue = data[data.length - 1].value;
          const change = lastValue - firstValue;
          const changePercent = (change / firstValue) * 100;

          trends[type].trend = {
            direction: change > 0 ? 'increasing' : change < 0 ? 'decreasing' : 'stable',
            change: Math.round(change * 100) / 100,
            changePercent: Math.round(changePercent * 100) / 100,
            firstValue,
            lastValue,
          };
        }
      });

      res.json({
        success: true,
        message: 'Health trends retrieved successfully',
        data: { trends },
      });
    } catch (error) {
      console.error('Get health trends error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Get health summary
  async getHealthSummary(req, res) {
    try {
      const { id } = req.params;

      // Get latest metrics for each type
      const metricTypes = [
        'WEIGHT',
        'HEIGHT',
        'BODY_FAT',
        'MUSCLE_MASS',
        'BMI',
        'HEART_RATE',
        'BLOOD_PRESSURE',
      ];

      const latestMetrics = {};

      for (const type of metricTypes) {
        const metric = await prisma.healthMetric.findFirst({
          where: {
            member_id: id,
            metric_type: type,
          },
          orderBy: { recorded_at: 'desc' },
        });

        if (metric) {
          latestMetrics[type] = {
            value: metric.value,
            unit: metric.unit,
            recorded_at: metric.recorded_at,
            source: metric.source,
          };
        }
      }

      // Get member's current info
      const member = await prisma.member.findUnique({
        where: { id },
        select: {
          height: true,
          weight: true,
          body_fat_percent: true,
          fitness_goals: true,
          medical_conditions: true,
          allergies: true,
        },
      });

      // Calculate health score (simplified)
      let healthScore = 0;
      let factors = 0;

      if (latestMetrics.BMI) {
        const bmi = latestMetrics.BMI.value;
        if (bmi >= 18.5 && bmi <= 24.9) {
          healthScore += 25; // Normal BMI
        } else if (bmi >= 25 && bmi <= 29.9) {
          healthScore += 15; // Overweight
        } else {
          healthScore += 5; // Underweight or obese
        }
        factors++;
      }

      if (latestMetrics.BODY_FAT) {
        const bodyFat = latestMetrics.BODY_FAT.value;
        // Assuming male ranges (would need gender-specific logic)
        if (bodyFat >= 6 && bodyFat <= 17) {
          healthScore += 25; // Normal body fat
        } else if (bodyFat >= 18 && bodyFat <= 24) {
          healthScore += 15; // Acceptable
        } else {
          healthScore += 5; // High or low
        }
        factors++;
      }

      if (latestMetrics.HEART_RATE) {
        const hr = latestMetrics.HEART_RATE.value;
        if (hr >= 60 && hr <= 100) {
          healthScore += 25; // Normal resting heart rate
        } else {
          healthScore += 10; // Outside normal range
        }
        factors++;
      }

      // Activity factor (based on recent gym sessions)
      const recentSessions = await prisma.gymSession.count({
        where: {
          member_id: id,
          entry_time: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
        },
      });

      if (recentSessions >= 3) {
        healthScore += 25; // Active
      } else if (recentSessions >= 1) {
        healthScore += 15; // Somewhat active
      } else {
        healthScore += 5; // Inactive
      }
      factors++;

      const finalHealthScore = factors > 0 ? Math.round(healthScore / factors) : 0;

      res.json({
        success: true,
        message: 'Health summary retrieved successfully',
        data: {
          summary: {
            healthScore: finalHealthScore,
            latestMetrics,
            memberInfo: member,
            recentActivity: {
              sessionsLastWeek: recentSessions,
            },
          },
        },
      });
    } catch (error) {
      console.error('Get health summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Bulk record health metrics
  async bulkRecordHealthMetrics(req, res) {
    try {
      const { id } = req.params;
      const { metrics } = req.body;

      if (!Array.isArray(metrics) || metrics.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Metrics array is required',
          data: null,
        });
      }

      const validTypes = [
        'WEIGHT',
        'HEIGHT',
        'BODY_FAT',
        'MUSCLE_MASS',
        'BMI',
        'HEART_RATE',
        'BLOOD_PRESSURE',
        'FLEXIBILITY',
        'ENDURANCE',
      ];

      // Validate all metrics
      for (const metric of metrics) {
        if (!metric.metric_type || metric.value === undefined || !metric.unit) {
          return res.status(400).json({
            success: false,
            message: 'Each metric must have metric_type, value, and unit',
            data: null,
          });
        }

        if (!validTypes.includes(metric.metric_type)) {
          return res.status(400).json({
            success: false,
            message: `Invalid metric type: ${metric.metric_type}`,
            data: null,
          });
        }
      }

      // Create all metrics
      const createdMetrics = await Promise.all(
        metrics.map(metric =>
          prisma.healthMetric.create({
            data: {
              member_id: id,
              metric_type: metric.metric_type,
              value: parseFloat(metric.value),
              unit: metric.unit,
              source: metric.source || 'MANUAL',
              notes: metric.notes,
            },
          })
        )
      );

      // Calculate BMI if weight or height was recorded
      const hasWeightOrHeight = metrics.some(
        m => m.metric_type === 'WEIGHT' || m.metric_type === 'HEIGHT'
      );
      if (hasWeightOrHeight) {
        await this.calculateAndStoreBMI(id);
      }

      res.status(201).json({
        success: true,
        message: 'Health metrics recorded successfully',
        data: { metrics: createdMetrics },
      });
    } catch (error) {
      console.error('Bulk record health metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = new HealthController();
