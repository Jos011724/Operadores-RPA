import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
} from "react-router-dom";
import Login from "./Login";
import Dashboard from "./Dashboard";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));

  // Función para guardar token al login
  const handleLogin = (newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };

  // Función para salir
  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  return (
    <Router>
      <div className="navbar">
        <h2>🚁 Operadores-RPA</h2>
      </div>
      <div className="container">
        <Routes>
          <Route
            path="/login"
            element={
              !token ? <Login onLogin={handleLogin} /> : <Navigate to="/" />
            }
          />
          <Route
            path="/"
            element={
              token ? <Dashboard token={token} /> : <Navigate to="/login" />
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
