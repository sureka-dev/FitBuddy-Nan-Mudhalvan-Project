import { StoredPlanRecord, DayNutritionPlan, MealsOfDay } from '../types';

export interface NutritionSummary {
  bmr: number;
  tdee: number;
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFats: number;
  dailyHydration: string;
}

export function calculateUserNutritionMetrics(planRecord: StoredPlanRecord): NutritionSummary {
  const w = Number(planRecord.weight) || 70;
  const h = Number(planRecord.height) || 175;
  const a = Number(planRecord.age) || 26;
  const g = planRecord.gender || 'Male';
  const goal = planRecord.goal || 'General Wellness';
  const intensity = planRecord.intensity || 'Medium';

  // Mifflin-St Jeor formula for BMR
  let bmr = 10 * w + 6.25 * h - 5 * a;
  if (g === 'Male') bmr += 5;
  else if (g === 'Female') bmr -= 161;
  else bmr -= 78;

  // Activity multiplier based on user's workout intensity
  let activityMult = 1.375; // Low
  if (intensity === 'Medium') activityMult = 1.55;
  if (intensity === 'High') activityMult = 1.725;

  const tdee = Math.round(bmr * activityMult);

  // Goal calorie adjustment
  let dailyCalories = tdee;
  if (goal === 'Weight Loss') {
    dailyCalories = Math.max(1250, Math.round(tdee - 450));
  } else if (goal === 'Muscle Gain') {
    dailyCalories = Math.round(tdee + 350);
  }

  // Protein targets based on user weight and goal
  let proteinPerKg = 1.4;
  if (goal === 'Muscle Gain') proteinPerKg = 2.0;
  else if (goal === 'Weight Loss') proteinPerKg = 1.8;
  const dailyProtein = Math.round(w * proteinPerKg);

  // Healthy Fats: 25-28% of total daily calories
  const dailyFats = Math.round((dailyCalories * 0.27) / 9);

  // Carbohydrates: Remaining calories from carbs (4 kcal/g)
  const remainingCals = Math.max(200, dailyCalories - (dailyProtein * 4 + dailyFats * 9));
  const dailyCarbs = Math.round(remainingCals / 4);

  // Hydration target based on bodyweight and intensity
  const hydrationNum = w * 0.035 + (intensity === 'High' ? 0.6 : intensity === 'Medium' ? 0.4 : 0.2);
  const dailyHydration = `${hydrationNum.toFixed(1)} Liters`;

  return {
    bmr: Math.round(bmr),
    tdee,
    dailyCalories,
    dailyProtein,
    dailyCarbs,
    dailyFats,
    dailyHydration,
  };
}

interface MealTemplate {
  breakfast: string;
  mid_morning_snack: string;
  lunch: string;
  evening_snack: string;
  dinner: string;
}

