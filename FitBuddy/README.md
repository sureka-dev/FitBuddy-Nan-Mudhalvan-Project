# FitBuddy – AI Fitness Plan Generator Using Gemini

> **College Project:** Nan Mudhalvan / SkillWallet Demonstration Project  
> **Author:** Student Project  
> **Domain:** Generative AI & Web Application Development

FitBuddy is a lightweight, full-stack AI-powered fitness planning web application built with **FastAPI**, **Jinja2**, **SQLite**, and **Google Gemini API**. It creates personalized 7-day workout plans with structured day-by-day routines, sets/reps, duration, rest schedules, and personalized nutrition/recovery guidance based on each user's unique profile.

---

## 🌟 Key Features

1. **Personalized 7-Day Workout Routine:**
   - Day-by-day exercise schedules (Monday through Sunday)
   - Specific exercise names, targeted muscle groups, sets/repetitions, and duration
   - Dedicated rest and recovery days tailored to workout intensity
2. **Goal-Oriented Planning:**
   - Weight Loss
   - Muscle Gain
   - General Wellness
3. **Intensity Adaptation:**
   - Low, Medium, or High workout intensity
4. **Actionable Nutrition & Recovery Tips:**
   - Goal-aligned dietary suggestions and hydration guidance
   - Rest, stretching, and sleep recommendations
5. **Interactive Plan Refinement (Feedback Loop):**
   - Natural language feedback input (e.g., *"Add more core exercises and include 2 rest days"*)
   - Uses Gemini to revise the entire 7-day schedule dynamically
6. **SQLite Persistent Plan History:**
   - Saves every generated and updated plan with timestamps
   - View previous workout plans on `/history`
   - Zero fake demo data — completely authentic to user inputs
7. **Fast & Lightweight:**
   - Optimized for laptops with 4 GB RAM
   - No heavy local neural network models or GPU required
   - Uses Google's cloud-hosted Gemini model

---

## 🛠️ Technology Stack

- **Backend:** Python 3.10+ / Python 3.13, FastAPI, Uvicorn
- **Templating:** Jinja2 (HTML5 dynamic server-side rendering)
- **Database:** SQLite (embedded, zero-configuration)
- **AI Engine:** Google Gemini API (`gemini-3.8-flash`) via `google-genai`
- **Frontend:** Vanilla HTML5, CSS3, Modern Vanilla JavaScript
- **Configuration:** `python-dotenv` for secure environment variables

---

## 📂 Project Structure

```text
FitBuddy/
│
├── app.py                  # Main FastAPI application with routes and Gemini logic
├── requirements.txt        # Python package dependencies
├── .env.example            # Template for environment configuration
├── .gitignore              # Files excluded from git tracking
├── README.md               # Complete project documentation
│
├── database/
│   └── fitbuddy.db         # SQLite database file (created automatically on startup)
│
├── templates/
│   ├── index.html          # Homepage with user input form & fitness hero
│   ├── result.html         # 7-day workout cards, nutrition tips, & feedback form
│   └── history.html        # Saved plans history list
│
└── static/
    ├── style.css           # Modern sports green, cream & dark charcoal styling
    └── script.js           # Vanilla JavaScript for validation & loading states
```

---

## 📋 Prerequisites

- **Python:** Version 3.10 or higher (Python 3.13 fully supported)
- **Gemini API Key:** Free API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Internet connection:** Required for Gemini API calls

---

## 🚀 Setup & Installation (Step-by-Step)

### Step 1: Open Terminal / Command Prompt
Navigate to the `FitBuddy` project folder:
```bash
cd FitBuddy
```

### Step 2: Create a Python Virtual Environment
Creating a virtual environment ensures clean dependency isolation:

- **Windows (Command Prompt / PowerShell):**
  ```bash
  python -m venv venv
  venv\Scripts\activate
  ```

- **macOS / Linux:**
  ```bash
  python3 -m venv venv
  source venv/bin/activate
  ```

### Step 3: Install Required Dependencies
Install the required packages using pip:
```bash
pip install -r requirements.txt
```

