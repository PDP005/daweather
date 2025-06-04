const BASE_URL = "http://api.weatherapi.com/v1";
const API_KEY = process.env.REACT_APP_WEATHER_API_KEY;

export const getWeatherByCity = async (city) => {
  try {
    const response = await fetch(
      `${BASE_URL}/forecast.json?key=${API_KEY}&q=${city}&days=6`
    );
    if (!response.ok) {
      throw new Error("Error al obtener los datos del clima");
    }
    return await response.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};