// 7 Varied Days for Vegetarian
const VEGETARIAN_MEALS_7DAYS: MealTemplate[] = [
  {
    breakfast: "Warm rolled oats cooked in almond milk with chia seeds, fresh blueberries, crushed walnuts, and a scoop of plant/whey protein.",
    mid_morning_snack: "Crispy roasted spiced chickpeas with a sweet clementine and green tea.",
    lunch: "Mediterranean quinoa bowl with grilled herb-marinated paneer/tofu, kalamata olives, cucumber, cherry tomatoes, and tahini-lemon dressing.",
    evening_snack: "Greek yogurt with a light drizzle of raw honey, chia seeds, and sliced almonds.",
    dinner: "Rich slow-cooked yellow lentil dal with steamed brown rice, sautéed baby spinach, and roasted cumin cauliflower.",
  },
  {
    breakfast: "Whole grain sourdough avocado toast topped with two poached eggs (or crumbled seasoned tofu), hemp seeds, and microgreens.",
    mid_morning_snack: "Creamy cottage cheese or cubed paneer with fresh pineapple chunks and pumpkin seeds.",
    lunch: "Warm black bean & roasted sweet potato burrito bowl with cilantro lime brown rice, roasted corn, salsa fresca, and sliced avocado.",
    evening_snack: "Crunchy carrot and bell pepper sticks with 3 tbsp creamy homemade garlic hummus.",
    dinner: "Pan-seared tofu or paneer tikka cubes with sautéed bell peppers, onions, quinoa pilaf, and mint cucumber raita.",
  },
  {
    breakfast: "Power green smoothie bowl blended with spinach, frozen banana, vanilla protein, soy milk, topped with kiwi slices and toasted pumpkin seeds.",
    mid_morning_snack: "Handful of raw walnuts, almonds, and 2 Medjool dates stuffed with peanut butter.",
    lunch: "Hearty Tuscan white bean soup with lacinato kale, diced tomatoes, carrots, and warm whole-grain flatbread with olive oil.",
    evening_snack: "Spiced roasted makhana (lotus seeds) or edamame pods steamed with flaky sea salt.",
    dinner: "Creamy coconut chickpea curry with turmeric, ginger, baby spinach, and steamed basmati rice with lime wedges.",
  },
  {
    breakfast: "Fluffy protein oat pancakes made with banana, eggs (or flax egg), and oat flour, topped with warm stewed berries and a splash of pure maple syrup.",
    mid_morning_snack: "Crisp green apple slices with 1.5 tbsp creamy unsweetened almond butter.",
    lunch: "Lentil, walnut, and roasted beetroot salad tossed with baby arugula, crumbled goat cheese (or vegan feta), and balsamic reduction.",
    evening_snack: "Protein shake with cold oat milk, raw cacao nibs, and a pinch of sea salt.",
    dinner: "High-protein vegetable and edamame stir-fry with broccoli, snap peas, and shiitake mushrooms over buckwheat soba noodles.",
  },
  {
    breakfast: "Greek yogurt bowl layered with sliced strawberries, flax seeds, toasted pecans, and cinnamon granola.",
    mid_morning_snack: "Two hard-boiled eggs (or spiced baked tofu cubes) sprinkled with smoked paprika and sea salt.",
    lunch: "Whole wheat wrap stuffed with spiced falafel, shredded cabbage, cucumber ribbons, tomato, and tahini garlic spread.",
    evening_snack: "Chia seed pudding prepared with coconut milk and topped with fresh raspberries.",
    dinner: "Baked sweet potato stuffed with seasoned black beans, warm corn, Greek yogurt, cilantro, and roasted pumpkin seeds.",
  },
  {
    breakfast: "Savory vegetable and spinach frittata (or chickpea flour frittata) with roasted cherry tomatoes and toasted multi-grain bread.",
    mid_morning_snack: "Rice cakes topped with mashed avocado, chili flakes, and hemp hearts.",
    lunch: "Whole wheat pasta tossed in a velvety blended cottage cheese & basil pesto sauce with sautéed zucchini and cannellini beans.",
    evening_snack: "Two squares of 85% dark chocolate with a handful of raw brazil nuts and pistachios.",
    dinner: "Paneer or tempeh bhurji (scramble) sautéed with ginger, garlic, tomatoes, and peas, served with warm whole-wheat roti and kachumber salad.",
  },
  {
    breakfast: "Golden turmeric mango chia pudding with plant protein, toasted coconut flakes, and blueberries.",
    mid_morning_snack: "Celery ribs with natural crunchy peanut butter and golden raisins.",
    lunch: "Warm spiced green lentil and barley pilaf with caramelized onions, roasted baby carrots, and herb yogurt.",
    evening_snack: "Steamed edamame in the pod with lemon juice and cracked black pepper.",
    dinner: "Comforting yellow moong dal khichdi with mixed vegetables, a teaspoon of pure ghee, and roasted cumin papad.",
  },
];

