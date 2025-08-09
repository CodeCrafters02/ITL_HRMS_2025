from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()
router.register(r'service', ServiceViewSet, basename='service')
router.register(r'demorequest', DemoRequestViewSet, basename='demorequest')
router.register(r'product', ProductViewSet, basename='product')
router.register(r'subservice', SubServiceViewSet, basename='subservice')
router.register(r'contactrequest', ContactRequestViewSet, basename='contactrequest')

urlpatterns = [
    path('', include(router.urls)),
]
