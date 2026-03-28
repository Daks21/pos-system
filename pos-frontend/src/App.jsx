import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import POSPage from "./pages/POSPage";
import ManagerPage from "./pages/ManagerPage";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/pos" element={
          <ProtectedRoute>
            <POSPage />
          </ProtectedRoute>
        } />
        <Route path="/manager" element={
          <ProtectedRoute requireManager>
            <ManagerPage />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;