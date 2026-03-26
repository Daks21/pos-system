from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response 
from database import get_connection
from guards import require_manager
import csv
import io 

router = APIRouter(prefix="/api/reports", tags=["reports"])

# Get /api/reports/summary
@router.get("/summary")
def get_summary(current_user: dict = Depends(require_manager)):
  conn = get_connection()
  cursor = conn.cursor()

  try:
    cursor.execute("""
      SELECT 
          COUNT(*)                        AS transaction_count,
          COALESCE(SUM(total_amount), 0)  AS revenue,
          COALESCE(AVG(total_amount), 0)  AS average_sale,
          COALESCE(SUM(tax_amount), 0)    AS total_tax
      FROM transactions
      WHERE refund_status = 'completed'
    """)
    row = cursor.fetchone()
    column_names = [desc[0] for desc in cursor.description]
    result = dict(zip(column_names, row))

    # Convert Decimal to float for JSON serialization
    return {
      "transaction_count": int(result["transaction_count"]),
      "revenue":           float(result["revenue"]),
      "average_sale":      float(result["average_sale"]),
      "total_tax":         float(result["total_tax"]),
    }
  
  finally:
    cursor.close()
    conn.close()

# Get /api/reports/daily-sales
@router.get("/daily-sales")
def get_daily_sales(current_user: dict = Depends(require_manager)):
  conn = get_connection()
  cursor = conn.cursor()

  try:
    cursor.execute("""
    SELECT
        DATE_TRUNC('day', created_at)::date  AS sale_date,
        COUNT(*)                             AS transaction_count,
        COALESCE(SUM(total_amount), 0)       AS daily_revenue
      FROM transactions
      WHERE refund_status = 'completed'
      AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY sale_date
      ORDER BY sale_date ASC
    """)
    rows = cursor.fetchall()
    column_names = [desc[0] for desc in cursor.description]

    return [
      {
        "sale_date":         str(row[0]),
        "transaction_count": int(row[1]),
        "daily_revenue":     float(row[2]),
      }
      for row in rows
    ]
  
  finally:
    cursor.close()
    conn.close()

# Get /api/reports/top-products
@router.get("/top-products")
def get_top_products(current_user: dict = Depends(require_manager)):
  conn = get_connection()
  cursor = conn.cursor()

  try:
    cursor.execute("""
      SELECT
          p.name,
          SUM(tl.quantity)    AS total_sold,
          SUM(tl.line_total)  AS total_revenue
      FROM transaction_lines tl
      JOIN products p     ON tl.product_id    = p.id
      JOIN transactions t ON tl.transaction_id = t.id
      WHERE t.refund_status = 'completed'
      GROUP BY p.name
      ORDER BY total_revenue DESC
      LIMIT 10
    """)
    rows = cursor.fetchall()

    return [
      {
        "name":          row[0],
        "total_sold":    float(row[1]),
        "total_revenue": float(row[2]),
      }
      for row in rows
    ]

  finally:
    cursor.close()
    conn.close()

# Get /api/reports/hourly-trend
@router.get("/hourly-trend")
def get_hourly_trend(current_user: dict = Depends(require_manager)):
  conn = get_connection()
  cursor = conn.cursor()

  try:
    cursor.execute("""
      SELECT 
        EXTRACT(HOUR FROM created_at)   AS hour,
        COUNT(*)                        AS transaction_count,
        COALESCE(SUM(total_amount), 0)  AS hourly_revenue
      FROM transactions
      WHERE refund_status = 'completed'
      AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY hour
      ORDER BY hour ASC
    """)
    rows = cursor.fetchall()

    return [
      {
        "hour":              int(row[0]),
        "transaction_count": int(row[1]),
        "hourly_revenue":    float(row[2]),
      }
      for row in rows
    ]
  finally:
    cursor.close()
    conn.close()

# GET /api/reports/payment-methods
@router.get("/payment-methods")
def get_payment_methods(current_user: dict = Depends(require_manager)):
  conn = get_connection()
  cursor = conn.cursor()

  try:
    cursor.execute("""
      SELECT 
        payment_method,
        COUNT(*)                        AS count,
        COALESCE(SUM(total_amount), 0)  AS total
      FROM transactions
      WHERE refund_status = 'completed'
      GROUP BY payment_method
    """)
    rows = cursor.fetchall()

    return [
      {
        "payment_method": row[0],
        "count":          int(row[1]),
        "total":          float(row[2]),
      }
      for row in rows
    ]

  finally:
    cursor.close()
    conn.close()

# GET /api/export/transactions
@router.get("/export/transactions")
def export_transactions(current_user: dict = Depends(require_manager)):
  conn = get_connection()
  cursor = conn.cursor()

  try:
    cursor.execute("""
      SELECT 
        t.id,
        t.created_at,
        u.username        AS cashier,
        t.payment_method,
        t.subtotal,
        t.discount_amount,
        t.tax_amount,
        t.total_amount,
        t.refund_status
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
    """)
    rows = cursor.fetchall()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
      "Transaction ID", "Date", "Cashier", "Payment Method",
      "Subtotal", "Discount", "Tax", "Total", "Status"
    ])
    writer.writerows(rows)

    return Response(
      content=output.getvalue(),
      media_type="text/csv",
      headers={
        "Content-Disposition": "attachment; filename=transactions.csv"
      }
    )

  finally:
    cursor.close()
    conn.close()

# GET /api/reports/transaction-history
@router.get("/transaction-history")
def get_transaction_history(current_user: dict = Depends(require_manager)):
  conn = get_connection()
  cursor = conn.cursor()

  try:
    cursor.execute("""
      SELECT 
        t.id              AS transaction_id,
        t.created_at,
        t.subtotal,
        t.discount_amount,
        t.tax_amount,
        t.total_amount,
        t.payment_method,
        t.refund_status,
        u.username        AS cashier
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
    """)
    rows = cursor.fetchall()

    return [
      {
        "transaction_id":  int(row[0]),
        "date":            str(row[1]),
        "subtotal":        float(row[2]),
        "discount":        float(row[3]),
        "tax":             float(row[4]),
        "total":           float(row[5]),
        "payment_method":  row[6],
        "refund_status":   row[7],
        "cashier":         row[8],
      }
      for row in rows
    ]

  finally:
    cursor.close()
    conn.close()