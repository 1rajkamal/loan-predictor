# 🏦 LoanPredict AI

> **AI-powered loan approval prediction system** — Flask + scikit-learn + Plotly + glassmorphism UI

[![Python](https://img.shields.io/badge/Python-3.10+-blue)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-2.3+-green)](https://flask.palletsprojects.com)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.3+-orange)](https://scikit-learn.org)

---

## ✨ Features

- 🤖 **Gradient Boosting ML model** — 90%+ accuracy on loan approval prediction
- ⚡ **REST API** — `/api/predict` returns results in < 200 ms
- 📊 **Analytics Dashboard** — Interactive Plotly charts for approval trends, income distribution, and credit history impact
- 🎨 **Premium dark UI** — Glassmorphism design with gradient accents
- 🌙 **Dark / Light mode toggle**
- 📄 **PDF report export** via browser print
- 📋 **Prediction history table** (session-based)
- 📱 **Fully responsive** — mobile, tablet, desktop

---

## 🚀 Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/yourname/loan-predict-ai.git
cd loan-predict-ai

# 2. Create a virtual environment
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Generate the ML model
python generate_model.py

# 5. Run the app
python app.py
```

Visit **http://localhost:5000** 🎉

---

## 📁 Folder Structure

```
loan-predict-ai/
├── app.py                # Flask app + REST API
├── generate_model.py     # Model training script
├── model.pkl             # Trained GradientBoosting model
├── requirements.txt
├── README.md
│
├── templates/
│   ├── index.html        # Home page
│   ├── predict.html      # Prediction form
│   ├── dashboard.html    # Analytics dashboard
│   └── about.html        # Project info
│
├── static/
│   ├── css/style.css     # Full stylesheet (design tokens, glassmorphism)
│   └── js/main.js        # Interactivity (form, charts, counters, toasts)
│
└── data/
    └── loan_data.csv     # Synthetic training dataset (800 samples)
```

---

## 🔌 API Reference

### `POST /api/predict`

```json
{
  "gender": "Male",
  "married": "Yes",
  "dependents": "1",
  "education": "Graduate",
  "self_employed": "No",
  "applicant_income": "5000",
  "coapplicant_income": "2000",
  "loan_amount": "150",
  "loan_term": "360",
  "credit_history": "Yes",
  "property_area": "Urban"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "approved": true,
    "probability": 87.3,
    "risk_level": "Low",
    "confidence": 74.6,
    "recommendation": "Congratulations! Your application profile is strong.",
    "timestamp": "2025-01-01 12:00:00"
  }
}
```

### `GET /api/analytics`
Returns Plotly chart JSON and KPI statistics.

### `GET /api/history`
Returns the last 20 session predictions.

---

## 🧠 ML Model Details

| Parameter | Value |
|-----------|-------|
| Algorithm | `GradientBoostingClassifier` |
| Estimators | 200 |
| Max Depth | 4 |
| Learning Rate | 0.08 |
| Features | 11 |
| Training Samples | 800 |

**Feature importance ranking:**
1. Credit History (highest weight)
2. Applicant Income
3. Loan Amount
4. Property Area
5. Education
6. Marital Status

---

## 🚢 Production Deployment

```bash
# With Gunicorn (Linux/Mac)
gunicorn -w 4 -b 0.0.0.0:5000 app:app

# With Docker (optional)
docker build -t loanpredict-ai .
docker run -p 5000:5000 loanpredict-ai
```

---

## ⚠️ Disclaimer

This project is built for **educational and portfolio purposes only**. Predictions are not real financial advice. Do not use for actual loan decisions.

---

## 📝 License

MIT License — free to use, modify, and distribute.

---

*Built with ❤️ using Python, Flask, and scikit-learn*
