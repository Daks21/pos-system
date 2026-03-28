function CartItem({ id, name, price, quantity, currency, onRemove, onQuantityChange }) {
  const lineTotal = price * quantity;

  return (
    <div className="cart-item-row">
      <div className="item-info">
        <strong>{name}</strong>
        <div className="qty-controls">
          <button 
            className="qty-btn" 
            onClick={() => onQuantityChange(id, quantity - 1)}
          >-</button>
          <span>{quantity}</span>
          <button 
            className="qty-btn" 
            onClick={() => onQuantityChange(id, quantity + 1)}
          >+</button>
          <small>x {currency}{price.toFixed(2)}</small>
        </div>
      </div>
      <div className="item-total">
        {currency}{lineTotal.toFixed(2)}
      </div>
      <button 
        className="remove-btn" 
        onClick={() => onRemove(id)}
      >x</button>
    </div>
  );
}

export default CartItem;