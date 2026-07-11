from django.urls import path
from .views import (
	CartDetailView,
	CartAddItemView,
	CartItemUpdateView,
	CartItemRemoveView,
	CartClearView,
	CartMergeView,
)

urlpatterns = [
	path('', CartDetailView.as_view(), name='cart-detail'),
	path('add/', CartAddItemView.as_view(), name='cart-add-item'),
	path('items/<uuid:cart_item_id>/', CartItemUpdateView.as_view(), name='cart-item-update'),
	path('items/<uuid:cart_item_id>/remove/', CartItemRemoveView.as_view(), name='cart-item-remove'),
	path('clear/', CartClearView.as_view(), name='cart-clear'),
	path('merge/', CartMergeView.as_view(), name='cart-merge'),
]