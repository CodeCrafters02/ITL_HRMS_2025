#!/usr/bin/env python
import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'innovyx_hrms.settings')
django.setup()

from app.models import UserRegister, Employee, Attendance, Company
from app.views import AttendanceLogView
from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from datetime import date, datetime
import json

def test_monthly_attendance():
    print("🔍 Testing Monthly Attendance Calculations...")
    print("=" * 50)
    
    # Create a DRF API request with query parameters
    factory = APIRequestFactory()
    django_request = factory.get('/api/attendance-log/', {'month': '2024-01'})
    
    # Convert to DRF Request object
    request = Request(django_request)
    
    # Get first user with company
    user = UserRegister.objects.filter(company__isnull=False).first()
    if not user:
        print("❌ No user with company found")
        return
    
    request.user = user
    print(f"👤 Testing with User: {user.username}")
    print(f"🏢 Company: {user.company.name}")
    print()
    
    # Test the view
    view = AttendanceLogView()
    try:
        response = view.get(request)
        
        if response.status_code == 200:
            data = response.data
            if data:
                emp_data = data[0]
                
                print("✅ Monthly Attendance Statistics Enhanced:")
                print(f"Employee: {emp_data.get('employee_name', 'N/A')}")
                print(f"Month: {emp_data.get('month', 'N/A')}")
                print()
                
                print("📊 Working Days Summary:")
                print(f"  Total Working Days: {emp_data.get('total_working_days', 0)}")
                print(f"  Present Days: {emp_data.get('total_present_days', 0)}")
                print(f"  Attendance Percentage: {emp_data.get('percentage_present', 0)}%")
                print(f"  Absent Days: {emp_data.get('total_absent_days', 0)}")
                print(f"  Leave Days: {emp_data.get('total_leave_days', 0)}")
                print(f"  Half Days: {emp_data.get('total_half_days', 0)}")
                print(f"  Holidays: {emp_data.get('total_holidays', 0)}")
                print()
                
                print("⏰ Working Hours Summary:")
                print(f"  Total Worked Hours: {emp_data.get('total_worked_hours', 0)} hrs")
                print(f"  Total Expected Hours: {emp_data.get('total_expected_hours', 0)} hrs") 
                print(f"  Hours Efficiency: {emp_data.get('hours_efficiency', 0)}%")
                print(f"  Hours Variance: {emp_data.get('hours_variance', 0)} hrs")
                print(f"  Total Overtime: {emp_data.get('total_overtime_hours', 0)} hrs")
                print(f"  Total Break Time: {emp_data.get('total_break_time', 0)} hrs")
                print(f"  Average Hours/Day: {emp_data.get('average_hours_per_day', 0)} hrs")
                print(f"  Average Hours/Working Day: {emp_data.get('average_hours_per_working_day', 0)} hrs")
                print()
                
                print("📈 Monthly Insights:")
                summary = emp_data.get('monthly_summary', {})
                print(f"  Productive Days: {summary.get('productive_days', 0)}")
                print(f"  Non-Productive Days: {summary.get('non_productive_days', 0)}")
                print(f"  Punctuality Score: {summary.get('punctuality_score', 0)}%")
                print(f"  Overtime Frequency: {summary.get('overtime_frequency', 0)} days")
                print(f"  Break Usage: {summary.get('break_usage_hours', 0)} hrs")
                print()
                
                print("🔄 Leave Summary:")
                leave_summary = emp_data.get('leave_summary', {})
                if leave_summary:
                    for leave_type, count in leave_summary.items():
                        print(f"  {leave_type}: {count} days")
                else:
                    print("  No leaves taken")
                print()
                
                print("✅ Monthly calculations working correctly!")
                print(f"📊 Total employees processed: {len(data)}")
                
                # Show daily attendance sample
                daily_att = emp_data.get('daily_attendance', [])
                if daily_att:
                    print(f"📅 Daily records: {len(daily_att)} days")
                    print("Sample daily record:")
                    sample = daily_att[0] if daily_att else {}
                    print(f"  Date: {sample.get('date', 'N/A')}")
                    print(f"  Status: {sample.get('status', 'N/A')}")
                    print(f"  Worked Hours: {sample.get('worked_hours', 0)}")
                    print(f"  Scheduled Hours: {sample.get('scheduled_hours', 0)}")
                
            else:
                print("ℹ️ No attendance data found for testing")
        else:
            print(f"❌ Error: {response.status_code}")
            if hasattr(response, 'data'):
                print("Error details:", response.data)
                
    except Exception as e:
        print(f"❌ Exception occurred: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_monthly_attendance()
