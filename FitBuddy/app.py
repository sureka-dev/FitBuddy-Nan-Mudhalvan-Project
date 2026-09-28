"""
FitBuddy - AI Fitness Plan Generator Using Gemini
A College Nan Mudhalvan / SkillWallet Project
Tech Stack: Python 3.13, FastAPI, Jinja2, SQLite, Google Gemini API
"""

import os
import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, List

from fastapi import FastAPI, Request, Form, HTTPException, status
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Base directory for the project
BASE_DIR = Path(__file__).resolve().parent

# Ensure the database directory exists
DB_DIR = BASE_DIR / "database"
DB_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DB_DIR / "fitbuddy.db"

# Initialize FastAPI app
app = FastAPI(
    title="FitBuddy - AI Fitness Plan Generator",
    description="College SkillWallet / Nan Mudhalvan Project: AI Fitness Planning with Gemini",
    version="1.0.0"
)

# Mount static files and templates
STATIC_DIR = BASE_DIR / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

TEMPLATES_DIR = BASE_DIR / "templates"
TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))


# ============================================================================
# 1. DATABASE MANAGEMENT (SQLite)
# ============================================================================

def get_db_connection() -> sqlite3.Connection:
    """Creates and returns a connection to the SQLite database with row factory."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Initializes the SQLite database and creates the fitness_plans table if needed."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS fitness_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            age INTEGER NOT NULL,
            weight REAL NOT NULL,
            goal TEXT NOT NULL,
            intensity TEXT NOT NULL,
            plan TEXT NOT NULL,
            feedback TEXT,
            created_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()


# Initialize database upon module import
init_db()


def save_plan_to_db(name: str, age: int, weight: float, goal: str, intensity: str, plan_data: dict, feedback: Optional[str] = None) -> int:
    """Saves a newly generated fitness plan to the SQLite database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
        INSERT INTO fitness_plans (name, age, weight, goal, intensity, plan, feedback, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (name.strip(), age, weight, goal.strip(), intensity.strip(), json.dumps(plan_data), feedback, now_str))
    plan_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return plan_id


def update_plan_in_db(plan_id: int, updated_plan_data: dict, feedback: str) -> bool:
    """Updates an existing plan record in the SQLite database with new Gemini output and user feedback."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE fitness_plans
        SET plan = ?, feedback = ?
        WHERE id = ?
    """, (json.dumps(updated_plan_data), feedback.strip(), plan_id))
    affected = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return affected


def get_plan_by_id(plan_id: int) -> Optional[Dict[str, Any]]:
    """Retrieves a single fitness plan by its primary key ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM fitness_plans WHERE id = ?", (plan_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        row_dict = dict(row)
        try:
            row_dict["plan_data"] = json.loads(row_dict["plan"])
        except Exception:
            row_dict["plan_data"] = None
        return row_dict
    return None


def get_all_plans() -> List[Dict[str, Any]]:
    """Retrieves all saved fitness plans ordered from newest to oldest."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, age, weight, goal, intensity, plan, feedback, created_at FROM fitness_plans ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    
    plans = []
    for r in rows:
        item = dict(r)
        try:
            item["plan_data"] = json.loads(item["plan"])
        except Exception:
            item["plan_data"] = None
        plans.append(item)
    return plans


def delete_plan_by_id(plan_id: int) -> bool:
    """Deletes a plan from the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM fitness_plans WHERE id = ?", (plan_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


# ============================================================================
# 2. GEMINI AI INTEGRATION
# ============================================================================

def get_gemini_client():
    """Initializes and returns the Google GenAI client using GEMINI_API_KEY."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or api_key.strip() == "" or api_key == "your_gemini_api_key_here":
        raise ValueError("GEMINI_API_KEY is not configured in your .env file. Please add a valid key from Google AI Studio.")
    
    from google import genai
    return genai.Client(api_key=api_key)


