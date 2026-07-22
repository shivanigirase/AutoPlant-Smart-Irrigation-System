// 🔥 Your Firebase config (replace with your own)
console.log("SCRIPT RUNNING");
const firebaseConfig = {
  apiKey: "AIzaSyA8J_Bc9cv6IK-4VvIso_74v3mGecSa3dA",
  authDomain: "plant-watering-system-ff8f9.firebaseapp.com",
  databaseURL: "https://plant-watering-system-ff8f9-default-rtdb.firebaseio.com",
  projectId: "plant-watering-system-ff8f9",
  storageBucket: "plant-watering-system-ff8f9.firebasestorage.app",
  messagingSenderId: "842207171610",
  appId: "1:842207171610:web:688ff102cd7e97f0feeda3",
  measurementId: "G-BLBL53G2CG"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

console.log("JS loaded");


// ================= AUTH CHECK =================
auth.onAuthStateChanged(user => {
  if (!user && window.location.pathname.includes("dashboard")) {
    window.location.href = "login.html";
  }
});


// ================= REGISTER =================
function register() {
  const email = document.getElementById("regEmail").value;
  const password = document.getElementById("regPassword").value;

  auth.createUserWithEmailAndPassword(email, password)
    .then(() => {
      alert("Registration Successful");
      window.location.href = "login.html";
    })
    .catch(err => alert(err.message));
}


// ================= LOGIN =================
function login() {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      alert("Login Successful");
      window.location.href = "dashboard.html";
    })
    .catch(err => alert(err.message));
}


// ================= LOGOUT =================
function logout() {
  auth.signOut().then(() => {
    alert("Logged Out");
    window.location.href = "login.html";
  });
}


// ================= SENSOR DATA =================
let lastSaved = 0;
db.ref("sensorData").on("value", (snapshot) => {
  const data = snapshot.val();
  if (!data) return;
  // ✅ SHOW DATA ON DASHBOARD
  if (document.getElementById("moisture")) {
    document.getElementById("moisture").innerText = Math.round(data.moisture);
    document.getElementById("temp").innerText = Math.round(data.temperature);
    document.getElementById("humidity").innerText = Math.round(data.humidity);
  }
  // ================= GRAPH UPDATE =================

  const currentTime = new Date().toLocaleTimeString();

  chart.data.labels.push(currentTime);

  chart.data.datasets[0].data.push(Math.round(data.moisture));
  chart.data.datasets[1].data.push(Math.round(data.temperature));
  chart.data.datasets[2].data.push(Math.round(data.humidity));

  // Keep only last 10 points
  if (chart.data.labels.length > 10) {
    chart.data.labels.shift();

    chart.data.datasets[0].data.shift();
    chart.data.datasets[1].data.shift();
    chart.data.datasets[2].data.shift();
  }

  chart.update();

  // ✅ ADD WATER LEVEL HERE 👇
  if (document.getElementById("waterLevel")) {
    document.getElementById("waterLevel").innerText =
      data.waterLevel ? Math.round(data.waterLevel) : "--";
  }

  // ✅ LIMIT HISTORY SAVE (30 sec)
  const nowTime = Date.now();
  if (nowTime - lastSaved < 30000) return; // 30 sec delay
  lastSaved = nowTime;

  const now = new Date();


  db.ref("pump/status").once("value", (snap) => {
    const pumpStatus = snap.val();

    const waterUsed = pumpStatus === "ON"
      ? Math.floor(Math.random() * 20 + 1) + "L"
      : "0L";
    const now = new Date();
    const date = now.toLocaleDateString();
    const time = now.toLocaleTimeString();
    db.ref("history").push({
      date: date,
      time: time,

      // ✅ FIXED (now inside object)
      moisture: Math.round(data.moisture),
      temperature: Math.round(data.temperature),
      humidity: Math.round(data.humidity),

      pump: pumpStatus,
      water: waterUsed

    });
  });
  applyLogic(data);
});

// ================= PUMP =================
db.ref("pump/status").on("value", (snap) => {
  if (document.getElementById("pump")) {
    document.getElementById("pump").innerText = snap.val();
  }
});


// ================= TOGGLE =================
function togglePump() {
  db.ref("pump/status").once("value", (snap) => {
    const newStatus = snap.val() === "ON" ? "OFF" : "ON";
    db.ref("pump/status").set(newStatus);
  });
}


