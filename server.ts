import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured. Please ensure your Gemini API key is set in environment secrets.');
  }
  return new GoogleGenAI({ apiKey });
};

async function generateWithRetry(ai: GoogleGenAI, prompt: string, systemInstruction: string) {
  const models = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
  let lastErr: any = null;

  for (const model of models) {
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
        return response.text;
      }
    } catch (err: any) {
      lastErr = err;
      console.warn(`Model ${model} call failed:`, err?.message || err);
      // Brief pause before trying next model
      await new Promise(r => setTimeout(r, 400));
    }
  }
  throw lastErr;
}

// POST /api/generate-plan
app.post('/api/generate-plan', async (req, res) => {
  try {
    const { name, age, weight, goal, intensity } = req.body;
    
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
    if (!['Weight Loss', 'Muscle Gain', 'General Wellness'].includes(goal)) {
      return res.status(400).json({ error: 'Invalid fitness goal.' });
    }
    if (!['Low', 'Medium', 'High'].includes(intensity)) {
      return res.status(400).json({ error: 'Invalid workout intensity.' });
    }

    const ai = getGeminiClient();
    const systemInstruction = 
      "You are FitBuddy, an AI fitness planning assistant for a college student project. " +
      "Generate a practical, general fitness routine based on user profile. " +
      "Return exactly 7 days (Monday through Sunday). " +
      "Adapt workout difficulty strictly to the selected intensity. " +
      "Include active rest and recovery when appropriate. " +
      "Keep recommendations general and safe. Do not make medical diagnoses. " +
      "Return ONLY a valid JSON object matching the requested schema without markdown backticks or commentary.";

    const prompt = `
Generate a complete 7-day fitness routine for this user:
- Name: ${name.trim()}
- Age: ${numAge} years
- Weight: ${numWeight} kg
- Fitness Goal: ${goal}
- Workout Intensity: ${intensity}

Return JSON with this exact schema:
{
  "summary": "1-2 inspiring sentences explaining this plan's design for ${name.trim()}.",
  "days": [
    {
      "day": "Monday",
      "workout_name": "Workout focus title (e.g. Lower Body & Core)",
      "focus": "Target muscle groups or focus",
      "duration": "Duration (e.g. 45 mins)",
      "is_rest_day": false,
      "intensity": "${intensity}",
      "exercises": [
        {
          "name": "Exercise Name",
          "sets_reps": "3 sets x 12 reps",
          "target": "Target muscle group",
          "tip": "Short form or safety tip"
        }
      ]
    },
    ... (continue for Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday)
  ],
  "nutrition_tip": "Specific dietary tip aligned with ${goal}.",
  "recovery_tip": "Specific recovery or sleep advice.",
  "hydration_tip": "Daily water intake guidance for ${numWeight}kg at ${intensity} intensity.",
  "safety_guidance": "General safe exercise guidance (warm-up, hydration, form awareness)."
}
`;

    let text = await generateWithRetry(ai, prompt, systemInstruction);
    if (text.startsWith('```json')) text = text.slice(7);
    if (text.startsWith('```')) text = text.slice(3);
    if (text.endsWith('```')) text = text.slice(0, -3);
    text = text.trim();

    const planData = JSON.parse(text);
    return res.json(planData);
  } catch (error: any) {
    console.error('Error generating plan:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate fitness plan with Gemini.' });
  }
});

// POST /api/update-plan
app.post('/api/update-plan', async (req, res) => {
  try {
    const { originalPlan, feedback, name, age, weight, goal, intensity } = req.body;
    if (!feedback || typeof feedback !== 'string' || feedback.trim().length === 0) {
      return res.status(400).json({ error: 'Feedback cannot be empty.' });
    }

    const ai = getGeminiClient();
    const systemInstruction = 
      "You are FitBuddy, an AI fitness planning assistant. " +
      "Revise the existing 7-day workout plan based specifically on the user's feedback. " +
      "Maintain safe recommendations and return a complete revised 7-day schedule. " +
      "Return ONLY a valid JSON object matching the requested schema.";

    const prompt = `
The user wants to update their current fitness plan.
User details:
- Name: ${name}, Age: ${age}, Weight: ${weight} kg, Goal: ${goal}, Intensity: ${intensity}

Existing Plan:
${JSON.stringify(originalPlan, null, 2)}

User's requested improvements / feedback:
"${feedback.trim()}"

Generate a complete updated 7-day plan in JSON with the exact same structure:
{
  "summary": "Explanation of how the plan was modified to incorporate the feedback: ${feedback.trim()}",
  "days": [
    {
      "day": "Monday",
      "workout_name": "...",
      "focus": "...",
      "duration": "...",
      "is_rest_day": false,
      "intensity": "${intensity}",
      "exercises": [
        {
          "name": "...",
          "sets_reps": "...",
          "target": "...",
          "tip": "..."
        }
      ]
    }
  ],
  "nutrition_tip": "Updated nutrition tip.",
  "recovery_tip": "Updated recovery advice based on the new routine.",
  "hydration_tip": "Hydration tip.",
  "safety_guidance": "Safety reminders."
}
`;

    let text = await generateWithRetry(ai, prompt, systemInstruction);
    if (text.startsWith('```json')) text = text.slice(7);
    if (text.startsWith('```')) text = text.slice(3);
    if (text.endsWith('```')) text = text.slice(0, -3);
    text = text.trim();

    const planData = JSON.parse(text);
    return res.json(planData);
  } catch (error: any) {
    console.error('Error updating plan:', error);
    return res.status(500).json({ error: error.message || 'Failed to update fitness plan with Gemini.' });
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
