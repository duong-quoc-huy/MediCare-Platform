from django.core.exceptions import ValidationError
import os

def validate_profile_image(image):
	# Check file extension
	ext = os.path.splitext(image.name)[1].lower()
	allowed_extensions = ['.png', '.jpg', '.jpeg']

	if ext not in allowed_extensions:
		raise ValidationError('Only PNG, JPG and JPEG images are allowed.')

	# Check file size — max 2MB
	max_size = 2 * 1024 * 1024  
	if image.size > max_size:
		raise ValidationError('Image size must not exceed 2MB.')