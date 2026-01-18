import React, { useState } from "react";
import axios from "axios";
import API_URL from "./api";

function Login({ onLogin }) {
  const [run, setRun] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await axios.post("${API_URL}/api/auth/login", {
        run,
        password,
      });
      onLogin(res.data.token);
    } catch (err) {
      if (!err.response) setError("Error de conexión (Backend apagado)");
      else setError(err.response.data.error || "Credenciales incorrectas");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "#121212",
      }}
    >
      <div
        className="card"
        style={{ width: "400px", padding: "40px", border: "1px solid #333" }}
      >
        <h2
          style={{
            textAlign: "center",
            marginBottom: "30px",
            color: "#007bff",
            fontSize: "2rem",
          }}
        >
          🔐 Acceso Usuarios RPA
        </h2>

        {error && (
          <div
            style={{
              background: "#d32f2f",
              color: "white",
              padding: "15px",
              borderRadius: "5px",
              marginBottom: "20px",
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label style={{ color: "#ccc" }}>R.U.N. (Usuario)</label>
          <input
            type="text"
            placeholder="Ej: 12.345.678-9"
            onChange={(e) => setRun(e.target.value)}
            required
            style={{ fontSize: "1.2rem" }}
          />

          <label style={{ color: "#ccc" }}>Contraseña</label>
          <input
            type="password"
            placeholder="******"
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ fontSize: "1.2rem" }}
          />

          <button
            className="action-btn"
            style={{
              width: "100%",
              marginTop: "20px",
              padding: "15px",
              fontSize: "1.2rem",
            }}
          >
            INGRESAR AL SISTEMA
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
