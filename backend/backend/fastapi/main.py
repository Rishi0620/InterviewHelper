"""
Production-ready FastAPI application for code evaluation using AI.
"""

import logging
import traceback
from contextlib import asynccontextmanager
from typing import Dict, List, Optional
import time

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from openai import OpenAI
from pydantic import BaseModel, Field
import uvicorn

from config import settings


# Configure logging
logger = logging.getLogger(__name__)

# Initialize OpenAI client
openai_client = OpenAI(api_key=settings.openai_api_key)


# === Models ===
class EvaluationRequest(BaseModel):
    """Request model for code evaluation."""
    code: str = Field(..., min_length=1, max_length=10000, description="Code to evaluate")
    transcript: str = Field(..., max_length=5000, description="Audio transcript")
    language: str = Field(default="javascript", description="Programming language")
    question: Optional[str] = Field(None, max_length=1000, description="Interview question context")
    problem_details: Optional[Dict] = Field(None, description="LeetCode problem details")
    timestamp: Optional[int] = Field(None, description="Request timestamp")


class EvaluationResponse(BaseModel):
    """Response model for code evaluation."""
    score: Optional[int] = Field(None, ge=0, le=10, description="Code quality score (0-10)")
    strengths: List[str] = Field(default_factory=list, description="Code strengths")
    improvements: List[str] = Field(default_factory=list, description="Areas for improvement")
    optimizations: List[str] = Field(default_factory=list, description="Optimization suggestions")
    feedback_id: str = Field(..., description="Unique feedback identifier")
    processing_time_ms: float = Field(..., description="Processing time in milliseconds")


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str
    model: str
    environment: str
    timestamp: int
    uptime_seconds: float


# === Global State ===
app_start_time = time.time()


