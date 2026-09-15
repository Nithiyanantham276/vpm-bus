// weather.js - uses Open-Meteo (no API key)
// Geocoding: https://geocoding-api.open-meteo.com/v1/search?name={city}&count=1
// Weather: https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto

const $ = (sel) => document.querySelector(sel);
const searchEl = $('#search');
const searchBtn = $('#search-btn');
const geoBtn = $('#geo-btn');
const unitToggle = $('#unit-toggle');
const unitLabel = $('#unit-label');

const currentCard = $('#current');
const locationEl = $('#location');
const tempEl = $('#temp');
const descEl = $('#description');
const windEl = $('#wind');
const timeEl = $('#time');
const forecastCard = $('#forecast');
const forecastList = $('#forecast-list');

let useCelsius = true;

unitToggle.addEventListener('change', () => {
  useCelsius = !unitToggle.checked ? true : false; // checked -> Fahrenheit
  unitLabel.textContent = useCelsius ? '°C' : '°F';
  // if data is displayed, refresh units by refetching last coords stored
  if (lastCoords) fetchWeather(lastCoords.lat, lastCoords.lon, lastCoords.name);
});

searchBtn.addEventListener('click', () => {
  const q = searchEl.value.trim();
  if (!q) return alert('Enter a city name');
  geocode(q).then(loc => {
    if (!loc) return alert('Location not found');
    fetchWeather(loc.latitude, loc.longitude, loc.name);
  }).catch(err=>alert('Geocoding failed'));
});

geoBtn.addEventListener('click', () => {
  if (!navigator.geolocation) return alert('Geolocation not supported');
  navigator.geolocation.getCurrentPosition(pos => {
    const {latitude:lat, longitude:lon} = pos.coords;
    fetchWeather(lat, lon, 'Your location');
  }, err => alert('Unable to get location'));
});

async function geocode(name){
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.results || data.results.length===0) return null;
  return data.results[0];
}

let lastCoords = null;

async function fetchWeather(lat, lon, displayName){
  lastCoords = {lat, lon, name: displayName};
  const dailyParams = 'weathercode,temperature_2m_max,temperature_2m_min';
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=${dailyParams}&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) return alert('Weather request failed');
  const data = await res.json();
  renderWeather(data, displayName);
}

function renderWeather(data, displayName){
  if (!data.current_weather) return alert('No weather data');
  const cw = data.current_weather;
  const daily = data.daily;

  const tempC = cw.temperature;
  const wind = `${cw.windspeed} m/s`;
  const time = cw.time;

  const tempToShow = useCelsius ? `${Math.round(tempC)}°C` : `${Math.round(tempC * 9/5 + 32)}°F`;

  locationEl.textContent = displayName;
  tempEl.textContent = tempToShow;
  descEl.textContent = weatherCodeToText(cw.weathercode);
  windEl.textContent = wind;
  timeEl.textContent = `Updated: ${time}`;

  // forecast
  forecastList.innerHTML = '';
  if (daily && daily.time && daily.time.length){
    for (let i=0;i<daily.time.length;i++){
      const date = daily.time[i];
      const wcode = daily.weathercode[i];
      const tmax = daily.temperature_2m_max[i];
      const tmin = daily.temperature_2m_min[i];
      const tmaxShow = useCelsius ? `${Math.round(tmax)}°C` : `${Math.round(tmax*9/5+32)}°F`;
      const tminShow = useCelsius ? `${Math.round(tmin)}°C` : `${Math.round(tmin*9/5+32)}°F`;

      const div = document.createElement('div');
      div.className = 'forecast-item';
      div.innerHTML = `
        <div class="date">${formatDate(date)}</div>
        <div class="icon">${weatherCodeToEmoji(wcode)}</div>
        <div class="temps">${tmaxShow} / ${tminShow}</div>
      `;
      forecastList.appendChild(div);
    }
  }

  currentCard.classList.remove('hidden');
  forecastCard.classList.remove('hidden');
}

function formatDate(dstr){
  const d = new Date(dstr);
  return d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
}

function weatherCodeToText(code){
  const map = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    80: 'Rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail'
  };
  return map[code] || 'Weather';
}
function weatherCodeToEmoji(code){
  const m = {
    0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',
    51:'🌦️',53:'🌦️',55:'🌧️',56:'🌧️',57:'🌧️',
    61:'🌧️',63:'🌧️',65:'🌧️',66:'🌧️',67:'🌧️',
    71:'🌨️',73:'🌨️',75:'❄️',80:'🌦️',81:'🌧️',82:'⛈️',
    95:'⛈️',96:'⛈️',99:'⛈️'
  };
  return m[code] || 'ℹ️';
}

// load a default location (Villupuram) on first load
window.addEventListener('load', () => {
  // try geolocation first (user can decline)
  if (navigator.geolocation){
    navigator.geolocation.getCurrentPosition(pos => {
      fetchWeather(pos.coords.latitude, pos.coords.longitude, 'Your location');
    }, () => {
      // fallback: geocode Villupuram
      geocode('Villupuram').then(loc=>{
        if (loc) fetchWeather(loc.latitude, loc.longitude, loc.name);
      });
    });
  } else {
    geocode('Villupuram').then(loc=>{
      if (loc) fetchWeather(loc.latitude, loc.longitude, loc.name);
    });
  }
});