// 7 Varied Days for Vegan
const VEGAN_MEALS_7DAYS: MealTemplate[] = [
  {
    breakfast: "Overnight oats with chia seeds, soy milk, ground flax, ripe banana slices, and creamy natural peanut butter.",
    mid_morning_snack: "Crispy roasted garlic & rosemary chickpeas with a juicy orange.",
    lunch: "Warm quinoa power bowl with marinated tempeh, roasted broccoli, shredded red cabbage, and lemon-tahini dressing.",
    evening_snack: "Handful of raw walnuts, pumpkin seeds, and unsweetened dried tart cherries.",
    dinner: "Creamy red lentil dahl simmered with ginger, turmeric, diced tomatoes, baby spinach, and steamed brown basmati rice.",
  },
  {
    breakfast: "Scrambled organic tofu with turmeric, nutritional yeast, baby spinach, and cherry tomatoes on toasted whole grain sourdough.",
    mid_morning_snack: "Sliced crisp pear with 2 tbsp raw almond butter.",
    lunch: "Loaded black bean burrito bowl with cilantro brown rice, roasted sweet potato cubes, fresh guacamole, and pico de gallo.",
    evening_snack: "Protein green smoothie with plant protein, spinach, frozen mango, and hemp hearts.",
    dinner: "Chickpea & coconut curry with cauliflower, sweet peas, and fresh cilantro over steamed quinoa.",
  },
  {
    breakfast: "Acai and mixed berry smoothie bowl topped with toasted coconut, chia seeds, sliced kiwi, and high-protein hemp granola.",
    mid_morning_snack: "Steamed edamame pods sprinkled with coarse sea salt and sesame oil.",
    lunch: "Hearty Mediterranean lentil salad with diced cucumber, kalamata olives, sun-dried tomatoes, and lemon-oregano vinaigrette.",
    evening_snack: "Cucumber rounds and baby carrots with 4 tbsp roasted red pepper hummus.",
    dinner: "Crispy baked sesame-crusted tofu steak with steamed bok choy, asparagus, and garlic brown rice noodles.",
  },
  {
    breakfast: "Plant-protein oatmeal pancakes made with banana and oat flour, topped with warm blueberry compote and pure maple drizzle.",
    mid_morning_snack: "Raw energy bites made with dates, walnuts, cocoa powder, and chia seeds.",
    lunch: "Whole grain lavash wrap packed with spiced grilled seitan or tempeh strips, pickled red onions, avocado, and shredded romaine.",
    evening_snack: "Soy milk matcha latte with a small handful of roasted cashews.",
    dinner: "Tuscan white bean and kale stew with diced tomatoes, rosemary, garlic, and toasted sourdough bread for dipping.",
  },
  {
    breakfast: "Multi-seed avocado toast with lemon juice, red chili flakes, nutritional yeast, and toasted hemp seeds.",
    mid_morning_snack: "Unsweetened soy yogurt with sliced fresh strawberries and ground flaxseed.",
    lunch: "Warm edamame and brown rice bowl with steamed broccoli, shredded carrots, nori strips, and sesame-ginger aminos.",
    evening_snack: "Apple slices with cinnamon and creamy cashew butter.",
    dinner: "Stuffed roasted bell peppers filled with spiced lentils, quinoa, diced zucchini, and fresh marinara sauce.",
  },
  {
    breakfast: "Warm chia and quinoa porridge with unsweetened almond milk, sliced figs or dates, and crushed pecans.",
    mid_morning_snack: "Crispy spiced roasted edamame beans with a green tea.",
    lunch: "Whole wheat penne with rich lentil bolognese sauce, baby spinach, and nutritional yeast parmesan.",
    evening_snack: "Two squares of 80% dark chocolate and raw almonds.",
    dinner: "Grilled tempeh and vegetable skewers with roasted sweet potato wedges and chimichurri sauce.",
  },
  {
    breakfast: "Creamy green protein smoothie with pea protein, frozen banana, kale, flaxseed, and coconut water.",
    mid_morning_snack: "Rice cakes with mashed avocado and everything bagel seasoning.",
    lunch: "Warm chickpea and butternut squash stew with wild rice and steamed kale.",
    evening_snack: "Handful of roasted pumpkin seeds and dried cranberries.",
    dinner: "Yellow split pea soup with roasted garlic, turmeric, steamed broccoli, and warm whole-grain pita.",
  },
];

