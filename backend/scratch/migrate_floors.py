import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'innovyx_hrms.settings')
django.setup()

from app.models import OfficeLocation, OfficeFloor, Company

def migrate_floors():
    for company in Company.objects.all():
        floors = OfficeFloor.objects.filter(company=company, location__isnull=True)
        if floors.exists():
            location, created = OfficeLocation.objects.get_or_create(
                company=company,
                name="Main Office",
                defaults={'address': company.address}
            )
            count = floors.update(location=location)
            print(f"Assigned {count} floors to '{location.name}' for company '{company.name}'")

if __name__ == "__main__":
    migrate_floors()
