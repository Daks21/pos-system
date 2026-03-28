const API_URL = "http://localhost:8000";

const getAuthHeader = () => ({
  "Authorization": `Bearer ${sessionStorage.getItem("token")}`,
  "Content-Type": "application/json",
});

export const login = async (username, password) => {
  const response = await fetch(`${API_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) throw new Error("Invalid credentials");
  return response.json();
};

export const getProducts = async () => {
  const response = await fetch(`${API_URL}/api/products`, {
    headers: getAuthHeader(),
  });
  return response.json();
};

export const getSettings = async () => {
  const response = await fetch(`${API_URL}/api/settings`, {
    headers: getAuthHeader(),
  });
  return response.json();
};

export const checkout = async (payload) => {
  const response = await fetch(`${API_URL}/api/checkout`, {
    method: "POST",
    headers: getAuthHeader(),
    body: JSON.stringify(payload),
  });
  return response.json();
};