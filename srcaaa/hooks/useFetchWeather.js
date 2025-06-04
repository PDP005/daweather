import { useState, useEffect } from "react";
import { getWeatherByCity } from "../services/weatherService";

const useFetchWeather = (city) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!city) return;

    const fetchWeather = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getWeatherByCity(city);
        setWeather(data);
      } catch (err) {
        setError(err.message || "Error fetching weather");
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [city]);

  return { weather, loading, error };
};

export default useFetchWeather;
