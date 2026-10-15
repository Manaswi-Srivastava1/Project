// ==========================================
// WALK-IN TUTOR: FRONTEND (connected to backend)
// ==========================================

const API_URL = "https://project-tufv.onrender.com";

// ---------- HELPERS ----------

function getToken() { return localStorage.getItem("token"); }

function getUser() {
    try { return JSON.parse(localStorage.getItem("user")); }
    catch { return null; }
}

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

// Backend ko call karne ka common function
async function api(path, options = {}) {
    const headers = { "Content-Type": "application/json" };
    const token = getToken();
    if (token) headers.Authorization = "Bearer " + token;

    const res = await fetch(API + path, Object.assign({}, options, { headers }));
    const data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(data.message || "Kuch gadbad ho gayi");
    return data;
}

// ---------- MODALS ----------

function openModal(id) {
    document.getElementById(id).style.display = "flex";
    document.body.style.overflow = "hidden";
}

function closeModal(id) {
    document.getElementById(id).style.display = "none";
    document.body.style.overflow = "";
}

function closeDemo() { closeModal("demoModal"); }
function closeTeacherForm() { closeModal("teacherModal"); }
function closeLogin() { closeModal("loginModal"); }
function closeDashboard() { closeModal("dashModal"); }

function showSignup() {
    document.getElementById("loginView").style.display = "none";
    document.getElementById("signupView").style.display = "block";
}

function showLogin() {
    document.getElementById("signupView").style.display = "none";
    document.getElementById("loginView").style.display = "block";
}

// Login button: agar login hai to logout kar do
function openLogin() {
    if (getToken()) {
        if (confirm("Logout karna hai?")) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            updateAuthUI();
        }
        return;
    }
    showLogin();
    openModal("loginModal");
}

function updateAuthUI() {
    const user = getUser();
    const loginBtn = document.querySelector(".login-btn:not(#dashBtn)");
    loginBtn.textContent = user ? "Logout (" + user.name.split(" ")[0] + ")" : "Login";

    // "My Requests" button sirf tutor ko dikhe
    document.getElementById("dashBtn").style.display =
        user && user.role === "tutor" ? "inline-block" : "none";
}

function scrollToFind() {
    document.getElementById("find").scrollIntoView({ behavior: "smooth" });
}

// ---------- SIGNUP ----------

document.getElementById("signupForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const name = document.getElementById("signupName").value;
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;
    const role = document.getElementById("signupRole").value;

    try {
        await api("/auth/register", {
            method: "POST",
            body: JSON.stringify({ name, email, password, role })
        });
        // Signup ke baad apne aap login
        const data = await api("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
        });
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        this.reset();
        closeLogin();
        updateAuthUI();
        alert("🎉 Account ban gaya! Welcome, " + data.user.name);
    } catch (err) {
        alert("❌ " + err.message);
    }
});

// ---------- LOGIN ----------

document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
        const data = await api("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
        });
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        this.reset();
        closeLogin();
        updateAuthUI();
        alert("✅ Login successful!");
    } catch (err) {
        alert("❌ " + err.message);
    }
});

// ---------- TUTOR PROFILE FORM ----------

function openTeacherForm() {
    const user = getUser();
    if (!user) {
        alert("Pehle Signup karo (Tutor account banao).");
        showSignup();
        openModal("loginModal");
        return;
    }
    if (user.role !== "tutor") {
        alert("Tutor profile banane ke liye Tutor account se login karo.");
        return;
    }
    openModal("teacherModal");
}

const classRanges = {
    "Class 5 - 8": [5, 6, 7, 8],
    "Class 6 - 10": [6, 7, 8, 9, 10],
    "Class 9 - 12": [9, 10, 11, 12]
};

