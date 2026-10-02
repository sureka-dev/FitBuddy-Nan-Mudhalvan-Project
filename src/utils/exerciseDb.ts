// Exercise Visual & Dataset Matching System (free-exercise-db integration)
// Dataset Source: https://github.com/yuhonas/free-exercise-db

export interface ExerciseDbEntry {
  id?: string;
  name: string;
  force?: string;
  level?: string;
  mechanic?: string;
  equipment?: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  instructions?: string[];
  category?: string;
  images: string[];
}

export const EXERCISE_DB_IMAGE_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
export const EXERCISE_DB_DATASET_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';

// In-memory cache for the full 876-exercise dataset
let cachedExerciseDb: ExerciseDbEntry[] | null = null;
let isFetchingDb = false;
const listeners: Array<() => void> = [];

// Pre-seeded fallback library of popular exercises with verified working free-exercise-db images
const BUILT_IN_EXERCISES: ExerciseDbEntry[] = [
  {
    name: 'Push-Up',
    images: ['Clock_Push-Up/0.jpg', 'Clock_Push-Up/1.jpg'],
    instructions: [
      'Place hands shoulder-width apart on the floor with arms straight.',
      'Lower your chest until it nearly touches the floor while keeping your body in a straight line.',
      'Push back up explosively to starting position, bracing your core throughout.'
    ],
    primaryMuscles: ['chest', 'triceps', 'shoulders']
  },
  {
    name: 'Goblet Squat',
    images: ['Barbell_Full_Squat/0.jpg', 'Barbell_Full_Squat/1.jpg'],
    instructions: [
      'Hold a dumbbell or kettlebell vertically against your chest.',
      'Sit back and down into a squat, keeping your chest tall and elbows inside knees.',
      'Drive through your heels to return to standing position.'
    ],
    primaryMuscles: ['quadriceps', 'glutes']
  },
  {
    name: 'Air Squat',
    images: ['Barbell_Full_Squat/0.jpg', 'Barbell_Full_Squat/1.jpg'],
    instructions: [
      'Stand with feet shoulder-width apart, toes pointing slightly outward.',
      'Hinge at the hips and bend knees, lowering hips below knee crease.',
      'Drive through mid-foot to stand back up tall.'
    ],
    primaryMuscles: ['quadriceps', 'glutes']
  },
  {
    name: 'Plank',
    images: ['Plank/0.jpg', 'Plank/1.jpg'],
    instructions: [
      'Rest on forearms with elbows directly beneath your shoulders.',
      'Engage your abdominal wall and glutes, keeping head, back, and heels in one straight line.',
      'Breathe smoothly and maintain tension for the prescribed duration.'
    ],
    primaryMuscles: ['abdominals', 'core']
  },
  {
    name: 'Mountain Climbers',
    images: ['Mountain_Climbers/0.jpg', 'Mountain_Climbers/1.jpg'],
    instructions: [
      'Start in a push-up position with hands beneath shoulders and body straight.',
      'Drive one knee forward toward your chest, then quickly switch legs in a rhythmic running motion.',
      'Keep your core braced and hips level throughout.'
    ],
    primaryMuscles: ['abdominals', 'cardiovascular']
  },
  {
    name: 'Dumbbell Bent-Over Row',
    images: ['Alternating_Kettlebell_Row/0.jpg', 'Alternating_Kettlebell_Row/1.jpg'],
    instructions: [
      'Hinge forward at the hips with flat spine and knees slightly bent.',
      'Pull the weights up toward your ribcage, squeezing your shoulder blades together.',
      'Lower under control to a full stretch.'
    ],
    primaryMuscles: ['middle back', 'lats', 'biceps']
  },
  {
    name: 'Romanian Deadlift',
    images: ['Axle_Deadlift/0.jpg', 'Axle_Deadlift/1.jpg'],
    instructions: [
      'Hold weights in front of thighs with shoulders pinned back.',
      'Hinge at hips, pushing glutes backward while keeping a micro-bend in knees.',
      'Descend until feeling a deep hamstring stretch, then squeeze glutes to return tall.'
    ],
    primaryMuscles: ['hamstrings', 'glutes', 'lower back']
  },
  {
    name: 'Walking Lunge',
    images: ['Barbell_Lunge/0.jpg', 'Barbell_Lunge/1.jpg'],
    instructions: [
      'Take an exaggerated step forward and drop your back knee toward the floor.',
      'Both knees should reach approximately 90-degree angles.',
      'Drive up through the front heel into the next forward step.'
    ],
    primaryMuscles: ['quadriceps', 'glutes', 'calves']
  },
  {
    name: 'Dumbbell Floor Press',
    images: ['Barbell_Bench_Press_-_Medium_Grip/0.jpg', 'Barbell_Bench_Press_-_Medium_Grip/1.jpg'],
    instructions: [
      'Lie flat on the floor with knees bent and feet planted.',
      'Press dumbbells upward until arms are straight, keeping wrists stacked over elbows.',
      'Lower slowly until triceps lightly touch the floor, then press up again.'
    ],
    primaryMuscles: ['chest', 'triceps', 'deltoids']
  },
  {
    name: 'Dumbbell Overhead Shoulder Press',
    images: ['Alternating_Cable_Shoulder_Press/0.jpg', 'Alternating_Cable_Shoulder_Press/1.jpg'],
    instructions: [
      'Hold weights at shoulder height with palms facing forward or neutral.',
      'Press directly overhead until elbows are fully extended without arching your back.',
      'Lower slowly back to ear level.'
    ],
    primaryMuscles: ['deltoids', 'triceps']
  },
  {
    name: 'Bicep Curl',
    images: ['Dumbbell_Alternate_Bicep_Curl/0.jpg', 'Dumbbell_Alternate_Bicep_Curl/1.jpg'],
    instructions: [
      'Stand tall holding weights by your sides with arms extended.',
      'Curl the weights upward while keeping elbows pinned to your torso.',
      'Squeeze biceps at the top and lower with a controlled 2-second eccentric tempo.'
    ],
    primaryMuscles: ['biceps']
  },
  {
    name: 'Glute Bridge',
    images: ['Barbell_Glute_Bridge/0.jpg', 'Barbell_Glute_Bridge/1.jpg'],
    instructions: [
      'Lie flat on your back with knees bent and feet flat on the floor close to glutes.',
      'Drive through heels to lift hips until thighs and torso align.',
      'Squeeze glutes hard at the peak for 1 second before lowering.'
    ],
    primaryMuscles: ['glutes', 'hamstrings']
  },
  {
    name: 'Calf Raise',
    images: ['Barbell_Seated_Calf_Raise/0.jpg', 'Barbell_Seated_Calf_Raise/1.jpg'],
    instructions: [
      'Stand upright on the balls of your feet on flat ground or an elevated ledge.',
      'Press upward through big toes to achieve maximum calf contraction.',
      'Lower slowly into a gentle heel stretch.'
    ],
    primaryMuscles: ['calves']
  },
  {
    name: 'Dumbbell Thruster',
    images: ['Kettlebell_Thruster/0.jpg', 'Kettlebell_Thruster/1.jpg'],
    instructions: [
      'Hold weights at shoulders and drop into a full squat.',
      'Explode upward out of the squat, using upward momentum to press weights overhead.',
      'Lower weights to shoulders as you descend smoothly into the next squat rep.'
    ],
    primaryMuscles: ['quadriceps', 'glutes', 'shoulders']
  },
  {
    name: 'Bicycle Crunch',
    images: ['Ab_Crunch_Machine/0.jpg', 'Ab_Crunch_Machine/1.jpg'],
    instructions: [
      'Lie on your back with hands lightly behind head and legs lifted in tabletop position.',
      'Rotate your torso to bring opposite elbow to opposite knee while extending the other leg.',
      'Alternate sides smoothly with control without tugging on your neck.'
    ],
    primaryMuscles: ['obliques', 'abdominals']
  },
  {
    name: 'Russian Twist',
    images: ['Ab_Crunch_Machine/0.jpg', 'Ab_Crunch_Machine/1.jpg'],
    instructions: [
      'Sit on the floor with knees bent and torso leaned back at roughly 45 degrees.',
      'Rotate your torso side to side, touching the floor on each side.',
      'Keep core braced and spine long throughout the movement.'
    ],
    primaryMuscles: ['obliques', 'core']
  }
];

