import os
import django
import sys

sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'innovyx_hrms.settings')
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from app.models import UserRegister
from app.views import OfficeLocationViewSet

def test_viewset():
    user = UserRegister.objects.get(username='vivek')
    factory = APIRequestFactory()
    view = OfficeLocationViewSet.as_view({'get': 'list'})
    
    request = factory.get('/app/office-locations/')
    force_authenticate(request, user=user)
    
    response = view(request)
    print(f"Status: {response.status_code}")
    print(f"Data: {response.data}")

if __name__ == '__main__':
    test_viewset()
