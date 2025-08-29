"""
Utility functions for error handling, logging, and common operations.
"""

import logging
import sys
import json
import traceback
from typing import Dict, Any, Optional, Union
from datetime import datetime
import asyncio
from functools import wraps
import time

from fastapi import HTTPException


# Configure structured logging
class StructuredLogger:
    """Structured logger for production applications."""
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        
    def _log(self, level: str, message: str, **kwargs):
        """Log structured message."""
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': level,
            'message': message,
            'service': 'interview-coach-api',
            **kwargs
        }
        
        if level.lower() == 'error':
            self.logger.error(json.dumps(log_data))
        elif level.lower() == 'warning':
            self.logger.warning(json.dumps(log_data))
        elif level.lower() == 'info':
            self.logger.info(json.dumps(log_data))
        else:
            self.logger.debug(json.dumps(log_data))
    
    def info(self, message: str, **kwargs):
        self._log('INFO', message, **kwargs)
    
    def warning(self, message: str, **kwargs):
        self._log('WARNING', message, **kwargs)
    
    def error(self, message: str, **kwargs):
        self._log('ERROR', message, **kwargs)
    
    def debug(self, message: str, **kwargs):
        self._log('DEBUG', message, **kwargs)


# Global logger instance
logger = StructuredLogger(__name__)


class ErrorHandler:
    """Centralized error handling and reporting."""
    
    @staticmethod
    def handle_openai_error(error: Exception) -> HTTPException:
        """Handle OpenAI API errors."""
        error_msg = str(error)
        
        # Rate limit errors
        if 'rate limit' in error_msg.lower():
            logger.warning("OpenAI rate limit exceeded", error=error_msg)
            return HTTPException(
                status_code=429,
                detail="AI service is temporarily busy. Please try again in a moment."
            )
        
        # Authentication errors
        if 'authentication' in error_msg.lower() or 'api key' in error_msg.lower():
            logger.error("OpenAI authentication failed", error=error_msg)
            return HTTPException(
                status_code=503,
                detail="AI service configuration error. Please contact support."
            )
        
        # Quota/billing errors
        if 'quota' in error_msg.lower() or 'billing' in error_msg.lower():
            logger.error("OpenAI quota exceeded", error=error_msg)
            return HTTPException(
                status_code=503,
                detail="AI service is temporarily unavailable. Please try again later."
            )
        
        # Generic OpenAI errors
        logger.error("OpenAI API error", error=error_msg)
        return HTTPException(
            status_code=503,
            detail="AI service error. Please try again."
        )
    
    @staticmethod
    def handle_validation_error(error: Exception) -> HTTPException:
        """Handle validation errors."""
        logger.warning("Validation error", error=str(error))
        return HTTPException(
            status_code=400,
            detail=f"Invalid input: {str(error)}"
        )
    
    @staticmethod
    def handle_generic_error(error: Exception, request_id: str = None) -> HTTPException:
        """Handle generic errors with proper logging."""
        error_id = f"error_{int(time.time())}"
        
        logger.error(
            "Unhandled exception",
            error_id=error_id,
            request_id=request_id,
            error=str(error),
            traceback=traceback.format_exc()
        )
        
        return HTTPException(
            status_code=500,
            detail=f"Internal server error (ID: {error_id})"
        )


