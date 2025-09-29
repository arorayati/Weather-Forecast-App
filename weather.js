//API Key//

const API_KEY = "795e91acfe6a57f97f5523f3aae7d50a"; 
const apiUrl = "https://api.openweathermap.org/data/2.5/weather?units=metric&q=";

//DOM//

const searchBtn = document.getElementById("searchBtn");
const cityInput = document.getElementById("cityInput");
const geolocateBtn = document.getElementById("geolocateBtn");
const recentToggle = document.getElementById("recentToggle");
const recentList = document.getElementById("recentList");
const errorBox = document.getElementById("errorBox");
const placeEl = document.getElementById("place");
const todayDesc = document.getElementById("todayDesc");
const todayTemp = document.getElementById("todayTemp");
const todayExtra = document.getElementById("todayExtra");
const todayDetails = document.getElementById("todayDetails");
const forecastList = document.getElementById("forecastList");
const unitToggle = document.getElementById("unitToggle");
const todayCard = document.getElementById("todayCard");

let unit = "metric"; 
let todayUnitLabel = "°C"; 

// Utility helpers//

function showError(message) {
  errorBox.classList.remove("hidden");
  errorBox.innerHTML = `<strong>Error:</strong> ${message}`;
  setTimeout(() => { errorBox.classList.add("hidden"); }, 7000);
}

function clearError() {
  errorBox.classList.add("hidden");
  errorBox.innerHTML = "";
}

function setBackgroundFor(weatherMain) { 

  // changing the body's background based on main weather condition//

  const body = document.body;
  switch ((weatherMain || "").toLowerCase()) {
    case "clear":
      body.style.background = "linear-gradient(to br,#fff7c2,#ffd166)";
      break;
    case "clouds":
      body.style.background = "linear-gradient(to br,#e2e8f0,#cbd5e1)";
      break;
    case "rain":
    case "drizzle":
      body.style.background = "linear-gradient(to br,#bde0f7,#89c2d9)";
      break;
    case "thunderstorm":
      body.style.background = "linear-gradient(to br,#6b7280,#0f172a)";
      break;
    case "snow":
      body.style.background = "linear-gradient(to br,#e6f0ff,#ffffff)";
      break;
    default:
      body.style.background = "linear-gradient(to br, #e0f2fe, #f8fafc)";
  }
}

// LOCAL STORAGE: recent cities Entered by the user //
function getRecent() {
  try {
    const arr = JSON.parse(localStorage.getItem("recentCities") || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function addRecent(city) {
  if (!city) return;
  const list = getRecent();
  const normalized = city.trim();
  
  const filtered = [normalized, ...list.filter(c => c.toLowerCase() !== normalized.toLowerCase())].slice(0, 6);
  localStorage.setItem("recentCities", JSON.stringify(filtered));
  populateRecentDropdown();
}
function populateRecentDropdown() {
  const list = getRecent();
  recentList.innerHTML = "";
  if (list.length === 0) {
    recentList.innerHTML = `<div class="p-2 text-sm text-gray-500">No recent searches</div>`;
  } else {
    list.forEach(city => {
      const d = document.createElement("div");
      d.className = "p-2 hover:bg-sky-100 cursor-pointer";
      d.textContent = city;
      d.addEventListener("click", () => {
        cityInput.value = city;
        recentList.classList.add("hidden");
        fetchWeatherByCity(city);
      });
      recentList.appendChild(d);
    });
  }
}

// toggle recent list//

recentToggle.addEventListener("click", () => {
  recentList.classList.toggle("hidden");
  populateRecentDropdown();
});

// Unit toggle //

unitToggle.addEventListener("click", () => {
  if (todayUnitLabel === "°C") {
    todayUnitLabel = "°F";
    unit = "imperial";
    unitToggle.textContent = "°F";
  } else {
    todayUnitLabel = "°C";
    unit = "metric";
    unitToggle.textContent = "°C";
  }

  const currentPlace = placeEl.dataset.lat && placeEl.dataset.lon ? { lat: placeEl.dataset.lat, lon: placeEl.dataset.lon } : null;
  const city = placeEl.dataset.city;
  if (city) fetchWeatherByCity(city, { onlyToday: true });
});


// Basic input validation and search//


searchBtn.addEventListener("click", () => {
  const q = cityInput.value.trim();
  if (!q) {
    showError("Please enter a city name.");
    return;
  }
  fetchWeatherByCity(q);
});

cityInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchBtn.click();
});

// Geolocation//


geolocateBtn.addEventListener("click", () => {
  clearError();
  if (!navigator.geolocation) {
    showError("Geolocation not supported by your browser.");
    return;
  }
  geolocateBtn.textContent = "Finding...";
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    fetchWeatherByCoords(latitude, longitude);
    geolocateBtn.textContent = "Use My Location";
  }, err => {
    geolocateBtn.textContent = "Use My Location";
    showError("Unable to retrieve your location. Allow location access and try again.");
  }, { timeout: 10000 });
});

// Main fetch functions//