// 7 Varied Days for Non-Vegetarian
const NON_VEGETARIAN_MEALS_7DAYS: MealTemplate[] = [
  {
    breakfast: "Three fluffy scrambled eggs with baby spinach, cherry tomatoes, avocado slices, and one slice of sprouted grain toast.",
    mid_morning_snack: "Low-fat Greek yogurt with fresh berries and a sprinkle of crushed almonds.",
    lunch: "Grilled lemon herb chicken breast with fluffy quinoa, roasted zucchini, and crisp garden greens with olive oil dressing.",
    evening_snack: "Whey protein shake with water or almond milk, paired with a small banana.",
    dinner: "Pan-seared wild Alaskan salmon fillet with roasted asparagus, steamed baby red potatoes, and fresh lemon dill sauce.",
  },
  {
    breakfast: "Protein overnight oats cooked with rolled oats, whey protein, almond milk, chia seeds, and sliced fresh strawberries.",
    mid_morning_snack: "Two hard-boiled eggs with a pinch of sea salt and black pepper.",
    lunch: "Turkey breast and avocado whole wheat wrap with Dijon mustard, sliced tomatoes, and crisp shredded romaine.",
    evening_snack: "Low-fat cottage cheese with sliced peaches and toasted pumpkin seeds.",
    dinner: "Lean grass-fed beef or turkey sirloin stir-fry with broccoli florets, snap peas, bell peppers, and brown jasmine rice.",
  },
  {
    breakfast: "Two whole eggs plus two egg whites folded into an omelet with button mushrooms, bell peppers, and feta cheese, with whole grain toast.",
    mid_morning_snack: "Handful of raw almonds, walnuts, and a crisp green apple.",
    lunch: "Mediterranean tuna salad bowl made with olive-oil packed tuna, chickpeas, cucumber, cherry tomatoes, and red wine vinaigrette.",
    evening_snack: "Sliced turkey breast roll-ups with cucumber sticks and hummus.",
    dinner: "Herb-marinated grilled chicken thighs with roasted sweet potato wedges and steamed green beans.",
  },
  {
    breakfast: "High-protein banana oatmeal pancakes (oats, egg whites, banana, whey) topped with fresh blueberries and 1 tsp almond butter.",
    mid_morning_snack: "Greek yogurt with cinnamon, pumpkin seeds, and a light honey drizzle.",
    lunch: "Warm grilled chicken and brown rice bowl with black beans, roasted corn, fresh salsa, and quarter avocado.",
    evening_snack: "Protein shake with unsweetened almond milk and raw cacao.",
    dinner: "Pan-roasted white fish fillet (cod or sea bass) with sautéed garlic spinach, roasted carrots, and herbed quinoa.",
  },
  {
    breakfast: "Smoked salmon and mashed avocado on toasted whole grain sourdough with capers and sliced ripe tomatoes.",
    mid_morning_snack: "Cottage cheese with pineapple chunks or fresh melon.",
    lunch: "Shredded chicken and quinoa salad with roasted beets, baby spinach, crushed walnuts, and light balsamic vinaigrette.",
    evening_snack: "Raw carrot sticks and celery with 2 tbsp natural peanut butter.",
    dinner: "Lean ground turkey chili with kidney beans, diced tomatoes, sweet peppers, topped with cilantro and light sour cream/Greek yogurt.",
  },
  {
    breakfast: "Poached eggs on a bed of sautéed kale and baby potatoes with a side of turkey bacon and fresh orange slices.",
    mid_morning_snack: "Protein bar or handful of raw mixed nuts with green tea.",
    lunch: "Grilled flank steak or lean beef strips over mixed greens, roasted cherry tomatoes, cucumbers, and olive oil vinaigrette.",
    evening_snack: "Greek yogurt parfait with chia seeds and sliced kiwi.",
    dinner: "Baked salmon or rainbow trout fillet with garlic cauliflower mash, roasted Brussels sprouts, and lemon.",
  },
  {
    breakfast: "Baked egg cups with diced bell peppers, spinach, and lean turkey bacon, served with an English muffin and fresh berries.",
    mid_morning_snack: "Sliced pear with a handful of raw pistachios.",
    lunch: "Lemon garlic chicken souvlaki skewers with brown rice pilaf, Greek village salad, and tzatziki sauce.",
    evening_snack: "Edamame pods steamed with sea salt and a hard-boiled egg.",
    dinner: "Comforting slow-cooked chicken and vegetable soup with carrots, celery, shredded chicken breast, and whole grain sourdough.",
  },
];

const DAY_NAMES = [
  'Day 1 (Monday)',
  'Day 2 (Tuesday)',
  'Day 3 (Wednesday)',
  'Day 4 (Thursday)',
  'Day 5 (Friday)',
  'Day 6 (Saturday)',
  'Day 7 (Sunday)',
];

