import os
import base64
import pickle
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from email.mime.text import MIMEText

from SellUp import settings

# Путь к токену
TOKEN_PATH = os.path.join(settings.BASE_DIR, 'config', 'token.pickle')


def get_gmail_service():
    """Получение авторизованного сервиса Gmail"""
    creds = None
    if os.path.exists(TOKEN_PATH):
        with open(TOKEN_PATH, 'rb') as token_file:
            creds = pickle.load(token_file)

    # Обновление токена, если он истек
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())

        # Сохранение обновленного токена в файл
        with open(TOKEN_PATH, 'wb') as token_file:
            pickle.dump(creds, token_file)
            print(f"Токен обновлен и сохранен в {TOKEN_PATH}")

    # Создание Gmail API сервиса
    service = build('gmail', 'v1', credentials=creds)
    return service


def send_gmail(subject, message, to_email):
    """Отправка письма через Gmail API"""
    try:
        service = get_gmail_service()

        # Создаем MIME сообщение
        mime_message = MIMEText(message)
        mime_message['to'] = to_email
        mime_message['subject'] = subject
        encoded_message = base64.urlsafe_b64encode(mime_message.as_bytes()).decode()

        # Отправка письма
        send_message = {
            'raw': encoded_message
        }
        service.users().messages().send(userId='me', body=send_message).execute()
        print(" Письмо успешно отправлено!")

    except Exception as e:
        print(f" Ошибка при отправке письма: {e}")


def get_gmail_credentials():
    """Загружает токен из файла и обновляет его при необходимости"""
    creds = None

    # Проверка существования файла
    if os.path.exists(TOKEN_PATH):
        try:
            with open(TOKEN_PATH, 'rb') as token_file:
                creds = pickle.load(token_file)
        except Exception as e:
            print(f"Ошибка при загрузке токена: {e}")
            return None

    # Обновление токена, если истек
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())

        # Сохранение обновленного токена в файл
        with open(TOKEN_PATH, 'wb') as token_file:
            pickle.dump(creds, token_file)
            print(f"Токен обновлен и сохранен в {TOKEN_PATH}")

    return creds