document.getElementById("teacherForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const body = {
        name: document.getElementById("teacherName").value,
        phone: document.getElementById("phone").value,
        college: document.getElementById("college").value,
        course: document.getElementById("course").value,
        subjects: document.getElementById("subjects").value,
        classes: classRanges[document.getElementById("teachingClass").value] || [],
        area: document.getElementById("area").value,
        fee: document.getElementById("fees").value,
        mode: document.getElementById("mode").value,
        lat: document.getElementById("tutorLat").value,
        lng: document.getElementById("tutorLng").value
    };

    try {
        const data = await api("/tutors", { method: "POST", body: JSON.stringify(body) });
        alert("🎉 " + data.message);
        this.reset();
        document.getElementById("locStatus").textContent = "";
        closeTeacherForm();
    } catch (err) {
        alert("❌ " + err.message);
    }
});

// ---------- TUTOR DASHBOARD (My Requests) ----------

function openDashboard() {
    openModal("dashModal");
    loadDashboard();
}

async function loadDashboard() {
    const status = document.getElementById("dashStatus");
    const list = document.getElementById("dashList");
    status.textContent = "Loading...";
    list.innerHTML = "";

    try {
        const me = await api("/tutors/me");

        if (!me.tutor) {
            status.textContent = "Aapne abhi tutor profile nahi banayi. 'Become a Tutor' se banao.";
            return;
        }

        status.textContent = me.tutor.verified
            ? "✅ Aapki profile verified hai aur website par dikh rahi hai."
            : "⏳ Aapki profile verification ke liye pending hai. Verify hone ke baad hi parents ko dikhegi.";

        const data = await api("/demo-requests/mine");

        if (!data.requests.length) {
            list.appendChild(el("p", "", "Abhi koi demo request nahi aayi."));
            return;
        }

        data.requests.forEach(function (r) {
            const item = el("div");
            item.style.cssText = "border:2px solid #111;border-radius:10px;padding:12px;margin-bottom:10px;background:#fff";

            item.appendChild(el("strong", "", "👤 " + (r.parent ? r.parent.name : "Parent")));

            const phone = el("p", "", "📞 " + r.parentPhone);
            phone.style.margin = "6px 0 0";
            item.appendChild(phone);

            if (r.message) {
                const msg = el("p", "", "💬 " + r.message);
                msg.style.margin = "6px 0 0";
                item.appendChild(msg);
            }

            const when = el("small", "", new Date(r.createdAt).toLocaleString());
            when.style.cssText = "display:block;margin-top:6px;color:#888";
            item.appendChild(when);

            list.appendChild(item);
        });
    } catch (err) {
        status.textContent = "❌ " + err.message;
    }
}

// ---------- TUTORS LIST (database se) ----------

let tutors = [];

function renderTutors() {
    applyDistances();
    const grid = document.getElementById("tutorGrid");
    grid.innerHTML = "";

    tutors.forEach(function (t) {
        const card = el("div", "tutor-card");
        card.appendChild(el("div", "avatar", "🧑‍🏫"));

        const content = el("div", "tutor-content");
        content.appendChild(el("span", "verified", "✓ Verified"));
        content.appendChild(el("h3", "", t.name));
        content.appendChild(el("p", "", "🎓 " + t.course));
        content.appendChild(el("p", "", "📚 " + t.subjects.join(" • ")));
        content.appendChild(el("p", "", "📍 " + t.area + " • " + t.mode));
        if (t.distanceKm !== undefined) {
            content.appendChild(el("p", "", "📏 ~" + t.distanceKm.toFixed(1) + " km door"));
        }

        const bottom = el("div", "card-bottom");
        bottom.appendChild(el("strong", "", "₹" + t.fee + "/month"));
        const btn = el("button", "demo-btn", "Demo");
        btn.dataset.id = t._id;
        btn.dataset.name = t.name;
        bottom.appendChild(btn);
        content.appendChild(bottom);

        card.appendChild(content);
        grid.appendChild(card);
    });

    document.getElementById("noResult").style.display = tutors.length === 0 ? "block" : "none";
    updateMap();
}

async function loadTutors() {
    const search = document.getElementById("searchInput").value.trim();
    const cls = document.getElementById("classFilter").value;

    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (cls) params.set("class", cls);

    try {
        const data = await api("/tutors?" + params.toString());
        tutors = data.tutors;
    } catch (err) {
        tutors = [];
        console.error(err.message);
    }
    renderTutors();
}

