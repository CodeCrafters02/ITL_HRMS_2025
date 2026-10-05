import requests
from django.conf import settings
from google.auth import jwt as gjwt
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .outlook import save_ms_refresh_token, sync_ms_profile_photo

GRAPH_SCOPES = " ".join([
    "https://graph.microsoft.com/User.Read",
    "https://graph.microsoft.com/Mail.ReadWrite",
    "https://graph.microsoft.com/Calendars.ReadWrite",
    "offline_access",
])
CONSENT_ERRORS = ("invalid_grant", "interaction_required", "consent_required")


def _accepted_audiences(client_id):
    auds = {client_id}
    if uri := getattr(settings, "TEAMS_APP_ID_URI", ""):
        auds.add(uri)
    if domain := getattr(settings, "TEAMS_TAB_DOMAIN", ""):
        auds.add(f"api://{domain}/{client_id}")
    return list(auds)


class TeamsSSOAPIView(APIView):
    """Teams tab SSO: verifies the Teams-issued token, exchanges it on-behalf-of for Graph,
    and signs the user into HRMS exactly like the web Microsoft login."""
    permission_classes = [AllowAny]

    def post(self, request):
        from .views import MicrosoftLoginAPIView, _process_sso_user_login

        token = request.data.get("token") or ""
        client_id = getattr(settings, "MICROSOFT_CLIENT_ID", "")
        client_secret = getattr(settings, "MICROSOFT_CLIENT_SECRET", "")
        tenant = getattr(settings, "MICROSOFT_TENANT_ID", "") or "organizations"
        if not token:
            return Response({"detail": "Teams token is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not (client_id and client_secret):
            return Response({"detail": "Microsoft sign-in is not configured on the server."},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            claims = gjwt.decode(token, certs=MicrosoftLoginAPIView._signing_certs(tenant),
                                 audience=_accepted_audiences(client_id), clock_skew_in_seconds=10)
            tid = claims.get("tid", "")
            if claims.get("iss") not in (f"https://login.microsoftonline.com/{tid}/v2.0", f"https://sts.windows.net/{tid}/"):
                raise ValueError("unexpected issuer")
            if tenant not in ("common", "organizations") and tid != tenant:
                raise ValueError("token is from a different tenant")
        except ValueError as e:
            return Response({"detail": f"Invalid Teams token: {e}"}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            return Response({"detail": f"Could not verify Teams token: {e}"}, status=status.HTTP_502_BAD_GATEWAY)

        email = (claims.get("preferred_username") or claims.get("upn") or claims.get("unique_name")
                 or claims.get("email") or "").strip().lower()
        if "@" not in email:
            return Response({"detail": "Your Microsoft account has no email address."}, status=status.HTTP_400_BAD_REQUEST)
        first_name = claims.get("given_name") or ""
        last_name = claims.get("family_name") or ""
        if not first_name and claims.get("name"):
            first_name, _, last_name = claims["name"].partition(" ")

        obo, consent_required = {}, False
        try:
            r = requests.post(
                f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                    "assertion": token,
                    "requested_token_use": "on_behalf_of",
                    "scope": GRAPH_SCOPES,
                },
                timeout=15,
            )
            obo = r.json() if r.content else {}
            if r.status_code != 200:
                consent_required = obo.get("error") in CONSENT_ERRORS
                obo = {}
        except requests.RequestException:
            obo = {}

        extra = {"consent_required": consent_required}
        if obo.get("access_token"):
            extra.update(ms_access_token=obo["access_token"], ms_refresh_token=obo.get("refresh_token") or "",
                         ms_expires_in=obo.get("expires_in", 3600))
        resp = _process_sso_user_login(email=email, first_name=first_name, last_name=last_name, extra_data=extra)
        if resp.status_code == 200 and obo.get("refresh_token"):
            save_ms_refresh_token(resp.data.get("id"), obo["refresh_token"], scope=obo.get("scope", ""))
        if resp.status_code == 200 and obo.get("access_token"):
            sync_ms_profile_photo(resp.data.get("id"), obo["access_token"])
        return resp
