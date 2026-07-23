from rest_framework import serializers

from .models import (
	AppointmentVitals,
	MasterComorbidity,
	MasterSymptom,
	AppointmentComorbidity,
	AppointmentSymptom,
	Prescription,
	PrescriptionItem,
)


class AppointmentVitalsSerializer(serializers.ModelSerializer):
	recorded_by_name = serializers.CharField(
		source='recorded_by.full_name',
		read_only=True
	)

	class Meta:
		model = AppointmentVitals
		fields = [
			'appointment',
			'blood_pressure_systolic',
			'blood_pressure_diastolic',
			'heart_rate',
			'temperature',
			'weight',
			'height',
			'spo2',
			'diagnosis',
			'recorded_by',
			'recorded_by_name',
			'recorded_at',
			'updated_at',
		]
		read_only_fields = [
			'appointment',
			'recorded_by',
			'recorded_by_name',
			'recorded_at',
			'updated_at',
		]


class MasterComorbiditySerializer(serializers.ModelSerializer):
	class Meta:
		model = MasterComorbidity
		fields = [
			'comorbidity_id',
			'comorbidity_code',
			'comorbidity_name',
			'category',
			'is_common',
			'created_at',
		]


class MasterSymptomSerializer(serializers.ModelSerializer):
	class Meta:
		model = MasterSymptom
		fields = [
			'symptom_id',
			'symptom_code',
			'symptom_name',
			'category',
			'is_common',
			'created_at',
		]


class AppointmentComorbiditySerializer(serializers.ModelSerializer):
	comorbidity_detail = MasterComorbiditySerializer(
		source='comorbidity',
		read_only=True
	)

	class Meta:
		model = AppointmentComorbidity
		fields = [
			'appointment_comorbidity_id',
			'appointment',
			'comorbidity',
			'comorbidity_detail',
			'comorbidity_code',
			'comorbidity_name',
			'notes',
			'created_at',
		]
		read_only_fields = [
			'appointment_comorbidity_id',
			'appointment',
			'comorbidity_code',
			'comorbidity_name',
			'created_at',
		]


class AppointmentSymptomSerializer(serializers.ModelSerializer):
	symptom_detail = MasterSymptomSerializer(
		source='symptom',
		read_only=True
	)

	class Meta:
		model = AppointmentSymptom
		fields = [
			'appointment_symptom_id',
			'appointment',
			'symptom',
			'symptom_detail',
			'symptom_code',
			'symptom_name',
			'severity_score',
			'duration_hours',
			'notes',
			'created_at',
		]
		read_only_fields = [
			'appointment_symptom_id',
			'appointment',
			'symptom_code',
			'symptom_name',
			'created_at',
		]

	def validate_severity_score(self, value):
		if value is not None and (value < 1 or value > 10):
			raise serializers.ValidationError(
				'Severity score must be between 1 and 10.'
			)

		return value


class PrescriptionItemSerializer(serializers.ModelSerializer):
	class Meta:
		model = PrescriptionItem
		fields = [
			'id',
			'medicine_name',
			'dosage',
			'frequency',
			'duration',
			'instructions',
			'quantity',
		]

	def validate_quantity(self, value):
		if value <= 0:
			raise serializers.ValidationError(
				'Quantity must be greater than 0.'
			)

		return value


class PrescriptionSerializer(serializers.ModelSerializer):
	items = PrescriptionItemSerializer(many=True)

	class Meta:
		model = Prescription
		fields = [
			'id',
			'appointment',
			'diagnosis',
			'notes',
			'sent_to_pharmacy',
			'pdf_file',
			'items',
			'created_at',
			'updated_at',
		]
		read_only_fields = [
			'id',
			'appointment',
			'sent_to_pharmacy',
			'pdf_file',
			'created_at',
			'updated_at',
		]

	def validate_items(self, value):
		if not value:
			raise serializers.ValidationError(
				'Prescription must have at least one medicine item.'
			)

		return value

	def create(self, validated_data):
		items_data = validated_data.pop('items')

		prescription = Prescription.objects.create(**validated_data)

		for item_data in items_data:
			PrescriptionItem.objects.create(
				prescription=prescription,
				**item_data
			)

		return prescription

	def update(self, instance, validated_data):
		items_data = validated_data.pop('items', None)

		instance.diagnosis = validated_data.get(
			'diagnosis',
			instance.diagnosis
		)
		instance.notes = validated_data.get(
			'notes',
			instance.notes
		)
		instance.save()

		if items_data is not None:
			instance.items.all().delete()

			for item_data in items_data:
				PrescriptionItem.objects.create(
					prescription=instance,
					**item_data
				)

		return instance