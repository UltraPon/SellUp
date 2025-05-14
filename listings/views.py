import json
import logging
import random
import string
import uuid
from datetime import timedelta
from itertools import chain
from venv import logger

from django.contrib.auth import login, logout, get_user_model
from django.contrib.auth.hashers import make_password
from django.core.exceptions import ObjectDoesNotExist
from django.core.mail import send_mail
from django.db.models import Q, Prefetch
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.utils import timezone
from django.views import View
from rest_framework import viewsets, status, permissions, generics
from rest_framework.authentication import TokenAuthentication, SessionAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action, api_view
from rest_framework.decorators import authentication_classes, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser, JSONParser
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import filters
from django_filters.rest_framework import DjangoFilterBackend

from SellUp import settings
from .models import Role, User, Category, Listing, Image, Favorite, Review, ListingCategory, Message, FilterAttribute, PasswordResetToken
from .serializers import RoleSerializer, UserProfileSerializer, CategorySerializer, ListingSerializer, ImageSerializer, \
    FavoriteSerializer, ReviewSerializer, ListingCategorySerializer, RegisterSerializer, LoginSerializer, \
    MessageSerializer, CategoryTreeSerializer, FilterAttributeSerializer

User = get_user_model()

logger = logging.getLogger(__name__)

# Представление для ролей
class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer


# Представление для пользователей
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserProfileSerializer

def generate_confirmation_token():
    return ''.join(random.choices(string.ascii_letters + string.digits, k=32))

# Функция отправки email с подтверждением
def send_confirmation_email(user_email, token):
    confirmation_url = f"{settings.BACKEND_URL}/confirm-email/{token}/"
    subject = "Подтвердите ваш email"
    message = f"Перейдите по ссылке для подтверждения вашего email: {confirmation_url}"

    try:
        # Отправляем email с подтверждением, используя настройки из settings.py
        send_mail(
            subject,  # Тема письма
            message,  # Тело письма
            settings.DEFAULT_FROM_EMAIL,  # Email, который у вас настроен в settings.py
            [user_email],  # Получатель
            fail_silently=False,  # Параметр для подавления ошибок
        )
        print(f"Письмо отправлено на {user_email}")
    except Exception as e:
        print(f"Ошибка при отправке письма: {e}")
        logger.error(f"Ошибка при отправке письма: {e}")


