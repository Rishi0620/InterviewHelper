from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import os
from dotenv import load_dotenv
import traceback
from typing import Dict, List, Optional
import uvicorn
from pydantic import BaseModel

# Load environment variables early
load_dotenv()


# --- Configuration ---
class Config:
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", "8000"))
    MODEL_NAME = os.getenv("MODEL_NAME", "gpt-4")
    TEMPERATURE = float(os.getenv("TEMPERATURE", "0.3"))
    MAX_TOKENS = int(os.getenv("MAX_TOKENS", "500"))
    DEBUG = os.getenv("DEBUG", "false").lower() == "true"


# Validate configuration
if not Config.OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable not set")


# --- Models ---
class EvaluationRequest(BaseModel):
    code: str
    transcript: str


class EvaluationResponse(BaseModel):
    score: Optional[int]
    strengths: List[str]
    improvements: List[str]
    optimizations: List[str]


# --- Constants ---
SYSTEM_PROMPT = """You're a technical interviewer analyzing code and explanations:
1. Score (1-10) based on correctness and clarity
2. List strengths with "Strengths:" prefix
3. List improvements with "Improvements:" prefix
4. Suggest optimizations with "Optimizations:" prefix"""

# --- Application Setup ---
app = FastAPI(
    title="Code Evaluation API",
    description="API for evaluating code and explanations using AI",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if Config.DEBUG else [
        "http://localhost:3000",
        "https://your-production-domain.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client
client = OpenAI(api_key=Config.OPENAI_API_KEY)


# --- Routes ---
@app.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint"""
    return {"status": "healthy", "model": Config.MODEL_NAME}


@app.post("/evaluate", response_model=EvaluationResponse)
async def evaluate_snapshot(snapshot: EvaluationRequest):
    """
    Evaluate code and explanation

    Args:
        snapshot: Contains 'code' and 'transcript' fields

    Returns:
        Evaluation with score, strengths, improvements, and optimizations
    """
    try:
        response = client.chat.completions.create(
            model=Config.MODEL_NAME,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Code:\n{snapshot.code}\n\nTranscript:\n{snapshot.transcript}"}
            ],
            temperature=Config.TEMPERATURE,
            max_tokens=Config.MAX_TOKENS
        )

        assistant_message = response.choices[0].message.content
        return parse_response(assistant_message)
    except Exception as e:
        if Config.DEBUG:
            traceback.print_exc()
        raise HTTPException(status_code=500, detail="Evaluation failed. Please try again.")


# --- Helper Functions ---
def parse_response(raw_text: str) -> EvaluationResponse:
    """
    Parse the raw response from the AI into structured data

    Args:
        raw_text: The raw text response from the AI

    Returns:
        Structured evaluation response
    """
    result = EvaluationResponse(
        score=None,
        strengths=[],
        improvements=[],
        optimizations=[]
    )

    try:
        # Extract score
        if "Score:" in raw_text:
            score_part = raw_text.split("Score:")[1].split("/10")[0].strip()
            if score_part.isdigit():
                result.score = int(score_part)

        # Extract sections
        sections = {
            "strengths": "Strengths:",
            "improvements": "Improvements:",
            "optimizations": "Optimizations:"
        }

        for key, prefix in sections.items():
            if prefix in raw_text:
                section_text = raw_text.split(prefix)[1]
                # Stop at next section if present
                for other_prefix in [p for p in sections.values() if p != prefix]:
                    if other_prefix in section_text:
                        section_text = section_text.split(other_prefix)[0]
                # Clean and split items
                items = [
                    item.strip()
                    for item in section_text.split("\n")
                    if item.strip() and not item.startswith(("-", "*"))
                ]
                setattr(result, key, items)

    except Exception as e:
        if Config.DEBUG:
            print(f"Error parsing response: {e}")

    return result


# --- Main Execution ---
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=Config.HOST,
        port=Config.PORT,
        reload=Config.DEBUG,
        workers=1 if Config.DEBUG else 4
    )