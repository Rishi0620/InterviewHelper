"""
Security and utility middleware for the FastAPI application.
"""

import time
import logging
from typing import Callable, Dict, Any
import hashlib
import hmac
from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from config import settings

logger = logging.getLogger(__name__)


class SecurityMiddleware(BaseHTTPMiddleware):
    """Security-focused middleware for production deployments."""
    
    def __init__(self, app, max_request_size: int = 1024 * 1024):  # 1MB default
        super().__init__(app)
        self.max_request_size = max_request_size
        self.blocked_ips = set()
        self.rate_limit_storage: Dict[str, Dict[str, Any]] = {}
    
    async def dispatch(self, request: Request, call_next: Callable):
        start_time = time.time()
        
        # IP blocking
        client_ip = self.get_client_ip(request)
        if client_ip in self.blocked_ips:
            logger.warning(f"Blocked request from {client_ip}")
            return JSONResponse(
                status_code=403,
                content={"error": "Access denied"}
            )
        
        # Request size check
        content_length = request.headers.get('content-length')
        if content_length and int(content_length) > self.max_request_size:
            logger.warning(f"Request too large from {client_ip}: {content_length} bytes")
            return JSONResponse(
                status_code=413,
                content={"error": "Request entity too large"}
            )
        
        # Basic rate limiting
        if not self.check_rate_limit(client_ip):
            logger.warning(f"Rate limit exceeded for {client_ip}")
            return JSONResponse(
                status_code=429,
                content={"error": "Rate limit exceeded"}
            )
        
        try:
            response = await call_next(request)
            
            # Add security headers
            self.add_security_headers(response)
            
            # Log request
            process_time = time.time() - start_time
            logger.info(
                f"{request.method} {request.url.path} - "
                f"{response.status_code} - {process_time:.3f}s"
            )
            
            return response
            
        except Exception as e:
            logger.error(f"Request failed: {e}")
            return JSONResponse(
                status_code=500,
                content={"error": "Internal server error"}
            )
    
    def get_client_ip(self, request: Request) -> str:
        """Extract client IP from request headers."""
        # Check for forwarded headers (when behind proxy)
        forwarded_for = request.headers.get('x-forwarded-for')
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        
        real_ip = request.headers.get('x-real-ip')
        if real_ip:
            return real_ip
        
        # Fallback to direct connection
        return request.client.host if request.client else "unknown"
    
    def check_rate_limit(self, client_ip: str, max_requests: int = 60, window: int = 60) -> bool:
        """Simple rate limiting implementation."""
        current_time = time.time()
        
        if client_ip not in self.rate_limit_storage:
            self.rate_limit_storage[client_ip] = {
                'requests': [],
                'blocked_until': 0
            }
        
        client_data = self.rate_limit_storage[client_ip]
        
        # Check if still blocked
        if current_time < client_data['blocked_until']:
            return False
        
        # Clean old requests
        client_data['requests'] = [
            req_time for req_time in client_data['requests']
            if current_time - req_time < window
        ]
        
        # Check rate limit
        if len(client_data['requests']) >= max_requests:
            # Block for 5 minutes
            client_data['blocked_until'] = current_time + 300
            return False
        
        # Add current request
        client_data['requests'].append(current_time)
        return True
    
    def add_security_headers(self, response: Response):
        """Add security headers to response."""
        security_headers = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
        }
        
        for header, value in security_headers.items():
            response.headers[header] = value


class RequestValidationMiddleware(BaseHTTPMiddleware):
    """Middleware for request validation and sanitization."""
    
    SUSPICIOUS_PATTERNS = [
        # SQL injection patterns
        'union select', 'drop table', 'insert into', 'delete from',
        # XSS patterns
        '<script', 'javascript:', 'on\w+\s*=',
        # Path traversal
        '../', '..\\', '/etc/passwd', '/windows/system32',
        # Command injection
        '; rm ', '| rm ', '&& rm ', '`rm ', '$(rm',
    ]
    
    async def dispatch(self, request: Request, call_next: Callable):
        # Validate request path
        if self.is_suspicious_request(request):
            logger.warning(f"Suspicious request detected: {request.url}")
            return JSONResponse(
                status_code=400,
                content={"error": "Invalid request"}
            )
        
        return await call_next(request)
    
    def is_suspicious_request(self, request: Request) -> bool:
        """Check if request contains suspicious patterns."""
        # Check URL path
        path = str(request.url.path).lower()
        query = str(request.url.query).lower()
        
        for pattern in self.SUSPICIOUS_PATTERNS:
            if pattern in path or pattern in query:
                return True
        
        # Check for excessive path length
        if len(path) > 2000:
            return True
        
        return False


def verify_api_key(request: Request) -> bool:
    """Verify API key if present."""
    api_key = request.headers.get('X-API-Key')
    if not api_key:
        return True  # No API key required for public endpoints
    
    # Implement your API key validation logic here
    expected_key = settings.api_key if hasattr(settings, 'api_key') else None
    if not expected_key:
        return True
    
    return hmac.compare_digest(api_key, expected_key)


def create_security_middleware():
    """Factory function to create security middleware stack."""
    middleware = []
    
    # Trust only specific hosts in production
    if settings.is_production:
        allowed_hosts = getattr(settings, 'allowed_hosts', ['*'])
        middleware.append((TrustedHostMiddleware, {'allowed_hosts': allowed_hosts}))
    
    # Add CORS middleware
    middleware.append((
        CORSMiddleware,
        {
            'allow_origins': settings.cors_origins,
            'allow_credentials': True,
            'allow_methods': ['GET', 'POST', 'OPTIONS'],
            'allow_headers': ['*'],
            'max_age': 86400,  # 24 hours
        }
    ))
    
    return middleware
