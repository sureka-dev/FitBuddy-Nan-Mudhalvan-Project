import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// File-backed persistence for plans (mimicking SQLite database table)
const DATA_DIR = path.resolve('data');
const PLANS_FILE = path.join(DATA_DIR, 'plans.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getStoredPlans(): any[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(PLANS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(PLANS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error reading stored plans:', err);
    return [];
  }
}

function saveStoredPlans(plans: any[]) {
  try {
    ensureDataDir();
    fs.writeFileSync(PLANS_FILE, JSON.stringify(plans, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving stored plans:', err);
  }
}

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured. Please ensure your Gemini API key is set in environment secrets.');
  }
  return new GoogleGenAI({ apiKey });
};

async function waitMs(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Generates a pre-written, goal & intensity specific fallback plan if Gemini API is unreachable
function getOfflineFallbackPlan(params: {
  name: string;
  goal: string;
  intensity: string;
  diet?: string;
  equipment?: string;
  weight?: number;
}): any {
  const { name, goal, intensity, diet = 'Vegetarian', equipment = 'Dumbbells', weight = 70 } = params;

  const isWeightLoss = goal === 'Weight Loss';
  const isMuscleGain = goal === 'Muscle Gain';

  const days = [
    {
      day: "Monday",
      workout_name: isMuscleGain ? "Upper Body Strength & Hypertrophy" : isWeightLoss ? "Full Body Fat-Burn & Cardio" : "Full Body Conditioning",
      focus: isMuscleGain ? "Chest, Back & Shoulders" : "Metabolic Conditioning & Core",
      duration: intensity === 'High' ? "50 mins" : intensity === 'Medium' ? "40 mins" : "30 mins",
      is_rest_day: false,
      intensity,
      warmup: "5-8 mins: Arm circles, shoulder dislocates, light jogging in place, torso twists",
      cooldown: "5 mins: Standing chest stretch, overhead tricep stretch, child's pose",
      exercises: [
        {
          name: equipment === 'No equipment' ? "Push-Ups" : "Dumbbell Floor Press",
          sets_reps: intensity === 'High' ? "4 sets x 12-15 reps" : "3 sets x 10-12 reps",
          rest_time: "60s rest",
          target: "Chest & Triceps",
          tip: "Keep core braced and elbows tucked at roughly 45 degrees."
        },
        {
          name: equipment === 'No equipment' ? "Inverted Rows or Doorframe Rows" : "Dumbbell Bent-Over Rows",
          sets_reps: "3 sets x 12 reps",
          rest_time: "60s rest",
          target: "Upper Back & Lats",
          tip: "Squeeze shoulder blades together at the top of each contraction."
        },
        {
          name: equipment === 'No equipment' ? "Pike Push-Ups" : "Dumbbell Overhead Shoulder Press",
          sets_reps: "3 sets x 10 reps",
          rest_time: "60s rest",
          target: "Deltoids",
          tip: "Maintain a neutral spine; avoid arching your lower back."
        },
        {
          name: "Bodyweight Air Squats",
          sets_reps: "3 sets x 15 reps",
          rest_time: "45s rest",
          target: "Quadriceps & Glutes",
          tip: "Push hips back and drive through your heels."
        },
        {
          name: "Standard Forearm Plank",
          sets_reps: "3 sets x 35-45 sec",
          rest_time: "45s rest",
          target: "Core & Abdominals",
          tip: "Keep body in one straight line from shoulders to heels."
        }
      ]
    },
    {
      day: "Tuesday",
      workout_name: isMuscleGain ? "Lower Body Hypertrophy" : "HIIT & Lower Body Endurance",
      focus: "Quads, Hamstrings & Calves",
      duration: "40 mins",
      is_rest_day: false,
      intensity,
      warmup: "5 mins: Leg swings, hip openers, bodyweight glute bridges",
      cooldown: "5 mins: Standing quad stretch, seated hamstring reach",
      exercises: [
        {
          name: equipment === 'No equipment' ? "Walking Lunges" : "Dumbbell Goblet Squats",
          sets_reps: "3 sets x 12 reps per leg",
          rest_time: "60s rest",
          target: "Quads & Glutes",
          tip: "Keep chest tall and track knees over second toes."
        },
        {
          name: "Romanian Deadlifts",
          sets_reps: "3 sets x 12 reps",
          rest_time: "60s rest",
          target: "Hamstrings & Lower Back",
          tip: "Hinge at the hips with a slight bend in your knees."
        },
        {
          name: "Glute Bridges",
          sets_reps: "3 sets x 15 reps",
          rest_time: "45s rest",
          target: "Glutes",
          tip: "Pause and squeeze at the top of each rep for 1 second."
        },
        {
          name: "Calf Raises",
          sets_reps: "3 sets x 20 reps",
          rest_time: "30s rest",
          target: "Calves",
          tip: "Full range of motion: slow descent, explosive lift."
        }
      ]
    },
    {
      day: "Wednesday",
      workout_name: "Active Recovery & Mobility Flow",
      focus: "Joint Mobility, Dynamic Stretching & Decompression",
      duration: "25 mins",
      is_rest_day: true,
      intensity: "Low",
      warmup: "3 mins: Deep diaphragmatic nasal breathing",
      cooldown: "3 mins: Corpse pose / relaxed meditation",
      exercises: [
        {
          name: "Cat-Cow Spinal Mobility",
          sets_reps: "2 sets x 10 cycles",
          rest_time: "30s rest",
          target: "Thoracic & Lumbar Spine",
          tip: "Move smoothly with slow, controlled breaths."
        },
        {
          name: "World's Greatest Stretch",
          sets_reps: "2 sets x 5 reps each side",
          rest_time: "30s rest",
          target: "Hips, Thoracic Spine & Hamstrings",
          tip: "Rotate your torso towards your front knee with an exhale."
        },
        {
          name: "Brisk Outdoor Walk",
          sets_reps: "15-20 minutes continuous",
          rest_time: "N/A",
          target: "Cardiovascular Recovery",
          tip: "Keep an easy conversational pace to encourage lymphatic drainage."
        }
      ]
    },
    {
      day: "Thursday",
      workout_name: isMuscleGain ? "Push Power & Core" : "Core & Cardio Surge",
      focus: "Chest, Shoulders & Abdominals",
      duration: "40 mins",
      is_rest_day: false,
      intensity,
      warmup: "5 mins: Jumping jacks, wrist rotations, shoulder taps",
      cooldown: "5 mins: Cobra pose, child's pose",
      exercises: [
        {
          name: equipment === 'No equipment' ? "Incline Push-Ups" : "Dumbbell Incline Bench/Floor Press",
          sets_reps: "3 sets x 12 reps",
          rest_time: "60s rest",
          target: "Upper Chest",
          tip: "Control the eccentric descent over 2 seconds."
        },
        {
          name: equipment === 'No equipment' ? "Lateral Arm Raises (Bodyweight)" : "Dumbbell Lateral Raises",
          sets_reps: "3 sets x 15 reps",
          rest_time: "45s rest",
          target: "Side Deltoids",
          tip: "Lead with elbows, keeping thumbs slightly pointing downward."
        },
        {
          name: "Bicycle Crunches",
          sets_reps: "3 sets x 20 reps (10 per side)",
          rest_time: "45s rest",
          target: "Obliques & Rectus Abdominis",
          tip: "Rotate from the ribcage without pulling on your neck."
        },
        {
          name: "Mountain Climbers",
          sets_reps: "3 sets x 30 seconds",
          rest_time: "45s rest",
          target: "Core & Cardiovascular",
          tip: "Maintain a steady pace with hands directly under shoulders."
        }
      ]
    },
    {
      day: "Friday",
      workout_name: isMuscleGain ? "Pull Strength & Posterior Chain" : "Total Body Circuit",
      focus: "Back, Biceps & Hamstrings",
      duration: "45 mins",
      is_rest_day: false,
      intensity,
      warmup: "5 mins: Torso twists, high knees, band pull-aparts",
      cooldown: "5 mins: Doorway lat stretch, cross-body shoulder stretch",
      exercises: [
        {
          name: equipment === 'No equipment' ? "Superman Holds" : "Dumbbell Single-Arm Rows",
          sets_reps: "3 sets x 12 reps per side",
          rest_time: "60s rest",
          target: "Lats & Rhomboids",
          tip: "Pull your elbow toward your hip rather than straight up."
        },
        {
          name: equipment === 'No equipment' ? "Doorframe Bicep Curls" : "Dumbbell Bicep Curls",
          sets_reps: "3 sets x 12 reps",
          rest_time: "45s rest",
          target: "Biceps",
          tip: "Keep elbows pinned to your sides throughout the curl."
        },
        {
          name: "Bodyweight Step-Ups or Lunges",
          sets_reps: "3 sets x 12 reps per leg",
          rest_time: "45s rest",
          target: "Quads & Glutes",
          tip: "Drive through the whole foot for balanced activation."
        },
        {
          name: "Side Planks",
          sets_reps: "2 sets x 30 sec per side",
          rest_time: "45s rest",
          target: "Obliques & Core Stability",
          tip: "Keep hips elevated to maintain a straight spine."
        }
      ]
    },
    {
      day: "Saturday",
      workout_name: "Functional Full Body & Finisher",
      focus: "Endurance, Stability & Full Body Integration",
      duration: "35 mins",
      is_rest_day: false,
      intensity,
      warmup: "5 mins: Arm swings, bodyweight squats, ankle mobility",
      cooldown: "5 mins: Full body standing stretch, deep breathing",
      exercises: [
        {
          name: "Bodyweight Squat Jumps (or Speed Squats)",
          sets_reps: "3 sets x 12 reps",
          rest_time: "60s rest",
          target: "Fast-Twitch Muscle & Power",
          tip: "Land softly with knees bent to absorb impact."
        },
        {
          name: equipment === 'No equipment' ? "Push-Up Hold" : "Dumbbell Thrusters",
          sets_reps: "3 sets x 10 reps",
          rest_time: "60s rest",
          target: "Full Body Synergy",
          tip: "Use the momentum from the squat drive to press upward."
        },
        {
          name: "Russian Twists",
          sets_reps: "3 sets x 20 total twists",
          rest_time: "45s rest",
          target: "Rotational Core",
          tip: "Anchor your heels lightly on the ground for lower back support."
        },
        {
          name: "Dead Bug Exercise",
          sets_reps: "3 sets x 10 reps per side",
          rest_time: "45s rest",
          target: "Deep Core & Pelvic Stability",
          tip: "Press your lower back flat into the ground throughout."
        }
      ]
    },
    {
      day: "Sunday",
      workout_name: "Rest, Mindfulness & Weekly Reset",
      focus: "Full Recovery & Neuromuscular Rest",
      duration: "20 mins",
      is_rest_day: true,
      intensity: "Low",
      warmup: "Gentle neck and shoulder rolls",
      cooldown: "5 mins mindful recovery breathing",
      exercises: [
        {
          name: "Gentle Full-Body Stretching",
          sets_reps: "15 minutes relaxed flow",
          rest_time: "As needed",
          target: "Total Body",
          tip: "Breathe deeply into every stretch; never bounce or strain."
        },
        {
          name: "Hydration & Meal Prep Reset",
          sets_reps: "Review upcoming week's water & nutrition goals",
          rest_time: "N/A",
          target: "Habit Consistency",
          tip: "Prepare wholesome snacks and rest well for Monday."
        }
      ]
    }
  ];

  const mealPlans: Record<string, any> = {
    Vegetarian: {
      breakfast: "Overnight oats with chia seeds, sliced bananas, almond milk and crushed walnuts.",
      lunch: "Hearty lentil & quinoa salad bowl with cucumbers, bell peppers, feta, and olive oil.",
      snack: "Greek yogurt with a drizzle of honey or roasted spiced chickpeas.",
      dinner: "Tofu and broccoli stir-fry served over brown rice with toasted sesame seeds."
    },
    Vegan: {
      breakfast: "Smoothie bowl with plant protein, spinach, mixed berries, oats, and peanut butter.",
      lunch: "Whole wheat wrap packed with spiced black beans, avocado, roasted corn, and salsa.",
      snack: "Handful of raw almonds, walnuts, and dark chocolate squares.",
      dinner: "Chickpea & sweet potato curry cooked in light coconut milk over cauliflower rice."
    },
    "Non-vegetarian": {
      breakfast: "Three scrambled eggs with baby spinach, whole grain toast, and half an avocado.",
      lunch: "Grilled chicken breast bowl with quinoa, roasted sweet potatoes, and steamed greens.",
      snack: "Cottage cheese or protein shake with an apple and peanut butter.",
      dinner: "Pan-seared salmon fillet (or lean beef) with baked asparagus and roasted baby potatoes."
    }
  };

  return {
    summary: `Welcome ${name}! Here is a structured, balanced 7-day ${intensity.toLowerCase()} intensity routine built for ${goal.toLowerCase()} using ${equipment.toLowerCase()}. It features dynamic warm-ups, focused exercises, and active recovery.`,
    days,
    sample_meal_plan: mealPlans[diet] || mealPlans.Vegetarian,
    nutrition_tip: isMuscleGain
      ? "Target 1.8-2.0g of quality protein per kg of bodyweight, distributed evenly across 3-4 meals."
      : isWeightLoss
      ? "Focus on nutrient-dense, high-fiber whole foods that provide satiety within a moderate 300-500 kcal deficit."
      : "Aim for balanced macronutrients with plenty of colorful seasonal vegetables and healthy fats.",
    recovery_tip: "Target 7.5 to 8.5 hours of uninterrupted sleep each night to allow muscle tissue and the nervous system to fully regenerate.",
    hydration_tip: `Aim for roughly ${(weight * 0.035).toFixed(1)} to ${(weight * 0.035 + 0.5).toFixed(1)} liters of clean water daily, sipping regularly before, during, and after workouts.`,
    safety_guidance: "Always prioritize strict form over weight or speed. If any exercise causes sharp or unnatural joint pain, stop immediately."
  };
}

async function generateWithRetry(ai: GoogleGenAI, prompt: string, systemInstruction: string) {
  // Ordered fallback models:
  // 1. Primary: gemini-3.1-flash-lite (high throughput, highly available, instant response)
  // 2. Secondary fallback: gemini-3.8-flash
  // 3. Fallbacks: gemini-2.5-flash, gemini-2.5-flash-lite
  const models = [
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite'
  ];
  const backoffDelays = [2000, 4000, 8000]; // 2s, 4s, 8s exponential backoff
  let lastErr: any = null;

  for (const model of models) {
    console.log(`[FitBuddy API] Trying model: ${model}`);

    // Up to 3 attempts with exponential backoff per model
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
          },
        });

        if (response && response.text) {
          console.log(`[FitBuddy API] Successfully generated plan with model: ${model}`);
          return response.text;
        }
      } catch (err: any) {
        lastErr = err;
        const status = err?.status || err?.statusCode || (err?.message?.includes('503') ? 503 : err?.message?.includes('429') ? 429 : err?.message?.includes('404') ? 404 : null);
        console.error(`[FitBuddy API] Model ${model} attempt ${attempt + 1} failed (Status: ${status}):`, err?.message || err);

        // If the model is not found (404), skip retries for this model immediately and try next fallback model
        if (status === 404 || err?.message?.includes('404') || err?.message?.includes('not found')) {
          break;
        }

        // If not the last attempt, wait with exponential backoff: 2s, then 4s, then 8s
        if (attempt < 2) {
          const delay = backoffDelays[attempt];
          console.log(`[FitBuddy API] Retrying model ${model} in ${delay / 1000}s (attempt ${attempt + 2}/3)...`);
          await waitMs(delay);
        }
      }
    }

    console.warn(`[FitBuddy API] Model ${model} exhausted retries. Falling back to next model...`);
    await waitMs(500);
  }

  throw lastErr;
}

