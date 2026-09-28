/**
 * FitBuddy – Premium AI Fitness Plan Generator
 * Modern Fitness-Tech Startup UI
 * Tech Stack: Python 3.13, FastAPI, SQLite, Google Gemini API, React + Vite
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  Trash2,
  AlertCircle,
  CheckCircle2,
  FileCode,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Calendar,
  X,
  Copy,
  Check,
  ChevronRight,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface Exercise {
  name: string;
  sets_reps: string;
  target?: string;
  tip?: string;
}

interface DayPlan {
  day: string;
  workout_name: string;
  focus: string;
  duration: string;
  is_rest_day: boolean;
  intensity: string;
  exercises: Exercise[];
}

interface FitnessPlanData {
  summary: string;
  days: DayPlan[];
  nutrition_tip: string;
  recovery_tip: string;
  hydration_tip?: string;
  safety_guidance?: string;
}

interface StoredPlanRecord {
  id: number;
  name: string;
  age: number;
  weight: number;
  goal: string;
  intensity: string;
  plan: FitnessPlanData;
  feedback?: string;
  created_at: string;
}

export default function App() {
  // Navigation & View States
  const [viewMode, setViewMode] = useState<'main' | 'history' | 'project'>('main');
  const [currentPlan, setCurrentPlan] = useState<StoredPlanRecord | null>(null);
  const [savedPlans, setSavedPlans] = useState<StoredPlanRecord[]>([]);

  // Form State
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState<'Weight Loss' | 'Muscle Gain' | 'General Wellness'>('Muscle Gain');
  const [intensity, setIntensity] = useState<'Low' | 'Medium' | 'High'>('Low');

  // Validation & Loading States
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [loadingStep, setLoadingStep] = useState('Connecting to Google Gemini AI...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [feedbackInput, setFeedbackInput] = useState('');

  // Workout Countdown Timer Modal State
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [timerTitle, setTimerTitle] = useState('Workout Timer');
  const [timerDuration, setTimerDuration] = useState<number>(30);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<any>(null);

  // Project Viewer State
  const [selectedProjectFile, setSelectedProjectFile] = useState<string>('app.py');
  const [copiedCode, setCopiedCode] = useState(false);

  // Delete Confirmation State
  const [planToDelete, setPlanToDelete] = useState<StoredPlanRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Load saved plans on mount (syncs both server storage and localStorage)
  useEffect(() => {
    async function initPlans() {
      let cachedPlans: StoredPlanRecord[] = [];
      try {
        const stored = localStorage.getItem('fitbuddy_sqlite_plans');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            cachedPlans = parsed;
            setSavedPlans(cachedPlans);
            setCurrentPlan((prev) => prev || cachedPlans[0]);
          }
        }
      } catch (e) {
        console.error('Failed reading localStorage plans', e);
      }

      try {
        const res = await fetch('/api/plans');
        if (res.ok) {
          const serverPlans: StoredPlanRecord[] = await res.json();
          if (Array.isArray(serverPlans)) {
            if (serverPlans.length > 0) {
              setSavedPlans(serverPlans);
              localStorage.setItem('fitbuddy_sqlite_plans', JSON.stringify(serverPlans));
              setCurrentPlan((prev) => prev || serverPlans[0]);
            } else if (cachedPlans.length > 0) {
              // Populate backend if backend is empty but client has local plans
              for (const p of cachedPlans) {
                fetch('/api/plans', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(p),
                }).catch(() => {});
              }
            }
          }
        }
      } catch (err) {
        console.warn('Backend plans fetch skipped/offline:', err);
      }
    }
    initPlans();
  }, []);

  // Save plans helper
  const persistPlans = (updated: StoredPlanRecord[], planToSync?: StoredPlanRecord) => {
    setSavedPlans(updated);
    try {
      localStorage.setItem('fitbuddy_sqlite_plans', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save plans to storage', e);
    }
    if (planToSync) {
      fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planToSync),
      }).catch((err) => console.warn('Could not sync to backend:', err));
    }
  };

  // Timer countdown hook
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerRunning]);

  const openTimer = (title: string, defaultSeconds = 30) => {
    setTimerTitle(title);
    setTimerDuration(defaultSeconds);
    setTimeLeft(defaultSeconds);
    setIsTimerRunning(false);
    setIsTimerOpen(true);
  };

  const closeTimer = () => {
    clearInterval(timerRef.current);
    setIsTimerRunning(false);
    setIsTimerOpen(false);
  };

  const toggleTimer = () => {
    if (timeLeft <= 0) {
      setTimeLeft(timerDuration);
      setIsTimerRunning(true);
    } else {
      setIsTimerRunning(!isTimerRunning);
    }
  };

  const resetTimer = (seconds?: number) => {
    const s = seconds || timerDuration;
    clearInterval(timerRef.current);
    setIsTimerRunning(false);
    setTimerDuration(s);
    setTimeLeft(s);
  };

  // Loading animation step messages
  useEffect(() => {
    if (!isGenerating && !isUpdating) return;
    const steps = [
      'Connecting to Google Gemini API...',
      'Analyzing user fitness metrics & body profile...',
      'Structuring personalized 7-day workout routine...',
      'Balancing target muscle groups, sets and reps...',
      'Formulating nutrition, hydration & recovery advice...',
      'Saving record to SQLite database...'
    ];
    let idx = 0;
    const timer = setInterval(() => {
      idx++;
      if (idx < steps.length) {
        setLoadingStep(steps[idx]);
      }
    }, 1200);
    return () => clearInterval(timer);
  }, [isGenerating, isUpdating]);

  // Form Validation
  const validateForm = () => {
    const errs: { [key: string]: string } = {};
    if (!name.trim()) {
      errs.name = 'Please enter your name.';
    }

    const numAge = parseInt(age, 10);
    if (!age || isNaN(numAge) || numAge < 10 || numAge > 100) {
      errs.age = 'Please enter a valid age between 10 and 100.';
    }

    const numWeight = parseFloat(weight);
    if (!weight || isNaN(numWeight) || numWeight < 25 || numWeight > 300) {
      errs.weight = 'Please enter a valid weight between 25 and 300 kg.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Generate Plan via Gemini API
  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!validateForm()) {
      return;
    }

    setIsGenerating(true);
    setLoadingStep('Connecting to Google Gemini API...');

    try {
      const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          age: parseInt(age, 10),
          weight: parseFloat(weight),
          goal,
          intensity,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate plan with Gemini API.');
      }

      const planData: FitnessPlanData = await response.json();

      const newRecord: StoredPlanRecord = {
        id: Date.now(),
        name: name.trim(),
        age: parseInt(age, 10),
        weight: parseFloat(weight),
        goal,
        intensity,
        plan: planData,
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };

      const updatedList = [newRecord, ...savedPlans];
      persistPlans(updatedList, newRecord);
      setCurrentPlan(newRecord);
      setSuccessMessage(`Personalized plan successfully created for ${name.trim()}!`);

      // Scroll smoothly to results
      setTimeout(() => {
        const resultEl = document.getElementById('result');
        if (resultEl) {
          resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error connecting to Gemini. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Feedback Refinement (Scenario 2)
  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPlan) return;
    if (!feedbackInput.trim()) {
      setErrorMessage('Please enter your requested adjustments before clicking Update My Plan.');
      return;
    }

    setIsUpdating(true);
    setLoadingStep('Updating your fitness plan with Gemini...');
    setErrorMessage(null);

    try {
      const response = await fetch('/api/update-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalPlan: currentPlan.plan,
          feedback: feedbackInput.trim(),
          name: currentPlan.name,
          age: currentPlan.age,
          weight: currentPlan.weight,
          goal: currentPlan.goal,
          intensity: currentPlan.intensity,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update plan with Gemini API.');
      }

      const updatedPlanData: FitnessPlanData = await response.json();

      const updatedRecord: StoredPlanRecord = {
        ...currentPlan,
        plan: updatedPlanData,
        feedback: feedbackInput.trim(),
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' (Updated)',
      };

      const updatedList = savedPlans.map((p) => (p.id === currentPlan.id ? updatedRecord : p));
      persistPlans(updatedList, updatedRecord);
      setCurrentPlan(updatedRecord);
      setFeedbackInput('');
      setSuccessMessage('Routine updated successfully according to your feedback!');

      const resultEl = document.getElementById('result');
      if (resultEl) {
        resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to update plan. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete plan handlers
  const handleInitiateDelete = (item: StoredPlanRecord) => {
    setPlanToDelete(item);
  };

  const handleCancelDelete = () => {
    setPlanToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!planToDelete) return;

    const targetId = planToDelete.id;
    const targetName = planToDelete.name;
    setIsDeleting(true);

    try {
      // 1. Delete from backend server storage
      await fetch(`/api/plans/${targetId}`, {
        method: 'DELETE',
      }).catch((err) => {
        console.warn('Backend delete request error:', err);
      });

      // 2. Remove selected plan from state array
      const updatedList = savedPlans.filter((p) => p.id !== targetId);

      // 3. Persist updated array in localStorage
      persistPlans(updatedList);

      // 4. Update currentPlan if and only if the active plan was the one deleted
      if (currentPlan && currentPlan.id === targetId) {
        setCurrentPlan(updatedList.length > 0 ? updatedList[0] : null);
      }

      setSuccessMessage(`Routine for ${targetName} was deleted from history.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Error deleting routine:', err);
      setErrorMessage('Could not delete the routine. Please try again.');
    } finally {
      setIsDeleting(false);
      setPlanToDelete(null);
    }
  };

  const copyCodeToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Python Code Files for Student Evaluation
  const pythonCodeFiles: { [key: string]: { path: string; language: string; content: string } } = {
    'app.py': {
      path: 'FitBuddy/app.py',
      language: 'python',
      content: `from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from dotenv import load_dotenv
import sqlite3, json, os
from google import genai

load_dotenv()
app = FastAPI(title="FitBuddy - AI Fitness Plan Generator")

DB_PATH = "database/fitbuddy.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute('''CREATE TABLE IF NOT EXISTS fitness_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT, age INT, weight REAL, goal TEXT,
        intensity TEXT, plan TEXT, feedback TEXT, created_at TEXT
    )''')
    conn.commit()
    conn.close()

def generate_fitness_plan_gemini(name, age, weight, goal, intensity):
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    prompt = f"Generate 7-day routine for {name}, Age {age}, Weight {weight}kg, Goal {goal}, Intensity {intensity}"
    res = client.models.generate_content(
        model="gemini-3.8-flash",
        contents=prompt,
        config={"response_mime_type": "application/json"}
    )
    return json.loads(res.text)

@app.get("/")
def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/generate-plan")
def generate(name: str = Form(...), age: int = Form(...), weight: float = Form(...), goal: str = Form(...), intensity: str = Form(...)):
    plan = generate_fitness_plan_gemini(name, age, weight, goal, intensity)
    # save to sqlite and render result.html...
`
    },
    'requirements.txt': {
      path: 'FitBuddy/requirements.txt',
      language: 'text',
      content: `fastapi>=0.115.0
uvicorn>=0.30.0
jinja2>=3.1.4
python-dotenv>=1.0.1
google-genai>=1.0.0
pydantic>=2.8.0`
    },
    'README.md': {
      path: 'FitBuddy/README.md',
      language: 'markdown',
      content: `# FitBuddy – AI Fitness Plan Generator Using Gemini
Nan Mudhalvan / SkillWallet Project

## Run Instructions:
1. python -m venv venv
2. source venv/bin/activate (or venv\\Scripts\\activate on Windows)
3. pip install -r requirements.txt
4. cp .env.example .env (add your GEMINI_API_KEY)
5. uvicorn app:app --reload
6. Open http://127.0.0.1:8000`
    },
    '.env.example': {
      path: 'FitBuddy/.env.example',
      language: 'text',
      content: `GEMINI_API_KEY=your_gemini_api_key_here`
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f9f5] text-[#182018] font-sans">
      {/* =========================================================================
          1. NAVBAR (Matches Reference HTML)
         ========================================================================= */}
      <nav className="h-[76px] flex items-center justify-between px-[7%] bg-white/90 backdrop-blur-[15px] fixed top-0 w-full z-40 border-b border-[#e7ece5] no-print">
        {/* Logo */}
        <a
          href="#home"
          onClick={() => setViewMode('main')}
          className="flex items-center gap-2.5 text-[23px] font-extrabold text-[#182018] tracking-tight group no-underline"
        >
          <div className="w-[42px] h-[42px] bg-[#d9f65b] rounded-[13px] flex items-center justify-center text-[23px] -rotate-6 transition-transform group-hover:rotate-0 shadow-xs">
            💪
          </div>
          <span>FitBuddy</span>
        </a>

        {/* Links */}
        <div className="flex items-center">
          <div className="hidden md:flex items-center gap-7 mr-6">
            <a
              href="#home"
              onClick={() => setViewMode('main')}
              className="text-[#374137] hover:text-[#73a900] font-semibold text-sm transition"
            >
              Home
            </a>
            <a
              href="#features"
              onClick={() => setViewMode('main')}
              className="text-[#374137] hover:text-[#73a900] font-semibold text-sm transition"
            >
              Features
            </a>
            <a
              href="#planner"
              onClick={() => setViewMode('main')}
              className="text-[#374137] hover:text-[#73a900] font-semibold text-sm transition"
            >
              Planner
            </a>
            <a
              href="#how"
              onClick={() => setViewMode('main')}
              className="text-[#374137] hover:text-[#73a900] font-semibold text-sm transition"
            >
              How It Works
            </a>
            <button
              onClick={() => setViewMode(viewMode === 'history' ? 'main' : 'history')}
              className={`font-semibold text-sm transition flex items-center gap-1.5 ${
                viewMode === 'history' ? 'text-[#73a900] font-bold' : 'text-[#374137] hover:text-[#73a900]'
              }`}
            >
              <span>History</span>
              {savedPlans.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#182018] text-[#d9f65b] text-[11px] font-bold flex items-center justify-center">
                  {savedPlans.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setViewMode(viewMode === 'project' ? 'main' : 'project')}
              className={`font-semibold text-sm transition flex items-center gap-1 ${
                viewMode === 'project' ? 'text-[#73a900] font-bold' : 'text-[#374137] hover:text-[#73a900]'
              }`}
              title="Inspect Python FastAPI project files"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Python Project</span>
            </button>
          </div>

          <a
            href="#planner"
            onClick={() => setViewMode('main')}
            className="bg-[#182018] hover:bg-black text-white text-sm font-semibold px-5 py-2.5 rounded-full transition shadow-xs"
          >
            Get Started
          </a>
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1">
        {/* Banner Notifications */}
        {successMessage && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-lg w-full px-4 no-print animate-slide-left">
            <div className="bg-white border-2 border-[#d9f65b] rounded-2xl p-4 shadow-xl flex items-center gap-3 text-sm font-semibold text-[#182018]">
              <CheckCircle2 className="w-5 h-5 text-[#73a900] shrink-0" />
              <span className="flex-1">{successMessage}</span>
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-gray-400 hover:text-black font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-lg w-full px-4 no-print animate-slide-left">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 shadow-xl flex items-center gap-3 text-sm font-semibold text-red-900">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span className="flex-1">{errorMessage}</span>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-red-700 hover:text-red-900 font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEW 1: HISTORY DRAWER / VIEW
           ========================================================================= */}
        {viewMode === 'history' && (
          <section className="pt-28 pb-20 px-[7%] max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200">
              <div>
                <button
                  onClick={() => setViewMode('main')}
                  className="text-xs font-bold text-[#7da800] uppercase tracking-wider mb-1 flex items-center gap-1 hover:underline"
                >
                  ← Back to Planner
                </button>
                <h1 className="text-3xl font-black text-[#182018]">Saved Fitness Plans</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Records persisted in local SQLite storage ({savedPlans.length} records).
                </p>
              </div>

              <button
                onClick={() => {
                  setViewMode('main');
                  const el = document.getElementById('planner');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-[#182018] text-[#d9f65b] font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-black transition shadow-xs"
              >
                + New Plan
              </button>
            </div>

            {savedPlans.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-[#e7ece5] shadow-xs">
                <div className="text-5xl mb-3">📁</div>
                <h3 className="font-extrabold text-lg text-[#182018] mb-1">No Saved Plans Yet</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
                  Fill in your profile in the planner section to generate your first AI fitness plan.
                </p>
                <button
                  onClick={() => {
                    setViewMode('main');
                    const el = document.getElementById('planner');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-[#d9f65b] text-[#182018] font-bold text-sm px-6 py-3 rounded-xl hover:scale-105 transition shadow-xs"
                >
                  Go to Planner
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedPlans.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-[#e7ebe4] rounded-2xl p-5 hover:border-[#9fc82c] hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#7da800]">
                          Plan #{item.id}
                        </span>
                        <span className="text-[11px] text-gray-400 font-medium">
                          {item.created_at}
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-[#182018] mb-1">
                        {item.name}'s Routine
                      </h3>
                      <div className="flex flex-wrap gap-2 text-xs font-semibold text-gray-600 mb-3">
                        <span className="bg-[#f5f8f2] px-2.5 py-1 rounded-md">
                          {item.age} yrs · {item.weight} kg
                        </span>
                        <span className="bg-[#eef8c9] text-[#4d7000] px-2.5 py-1 rounded-md">
                          {item.goal}
                        </span>
                        <span className="bg-gray-100 px-2.5 py-1 rounded-md">
                          Intensity: {item.intensity}
                        </span>
                      </div>
                      {item.feedback && (
                        <p className="text-xs text-blue-800 italic bg-blue-50 p-2 rounded-lg mb-3">
                          Updated with: "{item.feedback}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentPlan(item);
                          setViewMode('main');
                          setTimeout(() => {
                            const res = document.getElementById('result');
                            if (res) res.scrollIntoView({ behavior: 'smooth' });
                          }, 100);
                        }}
                        className="text-xs font-bold text-[#182018] bg-[#d9f65b] px-3.5 py-1.5 rounded-lg hover:opacity-90 transition cursor-pointer"
                      >
                        View Routine →
                      </button>

                      <button
                        type="button"
                        onClick={() => handleInitiateDelete(item)}
                        className="text-xs font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                        title={`Delete ${item.name}'s plan`}
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* =========================================================================
            VIEW 2: PYTHON PROJECT VIEWER (Nan Mudhalvan / SkillWallet evaluation)
           ========================================================================= */}
        {viewMode === 'project' && (
          <section className="pt-28 pb-20 px-[7%] max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200">
              <div>
                <button
                  onClick={() => setViewMode('main')}
                  className="text-xs font-bold text-[#7da800] uppercase tracking-wider mb-1 flex items-center gap-1 hover:underline"
                >
                  ← Back to Home
                </button>
                <h1 className="text-3xl font-black text-[#182018]">Python FastAPI Project Files</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Ready for Nan Mudhalvan / SkillWallet local execution & submission.
                </p>
              </div>

              <button
                onClick={() => copyCodeToClipboard(pythonCodeFiles[selectedProjectFile].content)}
                className="bg-[#182018] text-[#d9f65b] font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-black transition flex items-center gap-1.5"
              >
                {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            {/* File Selector Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {Object.keys(pythonCodeFiles).map((fileName) => (
                <button
                  key={fileName}
                  onClick={() => setSelectedProjectFile(fileName)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    selectedProjectFile === fileName
                      ? 'bg-[#182018] text-white shadow-xs'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5 text-[#7da800]" />
                  <span>{fileName}</span>
                </button>
              ))}
            </div>

            {/* Code Block */}
            <div className="bg-[#182018] text-gray-200 rounded-2xl p-6 font-mono text-xs overflow-x-auto border border-gray-800 shadow-xl">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-800 text-gray-400 text-[11px]">
                <span>{pythonCodeFiles[selectedProjectFile].path}</span>
                <span>Language: {pythonCodeFiles[selectedProjectFile].language}</span>
              </div>
              <pre className="leading-relaxed">
                <code>{pythonCodeFiles[selectedProjectFile].content}</code>
              </pre>
            </div>
          </section>
        )}

        {/* =========================================================================
            VIEW 3: MAIN LANDING & INTERACTIVE WORKOUT PLANNER
           ========================================================================= */}
        {viewMode === 'main' && (
          <>
            {/* ================= HERO SECTION ================= */}
            <section
              className="hero-gradient min-h-[92vh] pt-32 pb-20 px-[7%] grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] items-center gap-12"
              id="home"
            >
              {/* Left Hero Content */}
              <div className="animate-slide-left">
                <div className="inline-block px-4 py-2 bg-white border border-[#e1e8dc] rounded-full text-xs font-extrabold text-[#182018] mb-6 shadow-xs tracking-wider">
                  🤖 AI-POWERED FITNESS PLANNER
                </div>

                <h1 className="text-5xl sm:text-6xl lg:text-[76px] font-black leading-[0.98] tracking-[-3px] text-[#182018] mb-6 font-['Cabinet_Grotesk']">
                  Your Fitness.<br />
                  Your <span className="text-[#78a800]">Plan.</span>
                </h1>

                <p className="text-base sm:text-lg text-[#697269] max-w-[540px] leading-relaxed mb-8">
                  Build a personalized fitness routine with AI. Get workouts, nutrition guidance and recovery tips designed around your goals.
                </p>

                <div className="flex items-center gap-3.5 flex-wrap">
                  <a
                    href="#planner"
                    className="bg-[#182018] hover:bg-black text-white px-7 py-4 rounded-2xl text-base font-bold transition-all hover:-translate-y-1 hover:shadow-xl shadow-md no-underline inline-block cursor-pointer"
                  >
                    Create My Plan →
                  </a>

                  <a
                    href="#features"
                    className="bg-white hover:bg-gray-50 border border-[#dce4d8] text-[#182018] px-7 py-4 rounded-2xl text-base font-bold transition-all hover:-translate-y-1 shadow-xs no-underline inline-block cursor-pointer"
                  >
                    Explore Features
                  </a>
                </div>
              </div>

              {/* Right Hero Visual */}
              <div className="relative h-[440px] sm:h-[500px] flex items-center justify-center animate-float-hero">
                {/* Fitness Circle */}
                <div className="w-[300px] h-[300px] sm:w-[380px] sm:h-[380px] rounded-full bg-gradient-to-br from-[#d9f65b] to-[#b9dc39] flex items-center justify-center text-7xl sm:text-9xl shadow-[0_30px_80px_rgba(130,160,40,0.28)]">
                  🏋️
                </div>

                {/* Floating Card One */}
                <div className="absolute top-10 sm:top-14 left-2 sm:left-6 bg-white px-5 py-3.5 rounded-[17px] shadow-[0_15px_45px_rgba(0,0,0,0.1)] font-bold text-xs sm:text-sm text-[#182018] animate-float-card-1 border border-white/80">
                  🔥 Personalized Plan
                </div>

                {/* Floating Card Two */}
                <div className="absolute bottom-12 sm:bottom-16 right-0 sm:right-4 bg-white px-5 py-3.5 rounded-[17px] shadow-[0_15px_45px_rgba(0,0,0,0.1)] font-bold text-xs sm:text-sm text-[#182018] animate-float-card-2 border border-white/80">
                  🥗 Nutrition Tips
                </div>

                {/* Floating Card Three */}
                <button
                  onClick={() => openTimer('Workout Interval', 30)}
                  className="absolute top-1/2 right-[-10px] sm:right-[-15px] -translate-y-1/2 bg-white px-5 py-3.5 rounded-[17px] shadow-[0_15px_45px_rgba(0,0,0,0.1)] font-bold text-xs sm:text-sm text-[#182018] animate-float-card-3 border border-white/80 hover:bg-[#d9f65b] transition cursor-pointer text-left"
                  title="Click to launch Workout Timer"
                >
                  ⏱️ Workout Timer
                </button>
              </div>
            </section>

            {/* ================= FEATURES SECTION ================= */}
            <section className="py-24 px-[7%] bg-white border-t border-b border-[#e7ebe4]" id="features">
              <div className="text-center max-w-[700px] mx-auto mb-14">
                <small className="text-[#79a800] font-extrabold uppercase tracking-[2px] text-xs">
                  Why FitBuddy?
                </small>
                <h2 className="text-3xl sm:text-5xl font-black text-[#182018] tracking-[-2px] mt-3 mb-4 font-['Cabinet_Grotesk']">
                  Everything you need to stay consistent.
                </h2>
                <p className="text-[#737b73] text-sm sm:text-base leading-relaxed">
                  A simple fitness companion that helps you plan, exercise and improve every day.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
                {/* Feature Card 1 */}
                <div className="p-8 border border-[#e7ebe4] rounded-[24px] bg-white hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition duration-300">
                  <div className="w-[60px] h-[60px] rounded-[18px] bg-[#eef8c9] flex items-center justify-center text-3xl mb-5">
                    🤖
                  </div>
                  <h3 className="font-extrabold text-lg text-[#182018] mb-2.5">
                    AI Fitness Plans
                  </h3>
                  <p className="text-xs sm:text-sm text-[#727972] leading-relaxed">
                    Generate personalized workout plans based on your goals, body information and intensity.
                  </p>
                </div>

                {/* Feature Card 2 */}
                <div className="p-8 border border-[#e7ebe4] rounded-[24px] bg-white hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition duration-300">
                  <div className="w-[60px] h-[60px] rounded-[18px] bg-[#eef8c9] flex items-center justify-center text-3xl mb-5">
                    🏋️
                  </div>
                  <h3 className="font-extrabold text-lg text-[#182018] mb-2.5">
                    Smart Workouts
                  </h3>
                  <p className="text-xs sm:text-sm text-[#727972] leading-relaxed">
                    Follow structured exercises with durations, repetitions and rest periods.
                  </p>
                </div>

                {/* Feature Card 3 */}
                <div className="p-8 border border-[#e7ebe4] rounded-[24px] bg-white hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition duration-300">
                  <div className="w-[60px] h-[60px] rounded-[18px] bg-[#eef8c9] flex items-center justify-center text-3xl mb-5">
                    🥗
                  </div>
                  <h3 className="font-extrabold text-lg text-[#182018] mb-2.5">
                    Nutrition Tips
                  </h3>
                  <p className="text-xs sm:text-sm text-[#727972] leading-relaxed">
                    Receive simple nutrition suggestions to support your fitness journey.
                  </p>
                </div>

                {/* Feature Card 4 */}
                <div className="p-8 border border-[#e7ebe4] rounded-[24px] bg-white hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition duration-300">
                  <div className="w-[60px] h-[60px] rounded-[18px] bg-[#eef8c9] flex items-center justify-center text-3xl mb-5">
                    ⏱️
                  </div>
                  <h3 className="font-extrabold text-lg text-[#182018] mb-2.5">
                    Workout Timer
                  </h3>
                  <p className="text-xs sm:text-sm text-[#727972] leading-relaxed">
                    Start a countdown timer directly from your workout plan and stay focused.
                  </p>
                </div>
              </div>
            </section>

            {/* ================= PLANNER SECTION (Dark Theme) ================= */}
            <section className="py-24 px-[7%] bg-[#182018] text-white" id="planner">
              <div className="max-w-[1000px] mx-auto">
                <div className="text-center mb-11">
                  <h2 className="text-3xl sm:text-5xl font-black mb-3 font-['Cabinet_Grotesk']">
                    Create Your Fitness Plan
                  </h2>
                  <p className="text-[#b9c1b7] text-sm sm:text-base">
                    Tell FitBuddy a little about yourself.
                  </p>
                </div>

                {/* Form Card */}
                <div className="bg-white text-[#182018] p-7 sm:p-10 rounded-[28px] shadow-[0_30px_70px_rgba(0,0,0,0.35)]">
                  <form onSubmit={handleGeneratePlan}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                      {/* Name */}
                      <div className="flex flex-col gap-2">
                        <label className="font-bold text-xs sm:text-sm text-[#182018]">
                          Your Name
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Enter your name"
                          className="w-full p-3.5 border border-[#dfe5dc] rounded-[13px] text-sm bg-[#fafcf9] outline-none focus:border-[#9fc82c] focus:ring-4 focus:ring-[#edf6ce] transition"
                        />
                        {errors.name && (
                          <span className="text-xs text-red-600 font-semibold">{errors.name}</span>
                        )}
                      </div>

                      {/* Age */}
                      <div className="flex flex-col gap-2">
                        <label className="font-bold text-xs sm:text-sm text-[#182018]">
                          Age
                        </label>
                        <input
                          type="number"
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                          placeholder="Enter your age"
                          min="10"
                          max="100"
                          className="w-full p-3.5 border border-[#dfe5dc] rounded-[13px] text-sm bg-[#fafcf9] outline-none focus:border-[#9fc82c] focus:ring-4 focus:ring-[#edf6ce] transition"
                        />
                        {errors.age && (
                          <span className="text-xs text-red-600 font-semibold">{errors.age}</span>
                        )}
                      </div>

                      {/* Weight */}
                      <div className="flex flex-col gap-2">
                        <label className="font-bold text-xs sm:text-sm text-[#182018]">
                          Weight (kg)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          placeholder="Enter your weight"
                          min="25"
                          max="300"
                          className="w-full p-3.5 border border-[#dfe5dc] rounded-[13px] text-sm bg-[#fafcf9] outline-none focus:border-[#9fc82c] focus:ring-4 focus:ring-[#edf6ce] transition"
                        />
                        {errors.weight && (
                          <span className="text-xs text-red-600 font-semibold">{errors.weight}</span>
                        )}
                      </div>

                      {/* Fitness Goal */}
                      <div className="flex flex-col gap-2">
                        <label className="font-bold text-xs sm:text-sm text-[#182018]">
                          Fitness Goal
                        </label>
                        <select
                          value={goal}
                          onChange={(e) => setGoal(e.target.value as any)}
                          className="w-full p-3.5 border border-[#dfe5dc] rounded-[13px] text-sm bg-[#fafcf9] outline-none focus:border-[#9fc82c] focus:ring-4 focus:ring-[#edf6ce] font-semibold transition"
                        >
                          <option value="Weight Loss">🔥 Weight Loss</option>
                          <option value="Muscle Gain">💪 Muscle Gain</option>
                          <option value="General Wellness">🌿 General Wellness</option>
                        </select>
                      </div>

                      {/* Workout Intensity */}
                      <div className="flex flex-col gap-2 sm:col-span-2">
                        <label className="font-bold text-xs sm:text-sm text-[#182018]">
                          Workout Intensity
                        </label>

                        <div className="grid grid-cols-3 gap-2.5">
                          {[
                            { id: 'Low', label: '🌱 Low' },
                            { id: 'Medium', label: '⚡ Medium' },
                            { id: 'High', label: '🔥 High' }
                          ].map((item) => (
                            <button
                              type="button"
                              key={item.id}
                              onClick={() => setIntensity(item.id as any)}
                              className={`p-3.5 rounded-[13px] font-bold text-xs sm:text-sm text-center transition cursor-pointer border ${
                                intensity === item.id
                                  ? 'bg-[#d9f65b] border-[#d9f65b] text-[#182018] shadow-xs'
                                  : 'bg-[#fafcf9] border-[#dfe5dc] text-gray-700 hover:-translate-y-0.5'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Progress step bar during Gemini generation */}
                    {isGenerating && (
                      <div className="mb-4 bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-center">
                        <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mb-2 relative">
                          <div className="absolute top-0 bottom-0 bg-[#7da800] rounded-full animate-indeterminate"></div>
                        </div>
                        <p className="text-xs font-bold text-[#7da800]">{loadingStep}</p>
                      </div>
                    )}

                    {/* Generate Button */}
                    <button
                      type="submit"
                      disabled={isGenerating}
                      className="w-full mt-3 p-4 border-none rounded-[14px] bg-[#d9f65b] hover:bg-[#cbed46] text-[#182018] text-base sm:text-lg font-black transition-all hover:scale-[1.015] shadow-md cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin text-[#182018]" />
                          <span>Generating with Gemini AI...</span>
                        </>
                      ) : (
                        <span>✨ Generate My AI Fitness Plan</span>
                      )}
                    </button>
                  </form>
                </div>

                {/* ================= RESULT SECTION (Matches Reference HTML) ================= */}
                {currentPlan && (
                  <div id="result" className="mt-12 pt-8 border-t border-gray-800">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-2xl sm:text-4xl font-black text-white font-['Cabinet_Grotesk']">
                            🏆 Your 7-Day Plan
                          </h2>
                          <span className="text-[11px] font-bold bg-[#d9f65b] text-[#182018] px-2.5 py-0.5 rounded-full">
                            Active
                          </span>
                        </div>
                        <p className="text-sm text-[#b9c1b7] mt-1">
                          Personalized for <strong>{currentPlan.name}</strong> ({currentPlan.age} yrs, {currentPlan.weight} kg) · {currentPlan.goal} · Intensity: {currentPlan.intensity}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 no-print">
                        <button
                          onClick={() => window.print()}
                          className="bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <Printer className="w-4 h-4" /> Print / PDF
                        </button>
                        <button
                          onClick={() => setViewMode('history')}
                          className="bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <Calendar className="w-4 h-4" /> All Plans ({savedPlans.length})
                        </button>
                      </div>
                    </div>

                    {/* Gemini Plan Summary */}
                    {currentPlan.plan?.summary && (
                      <div className="bg-white/10 border-l-4 border-[#d9f65b] p-4 rounded-r-2xl mb-6 text-sm text-[#e0e7df] leading-relaxed">
                        <p>💡 {currentPlan.plan.summary}</p>
                      </div>
                    )}

                    {/* 7-Day Workout Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" id="weekGrid">
                      {currentPlan.plan?.days?.map((workout, idx) => (
                        <div
                          key={idx}
                          className="bg-white text-[#182018] rounded-[20px] p-5.5 border border-[#e5eadf] hover:-translate-y-1.5 transition-all duration-300 shadow-sm flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between text-[#7da800] font-extrabold text-xs uppercase tracking-wider mb-2">
                              <span>{workout.day}</span>
                              <span className="text-gray-400 font-normal lowercase">{workout.duration}</span>
                            </div>

                            <h3 className="text-base sm:text-lg font-black text-[#182018] mb-1 leading-snug">
                              {workout.workout_name}
                            </h3>

                            <p className="text-[11px] text-gray-500 font-medium mb-3 pb-2 border-b border-gray-100">
                              Focus: {workout.focus}
                            </p>

                            {/* Exercises */}
                            <div className="space-y-2 mb-4">
                              {workout.exercises?.map((exercise, eIdx) => (
                                <div
                                  key={eIdx}
                                  className="bg-[#f5f8f2] p-2.5 rounded-[10px] text-xs"
                                >
                                  <div className="font-bold text-[#182018] flex items-center justify-between">
                                    <span>{exercise.name}</span>
                                    <span className="text-[10px] font-extrabold text-[#537700] bg-[#e7f5b8] px-1.5 py-0.5 rounded">
                                      {exercise.sets_reps}
                                    </span>
                                  </div>
                                  {exercise.tip && (
                                    <div className="text-[10px] text-gray-500 mt-1 italic">
                                      💡 {exercise.tip}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Timer Button */}
                          <button
                            type="button"
                            onClick={() => openTimer(workout.workout_name || `${workout.day} Workout`, 30)}
                            className="w-full p-2.5 border-none rounded-[10px] bg-[#182018] hover:bg-black text-[#d9f65b] font-bold text-xs cursor-pointer transition flex items-center justify-center gap-1.5 mt-auto"
                          >
                            <span>⏱ Start Timer</span>
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Nutrition & Recovery Highlights */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                      <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2 text-[#d9f65b] font-bold text-xs uppercase tracking-wider">
                          <span>🥗</span>
                          <span>Nutrition Guidance</span>
                        </div>
                        <p className="text-xs text-[#d0d7cf] leading-relaxed">
                          {currentPlan.plan?.nutrition_tip || 'Focus on balanced macros, lean proteins and whole veggies.'}
                        </p>
                      </div>

                      <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2 text-[#d9f65b] font-bold text-xs uppercase tracking-wider">
                          <span>🛌</span>
                          <span>Recovery & Rest</span>
                        </div>
                        <p className="text-xs text-[#d0d7cf] leading-relaxed">
                          {currentPlan.plan?.recovery_tip || 'Prioritize 7-8 hours of sound sleep and daily warm-down stretches.'}
                        </p>
                      </div>

                      <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2 text-[#d9f65b] font-bold text-xs uppercase tracking-wider">
                          <span>💧</span>
                          <span>Hydration Goal</span>
                        </div>
                        <p className="text-xs text-[#d0d7cf] leading-relaxed">
                          {currentPlan.plan?.hydration_tip || `Aim for 2.5 to 3.5 liters of clean water daily for your ${currentPlan.weight}kg bodyweight.`}
                        </p>
                      </div>
                    </div>

                    {/* Feedback Refinement (Scenario 2) */}
                    <div className="bg-white text-[#182018] rounded-2xl p-6 border-2 border-dashed border-gray-300 no-print">
                      <h3 className="font-black text-lg sm:text-xl text-[#182018] mb-1">
                        🔄 Want to improve your plan?
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mb-4">
                        Need adjustments? Tell Gemini AI what you'd like to alter (e.g. more cardio, home workouts only, extra rest days) and receive an updated 7-day schedule.
                      </p>

                      <form onSubmit={handleUpdatePlan} className="space-y-3">
                        <textarea
                          rows={2}
                          value={feedbackInput}
                          onChange={(e) => setFeedbackInput(e.target.value)}
                          placeholder="Example: Add more cardio and include more rest days."
                          className="w-full p-3 border border-[#dfe5dc] rounded-xl text-xs sm:text-sm outline-none focus:border-[#9fc82c] focus:ring-2 focus:ring-[#edf6ce]"
                        />

                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={isUpdating}
                            className="bg-[#182018] hover:bg-black text-[#d9f65b] font-bold text-xs px-5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                          >
                            {isUpdating ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Updating via Gemini...</span>
                              </>
                            ) : (
                              <span>Update My Plan ⚡</span>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* ================= HOW IT WORKS SECTION ================= */}
            <section className="py-24 px-[7%] bg-[#f7f9f5]" id="how">
              <div className="text-center max-w-[700px] mx-auto mb-14">
                <small className="text-[#79a800] font-extrabold uppercase tracking-[2px] text-xs">
                  Simple Process
                </small>
                <h2 className="text-3xl sm:text-5xl font-black text-[#182018] tracking-[-2px] mt-3 mb-4 font-['Cabinet_Grotesk']">
                  How FitBuddy Works
                </h2>
                <p className="text-[#737b73] text-sm sm:text-base leading-relaxed">
                  Your personalized fitness journey starts in three simple steps.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-[1000px] mx-auto">
                {/* Step 1 */}
                <div className="p-8 sm:p-9 bg-white rounded-[25px] border border-[#e5eae2] hover:shadow-md transition">
                  <div className="text-5xl font-black text-[#c2dd58] mb-4 font-['Cabinet_Grotesk']">
                    01
                  </div>
                  <h3 className="font-extrabold text-xl text-[#182018] mb-2">
                    Tell Us About You
                  </h3>
                  <p className="text-xs sm:text-sm text-[#707970] leading-relaxed">
                    Enter your age, weight, fitness goal and preferred workout intensity.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-8 sm:p-9 bg-white rounded-[25px] border border-[#e5eae2] hover:shadow-md transition">
                  <div className="text-5xl font-black text-[#c2dd58] mb-4 font-['Cabinet_Grotesk']">
                    02
                  </div>
                  <h3 className="font-extrabold text-xl text-[#182018] mb-2">
                    AI Creates Your Plan
                  </h3>
                  <p className="text-xs sm:text-sm text-[#707970] leading-relaxed">
                    FitBuddy generates a personalized seven-day workout routine for your goal.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-8 sm:p-9 bg-white rounded-[25px] border border-[#e5eae2] hover:shadow-md transition">
                  <div className="text-5xl font-black text-[#c2dd58] mb-4 font-['Cabinet_Grotesk']">
                    03
                  </div>
                  <h3 className="font-extrabold text-xl text-[#182018] mb-2">
                    Start Moving
                  </h3>
                  <p className="text-xs sm:text-sm text-[#707970] leading-relaxed">
                    Follow your exercises, use the timer and stay consistent with your routine.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* =========================================================================
          2. WORKOUT COUNTDOWN TIMER MODAL (Matches Reference HTML)
         ========================================================================= */}
      {isTimerOpen && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-[8px] flex items-center justify-center z-50 p-4 animate-pop">
          <div className="bg-white text-[#182018] w-full max-w-[420px] p-8 sm:p-10 rounded-[30px] text-center shadow-2xl relative border border-gray-100">
            {/* Close cross top right */}
            <button
              onClick={closeTimer}
              className="absolute top-4 right-4 text-gray-400 hover:text-black p-2 rounded-full cursor-pointer text-lg font-bold"
            >
              ✕
            </button>

            <h2 className="text-xl sm:text-2xl font-black text-[#182018] mb-2">
              {timerTitle}
            </h2>
            <p className="text-xs text-gray-500 mb-4">Interval Countdown Timer</p>

            {/* Presets */}
            <div className="flex justify-center gap-1.5 mb-4">
              {[30, 45, 60, 90].map((sec) => (
                <button
                  key={sec}
                  onClick={() => resetTimer(sec)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold transition ${
                    timerDuration === sec
                      ? 'bg-[#182018] text-[#d9f65b]'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>

            {/* Countdown Number */}
            <div className="text-7xl sm:text-8xl font-black my-5 text-[#7da800] tracking-tight">
              {timeLeft <= 0 ? 'GO!' : timeLeft}
            </div>

            {timeLeft === 0 && (
              <p className="text-xs font-bold text-[#7da800] uppercase tracking-wider mb-4 animate-pulse">
                Interval Finished! Great Job 💪
              </p>
            )}

            {/* Controls */}
            <div className="flex gap-2.5 mt-6">
              <button
                type="button"
                onClick={closeTimer}
                className="flex-1 p-3.5 border-none rounded-xl bg-[#eee] hover:bg-[#e2e2e2] text-gray-800 font-bold text-sm cursor-pointer transition"
              >
                Close
              </button>

              <button
                type="button"
                onClick={toggleTimer}
                className="flex-1 p-3.5 border-none rounded-xl bg-[#d9f65b] hover:bg-[#cbed46] text-[#182018] font-bold text-sm cursor-pointer transition shadow-xs"
              >
                {isTimerRunning ? 'Pause' : timeLeft <= 0 ? 'Restart' : 'Start'}
              </button>

              <button
                type="button"
                onClick={() => resetTimer()}
                className="p-3.5 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 text-gray-700 font-bold text-sm cursor-pointer transition"
                title="Reset timer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DELETE CONFIRMATION MODAL
         ========================================================================= */}
      {planToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          className="fixed inset-0 bg-black/65 flex items-center justify-center z-50 backdrop-blur-xs p-4 no-print"
          onClick={handleCancelDelete}
        >
          <div
            className="bg-white text-[#182018] w-[min(460px,94%)] p-7 rounded-[26px] shadow-2xl border border-gray-100 animate-pop relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Cross */}
            <button
              type="button"
              onClick={handleCancelDelete}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 p-1.5 rounded-xl hover:bg-gray-100 transition cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Warning Icon */}
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>

            {/* Title */}
            <h2 id="delete-modal-title" className="text-xl font-black text-[#182018] mb-1.5 font-['Cabinet_Grotesk']">
              Delete Fitness Routine?
            </h2>

            {/* Description */}
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              Are you sure you want to delete <strong className="text-gray-900">{planToDelete.name}'s Routine</strong>?
            </p>

            {/* Details Box */}
            <div className="bg-[#f7f9f5] border border-[#e5eadf] rounded-2xl p-4 mb-4 text-xs text-gray-600 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Plan Record:</span>
                <span className="font-bold text-gray-800">#{planToDelete.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Profile:</span>
                <span className="font-bold text-gray-800">{planToDelete.name} ({planToDelete.age} yrs, {planToDelete.weight} kg)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Goal & Intensity:</span>
                <span className="font-bold text-[#537700] bg-[#eef8c9] px-2 py-0.5 rounded-md">
                  {planToDelete.goal} · {planToDelete.intensity}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-gray-200/60">
                <span className="text-gray-500">Date Saved:</span>
                <span className="font-medium text-gray-600">{planToDelete.created_at}</span>
              </div>
            </div>

            <p className="text-xs text-red-600 font-semibold mb-6 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>This routine will be permanently removed from your history.</span>
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className="flex-1 py-3.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs sm:text-sm transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm transition shadow-sm cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Yes, Delete Routine</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          3. FOOTER (Matches Reference HTML)
         ========================================================================= */}
      <footer className="py-11 px-[7%] bg-[#101610] text-white flex flex-col sm:flex-row justify-between items-center gap-5 text-sm no-print border-t border-gray-900">
        <div className="flex items-center gap-2">
          <strong className="text-lg font-black tracking-tight">💪 FitBuddy</strong>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#d9f65b] text-[#182018] font-bold">
            AI Powered
          </span>
        </div>

        <span className="text-[#aeb8ac] text-xs sm:text-sm">
          AI Fitness Plan Generator
        </span>

        <span className="text-[#aeb8ac] text-xs sm:text-sm">
          © 2026 FitBuddy
        </span>
      </footer>
    </div>
  );
}
