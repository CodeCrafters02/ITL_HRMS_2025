import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'innovyx_hrms.settings')
django.setup()

from employee.views import MyTasksAPIView
from rest_framework.test import APIRequestFactory, force_authenticate
from app.models import UserRegister

factory = APIRequestFactory()
# Use a user that exists
user = UserRegister.objects.filter(employee_profile__isnull=False).first()
if not user:
    print("No user with employee profile found")
    exit()

view = MyTasksAPIView.as_view()
request = factory.get('/employee/my-tasks/')
force_authenticate(request, user=user)

try:
    response = view(request)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 500:
        print("Internal Server Error detected!")
except Exception as e:
    import traceback
    traceback.print_exc()
