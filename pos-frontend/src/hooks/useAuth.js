import { useState } from "react";
import { login as loginApi } from "../services/api";

export function useAuth() {
  const [token, setToken] = useState(sessionStorage.getItem("token") || null);
  const [user, setUser] = useState({
    username: sessionStorage.getItem("username") || null,
    role: sessionStorage.getItem("role") || null,
  });

  const login = async (username, password) => {
    const data = await loginApi(username, password);
    
    // save to sessionStorage
    sessionStorage.setItem("token", data.access_token);
    sessionStorage.setItem("role", data.role);
    sessionStorage.setItem("username", data.username);

    // update state
    setToken(data.access_token);
    setUser({ username: data.username, role: data.role });

    return data;
  };

  const logout = () => {
    sessionStorage.clear();
    setToken(null);
    setUser({ username: null, role: null });
  };

  return { token, user, login, logout };
}