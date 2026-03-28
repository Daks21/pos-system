import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    // safety check: empty fields
    if (!username || !password) {
      setError("Please enter username and password");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const data = await login(username, password);

      // redirect based on role
      if (data.role === "manager") {
        navigate("/pos");
      } else {
        navigate("/pos");
      }

    } catch (err) {
      setError("Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-body">
      <div className="login-card">
        <h2>Grocery POS</h2>
        <p>Please log in</p>

        <div style={{ color: "red", minHeight: "20px", marginBottom: "10px" }}>
          {error}
        </div>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? "Logging in..." : "LOGIN"}
        </button>
      </div>
    </div>
  );
}

export default LoginPage;