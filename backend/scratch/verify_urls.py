import os
import django
import sys

# Set up Django environment
sys.path.append(os.path.abspath('.'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.urls import get_resolver

def list_urls(lis, acc=None):
    if acc is None:
        acc = []
    if not lis:
        return
    for i in lis:
        if hasattr(i, 'url_patterns'):
            list_urls(i.url_patterns, acc)
        else:
            acc.append(str(i.pattern))
    return acc

url_patterns = get_resolver().url_patterns
all_urls = list_urls(url_patterns)
for url in sorted(all_urls):
    if 'wfh' in url:
        print(url)
