# FitBuddy – AI Fitness Plan Generator

FitBuddy is an AI-powered fitness planning web application that generates personalized **7-day workout plans** based on the user's age, weight, fitness goal, and workout intensity.

## 🚀 Features

* 🏋️ Personalized 7-day workout plans
* 🤖 AI-generated fitness recommendations using Gemini
* 🎯 Fitness goals:

  * Weight Loss
  * Muscle Gain
  * General Wellness
* ⚡ Workout intensity:

  * Low
  * Medium
  * High
* ⏱️ Workout timers
* 🥗 Nutrition tips
* 😴 Recovery and rest tips
* 💬 User feedback support
* 📱 Responsive and colorful UI

## 🛠️ Technologies Used

### Frontend

* HTML
* CSS
* JavaScript
* Jinja2 Templates

### Backend

* Python
* FastAPI

### AI

* Google Gemini API

### Database

* SQLite

## 📂 Project Structure

```text
FitBuddy/
│
├── app.py
├── database.py
├── requirements.txt
├── .env
│
├── templates/
│   └── index.html
│
├── static/
│   └── style.css
│
└── README.md
```

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone <your-github-repository-url>
cd FitBuddy
```

### 2. Create a virtual environment

```bash
python -m venv venv
```

### 3. Activate the environment

**Windows:**

```bash
venv\Scripts\activate
```

### 4. Install dependencies

```bash
pip install -r requirements.txt
```

### 5. Add Gemini API Key

Create a `.env` file:

```text
GEMINI_API_KEY=your_api_key_here
```

### 6. Run the application

```bash
uvicorn app:app --reload
```

Open the application in your browser:

```text
http://127.0.0.1:8000
```

## 🔄 How It Works

1. User enters their personal fitness details.
2. User selects a fitness goal.
3. User selects workout intensity.
4. FitBuddy sends the information to the AI model.
5. Gemini generates a personalized 7-day fitness plan.
6. The plan displays workouts, nutrition suggestions, and recovery tips.
7. Users can use the built-in workout timers while exercising.

## 🎯 Project Objective

The main objective of FitBuddy is to provide users with a simple and personalized fitness planning experience using **Generative AI**, without requiring a personal trainer for basic workout planning.

## 🔮 Future Enhancements

* User login and registration
* Workout progress tracking
* Fitness history
* Calorie tracking
* Exercise videos
* Personalized meal plans
* Mobile application
* AI fitness chatbot

## 👩‍💻 Project

**FitBuddy – AI Fitness Plan Generator using Gemini Models**

Developed as part of the **SkillWallet / Nan Mudhalvan Generative AI project**.

---

⭐ If you find this project useful, consider giving the repository a star!
