/**
 * FitBuddy – Premium AI Fitness Plan Generator
 * Modern Fitness-Tech Startup UI
 * Tech Stack: Python 3.13, FastAPI, SQLite / LocalStorage, Google Gemini API, React + Vite
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Printer,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Calendar,
  X,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  AlertTriangle,
  Sun,
  Moon,
  Droplets,
  Flame,
  Award,
  TrendingUp,
  Heart,
  Dumbbell,
  CheckSquare,
  Square,
  Volume2,
  VolumeX,
  Plus,
  Info,
  ExternalLink,
  SkipForward,
  FastForward,
  Check,
  Download,
  Utensils,
  FileText
} from 'lucide-react';
import { generateFitBuddyPdf, generateNutritionPlanPdf } from './utils/pdfGenerator';
import {
  matchExerciseInDb,
  getExerciseImageUrl,
  getYouTubeTutorialUrl,
  getExerciseFallbackVisual,
  initializeExerciseDb,
  subscribeExerciseDb
} from './utils/exerciseDb';
import {
  getOrGenerate7DayNutritionPlan,
  calculateUserNutritionMetrics
} from './utils/nutritionGenerator';
import { DayNutritionPlan } from './types';

interface Exercise {
  name: string;
  sets_reps: string;
  rest_time?: string;
  target?: string;
  tip?: string;
}

export interface WorkoutSession {
  dayTitle: string;
  dayIndex?: number;
  exercises: Array<{
    name: string;
    sets_reps: string;
    rest_time?: string;
    target?: string;
    tip?: string;
  }>;
  exerciseIndex: number;
  currentSet: number;
  totalSets: number;
  targetReps: string;
  isFinished: boolean;
}

interface DayPlan {
  day: string;
  workout_name: string;
  focus: string;
  duration: string;
  is_rest_day: boolean;
  intensity: string;
  warmup?: string;
  cooldown?: string;
  exercises: Exercise[];
}

interface SampleMealPlan {
  breakfast?: string;
  lunch?: string;
  snack?: string;
  dinner?: string;
}

interface FitnessPlanData {
  summary: string;
  days: DayPlan[];
  sample_meal_plan?: SampleMealPlan;
  nutrition_plan_7days?: DayNutritionPlan[];
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
  height?: number;
  gender?: string;
  goal: string;
  intensity: string;
  equipment?: string;
  diet?: string;
  limitations?: string;
  plan: FitnessPlanData;
  feedback?: string;
  created_at: string;
}

interface WeightLogEntry {
  id: string;
  date: string;
  weight: number;
}

const MOTIVATIONAL_QUOTES = [
  { text: "The body achieves what the mind believes.", author: "Napoleon Hill" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "You don't have to be extreme, just consistent.", author: "FitBuddy Wisdom" },
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
  { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
  { text: "The pain you feel today will be the strength you feel tomorrow.", author: "Arnold Schwarzenegger" }
];

// Exercise Thumbnail Component for Day Cards (Requirement #7)
function ExerciseThumbnail({ name, className = "w-12 h-12" }: { name: string; className?: string }) {
  const [hasError, setHasError] = useState(false);
  const match = useMemo(() => matchExerciseInDb(name), [name]);
  const imgUrl = match?.images?.[0] ? getExerciseImageUrl(match.images[0]) : null;
  const fallback = useMemo(() => getExerciseFallbackVisual(name), [name]);

  if (imgUrl && !hasError) {
    return (
      <div className={`${className} rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 relative shrink-0 shadow-xs flex items-center justify-center`}>
        <img
          src={imgUrl}
          alt={name}
          loading="lazy"
          onError={() => setHasError(true)}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />
      </div>
    );
  }

  return (
    <div
      className={`${className} rounded-xl flex items-center justify-center text-lg border shrink-0 shadow-xs`}
      style={{
        backgroundColor: `${fallback.color}15`,
        borderColor: `${fallback.color}40`,
      }}
      title={name}
    >
      <span>{fallback.emoji || '💪'}</span>
    </div>
  );
}

export default function App() {
  // Navigation & Theme States
  const [isSavedPlansModalOpen, setIsSavedPlansModalOpen] = useState(false);
  const [weightInputError, setWeightInputError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('fitbuddy_theme') === 'dark';
  });

  // Active & Stored Plans
  const [currentPlan, setCurrentPlan] = useState<StoredPlanRecord | null>(null);
  const [savedPlans, setSavedPlans] = useState<StoredPlanRecord[]>([]);

  // Planner Form State (Requirements #1)
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Non-binary' | 'Other'>('Male');
  const [goal, setGoal] = useState<'Weight Loss' | 'Muscle Gain' | 'General Wellness'>('Muscle Gain');
  const [intensity, setIntensity] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [equipment, setEquipment] = useState<'No equipment' | 'Dumbbells' | 'Full gym'>('Dumbbells');
  const [diet, setDiet] = useState<'Vegetarian' | 'Non-vegetarian' | 'Vegan'>('Vegetarian');
  const [limitations, setLimitations] = useState('');

  // Form Validation & Feedback
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [loadingStep, setLoadingStep] = useState('Connecting to Google Gemini AI...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fallbackPlanOffer, setFallbackPlanOffer] = useState<any | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [feedbackInput, setFeedbackInput] = useState('');

  // Expandable Workout Day Cards (Requirement #2)
  const [expandedDays, setExpandedDays] = useState<{ [key: string]: boolean }>({});

  // Progress Tracking: Checkboxes, Streak, Weekly % (Requirement #5)
  // key: "planId_dayIdx_exerciseIdx" or "planId_dayIdx"
  const [completedExercises, setCompletedExercises] = useState<{ [key: string]: boolean }>(() => {
    try {
      const stored = localStorage.getItem('fitbuddy_completed_exercises');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [completedDays, setCompletedDays] = useState<{ [key: string]: boolean }>(() => {
    try {
      const stored = localStorage.getItem('fitbuddy_completed_days');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [streakCount, setStreakCount] = useState<number>(() => {
    try {
      const s = localStorage.getItem('fitbuddy_streak');
      const days = localStorage.getItem('fitbuddy_completed_days');
      if (!days || days === '{}') {
        localStorage.setItem('fitbuddy_streak', '0');
        return 0;
      }
      return s ? Math.max(0, parseInt(s, 10) || 0) : 0;
    } catch {
      return 0;
    }
  });

  // Weight Log Entries (Zero fake entries, clean empty state for new users)
  const [weightLogs, setWeightLogs] = useState<WeightLogEntry[]>(() => {
    try {
      const stored = localStorage.getItem('fitbuddy_weight_logs');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Purge legacy fake entries ('Wk 1', 'Wk 2', etc.)
          const clean = parsed.filter(
            (item: any) =>
              item &&
              typeof item.weight === 'number' &&
              item.date &&
              !String(item.date).startsWith('Wk ')
          );
          if (clean.length !== parsed.length) {
            localStorage.setItem('fitbuddy_weight_logs', JSON.stringify(clean));
          }
          return clean;
        }
      }
    } catch {}
    return [];
  });
  const [isLogWeightModalOpen, setIsLogWeightModalOpen] = useState(false);
  const [newWeightInput, setNewWeightInput] = useState('');
  const [newWeightDateInput, setNewWeightDateInput] = useState('Today');

  // Water Intake Tracker (Starts at 0 / 7 glasses for every newly generated plan/user session)
  const [waterGlasses, setWaterGlasses] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('fitbuddy_water_glasses');
      // Purge legacy fake defaults '4', '3', '8'
      if (saved === '4' || saved === '3' || saved === '8') {
        localStorage.setItem('fitbuddy_water_glasses', '0');
        return 0;
      }
      if (saved !== null) {
        const val = parseInt(saved, 10);
        return isNaN(val) ? 0 : Math.min(7, Math.max(0, val));
      }
      return 0;
    } catch {
      return 0;
    }
  });
  const waterGoalGlasses = 7;

  // Improved Workout Timer & Dedicated Session State (Requirement #2 & #4)
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [timerTitle, setTimerTitle] = useState('Workout Interval');
  const [timerMode, setTimerMode] = useState<'work' | 'rest'>('work');
  const [workSeconds, setWorkSeconds] = useState<number>(45);
  const [restSeconds, setRestSeconds] = useState<number>(15);
  const [timeLeft, setTimeLeft] = useState<number>(45);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerSoundEnabled, setTimerSoundEnabled] = useState<boolean>(true);
  const timerRef = useRef<any>(null);

  // Dedicated Workout Routine Session
  const [workoutSession, setWorkoutSession] = useState<WorkoutSession | null>(null);
  const [animImageIndex, setAnimImageIndex] = useState<0 | 1>(0);
  const [failedImages, setFailedImages] = useState<{ [url: string]: boolean }>({});
  const [dbVersion, setDbVersion] = useState(0); // Trigger re-render when dataset finishes loading

  // PDF Generation State (Requirement #1)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfSuccess, setPdfSuccess] = useState(false);

  // Delete Confirmation Modal State
  const [planToDelete, setPlanToDelete] = useState<StoredPlanRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Motivational Quote
  const [quoteIdx, setQuoteIdx] = useState(0);

  // Apply dark mode class to html element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('fitbuddy_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('fitbuddy_theme', 'light');
    }
  }, [darkMode]);

  // Load free-exercise-db dataset once on app mount (Requirement #2)
  useEffect(() => {
    initializeExerciseDb().then(() => {
      setDbVersion((v) => v + 1);
    });
    const unsub = subscribeExerciseDb(() => {
      setDbVersion((v) => v + 1);
    });
    return unsub;
  }, []);

  // Alternate exercise demonstration images every 1s when workout timer modal is open (Requirement #2)
  useEffect(() => {
    if (!isTimerOpen) return;
    const interval = setInterval(() => {
      setAnimImageIndex((prev) => (prev === 0 ? 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerOpen]);

  // Persist completed exercises & days
  useEffect(() => {
    try {
      localStorage.setItem('fitbuddy_completed_exercises', JSON.stringify(completedExercises));
    } catch (e) {
      console.warn('Could not save completed exercises', e);
    }
  }, [completedExercises]);

  useEffect(() => {
    try {
      localStorage.setItem('fitbuddy_completed_days', JSON.stringify(completedDays));
    } catch (e) {
      console.warn('Could not save completed days', e);
    }
  }, [completedDays]);

  useEffect(() => {
    try {
      localStorage.setItem('fitbuddy_weight_logs', JSON.stringify(weightLogs));
    } catch (e) {
      console.warn('Could not save weight logs', e);
    }
  }, [weightLogs]);

  useEffect(() => {
    try {
      localStorage.setItem('fitbuddy_water_glasses', waterGlasses.toString());
    } catch (e) {
      console.warn('Could not save water glasses', e);
    }
  }, [waterGlasses]);

  useEffect(() => {
    try {
      localStorage.setItem('fitbuddy_streak', streakCount.toString());
    } catch (e) {
      console.warn('Could not save streak count', e);
    }
  }, [streakCount]);

  // Load saved plans on mount (sync server storage + localStorage into Saved Plans list)
  // NOTE: Do not automatically set currentPlan on page load.
  // The workout schedule and nutrition plan should ONLY appear after the user enters their details and generates a plan.
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
            } else if (cachedPlans.length > 0) {
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

  // Expand first 2 days by default when a plan is loaded
  useEffect(() => {
    if (currentPlan?.plan?.days) {
      const initial: { [key: string]: boolean } = {};
      currentPlan.plan.days.forEach((d, idx) => {
        initial[d.day || `Day ${idx + 1}`] = idx < 2; // open first 2 days
      });
      setExpandedDays(initial);
    }
  }, [currentPlan]);

  const toggleDayExpansion = (dayKey: string) => {
    setExpandedDays((prev) => ({
      ...prev,
      [dayKey]: !prev[dayKey]
    }));
  };

  // Helper to save plans
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

  // Play beep or vibration on timer completion
  const playAlertSound = () => {
    if (!timerSoundEnabled) return;
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      // AudioContext may be restricted by autoplay policy
    }
  };

  // Helper to extract sets, reps, and work/rest durations from exercise strings
  function parseExerciseMetrics(ex: { name: string; sets_reps?: string; rest_time?: string }) {
    let sets = 3;
    let reps = '10-12 reps';
    let workDuration = 45;
    let restDuration = 45;

    if (ex.sets_reps) {
      const sMatch = ex.sets_reps.match(/(\d+)\s*sets?/i);
      if (sMatch) sets = Math.max(1, parseInt(sMatch[1], 10));

      const rMatch = ex.sets_reps.match(/x\s*([^,\n]+)/i);
      if (rMatch) {
        reps = rMatch[1].trim();
        const secMatch = reps.match(/(\d+)\s*(?:sec|seconds)/i);
        if (secMatch) workDuration = Math.max(10, parseInt(secMatch[1], 10));
      } else {
        reps = ex.sets_reps;
      }
    }

    if (ex.rest_time) {
      const restMatch = ex.rest_time.match(/(\d+)\s*s/i);
      if (restMatch) restDuration = Math.max(10, parseInt(restMatch[1], 10));
    }

    return { sets, reps, workDuration, restDuration };
  }

  // Advance routine session (auto from countdown or manual via Next button)
  const advanceSession = () => {
    if (!workoutSession || workoutSession.isFinished) {
      // Standalone timer loop
      playAlertSound();
      if (timerMode === 'work') {
        setTimerMode('rest');
        setTimeLeft(restSeconds);
      } else {
        setTimerMode('work');
        setTimeLeft(workSeconds);
      }
      return;
    }

    const { exercises, exerciseIndex, currentSet, totalSets } = workoutSession;

    if (timerMode === 'work') {
      playAlertSound();
      if (currentSet < totalSets) {
        // Completed work set, transition to rest before next set
        setTimerMode('rest');
        setTimeLeft(restSeconds);
      } else {
        // Completed all sets for current exercise!
        // Mark exercise as completed in user progress
        if (currentPlan && workoutSession.dayIndex !== undefined) {
          const exKey = `${currentPlan.id}_d${workoutSession.dayIndex}_e${exerciseIndex}`;
          setCompletedExercises((prev) => ({ ...prev, [exKey]: true }));
        }

        if (exerciseIndex + 1 < exercises.length) {
          // More exercises remaining in this day's routine -> transition to rest
          setTimerMode('rest');
          setTimeLeft(restSeconds);
        } else {
          // Entire day's routine finished!
          setIsTimerRunning(false);
          setWorkoutSession((prev) => (prev ? { ...prev, isFinished: true } : null));
          if (currentPlan && workoutSession.dayIndex !== undefined) {
            const dayKey = `${currentPlan.id}_d${workoutSession.dayIndex}`;
            setCompletedDays((prev) => ({ ...prev, [dayKey]: true }));
          }
          setSuccessMessage(`Outstanding! You finished the entire ${workoutSession.dayTitle} workout! 🎉`);
          setStreakCount((prev) => {
            const next = prev + 1;
            try { localStorage.setItem('fitbuddy_streak', next.toString()); } catch {}
            return next;
          });
        }
      }
    } else {
      // Rest period finished -> transition to work
      playAlertSound();
      if (currentSet < totalSets) {
        // Next set of same exercise
        setWorkoutSession((prev) => (prev ? { ...prev, currentSet: prev.currentSet + 1 } : null));
        setTimerMode('work');
        setTimeLeft(workSeconds);
      } else if (exerciseIndex + 1 < exercises.length) {
        // Next exercise
        const nextIdx = exerciseIndex + 1;
        const nextEx = exercises[nextIdx];
        const nextMetrics = parseExerciseMetrics(nextEx);

        setWorkoutSession((prev) => (prev ? {
          ...prev,
          exerciseIndex: nextIdx,
          currentSet: 1,
          totalSets: nextMetrics.sets,
          targetReps: nextMetrics.reps,
        } : null));

        setTimerTitle(nextEx.name);
        setWorkSeconds(nextMetrics.workDuration);
        setRestSeconds(nextMetrics.restDuration);
        setTimerMode('work');
        setTimeLeft(nextMetrics.workDuration);
      }
    }
  };

  const advanceSessionRef = useRef(advanceSession);
  advanceSessionRef.current = advanceSession;

  // Timer countdown hook with work/rest intervals & session progression
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            advanceSessionRef.current();
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

  // Launch full workout session for an entire day (Requirement #2)
  const launchDayWorkout = (day: DayPlan, dayIdx: number) => {
    if (!day.exercises || day.exercises.length === 0) return;
    const firstEx = day.exercises[0];
    const metrics = parseExerciseMetrics(firstEx);

    setWorkoutSession({
      dayTitle: `${day.day}: ${day.workout_name}`,
      dayIndex: dayIdx,
      exercises: day.exercises,
      exerciseIndex: 0,
      currentSet: 1,
      totalSets: metrics.sets,
      targetReps: metrics.reps,
      isFinished: false,
    });

    setTimerTitle(firstEx.name);
    setWorkSeconds(metrics.workDuration);
    setRestSeconds(metrics.restDuration);
    setTimerMode('work');
    setTimeLeft(metrics.workDuration);
    setIsTimerRunning(false);
    setIsTimerOpen(true);
  };

  // Launch timer for an individual exercise (Requirement #2)
  const launchExerciseTimer = (exercise: Exercise, day?: DayPlan, dayIdx?: number, exIdx?: number) => {
    const metrics = parseExerciseMetrics(exercise);
    const exercisesList = day && day.exercises ? day.exercises : [exercise];
    const startIdx = exIdx !== undefined ? exIdx : Math.max(0, exercisesList.findIndex((e) => e.name === exercise.name));

    setWorkoutSession({
      dayTitle: day ? `${day.day}: ${day.workout_name}` : `Exercise: ${exercise.name}`,
      dayIndex: dayIdx,
      exercises: exercisesList,
      exerciseIndex: startIdx,
      currentSet: 1,
      totalSets: metrics.sets,
      targetReps: metrics.reps,
      isFinished: false,
    });

    setTimerTitle(exercise.name);
    setWorkSeconds(metrics.workDuration);
    setRestSeconds(metrics.restDuration);
    setTimerMode('work');
    setTimeLeft(metrics.workDuration);
    setIsTimerRunning(false);
    setIsTimerOpen(true);
  };

  // Skip current exercise in session
  const skipExercise = () => {
    if (!workoutSession || workoutSession.isFinished) return;
    const { exercises, exerciseIndex } = workoutSession;

    if (exerciseIndex + 1 < exercises.length) {
      const nextIdx = exerciseIndex + 1;
      const nextEx = exercises[nextIdx];
      const nextMetrics = parseExerciseMetrics(nextEx);

      setWorkoutSession((prev) => (prev ? {
        ...prev,
        exerciseIndex: nextIdx,
        currentSet: 1,
        totalSets: nextMetrics.sets,
        targetReps: nextMetrics.reps,
      } : null));

      setTimerTitle(nextEx.name);
      setWorkSeconds(nextMetrics.workDuration);
      setRestSeconds(nextMetrics.restDuration);
      setTimerMode('work');
      setTimeLeft(nextMetrics.workDuration);
    } else {
      finishWorkout();
    }
  };

  // Restart current set
  const restartSet = () => {
    setIsTimerRunning(false);
    setTimeLeft(timerMode === 'work' ? workSeconds : restSeconds);
  };

  // Finish workout early
  const finishWorkout = () => {
    setIsTimerRunning(false);
    if (workoutSession) {
      setWorkoutSession((prev) => (prev ? { ...prev, isFinished: true } : null));
      if (currentPlan && workoutSession.dayIndex !== undefined) {
        const dayKey = `${currentPlan.id}_d${workoutSession.dayIndex}`;
        setCompletedDays((prev) => ({ ...prev, [dayKey]: true }));
      }
      setSuccessMessage(`Workout finished for ${workoutSession.dayTitle}! 🏆`);
    } else {
      closeTimer();
    }
  };

  const openTimer = (title: string, defaultWork = 45, defaultRest = 15) => {
    setWorkoutSession(null);
    setTimerTitle(title);
    setWorkSeconds(defaultWork);
    setRestSeconds(defaultRest);
    setTimerMode('work');
    setTimeLeft(defaultWork);
    setIsTimerRunning(false);
    setIsTimerOpen(true);
  };

  const closeTimer = () => {
    clearInterval(timerRef.current);
    setIsTimerRunning(false);
    setIsTimerOpen(false);
    setWorkoutSession(null);
  };

  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const resetTimer = () => {
    clearInterval(timerRef.current);
    setIsTimerRunning(false);
    setTimerMode('work');
    setTimeLeft(workSeconds);
  };

  // Download 7-Day Plan as PDF using jsPDF (Requirement #1)
  const handleDownloadPdf = async () => {
    if (!currentPlan) return;
    setIsGeneratingPdf(true);
    setPdfError(null);
    setPdfSuccess(false);

    try {
      await generateFitBuddyPdf({
        planRecord: currentPlan,
        nutritionTargets,
        weightLogs,
      });
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 3500);
    } catch (err: any) {
      console.error('[FitBuddy PDF Download Error]:', err);
      setPdfError('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Nutrition & Macro Calculations (Requirement #3)
  // Mifflin-St Jeor formula + Goal adjustments
  const nutritionTargets = useMemo(() => {
    const w = parseFloat(weight) || currentPlan?.weight || 70;
    const h = parseFloat(height) || currentPlan?.height || 175;
    const a = parseInt(age, 10) || currentPlan?.age || 25;
    const g = gender || currentPlan?.gender || 'Male';
    const planGoal = goal || currentPlan?.goal || 'General Wellness';
    const planIntensity = intensity || currentPlan?.intensity || 'Medium';

    // BMR calculation
    let bmr = (10 * w) + (6.25 * h) - (5 * a);
    if (g === 'Male') bmr += 5;
    else if (g === 'Female') bmr -= 161;
    else bmr -= 78;

    // Activity multiplier based on intensity
    let activityMult = 1.375; // Low
    if (planIntensity === 'Medium') activityMult = 1.55;
    if (planIntensity === 'High') activityMult = 1.725;

    let tdee = Math.round(bmr * activityMult);

    // Goal calorie adjustment
    let calories = tdee;
    if (planGoal === 'Weight Loss') calories = Math.max(1200, Math.round(tdee - 450));
    else if (planGoal === 'Muscle Gain') calories = Math.round(tdee + 350);

    // Protein target: 1.6-2.2g per kg for muscle gain/weight loss, 1.2-1.6g for general wellness
    let proteinPerKg = 1.4;
    if (planGoal === 'Muscle Gain') proteinPerKg = 2.0;
    else if (planGoal === 'Weight Loss') proteinPerKg = 1.8;

    const proteinGrams = Math.round(w * proteinPerKg);

    // Water target in liters
    const waterLiters = (w * 0.035 + (planIntensity === 'High' ? 0.6 : 0.3)).toFixed(1);

    return {
      bmr: Math.round(bmr),
      calories,
      proteinGrams,
      waterLiters
    };
  }, [weight, height, age, gender, goal, intensity, currentPlan]);

  // Loading animation step messages
  useEffect(() => {
    if (!isGenerating && !isUpdating) return;
    const steps = [
      'Connecting to Google Gemini API...',
      'Analyzing body metrics (BMI, BMR, TDEE)...',
      'Structuring personalized 7-day routine...',
      'Selecting warmups, 4-6 exercises, sets, reps & rest intervals...',
      'Formulating nutrition targets & diet-specific meal plans...',
      'Optimizing recovery & active rest days...'
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
      errs.name = 'Please enter your full or preferred name.';
    }

    const numAge = parseInt(age, 10);
    if (!age || isNaN(numAge) || numAge < 10 || numAge > 100) {
      errs.age = 'Age must be between 10 and 100 years.';
    }

    const numWeight = parseFloat(weight);
    if (!weight || isNaN(numWeight) || numWeight < 25 || numWeight > 300) {
      errs.weight = 'Weight must be between 25 and 300 kg.';
    }

    const numHeight = parseFloat(height);
    if (!height || isNaN(numHeight) || numHeight < 90 || numHeight > 250) {
      errs.height = 'Height must be between 90 and 250 cm.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Safe Error Formatter to prevent any raw JSON / 503 errors from ever reaching the UI (Requirement #3 & #6)
  const formatSafeError = (msg: string | null | undefined): string => {
    if (!msg) return "Couldn't generate your plan. Please try again.";
    if (
      msg.includes('{') ||
      msg.includes('}') ||
      msg.includes('503') ||
      msg.includes('429') ||
      msg.includes('UNAVAILABLE') ||
      msg.includes('JSON') ||
      msg.includes('code:') ||
      msg.includes('"error"') ||
      msg.includes('HTTP ')
    ) {
      return "Couldn't generate your plan. Please try again.";
    }
    return msg;
  };

  // Full Pre-Written Offline Fallback Generator (Requirement #5)
  const getClientOfflineFallbackPlan = (params: {
    name: string;
    goal: string;
    intensity: string;
    diet: string;
    equipment: string;
    weight: number;
  }): FitnessPlanData => {
    const { name: userName, goal: userGoal, intensity: userIntensity, diet: userDiet, equipment: userEquip, weight: userWeight } = params;
    const isWeightLoss = userGoal === 'Weight Loss';
    const isMuscleGain = userGoal === 'Muscle Gain';

    const days: DayPlan[] = [
      {
        day: "Monday",
        workout_name: isMuscleGain ? "Upper Body Strength & Hypertrophy" : isWeightLoss ? "Full Body Fat-Burn & Cardio" : "Full Body Conditioning",
        focus: isMuscleGain ? "Chest, Back & Shoulders" : "Metabolic Conditioning & Core",
        duration: userIntensity === 'High' ? "50 mins" : userIntensity === 'Medium' ? "40 mins" : "30 mins",
        is_rest_day: false,
        intensity: userIntensity,
        warmup: "5-8 mins: Arm circles, shoulder dislocates, light jogging in place, torso twists",
        cooldown: "5 mins: Standing chest stretch, overhead tricep stretch, child's pose",
        exercises: [
          {
            name: userEquip === 'No equipment' ? "Push-Ups" : "Dumbbell Floor Press",
            sets_reps: userIntensity === 'High' ? "4 sets x 12-15 reps" : "3 sets x 10-12 reps",
            rest_time: "60s rest",
            target: "Chest & Triceps",
            tip: "Keep core braced and elbows tucked at roughly 45 degrees."
          },
          {
            name: userEquip === 'No equipment' ? "Inverted Rows or Doorframe Rows" : "Dumbbell Bent-Over Rows",
            sets_reps: "3 sets x 12 reps",
            rest_time: "60s rest",
            target: "Upper Back & Lats",
            tip: "Squeeze shoulder blades together at the top of each contraction."
          },
          {
            name: userEquip === 'No equipment' ? "Pike Push-Ups" : "Dumbbell Overhead Shoulder Press",
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
        intensity: userIntensity,
        warmup: "5 mins: Leg swings, hip openers, bodyweight glute bridges",
        cooldown: "5 mins: Standing quad stretch, seated hamstring reach",
        exercises: [
          {
            name: userEquip === 'No equipment' ? "Walking Lunges" : "Dumbbell Goblet Squats",
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
        workout_name: "Active Recovery & Mobility",
        focus: "Joint Mobility, Core Stability & Flexibility",
        duration: "25 mins",
        is_rest_day: true,
        intensity: "Low",
        warmup: "3 mins: Neck and wrist rolls, cat-cow stretches",
        cooldown: "5 mins: Deep diaphragmatic breathing and corpse pose",
        exercises: [
          {
            name: "World's Greatest Stretch",
            sets_reps: "3 sets x 5 reps per side",
            rest_time: "30s rest",
            target: "Hips, Thoracic Spine & Hamstrings",
            tip: "Rotate your torso towards your front knee with calm breaths."
          },
          {
            name: "Cat-Cow & Child's Pose Flow",
            sets_reps: "8-10 cycles with breath",
            rest_time: "As needed",
            target: "Spinal Mobility",
            tip: "Inhale to arch smoothly, exhale to round through your back."
          },
          {
            name: "Gentle 20-Minute Brisk Walk",
            sets_reps: "1 continuous walk",
            rest_time: "N/A",
            target: "Cardiovascular Health",
            tip: "Keep a relaxed, conversational pace outdoors or on treadmill."
          }
        ]
      },
      {
        day: "Thursday",
        workout_name: isMuscleGain ? "Push Hypertrophy & Chest Sculpt" : "Cardio Core & Upper Body Tone",
        focus: "Chest, Shoulders & Triceps",
        duration: "40 mins",
        is_rest_day: false,
        intensity: userIntensity,
        warmup: "5 mins: Jumping jacks, wrist rotations, shoulder taps",
        cooldown: "5 mins: Cobra pose, child's pose",
        exercises: [
          {
            name: userEquip === 'No equipment' ? "Incline Push-Ups" : "Dumbbell Incline Bench/Floor Press",
            sets_reps: "3 sets x 12 reps",
            rest_time: "60s rest",
            target: "Upper Chest",
            tip: "Control the eccentric descent over 2 seconds."
          },
          {
            name: userEquip === 'No equipment' ? "Lateral Arm Raises (Bodyweight)" : "Dumbbell Lateral Raises",
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
        intensity: userIntensity,
        warmup: "5 mins: Torso twists, high knees, band pull-aparts",
        cooldown: "5 mins: Doorway lat stretch, cross-body shoulder stretch",
        exercises: [
          {
            name: userEquip === 'No equipment' ? "Superman Holds" : "Dumbbell Single-Arm Rows",
            sets_reps: "3 sets x 12 reps per side",
            rest_time: "60s rest",
            target: "Lats & Rhomboids",
            tip: "Pull your elbow toward your hip rather than straight up."
          },
          {
            name: userEquip === 'No equipment' ? "Doorframe Bicep Curls" : "Dumbbell Bicep Curls",
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
        intensity: userIntensity,
        warmup: "5 mins: Arm swings, bodyweight squats, ankle mobility",
        cooldown: "5 mins: Full body standing stretch, deep breathing",
        exercises: [
          {
            name: "Bodyweight Squat Jumps (or Speed Squats)",
            sets_reps: "3 sets x 12 reps",
            rest_time: "60s rest",
            target: "Power & Fast-Twitch Muscle",
            tip: "Land softly with knees bent to absorb impact."
          },
          {
            name: userEquip === 'No equipment' ? "Push-Up Hold" : "Dumbbell Thrusters",
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
      summary: `Welcome ${userName}! Here is a structured, balanced 7-day ${userIntensity.toLowerCase()} intensity routine built for ${userGoal.toLowerCase()} using ${userEquip.toLowerCase()}.`,
      days,
      sample_meal_plan: mealPlans[userDiet] || mealPlans.Vegetarian,
      nutrition_tip: isMuscleGain
        ? "Target 1.8-2.0g of quality protein per kg of bodyweight, distributed evenly across 3-4 meals."
        : isWeightLoss
        ? "Focus on nutrient-dense, high-fiber whole foods that provide satiety within a moderate 300-500 kcal deficit."
        : "Aim for balanced macronutrients with plenty of colorful seasonal vegetables and healthy fats.",
      recovery_tip: "Target 7.5 to 8.5 hours of uninterrupted sleep each night to allow muscle tissue and the nervous system to fully regenerate.",
      hydration_tip: `Aim for roughly ${(userWeight * 0.035).toFixed(1)} to ${(userWeight * 0.035 + 0.5).toFixed(1)} liters of clean water daily, sipping regularly before, during, and after workouts.`,
      safety_guidance: "Always prioritize strict form over weight or speed. If any exercise causes sharp or unnatural joint pain, stop immediately."
    };
  };

  // Apply pre-written offline fallback plan (Requirement #5)
  const applyOfflineFallback = (fallbackData?: any) => {
    const planData: FitnessPlanData = (fallbackData && fallbackData.days && fallbackData.days.length > 0)
      ? fallbackData
      : getClientOfflineFallbackPlan({
          name: name.trim() || 'Athlete',
          goal,
          intensity,
          diet,
          equipment,
          weight: parseFloat(weight) || 70
        });

    const newRecord: StoredPlanRecord = {
      id: Date.now(),
      name: name.trim() || 'Athlete',
      age: parseInt(age, 10) || 25,
      weight: parseFloat(weight) || 70,
      height: parseFloat(height) || 175,
      gender,
      goal,
      intensity,
      equipment,
      diet,
      limitations: limitations.trim(),
      plan: planData,
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' (Offline Plan)',
    };

    const updatedList = [newRecord, ...savedPlans];
    persistPlans(updatedList, newRecord);
    setCurrentPlan(newRecord);
    setFallbackPlanOffer(null);
    setErrorMessage(null);
    setSuccessMessage(`Loaded ready-to-use 7-day routine for ${name.trim() || 'you'}!`);

    // Initialize user's daily water count to 0 for every newly generated plan (Requirement #1)
    setWaterGlasses(0);
    try {
      localStorage.setItem('fitbuddy_water_glasses', '0');
    } catch {}

    // Initialize user's streak to 0 for every newly generated plan (Requirement #5 & #9)
    setStreakCount(0);
    try {
      localStorage.setItem('fitbuddy_streak', '0');
    } catch {}

    // Initialize weight logs to clean empty state for new user (Requirement #3, #5 & #9)
    setWeightLogs([]);
    try {
      localStorage.setItem('fitbuddy_weight_logs', '[]');
    } catch {}

    setCompletedDays({});
    try {
      localStorage.setItem('fitbuddy_completed_days', '{}');
    } catch {}

    setCompletedExercises({});
    try {
      localStorage.setItem('fitbuddy_completed_exercises', '{}');
    } catch {}

    setTimeout(() => {
      const resultEl = document.getElementById('result');
      if (resultEl) {
        resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  };

  // Generate Plan via Gemini API with retry, backoff, friendly error handling, and offline fallback
  const handleGeneratePlan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setFallbackPlanOffer(null);

    if (!validateForm()) {
      return;
    }

    setIsGenerating(true);
    setLoadingStep('Connecting to Google Gemini API...');

    const clientBackoffs = [2000, 4000, 8000]; // 2s, 4s, 8s exponential backoff (Requirement #1)
    let attempts = 0;
    const maxAttempts = 3;
    let success = false;
    let fallbackPayload: any = null;

    while (attempts < maxAttempts && !success) {
      attempts++;
      try {
        if (attempts > 1) {
          // Requirement #3: Show friendly message such as "FitBuddy is busy right now. Retrying..." while retrying
          setLoadingStep('FitBuddy is busy right now. Retrying...');
        }

        const response = await fetch('/api/generate-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            age: parseInt(age, 10),
            weight: parseFloat(weight),
            height: parseFloat(height),
            gender,
            goal,
            intensity,
            equipment,
            diet,
            limitations: limitations.trim()
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          if (errData?.fallbackPlan) {
            fallbackPayload = errData.fallbackPlan;
          }
          // Log detailed error to console for debugging (Requirement #6)
          console.error(`[FitBuddy API Debug] Attempt ${attempts} error (Status: ${response.status}):`, errData);

          // If status is 503 or 429, retry with exponential backoff: 2s, 4s, 8s (Requirement #1)
          if ((response.status === 503 || response.status === 429) && attempts < maxAttempts) {
            const delay = clientBackoffs[attempts - 1] || 2000;
            console.log(`[FitBuddy Client Debug] Retrying in ${delay / 1000}s...`);
            setLoadingStep('FitBuddy is busy right now. Retrying...');
            await new Promise((r) => setTimeout(r, delay));
            continue; // Next attempt with backoff
          }

          throw new Error(errData?.error || `HTTP ${response.status}`);
        }

        const planData: FitnessPlanData = await response.json();

        const newRecord: StoredPlanRecord = {
          id: Date.now(),
          name: name.trim(),
          age: parseInt(age, 10),
          weight: parseFloat(weight),
          height: parseFloat(height),
          gender,
          goal,
          intensity,
          equipment,
          diet,
          limitations: limitations.trim(),
          plan: planData,
          created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
        };

        const updatedList = [newRecord, ...savedPlans];
        persistPlans(updatedList, newRecord);
        setCurrentPlan(newRecord);
        setSuccessMessage(`Custom 7-day fitness & nutrition plan created for ${name.trim()}!`);
        success = true;

        // Initialize user's daily water count to 0 for a newly generated plan (Requirement #1)
        setWaterGlasses(0);
        try {
          localStorage.setItem('fitbuddy_water_glasses', '0');
        } catch {}

        // Initialize user's streak to 0 for every newly generated plan (Requirement #5 & #9)
        setStreakCount(0);
        try {
          localStorage.setItem('fitbuddy_streak', '0');
        } catch {}

        // Initialize weight logs to clean empty state for new user (Requirement #3, #5 & #9)
        setWeightLogs([]);
        try {
          localStorage.setItem('fitbuddy_weight_logs', '[]');
        } catch {}

        setCompletedDays({});
        try {
          localStorage.setItem('fitbuddy_completed_days', '{}');
        } catch {}

        setCompletedExercises({});
        try {
          localStorage.setItem('fitbuddy_completed_exercises', '{}');
        } catch {}

        setTimeout(() => {
          const resultEl = document.getElementById('result');
          if (resultEl) {
            resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 150);
      } catch (err: any) {
        console.error(`[FitBuddy Client Debug] Exception during attempt ${attempts}:`, err);

        if (attempts < maxAttempts) {
          const delay = clientBackoffs[attempts - 1] || 2000;
          setLoadingStep('FitBuddy is busy right now. Retrying...');
          await new Promise((r) => setTimeout(r, delay));
        } else {
          // If all attempts fail, show friendly message: "Couldn't generate your plan. Please try again." (Requirement #3)
          setErrorMessage("Couldn't generate your plan. Please try again.");

          // If server didn't provide fallbackPayload, use client pre-written fallback generator (Requirement #5)
          if (!fallbackPayload) {
            fallbackPayload = getClientOfflineFallbackPlan({
              name: name.trim() || 'Athlete',
              goal,
              intensity,
              diet,
              equipment,
              weight: parseFloat(weight) || 70
            });
          }
          if (fallbackPayload) {
            setFallbackPlanOffer(fallbackPayload);
          }
        }
      }
    }

    setIsGenerating(false);
  };

  // Update Plan with Feedback (Refinement)
  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPlan) return;
    if (!feedbackInput.trim()) {
      setErrorMessage('Please type what you would like to change or adjust.');
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
          height: currentPlan.height || 175,
          gender: currentPlan.gender || 'Male',
          goal: currentPlan.goal,
          intensity: currentPlan.intensity,
          equipment: currentPlan.equipment || 'Dumbbells',
          diet: currentPlan.diet || 'Vegetarian',
          limitations: currentPlan.limitations || ''
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
      setSuccessMessage('Routine updated successfully based on your feedback!');

      const resultEl = document.getElementById('result');
      if (resultEl) {
        resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (err: any) {
      console.error('[FitBuddy Client Debug] Error updating plan with Gemini:', err);
      setErrorMessage(
        err?.message?.includes('503') || err?.message?.includes('busy')
          ? "FitBuddy is busy right now. Please try updating again in a few moments."
          : "Couldn't update your plan right now. Please try again."
      );
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
      await fetch(`/api/plans/${targetId}`, { method: 'DELETE' }).catch(() => {});
      const updatedList = savedPlans.filter((p) => p.id !== targetId);
      persistPlans(updatedList);
      if (currentPlan && currentPlan.id === targetId) {
        setCurrentPlan(updatedList.length > 0 ? updatedList[0] : null);
      }
      setSuccessMessage(`Plan for ${targetName} was deleted.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setErrorMessage('Could not delete plan.');
    } finally {
      setIsDeleting(false);
      setPlanToDelete(null);
    }
  };

  // Checkbox toggles for Exercise and Day
  const toggleExerciseCheck = (planId: number, dayIdx: number, exIdx: number) => {
    const key = `${planId}_d${dayIdx}_e${exIdx}`;
    setCompletedExercises((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleDayCheck = (planId: number, dayIdx: number) => {
    const key = `${planId}_d${dayIdx}`;
    setCompletedDays((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Weekly Completion %
  const weeklyCompletionPercentage = useMemo(() => {
    if (!currentPlan?.plan?.days || currentPlan.plan.days.length === 0) return 0;
    const totalDays = currentPlan.plan.days.length;
    let completedCount = 0;
    for (let i = 0; i < totalDays; i++) {
      if (completedDays[`${currentPlan.id}_d${i}`]) {
        completedCount++;
      }
    }
    return Math.round((completedCount / totalDays) * 100);
  }, [currentPlan, completedDays]);

  // Real weight logging with actual dates and validation (Requirement #4)
  const handleSaveWeightLogModal = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newWeightInput.trim();
    const val = parseFloat(trimmed);

    if (!trimmed || isNaN(val) || val <= 0) {
      setWeightInputError('Please enter a valid positive weight in kg (e.g. 72).');
      return;
    }
    if (val < 10 || val > 450) {
      setWeightInputError('Please enter a realistic weight in kg (e.g. 72 or 71.5).');
      return;
    }
    setWeightInputError(null);

    const now = new Date();
    const todayFormatted = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    let label = newWeightDateInput.trim();
    if (!label) {
      label = weightLogs.length === 0 ? 'Today' : todayFormatted;
    }

    const newEntry: WeightLogEntry = {
      id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 6),
      date: label,
      weight: Math.round(val * 10) / 10
    };

    const nextLogs = [...weightLogs, newEntry];
    setWeightLogs(nextLogs);
    try {
      localStorage.setItem('fitbuddy_weight_logs', JSON.stringify(nextLogs));
    } catch (err) {
      console.warn('Could not save weight log to localStorage', err);
    }

    setNewWeightInput('');
    setNewWeightDateInput('Today');
    setIsLogWeightModalOpen(false);
  };

  const handleDeleteWeightLog = (id: string) => {
    setWeightLogs((prev) => {
      const next = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem('fitbuddy_weight_logs', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Weight line chart calculations
  const weightMin = useMemo(() => {
    if (weightLogs.length === 0) return 60;
    return Math.min(...weightLogs.map((l) => l.weight)) - 1;
  }, [weightLogs]);

  const weightMax = useMemo(() => {
    if (weightLogs.length === 0) return 80;
    return Math.max(...weightLogs.map((l) => l.weight)) + 1;
  }, [weightLogs]);

  // Water increment / reset (Requirement #1: Starts at 0/7, max 7/7, increase by 1, reset to 0/7)
  const handleDrinkWater = (amount = 1) => {
    setWaterGlasses((prev) => {
      const next = Math.min(7, Math.max(0, prev + amount));
      try {
        localStorage.setItem('fitbuddy_water_glasses', next.toString());
      } catch {}
      return next;
    });
  };

  const handleResetWater = () => {
    setWaterGlasses(0);
    try {
      localStorage.setItem('fitbuddy_water_glasses', '0');
    } catch {}
  };

  // Rotate motivational quote
  const nextQuote = () => {
    setQuoteIdx((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
  };

  // SVG Progress Ring calculations for timer
  const currentTotal = timerMode === 'work' ? workSeconds : restSeconds;
  const timerRadius = 68;
  const timerCircumference = 2 * Math.PI * timerRadius;
  const strokeDashoffset = timerCircumference - (timeLeft / Math.max(1, currentTotal)) * timerCircumference;

  // Active Exercise Information for Workout Timer Modal (Requirements #2, #4, #5)
  const currentExercise = workoutSession
    ? workoutSession.exercises[workoutSession.exerciseIndex]
    : { name: timerTitle, sets_reps: `${workSeconds}s work`, rest_time: `${restSeconds}s rest` };

  const currentExerciseName = currentExercise?.name || timerTitle || 'Exercise';
  const nextExercise = workoutSession && workoutSession.exerciseIndex + 1 < workoutSession.exercises.length
    ? workoutSession.exercises[workoutSession.exerciseIndex + 1]
    : null;

  const matchedEntry = useMemo(() => matchExerciseInDb(currentExerciseName), [currentExerciseName, dbVersion]);
  const frame0Url = matchedEntry?.images?.[0] ? getExerciseImageUrl(matchedEntry.images[0]) : null;
  const frame1Url = matchedEntry?.images?.[1] ? getExerciseImageUrl(matchedEntry.images[1]) : frame0Url;
  const currentImageUrl = animImageIndex === 0 ? frame0Url : (frame1Url || frame0Url);
  const hasImageError = !!failedImages[currentExerciseName];
  const fallbackInfo = useMemo(() => getExerciseFallbackVisual(currentExerciseName), [currentExerciseName]);
  const youtubeUrl = useMemo(() => getYouTubeTutorialUrl(currentExerciseName), [currentExerciseName]);

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${
      darkMode ? 'bg-[#0d120d] text-[#edf2ea]' : 'bg-[#f7f9f5] text-[#182018]'
    }`}>
      {/* =========================================================================
          1. NAVBAR
         ========================================================================= */}
      <nav className={`h-[76px] flex items-center justify-between px-[7%] backdrop-blur-[15px] fixed top-0 w-full z-40 border-b no-print transition-colors ${
        darkMode ? 'bg-[#121912]/90 border-gray-800' : 'bg-white/90 border-[#e7ece5]'
      }`}>
        {/* Logo */}
        <a
          href="#home"
          className="flex items-center gap-2.5 text-[23px] font-extrabold tracking-tight group no-underline"
        >
          <div className="w-[42px] h-[42px] bg-[#d9f65b] rounded-[13px] flex items-center justify-center text-[23px] -rotate-6 transition-transform group-hover:rotate-0 shadow-xs">
            💪
          </div>
          <span className={darkMode ? 'text-white' : 'text-[#182018]'}>FitBuddy</span>
        </a>

        {/* Links */}
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="hidden md:flex items-center gap-6">
            <a
              href="#home"
              className={`font-semibold text-sm transition ${
                darkMode ? 'text-gray-300 hover:text-[#d9f65b]' : 'text-[#374137] hover:text-[#73a900]'
              }`}
            >
              Home
            </a>
            <a
              href="#features"
              className={`font-semibold text-sm transition ${
                darkMode ? 'text-gray-300 hover:text-[#d9f65b]' : 'text-[#374137] hover:text-[#73a900]'
              }`}
            >
              Features
            </a>
            <a
              href="#planner"
              className={`font-semibold text-sm transition ${
                darkMode ? 'text-gray-300 hover:text-[#d9f65b]' : 'text-[#374137] hover:text-[#73a900]'
              }`}
            >
              Planner
            </a>
            <a
              href="#how"
              className={`font-semibold text-sm transition ${
                darkMode ? 'text-gray-300 hover:text-[#d9f65b]' : 'text-[#374137] hover:text-[#73a900]'
              }`}
            >
              How It Works
            </a>
          </div>

          {/* Dark/Light Mode Toggle (Requirement #7) */}
          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2.5 rounded-full transition cursor-pointer border ${
              darkMode
                ? 'bg-gray-800 border-gray-700 text-[#d9f65b] hover:bg-gray-700'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100 shadow-xs'
            }`}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <a
            href="#planner"
            className="bg-[#182018] hover:bg-black text-[#d9f65b] text-sm font-bold px-5 py-2.5 rounded-full transition shadow-xs no-underline"
          >
            Get Started
          </a>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Banner Notifications */}
        {successMessage && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-lg w-full px-4 no-print animate-slide-left">
            <div className={`border-2 border-[#d9f65b] rounded-2xl p-4 shadow-xl flex items-center gap-3 text-sm font-semibold ${
              darkMode ? 'bg-[#182018] text-white' : 'bg-white text-[#182018]'
            }`}>
              <CheckCircle2 className="w-5 h-5 text-[#73a900] shrink-0" />
              <span className="flex-1">{successMessage}</span>
              <button
                type="button"
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
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 shadow-xl flex items-start gap-3 text-sm font-semibold text-red-900">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-red-950 mb-1">{formatSafeError(errorMessage)}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      handleGeneratePlan();
                    }}
                    disabled={isGenerating}
                    className="bg-red-700 hover:bg-red-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                    <span>{isGenerating ? 'Retrying...' : 'Retry'}</span>
                  </button>

                  {fallbackPlanOffer && (
                    <button
                      type="button"
                      onClick={() => applyOfflineFallback(fallbackPlanOffer)}
                      className="bg-[#182018] hover:bg-black text-[#d9f65b] text-xs font-bold px-3.5 py-1.5 rounded-lg transition cursor-pointer"
                    >
                      Use Pre-written Plan
                    </button>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-red-700 hover:text-red-900 font-bold text-base cursor-pointer p-1"
                aria-label="Close error"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* ================= HERO SECTION ================= */}
        <section
          className={`hero-gradient min-h-[92vh] pt-32 pb-20 px-[7%] grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] items-center gap-12 ${
            darkMode ? 'dark:bg-none' : ''
          }`}
          id="home"
        >
              {/* Left Content */}
              <div className="animate-slide-left">
                <div className="inline-block px-4 py-2 bg-white dark:bg-gray-800 border border-[#e1e8dc] dark:border-gray-700 rounded-full text-xs font-extrabold mb-6 shadow-xs tracking-wider text-[#182018] dark:text-[#d9f65b]">
                  🤖 AI-POWERED FITNESS & NUTRITION COACH
                </div>

                <h1 className="text-5xl sm:text-6xl lg:text-[76px] font-black leading-[0.98] tracking-[-3px] mb-6 font-['Cabinet_Grotesk']">
                  Your Fitness.<br />
                  Your <span className="text-[#78a800] dark:text-[#d9f65b]">Plan.</span>
                </h1>

                <p className="text-base sm:text-lg text-[#1A1A1A] max-w-[540px] leading-relaxed mb-6 font-medium">
                  Build an adaptive 7-day routine with warm-ups, structured workouts, tailored rest days, macro guidance, and a smart interval timer.
                </p>

                {/* Motivational Quote Banner (Soft Warm Cream #FFF4D6) */}
                <div
                  onClick={nextQuote}
                  className="bg-[#FFF4D6] border border-[#f2e1b6] rounded-2xl p-4 sm:p-5 mb-8 max-w-[540px] cursor-pointer hover:border-[#7da800] transition shadow-xs group select-none"
                  title="Click for next motivational quote"
                >
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider mb-1.5">
                    <span className="flex items-center gap-1.5 text-[#537700]">✨ DAILY FUEL</span>
                    <span className="text-[#2b332b] text-[11px] font-semibold group-hover:text-[#537700] transition flex items-center gap-1">
                      <span>CLICK TO SHUFFLE</span>
                      <span className="text-xs">↻</span>
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm italic font-bold text-[#1A1A1A] leading-snug">
                    "{MOTIVATIONAL_QUOTES[quoteIdx].text}"
                  </p>
                  <span className="text-[11px] font-medium text-[#4a554a] mt-1 block">
                    — {MOTIVATIONAL_QUOTES[quoteIdx].author}
                  </span>
                </div>

                <div className="flex items-center gap-3.5 flex-wrap">
                  <a
                    href="#planner"
                    className="bg-[#182018] dark:bg-[#d9f65b] hover:bg-black dark:hover:bg-white text-white dark:text-[#182018] px-7 py-4 rounded-2xl text-base font-bold transition-all hover:-translate-y-1 hover:shadow-xl shadow-md no-underline inline-block cursor-pointer"
                  >
                    Create My Plan →
                  </a>

                  <a
                    href="#features"
                    className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-[#dce4d8] dark:border-gray-700 text-[#182018] dark:text-white px-7 py-4 rounded-2xl text-base font-bold transition-all hover:-translate-y-1 shadow-xs no-underline inline-block cursor-pointer"
                  >
                    Explore Features
                  </a>
                </div>
              </div>

              {/* Right Visual */}
              <div className="relative h-[440px] sm:h-[500px] flex items-center justify-center animate-float-hero">
                <div className="w-[300px] h-[300px] sm:w-[380px] sm:h-[380px] rounded-full bg-gradient-to-br from-[#d9f65b] to-[#b9dc39] flex items-center justify-center text-7xl sm:text-9xl shadow-[0_30px_80px_rgba(130,160,40,0.28)]">
                  🏋️
                </div>

                <div className="absolute top-10 sm:top-14 left-2 sm:left-6 bg-white dark:bg-gray-800 px-5 py-3.5 rounded-[17px] shadow-[0_15px_45px_rgba(0,0,0,0.1)] font-bold text-xs sm:text-sm text-[#182018] dark:text-white animate-float-card-1 border border-white/80 dark:border-gray-700">
                  🔥 Personalized Plan
                </div>

                <div className="absolute bottom-12 sm:bottom-16 right-0 sm:right-4 bg-white dark:bg-gray-800 px-5 py-3.5 rounded-[17px] shadow-[0_15px_45px_rgba(0,0,0,0.1)] font-bold text-xs sm:text-sm text-[#182018] dark:text-white animate-float-card-2 border border-white/80 dark:border-gray-700">
                  🥗 Nutrition & Macros
                </div>

                <button
                  type="button"
                  onClick={() => openTimer('Workout Interval', 45, 15)}
                  className="absolute top-1/2 right-[-10px] sm:right-[-15px] -translate-y-1/2 bg-white dark:bg-gray-800 px-5 py-3.5 rounded-[17px] shadow-[0_15px_45px_rgba(0,0,0,0.1)] font-bold text-xs sm:text-sm text-[#182018] dark:text-white animate-float-card-3 border border-white/80 dark:border-gray-700 hover:bg-[#d9f65b] dark:hover:bg-[#d9f65b] dark:hover:text-[#182018] transition cursor-pointer text-left"
                  title="Click to launch Workout Timer"
                >
                  ⏱️ Workout Timer
                </button>
              </div>
            </section>

            {/* ================= FEATURES SECTION ================= */}
            <section className={`py-24 px-[7%] border-t border-b transition-colors ${
              darkMode ? 'bg-[#121912] border-gray-800' : 'bg-white border-[#e7ebe4]'
            }`} id="features">
              <div className="text-center max-w-[700px] mx-auto mb-14">
                <small className="text-[#79a800] font-extrabold uppercase tracking-[2px] text-xs">
                  Why FitBuddy?
                </small>
                <h2 className="text-3xl sm:text-5xl font-black tracking-[-2px] mt-3 mb-4 font-['Cabinet_Grotesk']">
                  Everything you need to stay consistent.
                </h2>
                <p className="text-[#737b73] dark:text-gray-400 text-sm sm:text-base leading-relaxed">
                  A smart fitness companion with structured routines, nutrition targets, water tracking, and progress metrics.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
                {/* Feature 1 */}
                <div className={`p-8 border rounded-[24px] hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition duration-300 ${
                  darkMode ? 'bg-[#182018] border-gray-800' : 'bg-white border-[#e7ebe4]'
                }`}>
                  <div className="w-[60px] h-[60px] rounded-[18px] bg-[#eef8c9] text-[#182018] flex items-center justify-center text-3xl mb-5">
                    🤖
                  </div>
                  <h3 className="font-extrabold text-lg mb-2.5">AI Fitness Plans</h3>
                  <p className="text-xs sm:text-sm text-[#727972] dark:text-gray-400 leading-relaxed">
                    Custom 7-day routine tailored to your height, equipment, diet, and physical limitations.
                  </p>
                </div>

                {/* Feature 2 */}
                <div className={`p-8 border rounded-[24px] hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition duration-300 ${
                  darkMode ? 'bg-[#182018] border-gray-800' : 'bg-white border-[#e7ebe4]'
                }`}>
                  <div className="w-[60px] h-[60px] rounded-[18px] bg-[#eef8c9] text-[#182018] flex items-center justify-center text-3xl mb-5">
                    🥗
                  </div>
                  <h3 className="font-extrabold text-lg mb-2.5">Nutrition & Water</h3>
                  <p className="text-xs sm:text-sm text-[#727972] dark:text-gray-400 leading-relaxed">
                    Personalized calorie and protein goals, sample meal ideas, and interactive daily water tracker.
                  </p>
                </div>

                {/* Feature 3 */}
                <div className={`p-8 border rounded-[24px] hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition duration-300 ${
                  darkMode ? 'bg-[#182018] border-gray-800' : 'bg-white border-[#e7ebe4]'
                }`}>
                  <div className="w-[60px] h-[60px] rounded-[18px] bg-[#eef8c9] text-[#182018] flex items-center justify-center text-3xl mb-5">
                    ⏱️
                  </div>
                  <h3 className="font-extrabold text-lg mb-2.5">Interval Timer</h3>
                  <p className="text-xs sm:text-sm text-[#727972] dark:text-gray-400 leading-relaxed">
                    Work and rest interval timer with visual progress ring, audio alerts, and quick presets.
                  </p>
                </div>

                {/* Feature 4 */}
                <div className={`p-8 border rounded-[24px] hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition duration-300 ${
                  darkMode ? 'bg-[#182018] border-gray-800' : 'bg-white border-[#e7ebe4]'
                }`}>
                  <div className="w-[60px] h-[60px] rounded-[18px] bg-[#eef8c9] text-[#182018] flex items-center justify-center text-3xl mb-5">
                    📈
                  </div>
                  <h3 className="font-extrabold text-lg mb-2.5">Progress Tracking</h3>
                  <p className="text-xs sm:text-sm text-[#727972] dark:text-gray-400 leading-relaxed">
                    Check off exercises, monitor weekly completion rate, maintain your streak, and log your weight.
                  </p>
                </div>
              </div>
            </section>

            {/* ================= PLANNER SECTION (Upgraded Form - Requirement #1) ================= */}
            <section className="py-24 px-[7%] bg-[#182018] text-white" id="planner">
              <div className="max-w-[1000px] mx-auto">
                <div className="text-center mb-11">
                  <h2 className="text-3xl sm:text-5xl font-black mb-3 font-['Cabinet_Grotesk']">
                    Create Your Fitness Plan
                  </h2>
                  <p className="text-[#b9c1b7] text-sm sm:text-base">
                    Tell FitBuddy about your body, goals, equipment, and diet.
                  </p>
                </div>

                {/* Upgraded Form Card */}
                <div className="bg-white text-[#182018] p-7 sm:p-10 rounded-[28px] shadow-[0_30px_70px_rgba(0,0,0,0.35)]">
                  <form onSubmit={handleGeneratePlan}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-5">
                      {/* Name */}
                      <div className="flex flex-col gap-2">
                        <label className="font-bold text-xs sm:text-sm text-[#182018]">
                          Your Name *
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Alex"
                          className="w-full p-3.5 border border-[#dfe5dc] rounded-[13px] text-sm bg-[#fafcf9] outline-none focus:border-[#9fc82c] focus:ring-4 focus:ring-[#edf6ce] transition"
                        />
                        {errors.name && (
                          <span className="text-xs text-red-600 font-semibold">{errors.name}</span>
                        )}
                      </div>

                      {/* Age */}
                      <div className="flex flex-col gap-2">
                        <label className="font-bold text-xs sm:text-sm text-[#182018]">
                          Age *
                        </label>
                        <input
                          type="number"
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                          placeholder="e.g. 26"
                          min="10"
                          max="100"
                          className="w-full p-3.5 border border-[#dfe5dc] rounded-[13px] text-sm bg-[#fafcf9] outline-none focus:border-[#9fc82c] focus:ring-4 focus:ring-[#edf6ce] transition"
                        />
                        {errors.age && (
                          <span className="text-xs text-red-600 font-semibold">{errors.age}</span>
                        )}
                      </div>

                      {/* Gender (Requirement #1) */}
                      <div className="flex flex-col gap-2">
                        <label className="font-bold text-xs sm:text-sm text-[#182018]">
                          Gender *
                        </label>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value as any)}
                          className="w-full p-3.5 border border-[#dfe5dc] rounded-[13px] text-sm bg-[#fafcf9] outline-none focus:border-[#9fc82c] focus:ring-4 focus:ring-[#edf6ce] font-semibold transition"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Non-binary">Non-binary</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      {/* Weight (kg) */}
                      <div className="flex flex-col gap-2">
                        <label className="font-bold text-xs sm:text-sm text-[#182018]">
                          Weight (kg) *
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          placeholder="e.g. 72"
                          min="25"
                          max="300"
                          className="w-full p-3.5 border border-[#dfe5dc] rounded-[13px] text-sm bg-[#fafcf9] outline-none focus:border-[#9fc82c] focus:ring-4 focus:ring-[#edf6ce] transition"
                        />
                        {errors.weight && (
                          <span className="text-xs text-red-600 font-semibold">{errors.weight}</span>
                        )}
                      </div>

                      {/* Height (cm) (Requirement #1) */}
                      <div className="flex flex-col gap-2">
                        <label className="font-bold text-xs sm:text-sm text-[#182018]">
                          Height (cm) *
                        </label>
                        <input
                          type="number"
                          value={height}
                          onChange={(e) => setHeight(e.target.value)}
                          placeholder="e.g. 175"
                          min="90"
                          max="250"
                          className="w-full p-3.5 border border-[#dfe5dc] rounded-[13px] text-sm bg-[#fafcf9] outline-none focus:border-[#9fc82c] focus:ring-4 focus:ring-[#edf6ce] transition"
                        />
                        {errors.height && (
                          <span className="text-xs text-red-600 font-semibold">{errors.height}</span>
                        )}
                      </div>

                      {/* Fitness Goal */}
                      <div className="flex flex-col gap-2">
                        <label className="font-bold text-xs sm:text-sm text-[#182018]">
                          Fitness Goal *
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

                      {/* Equipment Available (Requirement #1) */}
                      <div className="flex flex-col gap-2">
                        <label className="font-bold text-xs sm:text-sm text-[#182018]">
                          Available Equipment *
                        </label>
                        <select
                          value={equipment}
                          onChange={(e) => setEquipment(e.target.value as any)}
                          className="w-full p-3.5 border border-[#dfe5dc] rounded-[13px] text-sm bg-[#fafcf9] outline-none focus:border-[#9fc82c] focus:ring-4 focus:ring-[#edf6ce] font-semibold transition"
                        >
                          <option value="No equipment">🤸 No equipment (Bodyweight)</option>
                          <option value="Dumbbells">🏋️ Dumbbells / Kettlebells</option>
                          <option value="Full gym">🏢 Full Gym Access</option>
                        </select>
                      </div>

                      {/* Diet Preference (Requirement #1) */}
                      <div className="flex flex-col gap-2">
                        <label className="font-bold text-xs sm:text-sm text-[#182018]">
                          Diet Preference *
                        </label>
                        <select
                          value={diet}
                          onChange={(e) => setDiet(e.target.value as any)}
                          className="w-full p-3.5 border border-[#dfe5dc] rounded-[13px] text-sm bg-[#fafcf9] outline-none focus:border-[#9fc82c] focus:ring-4 focus:ring-[#edf6ce] font-semibold transition"
                        >
                          <option value="Vegetarian">🥗 Vegetarian</option>
                          <option value="Non-vegetarian">🥩 Non-vegetarian</option>
                          <option value="Vegan">🌱 Vegan</option>
                        </select>
                      </div>

                      {/* Workout Intensity */}
                      <div className="flex flex-col gap-2">
                        <label className="font-bold text-xs sm:text-sm text-[#182018]">
                          Intensity *
                        </label>
                        <div className="grid grid-cols-3 gap-1.5 h-[50px]">
                          {[
                            { id: 'Low', label: '🌱 Low' },
                            { id: 'Medium', label: '⚡ Med' },
                            { id: 'High', label: '🔥 High' }
                          ].map((item) => (
                            <button
                              type="button"
                              key={item.id}
                              onClick={() => setIntensity(item.id as any)}
                              className={`rounded-[11px] font-bold text-xs text-center transition cursor-pointer border ${
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

                      {/* Injuries or Limitations (Requirement #1) */}
                      <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-3">
                        <label className="font-bold text-xs sm:text-sm text-[#182018] flex items-center justify-between">
                          <span>Injuries or Limitations (Optional)</span>
                          <span className="text-[11px] font-normal text-gray-500">e.g. Lower back pain, bad left knee, no jumping</span>
                        </label>
                        <input
                          type="text"
                          value={limitations}
                          onChange={(e) => setLimitations(e.target.value)}
                          placeholder="e.g. Mild knee stiffness, prefer low-impact exercises"
                          className="w-full p-3.5 border border-[#dfe5dc] rounded-[13px] text-sm bg-[#fafcf9] outline-none focus:border-[#9fc82c] focus:ring-4 focus:ring-[#edf6ce] transition"
                        />
                      </div>
                    </div>

                    {/* Loading step bar during generation (Requirement #4 & #7) */}
                    {isGenerating && (
                      <div className="mb-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center animate-fade-in shadow-inner">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden mb-2.5 relative">
                          <div className="absolute top-0 bottom-0 bg-[#7da800] rounded-full animate-indeterminate"></div>
                        </div>
                        <p className="text-xs font-bold text-[#7da800] flex items-center justify-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>{loadingStep}</span>
                        </p>
                      </div>
                    )}

                    {/* Inline Form Error & Retry Area (Requirement #3, #4 & #5) */}
                    {errorMessage && !isGenerating && (
                      <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl p-4 text-center animate-fade-in">
                        <div className="flex items-center justify-center gap-2 text-red-950 font-bold text-sm mb-2">
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                          <span>{formatSafeError(errorMessage)}</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              setErrorMessage(null);
                              handleGeneratePlan();
                            }}
                            className="bg-red-700 hover:bg-red-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Retry</span>
                          </button>
                          {fallbackPlanOffer && (
                            <button
                              type="button"
                              onClick={() => applyOfflineFallback(fallbackPlanOffer)}
                              className="bg-[#182018] hover:bg-black text-[#d9f65b] font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-[#d9f65b]" />
                              <span>Load Pre-written Routine</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Generate Button (Disabled while request is in progress - Requirement #4) */}
                    <button
                      type="submit"
                      disabled={isGenerating}
                      className="w-full mt-2 p-4 border-none rounded-[14px] bg-[#d9f65b] hover:bg-[#cbed46] text-[#182018] text-base sm:text-lg font-black transition-all hover:scale-[1.01] shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin text-[#182018]" />
                          <span>
                            {loadingStep.includes('Retrying')
                              ? 'FitBuddy is busy right now. Retrying...'
                              : 'Generating Custom AI Routine...'}
                          </span>
                        </>
                      ) : (
                        <span>✨ Generate My AI Fitness & Nutrition Plan</span>
                      )}
                    </button>

                    {/* Inline Offline Fallback Quick-Load Offer (Requirement #5) */}
                    {fallbackPlanOffer && !errorMessage && (
                      <div className="mt-4 p-4 rounded-2xl bg-[#f7f9f5] border border-[#e5eadf] text-center animate-fade-in">
                        <p className="text-xs font-bold text-gray-700 mb-2">
                          AI servers are busy right now. We have a pre-written, balanced 7-day routine ready for {name.trim() || 'you'}.
                        </p>
                        <button
                          type="button"
                          onClick={() => applyOfflineFallback(fallbackPlanOffer)}
                          className="bg-[#182018] hover:bg-black text-[#d9f65b] font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Sparkles className="w-4 h-4 text-[#d9f65b]" />
                          <span>Load Ready-Made Routine Now</span>
                        </button>
                      </div>
                    )}
                  </form>
                </div>

                {/* ================= RESULT SECTION ================= */}
                {currentPlan && (
                  <div id="result" className="mt-14 pt-8 border-t border-gray-800">
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
                          Personalized for <strong>{currentPlan.name}</strong> ({currentPlan.age} yrs, {currentPlan.weight} kg, {currentPlan.height || 175} cm) · {currentPlan.goal} · {currentPlan.intensity} Intensity
                        </p>
                      </div>

                      {/* Download PDF button (Requirement #1) */}
                      <div className="flex flex-col items-end gap-1.5 no-print">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleDownloadPdf}
                            disabled={isGeneratingPdf || !currentPlan}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
                              isGeneratingPdf || !currentPlan
                                ? 'bg-[#d9f65b]/60 text-[#182018]/60 cursor-not-allowed'
                                : 'bg-[#d9f65b] hover:bg-[#cbed46] text-[#182018] cursor-pointer'
                            }`}
                            title="Download plan as PDF"
                          >
                            {isGeneratingPdf ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Generating PDF...</span>
                              </>
                            ) : pdfSuccess ? (
                              <>
                                <Check className="w-4 h-4 text-emerald-800" />
                                <span>PDF Downloaded!</span>
                              </>
                            ) : (
                              <>
                                <Printer className="w-4 h-4" />
                                <span>Download as PDF</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsSavedPlansModalOpen(true)}
                            className="bg-white/10 hover:bg-white/20 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Calendar className="w-4 h-4 text-[#d9f65b]" /> Saved Plans ({savedPlans.length})
                          </button>
                        </div>
                        {pdfError && (
                          <div className="text-xs text-red-400 font-semibold flex items-center gap-1 bg-red-950/60 border border-red-800/60 px-2.5 py-1 rounded-lg">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                            <span>{pdfError}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Plan Summary */}
                    {currentPlan.plan?.summary && (
                      <div className="bg-white/10 border-l-4 border-[#d9f65b] p-4 rounded-r-2xl mb-6 text-sm text-[#e0e7df] leading-relaxed">
                        <p>💡 {currentPlan.plan.summary}</p>
                      </div>
                    )}

                    {/* PROGRESS STATS BAR (Requirement #5) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 no-print">
                      {/* Streak */}
                      <div className="bg-white/10 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#d9f65b]/20 text-[#d9f65b] flex items-center justify-center text-xl font-bold">
                          🔥
                        </div>
                        <div>
                          <div className="text-xl font-black text-white">{streakCount} Days</div>
                          <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Current Streak</div>
                        </div>
                      </div>

                      {/* Weekly Completion Rate */}
                      <div className="bg-white/10 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-xl font-bold">
                          📊
                        </div>
                        <div>
                          <div className="text-xl font-black text-white">{weeklyCompletionPercentage}%</div>
                          <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Week Complete</div>
                        </div>
                      </div>

                      {/* Daily Calories */}
                      <div className="bg-white/10 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center text-xl font-bold">
                          ⚡
                        </div>
                        <div>
                          <div className="text-xl font-black text-white">{nutritionTargets.calories} kcal</div>
                          <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Daily Calorie Target</div>
                        </div>
                      </div>

                      {/* Protein Goal */}
                      <div className="bg-white/10 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl font-bold">
                          🥩
                        </div>
                        <div>
                          <div className="text-xl font-black text-white">{nutritionTargets.proteinGrams}g</div>
                          <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Daily Protein Goal</div>
                        </div>
                      </div>
                    </div>

                    {/* EXPANDABLE 7-DAY WORKOUT ROUTINE (Requirement #2 & #5) */}
                    <div className="space-y-4 mb-8" id="weekGrid">
                      <div className="flex items-center justify-between text-white mb-2">
                        <h3 className="text-xl font-black">Daily Schedule</h3>
                        <span className="text-xs text-gray-400">Click any card to expand or collapse details</span>
                      </div>

                      {currentPlan.plan?.days?.map((workout, dIdx) => {
                        const dayKey = workout.day || `Day ${dIdx + 1}`;
                        const isExpanded = !!expandedDays[dayKey];
                        const isDayDone = !!completedDays[`${currentPlan.id}_d${dIdx}`];

                        return (
                          <div
                            key={dIdx}
                            className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                              isDayDone
                                ? 'bg-[#f4fbe9] border-[#9fc82c] text-[#182018]'
                                : workout.is_rest_day
                                ? 'bg-white/95 text-[#182018] border-blue-200'
                                : 'bg-white text-[#182018] border-[#e5eadf]'
                            }`}
                          >
                            {/* Card Header (Clickable for Expand/Collapse) */}
                            <div
                              onClick={() => toggleDayExpansion(dayKey)}
                              className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50/80 transition"
                            >
                              <div className="flex items-center gap-3 sm:gap-4 flex-1">
                                {/* Mark day as completed checkbox */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleDayCheck(currentPlan.id, dIdx);
                                  }}
                                  className="text-[#7da800] hover:text-[#5d7c00] transition cursor-pointer"
                                  title={isDayDone ? 'Mark as incomplete' : 'Mark day as complete'}
                                >
                                  {isDayDone ? (
                                    <CheckSquare className="w-6 h-6 text-[#7da800]" />
                                  ) : (
                                    <Square className="w-6 h-6 text-gray-400" />
                                  )}
                                </button>

                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black uppercase tracking-wider text-[#7da800]">
                                      {workout.day}
                                    </span>
                                    {workout.is_rest_day && (
                                      <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                        Rest & Recovery
                                      </span>
                                    )}
                                    {isDayDone && (
                                      <span className="text-[10px] font-bold bg-[#d9f65b] text-[#182018] px-2 py-0.5 rounded-full">
                                        Completed ✓
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="text-base sm:text-lg font-black leading-snug">
                                    {workout.workout_name}
                                  </h4>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-500 font-semibold hidden sm:inline">
                                  {workout.duration} · {workout.focus}
                                </span>
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </div>
                              </div>
                            </div>

                            {/* Expandable Body */}
                            {isExpanded && (
                              <div className="px-4 sm:px-6 pb-6 pt-2 border-t border-gray-100 text-sm">
                                {/* Warmup & Cooldown (Requirement #2) */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 mt-2">
                                  {workout.warmup && (
                                    <div className="bg-[#fffdf2] border border-[#f5ebba] p-3 rounded-xl text-xs">
                                      <span className="font-bold text-amber-800 block mb-1">
                                        🔥 Warm-Up (5–8 mins):
                                      </span>
                                      <p className="text-gray-700">{workout.warmup}</p>
                                    </div>
                                  )}
                                  {workout.cooldown && (
                                    <div className="bg-[#f0f7ff] border border-[#cbe1ff] p-3 rounded-xl text-xs">
                                      <span className="font-bold text-blue-800 block mb-1">
                                        ❄️ Cool-Down (5 mins):
                                      </span>
                                      <p className="text-gray-700">{workout.cooldown}</p>
                                    </div>
                                  )}
                                </div>

                                {/* Exercises List (Requirement #2, #3, #7) */}
                                <div className="space-y-2.5 mb-4">
                                  <div className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                    Exercises ({workout.exercises?.length || 0}):
                                  </div>
                                  {workout.exercises?.map((exercise, eIdx) => {
                                    const exKey = `${currentPlan.id}_d${dIdx}_e${eIdx}`;
                                    const isDone = !!completedExercises[exKey];

                                    return (
                                      <div
                                        key={eIdx}
                                        className={`p-3 rounded-xl border flex items-center gap-3 transition ${
                                          isDone
                                            ? 'bg-[#f8fdf4] dark:bg-green-950/20 border-[#c0e694] dark:border-green-800/40 opacity-80'
                                            : 'bg-[#f7f9f5] dark:bg-gray-800/60 border-gray-200 dark:border-gray-700'
                                        }`}
                                      >
                                        <button
                                          type="button"
                                          onClick={() => toggleExerciseCheck(currentPlan.id, dIdx, eIdx)}
                                          className="text-[#7da800] cursor-pointer shrink-0"
                                          title={isDone ? 'Mark as incomplete' : 'Mark as completed'}
                                        >
                                          {isDone ? (
                                            <CheckSquare className="w-5 h-5 text-[#7da800]" />
                                          ) : (
                                            <Square className="w-5 h-5 text-gray-400" />
                                          )}
                                        </button>

                                        {/* Small Thumbnail of the exercise (Requirement #7) */}
                                        <div
                                          onClick={() => launchExerciseTimer(exercise, workout, dIdx, eIdx)}
                                          className="cursor-pointer shrink-0 group/thumb relative"
                                          title="Click to launch visual timer for this exercise"
                                        >
                                          <ExerciseThumbnail name={exercise.name} className="w-12 h-12" />
                                          <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition text-white">
                                            <Play className="w-3.5 h-3.5 fill-white" />
                                          </div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                          <div className="flex flex-wrap items-center justify-between gap-1">
                                            <span
                                              onClick={() => launchExerciseTimer(exercise, workout, dIdx, eIdx)}
                                              className={`font-bold text-sm truncate cursor-pointer hover:text-[#7da800] transition ${
                                                isDone ? 'line-through text-gray-500' : 'text-[#182018] dark:text-white'
                                              }`}
                                              title="Launch timer for this exercise"
                                            >
                                              {exercise.name}
                                            </span>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                              <span className="text-[11px] font-extrabold text-[#537700] dark:text-[#d9f65b] bg-[#e7f5b8] dark:bg-lime-950/50 px-2 py-0.5 rounded-md">
                                                {exercise.sets_reps}
                                              </span>
                                              {exercise.rest_time && (
                                                <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-md">
                                                  ⏱ {exercise.rest_time}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          {exercise.tip && (
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 italic line-clamp-2">
                                              💡 Form Tip: {exercise.tip}
                                            </p>
                                          )}
                                        </div>

                                        {/* Quick Exercise Timer Button */}
                                        <button
                                          type="button"
                                          onClick={() => launchExerciseTimer(exercise, workout, dIdx, eIdx)}
                                          className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-[#d9f65b] text-gray-700 dark:text-gray-200 hover:text-[#182018] transition cursor-pointer shrink-0"
                                          title={`Start timer for ${exercise.name}`}
                                        >
                                          <Play className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Timer launch button for this day */}
                                <div className="flex justify-end pt-2">
                                  <button
                                    type="button"
                                    onClick={() => launchDayWorkout(workout, dIdx)}
                                    className="px-4 py-2 rounded-xl bg-[#182018] hover:bg-black text-[#d9f65b] font-bold text-xs cursor-pointer transition flex items-center gap-1.5 shadow-xs"
                                  >
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>Launch Workout Timer for this Day</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* NUTRITION & WATER TRACKING SECTION (Requirement #3) */}
                    <div className="bg-white text-[#182018] rounded-3xl p-6 sm:p-8 mb-8 shadow-lg">
                      <div className="flex items-center gap-2 text-[#7da800] text-xs font-black uppercase tracking-wider mb-1">
                        <span>🥗 Fuel Your Progress</span>
                      </div>
                      <h3 className="text-2xl font-black mb-6 font-['Cabinet_Grotesk']">
                        Nutrition, Calories & Hydration
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        {/* Calories & Protein breakdown */}
                        <div className="bg-[#fafcf9] border border-[#e5eae2] rounded-2xl p-5">
                          <h4 className="font-extrabold text-sm text-[#182018] mb-3 flex items-center gap-2">
                            <span>🔥 Daily Energy Targets</span>
                          </h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between py-1 border-b border-gray-200">
                              <span className="text-gray-600">Calculated BMR:</span>
                              <span className="font-bold">{nutritionTargets.bmr} kcal</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-200">
                              <span className="text-gray-600">Recommended Daily Intake:</span>
                              <span className="font-black text-[#7da800]">{nutritionTargets.calories} kcal</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-200">
                              <span className="text-gray-600">Protein Target:</span>
                              <span className="font-black text-[#537700]">{nutritionTargets.proteinGrams} g</span>
                            </div>
                            <div className="flex justify-between py-1">
                              <span className="text-gray-600">Hydration Target:</span>
                              <span className="font-bold">{nutritionTargets.waterLiters} Liters</span>
                            </div>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
                            {currentPlan.plan?.nutrition_tip || 'Focus on wholesome carbohydrates, clean proteins, and healthy fats.'}
                          </p>
                        </div>

                        {/* Sample Meal Plan (Requirement #3) */}
                        <div className="bg-[#fafcf9] border border-[#e5eae2] rounded-2xl p-5">
                          <h4 className="font-extrabold text-sm text-[#182018] mb-3 flex items-center justify-between">
                            <span>🍽️ Sample {currentPlan.diet || 'Diet'} Day</span>
                            <span className="text-[10px] bg-[#eef8c9] text-[#4d7000] font-bold px-2 py-0.5 rounded">
                              {currentPlan.diet || 'Balanced'}
                            </span>
                          </h4>
                          <div className="space-y-2 text-xs">
                            <div>
                              <strong className="text-gray-800">Breakfast:</strong>{' '}
                              <span className="text-gray-600">{currentPlan.plan?.sample_meal_plan?.breakfast || 'Oatmeal with chia seeds, banana, and peanut butter.'}</span>
                            </div>
                            <div>
                              <strong className="text-gray-800">Lunch:</strong>{' '}
                              <span className="text-gray-600">{currentPlan.plan?.sample_meal_plan?.lunch || 'Quinoa or brown rice bowl with roasted chickpeas & greens.'}</span>
                            </div>
                            <div>
                              <strong className="text-gray-800">Snack:</strong>{' '}
                              <span className="text-gray-600">{currentPlan.plan?.sample_meal_plan?.snack || 'Greek yogurt or handful of mixed almonds & walnuts.'}</span>
                            </div>
                            <div>
                              <strong className="text-gray-800">Dinner:</strong>{' '}
                              <span className="text-gray-600">{currentPlan.plan?.sample_meal_plan?.dinner || 'Steamed lentils/tofu or grilled fish with sautéed vegetables.'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Water Tracker (Requirement #1) */}
                        <div className="bg-[#f0f8ff] dark:bg-blue-950/20 border border-[#cbe3fb] dark:border-blue-900/40 rounded-2xl p-5 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-extrabold text-sm text-[#182018] dark:text-white flex items-center gap-1.5">
                                <Droplets className="w-4 h-4 text-blue-500" />
                                <span>Water Intake Tracker</span>
                              </h4>
                              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                {waterGlasses} / 7 glasses
                              </span>
                            </div>

                            <p className="text-[11px] text-gray-600 dark:text-gray-300 mb-3.5">
                              1 glass ≈ 250ml. Aim for 7 glasses daily.
                            </p>

                            {/* 7 Glass Icons (Requirement #1: 0/7 start, 7 empty icons) */}
                            <div className="grid grid-cols-7 gap-1.5 mb-4">
                              {Array.from({ length: 7 }).map((_, idx) => {
                                const isFilled = idx < waterGlasses;
                                return (
                                  <button
                                    type="button"
                                    key={idx}
                                    onClick={() => {
                                      if (idx < waterGlasses) {
                                        setWaterGlasses(idx);
                                        try { localStorage.setItem('fitbuddy_water_glasses', idx.toString()); } catch {}
                                      } else {
                                        const target = Math.min(7, idx + 1);
                                        setWaterGlasses(target);
                                        try { localStorage.setItem('fitbuddy_water_glasses', target.toString()); } catch {}
                                      }
                                    }}
                                    className={`py-2 px-1 rounded-xl text-center transition cursor-pointer border flex flex-col items-center justify-center ${
                                      isFilled
                                        ? 'bg-blue-500 text-white border-blue-600 shadow-xs scale-102 ring-1 ring-blue-400/50'
                                        : 'bg-white/80 dark:bg-gray-800 text-gray-300 dark:text-gray-600 border-gray-200 dark:border-gray-700 opacity-40 hover:opacity-70'
                                    }`}
                                    title={`Glass ${idx + 1} of 7 (250ml)`}
                                  >
                                    <span className="text-base select-none">🥛</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleDrinkWater(1)}
                              disabled={waterGlasses >= 7}
                              className={`flex-1 py-2.5 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs ${
                                waterGlasses >= 7
                                  ? 'bg-blue-400/50 dark:bg-blue-900/40 text-white/70 cursor-not-allowed'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-98'
                              }`}
                            >
                              <span>+ Drink Glass (250ml)</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleResetWater}
                              className="py-2.5 px-3 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-900/60 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 font-bold text-xs rounded-xl transition cursor-pointer"
                              title="Reset water counter to 0/7"
                            >
                              ↺ Reset
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* WEIGHT TRACKER & PROGRESS CHART (Requirements #2, #3, #4, #5) */}
                    <div className="bg-white text-[#182018] rounded-3xl p-6 sm:p-8 mb-8 shadow-lg">
                      {weightLogs.length === 0 ? (
                        /* Clean Empty State when user hasn't logged weight yet (Requirement #3) */
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <div className="text-xs font-black uppercase tracking-wider text-[#7da800]">
                                📈 Measurable Progress
                              </div>
                              <h3 className="text-2xl font-black font-['Cabinet_Grotesk'] text-[#182018]">
                                Weight Log & Trend
                              </h3>
                            </div>
                          </div>

                          <div className="bg-[#fafcf9] border-2 border-dashed border-gray-200 rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center">
                            <div className="w-14 h-14 rounded-2xl bg-[#d9f65b]/20 text-[#7da800] flex items-center justify-center text-2xl mb-3 shadow-inner">
                              ⚖️
                            </div>
                            <h4 className="text-lg font-bold text-[#182018] mb-1">
                              No weight entries yet
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-500 max-w-sm mb-5 leading-relaxed">
                              Start tracking your progress by logging your current weight.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setNewWeightInput('');
                                setNewWeightDateInput('Today');
                                setWeightInputError(null);
                                setIsLogWeightModalOpen(true);
                              }}
                              className="bg-[#182018] hover:bg-black text-[#d9f65b] font-bold text-xs sm:text-sm px-6 py-3 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-md hover:scale-[1.02] active:scale-[0.98]"
                            >
                              <Plus className="w-4 h-4" />
                              <span>+ Log Weight</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Real Weight Trend when user has real entries (Requirement #4 & #5) */
                        <div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div>
                              <div className="text-xs font-black uppercase tracking-wider text-[#7da800]">
                                📈 Measurable Progress
                              </div>
                              <h3 className="text-2xl font-black font-['Cabinet_Grotesk'] text-[#182018]">
                                Weight Log & Trend
                              </h3>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setNewWeightInput('');
                                setNewWeightDateInput('Today');
                                setWeightInputError(null);
                                setIsLogWeightModalOpen(true);
                              }}
                              className="bg-[#182018] hover:bg-black text-[#d9f65b] font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98] self-start sm:self-auto"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ Log Weight</span>
                            </button>
                          </div>

                          <div className="bg-[#fafcf9] border border-gray-200 rounded-2xl p-5 sm:p-6 mb-4">
                            {/* Summary info */}
                            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100 text-xs">
                              <div>
                                <span className="text-gray-500 font-medium block">Current Log:</span>
                                <div className="flex items-baseline gap-2 mt-0.5">
                                  <span className="text-2xl sm:text-3xl font-black text-[#182018]">
                                    {weightLogs[weightLogs.length - 1].weight} kg
                                  </span>
                                  <span className="text-xs font-bold text-[#7da800] bg-[#d9f65b]/20 px-2.5 py-0.5 rounded-full">
                                    {weightLogs[weightLogs.length - 1].date}
                                  </span>
                                </div>
                              </div>
                              {weightLogs.length > 1 && (
                                <div className="text-right">
                                  <span className="text-gray-500 font-medium block">Net Change:</span>
                                  {(() => {
                                    const diff = Math.round((weightLogs[weightLogs.length - 1].weight - weightLogs[0].weight) * 10) / 10;
                                    return (
                                      <span className={`text-base font-black ${diff < 0 ? 'text-emerald-600' : diff > 0 ? 'text-blue-600' : 'text-gray-600'}`}>
                                        {diff > 0 ? `+${diff}` : diff} kg
                                      </span>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>

                            {/* Responsive Bar Chart */}
                            <div className="h-44 w-full relative flex items-end justify-between px-2 sm:px-6 pb-6 pt-2">
                              {weightLogs.map((entry, idx) => {
                                const range = Math.max(1, weightMax - weightMin);
                                const percent = Math.min(100, Math.max(15, ((entry.weight - weightMin) / range) * 100));

                                return (
                                  <div key={entry.id || idx} className="flex flex-col items-center flex-1 group">
                                    <span className="text-[11px] font-black text-gray-700 mb-1 group-hover:text-[#7da800] transition">
                                      {entry.weight} kg
                                    </span>
                                    <div
                                      className="w-5 sm:w-7 bg-gradient-to-t from-[#7da800] to-[#d9f65b] rounded-t-lg transition-all duration-300 group-hover:brightness-110 shadow-xs"
                                      style={{ height: `${percent}%` }}
                                    />
                                    <span className="text-[10px] text-gray-500 font-bold mt-2 truncate max-w-[65px]">
                                      {entry.date}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Real Entry Cards with delete */}
                            <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                              {weightLogs.map((entry, idx) => (
                                <div
                                  key={entry.id || idx}
                                  className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs flex items-center gap-2 shadow-2xs hover:border-[#7da800] transition"
                                >
                                  <span className="font-bold text-[#182018]">{entry.weight} kg</span>
                                  <span className="text-gray-500 text-[11px]">— {entry.date}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteWeightLog(entry.id)}
                                    className="text-gray-300 hover:text-red-500 transition cursor-pointer text-sm font-bold ml-1"
                                    title="Delete this entry"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Feedback Refinement */}
                    <div className="bg-white text-[#182018] rounded-2xl p-6 border-2 border-dashed border-gray-300 no-print">
                      <h3 className="font-black text-lg sm:text-xl text-[#182018] mb-1">
                        🔄 Want to adjust or improve your plan?
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mb-4">
                        Tell Gemini AI what you'd like to alter (e.g. more core work, substitute dumbbells for bodyweight, add rest days) and receive an updated 7-day schedule.
                      </p>

                      <form onSubmit={handleUpdatePlan} className="space-y-3">
                        <textarea
                          rows={2}
                          value={feedbackInput}
                          onChange={(e) => setFeedbackInput(e.target.value)}
                          placeholder="Example: I'd like more shoulder and core focus, and 2 active recovery days."
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

                    {/* Medical & Safety Disclaimer (Requirement #8) */}
                    <div className="mt-8 p-4 bg-white/5 border border-white/10 rounded-2xl text-xs text-[#aeb8ac] flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-[#d9f65b] shrink-0 mt-0.5" />
                      <p>
                        <strong>Medical Disclaimer:</strong> FitBuddy provides AI-generated fitness, workout, and nutrition guidelines for educational and recreational purposes. Always consult a qualified physician or healthcare provider before beginning any new exercise routine or dietary program, especially if you have pre-existing injuries or medical conditions.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* ================= HOW IT WORKS SECTION ================= */}
            <section className={`py-24 px-[7%] transition-colors ${
              darkMode ? 'bg-[#121912]' : 'bg-[#f7f9f5]'
            }`} id="how">
              <div className="text-center max-w-[700px] mx-auto mb-14">
                <small className="text-[#79a800] font-extrabold uppercase tracking-[2px] text-xs">
                  Simple Process
                </small>
                <h2 className="text-3xl sm:text-5xl font-black tracking-[-2px] mt-3 mb-4 font-['Cabinet_Grotesk']">
                  How FitBuddy Works
                </h2>
                <p className="text-[#737b73] dark:text-gray-400 text-sm sm:text-base leading-relaxed">
                  Your personalized fitness journey in three simple steps.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-[1000px] mx-auto">
                <div className={`p-8 sm:p-9 rounded-[25px] border hover:shadow-md transition ${
                  darkMode ? 'bg-[#182018] border-gray-800' : 'bg-white border-[#e5eae2]'
                }`}>
                  <div className="text-5xl font-black text-[#c2dd58] mb-4 font-['Cabinet_Grotesk']">
                    01
                  </div>
                  <h3 className="font-extrabold text-xl mb-2">Tell Us About You</h3>
                  <p className="text-xs sm:text-sm text-[#707970] dark:text-gray-400 leading-relaxed">
                    Input your age, height, weight, gender, available equipment, diet preference, and any physical limitations.
                  </p>
                </div>

                <div className={`p-8 sm:p-9 rounded-[25px] border hover:shadow-md transition ${
                  darkMode ? 'bg-[#182018] border-gray-800' : 'bg-white border-[#e5eae2]'
                }`}>
                  <div className="text-5xl font-black text-[#c2dd58] mb-4 font-['Cabinet_Grotesk']">
                    02
                  </div>
                  <h3 className="font-extrabold text-xl mb-2">Gemini Generates Plan</h3>
                  <p className="text-xs sm:text-sm text-[#707970] dark:text-gray-400 leading-relaxed">
                    FitBuddy structures an adaptive 7-day routine complete with warm-ups, rest intervals, cool-downs, and macro targets.
                  </p>
                </div>

                <div className={`p-8 sm:p-9 rounded-[25px] border hover:shadow-md transition ${
                  darkMode ? 'bg-[#182018] border-gray-800' : 'bg-white border-[#e5eae2]'
                }`}>
                  <div className="text-5xl font-black text-[#c2dd58] mb-4 font-['Cabinet_Grotesk']">
                    03
                  </div>
                  <h3 className="font-extrabold text-xl mb-2">Execute & Track</h3>
                  <p className="text-xs sm:text-sm text-[#707970] dark:text-gray-400 leading-relaxed">
                    Check off exercises, use the interval timer with sound alerts, track water intake, and log weight progress.
                  </p>
                </div>
              </div>
            </section>
      </main>

      {/* =========================================================================
          DEDICATED WORKOUT TIMER & DEMONSTRATION MODAL (Requirements #2, #4, #5, #6)
         ========================================================================= */}
      {isTimerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-md p-3 sm:p-4 overflow-y-auto no-print"
          onClick={closeTimer}
        >
          <div
            className={`w-[min(940px,96%)] max-h-[92vh] overflow-y-auto my-auto rounded-[28px] sm:rounded-[36px] shadow-2xl relative border transition-all ${
              darkMode ? 'bg-[#151c15] text-white border-gray-800' : 'bg-white text-[#182018] border-gray-100'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* If routine is completely finished */}
            {workoutSession?.isFinished ? (
              <div className="p-8 sm:p-14 text-center flex flex-col items-center animate-fade-in">
                <div className="w-20 h-20 rounded-3xl bg-[#d9f65b]/20 text-[#7da800] dark:text-[#d9f65b] flex items-center justify-center text-4xl mb-4 animate-bounce">
                  🏆
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-[#7da800] dark:text-[#d9f65b] mb-1">
                  Workout Complete!
                </span>
                <h2 className="text-2xl sm:text-4xl font-black font-['Cabinet_Grotesk'] mb-3">
                  Crushed It! 🎉
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 max-w-md mx-auto mb-6 leading-relaxed">
                  You successfully completed every exercise in <strong>{workoutSession.dayTitle}</strong>. Your streak and progress have been updated.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeTimer}
                    className="px-6 py-3.5 rounded-2xl bg-[#d9f65b] hover:bg-[#cbed46] text-[#182018] font-black text-sm transition cursor-pointer shadow-md"
                  >
                    Done & Save Progress
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Top Header Bar */}
                <div className="px-5 sm:px-8 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3 bg-gray-50/50 dark:bg-black/20">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#7da800] dark:text-[#d9f65b]">
                        {workoutSession ? workoutSession.dayTitle : 'Interactive Workout Timer'}
                      </span>
                      {workoutSession && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          Ex {workoutSession.exerciseIndex + 1} of {workoutSession.exercises.length}
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg sm:text-xl font-black truncate font-['Cabinet_Grotesk'] mt-0.5">
                      {currentExerciseName}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setTimerSoundEnabled(!timerSoundEnabled)}
                      className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition cursor-pointer"
                      title={timerSoundEnabled ? 'Mute Alert Sound' : 'Enable Alert Sound'}
                    >
                      {timerSoundEnabled ? <Volume2 className="w-4 h-4 text-[#7da800]" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
                    </button>
                    <button
                      type="button"
                      onClick={closeTimer}
                      className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-white transition cursor-pointer"
                      title="Close Workout Timer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Overall workout progress bar across top */}
                {workoutSession && (
                  <div className="w-full bg-gray-100 dark:bg-gray-800 h-1">
                    <div
                      className="bg-[#7da800] dark:bg-[#d9f65b] h-1 transition-all duration-300"
                      style={{
                        width: `${Math.round(((workoutSession.exerciseIndex + (workoutSession.currentSet / workoutSession.totalSets)) / workoutSession.exercises.length) * 100)}%`
                      }}
                    />
                  </div>
                )}

                {/* Main 2-Column Responsive Body */}
                <div className="p-5 sm:p-7 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  {/* LEFT COLUMN: Visual Demonstration & Technique (md:col-span-6) */}
                  <div className="md:col-span-6 flex flex-col space-y-4">
                    {/* Exercise Demonstration Frame */}
                    <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-[#0c120c] aspect-4/3 flex items-center justify-center shadow-inner group">
                      {currentImageUrl && !hasImageError ? (
                        <>
                          <img
                            key={`${currentExerciseName}_${animImageIndex}`}
                            src={currentImageUrl}
                            alt={`${currentExerciseName} demonstration`}
                            loading="lazy"
                            onError={() => {
                              setFailedImages((prev) => ({ ...prev, [currentExerciseName]: true }));
                            }}
                            className="w-full h-full object-contain transition-opacity duration-300 animate-fade-in"
                          />
                          {/* Animated Frame Indicator (Requirement #5) */}
                          <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-[#d9f65b] animate-ping" />
                            <span>Motion Form · Frame {animImageIndex + 1}/2</span>
                          </div>
                        </>
                      ) : (
                        /* Fallback visual if no image or image failed loading (Requirement #6) */
                        <div
                          className="w-full h-full flex flex-col items-center justify-center p-6 text-center"
                          style={{
                            background: `radial-gradient(circle, ${fallbackInfo.color}35 0%, #0d130d 90%)`
                          }}
                        >
                          <div className="text-6xl sm:text-7xl mb-2 drop-shadow-md">
                            {fallbackInfo.emoji || '💪'}
                          </div>
                          <span className="text-xs font-bold text-white/80 uppercase tracking-widest px-3 py-1 rounded-full bg-white/10 mb-1">
                            {fallbackInfo.category || 'Fitness Movement'}
                          </span>
                          <h3 className="text-base sm:text-lg font-black text-white px-4">
                            {currentExerciseName}
                          </h3>
                        </div>
                      )}

                      {/* Target Muscle / Focus Badge */}
                      {matchedEntry?.primaryMuscles && matchedEntry.primaryMuscles.length > 0 && (
                        <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-xs text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                          🎯 Targets: {matchedEntry.primaryMuscles.join(', ')}
                        </div>
                      )}
                    </div>

                    {/* Watch Video Button (Requirement #5 & #6) */}
                    <a
                      href={youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm cursor-pointer"
                      title={`Watch video tutorial on YouTube for ${currentExerciseName}`}
                    >
                      <span>▶ Watch Video Form Tutorial</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-90" />
                    </a>

                    {/* Instructions or Form Tip (Requirement #5) */}
                    <div className="bg-[#f7f9f5] dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-2xl p-4 text-xs">
                      <div className="font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-[#7da800] dark:text-[#d9f65b]" />
                        <span>Execution & Technique Guide:</span>
                      </div>

                      {matchedEntry?.instructions && matchedEntry.instructions.length > 0 ? (
                        <ol className="space-y-1.5 text-gray-700 dark:text-gray-300 list-decimal list-inside pl-0.5 leading-relaxed">
                          {matchedEntry.instructions.map((step, idx) => (
                            <li key={idx} className="text-[11px] sm:text-xs">
                              {step}
                            </li>
                          ))}
                        </ol>
                      ) : currentExercise?.tip ? (
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed italic">
                          💡 {currentExercise.tip}
                        </p>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 italic">
                          Maintain steady core bracing, controlled breathing, and a smooth tempo throughout each repetition.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Timer, Set/Reps Counter & Workout Controls (md:col-span-6) */}
                  <div className="md:col-span-6 flex flex-col justify-between space-y-5">
                    {/* Set & Target Volume Badges */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-2xl bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-center">
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                          Current Set
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-[#182018] dark:text-white">
                          SET {workoutSession ? workoutSession.currentSet : 1} / {workoutSession ? workoutSession.totalSets : 3}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-center">
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                          Target Volume
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-[#7da800] dark:text-[#d9f65b] truncate block">
                          {workoutSession ? workoutSession.targetReps : '12 REPS'}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge & Circular Ring Countdown Timer */}
                    <div className="flex flex-col items-center">
                      <span className={`text-xs font-black px-4 py-1 rounded-full uppercase tracking-wider mb-2 shadow-xs ${
                        timerMode === 'work'
                          ? 'bg-[#d9f65b] text-[#182018]'
                          : 'bg-blue-500 text-white'
                      }`}>
                        {timerMode === 'work' ? '🔥 Work Interval' : '💤 Rest Recovery'}
                      </span>

                      {/* Circular Countdown Ring */}
                      <div className="relative w-44 h-44 sm:w-52 sm:h-52 my-1 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="50%"
                            cy="50%"
                            r={timerRadius}
                            stroke={darkMode ? '#2c392c' : '#e5eadf'}
                            strokeWidth="10"
                            fill="transparent"
                          />
                          <circle
                            cx="50%"
                            cy="50%"
                            r={timerRadius}
                            stroke={timerMode === 'work' ? '#7da800' : '#3b82f6'}
                            strokeWidth="10"
                            strokeDasharray={timerCircumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            fill="transparent"
                            className="transition-all duration-1000 ease-linear"
                          />
                        </svg>

                        {/* Digital Numbers */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-5xl sm:text-6xl font-black tracking-tight font-['Cabinet_Grotesk']">
                            {timeLeft}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                            SECONDS
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Next Exercise Preview */}
                    {nextExercise && (
                      <div className="p-3 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/60 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-bold text-gray-400">Next:</span>
                          <span className="font-extrabold truncate text-[#182018] dark:text-gray-200">
                            {nextExercise.name}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-gray-500 shrink-0 ml-2">
                          {nextExercise.sets_reps}
                        </span>
                      </div>
                    )}

                    {/* Workout Action Controls */}
                    <div className="space-y-2.5">
                      <div className="flex gap-2">
                        {/* Pause / Resume Button */}
                        <button
                          type="button"
                          onClick={toggleTimer}
                          className="flex-1 py-3.5 px-4 rounded-xl bg-[#d9f65b] hover:bg-[#cbed46] text-[#182018] font-black text-sm cursor-pointer transition shadow-md flex items-center justify-center gap-2"
                        >
                          {isTimerRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                          <span>{isTimerRunning ? 'Pause' : 'Resume / Start'}</span>
                        </button>

                        {/* Next Set / Advance Button */}
                        <button
                          type="button"
                          onClick={advanceSession}
                          className="py-3.5 px-4 rounded-xl bg-[#182018] hover:bg-black text-[#d9f65b] font-bold text-xs sm:text-sm cursor-pointer transition flex items-center gap-1.5 shadow-sm"
                          title="Complete this interval and proceed"
                        >
                          <span>Next</span>
                          <FastForward className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex gap-2">
                        {/* Restart Set */}
                        <button
                          type="button"
                          onClick={restartSet}
                          className="flex-1 py-2.5 px-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs cursor-pointer transition hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center gap-1.5"
                          title="Restart current set interval"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restart</span>
                        </button>

                        {/* Skip Exercise */}
                        {workoutSession && (
                          <button
                            type="button"
                            onClick={skipExercise}
                            className="flex-1 py-2.5 px-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs cursor-pointer transition hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center gap-1.5"
                            title="Skip to next exercise in routine"
                          >
                            <SkipForward className="w-3.5 h-3.5" />
                            <span>Skip</span>
                          </button>
                        )}

                        {/* Finish Workout Early */}
                        <button
                          type="button"
                          onClick={finishWorkout}
                          className="py-2.5 px-3 border border-red-200 dark:border-red-900/50 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 font-bold text-xs cursor-pointer transition hover:bg-red-100 dark:hover:bg-red-900/50"
                          title="Finish session and save workout"
                        >
                          Finish Workout
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          LOG WEIGHT MODAL (Requirement #4)
         ========================================================================= */}
      {isLogWeightModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] backdrop-blur-sm p-4 no-print overflow-y-auto"
          onClick={() => {
            setIsLogWeightModalOpen(false);
            setWeightInputError(null);
          }}
        >
          <div
            className={`w-[min(440px,94%)] p-6 sm:p-7 rounded-[28px] shadow-2xl border animate-pop relative my-auto ${
              darkMode ? 'bg-[#182018] text-white border-gray-700' : 'bg-white text-[#182018] border-gray-100'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                setIsLogWeightModalOpen(false);
                setWeightInputError(null);
              }}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-[#d9f65b]/20 text-[#7da800] dark:text-[#d9f65b] flex items-center justify-center text-2xl mb-4 shadow-inner">
              ⚖️
            </div>

            <h2 className="text-xl sm:text-2xl font-black mb-1 font-['Cabinet_Grotesk']">
              Enter your weight
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
              Track your real progress by logging your current body weight in kilograms.
            </p>

            <form onSubmit={handleSaveWeightLogModal} noValidate className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                  Weight (kg)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    autoFocus
                    placeholder="e.g. 72"
                    value={newWeightInput}
                    onChange={(e) => {
                      setNewWeightInput(e.target.value);
                      if (weightInputError) setWeightInputError(null);
                    }}
                    className={`w-full px-4 py-3 rounded-xl border text-lg font-black transition outline-hidden ${
                      weightInputError
                        ? 'border-red-500 bg-red-50/30'
                        : darkMode
                        ? 'bg-gray-800 border-gray-700 text-white focus:border-[#d9f65b]'
                        : 'bg-white border-gray-300 text-[#182018] focus:border-[#7da800] focus:ring-2 focus:ring-[#7da800]/20'
                    }`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                    kg
                  </span>
                </div>
                {weightInputError && (
                  <p className="text-xs font-semibold text-red-500 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{weightInputError}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                  Date
                </label>
                <input
                  type="text"
                  value={newWeightDateInput}
                  onChange={(e) => setNewWeightDateInput(e.target.value)}
                  placeholder="e.g. Today, Oct 1, Oct 8"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition outline-hidden ${
                    darkMode
                      ? 'bg-gray-800 border-gray-700 text-white focus:border-[#d9f65b]'
                      : 'bg-white border-gray-200 text-[#182018] focus:border-[#7da800]'
                  }`}
                />
                <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[11px]">
                  <span className="text-gray-400 text-[10px] font-bold">Quick:</span>
                  {['Today', 'Oct 1', 'Oct 8', 'Oct 15'].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setNewWeightDateInput(d)}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer text-[10px] ${
                        newWeightDateInput === d
                          ? 'bg-[#d9f65b] text-[#182018]'
                          : darkMode
                          ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogWeightModalOpen(false);
                    setWeightInputError(null);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs sm:text-sm transition cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-[#182018] dark:bg-[#d9f65b] text-[#d9f65b] dark:text-[#182018] font-bold text-xs sm:text-sm transition shadow-md cursor-pointer hover:opacity-95"
                >
                  Save Weight
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          SAVED PLANS MODAL (Saved Plans feature preserved, History removed)
         ========================================================================= */}
      {isSavedPlansModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 backdrop-blur-md p-4 no-print overflow-y-auto"
          onClick={() => setIsSavedPlansModalOpen(false)}
        >
          <div
            className={`w-[min(720px,96%)] max-h-[90vh] flex flex-col p-6 sm:p-8 rounded-[28px] shadow-2xl border animate-pop relative ${
              darkMode ? 'bg-[#182018] text-white border-gray-700' : 'bg-white text-[#182018] border-gray-100'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#d9f65b]/20 text-[#7da800] dark:text-[#d9f65b] flex items-center justify-center text-xl font-bold shadow-xs">
                  📁
                </div>
                <div>
                  <h2 className="text-xl font-black font-['Cabinet_Grotesk']">
                    Saved Fitness Plans
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {savedPlans.length} {savedPlans.length === 1 ? 'routine' : 'routines'} saved locally
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSavedPlansModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 py-4 pr-1 space-y-3">
              {savedPlans.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-base font-bold mb-1">No Saved Plans Yet</p>
                  <p className="text-xs text-gray-400">
                    Generate a routine in the planner to save it here.
                  </p>
                </div>
              ) : (
                savedPlans.map((item) => {
                  const isCurrent = currentPlan?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isCurrent
                          ? 'border-[#7da800] bg-[#fafcf7] dark:bg-gray-800/80 ring-2 ring-[#7da800]/20'
                          : darkMode
                          ? 'border-gray-700/80 bg-gray-800/40 hover:border-gray-600'
                          : 'border-gray-200 bg-[#fafcf9] hover:border-[#7da800]/50'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-sm sm:text-base">
                            {item.name}'s Routine
                          </h3>
                          {isCurrent && (
                            <span className="text-[10px] font-bold bg-[#d9f65b] text-[#182018] px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          )}
                          <span className="text-[11px] text-gray-400 font-medium">
                            Plan #{item.id}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                          <span>{item.age} yrs</span>
                          <span>·</span>
                          <span>{item.weight} kg</span>
                          <span>·</span>
                          <span className="font-bold text-[#537700] dark:text-[#d9f65b]">{item.goal}</span>
                          <span>·</span>
                          <span>{item.intensity}</span>
                          {item.diet && (
                            <>
                              <span>·</span>
                              <span>{item.diet}</span>
                            </>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400">{item.created_at}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentPlan(item);
                            setIsSavedPlansModalOpen(false);
                            setTimeout(() => {
                              const res = document.getElementById('result');
                              if (res) res.scrollIntoView({ behavior: 'smooth' });
                            }, 100);
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs ${
                            isCurrent
                              ? 'bg-[#182018] text-white dark:bg-white dark:text-[#182018]'
                              : 'bg-[#d9f65b] text-[#182018] hover:bg-[#cbe346]'
                          }`}
                        >
                          {isCurrent ? 'Viewing' : 'View Routine →'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsSavedPlansModalOpen(false);
                            handleInitiateDelete(item);
                          }}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition cursor-pointer"
                          title={`Delete ${item.name}'s plan`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
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
          className="fixed inset-0 bg-black/65 flex items-center justify-center z-50 backdrop-blur-xs p-4 no-print"
          onClick={handleCancelDelete}
        >
          <div
            className={`w-[min(460px,94%)] p-7 rounded-[26px] shadow-2xl border animate-pop relative ${
              darkMode ? 'bg-[#182018] text-white border-gray-700' : 'bg-white text-[#182018] border-gray-100'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleCancelDelete}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>

            <h2 className="text-xl font-black mb-1.5 font-['Cabinet_Grotesk']">
              Delete Fitness Routine?
            </h2>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
              Are you sure you want to delete <strong>{planToDelete.name}'s Routine</strong>?
            </p>

            <div className="bg-[#f7f9f5] dark:bg-gray-800 border border-[#e5eadf] dark:border-gray-700 rounded-2xl p-4 mb-4 text-xs text-gray-600 dark:text-gray-300 space-y-1.5">
              <div className="flex justify-between">
                <span>Plan Record:</span>
                <span className="font-bold">#{planToDelete.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Goal & Intensity:</span>
                <span className="font-bold text-[#537700] dark:text-[#d9f65b]">
                  {planToDelete.goal} · {planToDelete.intensity}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-bold text-xs sm:text-sm transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm transition shadow-sm cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Yes, Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          FOOTER
         ========================================================================= */}
      <footer className="py-11 px-[7%] bg-[#101610] text-white flex flex-col sm:flex-row justify-between items-center gap-5 text-sm no-print border-t border-gray-900">
        <div className="flex items-center gap-2">
          <strong className="text-lg font-black tracking-tight">💪 FitBuddy</strong>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#d9f65b] text-[#182018] font-bold">
            AI Powered
          </span>
        </div>

        <span className="text-[#aeb8ac] text-xs sm:text-sm">
          AI Fitness & Nutrition Companion
        </span>

        <span className="text-[#aeb8ac] text-xs sm:text-sm">
          © 2026 FitBuddy
        </span>
      </footer>
    </div>
  );
}