# === Lifespan Management ===
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management."""
    logger.info("Starting FastAPI application...")
    
    # Startup
    try:
        # Validate OpenAI connection
        await validate_openai_connection()
        logger.info("OpenAI connection validated successfully")
    except Exception as e:
        logger.error(f"Failed to validate OpenAI connection: {e}")
        if settings.is_production:
            raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down FastAPI application...")


async def validate_openai_connection():
    """Validate OpenAI API connection."""
    try:
        # Test with a minimal request
        response = openai_client.chat.completions.create(
            model=settings.model_name,
            messages=[{"role": "user", "content": "test"}],
            max_tokens=1,
            temperature=0
        )
        return True
    except Exception as e:
        logger.error(f"OpenAI validation failed: {e}")
        raise


# === Application Setup ===
app = FastAPI(
    title="Code Evaluation API",
    description="Production-ready API for evaluating code and explanations using AI",
    version="1.0.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    lifespan=lifespan
)


# === Middleware ===
# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Trusted Host (for production)
if settings.is_production:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*"]  # Configure this properly for production
    )


# === Request/Response Middleware ===
@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    """Log all requests and responses."""
    start_time = time.time()
    
    # Log request
    logger.info(f"Request: {request.method} {request.url}")
    
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        
        # Log response
        logger.info(
            f"Response: {response.status_code} - "
            f"Time: {process_time:.3f}s - "
            f"Path: {request.url.path}"
        )
        
        # Add timing header
        response.headers["X-Process-Time"] = str(process_time)
        
        return response
    except Exception as e:
        process_time = time.time() - start_time
        logger.error(f"Request failed: {e} - Time: {process_time:.3f}s")
        raise


# === Exception Handlers ===
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions."""
    logger.warning(f"HTTP exception: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "path": str(request.url.path)
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions."""
    error_id = f"error_{int(time.time())}"
    
    logger.error(
        f"Unhandled exception [{error_id}]: {exc}",
        extra={"error_id": error_id, "path": str(request.url.path)}
    )
    
    if settings.debug:
        logger.error(traceback.format_exc())
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "error_id": error_id,
            "message": "An unexpected error occurred. Please try again later."
        }
    )


# === Helper Functions ===
def create_system_prompt() -> str:
    """Create the system prompt for AI evaluation."""
    return """You are a technical interviewer analyzing code and explanations.

Provide evaluation in this exact format:
1. Score: [0-10] based on correctness, clarity, and approach
2. Strengths: List specific positive aspects
3. Improvements: List areas that need work
4. Optimizations: Suggest performance or code quality improvements

Be constructive, specific, and focus on teaching moments."""


def parse_ai_response(raw_text: str) -> Dict:
    """Parse AI response into structured data."""
    result = {
        "score": None,
        "strengths": [],
        "improvements": [],
        "optimizations": []
    }
    
    try:
        lines = raw_text.strip().split('\n')
        current_section = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Check for section headers
            if line.lower().startswith('score:'):
                score_text = line.split(':', 1)[1].strip()
                try:
                    # Extract number from score text
                    score_num = ''.join(filter(str.isdigit, score_text.split()[0]))
                    if score_num:
                        result["score"] = min(10, max(0, int(score_num)))
                except (ValueError, IndexError):
                    pass
            elif line.lower().startswith('strengths:'):
                current_section = 'strengths'
            elif line.lower().startswith('improvements:'):
                current_section = 'improvements'
            elif line.lower().startswith('optimizations:'):
                current_section = 'optimizations'
            elif current_section and line.startswith(('-', '•', '*', '1.', '2.', '3.')):
                # Extract bullet point content
                content = line.lstrip('-•*123456789. ').strip()
                if content and len(content) > 5:  # Avoid very short entries
                    result[current_section].append(content[:200])  # Limit length
    
    except Exception as e:
        logger.warning(f"Error parsing AI response: {e}")
    
    return result


def sanitize_input(text: str, max_length: int = 1000) -> str:
    """Sanitize and validate input text."""
    if not text:
        return ""
    
    # Basic sanitization
    cleaned = text.strip()[:max_length]
    
    # Remove potentially harmful content
    cleaned = cleaned.replace('<script', '&lt;script')
    cleaned = cleaned.replace('javascript:', '')
    
    return cleaned


# === Routes ===
@app.get("/", include_in_schema=False)
async def root():
    """Root endpoint redirect."""
    return {"message": "Code Evaluation API", "docs": "/docs"}


@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Comprehensive health check endpoint."""
    current_time = time.time()
    uptime = current_time - app_start_time
    
    return HealthResponse(
        status="healthy",
        model=settings.model_name,
        environment=settings.environment,
        timestamp=int(current_time),
        uptime_seconds=round(uptime, 2)
    )


@app.get("/health/ready")
async def readiness_check():
    """Kubernetes readiness probe."""
    try:
        # Quick OpenAI connectivity check
        await validate_openai_connection()
        return {"status": "ready"}
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        raise HTTPException(status_code=503, detail="Service not ready")


@app.get("/metrics", include_in_schema=False)
async def metrics():
    """Basic metrics endpoint."""
    uptime = time.time() - app_start_time
    return {
        "uptime_seconds": uptime,
        "environment": settings.environment,
        "model": settings.model_name
    }


@app.post("/evaluate", response_model=EvaluationResponse)
async def evaluate_code(request: EvaluationRequest) -> EvaluationResponse:
    """
    Evaluate code and explanation using AI.
    
    This endpoint analyzes the provided code and transcript to give
    constructive feedback on the coding approach and explanation.
    """
    start_time = time.time()
    feedback_id = f"eval_{int(start_time * 1000)}"
    
    logger.info(f"Starting evaluation [{feedback_id}]")
    
    try:
        # Sanitize inputs
        code = sanitize_input(request.code, 8000)
        transcript = sanitize_input(request.transcript, 3000)
        language = sanitize_input(request.language, 20)
        question = sanitize_input(request.question or "", 500)
        
        if not code.strip():
            raise HTTPException(status_code=400, detail="Code cannot be empty")
        
        # Build evaluation prompt
        prompt_parts = [f"Code ({language}):\n{code}\n"]
        
        if transcript.strip():
            prompt_parts.append(f"Explanation:\n{transcript}\n")
        
        if question.strip():
            prompt_parts.append(f"Question Context:\n{question}\n")
        
        if request.problem_details:
            details = request.problem_details
            prompt_parts.append(
                f"Problem: {details.get('title', 'N/A')} "
                f"({details.get('difficulty', 'N/A')}) - "
                f"{details.get('category', 'N/A')}\n"
            )
        
        evaluation_prompt = "\n".join(prompt_parts)
        
        # Call OpenAI API
        logger.debug(f"Calling OpenAI API for evaluation [{feedback_id}]")
        
        response = openai_client.chat.completions.create(
            model=settings.model_name,
            messages=[
                {"role": "system", "content": create_system_prompt()},
                {"role": "user", "content": evaluation_prompt}
            ],
            temperature=settings.temperature,
            max_tokens=settings.max_tokens,
            timeout=30.0  # 30 second timeout
        )
        
        # Parse response
        ai_response = response.choices[0].message.content
        parsed_result = parse_ai_response(ai_response)
        
        # Calculate processing time
        processing_time = (time.time() - start_time) * 1000
        
        logger.info(f"Evaluation completed [{feedback_id}] - {processing_time:.1f}ms")
        
        return EvaluationResponse(
            score=parsed_result["score"],
            strengths=parsed_result["strengths"],
            improvements=parsed_result["improvements"],
            optimizations=parsed_result["optimizations"],
            feedback_id=feedback_id,
            processing_time_ms=round(processing_time, 1)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        processing_time = (time.time() - start_time) * 1000
        
        logger.error(
            f"Evaluation failed [{feedback_id}]: {e} - {processing_time:.1f}ms"
        )
        
        if settings.debug:
            logger.error(traceback.format_exc())
        
        raise HTTPException(
            status_code=500,
            detail=f"Evaluation failed. Please try again. (ID: {feedback_id})"
        )


# === Development Server ===
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        workers=1 if settings.debug else settings.workers,
        log_level=settings.log_level.lower(),
        access_log=True
    )