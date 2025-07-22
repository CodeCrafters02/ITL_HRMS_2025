from django.db import models
from django.conf import settings
from django.utils import timezone
from app.models import Company, Employee, Leave

class EmpLeave(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    reporting_manager = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='leave_approvals')
    leave_type = models.ForeignKey(Leave, on_delete=models.SET_NULL, null=True, blank=True)

    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    reason = models.TextField(blank=True, null=True)
    from_date = models.DateField()
    to_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
