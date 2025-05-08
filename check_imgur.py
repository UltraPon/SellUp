import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'SellUp.settings')
django.setup()

from django.conf import settings
import requests


def test_imgur():
    print("Testing Imgur API connection...")

    # 1. Проверка Client ID
    print(f"\nClient ID: {settings.IMGUR_CLIENT_ID}")

    # 2. Проверка доступности API
    try:
        credits = requests.get(
            'https://api.imgur.com/3/credits',
            headers={'Authorization': f'Client-ID {settings.IMGUR_CLIENT_ID}'},
            timeout=5
        )
        print(f"Credits response: {credits.status_code}\n{credits.json()}")
    except Exception as e:
        print(f"Credits check failed: {str(e)}")
        return

    # 3. Тестовая загрузка
    try:
        with open('test.jpg', 'rb') as f:
            response = requests.post(
                'https://api.imgur.com/3/image',
                headers={'Authorization': f'Client-ID {settings.IMGUR_CLIENT_ID}'},
                files={'image': f},
                timeout=10
            )
            print(f"\nUpload test: {response.status_code}\n{response.json()}")
    except Exception as e:
        print(f"Upload test failed: {str(e)}")


if __name__ == "__main__":
    test_imgur()