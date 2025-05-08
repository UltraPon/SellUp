import os
import pickle
from google_auth_oauthlib.flow import InstalledAppFlow
from SellUp import settings

# Путь к файлу токена
TOKEN_PATH = os.path.join(settings.BASE_DIR, 'config', 'token.pickle')

def authenticate_and_save_token():
    """Проходит авторизацию и сохраняет токен"""
    flow = InstalledAppFlow.from_client_secrets_file(
        os.path.join(settings.BASE_DIR, 'config', 'credentials.json'),
        scopes=['https://www.googleapis.com/auth/gmail.send']
    )

    credentials = flow.run_local_server(port=8000)

    with open(TOKEN_PATH, 'wb') as token_file:
        pickle.dump(credentials, token_file)
        print(f"Токен сохранен в {TOKEN_PATH}")
