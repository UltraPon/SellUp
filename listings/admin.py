from django.contrib import admin
from django.db.models import Count
from .models import Role, User, Category, Listing, Image, Favorite, Review, ListingCategory, FilterAttribute


class FilterAttributeInline(admin.TabularInline):
    model = FilterAttribute
    extra = 1
    fields = ['name', 'attribute_type', 'options', 'min_value', 'max_value', 'unit']


class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'parent', 'filters_count', 'is_root']
    list_filter = ['parent']
    search_fields = ['name']
    inlines = [FilterAttributeInline]

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        queryset = queryset.annotate(_filters_count=Count('filters'))
        return queryset

    def filters_count(self, obj):
        return obj._filters_count

    filters_count.admin_order_field = '_filters_count'

    def is_root(self, obj):
        return obj.parent is None

    is_root.boolean = True


class ListingCategoryInline(admin.TabularInline):
    model = ListingCategory
    extra = 1


class ListingAdmin(admin.ModelAdmin):
    list_display = ['title', 'price', 'user', 'created_at']
    list_filter = ['category', 'created_at']
    search_fields = ['title', 'description']
    inlines = [ListingCategoryInline]


# Регистрация моделей с кастомными админ-классами
admin.site.register(Category, CategoryAdmin)
admin.site.register(Listing, ListingAdmin)
admin.site.register(FilterAttribute)
admin.site.register(Role)
admin.site.register(User)
admin.site.register(Image)
admin.site.register(Favorite)
admin.site.register(Review)