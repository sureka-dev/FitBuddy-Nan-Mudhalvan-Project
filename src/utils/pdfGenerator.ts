import { jsPDF } from 'jspdf';
import { StoredPlanRecord, DayPlan, Exercise, DayNutritionPlan } from '../types';
import { getOrGenerate7DayNutritionPlan, calculateUserNutritionMetrics } from './nutritionGenerator';

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

  // Instantiate jsPDF: Standard A4 portrait (210mm x 297mm)
  let doc: jsPDF;
  try {
    doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });
  } catch (instErr) {
    if (typeof window !== 'undefined' && (window as any).jspdf?.jsPDF) {
      doc = new (window as any).jspdf.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });
    } else {
      throw instErr;
    }
  }

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = 180; // Exactly 210 - 2 * 15
  const maxY = 272; // Reserve bottom 25mm for footer & padding
  const topMarginOnNewPage = 18;
  let y = margin;

  // Helper to ensure vertical space, triggering page break if required
  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > maxY) {
      doc.addPage();
      y = topMarginOnNewPage;
    }
  };

  // Helper to draw a modern section title with a subtle lime accent indicator
  const drawSectionHeader = (title: string, subtitle?: string) => {
    ensureSpace(subtitle ? 15 : 11);
    doc.setFillColor(217, 246, 91); // Lime accent #d9f65b
    doc.roundedRect(margin, y, 3, 7.5, 0.8, 0.8, 'F');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(24, 32, 24);
    doc.text(title, margin + 5.5, y + 5.8);

    y += 8;
    if (subtitle) {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 110, 100);
      doc.text(subtitle, margin + 5.5, y + 1.5);
      y += 5;
    }
  };

  // =========================================================================
  // 1. BRAND HEADER BANNER
  // =========================================================================
  doc.setFillColor(24, 32, 24); // #182018 Deep Charcoal
  doc.roundedRect(margin, y, contentWidth, 23, 2.5, 2.5, 'F');

  // Lime Brand Monogram Box
  doc.setFillColor(217, 246, 91); // #d9f65b
  doc.roundedRect(margin + 5, y + 4.5, 11, 14, 2, 2, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(24, 32, 24);
  doc.text('FB', margin + 6.8, y + 14);

  // Document Title & Tagline
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('FitBuddy — AI Fitness & Nutrition Plan', margin + 20, y + 10.5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(217, 246, 91);
  doc.text('Custom 7-Day Performance Blueprint · Science-Backed Routine', margin + 20, y + 16.5);

  // Formatted Date on Right
  const formattedDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(170, 185, 170);
  doc.text(`Generated: ${formattedDate}`, pageWidth - margin - 38, y + 13.5);

  y += 27;

  // =========================================================================
  // 2. ATHLETE PROFILE CARD (Controlled Dimensions & Wrapping)
  // =========================================================================
  const limitationsText = planRecord.limitations?.trim()
    ? `Limitations / Injuries: ${planRecord.limitations.trim()}`
    : '';
  const limLines = limitationsText ? doc.splitTextToSize(limitationsText, contentWidth - 10) : [];
  const profileCardHeight = 22 + (limLines.length > 0 ? limLines.length * 3.5 + 2 : 0);

  ensureSpace(profileCardHeight + 3);
  doc.setFillColor(248, 250, 246);
  doc.setDrawColor(222, 229, 218);
  doc.setLineWidth(0.35);
  doc.roundedRect(margin, y, contentWidth, profileCardHeight, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(24, 32, 24);
  doc.text(`ATHLETE PROFILE: ${userName.toUpperCase()}`, margin + 5, y + 6);

  doc.setFontSize(7.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 70, 60);

  // Column 1
  const col1X = margin + 5;
  doc.text(`Age: ${planRecord.age || 26} yrs   |   Gender: ${planRecord.gender || 'Not specified'}`, col1X, y + 11.5);
  doc.text(`Weight: ${planRecord.weight || 70} kg   |   Height: ${planRecord.height || 175} cm`, col1X, y + 16.5);

  // Column 2
  const col2X = margin + 92;
  doc.text(`Goal: ${planRecord.goal || 'General Fitness'}   |   Intensity: ${planRecord.intensity || 'Medium'}`, col2X, y + 11.5);
  doc.text(`Equipment: ${planRecord.equipment || 'Dumbbells'}   |   Diet: ${planRecord.diet || 'Balanced'}`, col2X, y + 16.5);

  // Limitations (if present)
  if (limLines.length > 0) {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(180, 50, 30);
    doc.text(limLines, margin + 5, y + 21.5);
  }

  y += profileCardHeight + 4;

  // =========================================================================
  // 3. COACH SUMMARY
  // =========================================================================
  if (plan.summary?.trim()) {
    const summaryLines = doc.splitTextToSize(plan.summary.trim(), contentWidth - 10);
    const summaryBoxHeight = Math.max(13, summaryLines.length * 3.6 + 8);

    ensureSpace(summaryBoxHeight + 3);
    doc.setFillColor(243, 248, 230); // Soft Lime Tint
    doc.setDrawColor(185, 215, 75);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, y, contentWidth, summaryBoxHeight, 2, 2, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(70, 105, 0);
    doc.text('COACH STRATEGY & SUMMARY:', margin + 5, y + 5);

    doc.setFontSize(7.6);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(40, 50, 40);
    doc.text(summaryLines, margin + 5, y + 9.5);

    y += summaryBoxHeight + 5;
  }

  // =========================================================================
  // 4. DAILY NUTRITION & TARGETS OVERVIEW
  // =========================================================================
  ensureSpace(28);
  drawSectionHeader('Daily Nutrition & Recovery Targets');

  const cardSpacing = 3;
  const targetCardWidth = (contentWidth - cardSpacing * 2) / 3; // ~58mm each
  const calories = nutritionTargets?.calories || 2200;
  const protein = nutritionTargets?.proteinGrams || 140;
  const water = nutritionTargets?.waterLiters || ((planRecord.weight || 70) * 0.035).toFixed(1);

  const targets = [
    { label: 'CALORIE INTAKE', value: `${calories} kcal/day`, sub: `Calibrated for ${planRecord.goal}` },
    { label: 'PROTEIN TARGET', value: `${protein}g daily`, sub: 'Distribute evenly across meals' },
    { label: 'HYDRATION GOAL', value: `${water} L water/day`, sub: '1 glass ≈ 250ml (~7 glasses/day)' },
  ];

  targets.forEach((t, idx) => {
    const cx = margin + idx * (targetCardWidth + cardSpacing);
    doc.setFillColor(250, 252, 248);
    doc.setDrawColor(222, 229, 218);
    doc.setLineWidth(0.3);
    doc.roundedRect(cx, y, targetCardWidth, 16.5, 1.8, 1.8, 'FD');

    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(95, 120, 75);
    doc.text(t.label, cx + 3.5, y + 5);

    doc.setFontSize(9.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(24, 32, 24);
    doc.text(t.value, cx + 3.5, y + 10.5);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 100, 90);
    doc.text(t.sub, cx + 3.5, y + 14.5);
  });

  y += 20;

  // Sample 1-Day Meal Plan (Dynamic Height & Wrapped Text)
  if (plan.sample_meal_plan) {
    const mp = plan.sample_meal_plan;
    const bLines = doc.splitTextToSize(`Breakfast: ${mp.breakfast || 'Wholesome oatmeal bowl with fruits and nuts'}`, contentWidth - 10);
    const lLines = doc.splitTextToSize(`Lunch: ${mp.lunch || 'Balanced protein bowl with whole grains and roasted greens'}`, contentWidth - 10);
    const sLines = doc.splitTextToSize(`Snack: ${mp.snack || 'Greek yogurt or handful of almonds'}`, contentWidth - 10);
    const dLines = doc.splitTextToSize(`Dinner: ${mp.dinner || 'Lean protein with seasonal vegetables'}`, contentWidth - 10);

    const totalMealLines = bLines.length + lLines.length + sLines.length + dLines.length;
    const mealPlanCardHeight = Math.max(22, totalMealLines * 3.4 + 9);

    ensureSpace(mealPlanCardHeight + 3);
    doc.setFillColor(252, 254, 250);
    doc.setDrawColor(225, 232, 222);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, mealPlanCardHeight, 2, 2, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 90, 45);
    doc.text(`SAMPLE 1-DAY MEAL PLAN (${(planRecord.diet || 'Balanced Diet').toUpperCase()}):`, margin + 4.5, y + 5);

    doc.setFontSize(7.2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(45, 55, 45);

    let mealY = y + 9;
    [bLines, lLines, sLines, dLines].forEach((lines) => {
      doc.text(lines, margin + 4.5, mealY);
      mealY += lines.length * 3.4;
    });

    y += mealPlanCardHeight + 5;
  }

  // =========================================================================
  // 5. 7-DAY WORKOUT SCHEDULE & EXERCISE TABLES
  // =========================================================================
  ensureSpace(16);
  drawSectionHeader('7-Day Workout & Recovery Schedule', 'Structured daily routines with target reps, rest, and coaching form tips');

  // Exact column layout matching contentWidth (180mm total)
  // Col 0 (#): 8mm
  // Col 1 (Exercise): 44mm
  // Col 2 (Sets × Reps): 28mm
  // Col 3 (Rest): 20mm
  // Col 4 (Form Tip / Focus): 80mm
  // Total: 8 + 44 + 28 + 20 + 80 = 180mm!
  const colX = {
    num: margin,                     // 15
    name: margin + 8,                // 23
    sets: margin + 8 + 44,           // 67
    rest: margin + 8 + 44 + 28,      // 95
    tip: margin + 8 + 44 + 28 + 20,  // 115
  };
  const colW = {
    num: 8,
    name: 44,
    sets: 28,
    rest: 20,
    tip: 80,
  };

  // Reusable function to draw Table Header (Dark themed for contrast & clarity)
  const drawTableHeader = (yPos: number): number => {
    const hHeight = 6.2;
    doc.setFillColor(24, 32, 24);
    doc.rect(margin, yPos, contentWidth, hHeight, 'F');

    doc.setFontSize(7.2);
    doc.setFont('helvetica', 'bold');

    doc.setTextColor(217, 246, 91); // Lime #
    doc.text('#', colX.num + 2.5, yPos + 4.3);

    doc.setTextColor(255, 255, 255);
    doc.text('EXERCISE', colX.name + 2, yPos + 4.3);
    doc.text('SETS × REPS', colX.sets + 2, yPos + 4.3);
    doc.text('REST', colX.rest + 2, yPos + 4.3);
    doc.text('FORM TIP / FOCUS', colX.tip + 2, yPos + 4.3);

    return yPos + hHeight;
  };

  const days = plan.days || [];
  days.forEach((day: DayPlan, dayIndex: number) => {
    const isRest = !!day.is_rest_day;
    const dayLabel = `${(day.day || `Day ${dayIndex + 1}`).toUpperCase()} — ${(day.workout_name || 'Routine').toUpperCase()}`;
    const dayMeta = `${day.duration || (isRest ? 'Rest' : '45 mins')} · ${day.focus || (isRest ? 'Active Recovery' : 'Full Body')}`;

    // Ensure the Day Heading is NEVER separated from its content.
    // We check for at least 42mm (Day Header + warmup + table header + 1 exercise)
    if (y + 42 > maxY) {
      doc.addPage();
      y = topMarginOnNewPage;
    }

    // 1. DAY HEADER BAR
    doc.setFillColor(isRest ? 234 : 24, isRest ? 240 : 32, isRest ? 230 : 24);
    doc.roundedRect(margin, y, contentWidth, 7.5, 1.5, 1.5, 'F');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(isRest ? 30 : 217, isRest ? 50 : 246, isRest ? 25 : 91);
    doc.text(dayLabel, margin + 4, y + 5.2);

    // Meta (Duration · Focus) on right
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(isRest ? 70 : 200, isRest ? 80 : 210, isRest ? 70 : 200);
    const metaWidth = doc.getTextWidth(dayMeta);
    doc.text(dayMeta, margin + contentWidth - metaWidth - 4, y + 5.2);

    y += 9.5;

    // 2. WARM-UP (if applicable)
    if (!isRest && day.warmup?.trim()) {
      const warmupContent = `Warm-Up: ${day.warmup.trim()}`;
      const warmupLines = doc.splitTextToSize(warmupContent, contentWidth - 8);
      const warmupBoxHeight = warmupLines.length * 3.4 + 4;

      ensureSpace(warmupBoxHeight + 3);
      doc.setFillColor(250, 252, 246);
      doc.setDrawColor(220, 230, 212);
      doc.setLineWidth(0.25);
      doc.roundedRect(margin, y, contentWidth, warmupBoxHeight, 1.2, 1.2, 'FD');

      doc.setFontSize(7.2);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 130, 20);
      doc.text(warmupLines[0], margin + 4, y + 4.2);

      if (warmupLines.length > 1) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 70, 60);
        for (let l = 1; l < warmupLines.length; l++) {
          doc.text(warmupLines[l], margin + 4, y + 4.2 + l * 3.4);
        }
      }

      y += warmupBoxHeight + 2.5;
    }

    // 3. EXERCISES TABLE
    if (day.exercises && day.exercises.length > 0) {
      // Draw Table Header
      y = drawTableHeader(y);

      // Draw Each Exercise Row with AUTOMATIC TEXT WRAPPING & EXPANDING ROW HEIGHT
      day.exercises.forEach((ex: Exercise, exIdx: number) => {
        // Prepare wrapped text arrays for each cell with controlled widths and internal padding
        doc.setFontSize(7.4);
        doc.setFont('helvetica', 'bold');
        const exNameLines = doc.splitTextToSize(ex.name?.trim() || 'Exercise', colW.name - 4);

        doc.setFontSize(7.2);
        doc.setFont('helvetica', 'normal');
        const setsLines = doc.splitTextToSize(ex.sets_reps?.trim() || '3 × 10-12', colW.sets - 4);
        const restLines = doc.splitTextToSize(ex.rest_time?.trim() || '60s', colW.rest - 3);

        const tipText = (ex.tip?.trim() || ex.target?.trim() || 'Focus on controlled tempo and full range of motion.').trim();
        const tipLines = doc.splitTextToSize(tipText, colW.tip - 4);

        // Maximum line count among all cells in this row
        const maxLines = Math.max(1, exNameLines.length, setsLines.length, restLines.length, tipLines.length);

        // Calculate dynamic row height (expand automatically, never fixed!)
        const lineHeight = 3.4;
        const rowPadding = 3.6;
        const rowHeight = Math.max(7.5, maxLines * lineHeight + rowPadding);

        // Check page boundary. If overflow, add page & REPEAT table headers!
        if (y + rowHeight > maxY) {
          doc.addPage();
          y = topMarginOnNewPage;

          // Continuation banner
          doc.setFillColor(240, 244, 238);
          doc.rect(margin, y, contentWidth, 5.5, 'F');
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(60, 80, 50);
          doc.text(`${dayLabel} (Continued)`, margin + 3.5, y + 3.8);
          y += 6.5;

          // Repeat table header!
          y = drawTableHeader(y);
        }

        // Row background (alternating subtle tone)
        const isOdd = exIdx % 2 === 1;
        doc.setFillColor(isOdd ? 250 : 255, isOdd ? 252 : 255, isOdd ? 247 : 255);
        doc.rect(margin, y, contentWidth, rowHeight, 'F');

        // Bottom border line for row
        doc.setDrawColor(228, 233, 225);
        doc.setLineWidth(0.2);
        doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);

        const textBaselineY = y + 4.2;

        // Col 0: #
        doc.setFontSize(7.2);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(90, 100, 90);
        doc.text(`${exIdx + 1}`, colX.num + 2.5, textBaselineY);

        // Col 1: Exercise Name (Bold)
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(24, 32, 24);
        for (let l = 0; l < exNameLines.length; l++) {
          doc.text(exNameLines[l], colX.name + 2, textBaselineY + l * lineHeight);
        }

        // Col 2: Sets x Reps
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 60, 50);
        for (let l = 0; l < setsLines.length; l++) {
          doc.text(setsLines[l], colX.sets + 2, textBaselineY + l * lineHeight);
        }

        // Col 3: Rest
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 90, 80);
        for (let l = 0; l < restLines.length; l++) {
          doc.text(restLines[l], colX.rest + 2, textBaselineY + l * lineHeight);
        }

        // Col 4: Form Tip / Focus (Italic wrapped text)
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(55, 75, 55);
        for (let l = 0; l < tipLines.length; l++) {
          doc.text(tipLines[l], colX.tip + 2, textBaselineY + l * lineHeight);
        }

        y += rowHeight;
      });
    } else if (isRest) {
      // Rest Day Card
      ensureSpace(14);
      doc.setFillColor(245, 249, 242);
      doc.setDrawColor(220, 230, 215);
      doc.setLineWidth(0.25);
      doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, 'FD');

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 90, 45);
      doc.text('RECOVERY & REST DAY:', margin + 4, y + 4.5);

      doc.setFontSize(7.2);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(70, 80, 70);
      const restNote = 'Allow your muscles and central nervous system to rebuild. Focus on stretching, light walking, and meeting your hydration and protein targets.';
      const restLines = doc.splitTextToSize(restNote, contentWidth - 8);
      doc.text(restLines, margin + 4, y + 8.5);

      y += 14;
    }

    // 4. COOL-DOWN (if applicable)
    if (!isRest && day.cooldown?.trim()) {
      const coolContent = `Cool-Down: ${day.cooldown.trim()}`;
      const coolLines = doc.splitTextToSize(coolContent, contentWidth - 8);
      const coolBoxHeight = coolLines.length * 3.4 + 4;

      ensureSpace(coolBoxHeight + 3);
      doc.setFillColor(248, 251, 254);
      doc.setDrawColor(215, 228, 240);
      doc.setLineWidth(0.25);
      doc.roundedRect(margin, y, contentWidth, coolBoxHeight, 1.2, 1.2, 'FD');

      doc.setFontSize(7.2);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(50, 90, 140);
      doc.text(coolLines[0], margin + 4, y + 4.2);

      if (coolLines.length > 1) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 75, 90);
        for (let l = 1; l < coolLines.length; l++) {
          doc.text(coolLines[l], margin + 4, y + 4.2 + l * 3.4);
        }
      }

      y += coolBoxHeight + 2.5;
    }

    y += 5; // Spacing between consecutive workout days
  });

  // =========================================================================
  // 6. WEIGHT PROGRESS & TRACKING LOG (Real User Entries Only)
  // =========================================================================
  if (weightLogs && weightLogs.length > 0) {
    ensureSpace(20);
    drawSectionHeader('Weight Progress & Check-In History');

    const logStr = weightLogs
      .map((entry) => `${entry.weight} kg (${entry.date})`)
      .join('   ·   ');
    const logLines = doc.splitTextToSize(logStr, contentWidth - 10);
    const weightCardHeight = Math.max(14, logLines.length * 3.6 + 7);

    ensureSpace(weightCardHeight + 3);
    doc.setFillColor(250, 252, 248);
    doc.setDrawColor(220, 228, 215);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, weightCardHeight, 2, 2, 'FD');

    doc.setFontSize(7.2);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(90, 115, 70);
    doc.text('LOGGED CHECK-INS:', margin + 4.5, y + 5);

    doc.setFontSize(7.6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(24, 32, 24);
    doc.text(logLines, margin + 4.5, y + 9.5);

    y += weightCardHeight + 5;
  }

  // =========================================================================
  // 7. MEDICAL & SAFETY DISCLAIMER (Cleanly Wrapped, Always Inside Container)
  // =========================================================================
  const disclaimerText =
    'MEDICAL & SAFETY NOTICE: FitBuddy fitness routines and nutritional estimates are generated for educational and general health guidance purposes only. ' +
    'Always consult a licensed physician or healthcare specialist before commencing any intense exercise program or significant dietary changes. ' +
    'Immediately stop any movement that causes acute pain, dizziness, or abnormal strain.';
  const disLines = doc.splitTextToSize(disclaimerText, contentWidth - 9);
  const disBoxHeight = Math.max(13, disLines.length * 3.2 + 6.5);

  ensureSpace(disBoxHeight + 2);
  doc.setFillColor(254, 244, 244); // Soft Red Tint
  doc.setDrawColor(252, 210, 210);
  doc.setLineWidth(0.35);
  doc.roundedRect(margin, y, contentWidth, disBoxHeight, 2, 2, 'FD');

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 30, 30);
  doc.text(disLines, margin + 4.5, y + 4.8);

  // =========================================================================
  // 8. ADD PROFESSIONAL FOOTERS & PAGINATION ON EVERY PAGE
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Subtle divider line
    doc.setDrawColor(225, 230, 222);
    doc.setLineWidth(0.25);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

    // Left Footer
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(130, 140, 130);
    doc.text(`FitBuddy — AI Fitness & Nutrition Companion · Personalized Plan for ${userName}`, margin, pageHeight - 7);

    // Right Page Number
    doc.setFont('helvetica', 'bold');
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 18, pageHeight - 7);
  }

  // =========================================================================
  // 9. SAVE PDF WITH BLOB FALLBACK
  // =========================================================================
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

