from rest_framework import serializers
from .models import *

class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ['id', 'name', 'description', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class DemoRequestSerializer(serializers.ModelSerializer):
    service = ServiceSerializer(read_only=True)
    service_id = serializers.PrimaryKeyRelatedField(
        queryset=Service.objects.filter(is_active=True),
        source='service',
        write_only=True,
        required=True
    )

    class Meta:
        model = DemoRequest
        fields = ['id', 'name', 'email', 'contact_number', 'service', 'service_id', 'preferred_datetime', 'message', 'submitted_at']
        read_only_fields = ['id', 'submitted_at']



class ProductSerializer(serializers.ModelSerializer):
    service = serializers.PrimaryKeyRelatedField(
        queryset=Service.objects.filter(is_active=True),
        write_only=True
    )
    service_details = ServiceSerializer(source='service', read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'image',
            'service', 'service_details',
            'is_active', 'created_at', 'updated_at'
        ]

class SubServiceSerializer(serializers.ModelSerializer):
    service = serializers.PrimaryKeyRelatedField(
        queryset=Service.objects.filter(is_active=True),
        write_only=True
    )
    service_details = ServiceSerializer(source='service', read_only=True)
    class Meta:
        model = SubService
        fields = ['id', 'service', 'name', 'description','service', 'service_details',]


class ContactRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactRequest
        fields = ['id', 'name', 'email', 'contact_number', 'message', 'created_at']
        read_only_fields = ['id', 'created_at']