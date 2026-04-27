import os
import django
import sys
import json

# Set up Django environment
sys.path.append(os.path.abspath('.'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'innovyx_hrms.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate
from app.views import WFHRequestViewSet

User = get_user_model()

def test_wfh_post():
    factory = APIRequestFactory()
    view = WFHRequestViewSet.as_view({'post': 'create'})
    
    # Try to find an employee user
    user = User.objects.filter(role='employee').first()
    if not user:
        print("No employee user found")
        return

    data = {
        "reason": "Test reason",
        "from_date": "2024-05-01",
        "to_date": "2024-05-02"
    }
    
    request = factory.post('/app/wfh-requests/', data, format='json')
    force_authenticate(request, user=user)
    response = view(request)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response Data: {response.data}")

if __name__ == '__main__':
    test_wfh_post()
