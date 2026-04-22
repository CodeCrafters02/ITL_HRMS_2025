from __future__ import annotations

from urllib.parse import parse_qs

from channels.auth import AuthMiddlewareStack
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication


class JwtAuthMiddleware:
    """
    Authenticate WebSocket connections using SimpleJWT.

    Frontend connects with: ws://host/ws/chat/?token=<access_token>
    """

    def __init__(self, inner):
        self.inner = inner
        self.jwt_auth = JWTAuthentication()

    async def __call__(self, scope, receive, send):
        query_string = (scope.get("query_string") or b"").decode("utf-8")
        qs = parse_qs(query_string)
        token = (qs.get("token") or [None])[0]

        scope["user"] = AnonymousUser()
        if token:
            try:
                validated = self.jwt_auth.get_validated_token(token)
                user = self.jwt_auth.get_user(validated)
                scope["user"] = user
            except Exception:
                scope["user"] = AnonymousUser()

        return await self.inner(scope, receive, send)


def JwtAuthMiddlewareStack(inner):
    return JwtAuthMiddleware(AuthMiddlewareStack(inner))

