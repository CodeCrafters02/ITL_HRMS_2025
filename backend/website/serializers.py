from rest_framework import serializers
from .models import *
from rest_framework.response import Response
from rest_framework import status

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

class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image'] 

class ProductSerializer(serializers.ModelSerializer):
    service = serializers.PrimaryKeyRelatedField(
        queryset=Service.objects.filter(is_active=True),
        write_only=True
    )
    service_details = ServiceSerializer(source='service', read_only=True)
    images = ProductImageSerializer(many=True, read_only=True, source='images_products')

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'images',
            'service', 'service_details','client',
            'is_active', 'created_at', 'updated_at'
        ]

    def create(self, validated_data):
        request = self.context.get('request')  
        service = validated_data.pop('service', None)
        product = Product.objects.create(service=service, **validated_data)
        images = request.FILES.getlist('images') if request else []
        for image_file in images:
            ProductImage.objects.create(product=product, image=image_file)
        return product
    
    def update(self, instance, validated_data):
        request = self.context.get('request')
        
        print("Initial data:", self.initial_data)  # print initial validated data

        # Update basic fields
        service = validated_data.pop('service', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if service is not None:
            instance.service = service
        
        instance.save()

        # Handle images to remove (passed as a list in request.data)
        images_to_remove = request.data.getlist('imagesToRemove') if request else []
        if images_to_remove:
            # images_to_remove might be list of strings, convert to int
            ids_to_remove = [int(i) for i in images_to_remove]
            ProductImage.objects.filter(product=instance, id__in=ids_to_remove).delete()

        # Handle new images upload
        new_images = request.FILES.getlist('images') if request else []
        for image_file in new_images:
            ProductImage.objects.create(product=instance, image=image_file)

        return instance

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