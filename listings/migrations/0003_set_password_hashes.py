from django.db import migrations
from django.contrib.auth.hashers import make_password

def set_password_hashes(apps, schema_editor):
    User = apps.get_model('listings', 'User')
    for user in User.objects.filter(password_hash=''):
        # Устанавливаем временный пароль для пользователей с пустым password_hash
        user.password_hash = make_password('temporary_password')
        user.save()

class Migration(migrations.Migration):
    dependencies = [
        ('listings', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(set_password_hashes),
    ]