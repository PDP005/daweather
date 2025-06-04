import React, { useEffect, useState } from "react";
import "../styles/WeatherDashboard.css";
import useFetchWeather from "../hooks/useFetchWeather";
import { Search } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

function WeatherDashboard() {
  const [city, setCity] = useState("");
  const [searchInput, setSearchInput] = useState(""); // Inicialmente vacío
  const { weather, loading, error } = useFetchWeather(city);
  const [unit, setUnit] = useState("C");
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFavorite, setIsFavorite] = useState(false);
  const [userUid, setUserUid] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userName, setUserName] = useState("");
  const [showFavModal, setShowFavModal] = useState(false);
  const [favPlaces, setFavPlaces] = useState([]);
  const navigate = useNavigate();
  const [showErrorModal, setShowErrorModal] = useState(false);

  // Detectar usuario autenticado
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setUserUid(user.uid);
      else setUserUid(null);
    });
    return () => unsubscribe();
  }, []);

  // Comprobar si la ciudad ya está en favoritos al cargar/cambiar ciudad
  useEffect(() => {
    const checkFavorite = async () => {
      if (!userUid || !weather?.location?.name) return;
      const userRef = doc(db, "users", userUid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const favplaces = userSnap.data().favplaces || [];
        setIsFavorite(favplaces.includes(weather.location.name));
      }
    };
    checkFavorite();
  }, [userUid, weather?.location?.name]); // Cambia la dependencia a weather.location.name

  // Handler para añadir o quitar de favoritos
  const handleFavoriteClick = async () => {
    // Primero verifica si hay error o si la ciudad no existe
    if (error || !weather?.location?.name) {
      setShowErrorModal(true);
      return;
    }

    // Si no hay usuario, muestra el modal de login
    if (!userUid) {
      setShowLoginModal(true);
      return;
    }

    const userRef = doc(db, "users", userUid);
    // Usar el nombre de la ubicación del clima en lugar del input
    const formattedCity = weather.location.name;

    try {
      if (isFavorite) {
        await updateDoc(userRef, {
          favplaces: arrayRemove(formattedCity),
        });
        setIsFavorite(false);
      } else {
        await updateDoc(userRef, {
          favplaces: arrayUnion(formattedCity),
        });
        setIsFavorite(true);
      }
    } catch (error) {
      console.error("Error updating favorites:", error);
    }
  };

  // Cargar el nombre del usuario desde Firestore
  useEffect(() => {
    const fetchUserName = async () => {
      if (userUid) {
        const userRef = doc(db, "users", userUid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserName(userSnap.data().name || "User");
        }
      } else {
        setUserName("");
      }
    };
    fetchUserName();
  }, [userUid]);

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

  // Move all time-related calculations to the top
  const sunriseStr =
    weather?.forecast?.forecastday?.[0]?.astro?.sunrise || "06:00 AM";
  const sunsetStr =
    weather?.forecast?.forecastday?.[0]?.astro?.sunset || "21:00 PM";

  function parseTime(str) {
    if (!str) return 0;
    const [time, ampm] = str.split(" ");
    let [h, m] = time.split(":").map(Number);
    if (ampm?.toLowerCase() === "pm" && h !== 12) h += 12;
    if (ampm?.toLowerCase() === "am" && h === 12) h = 0;
    return h * 60 + m;
  }

  const sunrise = parseTime(sunriseStr);
  const sunset = parseTime(sunsetStr);
  const tzId = weather?.location?.tz_id;

  function getLocalDate(tz) {
    if (!tz) return new Date();
    const now = new Date();
    const localStr = now.toLocaleString("en-US", { timeZone: tz });
    return new Date(localStr);
  }

  const localNow = getLocalDate(tzId);
  const nowMinutes = localNow.getHours() * 60 + localNow.getMinutes();

  // Move isDay calculation before it's used
  const isDay = nowMinutes >= sunrise && nowMinutes <= sunset;

  // Now bgCondition can safely use isDay
  const bgCondition = (() => {
    const condition = weather?.current?.condition?.text
      ?.toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^a-z0-9-]/g, "");

    // Si es de noche y el clima es clear o sunny, añade -night
    if (
      !isDay &&
      (condition === "clear" ||
        condition === "sunny" ||
        condition === "partly-cloudy")
    ) {
      return `${condition}-night`;
    }

    return condition || "";
  })();

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
    if (searchInput.trim() !== "") {
      setCity(searchInput);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const handleLogin = () => {
    navigate("/login");
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
          setSearchInput(data.address.city); // Sincroniza el input con la ciudad detectada
        }
      });
    }
  }, []);

  // Cierra el menú si haces click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".user-menu-container")) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSaveButtonClick = async () => {
    if (!userUid) {
      setFavPlaces([]); // Vacía la lista por si acaso
      setShowFavModal(true);
      setShowLoginModal(false); // Oculta el modal de login si estaba abierto
      return;
    }
    const userRef = doc(db, "users", userUid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      setFavPlaces(userSnap.data().favplaces || []);
      setShowFavModal(true);
    }
  };

  // --- LÓGICA DEL ARCO DE SOL ---
  let moonProgress = 0;
  if (!isDay) {
    // Noche antes del amanecer
    if (nowMinutes < sunrise) {
      // Desde el atardecer anterior hasta el amanecer de hoy
      moonProgress = Math.max(
        0,
        Math.min(1, (nowMinutes + (1440 - sunset)) / (1440 - sunset + sunrise))
      );
    } else {
      // Noche después del atardecer
      moonProgress = Math.max(
        0,
        Math.min(1, (nowMinutes - sunset) / (1440 - sunset + sunrise))
      );
    }
  }

  let progress = 0.5;
  if (sunset > sunrise) {
    progress = Math.max(
      0,
      Math.min(1, (nowMinutes - sunrise) / (sunset - sunrise))
    );
  }

  const arcStart = { x: 10, y: 80 };
  const arcEnd = { x: 170, y: 80 };
  const arcControl = { x: 90, y: 0 };

  function getArcPoint(t) {
    const x =
      (1 - t) * (1 - t) * arcStart.x +
      2 * (1 - t) * t * arcControl.x +
      t * t * arcEnd.x;
    const y =
      (1 - t) * (1 - t) * arcStart.y +
      2 * (1 - t) * t * arcControl.y +
      t * t * arcEnd.y;
    return { x, y };
  }

  // 1. Primero mantén el useEffect que ya tienes
  useEffect(() => {
    if (error) {
      setShowErrorModal(true);
    }
  }, [error]);

  // 1. Añade este useEffect para manejar la tecla ESC
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === "Escape" && showErrorModal) {
        setShowErrorModal(false);
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [showErrorModal]);

  return (
    <div className="container" onMouseMove={handleMouseMove}>
      {showLoginModal && (
        <div className="modal-overlay">
          <div className="modal">
            <p>You must log in to add favorites.</p>
            <div className="buttons">
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  handleLogin();
                }}
              >
                Go to Login
              </button>
              <button onClick={() => setShowLoginModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {showFavModal && (
        <div className="modal-overlay">
          <div className="modal">
            {!userUid ? (
              <>
                <p>You must be registered to view your favorite places.</p>
                <button
                  style={{
                    marginTop: "1rem",
                    background: "#48cae4",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.5rem 1.2rem",
                    fontWeight: 600,
                    fontSize: "1rem",
                    cursor: "pointer",
                    transition: "background 0.2s",
                  }}
                  onClick={() => {
                    setShowFavModal(false);
                    navigate("/login");
                  }}
                >
                  Go to Login
                </button>
              </>
            ) : favPlaces.length === 0 ? (
              <p>No favorite places yet.</p>
            ) : (
              <ul
                style={{
                  textAlign: "left",
                  margin: "1rem 0",
                  padding: 0,
                  listStyle: "none",
                }}
              >
                <h2
                  style={{
                    textAlign: "center",
                    margin: "1rem 0",
                    padding: 0,
                    listStyle: "none",
                  }}
                >
                  Your Favorite Places
                </h2>

                {favPlaces.map((place, idx) => (
                  <li
                    key={idx}
                    style={{
                      marginBottom: idx === favPlaces.length - 1 ? 0 : "0.7rem",
                    }}
                  >
                    <button
                      style={{
                        background: "#48cae4",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        padding: "0.5rem 1.2rem",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "1rem",
                        width: "100%",
                        textAlign: "center",
                        transition: "background 0.2s",
                      }}
                      onClick={() => {
                        setCity(place);
                        setSearchInput(place);
                        setShowFavModal(false);
                      }}
                    >
                      {place}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button onClick={() => setShowFavModal(false)}>Close</button>
          </div>
        </div>
      )}

      {/* 1. Barra de búsqueda y favoritos centrados */}
      <div className="search-header-center">
        <div className="search-bar-outer">
          <div className="search-bar search-bar-large">
            <input
              type="text"
              placeholder="Enter city name"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchInput.trim() !== "") {
                  handleSearch();
                }
              }}
            />
            <button onClick={handleSearch}>
              <Search />
            </button>
          </div>
          <button
            className="fav-btn"
            aria-label="Show Favorites"
            onClick={handleSaveButtonClick}
          >
            <img className="fav-btn-img" src="/fav.png" alt="Save" />
          </button>
        </div>
      </div>

      {/* 2. Icono de login en la esquina superior derecha */}
      <div className="user-menu-container">
        <button
          className="user-icon-btn"
          onClick={() => setShowUserMenu((v) => !v)}
          aria-label="User menu"
        >
          👤
        </button>
        {showUserMenu && (
          <div className="user-dropdown">
            {userUid && auth.currentUser ? (
              <div className="user-info-block">
                <div className="user-avatar">👤</div>
                <div className="user-details">
                  <div className="user-name">
                    {auth.currentUser.displayName || "User"}
                  </div>
                  <div className="user-email">{userName}</div>
                </div>
              </div>
            ) : (
              <div className="user-info-block">
                <div className="user-avatar">👤</div>
                <div className="user-details">
                  <div className="user-name">Guest</div>
                  <div className="user-email">Not logged in </div>
                </div>
              </div>
            )}
            <div className="user-actions">
              {userUid ? (
                <>
                  <button onClick={handleLogout}>Logout</button>
                  <button
                    style={{ marginLeft: 8 }}
                    onClick={() => navigate("/user-info")}
                  >
                    More info
                  </button>
                </>
              ) : (
                <button onClick={handleLogin}>Login</button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. El resto de tu dashboard */}
      <div className="weather-card">
        <div className="info-header">
          <h3 className="day" style={{ transform: getTransform(10, 10) }}>
            {`${dayName} ${time}`}
            {weather?.location?.localtime && (
              <span
                style={{
                  fontSize: "1rem",
                  fontWeight: 400,
                  marginLeft: 12,
                  color: "#fff9",
                }}
              >
                | Local time {weather.location.localtime.split(" ")[1]}
              </span>
            )}
          </h3>
          <div
            className={`info-header-bgimg  ${bgCondition || ""}`}
            style={{ transform: getTransform(5, 5) }}
          ></div>

          {weather && (
            <>
              <div className="bottom-info">
                <div className="bottom-info-left">
                  <div className="main-temp-row">
                    <div className="main-temp-box">
                      <span className="main-temp-label">Now</span>
                      {weather?.current?.condition?.icon && (
                        <img
                          src={weather.current.condition.icon}
                          alt={weather.current.condition.text}
                          className="main-temp-icon"
                        />
                      )}
                      <span className="main-temp-value">{currentTemp}º</span>
                    </div>
                    {weather?.forecast?.forecastday?.[0]?.hour &&
                      (() => {
                        // Hora local actual
                        const nowHour = localNow.getHours();
                        // Horas futuras del día actual
                        const todayHours =
                          weather.forecast.forecastday[0].hour.filter(
                            (h) =>
                              Number(h.time.split(" ")[1].split(":")[0]) >
                              nowHour
                          );
                        // Si faltan horas para llegar a 5, añade del día siguiente
                        let hours = [...todayHours];
                        if (
                          hours.length < 5 &&
                          weather.forecast.forecastday[1]
                        ) {
                          const nextDayHours =
                            weather.forecast.forecastday[1].hour.slice(
                              0,
                              5 - hours.length
                            );
                          hours = [...hours, ...nextDayHours];
                        }
                        return hours.slice(0, 5).map((h, idx) => (
                          <div className="next-hour-box" key={idx}>
                            <span className="next-hour-time">
                              {h.time.split(" ")[1].slice(0, 5)}
                            </span>
                            <img
                              src={h.condition.icon}
                              alt={h.condition.text}
                              className="next-hour-icon"
                            />
                            <span className="next-hour-temp">
                              {unit === "C" ? h.temp_c : h.temp_f}º
                            </span>
                          </div>
                        ));
                      })()}
                  </div>
                  {/* máximas y mínimas siguen debajo */}
                  <div
                    style={{
                      display: "flex",
                      gap: "1.5rem",
                      margin: "0.2rem 0 0.5rem 0",
                    }}
                  >
                    <span
                      style={{
                        color: "#e63946",
                        fontWeight: 700,
                        fontSize: "1.1rem",
                      }}
                    >
                      ↑{" "}
                      {unit === "C"
                        ? weather?.forecast?.forecastday?.[0]?.day?.maxtemp_c
                        : weather?.forecast?.forecastday?.[0]?.day?.maxtemp_f ??
                          "--"}
                      º
                    </span>
                    <span
                      style={{
                        color: "#457b9d",
                        fontWeight: 700,
                        fontSize: "1.1rem",
                      }}
                    >
                      ↓{" "}
                      {unit === "C"
                        ? weather?.forecast?.forecastday?.[0]?.day?.mintemp_c
                        : weather?.forecast?.forecastday?.[0]?.day?.mintemp_f ??
                          "--"}
                      º
                    </span>
                  </div>
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
                      aria-label={
                        isFavorite
                          ? "Remove from favorites"
                          : "Add to favorites"
                      }
                      title={
                        isFavorite
                          ? "Remove from favorites"
                          : "Add to favorites"
                      }
                    >
                      {isFavorite ? "❤️" : "🤍"}
                    </button>
                  </div>
                  <h3
                    className="condition"
                    style={{ transform: getTransform(10, 10) }}
                  >
                    {weather?.current?.condition?.text || ""}
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
          {loading && <div>Loading...</div>}
          {/* Popup de error que se muestra encima sin afectar al contenido */}
          {showErrorModal && (
            <div className="modal-overlay">
              <div className="modal">
                <p>The location could not be found. Please try another city.</p>
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "#666",
                    marginTop: "0.5rem",
                  }}
                >
                  Press ESC to close
                </p>
                <button
                  onClick={() => {
                    setShowErrorModal(false);
                  }}
                  style={{
                    background: "#48cae4",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.5rem 1.2rem",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "1rem",
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
          {/* Contenido que se mantiene visible independientemente del error */}
          {!loading && weather && (
            <>
              <h2 className="right-panel-header">Weather Details</h2>
              <div
                style={{
                  display: "flex",
                  gap: "1.5rem",
                  justifyContent: "left",
                }}
              >
                <div className="details-grid">
                  <div className="label">
                    <span role="img" aria-label="Cloud">
                      ☁️
                    </span>{" "}
                    Cloudy
                  </div>
                  <div className="data">{weather?.current?.cloud ?? ""}%</div>

                  <div className="label">
                    <span role="img" aria-label="Humidity">
                      💧
                    </span>{" "}
                    Humidity
                  </div>
                  <div className="data">
                    {weather?.current?.humidity ?? ""}%
                  </div>

                  <div className="label">
                    <span role="img" aria-label="Wind">
                      💨
                    </span>{" "}
                    Wind
                  </div>
                  <div className="data">
                    {weather?.current?.wind_kph ?? ""} km/h
                  </div>

                  <div className="label">
                    <span role="img" aria-label="Rain">
                      🌧️
                    </span>{" "}
                    Rain
                  </div>
                  <div className="data">
                    {weather?.current?.precip_mm ?? ""} mm
                  </div>

                  <div className="label">
                    <span role="img" aria-label="UV">
                      🔆
                    </span>{" "}
                    UV
                  </div>
                  <div className="data">{weather?.current?.uv ?? ""}</div>

                  <div className="label">
                    <span role="img" aria-label="Feels Like">
                      🤗
                    </span>{" "}
                    Feels Like
                  </div>
                  <div className="data">
                    {unit === "C"
                      ? weather?.current?.feelslike_c
                      : weather?.current?.feelslike_f}
                    º{unit}
                  </div>
                </div>
                {/* Gráfica de arco de sol: amanecer y atardecer */}
                <div className="sun-arc-chart">
                  <svg width="180" height="90" viewBox="0 0 180 90">
                    <path
                      d="M 10 80 Q 90 0 170 80"
                      stroke="#fff"
                      strokeWidth="3"
                      fill="none"
                    />
                    {/* Sol o luna animados con color dinámico */}
                    <circle
                      cx={
                        isDay
                          ? getArcPoint(progress).x
                          : getArcPoint(moonProgress).x
                      }
                      cy={
                        isDay
                          ? getArcPoint(progress).y
                          : getArcPoint(moonProgress).y
                      }
                      r="8"
                      fill={isDay ? "#FFD600" : "#bdbdfc"}
                      stroke={isDay ? "#FFA600" : "#6c63ff"}
                      strokeWidth="3"
                      filter={
                        isDay
                          ? "drop-shadow(0 0 8px #FFD60088)"
                          : "drop-shadow(0 0 8px #bdbdfc88)"
                      }
                    />
                  </svg>
                  <div className="sun-arc-labels">
                    <div className="sunrise">
                      <span>{isDay ? "🌅" : "🌙"}</span>
                      <span>{isDay ? sunriseStr : sunsetStr}</span>
                    </div>
                    <div className="sunset">
                      <span>{isDay ? "🌇" : "🌙"}</span>
                      <span>{isDay ? sunsetStr : sunriseStr}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="forecast">
                {forecastNext5Days.map((day, index) => {
                  const temp =
                    unit === "C" ? day?.day?.avgtemp_c : day?.day?.avgtemp_f;
                  const condition = day?.day?.condition;
                  const label = getDayName(day?.date);
                  return (
                    <div key={index} className="forecast-card">
                      <h2>{label}</h2>
                      <p>
                        {temp ?? ""}º{unit}
                      </p>
                      <img src={condition?.icon} alt="" />
                      <p>{condition?.text}</p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 30,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
        }}
      ></div>
      <p className="copyright">Pedro&copy; All rights reserved. 2025</p>
    </div>
  );
}

export default WeatherDashboard;
