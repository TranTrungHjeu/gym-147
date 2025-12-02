const axios = require('axios');

/**
 * AI Service for generating personalized workout plans
 * Using OpenRouter API to access multiple AI models
 */
class AIService {
  constructor() {
    // Validate required environment variables
    this.apiKey = process.env.AI_API_KEY;
    if (!this.apiKey) {
      throw new Error('AI_API_KEY environment variable is required');
    }
    if (!process.env.AI_MODEL_URL) {
      throw new Error(
        'AI_MODEL_URL environment variable is required. Please set it in your .env file.'
      );
    }
    this.apiUrl = process.env.AI_MODEL_URL;
    this.modelName = process.env.AI_MODEL_NAME || 'tngtech/deepseek-r1t2-chimera:free';

    console.log('AI Service Config:', {
      apiUrl: this.apiUrl,
      modelName: this.modelName,
      hasApiKey: !!this.apiKey,
    });
  }

  /**
   * Generate personalized workout plan using AI
   * @param {Object} params - User parameters
   * @returns {Promise<Object>} Generated workout plan
   */
  async generateWorkoutPlan({
    goal,
    difficulty,
    duration_weeks,
    member,
    recentEquipment,
    preferences,
    custom_prompt,
  }) {
    try {
      // Calculate BMI and fitness level
      const bmi =
        member.weight && member.height
          ? (member.weight / Math.pow(member.height / 100, 2)).toFixed(1)
          : null;

      // Prepare equipment preference analysis
      const equipmentCategories = {};
      if (recentEquipment && recentEquipment.length > 0) {
        recentEquipment.forEach(usage => {
          const category = usage.equipment?.category || 'GENERAL';
          equipmentCategories[category] = (equipmentCategories[category] || 0) + 1;
        });
      }

      // Build AI prompt
      const prompt = this.buildWorkoutPrompt({
        goal,
        difficulty,
        duration_weeks,
        height: member.height,
        weight: member.weight,
        bmi,
        fitness_goals: member.fitness_goals || [],
        medical_conditions: member.medical_conditions || [],
        equipmentCategories,
        preferences,
        custom_prompt,
      });

      console.log('Calling AI to generate workout plan...');
      console.log('\nPROMPT:');
      console.log('-'.repeat(60));
      console.log(prompt);
      console.log('-'.repeat(60));

      // Combine system instruction with user prompt (some models don't support system message)
      const fullPrompt = `Bạn là huấn luyện viên thể hình chuyên nghiệp. Nhiệm vụ của bạn là tạo kế hoạch tập luyện an toàn và hiệu quả.

${prompt}`;

      const requestPayload = {
        model: this.modelName,
        messages: [
          {
            role: 'user',
            content: fullPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500, // Reduced for faster response
      };

      console.log('\nREQUEST PAYLOAD:');
      console.log(JSON.stringify(requestPayload, null, 2));

      // Call AI API
      console.log(`\nCalling: ${this.apiUrl}`);
      console.log(
        `Using API Key: ${this.apiKey.substring(0, 20)}...${this.apiKey.substring(
          this.apiKey.length - 4
        )}`
      );

      const response = await axios.post(this.apiUrl, requestPayload, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://gym-management-system.com',
          'X-Title': 'Gym Management - AI Workout Generator',
        },
        timeout: 60000, // 60 seconds timeout for AI processing
      });

      console.log('\nRAW RESPONSE STATUS:', response.status);
      console.log('RAW RESPONSE DATA STRUCTURE:', Object.keys(response.data));

      // Parse AI response
      if (!response.data || !response.data.choices || !response.data.choices[0]) {
        throw new Error('Invalid AI response structure');
      }

      const aiResponse = response.data.choices[0].message.content;

      console.log('\nAI RESPONSE:');
      console.log('-'.repeat(60));
      console.log(aiResponse || '(EMPTY RESPONSE)');
      console.log('-'.repeat(60));

      if (!aiResponse || aiResponse.trim() === '') {
        throw new Error('AI returned empty response');
      }

      // Extract JSON from AI response
      const workoutPlan = this.parseAIResponse(aiResponse);

      console.log('\nPARSED WORKOUT PLAN:');
      console.log(JSON.stringify(workoutPlan, null, 2));

      return {
        success: true,
        data: workoutPlan,
      };
    } catch (error) {
      console.error('\n===== AI SERVICE ERROR =====');
      console.error('Error Type:', error.name);
      console.error('Error Message:', error.message);
      if (error.response) {
        console.error('Response Status:', error.response.status);
        console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
      }
      console.error('='.repeat(60));

      // Return error, không dùng fallback
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Build detailed prompt for AI
   */
  buildWorkoutPrompt({
    goal,
    difficulty,
    duration_weeks,
    height,
    weight,
    bmi,
    fitness_goals,
    medical_conditions,
    equipmentCategories,
    preferences,
    custom_prompt,
  }) {
    const goalDescriptions = {
      WEIGHT_LOSS: 'giảm cân và đốt mỡ',
      MUSCLE_GAIN: 'tăng cơ và sức mạnh',
      BUILD_MUSCLE: 'xây dựng cơ bắp',
      CARDIO_FITNESS: 'tăng sức bền tim mạch',
      STRENGTH: 'tăng sức mạnh tổng thể',
      GENERAL_FITNESS: 'cải thiện thể lực tổng thể',
    };

    const difficultyDescriptions = {
      BEGINNER: 'người mới bắt đầu tập luyện',
      INTERMEDIATE: 'người đã có kinh nghiệm tập luyện trung bình',
      ADVANCED: 'người đã tập luyện lâu năm',
      EXPERT: 'vận động viên chuyên nghiệp',
    };

    return `
Tạo kế hoạch tập luyện cá nhân hóa cho người dùng với thông tin sau:

**THÔNG TIN CÁ NHÂN:**
- Chiều cao: ${height} cm
- Cân nặng: ${weight} kg
- BMI: ${bmi}
- Mục tiêu: ${goalDescriptions[goal] || goal}
- Trình độ: ${difficultyDescriptions[difficulty] || difficulty}
- Thời gian: ${duration_weeks} tuần

**TÌNH TRẠNG SỨC KHỎE:**
${
  medical_conditions.length > 0
    ? '- Tình trạng y tế: ' + medical_conditions.join(', ')
    : '- Không có vấn đề sức khỏe đặc biệt'
}

**THIẾT BỊ ƯA THÍCH:**
${
  Object.keys(equipmentCategories).length > 0
    ? '- Thiết bị đã sử dụng: ' + Object.keys(equipmentCategories).join(', ')
    : '- Chưa có dữ liệu thiết bị'
}

${
  custom_prompt
    ? `**YÊU CẦU ĐẶC BIỆT TỪ NGƯỜI DÙNG:**
${custom_prompt}

`
    : ''
}**YÊU CẦU:**
1. Tạo danh sách 10-12 bài tập phù hợp
2. Mỗi bài tập phải có: tên (tiếng Việt), số sets, số reps (có thể là số hoặc thời gian như "60s", "20 phút"), thời gian nghỉ
3. Bài tập phải an toàn, phù hợp với BMI và tình trạng sức khỏe
4. Cân bằng giữa cardio và strength training
5. Tăng dần cường độ phù hợp với trình độ
${custom_prompt ? '6. Ưu tiên và tích hợp các yêu cầu đặc biệt từ người dùng ở trên' : ''}

**FORMAT RESPONSE (BẮT BUỘC PHẢI LÀ JSON):**
Trả về ĐÚNG format JSON sau (không thêm markdown, không thêm text khác):

{
  "name": "Tên kế hoạch tập luyện",
  "description": "Mô tả ngắn gọn về kế hoạch",
  "exercises": [
    {
      "name": "Tên bài tập (Tiếng Việt)",
      "sets": 3,
      "reps": 15,
      "rest": "1 phút",
      "category": "CARDIO hoặc STRENGTH hoặc FUNCTIONAL",
      "intensity": "LOW hoặc MODERATE hoặc HIGH"
    }
  ]
}

LƯU Ý: 
- Trả về ĐÚNG JSON, KHÔNG thêm markdown code block
- "reps" có thể là số (15) hoặc string ("60s", "20 phút") cho bài cardio
- Mỗi bài tập PHẢI có đủ: name, sets, reps, rest
- Ví dụ: {"name":"Chạy bộ","sets":1,"reps":"20 phút","rest":"2 phút","category":"CARDIO","intensity":"MODERATE"}
`;
  }

  /**
   * Generate personalized workout recommendations using AI
   * @param {Object} params - Member data and activity
   * @returns {Promise<Object>} AI-generated recommendations
   */
  async generateWorkoutRecommendations({
    member,
    activePlan,
    recentEquipment,
    recentMetrics,
    recentSessions,
    fitnessGoals,
  }) {
    try {
      // Analyze member data
      const analysis = this.analyzeMemberData({
        member,
        activePlan,
        recentEquipment,
        recentMetrics,
        recentSessions,
        fitnessGoals,
      });

      // Build AI prompt for recommendations
      const prompt = this.buildRecommendationsPrompt(analysis);

      console.log('🤖 Calling AI for workout recommendations...');
      console.log('\nPROMPT:');
      console.log('-'.repeat(60));
      console.log(prompt);
      console.log('-'.repeat(60));

      const fullPrompt = `Bạn là huấn luyện viên thể hình chuyên nghiệp và cố vấn cá nhân. Nhiệm vụ của bạn là đưa ra các gợi ý tập luyện thông minh và cá nhân hóa dựa trên dữ liệu người dùng.

${prompt}

**YÊU CẦU:**
1. Phân tích thói quen tập luyện hiện tại
2. Đưa ra 3-5 gợi ý cụ thể và có thể thực hiện
3. Mỗi gợi ý phải có: type, priority, title, message, action, data
4. Ưu tiên các gợi ý dựa trên progress và goals

**FORMAT RESPONSE (BẮT BUỘC PHẢI LÀ JSON):**
Trả về ĐÚNG format JSON sau (không thêm markdown, không thêm text khác):

{
  "recommendations": [
    {
      "type": "ACTIVITY | VARIETY | PLAN_UPDATE | PROGRESS | GOAL_FOCUS | REST | INTENSITY",
      "priority": "HIGH | MEDIUM | LOW",
      "title": "Tiêu đề gợi ý",
      "message": "Mô tả chi tiết gợi ý",
      "action": "CREATE_WORKOUT_PLAN | UPDATE_WORKOUT_PLAN | SUGGEST_EXERCISES | REST_DAY | INCREASE_INTENSITY",
      "data": {
        "difficulty": "BEGINNER | INTERMEDIATE | ADVANCED",
        "equipment": ["equipment names"],
        "focus": "goal focus area"
      },
      "reasoning": "Lý do tại sao đưa ra gợi ý này"
    }
  ]
}

LƯU Ý: 
- Trả về ĐÚNG JSON, KHÔNG thêm markdown code block
- Phân tích dữ liệu thực tế để đưa ra gợi ý phù hợp
- Ưu tiên các gợi ý có thể cải thiện progress và goals`;

      const response = await axios.post(
        this.apiUrl,
        {
          model: this.modelName,
          messages: [
            {
              role: 'user',
              content: fullPrompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.AI_API_REFERER || '',
            'X-Title': 'GYM-147 Workout Recommendations',
          },
        }
      );

      const aiResponse = response.data.choices[0]?.message?.content || '';
      const parsed = this.parseRecommendationsResponse(aiResponse);

      return {
        success: true,
        recommendations: parsed.recommendations || [],
        analysis: analysis,
      };
    } catch (error) {
      console.error('AI recommendations generation error:', error);
      return {
        success: false,
        error: error.message,
        recommendations: [],
      };
    }
  }

  /**
   * Analyze member data for recommendations
   */
  analyzeMemberData({
    member,
    activePlan,
    recentEquipment,
    recentMetrics,
    recentSessions,
    fitnessGoals,
  }) {
    const analysis = {
      member: {
        height: member.height,
        weight: member.weight,
        bmi:
          member.weight && member.height
            ? (member.weight / Math.pow(member.height / 100, 2)).toFixed(1)
            : null,
        fitnessGoals: fitnessGoals || member.fitness_goals || [],
        medicalConditions: member.medical_conditions || [],
      },
      activity: {
        hasActivePlan: !!activePlan,
        planAge: activePlan
          ? Math.floor(
              (Date.now() - new Date(activePlan.created_at).getTime()) / (1000 * 60 * 60 * 24)
            )
          : null,
        recentSessions: recentSessions?.length || 0,
        daysSinceLastSession:
          recentSessions && recentSessions.length > 0
            ? Math.floor(
                (Date.now() - new Date(recentSessions[0].entry_time).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : null,
        equipmentCategories: {},
        totalEquipmentUses: recentEquipment?.length || 0,
      },
      health: {
        recentMetrics: recentMetrics?.length || 0,
        weightTrend: null,
        bodyFatTrend: null,
      },
    };

    // Analyze equipment usage
    if (recentEquipment && recentEquipment.length > 0) {
      recentEquipment.forEach(usage => {
        const category = usage.equipment?.category || 'GENERAL';
        analysis.activity.equipmentCategories[category] =
          (analysis.activity.equipmentCategories[category] || 0) + 1;
      });
    }

    // Analyze health trends
    if (recentMetrics && recentMetrics.length > 0) {
      const weightMetrics = recentMetrics
        .filter(m => m.metric_type === 'WEIGHT')
        .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));
      if (weightMetrics.length >= 2) {
        const latest = weightMetrics[0].value;
        const previous = weightMetrics[weightMetrics.length - 1].value;
        analysis.health.weightTrend =
          latest > previous ? 'INCREASING' : latest < previous ? 'DECREASING' : 'STABLE';
      }

      const bodyFatMetrics = recentMetrics
        .filter(m => m.metric_type === 'BODY_FAT')
        .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));
      if (bodyFatMetrics.length >= 2) {
        const latest = bodyFatMetrics[0].value;
        const previous = bodyFatMetrics[bodyFatMetrics.length - 1].value;
        analysis.health.bodyFatTrend =
          latest > previous ? 'INCREASING' : latest < previous ? 'DECREASING' : 'STABLE';
      }
    }

    return analysis;
  }

  /**
   * Build prompt for AI recommendations
   */
  buildRecommendationsPrompt(analysis) {
    return `
**THÔNG TIN THÀNH VIÊN:**
- Chiều cao: ${analysis.member.height || 'N/A'} cm
- Cân nặng: ${analysis.member.weight || 'N/A'} kg
- BMI: ${analysis.member.bmi || 'N/A'}
- Mục tiêu: ${analysis.member.fitnessGoals.join(', ') || 'Chưa có mục tiêu cụ thể'}
- Tình trạng sức khỏe: ${analysis.member.medicalConditions.join(', ') || 'Không có'}

**HOẠT ĐỘNG GẦN ĐÂY:**
- Có kế hoạch tập đang active: ${analysis.activity.hasActivePlan ? 'Có' : 'Không'}
${analysis.activity.planAge ? `- Kế hoạch đã được tạo: ${analysis.activity.planAge} ngày trước` : ''}
- Số phiên tập gần đây: ${analysis.activity.recentSessions} phiên
${analysis.activity.daysSinceLastSession !== null ? `- Số ngày kể từ lần tập cuối: ${analysis.activity.daysSinceLastSession} ngày` : '- Chưa có dữ liệu phiên tập'}
- Tổng số lần sử dụng thiết bị: ${analysis.activity.totalEquipmentUses} lần
${
  Object.keys(analysis.activity.equipmentCategories).length > 0
    ? `- Thiết bị đã sử dụng: ${Object.entries(analysis.activity.equipmentCategories)
        .map(([cat, count]) => `${cat} (${count} lần)`)
        .join(', ')}`
    : '- Chưa sử dụng thiết bị nào'
}

**XU HƯỚNG SỨC KHỎE:**
- Số metrics gần đây: ${analysis.health.recentMetrics} metrics
${analysis.health.weightTrend ? `- Xu hướng cân nặng: ${analysis.health.weightTrend === 'INCREASING' ? 'Tăng' : analysis.health.weightTrend === 'DECREASING' ? 'Giảm' : 'Ổn định'}` : ''}
${analysis.health.bodyFatTrend ? `- Xu hướng mỡ cơ thể: ${analysis.health.bodyFatTrend === 'INCREASING' ? 'Tăng' : analysis.health.bodyFatTrend === 'DECREASING' ? 'Giảm' : 'Ổn định'}` : ''}
`;
  }

  /**
   * Parse AI recommendations response
   */
  parseRecommendationsResponse(aiResponse) {
    try {
      // Remove markdown code blocks if present
      let cleanedResponse = aiResponse.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      }

      // Use the same cleaning logic
      cleanedResponse = this.cleanJSONString(cleanedResponse);

      const parsed = JSON.parse(cleanedResponse);
      return parsed;
    } catch (error) {
      console.error('AI recommendations response parsing error:', error);
      console.error('Raw response (first 500 chars):', aiResponse.substring(0, 500));
      console.error('Error position:', error.message.match(/position (\d+)/)?.[1] || 'unknown');
      throw new Error('AI response parsing failed: ' + error.message);
    }
  }

