from reset_framework.permissions import BasePermission

class IsAdmin(BasePermission):
	def has_permission(self, request, view):
		return request.user.is_authenticated and request.user.role == 'admin'

class isDoctor(BasePermission):
	def has_permission(self, request, view):
		return request.user.is_authenticated and request.user.role == 'doctor'

class isNurse(BasePermission):
	def has_permission(self, request, view):
		return request.user.is_authenticated and request.user.role == 'nurse'

class isPatient(BasePermission):
	def has_permission(self, request, view):
		return request.user.is_authenticated and request.user.role == 'patient'

class IsShipper(BasePermission):
	def has_permission(self, request, view):
		return request.user.is_authenticated and request.user.role == 'shipper'


class IsAdminOrDoctor(BasePermission):
	def has_permission(self, request, view):
		return request.user.is_authenticated and request.user.role in ('admin', 'doctor')

class IsAdminOrNurse(BasePermission): 
	def has_permission(self, request, view): 
		return ( request.user.is_authenticated and request.user.role in ('admin', 'nurse')) 

 
class IsMedicalStaff(BasePermission): 
	def has_permission(self, request, view): 
		return ( request.user.is_authenticated and request.user.role in ('doctor', 'nurse')) 


class IsAdminOrPatient(BasePermission):
	def has_permission(self, request, view):
		return request.user.is_authenticated and request.user.role in ('admin', 'patient')
