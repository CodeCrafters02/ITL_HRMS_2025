import requests

url = "http://127.0.0.1:8000/app/loan-applications/"
# Need a token. I'll just check if it returns 401 or 500.
# If it returns 500 without a token (due to some queryset logic failing before auth? unlikely but possible), it's a bug.
# Actually, with [permissions.IsAuthenticated], it should return 401.

try:
    response = requests.get(url)
    print(f"Status: {response.status_code}")
    print(f"Body: {response.text[:200]}")
except Exception as e:
    print(f"Error: {e}")
