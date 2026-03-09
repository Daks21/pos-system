import psycopg2
from psycopg2 import Error

def get_connection():
  try:
    # linking parameters
    connection = psycopg2.connect(
      user="postgres",
      password="Admin@1234", # Actual Password of pgAdmin
      host="localhost",
      port="5432",
      database="grocery_pos"
    )
    return connection
  except Error as e:
    print(f"Database Connection Error: {e}")
    return None