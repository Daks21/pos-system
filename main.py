from fastapi import FastAPI 
from database import get_connection # importing database
from pydantic import BaseModel # inspects comming data from the frontend to ensure match
from fastapi.middleware.cors import CORSMiddleware # im port the guard
from fastapi import Depends, HTTPException, status 
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from psycopg2.extras import RealDictCursor

# from auth engine
from auth import verify_password, create_access_token, SECRET_KEY, ALGORITHM

app = FastAPI()

# configure the guard
app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"], # allows any frontend to connect (VIP pass)
  allow_credentials=True,
  allow_methods=["*"], # allow GET, POST, etc.
  allow_headers=["*"],
)

# define the expected shape of incoming data
class CartItem(BaseModel):
  product_id: int
  quantity: float
  unit_price: float

class CheckoutPayload(BaseModel):
  items: list[CartItem]
  payment_method: str 
  # cashier_id: int

class LoginRequest(BaseModel):
  username: str
  password: str

# tells fastapi where the Login is
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

# Guard 1: Checks if user is logged in AT ALL (Cashier or Manager)
def get_current_user(token: str = Depends(oauth2_scheme)):
  try:
    # try to read the cryptographically signed badge
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    user_id: str = payload.get("sub")
    if user_id is None:
      raise HTTPException(status_code=401, detail="Invalid Credentials")
    return payload    # Returns the dict: {sub, username, role}
  except JWTError:
    # If the badge is fake, tampered with, or expired, kick user out
    raise HTTPException(status_code=401, detail="Invalid Credentials")

# Guard 2: Checks if user is Manager spcifically
def require_manager(current_user: dict = Depends(get_current_user)):
  if current_user.get("role") != "manager":
    raise HTTPException(status_code=403, detail="Manager access required")
  return current_user


# read how many products
@app.get("/")
def read_root():
  # starting
  conn = get_connection()

  if conn:
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM products;")
    product_count = cursor.fetchone()[0]

    # stopping when done
    cursor.close()
    conn.close()

    return {
      "status": "Pipeline Connected!",
      "total_products_in_warehouse": product_count
    }
  else:
    return {"status": "Pipeline failed. Check terminal for leaks/errors."}

# Get all active products
@app.get("/api/products")
def get_products():
  conn = get_connection()
  cursor = conn.cursor()

  # SQL query
  cursor.execute("SELECT id, name, price, unit_type, stock_quantity, category_id FROM products WHERE is_active = TRUE")
  rows = cursor.fetchall() # get all raw data

  # get the column names (the labels)
  column_names = [desc[0] for desc in cursor.description]

  # zip the labels and the data together into a list of dictionaries
  products_list = [dict(zip(column_names, row)) for row in rows]

  # close the valves
  cursor.close()
  conn.close()

  return products_list

# Get Store Settings
@app.get("/api/settings")
def get_settings():
  conn = get_connection()
  cursor = conn.cursor()

  cursor.execute("SELECT * FROM store_settings WHERE id = 1")
  row = cursor.fetchone() # get just the single row

  column_names = [desc[0] for desc in cursor.description]

  # zip into a single dictionary (if a row exists)
  settings_dict = dict(zip(column_names, row)) if row else {}

  cursor.close()
  conn.close()

  return settings_dict

# get categories
@app.get("/api/categories")
def get_categories():
  
  conn = get_connection()
  cursor = conn.cursor()

  cursor.execute("SELECT id, name FROM categories")
  rows = cursor.fetchall()

  column_names = [desc[0] for desc in cursor.description]
  categories_list = [dict(zip(column_names, row)) for row in rows]

  cursor.close()
  conn.close()

  return categories_list

# checkout endpoint
@app.post("/api/checkout")
def process_checkout(data: CheckoutPayload):
  conn = get_connection()
  cursor = conn.cursor()

  try:
    # recalculate totals (never trust frontend math)
    cursor.execute("SELECT tax_rate FROM store_settings WHERE id = 1")
    tax_rate_row = cursor.fetchone()
    tax_rate = float(tax_rate_row[0]) if tax_rate_row else 0.12

    # calculate subtotal by looping through items
    subtotal = sum(item.quantity * item.unit_price for item in data.items)
    tax_amount = subtotal * tax_rate
    total_amount =subtotal + tax_amount

    # Insert into transaction (the master work order)
    cursor.execute(
      """
      INSERT INTO transactions (user_id, subtotal, tax_amount, total_amount, payment_method)
      VALUES (%s, %s, %s, %s, %s)
      RETURNING id;
      """,
      (data.cashier_id, subtotal, tax_amount, total_amount, data.payment_method)
    )
    new_transaction_id = cursor.fetchone()[0] # grabs newly generated receipt id
    
    # loop through the cart to write lines and deduct stock
    for item in data.items:
      line_total = item.quantity * item.unit_price

      # insert the line item
      cursor.execute(
        """
        INSERT INTO transaction_lines (transaction_id, product_id, quantity, unit_price, line_total)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (new_transaction_id, item.product_id, item.quantity, item.unit_price, line_total)
      )

      # update the inventory
      cursor.execute(
        """
        UPDATE products
        SET stock_quantity = stock_quantity - %s
        WHERE id = %s;
        """,
        (item.quantity, item.product_id)
      )
    
    # Save all changes permanently
    conn.commit()
    return {"success": True, "transaction_id": new_transaction_id}

  except Exception as e:
    # The E-stop: undo everything if a single step failed
    conn.rollback()
    return {"success": False, "error": str(e)}
  
  finally:
    # closing
    cursor.close()
    conn.close()

# The Login Route
@app.post("/api/login")
def login(req: LoginRequest):
  conn = get_connection()
  if not conn:
    raise HTTPException(status_code=500, detail="Database Connection Failed")

  try: 
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    # 1. Look up the user by username
    cursor.execute("SELECT * FROM users WHERE username = %s", (req.username,))
    user = cursor.fetchone()

    # 2. Safety Check: if user doesn't exist OR password doesn't match hash
    if not user or not verify_password(req.password, user['password_hash']):
      raise HTTPException(status_code=401, detail="Invalid Credentials")

    # 3. Success! Print JWT Badge
    token_data = {
      "sub": str(user['id']),
      "username": user['username'],
      "role": user['role']
    }
    access_token = create_access_token(data=token_data)

    # 4. hand the badge to the front_end
    return {
      "access_token": access_token,
      "token_type": "bearer",
      "role": user['role'],
      "username": user['username']
    }
  finally:
    cursor.close()
    conn.close()

