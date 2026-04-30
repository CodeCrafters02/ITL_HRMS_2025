import os
import django
import sys

sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'innovyx_hrms.settings')
django.setup()

from app.models import OfficeLocation, UserRegister

def check_locations():
    users = UserRegister.objects.all()
    for user in users:
        print(f"User: {user.username}, Role: {user.role}, Company: {user.company.name if user.company else 'None'}")
    
    locs = OfficeLocation.objects.all()
    print(f"\nTotal Office Locations: {locs.count()}")
    for loc in locs:
        print(f"Location: {loc.name}, Company: {loc.company.name}, Latitude: {loc.latitude}")

if __name__ == '__main__':
    check_locations()