// POST /api/generate-plan
app.post('/api/generate-plan', async (req, res) => {
  try {
    const {
      name,
      age,
      weight,
      height,
      gender,
      goal,
      intensity,
      equipment,
      diet,
      limitations
    } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name cannot be empty.' });
    }
    const numAge = Number(age);
    if (isNaN(numAge) || numAge < 10 || numAge > 100) {
      return res.status(400).json({ error: 'Age must be between 10 and 100.' });
    }
    const numWeight = Number(weight);
    if (isNaN(numWeight) || numWeight < 25 || numWeight > 300) {
      return res.status(400).json({ error: 'Weight must be between 25 and 300 kg.' });
    }
    const numHeight = Number(height);
    if (isNaN(numHeight) || numHeight < 90 || numHeight > 250) {
      return res.status(400).json({ error: 'Height must be between 90 and 250 cm.' });
    }
    if (!['Male', 'Female', 'Non-binary', 'Other'].includes(gender)) {
      return res.status(400).json({ error: 'Please select a valid gender option.' });
    }
    if (!['Weight Loss', 'Muscle Gain', 'General Wellness'].includes(goal)) {
      return res.status(400).json({ error: 'Invalid fitness goal.' });
    }
    if (!['Low', 'Medium', 'High'].includes(intensity)) {
      return res.status(400).json({ error: 'Invalid workout intensity.' });
    }
    if (!['No equipment', 'Dumbbells', 'Full gym'].includes(equipment)) {
      return res.status(400).json({ error: 'Please select valid available equipment.' });
    }
    if (!['Vegetarian', 'Non-vegetarian', 'Vegan'].includes(diet)) {
      return res.status(400).json({ error: 'Please select a valid diet preference.' });
    }

    const ai = getGeminiClient();
    const systemInstruction = 
      "You are FitBuddy, an expert AI fitness & nutrition planning coach. " +
      "Generate an evidence-based, safe, and practical 7-day fitness routine and nutrition guidance. " +
      "Return exactly 7 days (Monday through Sunday). " +
      "Tailor workouts specifically to available equipment, intensity, height, weight, and any user injuries or limitations. " +
      "IMPORTANT: Always use standard, common exercise names that can be mapped to visual exercise libraries (for example: Push-Up, Goblet Squat, Air Squat, Walking Lunge, Plank, Mountain Climbers, Bicep Curl, Dumbbell Floor Press, Bench Press, Romanian Deadlift, Bent-Over Row, Glute Bridge, Calf Raise, Overhead Shoulder Press, Bicycle Crunch, Russian Twist, Burpee, Pull-Up). Avoid vague or overly complex compound names. " +
      "Ensure at least one day (e.g. Sunday or Wednesday) is dedicated as an active rest/recovery day with light stretching or mobility. " +
      "Each workout day MUST include a warm-up, 4 to 6 structured exercises (with name, sets_reps, rest_time in seconds, and a crisp one-line form tip), and a cool-down. " +
      "Provide a sample 1-day meal plan (Breakfast, Lunch, Snack, Dinner) strictly respecting the user's diet preference. " +
      "Keep recommendations practical and safe. Never give medical diagnoses. " +
      "Return ONLY a valid JSON object matching the requested schema without markdown backticks or commentary.";

    const prompt = `
Generate a complete 7-day fitness and nutrition routine for this user:
- Name: ${name.trim()}
- Age: ${numAge} years
- Gender: ${gender}
- Weight: ${numWeight} kg
- Height: ${numHeight} cm
- Fitness Goal: ${goal}
- Workout Intensity: ${intensity}
- Equipment Available: ${equipment}
- Diet Preference: ${diet}
- Injuries / Limitations: ${limitations ? limitations.trim() : 'None reported'}

Instructions:
- Use common, simple names likely to exist in standard exercise databases (for example: Push-Up, Squat, Lunge, Plank, Crunch, Burpee, Dumbbell Curl, Bench Press, Deadlift, Pull-Up, Mountain Climbers, Jumping Jacks, Goblet Squat, Romanian Deadlift, Dumbbell Row, Russian Twists, Calf Raise, Glute Bridge) so visual demonstrations and animations display accurately.
- Include sets and reps (e.g., "3 sets x 12 reps" or "3 sets x 45 sec"), rest time (e.g., "60s rest"), and actionable form tip.

Return JSON with this exact schema:
{
  "summary": "1-2 inspiring sentences explaining this plan's design for ${name.trim()}.",
  "days": [
    {
      "day": "Monday",
      "workout_name": "Workout focus title (e.g. Upper Body Hypertrophy)",
      "focus": "Target muscle groups or focus",
      "duration": "Duration (e.g. 45 mins)",
      "is_rest_day": false,
      "intensity": "${intensity}",
      "warmup": "5-8 min warm-up routine (e.g. Arm circles, torso twists, light jumping jacks)",
      "cooldown": "5 min cool-down (e.g. Chest door stretch, child's pose, slow deep breaths)",
      "exercises": [
        {
          "name": "Exercise Name",
          "sets_reps": "3 sets x 12 reps",
          "rest_time": "60s rest",
          "target": "Target muscle group",
          "tip": "One-line form and safety tip"
        }
      ]
    }
  ],
  "sample_meal_plan": {
    "breakfast": "Nutritious breakfast suggestion suitable for ${diet} and ${goal}",
    "lunch": "Balanced lunch suggestion suitable for ${diet}",
    "snack": "Energizing snack option",
    "dinner": "Recovery dinner rich in wholesome nutrients"
  },
  "nutrition_tip": "Specific dietary tip aligned with ${goal} and ${diet} diet.",
  "recovery_tip": "Specific recovery or sleep advice tailored to ${intensity} intensity.",
  "hydration_tip": "Daily water intake guidance (e.g. 3.0 liters based on ${numWeight}kg body weight).",
  "safety_guidance": "General safe exercise guidance with special attention to: ${limitations || 'proper warmup and listening to body'}."
}
`;

    let text = await generateWithRetry(ai, prompt, systemInstruction);
    if (!text || typeof text !== 'string') {
      throw new Error('Empty response from AI model');
    }
    text = text.trim();
    if (text.startsWith('```')) {
      const firstNewline = text.indexOf('\n');
      const lastFence = text.lastIndexOf('```');
      if (firstNewline !== -1 && lastFence > firstNewline) {
        text = text.slice(firstNewline + 1, lastFence).trim();
      } else {
        text = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
      }
    }

    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      text = text.slice(firstBrace, lastBrace + 1);
    }

    const planData = JSON.parse(text);
    return res.json(planData);
  } catch (error: any) {
    console.error('[FitBuddy API Error in /api/generate-plan]:', error?.message || error);
    // Provide an offline fallback plan alongside the error so the client can immediately offer it
    const fallbackPlan = getOfflineFallbackPlan({
      name: req.body?.name || 'Athlete',
      goal: req.body?.goal || 'General Wellness',
      intensity: req.body?.intensity || 'Medium',
      diet: req.body?.diet || 'Vegetarian',
      equipment: req.body?.equipment || 'Dumbbells',
      weight: Number(req.body?.weight) || 70,
    });
    return res.status(503).json({
      error: "Couldn't generate your plan. Please try again.",
      fallbackPlan
    });
  }
});

