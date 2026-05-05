from django.contrib import admin
from .models import SystemSettings


@admin.register(SystemSettings)
class SystemSettingsAdmin(admin.ModelAdmin):
    list_display = ['demo_mode_enabled', 'demo_username', 'updated_at']
    list_editable = ['demo_mode_enabled']
    list_display_links = ['demo_username']
    fieldsets = (
        ('Demo Mode Configuration', {
            'fields': ('demo_mode_enabled', 'demo_username', 'demo_password'),
            'description': 'Enable demo mode to allow reviewers to login with dummy credentials. Normal Google SSO login continues to work regardless of this setting.'
        }),
    )

    def has_add_permission(self, request):
        # Prevent creating multiple settings records
        if SystemSettings.objects.exists():
            return False
        return super().has_add_permission(request)

    def has_delete_permission(self, request, obj=None):
        # Prevent deleting the settings record
        return False