class RegisterView(APIView):
    def post(self, request):
        logger.info(f"Полученные данные: {request.data}")

        serializer = RegisterSerializer(data=request.data)

        if serializer.is_valid():
            # Сохраняем пользователя
            user = serializer.save()

            user.email_verification_token = str(uuid.uuid4())
            user.email_verification_sent_at = timezone.now()
            user.save()

            send_confirmation_email(user.email, user.email_verification_token)

            # Ответ при успешной регистрации
            return Response({"message": "Пользователь зарегистрирован! Проверьте почту для подтверждения."},
                            status=status.HTTP_201_CREATED)

        # В случае ошибок валидации
        logger.error(f"Ошибка валидации данных: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ConfirmEmailView(View):
    def get(self, request, token):
        try:
            user = User.objects.filter(email_verification_token=token).first()

            if not user:
                return JsonResponse({"message": "Неверный токен подтверждения"}, status=400)

            if user.email_verified:
                return JsonResponse({"message": "Email уже подтвержден!"})

            user.email_verified = True
            user.email_verification_token = None
            user.save()

            return JsonResponse({"message": "Email успешно подтвержден!"})

        except Exception as e:
            logger.error(f"Ошибка при подтверждении email: {str(e)}")
            return JsonResponse({"message": f"Ошибка сервера: {str(e)}"}, status=500)


def csrf(request):
    return JsonResponse({'csrfToken': get_token(request)})

class LoginView(APIView):

    def post(self, request):
        serializer = LoginSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.validated_data
        login(request, user)

        token, _ = Token.objects.get_or_create(user=user)

        response_data = {
            "message": "Авторизация успешна!",
            "token": token.key,
            "user": {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "is_staff": user.is_staff
            },
        }

        return Response(response_data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    def post(self, request):
        if not request.user.is_authenticated:
            return Response(
                {"message": "Вы не авторизованы."},
                status=status.HTTP_400_BAD_REQUEST
            )

        logout(request)
        return Response(
            {"message": "Выход выполнен успешно!"},
            status=status.HTTP_200_OK
        )


class ProfileView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes     = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication credentials were not provided."},
                            status=status.HTTP_401_UNAUTHORIZED)

        serializer = UserProfileSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={'request': request}
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.filter(parent__isnull=True)
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        if self.action == 'retrieve' or self.action == 'list':
            return CategoryTreeSerializer
        return CategorySerializer

    @action(detail=True, methods=['get'])
    def filters(self, request, pk=None):
        category = self.get_object()
        filters = category.filters.all()
        serializer = FilterAttributeSerializer(filters, many=True)
        return Response(serializer.data)


# Представление для объявлений
class ListingViewSet(viewsets.ModelViewSet):
    queryset = Listing.objects.all().order_by('-created_at')
    serializer_class = ListingSerializer
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['title', 'description', 'address']
    parser_classes = [MultiPartParser, JSONParser]

    def get_queryset(self):
        queryset = super().get_queryset()
        queryset = queryset.select_related('user', 'category').prefetch_related(
            'images',
            Prefetch('listingcategory_set', queryset=ListingCategory.objects.select_related('category'))
        )

        category_id = self.request.GET.get('category')
        if category_id:
            from django.db.models import Q
            from django.db.models.functions import Lower

            def get_all_child_ids(parent_id):
                ids = [parent_id]
                children = Category.objects.filter(parent_id=parent_id)
                for child in children:
                    ids.extend(get_all_child_ids(child.id))
                return ids

            try:
                # Получаем все ID в иерархии
                category_ids = get_all_child_ids(int(category_id))

                # Для отладки - выводим найденные ID категорий
                print(f"Filtering by category IDs: {category_ids}")

                # Фильтр для новых объявлений (прямое поле category)
                q_new = Q(category_id__in=category_ids)
                # Фильтр для старых объявлений (через listingcategory_set)
                q_old = Q(listingcategory__category_id__in=category_ids)

                queryset = queryset.filter(q_new | q_old).distinct()
            except (ValueError, Category.DoesNotExist) as e:
                print(f"Error filtering by category: {e}")
                pass

        # Фильтрация по городу (только по address, так как location нет в модели)
        city = self.request.GET.get('city')
        if city:
            from django.db.models import Q
            clean_city = city.replace('г.', '').replace('город', '').strip()
            queryset = queryset.filter(
                Q(address__icontains=city)
            )

        # Фильтрация по цене
        price_min = self.request.GET.get('price_min')
        price_max = self.request.GET.get('price_max')

        if price_min:
            try:
                queryset = queryset.filter(price__gte=float(price_min))
            except (ValueError, TypeError):
                pass

        if price_max:
            try:
                queryset = queryset.filter(price__lte=float(price_max))
            except (ValueError, TypeError):
                pass

        return queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def create(self, request, *args, **kwargs):
        if not request.FILES.getlist('images'):
            logger.warning("Попытка создания объявления без изображений")
            return Response(
                {"error": "Необходимо загрузить хотя бы одно изображение"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Ошибка создания объявления: {str(e)}")
            error_msg = getattr(e, 'detail', str(e))
            return Response(
                {"error": error_msg},
                status=status.HTTP_400_BAD_REQUEST
            )

    # Оставляем ваши кастомные actions без изменений
    @action(detail=False, methods=['get'])
    def my(self, request):
        listings = self.get_queryset().filter(user=request.user)
        serializer = self.get_serializer(listings, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_category(self, request):
        category_id = request.query_params.get('category')
        queryset = self.get_queryset()
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


# Представление для изображений
class ImageViewSet(viewsets.ModelViewSet):
    queryset = Image.objects.all()
    serializer_class = ImageSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


# Представление для избранных
class FavoriteViewSet(viewsets.ModelViewSet):
    queryset = Favorite.objects.all()
    serializer_class = FavoriteSerializer
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [TokenAuthentication]

    def get_queryset(self):
        return super().get_queryset().filter(user=self.request.user).select_related('listing').prefetch_related('listing__images')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all().order_by('-created_at')
    serializer_class = ReviewSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        reviewed_id = self.request.query_params.get('reviewed')
        if reviewed_id:
            queryset = queryset.filter(reviewed_id=reviewed_id)
        return queryset

    def perform_create(self, serializer):
        # Убедимся, что reviewed передается в данных запроса
        if 'reviewed' not in serializer.validated_data:
            raise ValidationError({'reviewed': 'Это поле обязательно'})
        serializer.save()


# Представление для связей между объявлениями и категориями
class ListingCategoryViewSet(viewsets.ModelViewSet):
    queryset = ListingCategory.objects.all()
    serializer_class = ListingCategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class CurrentUserView(APIView):
    def get(self, request):
        user_id = request.session.get('user_id')
        if not user_id:
            return Response({"error": "Вы не авторизованы"}, status=status.HTTP_401_UNAUTHORIZED)

        user = User.objects.get(id=user_id)
        return JsonResponse({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "phone_number": user.phone_number
        })


class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.none()
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [TokenAuthentication]

    def get_queryset(self):
        user = self.request.user
        other_id = self.request.query_params.get('user_id')
        if other_id:
            return Message.objects.filter(
                Q(sender=user,   receiver_id=other_id) |
                Q(sender_id=other_id, receiver=user)
            ).order_by('created_at')
        return Message.objects.none()

    @action(detail=False, methods=['get'])
    def conversations(self, request):
        user = request.user
        # Все ID собеседников
        sent_ids     = Message.objects.filter(sender=user).values_list('receiver', flat=True)
        received_ids = Message.objects.filter(receiver=user).values_list('sender',   flat=True)
        interlocutors = set(chain(sent_ids, received_ids))

        convos = []
        for uid in interlocutors:
            # последнее сообщение с этим юзером
            last_msg = Message.objects.filter(
                Q(sender=user, receiver_id=uid) |
                Q(sender_id=uid, receiver=user)
            ).order_by('-created_at').first()
            if not last_msg:
                continue
            u = User.objects.get(pk=uid)
            convos.append({
                'user': {
                    'id': u.id,
                    'username': u.username,
                },
                'last_message': MessageSerializer(last_msg).data
            })

        # отсортировать по дате последнего сообщения, чтобы сверху самые свежие
        convos.sort(key=lambda x: x['last_message']['created_at'], reverse=True)
        return Response(convos)

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)

@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
class MyListingsView(generics.ListAPIView):
    serializer_class = ListingSerializer

    def get_queryset(self):
        return Listing.objects.filter(user=self.request.user)

@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
class MyFavoritesView(generics.ListAPIView):
    serializer_class = FavoriteSerializer

    def get_queryset(self):
        return Favorite.objects.filter(
            user=self.request.user
        ).select_related(
            'listing',
            'listing__user'
        ).prefetch_related(
            'listing__images'
        ).order_by('-id')


class FilterOptionsView(APIView):
    def get(self, request, category_id):
        try:
            category = Category.objects.get(pk=category_id)
            filters = category.filters.all()

            options = {}
            for filter_attr in filters:
                if filter_attr.attribute_type == 'select':
                    options[filter_attr.name] = filter_attr.options
                elif filter_attr.attribute_type == 'range':
                    options[f"{filter_attr.name}_min"] = filter_attr.min_value
                    options[f"{filter_attr.name}_max"] = filter_attr.max_value

            return Response(options)
        except Category.DoesNotExist:
            return Response({"error": "Category not found"}, status=404)

class CategoryFiltersView(APIView):
    def get(self, request, category_id):
        try:
            category = Category.objects.get(pk=category_id)
            filters = FilterAttribute.objects.filter(category=category)
            serializer = FilterAttributeSerializer(filters, many=True)
            return Response(serializer.data)
        except Category.DoesNotExist:
            return Response({"error": "Category not found"}, status=404)


@api_view(['POST'])
@permission_classes([AllowAny])
def request_password_reset(request):
    email = request.data.get('email')

    if not email:
        return Response(
            {'error': 'Email обязателен'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        user = User.objects.get(email=email)

        # Генерируем новый токен
        token = str(uuid.uuid4())
        user.password_reset_token = token
        user.password_reset_token_created = timezone.now()
        user.save()

        # Отправляем email
        reset_url = f"{settings.FRONTEND_URL}/reset-password/{token}/"
        send_mail(
            'Восстановление пароля',
            f'Для сброса пароля перейдите по ссылке: {reset_url}',
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )

        return Response(
            {'message': 'Письмо с инструкциями отправлено на ваш email'},
            status=status.HTTP_200_OK
        )

    except User.DoesNotExist:
        return Response(
            {'error': 'Пользователь с таким email не найден'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Ошибка при запросе сброса пароля: {str(e)}")
        return Response(
            {'error': 'Ошибка при обработке запроса'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def validate_reset_token(request, token):
    try:
        user = User.objects.get(password_reset_token=token)

        # Проверяем срок действия токена (24 часа)
        if timezone.now() > user.password_reset_token_created + timedelta(hours=24):
            return Response(
                {'valid': False, 'error': 'Срок действия ссылки истек'},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({'valid': True}, status=status.HTTP_200_OK)

    except User.DoesNotExist:
        return Response(
            {'valid': False, 'error': 'Неверный токен'},
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['GET'])
def test_api(request):
    return Response({
        "status": "success",
        "message": "API работает!",
        "data": {
            "user": request.user.username if request.user.is_authenticated else "Гость",
            "endpoints": ["listings", "users", "categories"]
        }
    })