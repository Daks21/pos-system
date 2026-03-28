function ProductButton({ id, name, price, currency, onAdd }) {
  return (
    <button
      className="product-btn"
      onClick={() => onAdd(id)}
    >
      <span className="product-name">{name}</span>
      <span className="product-price">{currency} {price.toFixed(2)}</span>
    </button>
  );
}

export default ProductButton;