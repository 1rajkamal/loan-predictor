"""
LoanPredict AI - Flask Backend
A modern AI-powered loan approval prediction system.
"""

from flask import Flask, render_template, request, jsonify, send_file
import pickle, numpy as np, pandas as pd, json, io, os
from datetime import datetime
import plotly, plotly.graph_objs as go
import plotly.express as px

app = Flask(__name__)
app.secret_key = "loanpredict_ai_secret_2024"

# ── Load ML model ─────────────────────────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")
with open(MODEL_PATH, "rb") as f:
    model = pickle.load(f)

# ── In-memory prediction history (resets on restart) ─────────────────────────
prediction_history = []

# ── Label maps ───────────────────────────────────────────────────────────────
GENDER_MAP       = {"Male": 1, "Female": 0}
MARRIED_MAP      = {"Yes": 1, "No": 0}
EDUCATION_MAP    = {"Graduate": 1, "Not Graduate": 0}
SELF_EMP_MAP     = {"Yes": 1, "No": 0}
PROPERTY_MAP     = {"Urban": 2, "Semiurban": 1, "Rural": 0}
CREDIT_MAP       = {"Yes": 1, "No": 0}


FEATURE_COLS = [
    "Gender", "Married", "Dependents", "Education", "Self_Employed",
    "ApplicantIncome", "CoapplicantIncome", "LoanAmount",
    "Loan_Amount_Term", "Credit_History", "Property_Area",
]

def encode_features(data: dict) -> pd.DataFrame:
    row = {
        "Gender":          GENDER_MAP.get(data["gender"], 1),
        "Married":         MARRIED_MAP.get(data["married"], 0),
        "Dependents":      int(data["dependents"]),
        "Education":       EDUCATION_MAP.get(data["education"], 1),
        "Self_Employed":   SELF_EMP_MAP.get(data["self_employed"], 0),
        "ApplicantIncome": float(data["applicant_income"]),
        "CoapplicantIncome": float(data["coapplicant_income"]),
        "LoanAmount":      float(data["loan_amount"]),
        "Loan_Amount_Term": float(data["loan_term"]),
        "Credit_History":  CREDIT_MAP.get(data["credit_history"], 1),
        "Property_Area":   PROPERTY_MAP.get(data["property_area"], 2),
    }
    return pd.DataFrame([row], columns=FEATURE_COLS)


def risk_level(prob: float) -> str:
    if prob >= 0.75:
        return "Low"
    elif prob >= 0.50:
        return "Medium"
    return "High"


def recommendation(approved: bool, prob: float, data: dict) -> str:
    if approved:
        msgs = []
        if float(data.get("credit_history_score", 1)) < 1:
            msgs.append("Maintain a strong credit history to secure better rates.")
        if float(data.get("loan_amount", 0)) > 300:
            msgs.append("Consider reducing the loan amount to lower your EMI burden.")
        msgs.append("Congratulations! Your application profile is strong. Proceed with documentation.")
        return " ".join(msgs[-2:])
    else:
        tips = []
        if data.get("credit_history") == "No":
            tips.append("Improve your credit score — it's the strongest approval factor.")
        if float(data.get("applicant_income", 0)) < 3000:
            tips.append("A higher income or co-applicant income significantly boosts approval odds.")
        if float(data.get("loan_amount", 0)) > 200:
            tips.append("Reducing the requested loan amount may improve your eligibility.")
        tips.append("Consider reapplying after 3–6 months with improved financials.")
        return " ".join(tips[:2])


# ══════════════════════════════════════════════════════════════════════════════
#  ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/predict")
def predict_page():
    return render_template("predict.html")


@app.route("/dashboard")
def dashboard():
    return render_template("dashboard.html")


@app.route("/about")
def about():
    return render_template("about.html")


