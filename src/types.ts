export interface Exercise {
  name: string;
  sets_reps: string;
  rest_time?: string;
  target?: string;
  tip?: string;
}

export interface DayPlan {
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

export interface SampleMealPlan {
  breakfast?: string;
  lunch?: string;
  snack?: string;
  dinner?: string;
}

export interface FitnessPlanData {
  summary: string;
  days: DayPlan[];
  sample_meal_plan?: SampleMealPlan;
  nutrition_tip: string;
  recovery_tip: string;
  hydration_tip?: string;
  safety_guidance?: string;
}

export interface StoredPlanRecord {
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

export interface WeightLogEntry {
  id: string;
  date: string;
  weight: number;
}

export interface WorkoutSession {
  dayTitle: string;
  dayIndex?: number;
  exercises: Exercise[];
  exerciseIndex: number;
  currentSet: number;
  totalSets: number;
  targetReps: string;
  isFinished: boolean;
}
