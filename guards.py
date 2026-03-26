from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from auth import SECRET_KEY, ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

def get_current_user(token: str = Depends(oauth2_scheme)):
  try:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    user_id: str = payload.get("sub")
    if user_id is None:
      raise HTTPException(status_code=401, detail="Invalid Credentials")
    return payload
  except JWTError:
    raise HTTPException(status_code=401, detail="Invalid Credentials")

def require_manager(current_user: dict = Depends(get_current_user)):
  if current_user.get("role") != "manager":
    raise HTTPException(status_code=403, detail="Manager access required")
  return current_user