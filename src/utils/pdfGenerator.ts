import { jsPDF } from 'jspdf';
import { StoredPlanRecord, DayPlan, Exercise } from '../types';

interface GeneratePdfOptions {
  planRecord: StoredPlanRecord;
  nutritionTargets?: {
    calories: number;
    proteinGrams: number;
    waterLiters: number | string;
  };
  weightLogs?: Array<{ date: string; weight: number }>;
}

export async function generateFitBuddyPdf(options: GeneratePdfOptions): Promise<void> {
  const { planRecord, nutritionTargets, weightLogs } = options;
  const plan = planRecord.plan;
  const userName = planRecord.name || 'Athlete';

  // Instantiate jsPDF: A4 format in millimeters (210mm x 297mm)
  // Check for window.jspdf fallback if npm import resolution differs
  let doc: jsPDF;
  try {
    doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
  } catch (instErr) {
    if (typeof window !== 'undefined' && (window as any).jspdf?.jsPDF) {
      doc = new (window as any).jspdf.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
    } else {
      throw instErr;
    }
  }

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 16;
  const contentWidth = pageWidth - margin * 2; // 178mm
  let y = margin;

  // Helper function to manage page breaks cleanly
  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > 270) {
      doc.addPage();
      y = 20;
    }
  };

  // Helper to draw text with automatic wrap and pagination
  const writeWrappedText = (
    text: string,
    maxWidth: number,
    lineHeight: number,
    fontSize: number = 9,
    fontStyle: 'normal' | 'bold' | 'italic' = 'normal',
    colorRGB: [number, number, number] = [40, 50, 40]
  ) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    doc.setTextColor(colorRGB[0], colorRGB[1], colorRGB[2]);

    const lines = doc.splitTextToSize(text, maxWidth);
    for (const line of lines) {
      ensureSpace(lineHeight);
      doc.text(line, margin, y);
      y += lineHeight;
    }
  };

  // 1. BRAND HEADER BANNER
  doc.setFillColor(24, 32, 24); // #182018 Charcoal
  doc.roundedRect(margin, y, contentWidth, 22, 3, 3, 'F');

  // Accent lime pill
  doc.setFillColor(217, 246, 91); // #d9f65b Lime Green
  doc.roundedRect(margin + 5, y + 5, 8, 12, 2, 2, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(24, 32, 24);
  doc.text('FB', margin + 6, y + 13);

  // Title
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('FitBuddy - AI Fitness & Nutrition Plan', margin + 17, y + 11);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(217, 246, 91);
  doc.text('Personalized 7-Day Performance & Health Blueprint', margin + 17, y + 17);

  // Date on right
  const formattedDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 190, 180);
  doc.text(`Generated: ${formattedDate}`, pageWidth - margin - 35, y + 14);

  y += 27;

  // 2. USER PROFILE SUMMARY BOX
  ensureSpace(28);
  doc.setFillColor(247, 249, 245); // Warm subtle background
  doc.setDrawColor(225, 232, 220);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(24, 32, 24);
  doc.text(`Athlete: ${userName}`, margin + 5, y + 6);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 70, 60);

  const col1 = `Age: ${planRecord.age} yrs  |  Gender: ${planRecord.gender || 'Not specified'}`;
  const col2 = `Weight: ${planRecord.weight} kg  |  Height: ${planRecord.height || 175} cm`;
  const col3 = `Goal: ${planRecord.goal}  |  Intensity: ${planRecord.intensity}`;
  const col4 = `Equipment: ${planRecord.equipment || 'Dumbbells'}  |  Diet: ${planRecord.diet || 'Vegetarian'}`;

  doc.text(col1, margin + 5, y + 12);
  doc.text(col2, margin + 5, y + 17);
  doc.text(col3, margin + 90, y + 12);
  doc.text(col4, margin + 90, y + 17);

  if (planRecord.limitations) {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 60, 40);
    doc.text(`Limitations / Notes: ${planRecord.limitations}`, margin + 5, y + 22);
  }

  y += 29;

  // 3. AI SUMMARY NOTE
  if (plan.summary) {
    ensureSpace(18);
    doc.setFillColor(240, 247, 225); // Pale Lime
    doc.setDrawColor(185, 220, 57);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 115, 0);
    doc.text('COACH SUMMARY:', margin + 4, y + 5);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(40, 50, 40);
    const summaryLines = doc.splitTextToSize(plan.summary, contentWidth - 8);
    doc.text(summaryLines, margin + 4, y + 9.5);

    y += 18;
  }

  // 4. NUTRITION & TARGETS OVERVIEW
  ensureSpace(28);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(24, 32, 24);
  doc.text('Daily Nutrition & Recovery Targets', margin, y);
  y += 5;

  const targetBoxWidth = (contentWidth - 6) / 3;
  const calories = nutritionTargets?.calories || 2200;
  const protein = nutritionTargets?.proteinGrams || 140;
  const water = nutritionTargets?.waterLiters || ((planRecord.weight || 70) * 0.035).toFixed(1);

  // 3 cards side by side
  const targets = [
    { label: 'CALORIE TARGET', value: `${calories} kcal/day`, sub: `Tailored for ${planRecord.goal}` },
    { label: 'PROTEIN TARGET', value: `${protein}g protein/day`, sub: 'Distribute across 3-4 meals' },
    { label: 'HYDRATION GOAL', value: `${water} L water/day`, sub: '~8-10 glasses daily' },
  ];

  targets.forEach((t, idx) => {
    const bx = margin + idx * (targetBoxWidth + 3);
    doc.setFillColor(248, 250, 246);
    doc.setDrawColor(220, 228, 216);
    doc.roundedRect(bx, y, targetBoxWidth, 16, 2, 2, 'FD');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(110, 130, 90);
    doc.text(t.label, bx + 3, y + 5);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(24, 32, 24);
    doc.text(t.value, bx + 3, y + 10.5);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 100, 90);
    doc.text(t.sub, bx + 3, y + 14);
  });

  y += 20;

  // Sample Meal Plan
  if (plan.sample_meal_plan) {
    ensureSpace(24);
    doc.setFillColor(252, 253, 250);
    doc.setDrawColor(230, 236, 226);
    doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 70, 40);
    doc.text(`Sample 1-Day Meal Plan (${planRecord.diet || 'Healthy Diet'}):`, margin + 4, y + 4.5);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 60, 50);

    const mp = plan.sample_meal_plan;
    doc.text(`Breakfast: ${mp.breakfast || 'Oatmeal bowl with nuts and fruits'}`, margin + 4, y + 8.5);
    doc.text(`Lunch: ${mp.lunch || 'Balanced protein bowl with whole grains and greens'}`, margin + 4, y + 12);
    doc.text(`Snack: ${mp.snack || 'Greek yogurt or handful of almonds'}`, margin + 4, y + 15.5);
    doc.text(`Dinner: ${mp.dinner || 'Lean protein with steamed seasonal vegetables'}`, margin + 4, y + 19);

    y += 25;
  }

  // 5. 7-DAY WORKOUT SCHEDULE
  ensureSpace(12);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(24, 32, 24);
  doc.text('7-Day Workout & Recovery Schedule', margin, y);
  y += 6;

  const days = plan.days || [];
  days.forEach((day: DayPlan, dayIndex: number) => {
    // Check space for Day header + at least 2 exercises
    ensureSpace(32);

    const isRest = !!day.is_rest_day;

    // Day Header Bar
    doc.setFillColor(isRest ? 238 : 35, isRest ? 245 : 48, isRest ? 230 : 35);
    doc.roundedRect(margin, y, contentWidth, 7, 1.5, 1.5, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(isRest ? 40 : 255, isRest ? 60 : 255, isRest ? 30 : 255);
    const dayLabel = `${day.day || `Day ${dayIndex + 1}`}: ${day.workout_name || 'Workout Session'}`;
    doc.text(dayLabel, margin + 4, y + 5);

    // Duration badge on right
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const badgeText = `${day.duration || '40 mins'} | ${day.focus || (isRest ? 'Recovery' : 'Full Body')}`;
    doc.text(badgeText, pageWidth - margin - 50, y + 5);

    y += 9;

    // Warm-up (if not rest day)
    if (!isRest && day.warmup) {
      ensureSpace(8);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 130, 20);
      doc.text('Warm-up:', margin + 4, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(70, 80, 70);
      const warmupText = doc.splitTextToSize(day.warmup, contentWidth - 25);
      doc.text(warmupText, margin + 20, y);
      y += (warmupText.length * 3.5) + 2;
    }

    // Exercises Table Header
    if (day.exercises && day.exercises.length > 0) {
      ensureSpace(8);
      doc.setFillColor(242, 245, 240);
      doc.rect(margin, y, contentWidth, 5, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 70, 60);

      doc.text('#', margin + 2, y + 3.5);
      doc.text('Exercise', margin + 8, y + 3.5);
      doc.text('Sets x Reps', margin + 68, y + 3.5);
      doc.text('Rest', margin + 104, y + 3.5);
      doc.text('Form Tip / Focus', margin + 125, y + 3.5);
      y += 6;

      day.exercises.forEach((ex: Exercise, exIdx: number) => {
        ensureSpace(8);

        // Alternating row background
        if (exIdx % 2 === 1) {
          doc.setFillColor(250, 252, 248);
          doc.rect(margin, y - 1, contentWidth, 6.5, 'F');
        }

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(24, 32, 24);
        doc.text(`${exIdx + 1}`, margin + 2, y + 3);

        // Exercise name
        doc.text(ex.name || 'Exercise', margin + 8, y + 3);

        // Sets / Reps
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 60, 50);
        doc.text(ex.sets_reps || '3 sets x 12 reps', margin + 68, y + 3);

        // Rest
        doc.text(ex.rest_time || '60s', margin + 104, y + 3);

        // Form tip (truncated or wrapped to column)
        const tip = ex.tip || ex.target || 'Maintain strict form.';
        const truncatedTip = tip.length > 38 ? `${tip.substring(0, 36)}...` : tip;
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(90, 100, 90);
        doc.text(truncatedTip, margin + 125, y + 3);

        y += 6.5;
      });
    }

    // Cool-down
    if (day.cooldown) {
      ensureSpace(7);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 100, 140);
      doc.text('Cool-down:', margin + 4, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(70, 80, 70);
      const coolText = doc.splitTextToSize(day.cooldown, contentWidth - 25);
      doc.text(coolText, margin + 22, y);
      y += (coolText.length * 3.5) + 3;
    }

    y += 4; // Spacing after day card
  });

  // 6. WEIGHT PROGRESS & TRACKING LOG
  if (weightLogs && weightLogs.length > 0) {
    ensureSpace(24);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(24, 32, 24);
    doc.text('Weight Tracking Log', margin, y);
    y += 5;

    doc.setFillColor(245, 248, 242);
    doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 60, 50);

    const logStr = weightLogs
      .map((entry) => `${entry.date}: ${entry.weight} kg`)
      .join('   |   ');

    doc.text('Recent Check-ins:', margin + 4, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.text(logStr, margin + 4, y + 10);

    y += 18;
  }

  // 7. MEDICAL & SAFETY DISCLAIMER
  ensureSpace(20);
  doc.setFillColor(254, 242, 242); // Soft red background
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28);
  doc.text('SAFETY & MEDICAL DISCLAIMER:', margin + 4, y + 4.5);

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(127, 29, 29);
  const disclaimer =
    'FitBuddy recommendations are generated for educational and fitness planning purposes only. ' +
    'Always consult a qualified physician or healthcare provider prior to beginning any rigorous workout program or nutritional regimen. ' +
    'Immediately discontinue any movement that produces sharp or unnatural joint pain.';
  const disLines = doc.splitTextToSize(disclaimer, contentWidth - 8);
  doc.text(disLines, margin + 4, y + 8.5);

  // 8. ADD FOOTERS & PAGE NUMBERS ON ALL PAGES
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Bottom subtle line
    doc.setDrawColor(220, 228, 218);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    // Left footer text
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(130, 140, 130);
    doc.text('Generated by FitBuddy - AI Fitness & Nutrition Companion', margin, pageHeight - 8);

    // Right page number
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 18, pageHeight - 8);
  }

  // 9. SAVE PDF WITH ROBUST ERROR HANDLING & BLOB FALLBACK (Requirement #3)
  const filename = 'FitBuddy-Plan.pdf';

  try {
    doc.save(filename);
  } catch (saveErr) {
    console.warn('[FitBuddy PDF] doc.save failed, executing blob fallback:', saveErr);
    const blob = doc.output('blob');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}
