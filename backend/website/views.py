from rest_framework import viewsets, filters
from .models import *
from .serializers import *
from rest_framework.permissions import IsAuthenticated,AllowAny

class ServiceViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer

class DemoRequestViewSet(viewsets.ModelViewSet):
    queryset = DemoRequest.objects.all().order_by('-submitted_at')
    permission_classes = [AllowAny]
    serializer_class = DemoRequestSerializer

class ProductViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

class SubServiceViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]
    queryset = SubService.objects.all()
    serializer_class = SubServiceSerializer

class ContactRequestViewSet(viewsets.ModelViewSet):
    queryset = ContactRequest.objects.all()
    serializer_class = ContactRequestSerializer
    permission_classes = [AllowAny]  