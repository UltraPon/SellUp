# Generated by Django 4.2.20 on 2025-05-02 23:32

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('listings', '0008_filterattribute_alter_category_options_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='image',
            name='is_external',
            field=models.BooleanField(default=True),
        ),
    ]