def generate_fitness_plan_gemini(name: str, age: int, weight: float, goal: str, intensity: str) -> dict:
    """
    Calls the Google Gemini API (gemini-3.8-flash) with a carefully engineered prompt
    to generate a structured 7-day personalized workout plan.
    """
    client = get_gemini_client()
    
    system_instruction = (
        "You are FitBuddy, an AI fitness planning assistant for a college student project. "
        "Generate a practical, general fitness routine based on user profile. "
        "Return exactly 7 days (Monday through Sunday). "
        "Adapt workout difficulty strictly to the selected intensity. "
        "Include active rest and recovery when appropriate. "
        "Keep recommendations general and safe. Do not make medical diagnoses. "
        "Return ONLY a valid JSON object matching the requested schema without markdown backticks or commentary."
    )
    
    user_prompt = f"""
Generate a complete 7-day fitness routine for this user:
- Name: {name}
- Age: {age} years
- Weight: {weight} kg
- Fitness Goal: {goal} (Choices: Weight Loss, Muscle Gain, General Wellness)
- Workout Intensity: {intensity} (Choices: Low, Medium, High)

Format your response as a valid JSON object with this exact structure:
{{
  "summary": "1-2 inspiring sentences explaining this plan's design for {name}.",
  "days": [
    {{
      "day": "Monday",
      "workout_name": "Short descriptive workout name (e.g. Lower Body & Core)",
      "focus": "Muscle groups or fitness aspect focused on",
      "duration": "Duration in minutes (e.g. 45 mins)",
      "is_rest_day": false,
      "intensity": "{intensity}",
      "exercises": [
        {{
          "name": "Exercise Name",
          "sets_reps": "e.g. 3 sets x 12 reps or 30 secs hold",
          "target": "Target muscle group",
          "tip": "Short form or safety tip"
        }}
      ]
    }},
    ... (continue for Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday)
  ],
  "nutrition_tip": "Specific, actionable, non-medical dietary tip aligned with {goal}.",
  "recovery_tip": "Specific recovery, stretching, or sleep advice.",
  "hydration_tip": "Practical daily water intake guidance for {weight}kg at {intensity} intensity.",
  "safety_guidance": "General safe exercise guidance (warm-up, listening to body, stopping on sharp pain)."
}}
"""

    models_to_try = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"]
    last_error = None
    response = None

    for model_name in models_to_try:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=user_prompt,
                config={
                    "system_instruction": system_instruction,
                    "response_mime_type": "application/json"
                }
            )
            if response and response.text:
                break
        except Exception as e:
            last_error = e
            continue

    if not response or not response.text:
        raise last_error or RuntimeError("Gemini failed to generate response.")
    
    response_text = response.text.strip()
    if response_text.startswith("```json"):
        response_text = response_text[7:]
    if response_text.startswith("```"):
        response_text = response_text[3:]
    if response_text.endswith("```"):
        response_text = response_text[:-3]
    response_text = response_text.strip()
    
    plan_dict = json.loads(response_text)
    return plan_dict


