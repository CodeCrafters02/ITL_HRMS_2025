"""
ASGI config for innovyx_hrms project.

Supports both HTTP (Django) and WebSocket (Channels).
"""

import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "innovyx_hrms.settings")

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

django_asgi_app = get_asgi_application()

# Import routing/middleware only after Django is initialized.
from app.routing import websocket_urlpatterns
from app.ws_auth import JwtAuthMiddlewareStack

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": JwtAuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
    }
)