// ================= WEATHER =================
async function fetchWeather() {
  try {
    const res = await fetch(
      "https://api.openweathermap.org/data/2.5/weather?q=Ahmedabad&units=metric&appid=a05443131eddf172de5faa44edc2645f"
    );

    const data = await res.json();
    if (!data.main) return;
    const temp = Math.round(data.main.temp);
    const desc = data.weather[0].description;
    const icon = data.weather[0].icon;
    const iconUrl =
      "https://openweathermap.org/img/wn/" + icon + "@2x.png";
    document.getElementById("weatherIcon").src = iconUrl;
    // UI update
    document.getElementById("weatherTemp").innerText = temp + "°C";
    document.getElementById("weatherDesc").innerText = desc.charAt(0).toUpperCase() + desc.slice(1);;

    document.getElementById("weatherIcon").src = iconUrl;


  } catch (err) {
    console.log("Weather error:", err);
  }
}


// ================= AUTO LOGIC =================
function applyLogic(data) {
  db.ref("pump/autoMode").once("value", (snap) => {
    if (snap.val()) {
      if (data.moisture < 40 && !data.rain) {
        db.ref("pump/status").set("ON");
      } else {
        db.ref("pump/status").set("OFF");
      }
    }
  });
}


// ================= HISTORY =================
const table = document.getElementById("historyTable");

if (table) {
  db.ref("history").limitToLast(10).on("value", (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    table.innerHTML = `
<tr>
  <th>Date</th>
  <th>Time</th>
  <th>Moisture</th>
  <th>Temperature</th>
  <th>Humidity</th>
  <th>Pump Status</th>
  <th>Water Used</th>
</tr>
`;
    for (let key in data) {
      const row = table.insertRow();

      row.insertCell(0).innerText = data[key].date || "-";
      row.insertCell(1).innerText = data[key].time || "-";

      row.insertCell(2).innerText = Math.round(data[key].moisture) || "-";
      row.insertCell(3).innerText = Math.round(data[key].temperature) || "-";
      row.insertCell(4).innerText = Math.round(data[key].humidity) || "-";

      row.insertCell(5).innerText = data[key].pump || "-";
      row.insertCell(6).innerText = data[key].water || "-";
    }
  });
}


// ================= WEATHER AUTO REFRESH =================
setInterval(fetchWeather, 10000);
fetchWeather();

function animateValue(id, start, end, duration) {
  let range = end - start;
  let current = start;
  let increment = end > start ? 1 : -1;
  let stepTime = Math.abs(Math.floor(duration / range));

  let obj = document.getElementById(id);
  let timer = setInterval(function () {
    current += increment;
    obj.innerText = current;

    if (current == end) {
      clearInterval(timer);
    }
  }, stepTime);
}

let ctx = document.getElementById("myChart");

let chart = new Chart(ctx, {
  type: "line",

  data: {
    labels: [],

    datasets: [
      {
        label: "Moisture",
        data: [],
        borderWidth: 2,
        tension: 0.4
      },

      {
        label: "Temperature",
        data: [],
        borderWidth: 2,
        tension: 0.4
      },

      {
        label: "Humidity",
        data: [],
        borderWidth: 2,
        tension: 0.4
      }
    ]
  },

  options: {
    responsive: true,
    maintainAspectRatio: false
  }
});

function sendMessage() {
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const subject = document.getElementById("subject").value;
  const message = document.getElementById("message").value;

  if (!name || !email || !subject || !message) {
    alert("Please fill all fields");
    return;
  }

  alert("Message sent successfully!");

  // clear form
  document.getElementById("name").value = "";
  document.getElementById("email").value = "";
  document.getElementById("subject").value = "";
  document.getElementById("message").value = "";
}

function login() {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    alert("Please enter email and password");
    return;
  }

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      alert("Login Successful");
      window.location.href = "dashboard.html";
    })
    .catch(err => alert(err.message));
}

// Fade IN when page loads
window.addEventListener("load", () => {
  document.body.classList.add("loaded");
});

// ================= FAKE SENSOR DATA =================

setInterval(() => {

  const fakeData = {
    moisture: Math.floor(Math.random() * 40) + 40,
    temperature: Math.floor(Math.random() * 10) + 28,
    humidity: Math.floor(Math.random() * 30) + 50,
    waterLevel: Math.floor(Math.random() * 50) + 50
  };

  db.ref("sensorData").set(fakeData);

}, 5000); // every 5 sec