# ── REST: prediction ──────────────────────────────────────────────────────────
@app.route("/api/predict", methods=["POST"])
def api_predict():
    try:
        data = request.get_json()
        X = encode_features(data)
        prob = float(model.predict_proba(X)[0][1])
        approved = prob >= 0.5
        result = {
            "approved": approved,
            "probability": round(prob * 100, 1),
            "risk_level": risk_level(prob),
            "confidence": round(min(prob, 1 - prob) * 2 * 100, 1) if prob < 0.5
                          else round((prob - 0.5) * 2 * 100, 1),
            "recommendation": recommendation(approved, prob, data),
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }
        # Store in history
        entry = {**data, **result, "id": len(prediction_history) + 1}
        prediction_history.append(entry)
        return jsonify({"success": True, "result": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


# ── REST: analytics charts ────────────────────────────────────────────────────
@app.route("/api/analytics")
def api_analytics():
    try:
        df = pd.read_csv("data/loan_data.csv")

        # 1. Approval distribution donut
        counts = df["Loan_Status"].value_counts()
        donut = go.Figure(go.Pie(
            labels=["Approved", "Rejected"],
            values=[int(counts.get(1, 0)), int(counts.get(0, 0))],
            hole=0.55,
            marker_colors=["#4f8ef7", "#a855f7"],
            textfont_size=14,
        ))
        donut.update_layout(
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            font_color="#e2e8f0",
            margin=dict(t=20, b=20, l=20, r=20),
            showlegend=True,
            legend=dict(orientation="h", yanchor="bottom", y=-0.15),
        )

        # 2. Income histogram
        income_fig = go.Figure()
        income_fig.add_trace(go.Histogram(
            x=df[df["Loan_Status"] == 1]["ApplicantIncome"],
            name="Approved", marker_color="#4f8ef7", opacity=0.75, nbinsx=30))
        income_fig.add_trace(go.Histogram(
            x=df[df["Loan_Status"] == 0]["ApplicantIncome"],
            name="Rejected", marker_color="#a855f7", opacity=0.75, nbinsx=30))
        income_fig.update_layout(
            barmode="overlay",
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            font_color="#e2e8f0",
            xaxis=dict(gridcolor="rgba(255,255,255,0.08)", title="Applicant Income ($)"),
            yaxis=dict(gridcolor="rgba(255,255,255,0.08)", title="Count"),
            margin=dict(t=20, b=40, l=40, r=20),
            legend=dict(orientation="h", yanchor="bottom", y=-0.25),
        )

        # 3. Credit history bar
        ch = df.groupby(["Credit_History", "Loan_Status"]).size().unstack(fill_value=0)
        credit_fig = go.Figure()
        credit_fig.add_trace(go.Bar(
            x=["No Credit History", "Good Credit History"],
            y=[int(ch.loc[0, 1]) if 0 in ch.index else 0,
               int(ch.loc[1, 1]) if 1 in ch.index else 0],
            name="Approved", marker_color="#4f8ef7"))
        credit_fig.add_trace(go.Bar(
            x=["No Credit History", "Good Credit History"],
            y=[int(ch.loc[0, 0]) if 0 in ch.index else 0,
               int(ch.loc[1, 0]) if 1 in ch.index else 0],
            name="Rejected", marker_color="#a855f7"))
        credit_fig.update_layout(
            barmode="group",
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            font_color="#e2e8f0",
            xaxis=dict(gridcolor="rgba(255,255,255,0.08)"),
            yaxis=dict(gridcolor="rgba(255,255,255,0.08)", title="Count"),
            margin=dict(t=20, b=40, l=40, r=20),
            legend=dict(orientation="h", yanchor="bottom", y=-0.3),
        )

        # 4. Property area bar
        pa_map = {0: "Rural", 1: "Semiurban", 2: "Urban"}
        df["Property_Label"] = df["Property_Area"].map(pa_map)
        pa = df.groupby(["Property_Label", "Loan_Status"]).size().unstack(fill_value=0)
        area_fig = go.Figure()
        area_fig.add_trace(go.Bar(
            x=pa.index.tolist(),
            y=pa[1].tolist() if 1 in pa.columns else [0]*len(pa),
            name="Approved", marker_color="#22d3ee"))
        area_fig.add_trace(go.Bar(
            x=pa.index.tolist(),
            y=pa[0].tolist() if 0 in pa.columns else [0]*len(pa),
            name="Rejected", marker_color="#f472b6"))
        area_fig.update_layout(
            barmode="group",
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            font_color="#e2e8f0",
            xaxis=dict(gridcolor="rgba(255,255,255,0.08)"),
            yaxis=dict(gridcolor="rgba(255,255,255,0.08)", title="Count"),
            margin=dict(t=20, b=40, l=40, r=20),
            legend=dict(orientation="h", yanchor="bottom", y=-0.3),
        )

        total = len(df)
        approved_count = int(df["Loan_Status"].sum())
        approval_rate  = round(approved_count / total * 100, 1)
        avg_income     = int(df["ApplicantIncome"].mean())
        avg_loan       = int(df["LoanAmount"].mean())

        return jsonify({
            "success": True,
            "charts": {
                "donut":  json.loads(plotly.io.to_json(donut)),
                "income": json.loads(plotly.io.to_json(income_fig)),
                "credit": json.loads(plotly.io.to_json(credit_fig)),
                "area":   json.loads(plotly.io.to_json(area_fig)),
            },
            "kpis": {
                "total": total,
                "approved": approved_count,
                "approval_rate": approval_rate,
                "avg_income": avg_income,
                "avg_loan": avg_loan,
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── REST: prediction history ──────────────────────────────────────────────────
@app.route("/api/history")
def api_history():
    recent = prediction_history[-20:][::-1]
    return jsonify({"success": True, "history": recent})


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
