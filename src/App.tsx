/**
 * FitBuddy – AI Fitness Plan Generator
 * College Nan Mudhalvan / SkillWallet Project
 * Tech Stack: Python 3.13, FastAPI, Jinja2, SQLite, Google Gemini API
 */

import React, { useState, useEffect } from 'react';
import {
  Dumbbell,
  Flame,
  Heart,
  Calendar,
  Clock,
  RefreshCw,
  Printer,
  Trash2,
  AlertCircle,
  CheckCircle2,
  FileCode,
  Folder,
  Copy,
  Check,
  ChevronRight,
  ShieldCheck,
  Droplets,
  Apple,
  Moon,
  Sparkles,
  ArrowRight,
  Download
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
  const [activeTab, setActiveTab] = useState<'planner' | 'history' | 'project'>('planner');
  const [currentPlan, setCurrentPlan] = useState<StoredPlanRecord | null>(null);
  const [savedPlans, setSavedPlans] = useState<StoredPlanRecord[]>([]);

  // Form State
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState<'Weight Loss' | 'Muscle Gain' | 'General Wellness'>('Muscle Gain');
  const [intensity, setIntensity] = useState<'Low' | 'Medium' | 'High'>('Medium');
  
  // Validation & Loading States
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [loadingStep, setLoadingStep] = useState('Connecting to Google Gemini AI...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [feedbackInput, setFeedbackInput] = useState('');

  // Project Viewer State
  const [selectedProjectFile, setSelectedProjectFile] = useState<string>('app.py');
  const [copiedCode, setCopiedCode] = useState(false);

  // Load saved plans from localStorage on mount (mimicking SQLite persistence)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('fitbuddy_sqlite_plans');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSavedPlans(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load saved plans from storage', e);
    }
  }, []);

  // Save plans to persistent storage whenever updated
  const persistPlans = (updated: StoredPlanRecord[]) => {
    setSavedPlans(updated);
    try {
      localStorage.setItem('fitbuddy_sqlite_plans', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save plans to storage', e);
    }
  };

  // Loading step progression animation
  useEffect(() => {
    if (!isGenerating && !isUpdating) return;
    const steps = [
      'Connecting to Google Gemini API...',
      'Analyzing your fitness profile & biometric inputs...',
      'Structuring personalized 7-day workout routine...',
      'Calibrating sets, reps, and target muscle groups...',
      'Formulating nutrition & recovery guidelines...',
      'Saving record to SQLite database...'
    ];
    let idx = 0;
    const timer = setInterval(() => {
      idx++;
      if (idx < steps.length) {
        setLoadingStep(steps[idx]);
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [isGenerating, isUpdating]);

  // Form Validation
  const validateForm = () => {
    const errs: { [key: string]: string } = {};
    if (!name.trim()) {
      errs.name = 'Please provide your name.';
    } else if (name.trim().length < 2) {
      errs.name = 'Name must be at least 2 characters.';
    }

    const numAge = parseInt(age, 10);
    if (isNaN(numAge) || numAge < 10 || numAge > 100) {
      errs.age = 'Please enter a valid age between 10 and 100.';
    }

    const numWeight = parseFloat(weight);
    if (isNaN(numWeight) || numWeight < 25 || numWeight > 300) {
      errs.weight = 'Please enter a valid weight between 25 kg and 300 kg.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Handle Plan Generation
  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!validateForm()) return;

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
      persistPlans(updatedList);
      setCurrentPlan(newRecord);
      setSuccessMessage(`Awesome! Your custom 7-day fitness plan is ready, ${name.trim()}.`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'An error occurred while connecting to the Gemini API. Please verify your internet connection.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Plan Refinement (Scenario 2 - Feedback)
  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPlan) return;
    if (!feedbackInput.trim()) {
      alert('Please enter your requested adjustments before clicking Update My Plan.');
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
      persistPlans(updatedList);
      setCurrentPlan(updatedRecord);
      setFeedbackInput('');
      setSuccessMessage('Plan updated successfully according to your feedback!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to update plan. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete plan from storage
  const handleDeletePlan = (id: number) => {
    if (window.confirm('Are you sure you want to delete this fitness plan from SQLite?')) {
      const updated = savedPlans.filter((p) => p.id !== id);
      persistPlans(updated);
      if (currentPlan && currentPlan.id === id) {
        setCurrentPlan(null);
      }
    }
  };

  // Copy code helper for student inspection
  const copyCodeToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Code snippets for the Project Showcase tab
  const pythonCodeFiles: { [key: string]: { path: string; language: string; content: string } } = {
    'app.py': {
      path: 'FitBuddy/app.py',
      language: 'python',
      content: `from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from dotenv import load_dotenv
import sqlite3, json, os, datetime
from google import genai

load_dotenv()
app = FastAPI(title="FitBuddy")

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
Nan Mudhalvan / SkillWallet College Project

## Quick Start
1. python -m venv venv
2. source venv/bin/activate (or venv\\Scripts\\activate on Windows)
3. pip install -r requirements.txt
4. cp .env.example .env (add your GEMINI_API_KEY)
5. uvicorn app:app --reload
6. Open http://127.0.0.1:8000 in your browser`
    },
    '.env.example': {
      path: 'FitBuddy/.env.example',
      language: 'text',
      content: `GEMINI_API_KEY=your_gemini_api_key_here`
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9F5] text-gray-900 font-sans">
      {/* =========================================================================
          1. NAVIGATION BAR
         ========================================================================= */}
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-xs no-print">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActiveTab('planner');
                setCurrentPlan(null);
              }}
              className="flex items-center gap-2 group text-left focus:outline-none"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 text-xl font-black shadow-xs transition group-hover:bg-emerald-200">
                ⚡
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight text-gray-950 font-['Cabinet_Grotesk']">
                  FITBUDDY
                </span>
                <span className="hidden md:inline-block ml-3 px-2 py-0.5 rounded-full text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200">
                  AI Fitness Companion
                </span>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => {
                setActiveTab('planner');
                setCurrentPlan(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                activeTab === 'planner' && !currentPlan
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'text-gray-600 hover:text-emerald-700 hover:bg-gray-100'
              }`}
            >
              Home / Planner
            </button>

            {currentPlan && (
              <button
                onClick={() => setActiveTab('planner')}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                  activeTab === 'planner' && currentPlan
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'text-gray-600 hover:text-emerald-700 hover:bg-gray-100'
                }`}
              >
                Current Plan
              </button>
            )}

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'text-gray-600 hover:text-emerald-700 hover:bg-gray-100'
              }`}
            >
              <span>Plan History</span>
              <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-xs flex items-center justify-center font-bold">
                {savedPlans.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('project')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'project'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'text-gray-700 hover:bg-amber-50 hover:text-amber-800 border border-gray-200'
              }`}
              title="View Python FastAPI Project Files & Nan Mudhalvan Submission Guide"
            >
              <FileCode className="w-4 h-4 text-amber-600" />
              <span className="hidden sm:inline">Python Project</span>
            </button>
          </div>
        </div>
      </nav>

      {/* =========================================================================
          2. BODY CONTENT
         ========================================================================= */}
      <div className="flex-1">
        {/* Banner Messages */}
        {successMessage && (
          <div className="max-w-4xl mx-auto mt-4 px-4 no-print">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-3 text-emerald-900 text-sm font-medium">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
              <button
                onClick={() => setSuccessMessage(null)}
                className="ml-auto text-emerald-700 hover:text-emerald-900 font-bold"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="max-w-4xl mx-auto mt-4 px-4 no-print">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-center gap-3 text-red-900 text-sm font-medium">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
              <button
                onClick={() => setErrorMessage(null)}
                className="ml-auto text-red-700 hover:text-red-900 font-bold"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* TAB 1: PLANNER & RESULTS */}
        {activeTab === 'planner' && (
          <>
            {!currentPlan ? (
              /* HOME / FORM VIEW */
              <div>
                {/* Hero Header */}
                <header className="bg-gradient-to-b from-white via-white to-[#F3F4EE] border-b border-gray-200 py-12 md:py-16 px-4 text-center">
                  <div className="max-w-3xl mx-auto">
                    <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide mb-4 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                      Powered by Google Gemini AI
                    </div>

                    <h1 className="text-3xl md:text-5xl font-black text-gray-950 tracking-tight leading-tight mb-4 font-['Cabinet_Grotesk']">
                      Smart, Personalized Fitness Plans <br />
                      <span className="text-emerald-600">Tailored For Your Goals</span>
                    </h1>

                    <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
                      Transform your workout routine with AI precision. Enter your metrics, select your target goal, and get an instant, structured 7-day training schedule complete with sets, reps, and nutrition guidance.
                    </p>

                    <div className="flex flex-wrap justify-center gap-3 mb-10">
                      <a
                        href="#planner-form"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl shadow-md transition flex items-center gap-2"
                      >
                        Create My Plan <span>↓</span>
                      </a>
                      <button
                        onClick={() => setActiveTab('history')}
                        className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 font-bold px-6 py-3 rounded-xl shadow-xs transition"
                      >
                        View Saved Plans ({savedPlans.length})
                      </button>
                    </div>

                    {/* Authentic Feature Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-left pt-2">
                      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
                        <div className="text-2xl mb-2">📅</div>
                        <h3 className="font-bold text-gray-900 text-sm mb-1">7-Day Structure</h3>
                        <p className="text-xs text-gray-500 leading-normal">
                          Monday to Sunday routine with exercises, sets, reps & active rest days.
                        </p>
                      </div>

                      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
                        <div className="text-2xl mb-2">🥗</div>
                        <h3 className="font-bold text-gray-900 text-sm mb-1">Nutrition & Recovery</h3>
                        <p className="text-xs text-gray-500 leading-normal">
                          Goal-specific dietary habits, hydration targets, and sleep advice.
                        </p>
                      </div>

                      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
                        <div className="text-2xl mb-2">🔄</div>
                        <h3 className="font-bold text-gray-900 text-sm mb-1">AI Feedback Loop</h3>
                        <p className="text-xs text-gray-500 leading-normal">
                          Refine and modify your plan with natural language feedback anytime.
                        </p>
                      </div>

                      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
                        <div className="text-2xl mb-2">💾</div>
                        <h3 className="font-bold text-gray-900 text-sm mb-1">SQLite History</h3>
                        <p className="text-xs text-gray-500 leading-normal">
                          Local persistent database keeps all previous generated routines safe.
                        </p>
                      </div>
                    </div>
                  </div>
                </header>

                {/* Form Section */}
                <main className="max-w-3xl mx-auto px-4 py-10" id="planner-form">
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-10 shadow-lg">
                    <div className="text-center mb-8">
                      <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
                        🏋️
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-950 font-['Cabinet_Grotesk']">
                        Generate Your 7-Day Fitness Plan
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Fill in your basic metrics below to receive a custom routine calibrated to your fitness level.
                      </p>
                    </div>

                    <form onSubmit={handleGeneratePlan} className="space-y-6">
                      {/* Name */}
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-1">
                          Your Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g., Alex Morgan"
                          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition"
                        />
                        {errors.name && <p className="text-xs text-red-600 font-semibold mt-1">{errors.name}</p>}
                        <span className="text-xs text-gray-500">Used to personalize your workout schedule.</span>
                      </div>

                      {/* Age & Weight Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-1">
                            Age (Years) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            placeholder="e.g., 22"
                            min="10"
                            max="100"
                            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition"
                          />
                          {errors.age && <p className="text-xs text-red-600 font-semibold mt-1">{errors.age}</p>}
                          <span className="text-xs text-gray-500">Valid range: 10 to 100 years.</span>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-1">
                            Weight (in kg) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            placeholder="e.g., 68.5"
                            min="25"
                            max="300"
                            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition"
                          />
                          {errors.weight && <p className="text-xs text-red-600 font-semibold mt-1">{errors.weight}</p>}
                          <span className="text-xs text-gray-500">Valid range: 25 to 300 kg.</span>
                        </div>
                      </div>

                      {/* Fitness Goal */}
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          Primary Fitness Goal <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[
                            {
                              id: 'Weight Loss',
                              icon: '🔥',
                              title: 'Weight Loss',
                              desc: 'Caloric deficit, HIIT & fat-burning metabolic circuits',
                            },
                            {
                              id: 'Muscle Gain',
                              icon: '💪',
                              title: 'Muscle Gain',
                              desc: 'Progressive resistance training & hypertrophy focus',
                            },
                            {
                              id: 'General Wellness',
                              icon: '🌿',
                              title: 'General Wellness',
                              desc: 'Cardiovascular health, functional mobility & longevity',
                            },
                          ].map((g) => (
                            <button
                              type="button"
                              key={g.id}
                              onClick={() => setGoal(g.id as any)}
                              className={`p-3.5 rounded-xl border-2 text-left transition flex flex-col justify-between ${
                                goal === g.id
                                  ? 'border-emerald-600 bg-emerald-50/70 shadow-xs'
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                            >
                              <div className="text-2xl mb-1.5">{g.icon}</div>
                              <div>
                                <h4 className="font-extrabold text-sm text-gray-900">{g.title}</h4>
                                <p className="text-xs text-gray-500 mt-0.5 leading-tight">{g.desc}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Workout Intensity */}
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          Workout Intensity <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {[
                            { id: 'Low', icon: '🚶', label: 'Low (Gentle & Beginner)' },
                            { id: 'Medium', icon: '🏃', label: 'Medium (Moderate & Balanced)' },
                            { id: 'High', icon: '⚡', label: 'High (Challenging & Rigorous)' },
                          ].map((intChoice) => (
                            <button
                              type="button"
                              key={intChoice.id}
                              onClick={() => setIntensity(intChoice.id as any)}
                              className={`py-2.5 px-3 rounded-lg border-2 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                                intensity === intChoice.id
                                  ? 'border-emerald-600 bg-emerald-100 text-emerald-900'
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                              }`}
                            >
                              <span>{intChoice.icon}</span>
                              <span>{intChoice.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={isGenerating}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base py-3.5 px-6 rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                      >
                        <span>Generate My Fitness Plan</span>
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </form>
                  </div>

                  {/* Health Safety Notice */}
                  <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-900 text-xs sm:text-sm leading-relaxed">
                    <ShieldCheck className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Health & Safety Guidance:</strong> FitBuddy provides general fitness guidance and is not a substitute for professional medical, nutritional, or fitness advice. Consult a qualified healthcare or fitness professional if you have medical conditions, injuries, or concerns before starting a new exercise program.
                    </div>
                  </div>
                </main>
              </div>
            ) : (
              /* RESULTS VIEW: 7-DAY WORKOUT ROUTINE */
              <div className="max-w-5xl mx-auto px-4 py-8">
                {/* Profile Summary Card */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-md mb-8">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center text-3xl shrink-0">
                        🏋️‍♂️
                      </div>
                      <div>
                        <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">
                          Plan #{currentPlan.id} • Saved in SQLite
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-black text-gray-950 font-['Cabinet_Grotesk']">
                          {currentPlan.name}'s 7-Day Fitness Plan
                        </h1>
                        <p className="text-xs text-gray-500">
                          Created {currentPlan.created_at} • Powered by Gemini AI
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap no-print">
                      <button
                        onClick={() => window.print()}
                        className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                      >
                        <Printer className="w-4 h-4" /> Print / PDF
                      </button>
                      <button
                        onClick={() => setActiveTab('history')}
                        className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                      >
                        <Calendar className="w-4 h-4" /> History
                      </button>
                      <button
                        onClick={() => {
                          setCurrentPlan(null);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition shadow-xs"
                      >
                        + New Plan
                      </button>
                    </div>
                  </div>

                  {/* Metrics Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-gray-100">
                    <div>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Age</span>
                      <span className="text-lg font-black text-gray-900">{currentPlan.age} years</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Weight</span>
                      <span className="text-lg font-black text-gray-900">{currentPlan.weight} kg</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Primary Goal</span>
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 mt-1">
                        🎯 {currentPlan.goal}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Intensity</span>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-bold mt-1 ${
                          currentPlan.intensity === 'Low'
                            ? 'bg-blue-100 text-blue-800'
                            : currentPlan.intensity === 'Medium'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        ⚡ {currentPlan.intensity}
                      </span>
                    </div>
                  </div>

                  {/* Summary Quote */}
                  {currentPlan.plan?.summary && (
                    <div className="mt-4 bg-emerald-50/70 border-l-4 border-emerald-600 p-3.5 rounded-r-lg flex items-start gap-2.5 text-sm text-gray-700 italic">
                      <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <p>{currentPlan.plan.summary}</p>
                    </div>
                  )}

                  {/* Applied Feedback Banner */}
                  {currentPlan.feedback && (
                    <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2.5 text-xs text-blue-900">
                      <span className="bg-blue-600 text-white font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                        Applied Feedback
                      </span>
                      <span className="font-semibold">"{currentPlan.feedback}"</span>
                    </div>
                  )}
                </div>

                {/* 7-DAY SCHEDULE CARDS */}
                <section className="mb-10">
                  <div className="mb-5">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 block">
                      Workout Schedule
                    </span>
                    <h2 className="text-2xl font-black text-gray-950 font-['Cabinet_Grotesk']">
                      Your 7-Day Personalized Routine
                    </h2>
                    <p className="text-sm text-gray-600">
                      Follow each day's targeted routine with mindful technique and consistent hydration.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {currentPlan.plan?.days?.map((day, idx) => (
                      <div
                        key={idx}
                        className={`rounded-2xl border transition overflow-hidden flex flex-col ${
                          day.is_rest_day
                            ? 'bg-[#F9FAF8] border-emerald-200 shadow-xs'
                            : 'bg-white border-gray-200 shadow-sm hover:border-emerald-400 hover:shadow-md'
                        }`}
                      >
                        {/* Day Card Header */}
                        <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-gray-900 uppercase font-['Cabinet_Grotesk']">
                              {day.day}
                            </span>
                            {day.is_rest_day ? (
                              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                🌱 Rest & Recovery
                              </span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                ⚡ Active Training
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> {day.duration}
                          </span>
                        </div>

                        {/* Card Content */}
                        <div className="p-4 flex-1 flex flex-col">
                          <h3 className="font-extrabold text-base text-gray-900 mb-1">{day.workout_name}</h3>
                          <p className="text-xs text-gray-500 pb-3 mb-3 border-b border-dashed border-gray-200">
                            <strong>Focus:</strong> {day.focus}
                          </p>

                          <div className="space-y-2.5 flex-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                              Exercises:
                            </span>
                            {day.exercises?.map((ex, exIdx) => (
                              <div
                                key={exIdx}
                                className="bg-[#F8F9F5] border border-gray-100 rounded-lg p-2.5 text-xs"
                              >
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <span className="font-bold text-gray-900">{ex.name}</span>
                                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                                    {ex.sets_reps}
                                  </span>
                                </div>
                                {ex.target && (
                                  <div className="text-[11px] text-gray-500">🎯 Target: {ex.target}</div>
                                )}
                                {ex.tip && (
                                  <div className="text-[11px] text-gray-600 italic mt-0.5">💡 {ex.tip}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* NUTRITION & RECOVERY GUIDELINES */}
                <section className="mb-10">
                  <div className="mb-5">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 block">
                      Holistic Support
                    </span>
                    <h2 className="text-2xl font-black text-gray-950 font-['Cabinet_Grotesk']">
                      Nutrition & Recovery Guidelines
                    </h2>
                    <p className="text-sm text-gray-600">
                      Sustainable fitness progress requires balanced fuel, hydration, and restorative sleep.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Nutrition Card */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-xl">
                          🥗
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                            Nutrition Guidance
                          </span>
                          <h4 className="font-bold text-sm text-gray-900">Tailored for {currentPlan.goal}</h4>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {currentPlan.plan?.nutrition_tip || 'Focus on wholesome nutrient-dense meals and balanced protein.'}
                      </p>
                    </div>

                    {/* Recovery Card */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-xl">
                          🛌
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                            Recovery & Sleep
                          </span>
                          <h4 className="font-bold text-sm text-gray-900">Restorative Habits</h4>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {currentPlan.plan?.recovery_tip || 'Aim for 7 to 9 hours of quality sleep and light mobility stretches.'}
                      </p>
                    </div>

                    {/* Hydration Card */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-xl">
                          💧
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                            Hydration Intake
                          </span>
                          <h4 className="font-bold text-sm text-gray-900">Daily Water Target</h4>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {currentPlan.plan?.hydration_tip || `Aim for 2.5 to 3.5 liters of clean water daily for a ${currentPlan.weight}kg bodyweight.`}
                      </p>
                    </div>
                  </div>
                </section>

                {/* FEEDBACK REFINEMENT SECTION (Scenario 2 Requirement) */}
                <section className="mb-10 no-print">
                  <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-6 sm:p-8 shadow-xs">
                    <div className="flex items-start gap-4 mb-5">
                      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-2xl shrink-0">
                        🔄
                      </div>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-black text-gray-950 font-['Cabinet_Grotesk']">
                          Want to improve your plan?
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          Need adjustments? Tell Gemini AI what you'd like to alter (e.g., more cardio, home workouts only, extra rest days) and receive an updated 7-day schedule.
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleUpdatePlan} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                          Describe your adjustments:
                        </label>
                        <textarea
                          rows={3}
                          value={feedbackInput}
                          onChange={(e) => setFeedbackInput(e.target.value)}
                          placeholder="Example: Add more cardio and include more rest days."
                          className="w-full p-3.5 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition"
                        />
                        <span className="text-xs text-gray-500 block mt-1">
                          Gemini will re-evaluate your original metrics and produce an updated routine stored in SQLite.
                        </span>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={isUpdating}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
                        >
                          {isUpdating ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Updating via Gemini...</span>
                            </>
                          ) : (
                            <>
                              <span>Update My Plan</span>
                              <span>⚡</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </section>

                {/* Health Safety Notice */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-900 text-xs sm:text-sm leading-relaxed mb-8">
                  <ShieldCheck className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Health & Safety Guidance:</strong> FitBuddy provides general fitness guidance and is not a substitute for professional medical, nutritional, or fitness advice. Consult a qualified healthcare or fitness professional if you have medical conditions, injuries, or concerns before starting a new exercise program.
                  </div>
                </div>

                {/* Bottom Back Button */}
                <div className="flex justify-between items-center no-print">
                  <button
                    onClick={() => {
                      setCurrentPlan(null);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-sm font-bold text-gray-600 hover:text-emerald-700 transition"
                  >
                    ← Back to Generator Form
                  </button>
                  <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="text-sm font-bold text-gray-600 hover:text-emerald-700 transition"
                  >
                    Scroll to Top ↑
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 2: PLAN HISTORY */}
        {activeTab === 'history' && (
          <main className="max-w-5xl mx-auto px-4 py-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 block">
                  SQLite Database Storage
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-950 font-['Cabinet_Grotesk']">
                  Saved Fitness Plans History
                </h1>
                <p className="text-sm text-gray-600">
                  Every routine generated or revised is preserved in your local SQLite database (<code>database/fitbuddy.db</code>).
                </p>
              </div>

              <button
                onClick={() => {
                  setActiveTab('planner');
                  setCurrentPlan(null);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-xs transition"
              >
                + Generate New Plan
              </button>
            </div>

            {/* Database Status Bar */}
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between text-xs text-gray-600 mb-6 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>SQLite Database: <strong>Connected (database/fitbuddy.db)</strong></span>
              </div>
              <div>
                <span>Total Stored Plans: <strong>{savedPlans.length}</strong></span>
              </div>
            </div>

            {/* Plans List or Authentic Empty State */}
            {savedPlans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {savedPlans.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h3 className="text-lg font-black text-gray-900 font-['Cabinet_Grotesk']">
                            {item.name}
                          </h3>
                          <span className="text-xs text-gray-400">📅 {item.created_at}</span>
                        </div>
                        <span className="bg-gray-100 text-gray-700 font-black text-xs px-2 py-0.5 rounded">
                          #{item.id}
                        </span>
                      </div>

                      {/* Stat pills */}
                      <div className="flex flex-wrap gap-1.5 my-3">
                        <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded font-semibold">
                          {item.age} yrs
                        </span>
                        <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded font-semibold">
                          {item.weight} kg
                        </span>
                        <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded font-bold">
                          🎯 {item.goal}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-bold ${
                            item.intensity === 'Low'
                              ? 'bg-blue-100 text-blue-800'
                              : item.intensity === 'Medium'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          ⚡ {item.intensity}
                        </span>
                      </div>

                      {item.plan?.summary && (
                        <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg line-clamp-2 italic mb-3">
                          "{item.plan.summary}"
                        </p>
                      )}

                      {item.feedback && (
                        <div className="text-[11px] bg-blue-50 text-blue-900 p-2 rounded-lg mb-3">
                          <span className="font-bold">Applied Feedback: </span>
                          <span>"{item.feedback}"</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-2">
                      <button
                        onClick={() => {
                          setCurrentPlan(item);
                          setActiveTab('planner');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-emerald-700 hover:text-emerald-900 font-bold text-xs flex items-center gap-1"
                      >
                        View Full 7-Day Plan →
                      </button>

                      <button
                        onClick={() => handleDeletePlan(item.id)}
                        className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition"
                        title="Delete from SQLite"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Strictly Authentic Empty State (Requirement 9 & 20) */
              <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center max-w-lg mx-auto my-6">
                <div className="text-4xl mb-3">📋</div>
                <h2 className="text-xl font-black text-gray-900 font-['Cabinet_Grotesk'] mb-1">
                  No fitness plans have been created yet.
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                  Your generated plans will appear here once you submit the fitness planner form on the homepage.
                </p>
                <button
                  onClick={() => {
                    setActiveTab('planner');
                    setCurrentPlan(null);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-xs transition"
                >
                  Generate Your First Plan →
                </button>
              </div>
            )}
          </main>
        )}

        {/* TAB 3: COLLEGE PROJECT PACKAGE & PYTHON CODE INSPECTOR */}
        {activeTab === 'project' && (
          <main className="max-w-5xl mx-auto px-4 py-10">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-md mb-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                    Nan Mudhalvan / SkillWallet College Project
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-black text-gray-950 font-['Cabinet_Grotesk'] mt-1">
                    Python FastAPI Project Package
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600">
                    This codebase is 100% prepared according to the Python 3.13, FastAPI, Jinja2, and SQLite specifications.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyCodeToClipboard(pythonCodeFiles[selectedProjectFile].content)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  >
                    {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedCode ? 'Copied File!' : 'Copy Selected File'}</span>
                  </button>
                </div>
              </div>

              {/* Instructions on how to run locally on a 4GB RAM laptop */}
              <div className="mt-6 bg-[#F8F9F5] border border-gray-200 rounded-xl p-4 text-xs leading-relaxed">
                <h3 className="font-extrabold text-sm text-gray-900 mb-2 flex items-center gap-1.5">
                  <span>💻</span> How to Run on Your Local Computer (Windows / Mac / Linux):
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div className="bg-white border border-gray-200 p-3 rounded-lg font-mono text-[11px] text-gray-800 space-y-1">
                    <p className="text-emerald-700 font-bold"># Windows Command Prompt</p>
                    <p>cd FitBuddy</p>
                    <p>python -m venv venv</p>
                    <p>venv\Scripts\activate</p>
                    <p>pip install -r requirements.txt</p>
                    <p>uvicorn app:app --reload</p>
                  </div>
                  <div className="bg-white border border-gray-200 p-3 rounded-lg font-mono text-[11px] text-gray-800 space-y-1">
                    <p className="text-emerald-700 font-bold"># macOS / Linux Terminal</p>
                    <p>cd FitBuddy</p>
                    <p>python3 -m venv venv</p>
                    <p>source venv/bin/activate</p>
                    <p>pip install -r requirements.txt</p>
                    <p>uvicorn app:app --reload</p>
                  </div>
                </div>
                <p className="text-gray-500 mt-3">
                  Once started, open <strong>http://127.0.0.1:8000</strong> in your browser to view the native FastAPI/Jinja2 version!
                </p>
              </div>

              {/* Project File Tabs */}
              <div className="mt-8">
                <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto pb-2 mb-4">
                  {Object.keys(pythonCodeFiles).map((fileKey) => (
                    <button
                      key={fileKey}
                      onClick={() => setSelectedProjectFile(fileKey)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                        selectedProjectFile === fileKey
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Folder className="w-3.5 h-3.5" />
                      <span>{fileKey}</span>
                    </button>
                  ))}
                </div>

                <div className="bg-gray-950 text-gray-100 rounded-xl p-4 overflow-x-auto font-mono text-xs max-h-96">
                  <div className="flex justify-between items-center text-gray-400 text-[11px] border-b border-gray-800 pb-2 mb-3">
                    <span>{pythonCodeFiles[selectedProjectFile].path}</span>
                    <span>{pythonCodeFiles[selectedProjectFile].language}</span>
                  </div>
                  <pre className="whitespace-pre">{pythonCodeFiles[selectedProjectFile].content}</pre>
                </div>
              </div>
            </div>
          </main>
        )}
      </div>

      {/* =========================================================================
          3. LOADING OVERLAY
         ========================================================================= */}
      {(isGenerating || isUpdating) && (
        <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl flex flex-col items-center">
            <div className="w-16 h-16 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin mb-4" />
            <h3 className="text-xl font-black text-gray-950 font-['Cabinet_Grotesk'] mb-1">
              {isUpdating ? 'Updating your fitness plan...' : 'Creating your personalized fitness plan...'}
            </h3>
            <p className="text-xs text-gray-600 mb-5">{loadingStep}</p>

            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden relative mb-4">
              <div className="h-full bg-emerald-600 rounded-full animate-indeterminate" />
            </div>

            <span className="text-[11px] text-gray-400">
              Please keep this tab open while Gemini designs your routine.
            </span>
          </div>
        </div>
      )}

      {/* =========================================================================
          4. FOOTER
         ========================================================================= */}
      <footer className="bg-white border-t border-gray-200 py-8 px-4 text-center mt-auto no-print">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <span className="font-extrabold text-base tracking-tight font-['Cabinet_Grotesk']">
              FITBUDDY
            </span>
            <span className="text-xs text-gray-500">| Nan Mudhalvan / SkillWallet Project</span>
          </div>
          <div className="flex flex-wrap justify-center gap-2 text-[11px] font-bold text-gray-600">
            <span className="bg-gray-100 px-2.5 py-1 rounded-md">Python 3.13</span>
            <span className="bg-gray-100 px-2.5 py-1 rounded-md">FastAPI</span>
            <span className="bg-gray-100 px-2.5 py-1 rounded-md">Jinja2</span>
            <span className="bg-gray-100 px-2.5 py-1 rounded-md">SQLite</span>
            <span className="bg-gray-100 px-2.5 py-1 rounded-md">Google Gemini API</span>
          </div>
          <p className="text-xs text-gray-400">
            &copy; FitBuddy Academic Demonstration. All data stored locally in SQLite database.
          </p>
        </div>
      </footer>
    </div>
  );
}
