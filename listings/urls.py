# urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import RegisterView, LoginView, LogoutView, CurrentUserView, ProfileView, ConfirmEmailView, csrf, \
    MyListingsView, MyFavoritesView, MessageViewSet, request_password_reset, validate_reset_token, reset_password
from rest_framework.authtoken.views import obtain_auth_token

router = DefaultRouter()
router.register(r'roles', views.RoleViewSet)
router.register(r'users', views.UserViewSet)
router.register(r'categories', views.CategoryViewSet)
router.register(r'listings', views.ListingViewSet)
router.register(r'images', views.ImageViewSet)
router.register(r'favorites', views.FavoriteViewSet)
router.register(r'reviews', views.ReviewViewSet)
router.register(r'listing-categories', views.ListingCategoryViewSet)
router.register(r'messages', MessageViewSet, basename='message')

urlpatterns = [
    path('', include(router.urls)),
    path('register/', RegisterView.as_view(), name='register'),
    path('confirm-email/<str:token>/', ConfirmEmailView.as_view(), name='confirm_email'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('current-user/', CurrentUserView.as_view(), name='current-user'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('confirm-email/<str:token>/', ConfirmEmailView.as_view(), name='confirm_email'),
    path('csrf/', csrf, name='csrf'),
    path('profile/', ProfileView.as_view(), name='user-profile'),
    path('my-listings/', MyListingsView.as_view(), name='my-listings'),
    path('my-favorites/', MyFavoritesView.as_view(), name='my-favorites'),
    path('request-password-reset/', request_password_reset, name='request-password-reset'),
    path('validate-reset-token/<str:token>/', validate_reset_token, name='validate-reset-token'),
    path('reset-password/<str:token>/', reset_password, name='reset-password'),
]
