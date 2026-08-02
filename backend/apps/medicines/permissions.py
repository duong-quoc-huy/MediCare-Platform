from rest_framework.permissions import SAFE_METHODS, BasePermission


class PublicReadAdminWrite(BasePermission):
	def has_permission(self, request, view):
		if request.method in SAFE_METHODS:
			return True

		user = request.user
		return bool(
			user
			and user.is_authenticated
			and (
				getattr(user, 'role', None) == 'admin'
				or user.is_superuser
			)
		)
