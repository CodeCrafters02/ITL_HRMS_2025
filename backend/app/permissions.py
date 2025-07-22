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