export interface GenerateNutritionPdfOptions {
  planRecord: StoredPlanRecord;
  nutritionDays?: DayNutritionPlan[];
}

export async function generateNutritionPlanPdf(options: GenerateNutritionPdfOptions): Promise<void> {
  const { planRecord } = options;
  const nutritionDays = options.nutritionDays || getOrGenerate7DayNutritionPlan(planRecord);
  const metrics = calculateUserNutritionMetrics(planRecord);
  const userName = planRecord.name || 'Athlete';

  let doc: jsPDF;
  try {
    doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });
  } catch (instErr) {
    if (typeof window !== 'undefined' && (window as any).jspdf?.jsPDF) {
      doc = new (window as any).jspdf.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });
    } else {
      throw instErr;
    }
  }

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = 180;
  const maxY = 272;
  const topMarginOnNewPage = 18;
  let y = margin;

  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > maxY) {
      doc.addPage();
      y = topMarginOnNewPage;
    }
  };

  // 1. BRAND HEADER BANNER
  doc.setFillColor(24, 32, 24); // #182018
  doc.roundedRect(margin, y, contentWidth, 24, 2.5, 2.5, 'F');

  // Lime Monogram Box
  doc.setFillColor(217, 246, 91); // #d9f65b
  doc.roundedRect(margin + 5, y + 4.5, 12, 15, 2, 2, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(24, 32, 24);
  doc.text('FB', margin + 7.2, y + 14.5);

  // Title & Subtitle
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('FitBuddy — 7-Day Personalized Nutrition Plan', margin + 21, y + 10.5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(217, 246, 91);
  doc.text(`Fueling Blueprint for ${userName} · Goal: ${planRecord.goal} · Diet: ${planRecord.diet || 'Vegetarian'}`, margin + 21, y + 16.5);

  const formattedDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(170, 185, 170);
  doc.text(`Generated: ${formattedDate}`, pageWidth - margin - 38, y + 13.5);

  y += 28;

  // 2. ATHLETE PROFILE & TARGETS CARD
  ensureSpace(34);
  doc.setFillColor(248, 250, 246);
  doc.setDrawColor(222, 229, 218);
  doc.setLineWidth(0.35);
  doc.roundedRect(margin, y, contentWidth, 31, 2, 2, 'FD');

  doc.setFontSize(8.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(24, 32, 24);
  doc.text(`ATHLETE PROFILE & DAILY NUTRITIONAL TARGETS`, margin + 5, y + 6);

  doc.setFontSize(7.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 70, 60);

  // Col 1
  doc.text(`Athlete: ${userName}   |   Age: ${planRecord.age || 26} yrs   |   Gender: ${planRecord.gender || 'Male'}`, margin + 5, y + 11.5);
  doc.text(`Weight: ${planRecord.weight || 70} kg   |   Height: ${planRecord.height || 175} cm   |   Diet: ${planRecord.diet || 'Vegetarian'}`, margin + 5, y + 16.5);

  // Target Badges
  const badgeY = y + 20;
  const badges = [
    { label: 'Daily Target', val: `~${metrics.dailyCalories} kcal` },
    { label: 'Daily Protein', val: `${metrics.dailyProtein}g` },
    { label: 'Daily Carbs', val: `~${metrics.dailyCarbs}g` },
    { label: 'Healthy Fats', val: `~${metrics.dailyFats}g` },
    { label: 'Hydration Target', val: metrics.dailyHydration },
  ];

  const badgeW = (contentWidth - 10) / badges.length;
  badges.forEach((b, idx) => {
    const bx = margin + 5 + idx * badgeW;
    doc.setFillColor(idx === 0 || idx === 1 ? 238 : 243, idx === 0 || idx === 1 ? 248 : 246, idx === 0 || idx === 1 ? 201 : 240);
    doc.roundedRect(bx, badgeY, badgeW - 2, 8, 1, 1, 'F');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(90, 110, 70);
    doc.text(b.label, bx + 2, badgeY + 3.2);
    doc.setFontSize(7.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(24, 32, 24);
    doc.text(b.val, bx + 2, badgeY + 6.8);
  });

  y += 36;

  // 3. 7-DAY MEAL PLANS
  nutritionDays.forEach((dayPlan) => {
    ensureSpace(38);

    // Day Header Strip
    doc.setFillColor(24, 32, 24);
    doc.roundedRect(margin, y, contentWidth, 9.5, 1.5, 1.5, 'F');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(217, 246, 91);
    doc.text(dayPlan.day.toUpperCase(), margin + 4, y + 6.2);

    doc.setFontSize(7.2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255);
    const focusStr = dayPlan.focus ? `· ${dayPlan.focus}` : '';
    doc.text(focusStr, margin + 46, y + 6.2);

    // Right side macro targets for the day
    const dayMacroStr = `${dayPlan.estimated_calories} kcal   |   P: ${dayPlan.protein_grams}g   |   C: ${dayPlan.carbs_grams}g   |   F: ${dayPlan.fats_grams}g   |   ${dayPlan.hydration_liters}`;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(217, 246, 91);
    doc.text(dayMacroStr, pageWidth - margin - doc.getTextWidth(dayMacroStr) - 4, y + 6.2);

    y += 11;

    // Meals: 5 complete meals
    const mealsList = [
      { name: 'Breakfast', text: dayPlan.meals.breakfast },
      { name: 'Mid-Morning Snack', text: dayPlan.meals.mid_morning_snack },
      { name: 'Lunch', text: dayPlan.meals.lunch },
      { name: 'Evening Snack', text: dayPlan.meals.evening_snack },
      { name: 'Dinner', text: dayPlan.meals.dinner },
    ];

    mealsList.forEach((m, mIdx) => {
      const mealNameColWidth = 38;
      const mealTextColWidth = contentWidth - mealNameColWidth - 4;

      const lines = doc.splitTextToSize(m.text, mealTextColWidth);
      const rowHeight = Math.max(9, lines.length * 3.6 + 4.5);

      ensureSpace(rowHeight + 1);

      // Alternating row background
      if (mIdx % 2 === 0) {
        doc.setFillColor(252, 253, 250);
      } else {
        doc.setFillColor(245, 248, 242);
      }
      doc.setDrawColor(228, 234, 224);
      doc.setLineWidth(0.2);
      doc.rect(margin, y, contentWidth, rowHeight, 'FD');

      // Meal Name column
      doc.setFontSize(7.6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(24, 32, 24);
      doc.text(m.name, margin + 3.5, y + 5.5);

      // Meal Description column (wrapped with zero overflow)
      doc.setFontSize(7.4);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 70, 60);
      for (let l = 0; l < lines.length; l++) {
        doc.text(lines[l], margin + mealNameColWidth, y + 5.2 + l * 3.6);
      }

      y += rowHeight;
    });

    y += 6; // Spacing after each day
  });

  // 4. HYDRATION & RECOVERY GUIDELINES
  ensureSpace(28);
  doc.setFillColor(240, 248, 255);
  doc.setDrawColor(190, 220, 250);
  doc.setLineWidth(0.35);
  doc.roundedRect(margin, y, contentWidth, 25, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(25, 80, 150);
  doc.text('HYDRATION & NUTRITIONAL RECOVERY GUIDELINES', margin + 4.5, y + 5.5);

  doc.setFontSize(7.4);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 65, 95);
  const hydroNote = `Daily Hydration Target: ${metrics.dailyHydration}. Sip 500ml upon waking, 350-500ml 45 mins prior to workouts, and replenish electrolytes following high-intensity sessions. Prioritize 7.5-8.5 hours of sleep to support nutrient absorption and muscle protein synthesis.`;
  const hydroLines = doc.splitTextToSize(hydroNote, contentWidth - 9);
  for (let l = 0; l < hydroLines.length; l++) {
    doc.text(hydroLines[l], margin + 4.5, y + 10.5 + l * 3.5);
  }

  y += 28;

  // 5. FOOTER & PAGINATION
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(225, 230, 222);
    doc.setLineWidth(0.25);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(130, 140, 130);
    doc.text(`FitBuddy — AI Fitness & Nutrition Companion · 7-Day Nutrition Plan for ${userName}`, margin, pageHeight - 7);

    doc.setFont('helvetica', 'bold');
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 18, pageHeight - 7);
  }

  // 6. SAVE FILE WITH BLOB FALLBACK
  const filename = `FitBuddy-7Day-Nutrition-Plan.pdf`;
  try {
    doc.save(filename);
  } catch (saveErr) {
    console.warn('[FitBuddy Nutrition PDF] doc.save failed, executing blob fallback:', saveErr);
    const blob = doc.output('blob');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}
