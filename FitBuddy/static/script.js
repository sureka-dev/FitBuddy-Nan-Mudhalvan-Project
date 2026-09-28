/**
 * FitBuddy – Vanilla JavaScript
 * Handles form validation, interactive feedback, and loading states.
 */

document.addEventListener("DOMContentLoaded", () => {
    // -------------------------------------------------------------------------
    // 1. Planner Form Validation & Loading State
    // -------------------------------------------------------------------------
    const planForm = document.getElementById("fitnessPlanForm");
    const generateBtn = document.getElementById("generateBtn");
    const loadingOverlay = document.getElementById("loadingOverlay");
    const loadingStepText = document.getElementById("loadingStepText");

    if (planForm) {
        planForm.addEventListener("submit", (e) => {
            // Clear previous errors
            clearFormErrors();

            const nameInput = document.getElementById("name");
            const ageInput = document.getElementById("age");
            const weightInput = document.getElementById("weight");
            const goalChecked = document.querySelector('input[name="goal"]:checked');
            const intensityChecked = document.querySelector('input[name="intensity"]:checked');

            let isValid = true;

            // Validate Name
            if (!nameInput.value || nameInput.value.trim().length === 0) {
                showFieldError("nameError", "Please enter your name.");
                isValid = false;
            } else if (nameInput.value.trim().length < 2) {
                showFieldError("nameError", "Name must be at least 2 characters.");
                isValid = false;
            }

            // Validate Age
            const ageVal = parseInt(ageInput.value, 10);
            if (isNaN(ageVal) || ageVal < 10 || ageVal > 100) {
                showFieldError("ageError", "Please enter a valid age between 10 and 100.");
                isValid = false;
            }

            // Validate Weight
            const weightVal = parseFloat(weightInput.value);
            if (isNaN(weightVal) || weightVal < 25 || weightVal > 300) {
                showFieldError("weightError", "Please enter a valid weight between 25 and 300 kg.");
                isValid = false;
            }

            // Validate Goal
            if (!goalChecked) {
                showFieldError("goalError", "Please select your primary fitness goal.");
                isValid = false;
            }

            // Validate Intensity
            if (!intensityChecked) {
                showFieldError("intensityError", "Please select a workout intensity.");
                isValid = false;
            }

            if (!isValid) {
                e.preventDefault();
                return false;
            }

            // If valid, trigger loading overlay and disable double submit
            if (loadingOverlay) {
                loadingOverlay.classList.add("active");
                loadingOverlay.setAttribute("aria-hidden", "false");
                if (generateBtn) {
                    generateBtn.disabled = true;
                    generateBtn.style.opacity = "0.7";
                }
                startLoadingStepsSequence();
            }
        });
    }

    // -------------------------------------------------------------------------
    // 2. Feedback Form (Plan Refinement) Loading State
    // -------------------------------------------------------------------------
    const feedbackForm = document.getElementById("feedbackForm");
    const updatePlanBtn = document.getElementById("updatePlanBtn");
    const feedbackInput = document.getElementById("feedbackInput");

    if (feedbackForm) {
        feedbackForm.addEventListener("submit", (e) => {
            if (!feedbackInput.value || feedbackInput.value.trim().length < 3) {
                e.preventDefault();
                alert("Please describe the adjustments you would like to make before updating.");
                feedbackInput.focus();
                return false;
            }

            if (loadingOverlay) {
                loadingOverlay.classList.add("active");
                loadingOverlay.setAttribute("aria-hidden", "false");
                if (updatePlanBtn) {
                    updatePlanBtn.disabled = true;
                    updatePlanBtn.style.opacity = "0.7";
                }
            }
        });
    }

    // -------------------------------------------------------------------------
    // 3. Helper Functions
    // -------------------------------------------------------------------------
    function showFieldError(elementId, message) {
        const errorElem = document.getElementById(elementId);
        if (errorElem) {
            errorElem.textContent = message;
        }
    }

    function clearFormErrors() {
        const errors = document.querySelectorAll(".field-error");
        errors.forEach(el => el.textContent = "");
    }

    function startLoadingStepsSequence() {
        if (!loadingStepText) return;

        const steps = [
            "Connecting to Google Gemini API...",
            "Analyzing your fitness profile & metabolic requirements...",
            "Structuring 7-day personalized workout schedule...",
            "Calibrating exercise sets, repetitions & rest periods...",
            "Curating targeted nutrition & recovery guidelines...",
            "Saving plan to SQLite database..."
        ];

        let index = 0;
        const interval = setInterval(() => {
            index++;
            if (index < steps.length) {
                loadingStepText.textContent = steps[index];
            } else {
                clearInterval(interval);
            }
        }, 1600);
    }

    // -------------------------------------------------------------------------
    // 4. Smooth Anchor Scrolling
    // -------------------------------------------------------------------------
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId !== "#" && targetId.length > 1) {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    e.preventDefault();
                    targetElement.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
});
