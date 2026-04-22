from rest_framework import permissions

class IsAdminUser(permissions.BasePermission):
    """
    Allows access only to users with role = 'admin'
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class IsMaster(permissions.BasePermission):
    """
    Allows access only to users with role = 'master'
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'master'


class IsCompanyChatUser(permissions.BasePermission):
    """
    Allows access to chat features for users in roles: admin, employee.
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ("admin", "employee")


class CanReadCompanyCalendar(permissions.BasePermission):
    """
    Admin or employee with a company can read company calendar / holiday events (list & retrieve).
    """

    def has_permission(self, request, view):
        u = request.user
        if not u.is_authenticated:
            return False
        if not getattr(u, "company_id", None):
            return False
        return u.role in ("admin", "employee")