  /**
   * Generate personalized class recommendations using AI
   * @param {Object} params - Member data and class activity
   * @returns {Promise<Object>} AI-generated class recommendations
   */
  async generateClassRecommendations({
    member,
    attendanceHistory,
    bookingsHistory,
    favorites,
    upcomingSchedules,
    fitnessGoals,
  }) {
    try {
      // Analyze member data
      const analysis = this.analyzeClassData({
        member,
        attendanceHistory,
        bookingsHistory,
        favorites,
        upcomingSchedules,
        fitnessGoals,
      });

      // Build AI prompt for recommendations
      const prompt = this.buildClassRecommendationsPrompt(analysis);

      console.log('🤖 Calling AI for class recommendations...');
      console.log('\nPROMPT:');
      console.log('-'.repeat(60));
      console.log(prompt);
      console.log('-'.repeat(60));

      const fullPrompt = `Bạn là chuyên gia tư vấn lớp học thể hình. Nhiệm vụ của bạn là đưa ra các gợi ý lớp học thông minh và cá nhân hóa dựa trên dữ liệu người dùng.

${prompt}

**YÊU CẦU:**
1. Phân tích thói quen tham gia lớp học hiện tại
2. Đưa ra 3-5 gợi ý lớp học cụ thể và có thể tham gia
3. Mỗi gợi ý phải có: type, priority, title, message, action, data
4. Ưu tiên các gợi ý dựa trên goals, attendance patterns, và schedule availability

**FORMAT RESPONSE (BẮT BUỘC PHẢI LÀ JSON):**
Trả về ĐÚNG format JSON sau (không thêm markdown, không thêm text khác):

{
  "recommendations": [
    {
      "type": "NEW_CLASS | REPEAT_CLASS | TIME_SUGGESTION | CATEGORY_EXPLORATION | TRAINER_RECOMMENDATION",
      "priority": "HIGH | MEDIUM | LOW",
      "title": "Tiêu đề gợi ý",
      "message": "Mô tả chi tiết gợi ý",
      "action": "BOOK_CLASS | VIEW_SCHEDULE | EXPLORE_CATEGORY | FOLLOW_TRAINER",
      "data": {
        "classId": "class_id",
        "classCategory": "category",
        "trainerId": "trainer_id",
        "scheduleId": "schedule_id",
        "suggestedTime": "time suggestion"
      },
      "reasoning": "Lý do tại sao đưa ra gợi ý này"
    }
  ]
}

LƯU Ý: 
- Trả về ĐÚNG JSON, KHÔNG thêm markdown code block
- Phân tích dữ liệu thực tế để đưa ra gợi ý phù hợp
- Ưu tiên các gợi ý có thể cải thiện fitness goals và engagement`;

      console.log('[EMIT] Sending request to AI API...');
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.modelName,
          messages: [
            {
              role: 'user',
              content: fullPrompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1500, // Reduced for faster response
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.AI_API_REFERER || '',
            'X-Title': 'GYM-147 Class Recommendations',
          },
          timeout: 60000, // 60 seconds timeout for AI processing
        }
      );

      console.log('[SUCCESS] AI API Response received:', {
        status: response.status,
        hasChoices: !!response.data?.choices,
        choicesCount: response.data?.choices?.length || 0,
      });

      const aiResponse = response.data.choices[0]?.message?.content || '';
      console.log('[PROCESS] Raw AI Response (first 200 chars):', aiResponse.substring(0, 200));

      const parsed = this.parseRecommendationsResponse(aiResponse);
      console.log('[SUCCESS] Parsed recommendations:', parsed.recommendations?.length || 0);

      return {
        success: true,
        recommendations: parsed.recommendations || [],
        analysis: analysis,
      };
    } catch (error) {
      const status = error.response?.status;
      const isRateLimit = status === 429;
      const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout');

      console.error('[ERROR] AI class recommendations generation error:', {
        message: error.message,
        code: error.code,
        status: status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        isTimeout: isTimeout,
        isRateLimit: isRateLimit,
      });

      // Return specific error for rate limiting
      if (isRateLimit) {
        return {
          success: false,
          error:
            'AI service rate limit exceeded. Please try again later or use rule-based recommendations.',
          errorCode: 'RATE_LIMIT_EXCEEDED',
          recommendations: [],
        };
      }

      return {
        success: false,
        error: error.message,
        errorCode: isTimeout ? 'TIMEOUT' : 'AI_ERROR',
        recommendations: [],
      };
    }
  }

  /**
   * Analyze class data for recommendations
   */
  analyzeClassData({
    member,
    attendanceHistory,
    bookingsHistory,
    favorites,
    upcomingSchedules,
    fitnessGoals,
  }) {
    const analysis = {
      member: {
        fitnessGoals: fitnessGoals || member.fitness_goals || [],
        medicalConditions: member.medical_conditions || [],
      },
      attendance: {
        totalClasses: attendanceHistory?.length || 0,
        recentClasses:
          attendanceHistory?.filter(a => {
            const date = new Date(a.schedule?.start_time || a.created_at);
            return date > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          }).length || 0,
        favoriteCategories: {},
        favoriteTrainers: {},
        attendanceRate: 0,
      },
      bookings: {
        totalBookings: bookingsHistory?.length || 0,
        upcomingBookings: upcomingSchedules?.length || 0,
        cancellationRate: 0,
      },
      preferences: {
        favoriteClasses:
          favorites?.filter(f => f.favorite_type === 'CLASS').map(f => f.favorite_id) || [],
        favoriteTrainers:
          favorites?.filter(f => f.favorite_type === 'TRAINER').map(f => f.favorite_id) || [],
      },
    };

    // Analyze attendance patterns
    if (attendanceHistory && attendanceHistory.length > 0) {
      attendanceHistory.forEach(attendance => {
        const schedule = attendance.schedule;
        if (schedule?.gym_class) {
          const category = schedule.gym_class.category;
          analysis.attendance.favoriteCategories[category] =
            (analysis.attendance.favoriteCategories[category] || 0) + 1;
        }
        if (schedule?.trainer_id) {
          analysis.attendance.favoriteTrainers[schedule.trainer_id] =
            (analysis.attendance.favoriteTrainers[schedule.trainer_id] || 0) + 1;
        }
      });

      // Calculate attendance rate
      const totalBooked = bookingsHistory?.length || 0;
      const totalAttended = attendanceHistory.length;
      if (totalBooked > 0) {
        analysis.attendance.attendanceRate = (totalAttended / totalBooked) * 100;
      }
    }

    // Analyze cancellation rate
    if (bookingsHistory && bookingsHistory.length > 0) {
      const cancelled = bookingsHistory.filter(b => b.status === 'CANCELLED').length;
      analysis.bookings.cancellationRate = (cancelled / bookingsHistory.length) * 100;
    }

    return analysis;
  }

  /**
   * Build prompt for AI class recommendations
   */
  buildClassRecommendationsPrompt(analysis) {
    return `
**THÔNG TIN THÀNH VIÊN:**
- Mục tiêu: ${analysis.member.fitnessGoals.join(', ') || 'Chưa có mục tiêu cụ thể'}
- Tình trạng sức khỏe: ${analysis.member.medicalConditions.join(', ') || 'Không có'}

**LỊCH SỬ THAM GIA:**
- Tổng số lớp đã tham gia: ${analysis.attendance.totalClasses} lớp
- Số lớp gần đây (30 ngày): ${analysis.attendance.recentClasses} lớp
- Tỷ lệ tham gia: ${analysis.attendance.attendanceRate.toFixed(1)}%
${
  Object.keys(analysis.attendance.favoriteCategories).length > 0
    ? `- Danh mục yêu thích: ${Object.entries(analysis.attendance.favoriteCategories)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([cat, count]) => `${cat} (${count} lần)`)
        .join(', ')}`
    : '- Chưa có dữ liệu danh mục'
}
${Object.keys(analysis.attendance.favoriteTrainers).length > 0 ? `- Huấn luyện viên yêu thích: ${Object.keys(analysis.attendance.favoriteTrainers).length} người` : ''}

**ĐẶT CHỖ:**
- Tổng số đặt chỗ: ${analysis.bookings.totalBookings} lần
- Số đặt chỗ sắp tới: ${analysis.bookings.upcomingBookings} lần
- Tỷ lệ hủy: ${analysis.bookings.cancellationRate.toFixed(1)}%

**YÊU THÍCH:**
- Lớp yêu thích: ${analysis.preferences.favoriteClasses.length} lớp
- Huấn luyện viên yêu thích: ${analysis.preferences.favoriteTrainers.length} người
`;
  }

  /**
   * Parse AI response and extract workout plan
   */
  parseAIResponse(aiResponse) {
    try {
      // Try to find JSON in response
      let jsonStr = aiResponse.trim();

      // Remove markdown code blocks if present
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');

      // Find JSON object (match from first { to last })
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      // Clean common JSON issues
      jsonStr = this.cleanJSONString(jsonStr);

      const parsed = JSON.parse(jsonStr);

      // Validate structure
      if (!parsed.exercises || !Array.isArray(parsed.exercises)) {
        throw new Error('Invalid workout plan structure: missing exercises array');
      }

      // Ensure all exercises have required fields
      parsed.exercises = parsed.exercises.map((ex, idx) => ({
        name: ex.name || `Bài tập ${idx + 1}`,
        sets: ex.sets || 3,
        reps: ex.reps || 10,
        rest: ex.rest || '1 phút',
        category: ex.category || 'GENERAL',
        intensity: ex.intensity || 'MODERATE',
      }));

      return parsed;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.error('Raw response (first 500 chars):', aiResponse.substring(0, 500));
      console.error('Error position:', error.message.match(/position (\d+)/)?.[1] || 'unknown');
      throw new Error('AI response parsing failed: ' + error.message);
    }
  }

  /**
   * Clean JSON string to fix common issues
   */
  cleanJSONString(jsonStr) {
    try {
      // First, try to parse as-is
      JSON.parse(jsonStr);
      return jsonStr;
    } catch (error) {
      // If parsing fails, try to fix common issues
      let cleaned = jsonStr;

      // Fix trailing commas in arrays: [1, 2, 3, ] -> [1, 2, 3]
      cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

      // Fix trailing commas in objects: { "a": 1, } -> { "a": 1 }
      cleaned = cleaned.replace(/,(\s*[}])/g, '$1');

      // Fix missing commas between array elements (but be careful with nested structures)
      // Only fix if there's a closing brace/brace followed by opening brace/bracket on same or next line
      cleaned = cleaned.replace(/}\s*\n\s*{/g, '},\n{');
      cleaned = cleaned.replace(/]\s*\n\s*\[/g, '],\n[');

      // Remove comments (single line and multi-line)
      cleaned = cleaned.replace(/\/\/.*$/gm, '');
      cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');

      // Try parsing again
      try {
        JSON.parse(cleaned);
        return cleaned;
      } catch (e) {
        // If still fails, try to extract and fix the exercises array specifically
        // Use a more robust approach to find the exercises array (handles nested objects)
        const exercisesMatch = cleaned.match(/"exercises"\s*:\s*\[/);
        if (exercisesMatch) {
          const startIndex = exercisesMatch.index + exercisesMatch[0].length;
          let bracketCount = 1;
          let endIndex = startIndex;

          // Find the matching closing bracket for exercises array
          for (let i = startIndex; i < cleaned.length && bracketCount > 0; i++) {
            if (cleaned[i] === '[') bracketCount++;
            if (cleaned[i] === ']') bracketCount--;
            if (bracketCount === 0) {
              endIndex = i;
              break;
            }
          }

          if (endIndex > startIndex) {
            // Extract and fix exercises array content
            let exercisesStr = cleaned.substring(startIndex, endIndex);

            // Remove trailing commas in exercises array
            exercisesStr = exercisesStr.replace(/,(\s*[}\]])/g, '$1');

            // Fix missing commas between exercise objects
            exercisesStr = exercisesStr.replace(/}\s*\n\s*{/g, '},\n{');

            // Reconstruct JSON with fixed exercises
            const beforeExercises = cleaned.substring(0, startIndex);
            const afterExercises = cleaned.substring(endIndex);
            cleaned = beforeExercises + exercisesStr + afterExercises;

            // Final cleanup
            cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
          }
        }

        // Last attempt to parse
        try {
          JSON.parse(cleaned);
          return cleaned;
        } catch (finalError) {
          // If all fixes fail, throw original error with context
          throw new Error(
            `JSON parsing failed after cleanup attempts. Original error: ${error.message}. Position: ${error.message.match(/position (\d+)/)?.[1] || 'unknown'}`
          );
        }
      }
    }
  }

  /**
   * Generate smart scheduling suggestions using AI
   * @param {Object} params - Member data and analysis
   * @returns {Promise<Object>} AI-generated scheduling suggestions
   */
  async generateSchedulingSuggestions({ member, analysis, attendanceHistory, bookingsHistory }) {
    try {
      const prompt = this.buildSchedulingPrompt({
        member,
        analysis,
        attendanceHistory,
        bookingsHistory,
      });

      console.log('🤖 Calling AI for scheduling suggestions...');
      console.log('\nPROMPT:');
      console.log('-'.repeat(60));
      console.log(prompt);
      console.log('-'.repeat(60));

      const fullPrompt = `Bạn là chuyên gia tư vấn lịch tập luyện. Nhiệm vụ của bạn là đưa ra các gợi ý thời gian đặt chỗ lớp học thông minh dựa trên thói quen và lịch sử của thành viên.

${prompt}

**YÊU CẦU:**
1. Phân tích patterns và đưa ra 3-5 gợi ý thời gian tối ưu
2. Mỗi gợi ý phải có: scheduleId, priority, reason
3. Ưu tiên các khung giờ phù hợp với thói quen và có sẵn chỗ

**FORMAT RESPONSE (BẮT BUỘC PHẢI LÀ JSON):**
Trả về ĐÚNG format JSON sau (không thêm markdown, không thêm text khác):

{
  "suggestions": [
    {
      "scheduleId": "schedule_id",
      "priority": "HIGH | MEDIUM | LOW",
      "reason": "Lý do tại sao đưa ra gợi ý này",
      "score": 85
    }
  ]
}

LƯU Ý: 
- Trả về ĐÚNG JSON, KHÔNG thêm markdown code block
- Phân tích patterns thực tế để đưa ra gợi ý phù hợp
- Ưu tiên các khung giờ có nhiều điểm số cao và phù hợp với thói quen`;

      console.log('[EMIT] Sending request to AI API...');
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.modelName,
          messages: [
            {
              role: 'user',
              content: fullPrompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1500, // Reduced for faster response
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.AI_API_REFERER || '',
            'X-Title': 'GYM-147 Smart Scheduling',
          },
          timeout: 60000, // 60 seconds timeout for AI processing
        }
      );

      console.log('[SUCCESS] AI API Response received:', {
        status: response.status,
        hasChoices: !!response.data?.choices,
        choicesCount: response.data?.choices?.length || 0,
      });

      const aiResponse = response.data.choices[0]?.message?.content || '';
      console.log('[PROCESS] Raw AI Response (first 200 chars):', aiResponse.substring(0, 200));

      const parsed = this.parseRecommendationsResponse(aiResponse);
      console.log('[SUCCESS] Parsed suggestions:', parsed.suggestions?.length || 0);

      return {
        success: true,
        suggestions: parsed.suggestions || [],
      };
    } catch (error) {
      const status = error.response?.status;
      const isRateLimit = status === 429;
      const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout');

      console.error('[ERROR] AI scheduling suggestions generation error:', {
        message: error.message,
        code: error.code,
        status: status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        isTimeout: isTimeout,
        isRateLimit: isRateLimit,
      });

      // Return specific error for rate limiting
      if (isRateLimit) {
        return {
          success: false,
          error:
            'AI service rate limit exceeded. Please try again later or use rule-based suggestions.',
          errorCode: 'RATE_LIMIT_EXCEEDED',
          suggestions: [],
        };
      }

      return {
        success: false,
        error: error.message,
        errorCode: isTimeout ? 'TIMEOUT' : 'AI_ERROR',
        suggestions: [],
      };
    }
  }

  /**
   * Build prompt for scheduling suggestions
   */
  buildSchedulingPrompt({ member, analysis, attendanceHistory, bookingsHistory }) {
    const { patterns, availableSchedules } = analysis;

    return `
**THÔNG TIN THÀNH VIÊN:**
- Mục tiêu: ${member.fitnessGoals?.join(', ') || 'Chưa có mục tiêu cụ thể'}
- Tình trạng sức khỏe: ${member.medicalConditions?.join(', ') || 'Không có'}

**PHÂN TÍCH THÓI QUEN:**
- Giờ ưa thích: ${patterns.preferredHours.map(h => `${h.hour}:00 (${h.count} lần)`).join(', ') || 'Chưa có dữ liệu'}
- Ngày ưa thích: ${
      patterns.preferredDays
        .map(d => {
          const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
          return `${days[d.day]} (${d.count} lần)`;
        })
        .join(', ') || 'Chưa có dữ liệu'
    }
- Danh mục ưa thích: ${patterns.preferredCategories.map(c => `${c.category} (${c.count} lần)`).join(', ') || 'Chưa có dữ liệu'}
- Tỷ lệ tham gia: ${patterns.averageAttendanceRate.toFixed(1)}%
- Tỷ lệ hủy: ${patterns.cancellationRate.toFixed(1)}%

**LỊCH SỬ THAM GIA:**
- Tổng số lớp đã tham gia: ${attendanceHistory?.length || 0} lớp
- Tổng số đặt chỗ: ${bookingsHistory?.length || 0} lần

**CÁC LỊCH CÓ SẴN:**
${availableSchedules
  .slice(0, 10)
  .map(
    (s, idx) => `
${idx + 1}. ${s.className} (${s.category})
   - Thời gian: ${new Date(s.startTime).toLocaleString('vi-VN')}
   - Huấn luyện viên: ${s.trainer || 'Chưa có'}
   - Chỗ trống: ${s.spotsLeft}/${s.maxCapacity || 'N/A'}
   - Điểm số: ${s.score}
   - Schedule ID: ${s.id}
`
  )
  .join('')}
`;
  }
}

module.exports = new AIService();
