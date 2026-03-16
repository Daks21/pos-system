import os
from datetime import datetime, timedelta
from jose import JWTError, jwt 
from passlib.context import CryptContext
from dotenv import load_dotenv

# Load the secrets from  .env file
load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480    # 8-hour shift

# set up the hashing engine
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# The password verifier
def verify_password(plain_password, hashed_password):
  # compares the typed password against the database hash
  return pwd_context.verify(plain_password, hashed_password)

# optional helper for the future (if building a "create user" feature)
def get_password_hash(password):
  return pwd_context.hash(password)

# The badge maker (JWT Generator)
def create_access_token(data: dict):
  to_encode = data.copy()
  # calculate exactly when this  token should self-destruct
  expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
  to_encode.update({"exp": expire})

  # cryptographically sign the token using SECRET_KEY
  encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
  return encoded_jwt
