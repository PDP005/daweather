import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import WeatherDashboard from "./pages/WeatherDashboard";
import PrivateRoute from "./components/PrivateRoute";
import Register from "./pages/Register";
import UserInfo from "./pages/UserInfo";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WeatherDashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/user-info" element={<UserInfo />} />

        <Route
          path="/weather"
          element={
            <PrivateRoute>
              <WeatherDashboard />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
