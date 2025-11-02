const axios = require('axios');

/**
 * AI Service for generating personalized workout plans
 * Using OpenRouter API to access multiple AI models
 */
class AIService {
  constructor() {
    // Fallback to hardcoded values if env not set
    this.apiKey =
      process.env.AI_API_KEY ||
      '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';
    this.apiUrl = process.env.AI_MODEL_URL || 'https://openrouter.ai/api/v1/chat/completions';
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
        max_tokens: 2000,
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
        timeout: 30000, // 30 seconds timeout
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

**YÊU CẦU:**
1. Tạo danh sách 10-12 bài tập phù hợp
2. Mỗi bài tập phải có: tên (tiếng Việt), số sets, số reps (có thể là số hoặc thời gian như "60s", "20 phút"), thời gian nghỉ
3. Bài tập phải an toàn, phù hợp với BMI và tình trạng sức khỏe
4. Cân bằng giữa cardio và strength training
5. Tăng dần cường độ phù hợp với trình độ

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
   * Parse AI response and extract workout plan
   */
  parseAIResponse(aiResponse) {
    try {
      // Try to find JSON in response
      let jsonStr = aiResponse.trim();

      // Remove markdown code blocks if present
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');

      // Find JSON object
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      const parsed = JSON.parse(jsonStr);

      // Validate structure
      if (!parsed.exercises || !Array.isArray(parsed.exercises)) {
        throw new Error('Invalid workout plan structure');
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
      throw new Error('AI response parsing failed: ' + error.message);
    }
  }
}

module.exports = new AIService();