// Initialize and fetch the full dataset once on app load
export async function initializeExerciseDb(): Promise<ExerciseDbEntry[]> {
  if (cachedExerciseDb && cachedExerciseDb.length > 0) {
    return cachedExerciseDb;
  }

  // Pre-seed with built-ins immediately so UI never waits
  cachedExerciseDb = [...BUILT_IN_EXERCISES];

  if (isFetchingDb) {
    return cachedExerciseDb;
  }

  isFetchingDb = true;

  try {
    const res = await fetch(EXERCISE_DB_DATASET_URL);
    if (res.ok) {
      const data: ExerciseDbEntry[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        cachedExerciseDb = data;
        // Notify any active subscribers that full dataset is ready
        listeners.forEach((cb) => cb());
      }
    }
  } catch (err) {
    console.warn('[FitBuddy] free-exercise-db fetch skipped or offline, using built-in library:', err);
  } finally {
    isFetchingDb = false;
  }

  return cachedExerciseDb;
}

export function subscribeExerciseDb(callback: () => void): () => void {
  listeners.push(callback);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

// Clean and normalize strings for robust fuzzy matching
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Matching Algorithm (Requirement #4):
 * 1. Lowercase both names
 * 2. Exact match
 * 3. Contains / substring match
 * 4. Most shared words overlap score
 * Returns best dataset entry or null
 */
export function matchExerciseInDb(rawName: string): ExerciseDbEntry | null {
  if (!rawName || typeof rawName !== 'string') return null;

  const dataset = (cachedExerciseDb && cachedExerciseDb.length > 0) ? cachedExerciseDb : BUILT_IN_EXERCISES;
  const target = normalizeText(rawName);
  if (!target) return null;

  // 1. Exact match
  for (const item of dataset) {
    if (normalizeText(item.name) === target) {
      return item;
    }
  }

  // 2. Contains / Substring match (either item name contains target, or target contains item name)
  let bestContains: ExerciseDbEntry | null = null;
  let bestContainsLen = 0;

  for (const item of dataset) {
    const norm = normalizeText(item.name);
    if (target.includes(norm) || norm.includes(target)) {
      // Prefer longest meaningful match
      if (norm.length > bestContainsLen) {
        bestContains = item;
        bestContainsLen = norm.length;
      }
    }
  }

  if (bestContains) {
    return bestContains;
  }

  // 3. Word token overlap match (most shared non-filler words)
  const stopWords = new Set(['and', 'with', 'for', 'the', 'a', 'an', 'or', 'in', 'on', 'at', 'to', 'per', 'sets', 'reps']);
  const targetTokens = target
    .split(' ')
    .filter((w) => w.length > 2 && !stopWords.has(w));

  if (targetTokens.length === 0) return null;

  let bestScore = 0;
  let bestMatch: ExerciseDbEntry | null = null;

  for (const item of dataset) {
    const itemTokens = normalizeText(item.name)
      .split(' ')
      .filter((w) => w.length > 2 && !stopWords.has(w));

    let score = 0;
    for (const t of targetTokens) {
      if (itemTokens.includes(t)) {
        score += 3;
      } else if (itemTokens.some((it) => it.includes(t) || t.includes(it))) {
        score += 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  }

  // Require at least 2 points to avoid random spurious matches
  return bestScore >= 2 ? bestMatch : null;
}

/**
 * Returns full URL to the exercise image
 */
export function getExerciseImageUrl(imageRelativePath?: string): string | null {
  if (!imageRelativePath) return null;
  if (imageRelativePath.startsWith('http')) return imageRelativePath;
  return `${EXERCISE_DB_IMAGE_BASE}${imageRelativePath}`;
}

/**
 * Generates reliable YouTube Search URL for proper form tutorial
 */
export function getYouTubeTutorialUrl(exerciseName: string): string {
  const clean = exerciseName.replace(/[^\w\s-]/g, '').trim();
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`how to do ${clean} proper form`)}`;
}

/**
 * Returns appropriate emoji visual & badge color based on muscle focus / exercise name
 */
export function getExerciseFallbackVisual(name: string): { emoji: string; color: string; category: string } {
  const n = name.toLowerCase();
  if (n.includes('squat') || n.includes('lunge') || n.includes('leg') || n.includes('calf') || n.includes('glute')) {
    return { emoji: '🦵', color: '#7da800', category: 'Lower Body' };
  }
  if (n.includes('push') || n.includes('press') || n.includes('chest') || n.includes('dip')) {
    return { emoji: '💪', color: '#3b82f6', category: 'Chest & Arms' };
  }
  if (n.includes('row') || n.includes('pull') || n.includes('deadlift') || n.includes('back')) {
    return { emoji: '🏋️', color: '#8b5cf6', category: 'Back & Core' };
  }
  if (n.includes('plank') || n.includes('crunch') || n.includes('twist') || n.includes('core') || n.includes('abs')) {
    return { emoji: '🧘', color: '#ec4899', category: 'Core & Stability' };
  }
  if (n.includes('run') || n.includes('jump') || n.includes('climber') || n.includes('burpee') || n.includes('cardio')) {
    return { emoji: '⚡', color: '#f59e0b', category: 'Cardio / HIIT' };
  }
  return { emoji: '🔥', color: '#10b981', category: 'Strength' };
}
