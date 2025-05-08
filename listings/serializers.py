import json
import uuid
import time

import requests
import django.utils.timezone as timezone
from django.contrib.messages.storage import default_storage
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from rest_framework import serializers
from django.contrib.auth.hashers import make_password, check_password

from SellUp import settings
from .models import Role, User, Category, Listing, Image, Favorite, Review, ListingCategory, Message, FilterAttribute
from .views import logger


# Сериализатор для ролей
class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'name']


# Сериализатор для пользователей
class UserProfileSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)
    role_id = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all(),
        source='role',
        write_only=True,
        required=False,
        allow_null=True,
    )
    email_address = serializers.EmailField(source='email', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'email_address', 'phone_number', 'role', 'role_id', 'email_verified',
                  'is_active']
        extra_kwargs = {
            'email': {'read_only': True},
            'email_verified': {'read_only': True},
            'is_active': {'read_only': True},
        }

    def update(self, instance, validated_data):
        allowed_fields = ['username', 'phone_number', 'role']
        for field in allowed_fields:
            if field in validated_data:
                setattr(instance, field, validated_data[field])
        instance.save()
        return instance


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    confirm_password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    role_id = serializers.IntegerField(
        required=False,
        default=2
    )

    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'confirm_password', 'role_id', 'phone_number']
        extra_kwargs = {
            'password': {'write_only': True},
            'confirm_password': {'write_only': True},
        }

    def validate(self, attrs):
        if 'confirm_password' not in attrs:
            raise serializers.ValidationError(
                {'confirm_password': 'Подтверждение пароля обязательно'}
            )

        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError(
                {'password': 'Пароли не совпадают'}
            )

        if 'role_id' not in attrs:
            attrs['role_id'] = 2

        return attrs

    def validate_role_id(self, value):
        if not Role.objects.filter(id=value).exists():
            raise serializers.ValidationError('Указанная роль не существует')
        return value

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        role_id = validated_data.pop('role_id')
        role = Role.objects.get(id=role_id)

        user = User.objects.create(
            role=role,
            **validated_data
        )

        user.set_password(validated_data['password'])
        user.email_verification_token = str(uuid.uuid4())
        user.email_verification_sent_at = timezone.now()
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(trim_whitespace=False)

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        if ' ' in password:
            raise serializers.ValidationError({
                "password": "Пароль не должен содержать пробелы."
            })

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({
                "non_field_errors": ["Неверный email или пароль."]
            })

        if not user.email_verified:
            raise serializers.ValidationError({
                "non_field_errors": ["Email не подтвержден. Проверьте вашу почту."]
            })

        if not user.check_password(password):
            raise serializers.ValidationError({
                "non_field_errors": ["Неверный email или пароль."]
            })

        if not user.is_active:
            raise serializers.ValidationError({
                "non_field_errors": ["Аккаунт деактивирован."]
            })

        return user


# Сериализатор для атрибутов фильтрации
class FilterAttributeSerializer(serializers.ModelSerializer):
    class Meta:
        model = FilterAttribute
        fields = ['id', 'name', 'attribute_type', 'options', 'min_value', 'max_value', 'unit']


# Сериализатор для категорий с вложенностью
class CategoryTreeSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    filters = FilterAttributeSerializer(many=True, read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'name', 'parent', 'children', 'filters']

    def get_children(self, obj):
        if obj.children.exists():
            return CategoryTreeSerializer(obj.children.all(), many=True).data
        return None


# Сериализатор для категорий (упрощенный)
class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'parent']


# Сериализатор для изображений
class ImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Image
        fields = ['id', 'url']


# Сериализатор для связей между объявлениями и категориями
class ListingCategorySerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)

    class Meta:
        model = ListingCategory
        fields = ['id', 'category']


