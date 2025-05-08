from django.db import models
from django.contrib.auth.hashers import make_password, check_password
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager, User
import random
import string

class Role(models.Model):
    name = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = 'Roles'

    def __str__(self):
        return self.name

    def set_password(self, raw_password):
        self.password_hash = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password_hash)

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)  # или твой password_hash
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError("Суперпользователь должен иметь is_staff=True.")
        if extra_fields.get('is_superuser') is not True:
            raise ValueError("Суперпользователь должен иметь is_superuser=True.")

        from .models import Role
        try:
            admin_role = Role.objects.get(id=1)
        except Role.DoesNotExist:
            raise ValueError("Роль с ID=1 не найдена. Убедитесь, что роль админа существует.")

        extra_fields.setdefault('role', admin_role)

        return self.create_user(email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    username = models.CharField(max_length=100, null=True, blank=True, unique=True)
    email = models.EmailField(max_length=255, unique=True)

    phone_number = models.CharField(max_length=15, null=True, blank=True)
    role = models.ForeignKey('Role', on_delete=models.CASCADE)

    email_verified = models.BooleanField(default=False)
    email_verification_token = models.CharField(max_length=100, null=True, blank=True)
    email_verification_sent_at = models.DateTimeField(null=True, blank=True)

    password_reset_token = models.CharField(max_length=255, null=True, blank=True)
    password_reset_token_created = models.DateTimeField(null=True, blank=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        db_table = 'Users'

    def __str__(self):
        return self.username or self.email


class Category(models.Model):
    name = models.CharField(max_length=100)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    filter_attributes = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'Categories'
        verbose_name_plural = "Categories"
        constraints = [
            models.UniqueConstraint(fields=['name', 'parent'], name='unique_category_name')
        ]

    def __str__(self):
        return self.full_path()

    def full_path(self):
        if self.parent:
            return f"{self.parent.full_path()} > {self.name}"
        return self.name

    @property
    def is_leaf(self):
        return not self.children.exists()


class FilterAttribute(models.Model):
    ATTRIBUTE_TYPES = (
        ('text', 'Text'),
        ('number', 'Number'),
        ('select', 'Select'),
        ('checkbox', 'Checkbox'),
        ('range', 'Range'),
    )

    name = models.CharField(max_length=100)
    attribute_type = models.CharField(max_length=20, choices=ATTRIBUTE_TYPES)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='filters')
    options = models.JSONField(default=list, blank=True)
    min_value = models.FloatField(null=True, blank=True)
    max_value = models.FloatField(null=True, blank=True)
    unit = models.CharField(max_length=20, blank=True)

    class Meta:
        db_table = 'FilterAttributes'
        unique_together = ('name', 'category')

    def __str__(self):
        return f"{self.category.name} - {self.name}"


class Listing(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    address = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    attributes = models.JSONField(default=dict)

    class Meta:
        db_table = 'Listings'

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.attributes:
            self.attributes = {}
        super().save(*args, **kwargs)


class Image(models.Model):
    listing = models.ForeignKey(Listing, related_name='images', on_delete=models.CASCADE)
    url = models.TextField()
    is_external = models.BooleanField(default=True)

    class Meta:
        db_table = 'Images'

    def __str__(self):
        return f"Image for {self.listing.title}"


# Модель для избранных
class Favorite(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE)

    class Meta:
        db_table = 'Favorites'
        unique_together = ('user', 'listing')

    def __str__(self):
        return f"Favorite: {self.user.username} - {self.listing.title}"


# Модель для отзывов
class Review(models.Model):
    reviewer = models.ForeignKey(User, related_name='reviews_written', on_delete=models.CASCADE)
    reviewed = models.ForeignKey(User, related_name='reviews_received', on_delete=models.CASCADE)
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)])  # Оценка от 1 до 5
    comment = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'Reviews'

    def __str__(self):
        return f"Review from {self.reviewer.username} to {self.reviewed.username}"


class ListingCategory(models.Model):
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)

    class Meta:
        db_table = 'ListingCategories'
        unique_together = ('listing', 'category')

    def __str__(self):
        return f"{self.listing.title} - {self.category.name}"


class EmailConfirmation(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    token = models.CharField(max_length=256, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Подтверждение почты для {self.user.email}"

class EmailConfirmationToken(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    token = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.token

class Message(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    @classmethod
    def generate_token(cls):
        return ''.join(random.choices(string.ascii_letters + string.digits, k=64))

    def __str__(self):
        return f"Reset token for {self.user.email}"