// POST /api/fallback-plan - Direct endpoint to retrieve offline fallback plan
app.post('/api/fallback-plan', (req, res) => {
  try {
    const { name, goal, intensity, diet, equipment, weight } = req.body;
    const plan = getOfflineFallbackPlan({
      name: name || 'Athlete',
      goal: goal || 'General Wellness',
      intensity: intensity || 'Medium',
      diet: diet || 'Vegetarian',
      equipment: equipment || 'Dumbbells',
      weight: Number(weight) || 70
    });
    return res.json(plan);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to generate offline fallback plan.' });
  }
});

// POST /api/update-plan
app.post('/api/update-plan', async (req, res) => {
  try {
    const {
      originalPlan,
      feedback,
      name,
      age,
      weight,
      height,
      gender,
      goal,
      intensity,
      equipment,
      diet,
      limitations
    } = req.body;
    if (!feedback || typeof feedback !== 'string' || feedback.trim().length === 0) {
      return res.status(400).json({ error: 'Feedback cannot be empty.' });
    }

    const ai = getGeminiClient();
    const systemInstruction = 
      "You are FitBuddy, an expert AI fitness coach. " +
      "Revise the existing 7-day workout plan based specifically on the user's feedback. " +
      "Maintain safe recommendations and return a complete revised 7-day schedule with warmup, cooldown, exercises, and sample meal plan. " +
      "Return ONLY a valid JSON object matching the requested schema.";

    const prompt = `
The user wants to update their current fitness plan.
User details:
- Name: ${name || 'Athlete'}, Age: ${age || 25}, Gender: ${gender || 'Not specified'}, Weight: ${weight || 70} kg, Height: ${height || 175} cm
- Goal: ${goal || 'General Wellness'}, Intensity: ${intensity || 'Medium'}
- Equipment: ${equipment || 'Dumbbells'}, Diet: ${diet || 'Vegetarian'}
- Limitations: ${limitations || 'None'}

Existing Plan:
${JSON.stringify(originalPlan, null, 2)}

User's requested improvements / feedback:
"${feedback.trim()}"

Instructions:
- Use common, simple exercise names (such as Push-Up, Squat, Lunge, Plank, Crunch, Burpee, Dumbbell Curl, Bench Press, Deadlift, Pull-Up, Mountain Climbers, Jumping Jacks, Goblet Squat, Romanian Deadlift, Dumbbell Row, Russian Twists, Calf Raise, Glute Bridge) to match visual demonstrations.
- Generate a complete updated 7-day plan in JSON with the exact same structure (warmup, cooldown, 4-6 exercises with rest_time and form tip, sample_meal_plan, nutrition_tip, recovery_tip, hydration_tip, safety_guidance).
`;

    let text = await generateWithRetry(ai, prompt, systemInstruction);
    if (!text || typeof text !== 'string') {
      throw new Error('Empty response from AI model');
    }
    text = text.trim();
    if (text.startsWith('```')) {
      const firstNewline = text.indexOf('\n');
      const lastFence = text.lastIndexOf('```');
      if (firstNewline !== -1 && lastFence > firstNewline) {
        text = text.slice(firstNewline + 1, lastFence).trim();
      } else {
        text = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
      }
    }

    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      text = text.slice(firstBrace, lastBrace + 1);
    }

    const planData = JSON.parse(text);
    return res.json(planData);
  } catch (error: any) {
    console.error('[FitBuddy API Error in /api/update-plan]:', error?.message || error);
    return res.status(503).json({
      error: "Couldn't update your plan right now. Please try again."
    });
  }
});

