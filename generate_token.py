import os
import pickle
from google_auth_oauthlib.flow import InstalledAppFlow

# Путь к файлу с учетными данными
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
GOOGLE_OAUTH2_CREDENTIALS_PATH = os.path.join(BASE_DIR, 'config', 'client_secret_164481806102-ubh2nck90p3lgjpfl3q7dkkhg0ac5d3k.apps.googleusercontent.com.json')

# Путь для сохранения токена
TOKEN_PATH = os.path.join(BASE_DIR, 'config', 'token.pickle')

# Gmail API scope
SCOPES = ['https://www.googleapis.com/auth/gmail.send']

def generate_token():
    """Генерация и сохранение токена в файл"""
    try:
        # Создаем поток авторизации
        flow = InstalledAppFlow.from_client_secrets_file(GOOGLE_OAUTH2_CREDENTIALS_PATH, SCOPES)
        creds = flow.run_local_server(port=8000)

        # Сохраняем токен в файл
        with open(TOKEN_PATH, 'wb') as token_file:
            pickle.dump(creds, token_file)
            print(f" Токен сохранен в {TOKEN_PATH}")

    except Exception as e:
        print(f" Ошибка: {e}")


if __name__ == "__main__":
    generate_token()