def retry_async(max_attempts: int = 3, delay: float = 1.0, backoff: float = 2.0):
    """Async retry decorator with exponential backoff."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_delay = delay
            last_exception = None
            
            for attempt in range(max_attempts):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    
                    if attempt == max_attempts - 1:
                        logger.error(
                            f"Function {func.__name__} failed after {max_attempts} attempts",
                            error=str(e)
                        )
                        raise
                    
                    logger.warning(
                        f"Function {func.__name__} failed on attempt {attempt + 1}",
                        error=str(e),
                        retry_in=current_delay
                    )
                    
                    await asyncio.sleep(current_delay)
                    current_delay *= backoff
            
            # This shouldn't be reached, but just in case
            raise last_exception
        
        return wrapper
    return decorator


def sanitize_text(text: str, max_length: int = 1000, remove_html: bool = True) -> str:
    """Sanitize text input for security and processing."""
    if not text:
        return ""
    
    # Basic length limit
    sanitized = text.strip()[:max_length]
    
    if remove_html:
        # Basic HTML tag removal
        import re
        sanitized = re.sub(r'<[^>]+>', '', sanitized)
        
        # Remove script tags and javascript
        sanitized = re.sub(r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', '', sanitized, flags=re.IGNORECASE)
        sanitized = sanitized.replace('javascript:', '')
        
        # Remove potentially dangerous attributes
        sanitized = re.sub(r'on\w+\s*=', '', sanitized, flags=re.IGNORECASE)
    
    return sanitized


def validate_request_size(content: Union[str, dict], max_size: int = 10000) -> bool:
    """Validate request content size."""
    if isinstance(content, str):
        return len(content) <= max_size
    elif isinstance(content, dict):
        return len(json.dumps(content)) <= max_size
    return True


class PerformanceMonitor:
    """Monitor performance and resource usage."""
    
    def __init__(self):
        self.metrics = {}
    
    def record_metric(self, name: str, value: float, tags: Dict[str, str] = None):
        """Record a performance metric."""
        timestamp = datetime.utcnow().isoformat()
        
        if name not in self.metrics:
            self.metrics[name] = []
        
        self.metrics[name].append({
            'value': value,
            'timestamp': timestamp,
            'tags': tags or {}
        })
        
        # Keep only last 1000 metrics per type
        if len(self.metrics[name]) > 1000:
            self.metrics[name] = self.metrics[name][-1000:]
    
    def get_average(self, name: str, last_n: int = 10) -> Optional[float]:
        """Get average of last N metrics."""
        if name not in self.metrics or not self.metrics[name]:
            return None
        
        recent_values = [m['value'] for m in self.metrics[name][-last_n:]]
        return sum(recent_values) / len(recent_values)


# Global performance monitor
performance_monitor = PerformanceMonitor()


def monitor_performance(metric_name: str = None):
    """Decorator to monitor function performance."""
    def decorator(func):
        name = metric_name or f"{func.__module__}.{func.__name__}"
        
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start_time
                performance_monitor.record_metric(
                    f"{name}_duration",
                    duration,
                    {'status': 'success'}
                )
                return result
            except Exception as e:
                duration = time.time() - start_time
                performance_monitor.record_metric(
                    f"{name}_duration",
                    duration,
                    {'status': 'error', 'error': str(e)}
                )
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                performance_monitor.record_metric(
                    f"{name}_duration",
                    duration,
                    {'status': 'success'}
                )
                return result
            except Exception as e:
                duration = time.time() - start_time
                performance_monitor.record_metric(
                    f"{name}_duration",
                    duration,
                    {'status': 'error', 'error': str(e)}
                )
                raise
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    
    return decorator


class HealthChecker:
    """Application health checking utilities."""
    
    @staticmethod
    async def check_openai_connection() -> Dict[str, Any]:
        """Check OpenAI API connectivity."""
        try:
            from openai import OpenAI
            from config import settings
            
            client = OpenAI(api_key=settings.openai_api_key)
            
            # Test with minimal request
            response = client.chat.completions.create(
                model=settings.model_name,
                messages=[{"role": "user", "content": "test"}],
                max_tokens=1,
                timeout=5.0
            )
            
            return {
                'status': 'healthy',
                'response_time_ms': 0,  # Would need to measure this
                'model': settings.model_name
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e)
            }
    
    @staticmethod
    def get_system_health() -> Dict[str, Any]:
        """Get system health metrics."""
        import psutil
        
        try:
            return {
                'cpu_percent': psutil.cpu_percent(interval=1),
                'memory_percent': psutil.virtual_memory().percent,
                'disk_percent': psutil.disk_usage('/').percent,
                'load_average': psutil.getloadavg() if hasattr(psutil, 'getloadavg') else None
            }
        except Exception as e:
            logger.warning("Failed to get system metrics", error=str(e))
            return {'error': str(e)}


def setup_exception_handler():
    """Setup global exception handler."""
    def handle_exception(exc_type, exc_value, exc_traceback):
        if issubclass(exc_type, KeyboardInterrupt):
            sys.__excepthook__(exc_type, exc_value, exc_traceback)
            return
        
        logger.error(
            "Uncaught exception",
            exc_type=exc_type.__name__,
            exc_value=str(exc_value),
            traceback=traceback.format_exception(exc_type, exc_value, exc_traceback)
        )
    
    sys.excepthook = handle_exception
