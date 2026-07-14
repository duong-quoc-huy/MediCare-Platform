from rest_framework import serializers
from .models import Province, Ward

class ProvinceSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Province
        fields = ['code', 'name', 'full_name']

class WardSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Ward
        fields = ['code', 'name', 'full_name', 'province_id']