def refine_fitness_plan_gemini(original_plan: dict, feedback: str, name: str, age: int, weight: float, goal: str, intensity: str) -> dict:
    """
    Sends the user's feedback along with the previous plan to Gemini to generate
    an updated, improved 7-day fitness plan.
    """
    client = get_gemini_client()
    
    system_instruction = (
        "You are FitBuddy, an AI fitness planning assistant. "
        "Revise the existing 7-day workout plan based specifically on the user's feedback. "
        "Maintain safe recommendations and return a complete revised 7-day schedule. "
        "Return ONLY a valid JSON object matching the requested schema."
    )
    
    user_prompt = f"""
The user wants to update their current fitness plan.
User details:
- Name: {name}, Age: {age}, Weight: {weight} kg, Goal: {goal}, Intensity: {intensity}

Existing Plan:
{json.dumps(original_plan, indent=2)}

User's requested improvements / feedback:
"{feedback}"

Generate a complete updated 7-day plan in JSON with the exact same structure:
{{
  "summary": "Explanation of how the plan was modified to incorporate the feedback: {feedback}",
  "days": [
    {{
      "day": "Monday",
      "workout_name": "...",
      "focus": "...",
      "duration": "...",
      "is_rest_day": false,
      "intensity": "{intensity}",
      "exercises": [
        {{
          "name": "...",
          "sets_reps": "...",
          "target": "...",
          "tip": "..."
        }}
      ]
    }}
    ... for Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
  ],
  "nutrition_tip": "Updated or emphasized nutrition tip.",
  "recovery_tip": "Updated recovery advice based on the new routine.",
  "hydration_tip": "Hydration tip.",
  "safety_guidance": "Safety reminders."
}}
"""

    models_to_try = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"]
    last_error = None
    response = None

    for model_name in models_to_try:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=user_prompt,
                config={
                    "system_instruction": system_instruction,
                    "response_mime_type": "application/json"
                }
            )
            if response and response.text:
                break
        except Exception as e:
            last_error = e
            continue

    if not response or not response.text:
        raise last_error or RuntimeError("Gemini failed to update plan.")
    
    response_text = response.text.strip()
    if response_text.startswith("```json"):
        response_text = response_text[7:]
    if response_text.startswith("```"):
        response_text = response_text[3:]
    if response_text.endswith("```"):
        response_text = response_text[:-3]
    response_text = response_text.strip()
    
    return json.loads(response_text)


# ============================================================================
# 3. FASTAPI ROUTE HANDLERS
# ============================================================================

@app.get("/", response_class=HTMLResponse)
async def home_page(request: Request):
    """Renders the FitBuddy homepage with form and hero section."""
    return templates.TemplateResponse("index.html", {
        "request": request,
        "goals": ["Weight Loss", "Muscle Gain", "General Wellness"],
        "intensities": ["Low", "Medium", "High"]
    })