function searchTutors() { loadTutors(); }

let searchTimer;
document.getElementById("searchInput").addEventListener("input", function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadTutors, 300);
});
document.getElementById("classFilter").addEventListener("change", loadTutors);

document.getElementById("tutorGrid").addEventListener("click", function (e) {
    const btn = e.target.closest(".demo-btn");
    if (btn) openDemo(btn.dataset.id, btn.dataset.name);
});

// ---------- DEMO REQUEST ----------

let demoTutorId = null;

function openDemo(id, name) {
    const user = getUser();
    if (!user) {
        alert("Demo ke liye pehle Login/Signup karo.");
        showLogin();
        openModal("loginModal");
        return;
    }
    if (user.role !== "parent") {
        alert("Demo request sirf Parent account se ho sakti hai.");
        return;
    }
    demoTutorId = id;
    document.getElementById("demoTitle").textContent = "Demo with " + name;
    openModal("demoModal");
}

document.getElementById("demoForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    try {
        const data = await api("/demo-requests", {
            method: "POST",
            body: JSON.stringify({
                tutorId: demoTutorId,
                parentPhone: document.getElementById("demoPhone").value,
                message: document.getElementById("demoMessage").value
            })
        });
        alert("✅ " + data.message + ". Tutor ko email bhi bheja gaya hai.");
        this.reset();
        closeDemo();
    } catch (err) {
        alert("❌ " + err.message);
    }
});

// ---------- CLOSE MODALS (outside click / Escape) ----------

window.addEventListener("click", function (e) {
    if (e.target.id === "teacherModal") closeTeacherForm();
    if (e.target.id === "loginModal") closeLogin();
    if (e.target.id === "demoModal") closeDemo();
    if (e.target.id === "dashModal") closeDashboard();
});

document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
        closeTeacherForm();
        closeLogin();
        closeDemo();
        closeDashboard();
        closeAI();
    }
});

// ---------- MOBILE MENU ----------

const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");

menuBtn.addEventListener("click", function () {
    const open = navLinks.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open);
});

navLinks.addEventListener("click", function (e) {
    if (e.target.tagName === "A") {
        navLinks.classList.remove("open");
        menuBtn.setAttribute("aria-expanded", "false");
    }
});

// ---------- AI CHAT ----------

function openAI() { document.getElementById("chatBox").style.display = "block"; }
function closeAI() { document.getElementById("chatBox").style.display = "none"; }

function addChatMessage(className, text) {
    const messages = document.getElementById("chatMessages");
    messages.appendChild(el("div", className, text));
    messages.scrollTop = messages.scrollHeight;
}

function botReply(text) {
    const words = ["maths", "math", "science", "physics", "english", "hindi", "social"];
    const hit = words.find(function (w) { return text.includes(w); });

    if (hit) {
        const query = hit === "math" ? "maths" : hit;
        document.getElementById("searchInput").value = query;
        loadTutors();
        return "📚 Maine '" + query + "' ke tutors search kar diye hain. Neeche list dekho.";
    }
    if (/fee|price|budget|cost/.test(text)) {
        if (!tutors.length) return "💰 Abhi koi tutor list mein nahi hai.";
        const fees = tutors.map(function (t) { return t.fee; });
        return "💰 Fees ₹" + Math.min.apply(null, fees) + " se ₹" + Math.max.apply(null, fees) + " per month hai.";
    }
    if (/near|location|area/.test(text)) {
        return "📍 Search box mein apna area likho (jaise Kunraghat).";
    }
    if (text.includes("demo")) {
        return "🎓 Tutor card par Demo button dabao (parent account se login karke).";
    }
    return "🤖 Main subject, class, area aur budget ke hisaab se tutor dhundhne mein help kar sakta hoon.";
}

function sendMessage() {
    const input = document.getElementById("chatInput");
    const message = input.value.trim();
    if (message === "") return;

    addChatMessage("user-message", message);
    input.value = "";

    setTimeout(function () {
        addChatMessage("bot-message", botReply(message.toLowerCase()));
    }, 600);
}

