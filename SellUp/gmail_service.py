import base64
import os
import pickle
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# Пути для сохранения учетных данных и токена
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GOOGLE_OAUTH2_CREDENTIALS_PATH = os.path.join(BASE_DIR, 'config', 'client_secret_164481806102-ubh2nck90p3lgjpfl3q7dkkhg0ac5d3k.apps.googleusercontent.com.json')
token_path = os.path.join(BASE_DIR, 'config', 'token.pickle')
SCOPES = ['https://www.googleapis.com/auth/gmail.send']

# Функция для авторизации и получения учетных данных
def get_credentials():
    if os.path.exists(token_path):
        with open(token_path, 'rb') as token:
            credentials = pickle.load(token)
    else:
        # Если токен не найден, проходим процесс авторизации
        flow = InstalledAppFlow.from_client_secrets_file(GOOGLE_OAUTH2_CREDENTIALS_PATH, SCOPES)
        credentials = flow.run_local_server(port=8000)
        with open(token_path, 'wb') as token:
            pickle.dump(credentials, token)
    return credentials

# Функция для отправки сообщения
def send_email():
    credentials = get_credentials()
    service = build('gmail', 'v1', credentials=credentials)

    # Пример отправки email
    message = create_message('me', 'recipient@example.com', 'Subject', 'Body text')
    send_message(service, 'me', message)

# Функции для создания сообщения и отправки
def create_message(sender, to, subject, body):
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    message = MIMEMultipart()
    message['to'] = to
    message['from'] = sender
    message['subject'] = subject
    msg = MIMEText(body)
    message.attach(msg)
    raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
    return {'raw': raw_message}

def send_message(service, sender, message):
    try:
        message = service.users().messages().send(userId=sender, body=message).execute()
        print(f'Message Id: {message["id"]}')
        return message
    except Exception as error:
        print(f'An error occurred: {error}')