@app.post("/generate-plan", response_class=HTMLResponse)
async def generate_plan(
    request: Request,
    name: str = Form(...),
    age: int = Form(...),
    weight: float = Form(...),
    goal: str = Form(...),
    intensity: str = Form(...)
):
    """Processes user input, validates, calls Gemini, saves to SQLite, and displays results."""
    # Input validation
    errors = []
    if not name or not name.strip():
        errors.append("Please provide your name.")
    if age < 10 or age > 100:
        errors.append("Please enter a valid age between 10 and 100.")
    if weight < 25.0 or weight > 300.0:
        errors.append("Please enter a valid weight between 25 kg and 300 kg.")
    if goal not in ["Weight Loss", "Muscle Gain", "General Wellness"]:
        errors.append("Please select a valid fitness goal.")
    if intensity not in ["Low", "Medium", "High"]:
        errors.append("Please select a valid workout intensity.")
    
    if errors:
        return templates.TemplateResponse("index.html", {
            "request": request,
            "error_message": " ".join(errors),
            "form_data": {"name": name, "age": age, "weight": weight, "goal": goal, "intensity": intensity},
            "goals": ["Weight Loss", "Muscle Gain", "General Wellness"],
            "intensities": ["Low", "Medium", "High"]
        }, status_code=status.HTTP_400_BAD_REQUEST)

    try:
        # Call Gemini AI
        plan_data = generate_fitness_plan_gemini(
            name=name.strip(),
            age=age,
            weight=weight,
            goal=goal,
            intensity=intensity
        )
        
        # Save to SQLite database
        plan_id = save_plan_to_db(
            name=name.strip(),
            age=age,
            weight=weight,
            goal=goal,
            intensity=intensity,
            plan_data=plan_data
        )
        
        # Fetch newly created record
        plan_record = get_plan_by_id(plan_id)
        
        return templates.TemplateResponse("result.html", {
            "request": request,
            "plan_record": plan_record,
            "is_updated": False,
            "success_message": f"Awesome! Your custom 7-day fitness plan is ready, {name}."
        })
        
    except ValueError as val_err:
        return templates.TemplateResponse("index.html", {
            "request": request,
            "error_message": str(val_err),
            "form_data": {"name": name, "age": age, "weight": weight, "goal": goal, "intensity": intensity},
            "goals": ["Weight Loss", "Muscle Gain", "General Wellness"],
            "intensities": ["Low", "Medium", "High"]
        }, status_code=status.HTTP_400_BAD_REQUEST)
        
    except Exception as exc:
        return templates.TemplateResponse("index.html", {
            "request": request,
            "error_message": f"Unable to generate plan via Gemini API: {str(exc)}. Please check your internet connection or API key.",
            "form_data": {"name": name, "age": age, "weight": weight, "goal": goal, "intensity": intensity},
            "goals": ["Weight Loss", "Muscle Gain", "General Wellness"],
            "intensities": ["Low", "Medium", "High"]
        }, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@app.post("/update-plan", response_class=HTMLResponse)
async def update_plan(
    request: Request,
    plan_id: int = Form(...),
    feedback: str = Form(...)
):
    """Receives user feedback and previous plan, prompts Gemini for an updated routine, and updates SQLite."""
    if not feedback or not feedback.strip():
        plan_record = get_plan_by_id(plan_id)
        return templates.TemplateResponse("result.html", {
            "request": request,
            "plan_record": plan_record,
            "error_message": "Please type your requested adjustments before clicking 'Update My Plan'."
        }, status_code=status.HTTP_400_BAD_REQUEST)
        
    plan_record = get_plan_by_id(plan_id)
    if not plan_record:
        raise HTTPException(status_code=404, detail="Plan not found in database.")
        
    try:
        updated_plan = refine_fitness_plan_gemini(
            original_plan=plan_record["plan_data"],
            feedback=feedback.strip(),
            name=plan_record["name"],
            age=plan_record["age"],
            weight=plan_record["weight"],
            goal=plan_record["goal"],
            intensity=plan_record["intensity"]
        )
        
        # Save updated plan in SQLite
        update_plan_in_db(plan_id, updated_plan, feedback.strip())
        
        # Reload refreshed record
        updated_record = get_plan_by_id(plan_id)
        
        return templates.TemplateResponse("result.html", {
            "request": request,
            "plan_record": updated_record,
            "is_updated": True,
            "success_message": "Plan updated successfully according to your feedback!"
        })
        
    except Exception as exc:
        return templates.TemplateResponse("result.html", {
            "request": request,
            "plan_record": plan_record,
            "error_message": f"Failed to update plan with Gemini: {str(exc)}. Please try again."
        }, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@app.get("/history", response_class=HTMLResponse)
async def history_page(request: Request):
    """Displays saved fitness plans from the SQLite database."""
    plans = get_all_plans()
    return templates.TemplateResponse("history.html", {
        "request": request,
        "plans": plans
    })


@app.get("/plan/{plan_id}", response_class=HTMLResponse)
async def view_plan(request: Request, plan_id: int):
    """Views a specific saved fitness plan by ID."""
    plan_record = get_plan_by_id(plan_id)
    if not plan_record:
        return RedirectResponse(url="/history", status_code=status.HTTP_303_SEE_OTHER)
    return templates.TemplateResponse("result.html", {
        "request": request,
        "plan_record": plan_record,
        "is_updated": bool(plan_record.get("feedback"))
    })


@app.post("/delete-plan/{plan_id}")
async def delete_plan(plan_id: int):
    """Deletes a saved plan from SQLite and redirects to history."""
    delete_plan_by_id(plan_id)
    return RedirectResponse(url="/history", status_code=status.HTTP_303_SEE_OTHER)


@app.get("/api/status")
async def api_status():
    """Health check endpoint for checking application readiness."""
    has_key = bool(os.environ.get("GEMINI_API_KEY"))
    return {
        "status": "healthy",
        "app": "FitBuddy",
        "gemini_api_configured": has_key,
        "database": str(DB_PATH)
    }