document.getElementById("chatInput").addEventListener("keydown", function (e) {
    if (e.key === "Enter") sendMessage();
});

// ---------- MAP (Leaflet + OpenStreetMap) ----------

let map = null;
let markerLayer = null;
let userLoc = null;
let userMarker = null;

function initMap() {
    if (typeof L === "undefined") {
        document.getElementById("mapView").textContent = "Map load nahi hua. Internet check karo.";
        return;
    }
    map = L.map("mapView").setView([26.85, 80.95], 6);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
    markerLayer = L.layerGroup().addTo(map);
}

function hasCoords(t) {
    return typeof t.lat === "number" && typeof t.lng === "number";
}

function updateMap() {
    if (!map) return;
    markerLayer.clearLayers();
    const points = [];

    tutors.forEach(function (t) {
        if (!hasCoords(t)) return;

        const box = document.createElement("div");
        const title = el("b", "", t.name);
        box.appendChild(title);
        box.appendChild(document.createElement("br"));
        box.appendChild(document.createTextNode("📚 " + t.subjects.join(", ")));
        box.appendChild(document.createElement("br"));
        box.appendChild(document.createTextNode("₹" + t.fee + "/month • " + t.area));
        if (t.distanceKm !== undefined) {
            box.appendChild(document.createElement("br"));
            box.appendChild(document.createTextNode("📏 ~" + t.distanceKm.toFixed(1) + " km door"));
        }

        L.marker([t.lat, t.lng]).bindPopup(box).addTo(markerLayer);
        points.push([t.lat, t.lng]);
    });

    if (userLoc) points.push([userLoc.lat, userLoc.lng]);
    if (points.length) map.fitBounds(points, { padding: [40, 40], maxZoom: 13 });
}

function distanceKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const rad = function (x) { return x * Math.PI / 180; };
    const dLat = rad(lat2 - lat1);
    const dLng = rad(lng2 - lng1);
    const h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
}

// Parent ki location ke hisaab se doori nikalo aur nazdeek wale pehle dikhao
function applyDistances() {
    if (!userLoc) return;
    tutors.forEach(function (t) {
        if (hasCoords(t)) t.distanceKm = distanceKm(userLoc.lat, userLoc.lng, t.lat, t.lng);
        else delete t.distanceKm;
    });
    tutors.sort(function (a, b) {
        const da = a.distanceKm === undefined ? 1e9 : a.distanceKm;
        const db = b.distanceKm === undefined ? 1e9 : b.distanceKm;
        return da - db;
    });
}

function getMyLocation() {
    return new Promise(function (resolve, reject) {
        if (!navigator.geolocation) {
            reject(new Error("Aapka browser location support nahi karta."));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            function (p) { resolve({ lat: p.coords.latitude, lng: p.coords.longitude }); },
            function () { reject(new Error("Location allow nahi hui. Browser mein location permission do.")); },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });
}

async function locateMe() {
    if (!map) return;
    try {
        userLoc = await getMyLocation();
    } catch (err) {
        alert("❌ " + err.message);
        return;
    }
    if (userMarker) map.removeLayer(userMarker);
    userMarker = L.circleMarker([userLoc.lat, userLoc.lng], {
        radius: 9, color: "#fff", weight: 3, fillColor: "#1a73e8", fillOpacity: 1
    }).addTo(map).bindPopup("📍 Aap yahan ho");

    renderTutors();   // doori ke saath list aur map dobara banegi
}

// Tutor form: tutor ki location lo
async function setTutorLocation() {
    const status = document.getElementById("locStatus");
    status.textContent = "Location dhundh rahe hain...";
    try {
        const p = await getMyLocation();
        document.getElementById("tutorLat").value = p.lat;
        document.getElementById("tutorLng").value = p.lng;
        status.textContent = "✅ Location mil gayi. Website par sirf lagbhag 1 km ka area dikhega.";
    } catch (err) {
        status.textContent = "❌ " + err.message;
    }
}

// ---------- START ----------

updateAuthUI();
initMap();
loadTutors();