from django.db import models

# Create your models here.

class Service(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class DemoRequest(models.Model):
    name = models.CharField(max_length=150)
    email = models.EmailField()
    contact_number = models.CharField(max_length=30)
    service = models.ForeignKey('Service', on_delete=models.SET_NULL, null=True, related_name='service_demorequest')
    preferred_datetime = models.DateTimeField()
    message = models.TextField(blank=True, null=True)
    submitted_at = models.DateTimeField(auto_now_add=True)

class Product(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    service = models.ForeignKey('Service', on_delete=models.SET_NULL, null=True, related_name='service_product')
    image = models.ImageField(upload_to='product_images/',blank=True,null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class SubService(models.Model):
    service = models.ForeignKey('Service', on_delete=models.SET_NULL, null=True, related_name='service_subservice')
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)


class ContactRequest(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField()
    contact_number = models.CharField(max_length=20, blank=True, null=True)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)