import os
import firebase_admin
from firebase_admin import credentials, messaging
from dotenv import load_dotenv

load_dotenv()

firebase_private_key = os.getenv('FIREBASE_PRIVATE_KEY')

if firebase_private_key is None:
    raise ValueError("Environment Variable 'FIREBASE_PRIVATE_KEY' is not set")

cred = credentials.Certificate({
    "type": "service_account",
    "project_id": "freshyfishy-kmch",
    "private_key_id": os.getenv('FIREBASE_PRIVATE_KEY_ID'),
    "private_key": os.getenv('FIREBASE_PRIVATE_KEY').replace('\\n', '\n'),
    "client_email": "firebase-adminsdk-p3jrl@freshyfishy-kmch.iam.gserviceaccount.com",
    "client_id": "116320245100207046750",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-p3jrl%40freshyfishy-kmch.iam.gserviceaccount.com",
    "universe_domain": "googleapis.com"
})
firebase_admin.initialize_app(cred)