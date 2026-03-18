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
  tax_type: str = 'standard'

class CheckoutPayload(BaseModel):
  items: list[CartItem]
  payment_method: str 
  # for discount feature
  discount_type: str | None = None
  discount_value: float = 0.0
  discount_amount: float = 0.0  

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

  # JOIN with categories to get the category name
  cursor.execute("""
    SELECT p.id, p.name, p.price, p.unit_type, p.stock_quantity, 
           p.category_id, p.tax_type, c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = TRUE
  """)
  rows = cursor.fetchall()

  column_names = [desc[0] for desc in cursor.description]
  products_list = [dict(zip(column_names, row)) for row in rows]

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
def process_checkout(data: CheckoutPayload, current_user: dict = Depends(get_current_user)):
  conn = get_connection()
  cursor = conn.cursor()

  try:
    # fetch all tax rates from the database into a lookup dictionary
    # result will be: {'standard': 0.12, 'reduced': 0.05, 'exempt': 0.0}
    cursor.execute("SELECT name, rate FROM tax_rates")
    tax_rates_rows = cursor.fetchall()
    tax_rates_lookup = {row[0]: float(row[1]) for row in tax_rates_rows}

    # fallback in case tax_rates table is empty
    if not tax_rates_lookup:
      tax_rates_lookup = {'standard': 0.12, 'reduced': 0.05, 'exempt': 0.0}

    # calculate subtotal and per-line tax
    subtotal = 0
    total_tax = 0

    for item in data.items:
      line_total = item.quantity * item.unit_price
      subtotal += line_total

      # look up this item's tax rate by its tax_type
      # if tax_type is not found in lookup, fall back to standard rate
      item_tax_rate = tax_rates_lookup.get(item.tax_type, tax_rates_lookup.get('standard', 0.12))
      item_tax = line_total * item_tax_rate
      total_tax += item_tax

    # apply discount before final tax adjustment
    taxable_amount = subtotal - data.discount_amount
    
    # recalculate tax on taxable amount proportionally
    if subtotal > 0:
      tax_ratio = total_tax / subtotal
      adjusted_tax = taxable_amount * tax_ratio
    else:
      adjusted_tax = 0

    total_amount = taxable_amount + adjusted_tax

    # insert the master transaction record
    cursor.execute(
      """
      INSERT INTO transactions 
        (user_id, subtotal, tax_amount, total_amount, payment_method, discount_type, discount_amount)
      VALUES (%s, %s, %s, %s, %s, %s, %s)
      RETURNING id;
      """,
      (int(current_user["sub"]), subtotal, adjusted_tax, total_amount, 
       data.payment_method, data.discount_type, data.discount_amount)
    )
    new_transaction_id = cursor.fetchone()[0]

    # loop through items — insert lines and deduct stock
    for item in data.items:
      line_total = item.quantity * item.unit_price

      cursor.execute(
        """
        INSERT INTO transaction_lines 
          (transaction_id, product_id, quantity, unit_price, line_total)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (new_transaction_id, item.product_id, item.quantity, item.unit_price, line_total)
      )

      cursor.execute(
        """
        UPDATE products
        SET stock_quantity = stock_quantity - %s
        WHERE id = %s;
        """,
        (item.quantity, item.product_id)
      )

    conn.commit()
    return {"success": True, "transaction_id": new_transaction_id}

  except Exception as e:
    conn.rollback()
    return {"success": False, "error": str(e)}

  finally:
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

