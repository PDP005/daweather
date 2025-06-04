import React, { useEffect, useState } from "react";
import "../styles/WeatherDashboard.css";
import useFetchWeather from "../hooks/useFetchWeather";
import { Search } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";

function WeatherDashboard() {
  const [city, setCity] = useState("Madrid");
  const { weather, loading, error } = useFetchWeather(city);
  const [unit, setUnit] = useState("C");
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFavorite, setIsFavorite] = useState(false); // Nuevo estado
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleMouseMove = (event) => {
    const { clientX, clientY } = event;
    setMousePosition({ x: clientX, y: clientY });
  };

  const getTransform = (multiplierX, multiplierY) => {
    const offsetX = (mousePosition.x / window.innerWidth - 0.5) * multiplierX;
    const offsetY = (mousePosition.y / window.innerHeight - 0.5) * multiplierY;
    return `translate(${offsetX}px, ${offsetY}px)`;
  };

  const currentTemp =
    unit === "C" ? weather?.current?.temp_c : weather?.current?.temp_f;

  const dayName = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(
    currentTime
  );

  const time = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const bgCondition = weather?.current?.condition?.text
    ?.toLowerCase()
    .replace(/ /g, "-")
    .replace(/[^a-z0-9-]/g, "");

  const today = new Date();

  const forecastNext5Days = weather?.forecast?.forecastday?.slice(1, 6) || [];

  const getDayName = (forecastDate) => {
    const date = new Date(forecastDate);
    const options = { weekday: "long" };
    const dayName = new Intl.DateTimeFormat("en-US", options).format(date);
    const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    return diffDays === 1 ? "Tomorrow" : dayName;
  };

  const handleSearch = () => {
    if (city.trim() !== "") {
      setCity(city);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
        );
        const data = await response.json();
        if (data.address && data.address.city) {
          setCity(data.address.city);
        }
      });
    }
  }, []);

  // Nuevo: Manejar favoritos
  const handleFavoriteClick = () => {
    setIsFavorite((prev) => !prev);
  };

  return (
    <div className="container" onMouseMove={handleMouseMove}>
      <button className="logout-btn" onClick={handleLogout}>
        Logout
      </button>
      <div className="weather-card">
        <div className="info-header">
          <h3 className="day" style={{ transform: getTransform(10, 10) }}>
            {`${dayName} ${time}`}
          </h3>
          {/* Imagen artística según el fondo */}
          <div
            className={`info-header-bgimg  ${bgCondition || ""}`}
            style={{ transform: getTransform(5, 5) }}
          ></div>

          {weather && (
            <>
              <div className="bottom-info">
                <div className="bottom-info-left">
                  <h1
                    className="temperature"
                    style={{ transform: getTransform(10, 10) }}
                  >
                    {currentTemp}º
                  </h1>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <h2
                      className="region"
                      style={{
                        transform: getTransform(10, 10),
                        marginRight: 8,
                      }}
                    >
                      {weather.location.name}, {weather.location.country}
                    </h2>
                    <button
                      onClick={handleFavoriteClick}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "2rem",
                        color: isFavorite ? "#e63946" : "#adb5bd",
                        transition: "color 0.2s",
                        marginLeft: 4,
                        lineHeight: 1,
                      }}
                      aria-label="Add to favorites"
                    >
                      {isFavorite ? "❤️" : "🤍"}
                    </button>
                  </div>
                  <h3
                    className="condition"
                    style={{ transform: getTransform(10, 10) }}
                  >
                    {weather.current.condition.text}
                  </h3>
                </div>
                <div
                  className="unit-toggle"
                  style={{ transform: getTransform(10, 10) }}
                >
                  <span
                    className={`unit ${unit === "C" ? "active" : ""}`}
                    onClick={() => setUnit("C")}
                  >
                    Celsius
                  </span>
                  <span> | </span>
                  <span
                    className={`unit ${unit === "F" ? "active" : ""}`}
                    onClick={() => setUnit("F")}
                  >
                    Fahrenheit
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="right-panel">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Enter city name"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && city.trim() !== "") {
                  handleSearch();
                }
              }}
            />
            <button onClick={handleSearch}>
              <Search />
            </button>
          </div>
          {loading && <div>Loading...</div>}
          {error && <div>Error: {error}</div>}
          {!loading && weather && (
            <>
              <h2 className="right-panel-header">Weather Details</h2>
              <div className="details-grid">
                <div className="label">Cloudy</div>
                <div className="data">{weather.current.cloud}%</div>
                <div className="label">Humidity</div>
                <div className="data">{weather.current.humidity}%</div>
                <div className="label">Wind</div>
                <div className="data">{weather.current.wind_kph} km/h</div>
                <div className="label">Rain</div>
                <div className="data">{weather.current.precip_mm} mm</div>
              </div>
              <div className="forecast">
                {forecastNext5Days.map((day, index) => {
                  const { avgtemp_c, condition } = day.day;
                  const label = getDayName(day.date);
                  return (
                    <div key={index} className="forecast-card">
                      <h2>{label}</h2>
                      <p>{avgtemp_c}ºC</p>
                      <img src={condition.icon} alt="" />
                      <p>{condition.text}</p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
      <p className="copyright">Pedro&copy; All rights reserved. 2025</p>
    </div>
  );
}

export default WeatherDashboard;