# Сериализатор для объявлений с поддержкой фильтров
class ListingSerializer(serializers.ModelSerializer):
    images = ImageSerializer(many=True, read_only=True)
    categories = ListingCategorySerializer(many=True, read_only=True, source='listingcategory_set')
    user = UserProfileSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source='category',
        write_only=True,
        required=True
    )
    filters = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = [
            'id', 'title', 'description', 'price', 'address', 'created_at',
            'user', 'images', 'categories', 'category', 'category_id',
            'attributes', 'filters'
        ]
        extra_kwargs = {
            'title': {'required': True},
            'price': {'required': True},
            'address': {'required': True},
            'attributes': {'required': False}
        }

    def get_filters(self, obj):
        if obj.category:
            return FilterAttributeSerializer(
                obj.category.filters.all(),
                many=True
            ).data
        return []

    def validate(self, data):
        request = self.context.get('request')
        if not request:
            raise serializers.ValidationError("Request context is missing")

        if not request.FILES.getlist('images'):
            raise serializers.ValidationError({"images": "Необходимо загрузить хотя бы одно изображение"})

        if len(request.FILES.getlist('images')) > 10:
            raise serializers.ValidationError({"images": "Максимальное количество изображений - 10"})

        max_size = 10 * 1024 * 1024  # 10MB
        for image in request.FILES.getlist('images'):
            if image.size > max_size:
                raise serializers.ValidationError(
                    {"images": f"Изображение {image.name} слишком большое (максимум 10MB)"}
                )
            if not image.content_type.startswith('image/'):
                raise serializers.ValidationError(
                    {"images": f"Файл {image.name} не является изображением"}
                )
        return data

    def create(self, validated_data):
        request = self.context.get('request')
        if not request or not request.FILES.getlist('images'):
            raise serializers.ValidationError({"images": "Требуется хотя бы одно изображение"})

        try:
            with transaction.atomic():
                listing = Listing.objects.create(
                    user=request.user,
                    title=validated_data['title'],
                    description=validated_data.get('description', ''),
                    price=validated_data['price'],
                    address=validated_data['address'],
                    category=validated_data['category'],
                    attributes=validated_data.get('attributes', {})
                )

                success_count = 0
                for img_file in request.FILES.getlist('images')[:10]:  # Лимит 10 изображений
                    try:
                        img_url = self._upload_to_imgbb(img_file)
                        Image.objects.create(
                            listing=listing,
                            url=img_url,
                            is_external=True
                        )
                        success_count += 1
                    except Exception as e:
                        logger.error(f"Ошибка загрузки изображения: {str(e)}")
                        continue

                if success_count == 0:
                    raise serializers.ValidationError(
                        {"images": "Не удалось загрузить ни одного изображения на Imgur"}
                    )

                return listing

        except Exception as e:
            logger.error(f"Ошибка создания объявления: {str(e)}")
            raise serializers.ValidationError(
                {"error": f"Ошибка при создании объявления: {str(e)}"}
            )

    def _upload_to_imgbb(self, image_file):
        """Загрузка изображения на imgBB с использованием API ключа"""
        logger.info(f"Начинаем загрузку изображения на imgBB: {image_file.name}, размер: {image_file.size} байт")

        try:
            image_file.seek(0)
            if not image_file.content_type.startswith('image/'):
                raise ValueError(f"Файл {image_file.name} не является изображением")

            if image_file.size > 10 * 1024 * 1024:
                raise ValueError("Файл слишком большой (максимум 10MB)")

            # Считываем изображение в base64
            import base64
            image_data = base64.b64encode(image_file.read()).decode('utf-8')

            # Отправляем POST-запрос
            response = requests.post(
                'https://api.imgbb.com/1/upload',
                data={
                    'key': settings.IMGBB_API_KEY,
                    'image': image_data,
                    'name': image_file.name
                },
                timeout=15  # можно сделать настраиваемым
            )

            response.raise_for_status()
            data = response.json()

            if not data.get('success', False):
                error = data.get('error', {}).get('message', 'Неизвестная ошибка imgBB')
                raise ValueError(f"Ошибка imgBB: {error}")

            image_url = data['data']['url']
            logger.info(f"Изображение успешно загружено на imgBB: {image_url}")
            return image_url

        except Exception as e:
            logger.error(f"Ошибка загрузки изображения на imgBB: {str(e)}")
            raise Exception("Ошибка загрузки изображения. Попробуйте позже.")


# Сериализатор для избранных
class FavoriteSerializer(serializers.ModelSerializer):
    listing = ListingSerializer(read_only=True)
    listing_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Favorite
        fields = ['id', 'listing', 'listing_id']


# Сериализатор для отзывов
class ReviewSerializer(serializers.ModelSerializer):
    reviewer = serializers.SerializerMethodField()
    reviewed = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    class Meta:
        model = Review
        fields = ['id', 'reviewer', 'reviewed', 'rating', 'comment', 'created_at']
        read_only_fields = ['reviewer', 'created_at']

    def get_reviewer(self, obj):
        return {
            'id': obj.reviewer.id,
            'username': obj.reviewer.username
        }

    def create(self, validated_data):
        validated_data['reviewer'] = self.context['request'].user
        return super().create(validated_data)

    def validate(self, data):
        reviewed_user = data.get('reviewed')
        if reviewed_user and self.context['request'].user.id == reviewed_user.id:
            raise serializers.ValidationError("Вы не можете оставить отзыв самому себе")
        return data


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['id', 'sender', 'receiver', 'content', 'created_at', 'is_read']
        read_only_fields = ['sender', 'created_at', 'is_read']