from django.contrib import admin

# Register your models here.


from .models import TeamsAttendanceConfig, PresenceState, PresenceLog, PresenceSession, AttendanceTeamsInfo, PresenceActionLog
for _m in (TeamsAttendanceConfig, PresenceState, PresenceLog, PresenceSession, AttendanceTeamsInfo, PresenceActionLog):
    try:
        admin.site.register(_m)
    except admin.sites.AlreadyRegistered:
        pass