### Step 4: Configure the Gemini API Key
1. Copy `.env.example` to create `.env`:
   - On Windows: `copy .env.example .env`
   - On Linux/macOS: `cp .env.example .env`
2. Open `.env` in a text editor and enter your Gemini API key:
   ```ini
   GEMINI_API_KEY=AIzaSyYourActualGeminiAPIKeyHere
   ```

### Step 5: Start the Application Server
Run the FastAPI development server with Uvicorn:
```bash
uvicorn app:app --reload
```

### Step 6: Access FitBuddy in Your Browser
Open your browser and navigate to:
```text
http://127.0.0.1:8000
```

---

## 🔄 Application Workflow

```text
[ User Enters Details ] (Name, Age, Weight, Goal, Intensity)
          │
          ▼
[ Frontend Validation ] (Vanilla JS verifies positive values & required fields)
          │
          ▼
[ FastAPI POST /generate-plan ]
          │
          ▼
[ Prompt Engineering ] (Structured system instructions for safe 7-day plan)
          │
          ▼
[ Google Gemini API ] (gemini-3.8-flash produces structured JSON plan)
          │
          ▼
[ SQLite Database ] (Records saved to database/fitbuddy.db)
          │
          ▼
[ Jinja2 Template ] (Renders result.html with 7-day workout cards)
          │
          ▼
[ User Feedback (Optional) ] ──► [ Gemini Refinement ] ──► [ Updated Plan ]
```

---

## 🗄️ Database Schema

The SQLite database (`database/fitbuddy.db`) is initialized automatically when `app.py` boots.

Table: `fitness_plans`
| Column | Type | Description |
|---|---|---|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | Unique ID for each generated plan |
| `name` | TEXT NOT NULL | User's full or preferred name |
| `age` | INTEGER NOT NULL | User's age in years |
| `weight` | REAL NOT NULL | User's weight in kilograms (kg) |
| `goal` | TEXT NOT NULL | Weight Loss / Muscle Gain / General Wellness |
| `intensity` | TEXT NOT NULL | Low / Medium / High |
| `plan` | TEXT NOT NULL | Full JSON string of the 7-day routine |
| `feedback` | TEXT | User improvement requests (if submitted) |
| `created_at` | TEXT NOT NULL | UTC timestamp formatted as `YYYY-MM-DD HH:MM:SS` |

---

## 🛡️ Health & Safety Disclaimer

FitBuddy is an educational AI application designed for academic demonstration.

> **Disclaimer:** FitBuddy provides general fitness guidance and is not a substitute for professional medical, nutritional, or fitness advice. Consult a qualified healthcare or fitness professional if you have medical conditions, injuries, or concerns before starting any new exercise program.

---

## 📤 Uploading to GitHub

To submit this project or push to GitHub:
```bash
git init
git add .
git commit -m "Initial commit: FitBuddy AI Fitness Plan Generator"
git branch -M main
git remote add origin https://github.com/your-username/fitbuddy.git
git push -u origin main
```
*(Note: `.env` and `database/*.db` are excluded by `.gitignore` to protect credentials and private records).*

---

## 🎓 SkillWallet / Nan Mudhalvan Stories Checklist

- [x] Story 1: Pre-Requisites (Python 3, FastAPI, Gemini API)
- [x] Story 2: Project Workflow & Architecture
- [x] Story 3: Generative AI Model Selection (Gemini 3.8 Flash)
- [x] Story 4: Application Architecture Definition
- [x] Story 5: Development Environment Setup
- [x] Story 6: Core Functionalities (Generation, History, Refinement)
- [x] Story 7: FastAPI Routing & Request Validation
- [x] Story 8: Main Logic in `app.py`
- [x] Story 9: Responsive UI Design with Sports Green/Cream Palette
- [x] Story 10: Dynamic Jinja2 Templating
- [x] Story 11: Local Deployment Readiness
- [x] Story 12: Testing & Verification
- [x] Story 13: Project Documentation & Conclusion