// Status check
app.get('/api/status', (req, res) => {
  res.json({
    status: 'healthy',
    app: 'FitBuddy',
    geminiConfigured: !!process.env.GEMINI_API_KEY
  });
});

// GET /api/plans - Fetch all saved plans
app.get('/api/plans', (req, res) => {
  try {
    const plans = getStoredPlans();
    return res.json(plans);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to retrieve plans.' });
  }
});

// POST /api/plans - Save or update a plan
app.post('/api/plans', (req, res) => {
  try {
    const newPlan = req.body;
    if (!newPlan || !newPlan.id) {
      return res.status(400).json({ error: 'Invalid plan record.' });
    }
    const plans = getStoredPlans();
    const existingIndex = plans.findIndex(p => p.id === newPlan.id);
    if (existingIndex >= 0) {
      plans[existingIndex] = newPlan;
    } else {
      plans.unshift(newPlan);
    }
    saveStoredPlans(plans);
    return res.json({ success: true, plan: newPlan });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to save plan.' });
  }
});

// DELETE /api/plans/:id - Delete a specific plan by ID
app.delete('/api/plans/:id', (req, res) => {
  try {
    const idToDelete = Number(req.params.id);
    if (isNaN(idToDelete)) {
      return res.status(400).json({ error: 'Invalid plan ID.' });
    }
    const plans = getStoredPlans();
    const updated = plans.filter(p => Number(p.id) !== idToDelete);
    saveStoredPlans(updated);
    return res.json({ success: true, deletedId: idToDelete, remainingCount: updated.length });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to delete plan.' });
  }
});

// Vite integration
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FitBuddy server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
