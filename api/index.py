import os
import sys

# Ensure root folder is in sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from main import app
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

# Vercel ASGI path normalizer middleware
# In Vercel serverless environments, rewrites often pass /api/index.py as the ASGI path.
# This middleware recovers the user's real requested path from x-matched-path.
class VercelPathNormalizer(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        matched = request.headers.get("x-matched-path")
        if matched and matched not in ["/api", "/api/index", "/api/index.py"]:
            request.scope["path"] = matched
        elif request.scope.get("path") in ["/api", "/api/index", "/api/index.py"]:
            request.scope["path"] = "/"
        return await call_next(request)

app.add_middleware(VercelPathNormalizer)
