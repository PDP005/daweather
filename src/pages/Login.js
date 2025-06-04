import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore"; // Remove setDoc since it's not used
import "../styles/Login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/weather");
    } catch (err) {
      setError("Incorrect credentials");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Verificar si el usuario ya existe en Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (!userDoc.exists()) {
        // Cerrar sesión del usuario ya que no está registrado
        await auth.signOut();
        setError(
          "This Google account is not registered. Please sign up first."
        );
        return;
      }

      // Si existe, continuar con el login
      navigate("/weather");
    } catch (err) {
      if (err.code === "auth/popup-closed-by-user") {
        setError("Login cancelled");
      } else {
        setError("Error signing in with Google");
        console.error(err);
      }
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="weather-icon">
          <i className="fas fa-cloud-sun"></i>
        </div>
        <h1 className="login-title">DaWeather</h1>
        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <input
              type="email"
              placeholder="Mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input"
              required
            />
          </div>
          <div className="input-group">
            <div style={{ position: "relative", width: "100%" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                }}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>
          <button type="submit" className="login-button">
            Login
          </button>
        </form>
        {error && <p className="error-message">{error}</p>}

        <button
          onClick={handleGoogleLogin}
          className="google-login-button"
          style={{
            marginTop: "1rem",
            marginBottom: "1rem",
            background: "#fff",
            color: "#757575",
            border: "1px solid #ddd",
            borderRadius: "8px",
            padding: "0.5rem 1.2rem",
            fontWeight: 600,
            fontSize: "1rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            width: "100%",
          }}
        >
          <img
            src="https://www.google.com/favicon.ico"
            alt="Google"
            style={{ width: "20px", height: "20px" }}
          />
          Continue with Google
        </button>

        <p className="register-link">
          Don't have an account? <a href="/register">Register here</a>
        </p>

        <button
          className="login-guest-button"
          style={{
            marginTop: "1.5rem",
            background: "#adb5bd",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "0.5rem 1.2rem",
            fontWeight: 600,
            fontSize: "1rem",
            cursor: "pointer",
            transition: "background 0.2s",
            width: "100%",
          }}
          onClick={() => navigate("/weather")}
        >
          Continue without logging in
        </button>
      </div>
    </div>
  );
};

export default Login;