async function fetchWeatherByCity(city, opts = {}) {
  clearError();
  if (!city) { showError("City is required."); return; }
  try {
    const geoResp = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`);
    if (!geoResp.ok) throw new Error("Location lookup failed.");
    const geoData = await geoResp.json();
    if (!geoData || geoData.length === 0) {
      showError("City not found. Please try a different name.");
      return;
    }
    const { lat, lon, name, country, state } = geoData[0];
    placeEl.dataset.lat = lat;
    placeEl.dataset.lon = lon;
    placeEl.dataset.city = name;

    // Saving recent search//

    addRecent(`${name}${state ? ", " + state : ""}, ${country}`);

    // Fetching current weather and 5-day forecast//

    await fetchAndDisplay(lat, lon, { city: `${name}${state ? ", " + state : ""}, ${country}`, ...opts });
  } catch (err) {
    console.error(err);
    showError("Failed fetching weather. Check your network and API key.");
  }
}

async function fetchWeatherByCoords(lat, lon) {
  clearError();
  try {
    const revResp = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`);
    const rev = await revResp.json();
    const cityLabel = rev && rev[0] ? `${rev[0].name}, ${rev[0].country}` : `Lat ${lat.toFixed(2)}, Lon ${lon.toFixed(2)}`;
    placeEl.dataset.lat = lat;
    placeEl.dataset.lon = lon;
    placeEl.dataset.city = cityLabel;

    addRecent(cityLabel);
    await fetchAndDisplay(lat, lon, { city: cityLabel });
  } catch (err) {
    console.error(err);
    showError("Failed to get weather for your location.");
  }
}

//Current Weather//

async function fetchAndDisplay(lat, lon, opts = {}) {
  const onlyToday = opts.onlyToday === true;
  try {
    const unitsForFetch = "metric"; 
    const currentResp = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${unitsForFetch}&appid=${API_KEY}`);
    if (!currentResp.ok) throw new Error("Current weather fetch failed");
    const current = await currentResp.json();

    // 5-days forecast//

    const forecastResp = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${unitsForFetch}&appid=${API_KEY}`);
    if (!forecastResp.ok) throw new Error("Forecast fetch failed");
    const forecast = await forecastResp.json();

    // Current Weather//

    displayToday(current, unit);

    if (!onlyToday) {
      displayForecastCards(forecast);
    }

    // dynamic background//

    setBackgroundFor(current.weather && current.weather[0] && current.weather[0].main);
  } catch (err) {
    console.error(err);
    showError("Error retrieving weather. Check network and API key limits.");
  }
}

function displayToday(current, displayUnit) {
  const weather = current.weather && current.weather[0];
  const tempC = current.main.temp; // since we fetched metric
  let displayedTemp = tempC;
  if (displayUnit === "imperial") {
    displayedTemp = (tempC * 9/5) + 32;
  }

  placeEl.textContent = `${current.name}, ${current.sys.country}`;
  todayDesc.textContent = `${weather.main} — ${weather.description}`;
  todayTemp.innerHTML = `${Math.round(displayedTemp)}<span class="text-2xl"> ${todayUnitLabel}</span>`;
  todayExtra.textContent = `Humidity: ${current.main.humidity}% • Wind: ${current.wind.speed} m/s`;

  todayDetails.innerHTML = `
    <div class="p-3 bg-white rounded shadow">
      <div class="text-sm text-gray-500">Feels like</div>
      <div class="font-semibold">${Math.round(current.main.feels_like)} °C</div>
    </div>
    <div class="p-3 bg-white rounded shadow">
      <div class="text-sm text-gray-500">Humidity</div>
      <div class="font-semibold">${current.main.humidity}%</div>
    </div>
    <div class="p-3 bg-white rounded shadow">
      <div class="text-sm text-gray-500">Wind</div>
      <div class="font-semibold">${current.wind.speed} m/s</div>
    </div>
  `;

   // showing REd Alert//


  if (tempC > 40) { 

   
    const alertEl = document.createElement("div");
    alertEl.className = "p-3 mb-3 rounded border-l-4 border-red-600 bg-red-50 text-red-700";
    alertEl.innerHTML = `<strong>Heat alert:</strong> Current temperature is ${Math.round(tempC)}°C (>40°C). Take precautions.`;
    
    todayCard.prepend(alertEl);
    
    setTimeout(() => alertEl.remove(), 10000);
  }
}

function displayForecastCards(forecastData) {
  
  const list = forecastData.list;
  
  const dayMap = {};
  list.forEach(item => {
    const date = new Date(item.dt * 1000);
    const dKey = date.toISOString().slice(0,10);
    if (!dayMap[dKey]) dayMap[dKey] = [];
    dayMap[dKey].push(item);
  });

  const keys = Object.keys(dayMap);
  const todayKey = new Date().toISOString().slice(0,10);
  const days = keys.filter(k => k !== todayKey).slice(0,5);

  forecastList.innerHTML = "";
  days.forEach(k => {
    const items = dayMap[k];
    let chosen = items.find(it => new Date(it.dt * 1000).getHours() === 12) || items[Math.floor(items.length/2)];
    const date = new Date(chosen.dt * 1000);
    const label = date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

    // computing average //

    const temps = items.map(it => it.main.temp);
    const avgTemp = Math.round(temps.reduce((a,b)=>a+b,0)/temps.length);
    const humid = Math.round(items.reduce((a,b)=>a + b.main.humidity,0)/items.length);
    const windAvg = (items.reduce((a,b)=>a + b.wind.speed,0)/items.length).toFixed(1);
    const main = chosen.weather[0].main;
    const icon = chosen.weather[0].icon; 

    // card//
    const card = document.createElement("div");
    card.className = "p-3 bg-white rounded shadow flex items-center justify-between";
    card.innerHTML = `
      <div>
        <div class="text-sm text-gray-500">${label}</div>
        <div class="font-semibold">${avgTemp}°C</div>
      </div>
      <div class="flex items-center gap-3">
        <div class="text-sm text-gray-500">
          <div>💧 ${humid}%</div>
          <div>🍃 ${windAvg} m/s</div>
        </div>
        <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${main}" />
      </div>
    `;
    forecastList.appendChild(card);
  });
}

// initial loading //

populateRecentDropdown();