const DAY_FOCUS_BY_GOAL: Record<string, string[]> = {
  'Weight Loss': [
    'Kickstart & High Protein Satiety',
    'Lean Protein & Active Fat-Burn Fuel',
    'Hydration, Electrolytes & Fiber Reset',
    'Glycogen Replenishment & Core Recovery',
    'Lean Muscle Preservation & Clean Fuel',
    'Metabolic Conditioning & Weekend Energy',
    'Digestive Rest, Recovery & Weekly Reset',
  ],
  'Muscle Gain': [
    'Upper Body Hypertrophy & Protein Pacing',
    'Lower Body Power & High-Carb Fuel',
    'Active Recovery & Muscle Protein Synthesis',
    'Push Day Energy & Sustained Glycogen',
    'Pull Strength Fuel & Cellular Repair',
    'Peak Weekend Training & Nutrient Density',
    'Anabolic Sleep Support & Meal Prep Reset',
  ],
  'General Wellness': [
    'Balanced Energy & Whole Food Vitality',
    'Endurance & Sustained Natural Energy',
    'Digestive Health, Probiotics & Recovery',
    'Heart-Healthy Antioxidants & Clean Fuel',
    'Strength, Joint Mobility & Micronutrients',
    'Functional Weekend Energy & Balance',
    'Mindful Eating, Hydration & Weekly Reset',
  ],
};

export function generate7DayPersonalizedNutritionPlan(planRecord: StoredPlanRecord): DayNutritionPlan[] {
  const metrics = calculateUserNutritionMetrics(planRecord);
  const diet = planRecord.diet || 'Vegetarian';
  const goal = planRecord.goal || 'General Wellness';

  let mealBank = VEGETARIAN_MEALS_7DAYS;
  if (diet === 'Vegan') mealBank = VEGAN_MEALS_7DAYS;
  else if (diet === 'Non-vegetarian') mealBank = NON_VEGETARIAN_MEALS_7DAYS;

  const focusList = DAY_FOCUS_BY_GOAL[goal] || DAY_FOCUS_BY_GOAL['General Wellness'];

  const days: DayNutritionPlan[] = [];

  for (let i = 0; i < 7; i++) {
    // Subtle realistic calorie variation between workout days and rest days
    // Days 2 and 5 (+60 kcal for hard training), Day 7 (-80 kcal for rest day)
    let dayCalOffset = 0;
    if (i === 0 || i === 3) dayCalOffset = 30;
    else if (i === 1 || i === 4) dayCalOffset = 60;
    else if (i === 6) dayCalOffset = -70; // Rest day

    const dayCalories = Math.max(1200, metrics.dailyCalories + dayCalOffset);
    const dayProtein = metrics.dailyProtein;
    const dayFats = Math.round((dayCalories * 0.27) / 9);
    const dayCarbs = Math.round(Math.max(100, dayCalories - (dayProtein * 4 + dayFats * 9)) / 4);

    const meal = mealBank[i % mealBank.length];

    days.push({
      day: DAY_NAMES[i],
      focus: focusList[i % focusList.length],
      estimated_calories: dayCalories,
      protein_grams: dayProtein,
      carbs_grams: dayCarbs,
      fats_grams: dayFats,
      hydration_liters: metrics.dailyHydration,
      meals: {
        breakfast: meal.breakfast,
        mid_morning_snack: meal.mid_morning_snack,
        lunch: meal.lunch,
        evening_snack: meal.evening_snack,
        dinner: meal.dinner,
      },
    });
  }

  return days;
}

export function getOrGenerate7DayNutritionPlan(planRecord: StoredPlanRecord): DayNutritionPlan[] {
  if (
    planRecord.plan?.nutrition_plan_7days &&
    Array.isArray(planRecord.plan.nutrition_plan_7days) &&
    planRecord.plan.nutrition_plan_7days.length === 7 &&
    planRecord.plan.nutrition_plan_7days.every((d) => d.meals?.breakfast && d.meals?.dinner)
  ) {
    return planRecord.plan.nutrition_plan_7days;
  }
  return generate7DayPersonalizedNutritionPlan(planRecord);
}
