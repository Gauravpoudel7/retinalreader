/* ============================================================
   Retinal Care Platform — interactive wireframe
   All data is fictional demo data. No backend required.

   Routing model:
   - HIGH  risk → Specialist if one is available (in-person /
     Teams / WhatsApp), otherwise → MBBS queue
   - MEDIUM risk → MBBS queue (served after HIGH cases)
   - LOW   risk → Nurse queue
   - Completed visits return to the Nurse / discharge desk
   ============================================================ */

var App = {
  role: null,
  draft: null,
  toastTimer: null,
  pan: { x: 0, y: 0 },
  zoomed: false,
  overlay: true,
  currentVisit: null
};

/* ---------------- helpers ---------------- */

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toast(msg) {
  var old = document.querySelector(".toast");
  if (old) old.remove();
  var t = document.createElement("div");
  t.className = "toast";
  t.innerHTML = "<span>✓</span><span>" + esc(msg) + "</span>";
  document.body.appendChild(t);
  clearTimeout(App.toastTimer);
  App.toastTimer = setTimeout(function () { t.remove(); }, 2800);
}

function saveRole() {
  try { localStorage.setItem("rcp_role", App.role); } catch (e) {}
}
function loadRole() {
  try { return localStorage.getItem("rcp_role"); } catch (e) { return null; }
}

function riskPill(risk) {
  var map = {
    HIGH: ['pill-high', '▲'],
    MEDIUM: ['pill-medium', '●'],
    LOW: ['pill-low', '▼']
  };
  var m = map[risk] || map.LOW;
  return '<span class="pill ' + m[0] + '"><span class="ico">' + m[1] + '</span>' + esc(risk) + '</span>';
}

function scoreBadge(score) {
  if (score == null) return '<span class="score-badge" style="background:#f1f3f5;color:#5b6472">—</span>';
  var c = score >= 80 ? ["#fdefef", "#d64545"] : score >= 50 ? ["#fdf3e7", "#b45309"] : ["#eef8f1", "#2f6b3a"];
  return '<span class="score-badge" style="background:' + c[0] + ';color:' + c[1] + '">' + score + '%</span>';
}

function statusPill(p) {
  if (p.status === "completed") {
    return '<span class="pill pill-ok">' + (p.discharged ? "Discharged" : "Completed") + '</span>';
  }
  if (p.status === "in-visit") {
    var who = { nurse: "pill-nurse", mbbs: "pill-mbbs", specialist: "pill-spec" };
    var label = { nurse: "Nurse", mbbs: "MBBS", specialist: "Specialist" };
    return '<span class="pill ' + (who[p.routedTo] || "pill-neutral") + '">In visit · ' + label[p.routedTo] + '</span>';
  }
  return '<span class="pill pill-neutral">In queue</span>';
}

function routeTag(p) {
  if (p.status === "completed") return '<span class="pill pill-ok">→ Discharge</span>';
  var m = {
    nurse: ["pill-nurse", "→ Nurse"],
    mbbs: ["pill-mbbs", "→ MBBS"],
    specialist: ["pill-spec", "→ Specialist"]
  };
  var x = m[p.routedTo] || m.nurse;
  return '<span class="pill ' + x[0] + '">' + x[1] + '</span>';
}

function modeTag(p) {
  if (!p.mode) return "";
  var m = { "In-person": "👤", Teams: "💻", WhatsApp: "💬" };
  return '<span class="pill pill-info">' + (m[p.mode] || "•") + " " + esc(p.mode) + "</span>";
}

function initials(name) {
  return name.replace(/^Dr\.\s*/, "").split(" ").map(function (w) { return w[0]; }).slice(0, 2).join("").toUpperCase();
}

function avatar(name, cls) {
  return '<span class="avatar ' + (cls || "") + '">' + esc(initials(name)) + '</span>';
}

function fmtDate(d) {
  var p = d.split("-");
  var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return p[2] + " " + months[parseInt(p[1], 10) - 1] + " " + p[0];
}

function assignee(p) {
  if (p.routedTo === "nurse") {
    var n = D.nurse(p.assignedTo);
    if (n) return avatar(n.name, "nurse") + " " + esc(n.name) + " <span class='small muted'>(Nurse)</span>";
  }
  var d = D.doc(p.assignedTo), s = D.spec(p.assignedTo);
  var name = d ? d.name : s ? s.name : "Unassigned";
  var cls = d ? "mbbs" : s ? "spec" : "";
  return avatar(name, cls) + " " + esc(name);
}

/* ---------------- routing engine ---------------- */

function specialistsAvailable() {
  return D.specialists.filter(function (s) { return s.available; });
}

/* Assigns routedTo / assignedTo / mode for a patient based on risk
   and specialist availability. Returns a human-readable reason. */
function routePatient(p) {
  if (p.risk === "HIGH") {
    var avail = specialistsAvailable();
    if (avail.length) {
      var h = hashStr(p.id || p.name || "x");
      var s = avail[h % avail.length];
      var mode = s.modes[h % s.modes.length];
      p.routedTo = "specialist";
      p.assignedTo = s.id;
      p.directConsult = true;
      p.mode = mode;
      p.referral = {
        reason: "Direct HIGH-risk consult — specialist available (" + mode + ")",
        byDoctor: "AI Triage · direct routing",
        date: "Today " + new Date().toTimeString().slice(0, 5),
        priority: "High"
      };
      return "Direct to Specialist (" + mode + ")";
    }
    p.routedTo = "mbbs";
    p.assignedTo = "d" + (1 + hashStr(p.id || p.name || "x") % 3);
    return "MBBS queue — HIGH priority";
  }
  if (p.risk === "MEDIUM") {
    p.routedTo = "mbbs";
    p.assignedTo = "d" + (1 + hashStr(p.id || p.name || "x") % 3);
    return "MBBS queue — after HIGH cases";
  }
  p.routedTo = "nurse";
  p.assignedTo = "n" + (1 + hashStr(p.id || p.name || "x") % 2);
  return "Nurse queue — routine";
}

/* queue helpers */
function activePatients() {
  return D.patients.filter(function (p) { return p.status !== "completed" || !p.discharged; });
}
function nurseQueue() {
  return D.patients.filter(function (p) { return p.routedTo === "nurse" && p.status !== "completed"; });
}
function mbbsQueue() {
  return D.byRisk(D.patients.filter(function (p) { return p.routedTo === "mbbs" && p.status !== "completed"; }));
}
function specQueue() {
  return D.patients.filter(function (p) { return p.routedTo === "specialist" && p.status !== "completed"; });
}
function dischargeQueue() {
  return D.patients.filter(function (p) { return p.status === "completed" && !p.discharged; });
}

function openPatient(p) {
  if (p.status === "queued") p.status = "in-visit";
}

/* ---------------- fundus image generator ---------------- */

function hashStr(s) {
  var h = 2166136261;
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function rng(seed) {
  var t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    var r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function fundusSVG(seedStr, risk, opts) {
  opts = opts || {};
  var r = rng(hashStr(seedStr));
  var R = 190, cx = 280, cy = 210;
  var lesions = [];
  var n = risk === "HIGH" ? 4 : risk === "MEDIUM" ? 2 : 0;
  var parts = [];
  parts.push('<svg viewBox="0 0 560 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Simulated retinal fundus image">');
  parts.push('<defs><radialGradient id="fund" cx="50%" cy="45%" r="70%">' +
    '<stop offset="0%" stop-color="#5a2a22"/><stop offset="55%" stop-color="#3d1c17"/>' +
    '<stop offset="100%" stop-color="#1d0d0b"/></radialGradient></defs>');
  parts.push('<rect x="0" y="0" width="560" height="420" fill="#0c1220"/>');
  parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="url(#fund)"/>');
  parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="#000" stroke-opacity=".5"/>');

  var discX = 348, discY = 186;
  parts.push('<ellipse cx="' + discX + '" cy="' + discY + '" rx="36" ry="32" fill="#c99a5e" opacity=".85"/>');
  parts.push('<ellipse cx="' + discX + '" cy="' + discY + '" rx="20" ry="17" fill="#d9b077" opacity=".9"/>');

  var i, j, ang, len, x, y, ctrl;
  for (i = 0; i < 9; i++) {
    ang = -1.9 + i * 0.42 + (r() - 0.5) * 0.35;
    len = 70 + r() * 120;
    x = discX + Math.cos(ang) * len;
    y = discY + Math.sin(ang) * len;
    ctrl = discX + Math.cos(ang) * len * 0.5 + (r() - 0.5) * 18;
    var c1y = discY + Math.sin(ang) * len * 0.5 + (r() - 0.5) * 18;
    parts.push('<path d="M' + discX + ',' + discY + ' Q' + ctrl.toFixed(1) + ',' + c1y.toFixed(1) + ' ' + x.toFixed(1) + ',' + y.toFixed(1) + '" ' +
      'stroke="' + (i % 3 === 0 ? "#8e3b34" : "#a94a40") + '" stroke-width="' + (2.6 - i * 0.15).toFixed(1) + '" fill="none" opacity=".8"/>');
    for (j = 0; j < 3; j++) {
      var bAng = ang + (r() - 0.5) * 0.5;
      var bLen = 22 + r() * 40;
      var bx = x - Math.cos(bAng) * bLen * 0.4;
      var by = y - Math.sin(bAng) * bLen * 0.4;
      parts.push('<path d="M' + x.toFixed(1) + ',' + y.toFixed(1) + ' Q' + bx.toFixed(1) + ',' + by.toFixed(1) + ' ' + (x - Math.cos(bAng) * bLen).toFixed(1) + ',' + (y - Math.sin(bAng) * bLen).toFixed(1) + '" stroke="#8e3b34" stroke-width="1.2" fill="none" opacity=".65"/>');
    }
  }

  parts.push('<ellipse cx="218" cy="224" rx="42" ry="34" fill="#6e2f14" opacity=".42"/>');
  parts.push('<circle cx="218" cy="224" r="7" fill="#f2c14e" opacity=".55"/>');

  var pt = [];
  for (i = 0; i < n + (risk === "HIGH" ? 2 : 0); i++) {
    ang = r() * Math.PI * 2;
    len = 40 + r() * 120;
    x = cx + Math.cos(ang) * len;
    y = cy + Math.sin(ang) * len;
    if (Math.hypot(x - 218, y - 224) < 30) { x += 40; y += 20; }
    var type = r();
    pt.push({ x: x, y: y, type: type });
    if (type < 0.45) {
      var blobs = 1 + Math.floor(r() * 3);
      for (j = 0; j < blobs; j++)
        parts.push('<circle cx="' + (x + (r() - 0.5) * 16) + '" cy="' + (y + (r() - 0.5) * 16) + '" r="' + (2.5 + r() * 4) + '" fill="#a3271f" opacity=".72"/>');
    } else if (type < 0.75) {
      var dots = 2 + Math.floor(r() * 4);
      for (j = 0; j < dots; j++)
        parts.push('<circle cx="' + (x + (r() - 0.5) * 20) + '" cy="' + (y + (r() - 0.5) * 20) + '" r="' + (1.2 + r() * 1.4) + '" fill="#c22a20" opacity=".85"/>');
    } else if (type < 0.9) {
      parts.push('<ellipse cx="' + x + '" cy="' + y + '" rx="' + (4 + r() * 5) + '" ry="' + (2.5 + r() * 3) + '" fill="#f2c14e" opacity=".8"/>');
    } else {
      parts.push('<ellipse cx="' + x + '" cy="' + y + '" rx="' + (5 + r() * 4) + '" ry="' + (3 + r() * 3) + '" fill="#f5f0e0" opacity=".45"/>');
    }
  }

  if (opts.overlay && pt.length) {
    var labels = ["MA cluster", "Hemorrhage", "Exudate", "Edema"];
    var shown = pt.slice(0, 3);
    for (i = 0; i < shown.length; i++) {
      var lx = shown[i].x + 18, ly = shown[i].y - 8;
      parts.push('<g class="ai-marker"><circle cx="' + shown[i].x + '" cy="' + shown[i].y + '" r="16"/>' +
        '<rect x="' + lx + '" y="' + (ly - 15) + '" width="74" height="15" rx="4" class="tag"/>' +
        '<text x="' + (lx + 37) + '" y="' + (ly - 4) + '" text-anchor="middle" fill="#ffd166" font-family="Segoe UI, Arial" font-size="9.5">' + labels[i] + '</text></g>');
    }
  }
  parts.push('</svg>');
  return parts.join("");
}

/* ---------------- topbar ---------------- */

function roleMeta(r) {
  var m = {
    nurse: { label: "Nurse / Intake", color: "#0f766e" },
    mbbs: { label: "MBBS Doctor", color: "#155e75" },
    specialist: { label: "Specialist", color: "#5b21b6" },
    admin: { label: "Administrator", color: "#475467" }
  };
  return m[r] || m.nurse;
}

function topbar(role) {
  var m = roleMeta(role);
  var nav = "";
  if (role) {
    nav =
      '<a class="btn btn-secondary btn-sm" href="#/waiting">Waiting Room</a>' +
      '<a class="btn btn-secondary btn-sm" href="flowchart.html" target="_blank">Flowchart</a>' +
      '<button class="btn btn-secondary btn-sm" data-role="' + role + '">Switch role</button>';
  }
  return '<header class="topbar">' +
    '<div class="brand"><span class="brand-mark">R</span><span>Retinal Care Platform</span>' +
    '<span class="pill pill-neutral" style="margin-left:6px">DEMO</span></div>' +
    '<div class="topbar-right">' + nav + '</div></header>';
}

/* ---------------- router ---------------- */

var routes = {
  "": roleScreen,
  "/": roleScreen,
  "/nurse": nurseScreen,
  "/nurse/new": nurseNewScreen,
  "/analyze": analyzeScreen,
  "/waiting": waitingScreen,
  "/mbbs": mbbsScreen,
  "/patient": patientPanelScreen,
  "/visit": visitScreen,
  "/specialist": specialistScreen,
  "/reading": readingScreen,
  "/signoff": signoffScreen,
  "/admin": adminScreen
};

function parseRoute(hash) {
  var h = (hash || "").replace(/^#/, "");
  var seg = h.split("/").filter(Boolean);
  return { seg: seg, key: seg.length ? "/" + seg[0] : "/" };
}

function navigate(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

function render() {
  var r = parseRoute(location.hash);
  var body = document.getElementById("app");
  if (!body) return;

  if (r.key === "/analyze" && !App.draft) { navigate("#/nurse"); return; }
  if (r.key === "/patient" || r.key === "/visit" || r.key === "/reading" || r.key === "/signoff") {
    var p = D.pat(r.seg[1]);
    if (!p) { navigate("#/"); return; }
  }

  if (r.key === "" || r.key === "/") {
    roleScreen(body);
  } else {
    if (!App.role) {
      App.role = loadRole() || "mbbs";
      saveRole();
    }
    body.innerHTML = topbar(App.role) + '<div class="content" id="content"></div>';
    var content = document.getElementById("content");
    routes[r.key](content, r.seg);
  }
  bindGlobal();
}

function bindGlobal() {
  var bp = document.getElementById("app");
  bp.querySelectorAll("[data-role]").forEach(function (b) {
    b.addEventListener("click", function () {
      App.role = null;
      saveRole();
      navigate("#/");
    });
  });
  bp.querySelectorAll("[data-nav]").forEach(function (b) {
    b.addEventListener("click", function () {
      navigate(b.getAttribute("data-nav"));
    });
  });
}

window.addEventListener("hashchange", render);

/* ---------------- role selection ---------------- */

function roleScreen(body) {
  var roles = [
    { id: "nurse", icon: "🩺", title: "Nurse / Intake", desc: "Register patients, capture retinal images, run AI triage, handle low-risk queue & discharge" },
    { id: "mbbs", icon: "🧑‍⚕️", title: "MBBS Doctor", desc: "Review AI triage, assess HIGH then MEDIUM risk cases, prescribe or refer" },
    { id: "specialist", icon: "👁️", title: "Specialist", desc: "Direct & referred consults (in-person / Teams / WhatsApp), retinal reading, sign-off" },
    { id: "admin", icon: "🗂️", title: "Admin", desc: "Monitor waiting rooms, routing, specialist availability and staff" }
  ];
  var colors = { nurse: "var(--nurse-soft)", mbbs: "var(--mbbs-soft)", specialist: "var(--spec-soft)", admin: "var(--admin-soft)" };
  var tints = { nurse: "var(--nurse)", mbbs: "var(--mbbs)", specialist: "var(--spec)", admin: "var(--admin)" };
  var cards = roles.map(function (r) {
    return '<button class="role-card" data-enter="' + r.id + '">' +
      '<span class="role-ico" style="background:' + colors[r.id] + ';color:' + tints[r.id] + '">' + r.icon + '</span>' +
      '<h3>' + r.title + '</h3><p>' + r.desc + '</p></button>';
  }).join("");
  body.innerHTML =
    '<div class="auth-wrap">' +
    '<div class="auth-logo"><span class="brand-mark">R</span></div>' +
    '<h1 class="auth-title">Retinal Care Platform</h1>' +
    '<p class="auth-sub">AI-assisted triage &amp; clinical workflow for retinal care</p>' +
    '<p class="auth-sub small">Demo wireframe — all data is simulated</p>' +
    '<div class="role-grid">' + cards + '</div>' +
    '<div style="margin-top:28px;display:flex;gap:10px;align-items:center">' +
    '<a class="btn btn-secondary btn-sm" href="flowchart.html" target="_blank">View System Flowchart</a>' +
    '</div></div>';
  body.querySelectorAll("[data-enter]").forEach(function (b) {
    b.addEventListener("click", function () {
      App.role = b.getAttribute("data-enter");
      saveRole();
      navigate(App.role === "mbbs" ? "#/mbbs" : App.role === "nurse" ? "#/nurse" : App.role === "specialist" ? "#/specialist" : "#/admin");
    });
  });
}

/* ---------------- shared pieces ---------------- */

function patientRow(p, pos, extra) {
  return '<div class="patient-row" data-open="' + p.id + '">' +
    '<span class="pos">' + pos + '</span>' +
    '<div class="who">' +
    '<div class="name">' + esc(p.name) + ' <span class="muted small mono">' + esc(p.patientId) + '</span></div>' +
    '<div class="meta">' + esc(p.condition) + ' · Visit #' + p.visitNo + '</div>' +
    (extra ? '<div class="meta">' + extra + '</div>' : "") +
    '</div>' +
    '<div class="stat">' +
    '<div>' + riskPill(p.risk) + ' ' + scoreBadge(p.score) + '</div>' +
    '<div class="meta small mono">' + p.waitMin + ' min</div>' +
    '</div>' +
    '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">' +
    routeTag(p) + statusPill(p) +
    '</div>' +
    '</div>';
}

function bindPatientRows(root, openFn) {
  root.querySelectorAll("[data-open]").forEach(function (row) {
    row.addEventListener("click", function () {
      var id = row.getAttribute("data-open");
      var p = D.pat(id);
      if (!p) return;
      openPatient(p);
      if (openFn) { openFn(p); return; }
      if (p.status === "completed") { navigate("#/patient/" + id); return; }
      if (p.routedTo === "specialist" && App.role === "specialist") { navigate("#/reading/" + id); return; }
      if (p.routedTo === "specialist" && p.directConsult) { navigate("#/reading/" + id); return; }
      navigate("#/patient/" + id);
    });
  });
}

function queueSection(title, sub, icon, color, list, posBase, openFn) {
  return '<div class="card card-pad mb-16">' +
    '<div class="wait-section-head"><span class="bar" style="background:' + color + '"></span>' +
    '<h3 style="color:' + color + '">' + title + '</h3>' +
    '<span class="wait-count">' + list.length + ' patient' + (list.length === 1 ? "" : "s") + '</span>' +
    '<span class="small muted" style="margin-left:auto">' + sub + '</span></div>' +
    (list.length
      ? list.map(function (p, i) { return patientRow(p, String.fromCharCode(65 + i), null); }).join("")
      : '<div class="empty">Queue is clear</div>') +
    '</div>';
}

function pageHead(title, sub, actions) {
  return '<div class="page-head"><div><h1>' + title + '</h1><div class="sub">' + sub + '</div></div>' +
    '<div class="spacer"></div><div class="flex align-center">' + (actions || "") + '</div></div>';
}

/* ---------------- screen: nurse ---------------- */

function nurseScreen(c) {
  var nq = nurseQueue();
  var dq = dischargeQueue();
  var rows = nq.map(function (p, i) { return patientRow(p, i + 1); }).join("");
  var dRows = dq.map(function (p, i) {
    return '<div class="patient-row" data-open="' + p.id + '">' +
      '<span class="pos">' + (i + 1) + '</span>' +
      '<div class="who"><div class="name">' + esc(p.name) + ' <span class="muted small mono">' + esc(p.patientId) + '</span></div>' +
      '<div class="meta">Visit #' + p.visitNo + ' · signed off by ' + esc((p.history && p.history[p.history.length - 1] || {}).by || "—") + '</div></div>' +
      '<div class="stat">' + riskPill(p.risk) + ' ' + scoreBadge(p.score) + '</div>' +
      '<div><span class="pill pill-ok">Returned</span></div>' +
      '</div>';
  }).join("");

  c.innerHTML =
    pageHead("Nurse / Intake", "Register patients, run AI triage, manage the low-risk queue and discharge desk",
      '<a class="btn btn-primary" href="#/nurse/new">+ New Patient</a>') +
    '<div class="grid grid-4 mb-16">' +
    '<div class="stat-tile"><div class="label">Nurse queue (low risk)</div><div class="value" style="color:var(--nurse)">' + nq.length + '</div></div>' +
    '<div class="stat-tile"><div class="label">Awaiting discharge</div><div class="value" style="color:var(--success)">' + dq.length + '</div></div>' +
    '<div class="stat-tile"><div class="label">Awaiting MBBS</div><div class="value">' + mbbsQueue().length + '</div></div>' +
    '<div class="stat-tile"><div class="label">High risk flagged</div><div class="value" style="color:var(--high)">' + D.patients.filter(function (p) { return p.risk === "HIGH" && p.status !== "completed"; }).length + '</div></div>' +
    '</div>' +
    '<div class="grid grid-2">' +
    '<div>' +
    '<div class="card card-pad mb-16"><h3 class="card-title">Nurse waiting room — low risk</h3>' +
    (rows || '<div class="empty">No low-risk patients waiting</div>') + '</div>' +
    '<div class="card card-pad"><h3 class="card-title">Discharge desk — completed visits return here</h3>' +
    (dRows || '<div class="empty">No completed visits awaiting discharge</div>') +
    '<div class="mt-8">' + (dq.length ? '<button class="btn btn-success btn-sm" id="dischargeAll">Discharge all returned patients</button>' : "") + '</div>' +
    '</div>' +
    '</div>' +
    '<div>' +
    '<div class="card card-pad mb-16"><h3 class="card-title">Patient search</h3>' +
    '<div class="field"><input class="input" id="nurseSearch" placeholder="Search by name or patient ID…"></div>' +
    '<div id="nurseSearchResults"><div class="empty">Type to search registered patients</div></div></div>' +
    '<div class="card card-pad"><h3 class="card-title">Routing overview</h3>' +
    '<div class="finding"><div class="sev">' + riskPill("HIGH") + '</div><div>Specialist available → direct consult · else MBBS</div></div>' +
    '<div class="finding"><div class="sev">' + riskPill("MEDIUM") + '</div><div>MBBS queue — served after HIGH cases</div></div>' +
    '<div class="finding"><div class="sev">' + riskPill("LOW") + '</div><div>Nurse queue — review, discharge or escalate</div></div>' +
    '</div>' +
    '</div>' +
    '</div>';

  if (c.querySelector("#dischargeAll")) {
    c.querySelector("#dischargeAll").addEventListener("click", function () {
      dq.forEach(function (p) { p.discharged = true; });
      toast(dq.length + " patients discharged");
      render();
    });
  }
  var si = c.querySelector("#nurseSearch");
  si.addEventListener("input", function () {
    var q = si.value.trim().toLowerCase();
    var res = c.querySelector("#nurseSearchResults");
    if (!q) { res.innerHTML = '<div class="empty">Type to search registered patients</div>'; return; }
    var hits = D.patients.filter(function (p) {
      return (p.name + " " + p.patientId + " " + p.condition).toLowerCase().indexOf(q) !== -1;
    });
    res.innerHTML = hits.length
      ? hits.map(function (p) {
        return '<div class="patient-row" data-open="' + p.id + '">' +
          '<div class="who"><div class="name">' + esc(p.name) + '</div><div class="meta">' + esc(p.patientId) + '</div></div>' +
          '<div class="stat">' + riskPill(p.risk) + '</div>' +
          '<div>' + routeTag(p) + '</div></div>';
      }).join("")
      : '<div class="empty">No matching patients</div>';
    bindPatientRows(res);
  });
  bindPatientRows(c);
}

/* ---------------- screen: nurse new patient ---------------- */

function nurseNewScreen(c) {
  c.innerHTML =
    pageHead("New Patient — Intake", "Step 1: patient information · Step 2: retinal image · Step 3: AI triage & routing",
      '<a class="btn btn-secondary" href="#/nurse">← Back</a>') +
    '<div class="grid grid-2">' +
    '<div class="card card-pad">' +
    '<h3 class="card-title">Patient information</h3>' +
    '<div class="form-grid">' +
    '<div class="field"><label>Full name *</label><input class="input" id="npName" placeholder="e.g. Rohit Kumar"></div>' +
    '<div class="field"><label>Age *</label><input class="input" id="npAge" type="number" min="1" max="120" placeholder="e.g. 60"></div>' +
    '<div class="field"><label>Patient ID</label><input class="input" id="npId" placeholder="Auto-assigned (RP-10249)"></div>' +
    '<div class="field"><label>Contact</label><input class="input" id="npContact" placeholder="+91 …"></div>' +
    '<div class="field full"><label>Additional information (reason for visit)</label>' +
    '<textarea class="textarea" id="npCond" placeholder="e.g. Diabetic retinopathy screening"></textarea></div>' +
    '</div>' +
    '<div class="divider"></div>' +
    '<h3 class="card-title">Retinal image</h3>' +
    '<div class="upload-zone" id="npUpload">' +
    '<span class="ico">📷</span>' +
    '<strong>Click to upload or capture fundus image</strong>' +
    '<div class="small muted mt-8">JPG / PNG · simulated image used for this demo</div>' +
    '</div>' +
    '<div id="npPreview"></div>' +
    '<div class="mt-16"><button class="btn btn-primary btn-lg btn-block" id="npAnalyze" disabled>Analyze &amp; Route Patient</button></div>' +
    '</div>' +
    '<div class="card card-pad">' +
    '<h3 class="card-title">How routing works</h3>' +
    '<div class="finding"><div class="sev">①</div><div>Patient registered at intake desk</div></div>' +
    '<div class="finding"><div class="sev">②</div><div>Retinal image captured or uploaded</div></div>' +
    '<div class="finding"><div class="sev">③</div><div>AI triage model scores risk and extracts biomarkers</div></div>' +
    '<div class="finding"><div class="sev">④</div><div>' + riskPill("HIGH") + ' → specialist (if available) or MBBS</div></div>' +
    '<div class="finding"><div class="sev">⑤</div><div>' + riskPill("MEDIUM") + ' → MBBS queue after HIGH cases</div></div>' +
    '<div class="finding"><div class="sev">⑥</div><div>' + riskPill("LOW") + ' → nurse queue</div></div>' +
    '<div class="mt-16"><span class="pill pill-info">Demo note</span> ' +
    '<span class="small muted">AI output is simulated for demonstration. It supports — never replaces — clinical judgement.</span></div>' +
    '</div>' +
    '</div>';

  var uploaded = false;
  var up = c.querySelector("#npUpload");
  up.addEventListener("click", function () {
    uploaded = true;
    c.querySelector("#npPreview").innerHTML =
      '<div class="img-stage mt-16" style="min-height:280px">' + fundusSVG("new" + Date.now(), "MEDIUM", { overlay: false }) + '</div>';
    c.querySelector("#npAnalyze").disabled = false;
    up.style.display = "none";
    toast("Fundus image captured");
  });

  c.querySelector("#npAnalyze").addEventListener("click", function () {
    var name = c.querySelector("#npName").value.trim();
    var age = c.querySelector("#npAge").value.trim();
    if (!name || !age || !uploaded) { toast("Complete name, age and image first"); return; }
    var r = rng(hashStr(name + age));
    var score = Math.round(15 + r() * 80);
    var risk = score >= 80 ? "HIGH" : score >= 50 ? "MEDIUM" : "LOW";
    var pools = {
      HIGH: [
        { text: "Moderate non-proliferative diabetic retinopathy signs in both eyes", sev: "high" },
        { text: "Microaneurysm clusters detected — parafoveal region", sev: "high" },
        { text: "Intraretinal hemorrhages with hard exudates near macula", sev: "high" },
        { text: "Vessel tortuosity and caliber changes noted", sev: "medium" }
      ],
      MEDIUM: [
        { text: "Mild NPDR — scattered microaneurysms", sev: "medium" },
        { text: "Few dot hemorrhages, nasal retina", sev: "medium" },
        { text: "Early hard exudate formation along arcade", sev: "medium" }
      ],
      LOW: [
        { text: "No diabetic retinopathy detected", sev: "low" },
        { text: "Fundus within normal limits for age", sev: "low" }
      ]
    };
    var findings = pools[risk].slice().sort(function () { return r() - 0.5; });
    var bio = risk === "HIGH"
      ? [{ name: "Microaneurysms", count: Math.round(8 + r() * 10) }, { name: "Intraretinal hemorrhages", count: Math.round(3 + r() * 6) }, { name: "Hard exudates", count: Math.round(4 + r() * 8) }]
      : risk === "MEDIUM"
        ? [{ name: "Microaneurysms", count: Math.round(2 + r() * 5) }, { name: "Dot hemorrhages", count: Math.round(1 + r() * 3) }, { name: "Cotton-wool spots", count: Math.round(r() * 2) }]
        : [{ name: "Microaneurysms", count: 0 }, { name: "Hemorrhages", count: 0 }, { name: "Exudates", count: 0 }];

    var p = {
      id: "p" + (D.patients.length + 10),
      name: name, age: age,
      patientId: "RP-102" + (49 + D.patients.length),
      contact: c.querySelector("#npContact").value.trim() || "—",
      condition: c.querySelector("#npCond").value.trim() || "Retinal screening",
      risk: risk, score: score, waitMin: 0,
      status: "queued", routedTo: null, assignedTo: null,
      visitNo: 1,
      findings: findings,
      biomarkers: bio,
      history: [],
      aiModel: "RetinaNet v2 · triage model · demo"
    };
    p.routeReason = routePatient(p);
    App.draft = p;
    navigate("#/analyze/" + p.id);
  });
}

/* ---------------- screen: AI analysis ---------------- */

function analyzeScreen(c, seg) {
  var p = App.draft;
  var rid = seg[1];
  if (rid && !p) { p = D.pat(rid); }
  if (!p) { navigate("#/nurse"); return; }
  var isDraft = !D.pat(p.id);
  var sendLabel = p.routedTo === "specialist" ? "Send to Specialist Waiting Room →"
    : p.routedTo === "nurse" ? "Send to Nurse Waiting Room →"
      : "Send to MBBS Waiting Room →";

  c.innerHTML =
    pageHead("AI Analysis Result", p.name + " · " + p.patientId + " · simulated triage output",
      '<span class="pill pill-info">AI Triage</span>') +
    '<div class="grid grid-2">' +
    '<div class="card card-pad">' +
    '<h3 class="card-title">Retinal image</h3>' +
    '<div class="img-stage" style="min-height:340px">' + fundusSVG(p.id, p.risk, { overlay: true }) +
    '<span class="img-label">Fundus OD · simulated</span></div>' +
    '<div class="small muted mt-8">' + esc(p.aiModel) + '</div>' +
    '</div>' +
    '<div class="card card-pad">' +
    '<h3 class="card-title">AI analysis</h3>' +
    '<div class="kv mb-16">' +
    '<dt>Risk level</dt><dd>' + riskPill(p.risk) + '</dd>' +
    '<dt>Risk score</dt><dd><span class="mono" style="font-weight:700;font-size:17px">' + p.score + '%</span></dd>' +
    '<dt>Priority</dt><dd><span class="pill ' + (p.risk === "HIGH" ? "pill-high" : p.risk === "MEDIUM" ? "pill-medium" : "pill-low") + '">' + (p.risk === "HIGH" ? "▲ Urgent" : p.risk === "MEDIUM" ? "● Standard" : "▼ Routine") + '</span></dd>' +
    '</div>' +
    '<h3 class="card-title">Findings</h3>' +
    D.findingsFor(p).map(function (f) {
      return '<div class="finding"><div class="sev">' +
        (f.sev === "high" ? '<span class="pill pill-high">!</span>' : f.sev === "medium" ? '<span class="pill pill-medium">•</span>' : '<span class="pill pill-low">✓</span>') +
        '</div><div>' + esc(f.text) + '</div></div>';
    }).join("") +
    (p.biomarkers && p.biomarkers.length
      ? '<h3 class="card-title mt-16">Biomarkers</h3>' +
        p.biomarkers.map(function (b) {
          return '<div class="finding"><div class="sev"><span class="score-badge" style="background:#eef2fb;color:#1c4fd6">' + esc(b.count) + '</span></div><div>' + esc(b.name) + '</div></div>';
        }).join("")
      : "") +
    '<div class="divider"></div>' +
    '<h3 class="card-title">Routing decision</h3>' +
    '<div class="refer-card card card-pad" style="background:var(--surface-2)">' +
    '<div class="kv"><dt>Routed to</dt><dd>' + routeTag(p) + '</dd>' +
    '<dt>Reason</dt><dd>' + esc(p.routeReason || "—") + '</dd>' +
    (p.routedTo === "specialist"
      ? '<dt>Specialist</dt><dd>' + esc((D.spec(p.assignedTo) || {}).name || "—") + (p.mode ? " " + modeTag(p) : "") + '</dd>'
      : p.routedTo === "mbbs"
        ? '<dt>Doctor</dt><dd>' + esc((D.doc(p.assignedTo) || {}).name || "—") + '</dd>'
        : '<dt>Nurse</dt><dd>' + esc((D.nurse(p.assignedTo) || {}).name || "—") + '</dd>') +
    '</div></div>' +
    '<div class="small muted mt-8">AI findings are <strong>simulated demo data</strong> for triage support. Final clinical decisions are made by clinicians.</div>' +
    '<div class="mt-16">' +
    '<button class="btn btn-primary btn-lg btn-block" id="aiSend">' + sendLabel + '</button>' +
    '</div>' +
    '</div>' +
    '</div>';

  document.getElementById("aiSend").addEventListener("click", function () {
    if (isDraft) {
      D.patients.push(p);
      App.draft = null;
    }
    var who = p.routedTo === "specialist" ? "specialist " + (D.spec(p.assignedTo) || {}).name
      : p.routedTo === "mbbs" ? "MBBS doctor " + (D.doc(p.assignedTo) || {}).name
        : "nurse " + (D.nurse(p.assignedTo) || {}).name;
    toast(p.name + " routed to " + who);
    navigate("#/waiting");
  });
}

/* ---------------- screen: waiting room (master overview) ---------------- */

function waitingScreen(c) {
  var mq = mbbsQueue();
  var sq = specQueue();
  var nq = nurseQueue();
  var dq = dischargeQueue();
  var avail = specialistsAvailable();

  c.innerHTML =
    pageHead("Waiting Room — Master Overview", "All queues · each case shows who it is routed to · visits drop out on completion",
      '<a class="btn btn-secondary" href="#/' + App.role + '">My dashboard</a>') +
    '<div class="grid grid-4 mb-16">' +
    '<div class="stat-tile"><div class="label">MBBS queue</div><div class="value" style="color:var(--mbbs)">' + mq.length + '</div></div>' +
    '<div class="stat-tile"><div class="label">Specialist queue</div><div class="value" style="color:var(--spec)">' + sq.length + '</div></div>' +
    '<div class="stat-tile"><div class="label">Nurse queue</div><div class="value" style="color:var(--nurse)">' + nq.length + '</div></div>' +
    '<div class="stat-tile"><div class="label">Awaiting discharge</div><div class="value" style="color:var(--success)">' + dq.length + '</div></div>' +
    '</div>' +
    '<div class="card card-pad mb-16" style="border-left:4px solid var(--spec)">' +
    '<div class="flex align-center flex-wrap">' +
    '<span class="pill pill-spec">Specialists available for direct consults</span> ' +
    (avail.length
      ? avail.map(function (s) {
        return '<span class="pill pill-ok" style="margin:2px">' + esc(s.name) + ' · ' + s.modes.join(" / ") + '</span>';
      }).join("")
      : '<span class="pill pill-high" style="margin:2px">None — HIGH risk goes to MBBS</span>') +
    '</div></div>' +
    '<div class="grid grid-2">' +
    '<div>' +
    '<div class="card card-pad mb-16">' +
    '<div class="wait-section-head"><span class="bar" style="background:#155e75"></span>' +
    '<h3 style="color:#155e75">MBBS Waiting Room</h3>' +
    '<span class="wait-count">' + mq.length + '</span>' +
    '<span class="small muted" style="margin-left:auto">HIGH first → then MEDIUM</span></div>' +
    (mq.length
      ? mq.map(function (p, i) { return patientRow(p, i + 1); }).join("")
      : '<div class="empty">MBBS queue is clear</div>') +
    '</div>' +
    '<div class="card card-pad mb-16">' +
    '<div class="wait-section-head"><span class="bar" style="background:#0f766e"></span>' +
    '<h3 style="color:#0f766e">Nurse Waiting Room</h3>' +
    '<span class="wait-count">' + nq.length + '</span>' +
    '<span class="small muted" style="margin-left:auto">LOW risk · routine</span></div>' +
    (nq.length
      ? nq.map(function (p, i) { return patientRow(p, i + 1); }).join("")
      : '<div class="empty">Nurse queue is clear</div>') +
    '</div>' +
    '</div>' +
    '<div class="card card-pad mb-16">' +
    '<div class="wait-section-head"><span class="bar" style="background:#5b21b6"></span>' +
    '<h3 style="color:#5b21b6">Specialist Waiting Room</h3>' +
    '<span class="wait-count">' + sq.length + '</span>' +
    '<span class="small muted" style="margin-left:auto">Direct consults + referrals</span></div>' +
    (sq.length
      ? sq.map(function (p, i) {
        var extra = p.directConsult
          ? "Direct consult" + (p.mode ? " · " + p.mode : "") + " · by " + esc(p.referral.byDoctor)
          : "Referral: " + esc(p.referral.reason) + " · by " + esc(p.referral.byDoctor);
        return patientRow(p, i + 1, extra);
      }).join("")
      : '<div class="empty">Specialist queue is clear</div>') +
    '</div>' +
    '</div>' +
    '</div>';

  bindPatientRows(c);
}

/* ---------------- screen: MBBS dashboard ---------------- */

function mbbsScreen(c) {
  var queue = mbbsQueue();
  var referred = D.patients.filter(function (p) { return p.routedTo === "specialist" && p.status !== "completed" && !p.directConsult; });
  var completed = D.patients.filter(function (p) { return p.status === "completed"; });
  var highCount = queue.filter(function (p) { return p.risk === "HIGH"; }).length;
  var medCount = queue.filter(function (p) { return p.risk === "MEDIUM"; }).length;

  c.innerHTML =
    pageHead("MBBS Dashboard", "Dr. Anjali Sharma · Morning shift",
      '<a class="btn btn-secondary" href="#/waiting">Waiting Room</a>') +
    '<div class="grid grid-4 mb-16">' +
    '<div class="stat-tile"><div class="label">High risk (serve first)</div><div class="value" style="color:var(--high)">' + highCount + '</div></div>' +
    '<div class="stat-tile"><div class="label">Medium risk</div><div class="value" style="color:#b45309">' + medCount + '</div></div>' +
    '<div class="stat-tile"><div class="label">Today\u2019s patients</div><div class="value">' + D.patients.length + '</div></div>' +
    '<div class="stat-tile"><div class="label">Referrals to specialist</div><div class="value" style="color:var(--spec)">' + referred.length + '</div></div>' +
    '</div>' +
    '<div class="card card-pad mb-16">' +
    '<div class="wait-section-head"><span class="bar" style="background:#155e75"></span>' +
    '<h3 style="color:#155e75">Your queue — HIGH risk first, then MEDIUM</h3>' +
    '<span class="wait-count">' + queue.length + '</span></div>' +
    (queue.length
      ? queue.map(function (p, i) { return patientRow(p, i + 1); }).join("")
      : '<div class="empty">Queue is clear — finish HIGH cases before MEDIUM</div>') +
    '</div>' +
    '<div class="grid grid-2">' +
    '<div class="card card-pad"><h3 class="card-title">Referrals made</h3>' +
    (referred.length
      ? referred.map(function (p) {
        return '<div class="patient-row" data-open="' + p.id + '">' +
          '<div class="who"><div class="name">' + esc(p.name) + '</div>' +
          '<div class="meta">→ ' + esc((p.referral || {}).reason || "Specialist review") + ' · to ' + esc((p.referral && D.spec(p.assignedTo)) ? D.spec(p.assignedTo).name : "") + '</div></div>' +
          '<div>' + statusPill(p) + '</div></div>';
      }).join("")
      : '<div class="empty">No referrals yet</div>') +
    '</div>' +
    '<div class="card card-pad"><h3 class="card-title">Completed today → returned to nurse</h3>' +
    (completed.length
      ? completed.map(function (p) {
        return '<div class="patient-row" data-open="' + p.id + '">' +
          '<div class="who"><div class="name">' + esc(p.name) + '</div><div class="meta">Visit #' + p.visitNo + ' · ' + (p.discharged ? "discharged" : "awaiting discharge at nurse desk") + '</div></div>' +
          '<div>' + statusPill(p) + '</div></div>';
      }).join("")
      : '<div class="empty">No visits completed yet</div>') +
    '</div>' +
    '</div>';
  bindPatientRows(c);
}

/* ---------------- screen: patient panel ---------------- */

function patientPanelScreen(c, seg) {
  var p = D.pat(seg[1]);
  var history = p.history || [];
  var isDone = p.status === "completed";
  var isNurseCase = p.routedTo === "nurse" && !isDone;
  var isMbbsCase = p.routedTo === "mbbs" && !isDone;
  var isSpecCase = p.routedTo === "specialist" && !isDone;
  var tabs = "";
  if (history.length) {
    tabs = history.map(function (v) {
      return '<button class="visit-tab" data-visit="' + v.no + '">Visit ' + v.no +
        '<span class="risk-mini">' + fmtDate(v.date) + ' · ' + v.risk + ' ' + v.score + '%</span></button>';
    }).join("") + '<button class="visit-tab active">Current Visit<span class="risk-mini">Today · ' + p.risk + ' ' + p.score + '%</span></button>';
  } else {
    tabs = '<button class="visit-tab active">Current Visit<span class="risk-mini">Today · ' + p.risk + ' ' + p.score + '%</span></button>';
  }

  var actions = "";
  if (isDone) {
    actions = '<div class="success-banner"><span class="big">✓</span><div><strong>Visit completed</strong>' +
      '<div>Patient returned to the nurse discharge desk' + (p.discharged ? " and discharged." : " — pending discharge.") + '</div></div></div>' +
      '<div class="mt-16"><a class="btn btn-secondary" href="#/nurse">Go to Nurse / Discharge Desk</a></div>';
  } else if (isNurseCase) {
    actions = '<div class="card card-pad">' +
      '<h3 class="card-title">Nurse review — low risk case</h3>' +
      '<div class="field"><label>Nurse notes</label><textarea class="textarea" id="paNotes" placeholder="e.g. Advised lifestyle changes, routine follow-up…"></textarea></div>' +
      '<div class="flex mt-8">' +
      '<button class="btn btn-success grow" id="paDischarge">✓ Mark Done — Discharge</button>' +
      '<button class="btn btn-danger" id="paEscalate">Escalate to MBBS</button>' +
      '</div></div>';
  } else if (isMbbsCase) {
    actions = '<div class="card card-pad">' +
      '<h3 class="card-title">Doctor assessment</h3>' +
      '<div class="field"><label>Clinical notes</label><textarea class="textarea" id="paNotes" placeholder="Enter assessment notes…"></textarea></div>' +
      '<div class="field"><label>Prescription</label><textarea class="textarea" id="paRx" placeholder="Enter prescription…"></textarea></div>' +
      '<div class="flex mt-8">' +
      '<button class="btn btn-success grow" id="paPrescribe">Complete / Prescribe</button>' +
      '<button class="btn btn-danger" id="paRefer">Refer to Specialist</button>' +
      '</div></div>';
  } else if (isSpecCase) {
    actions = '<div class="refer-card card card-pad">' +
      '<h3 class="card-title">' + (p.directConsult ? "Direct consult" : "Referred to specialist") + '</h3>' +
      '<div class="kv"><dt>Specialist</dt><dd>' + esc((D.spec(p.assignedTo) || {}).name || "—") + (p.mode ? " " + modeTag(p) : "") + '</dd>' +
      '<dt>Reason</dt><dd>' + esc((p.referral || {}).reason || "—") + '</dd>' +
      '<dt>By</dt><dd>' + esc((p.referral || {}).byDoctor || "—") + '</dd></div>' +
      '<div class="mt-16"><a class="btn btn-primary" href="#/reading/' + p.id + '">Open Retinal Reading Screen</a></div></div>';
  }

  c.innerHTML =
    pageHead("Patient Panel", p.name + " · " + p.patientId + " · Visit #" + p.visitNo,
      routeTag(p) + ' <span class="pill pill-mbbs">' + (isNurseCase ? "Nurse Review" : isSpecCase ? "Specialist Case" : "MBBS Review") + '</span>') +
    '<div class="grid grid-2">' +
    '<div class="card card-pad">' +
    '<h3 class="card-title">Patient information</h3>' +
    '<div class="kv">' +
    '<dt>Name</dt><dd>' + esc(p.name) + '</dd>' +
    '<dt>Age</dt><dd>' + p.age + ' yrs</dd>' +
    '<dt>Patient ID</dt><dd class="mono">' + esc(p.patientId) + '</dd>' +
    '<dt>Contact</dt><dd class="mono">' + esc(p.contact) + '</dd>' +
    '<dt>Condition</dt><dd>' + esc(p.condition) + '</dd>' +
    '<dt>Assigned</dt><dd>' + assignee(p) + '</dd>' +
    '</div>' +
    '<div class="divider"></div>' +
    '<h3 class="card-title">Retinal image <span class="small muted">(current visit)</span></h3>' +
    '<div class="img-stage" style="min-height:300px">' + fundusSVG(p.id + "-cur", p.risk, { overlay: true }) + '</div>' +
    '</div>' +
    '<div>' +
    '<div class="card card-pad mb-16">' +
    '<h3 class="card-title">AI assessment</h3>' +
    '<div class="kv mb-8">' +
    '<dt>Risk</dt><dd>' + riskPill(p.risk) + '</dd>' +
    '<dt>Score</dt><dd>' + scoreBadge(p.score) + '</dd>' +
    '</div>' +
    D.findingsFor(p).map(function (f) {
      return '<div class="finding"><div class="sev">' +
        (f.sev === "high" ? '<span class="pill pill-high">!</span>' : f.sev === "medium" ? '<span class="pill pill-medium">•</span>' : '<span class="pill pill-low">✓</span>') +
        '</div><div>' + esc(f.text) + '</div></div>';
    }).join("") +
    (p.biomarkers && p.biomarkers.length
      ? '<h3 class="card-title mt-16">Biomarkers</h3>' +
        '<div class="flex flex-wrap">' + p.biomarkers.map(function (b) {
          return '<span class="score-badge" style="background:#eef2fb;color:#1c4fd6">' + esc(b.name) + ': ' + esc(b.count) + '</span>';
        }).join(" ") + '</div>'
      : "") +
    '</div>' +
    '<div class="card card-pad mb-16">' +
    '<h3 class="card-title">Previous visits</h3>' +
    '<div class="visit-strip mb-16">' + tabs + '</div>' +
    '<div id="visitDetail"><div class="small muted">Click a previous visit to view its details.</div></div>' +
    '</div>' +
    actions +
    '</div>' +
    '</div>';

  var dd = c.querySelector("#visitDetail");
  c.querySelectorAll("[data-visit]").forEach(function (t) {
    t.addEventListener("click", function () {
      c.querySelectorAll("[data-visit]").forEach(function (x) { x.classList.remove("active"); });
      t.classList.add("active");
      var v = history.filter(function (h) { return h.no === parseInt(t.getAttribute("data-visit"), 10); })[0];
      if (!v) return;
      dd.innerHTML =
        '<div class="kv">' +
        '<dt>Date</dt><dd>' + fmtDate(v.date) + '</dd>' +
        '<dt>Risk</dt><dd>' + riskPill(v.risk) + ' ' + scoreBadge(v.score) + '</dd>' +
        '<dt>Doctor notes</dt><dd>' + esc(v.notes) + '</dd>' +
        '<dt>Prescription</dt><dd>' + esc(v.rx) + '</dd>' +
        '<dt>Reviewed by</dt><dd>' + esc(v.by) + '</dd>' +
        '</div>' +
        '<div class="mt-8"><a class="btn btn-secondary btn-sm" href="#/visit/' + p.id + '/' + v.no + '">Open full visit view →</a></div>';
    });
  });

  var notes = c.querySelector("#paNotes"), rx = c.querySelector("#paRx");

  if (c.querySelector("#paDischarge")) {
    c.querySelector("#paDischarge").addEventListener("click", function () {
      if (!notes.value.trim()) { toast("Add nurse notes before discharging"); return; }
      p.history.push({
        no: p.visitNo,
        date: new Date().toISOString().slice(0, 10),
        risk: p.risk, score: p.score,
        notes: notes.value.trim(),
        rx: "Routine care — no prescription.",
        by: (D.nurse(p.assignedTo) || {}).name || "Nurse / Intake"
      });
      p.visitNo++;
      p.status = "completed";
      p.discharged = true;
      toast("Patient discharged — visit archived");
      navigate("#/nurse");
    });
  }
  if (c.querySelector("#paEscalate")) {
    c.querySelector("#paEscalate").addEventListener("click", function () {
      p.routedTo = "mbbs";
      p.assignedTo = "d1";
      p.status = "queued";
      p.referral = {
        reason: "Escalated by nurse — " + (notes.value.trim() || "further review needed"),
        byDoctor: (D.nurse(p.assignedTo) || {}).name || "Nurse / Intake",
        date: "Today " + new Date().toTimeString().slice(0, 5),
        priority: p.risk
      };
      toast(p.name + " escalated to MBBS queue");
      render();
    });
  }
  if (c.querySelector("#paPrescribe")) {
    c.querySelector("#paPrescribe").addEventListener("click", function () {
      if (!notes.value.trim() || !rx.value.trim()) { toast("Add clinical notes and prescription first"); return; }
      p.history.push({
        no: p.visitNo,
        date: new Date().toISOString().slice(0, 10),
        risk: p.risk, score: p.score,
        notes: notes.value.trim(),
        rx: rx.value.trim(),
        by: "Dr. Anjali Sharma"
      });
      p.visitNo++;
      p.status = "completed";
      toast("Visit completed — patient returned to Nurse for discharge");
      navigate("#/mbbs");
    });
  }
  if (c.querySelector("#paRefer")) {
    c.querySelector("#paRefer").addEventListener("click", function () {
      var m = document.createElement("div");
      m.style.cssText = "position:fixed;inset:0;background:rgba(15,20,32,.5);display:flex;align-items:center;justify-content:center;z-index:200";
      m.innerHTML = '<div class="card card-pad" style="width:480px;max-width:92vw">' +
        '<h3 class="card-title">Refer to specialist</h3>' +
        '<div class="field"><label>Specialist</label><select class="input" id="refSpec">' +
        D.specialists.map(function (s) { return '<option value="' + s.id + '">' + esc(s.name) + ' — ' + esc(s.clinic) + (s.available ? " · available" : "") + '</option>'; }).join("") +
        '</select></div>' +
        '<div class="field"><label>Referral reason</label><textarea class="textarea" id="refReason" placeholder="e.g. Suspect neovascular AMD — specialist review for anti-VEGF assessment"></textarea></div>' +
        '<div class="flex" style="justify-content:flex-end">' +
        '<button class="btn btn-secondary" id="refCancel">Cancel</button>' +
        '<button class="btn btn-primary" id="refGo">Confirm Referral</button>' +
        '</div></div>';
      document.body.appendChild(m);
      m.querySelector("#refCancel").addEventListener("click", function () { m.remove(); });
      m.querySelector("#refGo").addEventListener("click", function () {
        var sid = m.querySelector("#refSpec").value;
        p.routedTo = "specialist";
        p.assignedTo = sid;
        p.directConsult = false;
        p.mode = null;
        p.status = "queued";
        p.referral = {
          reason: m.querySelector("#refReason").value.trim() || "Specialist review required",
          byDoctor: "Dr. Anjali Sharma",
          date: "Today " + new Date().toTimeString().slice(0, 5),
          priority: p.risk
        };
        m.remove();
        toast("Referred to " + D.spec(sid).name + " — added to specialist waiting room");
        render();
      });
    });
  }
}

/* ---------------- screen: previous visit ---------------- */

function visitScreen(c, seg) {
  var p = D.pat(seg[1]);
  var v = (p.history || []).filter(function (h) { return h.no === parseInt(seg[2], 10); })[0];
  if (!v) { navigate("#/patient/" + p.id); return; }
  c.innerHTML =
    pageHead("Previous Visit", p.name + " · Visit #" + v.no + " · " + fmtDate(v.date),
      '<a class="btn btn-secondary" href="#/patient/' + p.id + '">← Back to patient</a>') +
    '<div class="grid grid-2">' +
    '<div class="card card-pad">' +
    '<h3 class="card-title">Retinal image — visit #' + v.no + '</h3>' +
    '<div class="img-stage" style="min-height:300px">' + fundusSVG(p.id + "-v" + v.no, v.risk, { overlay: false }) + '</div>' +
    '<div class="small muted mt-8">Simulated archived fundus image</div>' +
    '</div>' +
    '<div class="card card-pad">' +
    '<h3 class="card-title">Visit details</h3>' +
    '<div class="kv">' +
    '<dt>Date</dt><dd>' + fmtDate(v.date) + '</dd>' +
    '<dt>Risk level</dt><dd>' + riskPill(v.risk) + ' ' + scoreBadge(v.score) + '</dd>' +
    '<dt>Doctor notes</dt><dd>' + esc(v.notes) + '</dd>' +
    '<dt>Prescription</dt><dd>' + esc(v.rx) + '</dd>' +
    '<dt>Reviewed by</dt><dd>' + esc(v.by) + '</dd>' +
    '</div>' +
    '<div class="divider"></div>' +
    '<h3 class="card-title">Comparison</h3>' +
    '<div class="finding"><div class="sev">' + riskPill(p.risk) + '</div><div>Current visit · score ' + p.score + '%</div></div>' +
    '<div class="finding"><div class="sev">' + riskPill(v.risk) + '</div><div>Visit #' + v.no + ' · score ' + v.score + '%</div></div>' +
    '<div class="small muted mt-8">' +
    (p.score > v.score
      ? "▲ Condition appears to have progressed since this visit — relevant for clinical assessment."
      : "▼ Condition appears stable or improved relative to this visit.") +
    '</div>' +
    '</div>' +
    '</div>';
}

/* ---------------- screen: specialist ---------------- */

function specialistScreen(c) {
  var queue = specQueue();
  var avail = specialistsAvailable();

  c.innerHTML =
    pageHead("Specialist Dashboard", "Dr. Vikram Rao · Retina Clinic A",
      '<a class="btn btn-secondary" href="#/waiting">Waiting Room</a>') +
    '<div class="grid grid-3 mb-16">' +
    '<div class="stat-tile"><div class="label">Waiting consults</div><div class="value" style="color:var(--spec)">' + queue.length + '</div></div>' +
    '<div class="stat-tile"><div class="label">Direct consults</div><div class="value" style="color:var(--high)">' + queue.filter(function (p) { return p.directConsult; }).length + '</div></div>' +
    '<div class="stat-tile"><div class="label">Signed off</div><div class="value" style="color:var(--success)">' + D.patients.filter(function (p) { return p.status === "completed"; }).length + '</div></div>' +
    '</div>' +
    '<div class="card card-pad mb-16">' +
    '<h3 class="card-title">Specialist availability — affects direct HIGH-risk routing</h3>' +
    '<div class="grid grid-3">' +
    D.specialists.map(function (s) {
      return '<div class="card card-pad" style="background:var(--surface-2)">' +
        '<div class="flex align-center">' + avatar(s.name, "spec") +
        '<div class="grow"><strong>' + esc(s.name) + '</strong><div class="small muted">' + esc(s.clinic) + '</div>' +
        '<div class="small muted mt-8">' + s.modes.join(" · ") + '</div></div>' +
        '<button class="btn btn-sm ' + (s.available ? "btn-success" : "btn-secondary") + '" data-specavail="' + s.id + '">' + (s.available ? "Available" : "Unavailable") + '</button>' +
        '</div></div>';
    }).join("") +
    '</div>' +
    '<div class="small muted mt-8">' + (avail.length
      ? avail.length + " specialist(s) available — new HIGH-risk cases route directly here."
      : "No specialist available — new HIGH-risk cases route to the MBBS queue.") + '</div>' +
    '</div>' +
    '<div class="card card-pad">' +
    '<div class="wait-section-head"><span class="bar" style="background:#5b21b6"></span>' +
    '<h3 style="color:#5b21b6">Specialist waiting room</h3>' +
    '<span class="wait-count">' + queue.length + '</span></div>' +
    (queue.length
      ? '<div class="table-wrap"><table class="table"><thead><tr>' +
        '<th>Patient</th><th>Risk</th><th>Type</th><th>Reason</th><th>Referring</th><th>Waiting</th><th></th>' +
        '</tr></thead><tbody>' +
        queue.map(function (p) {
          var type = p.directConsult
            ? '<span class="pill pill-high">Direct' + (p.mode ? " · " + p.mode : "") + '</span>'
            : '<span class="pill pill-spec">Referral</span>';
          return '<tr class="row-link clickable-row" data-open="' + p.id + '">' +
            '<td><strong>' + esc(p.name) + '</strong><div class="small muted mono">' + esc(p.patientId) + '</div></td>' +
            '<td>' + riskPill(p.risk) + '</td>' +
            '<td>' + type + '</td>' +
            '<td>' + esc((p.referral || {}).reason || "—") + '</td>' +
            '<td>' + esc((p.referral || {}).byDoctor || "—") + '</td>' +
            '<td class="mono">' + p.waitMin + ' min</td>' +
            '<td><span class="btn btn-primary btn-sm">Open reading screen →</span></td>' +
            '</tr>';
        }).join("") +
        '</tbody></table></div>'
      : '<div class="empty">No consults in queue</div>') +
    '</div>';
  bindPatientRows(c);
  c.querySelectorAll("[data-specavail]").forEach(function (b) {
    b.addEventListener("click", function () {
      var sid = b.getAttribute("data-specavail");
      var s = D.spec(sid);
      s.available = !s.available;
      toast(s.name + " is now " + (s.available ? "available" : "unavailable"));
      render();
    });
  });
  c.querySelectorAll("[data-open]").forEach(function (r) {
    r.addEventListener("click", function () {
      navigate("#/reading/" + r.getAttribute("data-open"));
    });
  });
}

/* ---------------- screen: retinal reading (hero) ---------------- */

function readingScreen(c, seg) {
  var p = D.pat(seg[1]);
  var history = p.history || [];
  var tabs = history.map(function (v) {
    return '<button class="visit-tab" data-hvisit="' + v.no + '">Visit ' + v.no + '<span class="risk-mini">' + fmtDate(v.date) + ' · ' + v.risk + ' ' + v.score + '%</span></button>';
  }).join("") +
    '<button class="visit-tab active">Current<span class="risk-mini">Today · ' + p.risk + ' ' + p.score + '%</span></button>';
  var source = p.directConsult
    ? 'Direct consult · ' + (p.mode || "tele") + ' · by ' + esc((p.referral || {}).byDoctor || "AI Triage")
    : 'Referred by ' + esc((p.referral || {}).byDoctor || "MBBS doctor");

  c.innerHTML =
    pageHead(p.name + " — Retinal Reading", esc(p.patientId) + " · Visit #" + p.visitNo + " · " + source + " " + (p.mode ? modeTag(p) : ""),
      '<a class="btn btn-secondary" href="#/specialist">← Specialist queue</a>') +
    '<div class="grid" style="grid-template-columns:minmax(0,1fr) 400px;align-items:start">' +
    '<div>' +
    '<div class="card card-pad mb-16">' +
    '<div class="flex align-center mb-16"><h3 class="card-title" style="margin:0">Retinal image — right eye (OD)</h3>' +
    '<span class="small muted mono" style="margin-left:auto">Fundus camera · 45°</span></div>' +
    '<div class="img-stage" id="readStage" style="min-height:460px">' +
    '<div id="readSvg">' + fundusSVG(p.id + "-reading", p.risk, { overlay: App.overlay }) + '</div>' +
    '<div class="viewer-tools">' +
    '<button class="btn btn-sm" id="vtZoom">' + (App.zoomed ? "− Zoom out" : "+ Zoom") + '</button>' +
    '<button class="btn btn-sm" id="vtReset">Reset</button>' +
    '<button class="btn btn-sm" id="vtOverlay">' + (App.overlay ? "Hide AI overlay" : "Show AI overlay") + '</button>' +
    '</div>' +
    '<span class="img-label">Simulated fundus · AI triage support only</span>' +
    '</div>' +
    '</div>' +
    '<div class="card card-pad mb-16">' +
    '<h3 class="card-title">Previous visits</h3>' +
    '<div class="visit-strip mb-16">' + tabs + '</div>' +
    '<div id="histDetail"><div class="small muted">Click a previous visit to compare with current condition.</div></div>' +
    '</div>' +
    '</div>' +
    '<div>' +
    '<div class="card card-pad mb-16">' +
    '<h3 class="card-title">Patient</h3>' +
    '<div class="kv">' +
    '<dt>Name</dt><dd>' + esc(p.name) + '</dd>' +
    '<dt>Age</dt><dd>' + p.age + ' yrs</dd>' +
    '<dt>Patient ID</dt><dd class="mono">' + esc(p.patientId) + '</dd>' +
    '<dt>Condition</dt><dd>' + esc(p.condition) + '</dd>' +
    '<dt>' + (p.directConsult ? "Source" : "Referred by") + '</dt><dd>' + esc((p.referral || {}).byDoctor || "—") + '</dd>' +
    '<dt>Reason</dt><dd>' + esc((p.referral || {}).reason || "—") + '</dd>' +
    '</div>' +
    '</div>' +
    '<div class="card card-pad mb-16">' +
    '<h3 class="card-title">AI assessment</h3>' +
    '<div class="kv mb-8"><dt>Risk</dt><dd>' + riskPill(p.risk) + '</dd><dt>Score</dt><dd>' + scoreBadge(p.score) + '</dd></div>' +
    D.findingsFor(p).map(function (f) {
      return '<div class="finding"><div class="sev">' +
        (f.sev === "high" ? '<span class="pill pill-high">!</span>' : f.sev === "medium" ? '<span class="pill pill-medium">•</span>' : '<span class="pill pill-low">✓</span>') +
        '</div><div>' + esc(f.text) + '</div></div>';
    }).join("") +
    (p.biomarkers && p.biomarkers.length
      ? '<div class="mt-16"><h3 class="card-title">Biomarkers</h3><div class="flex flex-wrap">' +
        p.biomarkers.map(function (b) {
          return '<span class="score-badge" style="background:#eef2fb;color:#1c4fd6">' + esc(b.name) + ': ' + esc(b.count) + '</span>';
        }).join(" ") + '</div></div>'
      : "") +
    '</div>' +
    '<div class="card card-pad">' +
    '<h3 class="card-title">Specialist assessment</h3>' +
    '<div class="field"><label>Notes</label><textarea class="textarea" id="rdNotes" placeholder="Specialist assessment notes…"></textarea></div>' +
    '<div class="field"><label>Prescription</label><textarea class="textarea" id="rdRx" placeholder="Prescription…"></textarea></div>' +
    '<button class="btn btn-primary btn-lg btn-block" id="rdSign">Sign Off →</button>' +
    '</div>' +
    '</div>' +
    '</div>';

  /* image viewer interactions */
  var stage = c.querySelector("#readStage");
  var svgWrap = c.querySelector("#readSvg");
  function applyView() {
    var svgEl = svgWrap.querySelector("svg");
    if (!svgEl) return;
    if (App.zoomed) {
      svgEl.style.transformOrigin = "center center";
      svgEl.style.transform = "scale(1.7) translate(" + App.pan.x + "px," + App.pan.y + "px)";
      stage.classList.add("zoomed");
    } else {
      svgEl.style.transform = "";
      stage.classList.remove("zoomed");
      App.pan = { x: 0, y: 0 };
    }
  }
  c.querySelector("#vtZoom").addEventListener("click", function () {
    App.zoomed = !App.zoomed;
    applyView();
    this.textContent = App.zoomed ? "− Zoom out" : "+ Zoom";
  });
  c.querySelector("#vtReset").addEventListener("click", function () {
    App.zoomed = false; App.pan = { x: 0, y: 0 };
    applyView();
    c.querySelector("#vtZoom").textContent = "+ Zoom";
  });
  c.querySelector("#vtOverlay").addEventListener("click", function () {
    App.overlay = !App.overlay;
    c.querySelector("#readSvg").innerHTML = fundusSVG(p.id + "-reading", p.risk, { overlay: App.overlay });
    applyView();
    this.textContent = App.overlay ? "Hide AI overlay" : "Show AI overlay";
  });
  stage.addEventListener("mousedown", function (e) {
    if (!App.zoomed) return;
    App.dragging = { sx: e.clientX, sy: e.clientY, ox: App.pan.x, oy: App.pan.y };
    e.preventDefault();
  });
  if (!App.viewerBound) {
    App.viewerBound = true;
    document.addEventListener("mousemove", function (e) {
      if (!App.dragging) return;
      App.pan.x = App.dragging.ox + (e.clientX - App.dragging.sx) * 1.2;
      App.pan.y = App.dragging.oy + (e.clientY - App.dragging.sy) * 1.2;
      applyView();
    });
    document.addEventListener("mouseup", function () { App.dragging = null; });
  }

  /* history tabs */
  var hd = c.querySelector("#histDetail");
  c.querySelectorAll("[data-hvisit]").forEach(function (t) {
    t.addEventListener("click", function () {
      c.querySelectorAll("[data-hvisit]").forEach(function (x) { x.classList.remove("active"); });
      t.classList.add("active");
      var v = history.filter(function (h) { return h.no === parseInt(t.getAttribute("data-hvisit"), 10); })[0];
      if (!v) return;
      hd.innerHTML =
        '<div class="kv">' +
        '<dt>Date</dt><dd>' + fmtDate(v.date) + '</dd>' +
        '<dt>Risk</dt><dd>' + riskPill(v.risk) + ' ' + scoreBadge(v.score) + '</dd>' +
        '<dt>Notes</dt><dd>' + esc(v.notes) + '</dd>' +
        '<dt>Prescription</dt><dd>' + esc(v.rx) + '</dd>' +
        '<dt>By</dt><dd>' + esc(v.by) + '</dd></div>';
    });
  });

  c.querySelector("#rdSign").addEventListener("click", function () {
    if (!c.querySelector("#rdNotes").value.trim() && !c.querySelector("#rdRx").value.trim()) {
      toast("Add assessment notes or prescription before signing off");
      return;
    }
    App.pendingSign = {
      id: p.id,
      notes: c.querySelector("#rdNotes").value.trim(),
      rx: c.querySelector("#rdRx").value.trim()
    };
    navigate("#/signoff/" + p.id);
  });
}

/* ---------------- screen: sign-off ---------------- */

function signoffScreen(c, seg) {
  var p = D.pat(seg[1]);
  var draft = App.pendingSign || {};
  if (p.status === "completed") {
    c.innerHTML =
      pageHead("Visit Completed", p.name + " · " + p.patientId,
        '<a class="btn btn-secondary" href="#/specialist">← Specialist queue</a>') +
      '<div class="success-banner"><span class="big">✓</span><div>' +
      '<strong>Visit completed</strong><div>Prescription signed. Patient removed from the waiting room and returned to the <strong>nurse discharge desk</strong>.</div></div></div>' +
      '<div class="card card-pad mt-16"><h3 class="card-title">Signed record</h3>' +
      '<div class="kv">' +
      '<dt>Patient</dt><dd>' + esc(p.name) + ' · ' + esc(p.patientId) + '</dd>' +
      '<dt>Diagnosis / assessment</dt><dd>' + esc((p.history[p.history.length - 1] || {}).notes || "—") + '</dd>' +
      '<dt>Prescription</dt><dd>' + esc((p.history[p.history.length - 1] || {}).rx || "—") + '</dd>' +
      '<dt>Signed by</dt><dd>' + esc((p.history[p.history.length - 1] || {}).by || "—") + '</dd>' +
      '</div></div>' +
      '<div class="mt-16 flex"><a class="btn btn-primary" href="#/nurse">Go to Nurse / Discharge Desk</a>' +
      '<a class="btn btn-secondary" href="#/specialist">Back to Specialist Dashboard</a></div>';
    return;
  }

  c.innerHTML =
    pageHead("Prescription Sign-Off", p.name + " · " + p.patientId + " · Visit #" + p.visitNo,
      '<a class="btn btn-secondary" href="#/reading/' + p.id + '">← Edit</a>') +
    '<div class="grid grid-2">' +
    '<div class="card card-pad">' +
    '<h3 class="card-title">Review</h3>' +
    '<div class="kv">' +
    '<dt>Patient</dt><dd>' + esc(p.name) + ' · ' + p.age + ' yrs</dd>' +
    '<dt>Risk</dt><dd>' + riskPill(p.risk) + ' ' + scoreBadge(p.score) + '</dd>' +
    '<dt>Diagnosis / assessment</dt><dd>' + esc(draft.notes || "—") + '</dd>' +
    '<dt>Clinical notes</dt><dd>' + esc((p.referral || {}).reason || "—") + '</dd>' +
    '</div>' +
    '<div class="divider"></div>' +
    '<h3 class="card-title">Prescription</h3>' +
    '<div style="font-size:14px;line-height:1.7">' + esc(draft.rx || "—") + '</div>' +
    '<div class="mt-16"><span class="pill pill-spec">Specialist sign-off</span> <span class="small muted">Dr. Vikram Rao · Retina Clinic A</span></div>' +
    '</div>' +
    '<div class="card card-pad">' +
    '<h3 class="card-title">Sign off</h3>' +
    '<p class="small muted">Signing off completes the visit: the prescription becomes part of the patient record, the patient is removed from the waiting room, and the visit is returned to the <strong>nurse discharge desk</strong>.</p>' +
    '<button class="btn btn-success btn-lg btn-block" id="soSign">✍ Sign Off</button>' +
    '<div class="divider"></div>' +
    '<div class="small muted">Expected outcome</div>' +
    '<div class="finding"><div class="sev">✓</div><div>Visit completed</div></div>' +
    '<div class="finding"><div class="sev">✓</div><div>Prescription signed</div></div>' +
    '<div class="finding"><div class="sev">✓</div><div>Patient removed from waiting room</div></div>' +
    '<div class="finding"><div class="sev">✓</div><div>Returned to nurse for discharge</div></div>' +
    '<div class="finding"><div class="sev">✓</div><div>Visit archived for future comparison</div></div>' +
    '</div>' +
    '</div>';

  c.querySelector("#soSign").addEventListener("click", function () {
    p.history.push({
      no: p.visitNo,
      date: new Date().toISOString().slice(0, 10),
      risk: p.risk, score: p.score,
      notes: draft.notes || "Specialist assessment completed.",
      rx: draft.rx || "No prescription recorded.",
      by: "Dr. Vikram Rao"
    });
    p.visitNo++;
    p.status = "completed";
    App.pendingSign = null;
    toast("Visit completed — patient returned to Nurse for discharge");
    render();
  });
}

/* ---------------- screen: admin ---------------- */

function adminScreen(c) {
  var active = activePatients();
  var completed = dischargeQueue();
  var avail = specialistsAvailable();

  c.innerHTML =
    pageHead("Administration — Waiting-Room Management", "Monitor queues, routing, specialist availability and staff",
      '<a class="btn btn-secondary" href="#/waiting">Waiting Room</a>') +
    '<div class="grid grid-4 mb-16">' +
    '<div class="stat-tile"><div class="label">Active patients</div><div class="value">' + active.length + '</div></div>' +
    '<div class="stat-tile"><div class="label">MBBS / Specialist / Nurse</div><div class="value mono" style="font-size:18px">' + mbbsQueue().length + ' · ' + specQueue().length + ' · ' + nurseQueue().length + '</div></div>' +
    '<div class="stat-tile"><div class="label">Awaiting discharge</div><div class="value" style="color:var(--success)">' + completed.length + '</div></div>' +
    '<div class="stat-tile"><div class="label">Specialists available</div><div class="value" style="color:var(--spec)">' + avail.length + '/' + D.specialists.length + '</div></div>' +
    '</div>' +
    '<div class="card card-pad mb-16">' +
    '<h3 class="card-title">Specialist availability — controls direct HIGH-risk routing</h3>' +
    '<div class="grid grid-3">' +
    D.specialists.map(function (s) {
      return '<div class="card card-pad" style="background:var(--surface-2)">' +
        '<div class="flex align-center">' + avatar(s.name, "spec") +
        '<div class="grow"><strong>' + esc(s.name) + '</strong><div class="small muted">' + esc(s.clinic) + '</div></div>' +
        '<button class="btn btn-sm ' + (s.available ? "btn-success" : "btn-secondary") + '" data-specavail="' + s.id + '">' + (s.available ? "Available" : "Unavailable") + '</button>' +
        '</div></div>';
    }).join("") +
    '</div></div>' +
    '<div class="grid grid-2 mb-16">' +
    '<div class="card card-pad"><h3 class="card-title">Doctors</h3>' +
    D.doctors.map(function (d) {
      return '<div class="patient-row" style="cursor:default">' + avatar(d.name, "mbbs") +
        '<div class="who"><div class="name">' + esc(d.name) + '</div><div class="meta">' + d.role + ' · ' + d.shift + ' shift</div></div>' +
        '<div><span class="pill pill-ok">Active</span></div></div>';
    }).join("") +
    '</div>' +
    '<div class="card card-pad"><h3 class="card-title">Nurses</h3>' +
    D.nurses.map(function (n) {
      return '<div class="patient-row" style="cursor:default">' + avatar(n.name, "nurse") +
        '<div class="who"><div class="name">' + esc(n.name) + '</div><div class="meta">' + n.station + '</div></div>' +
        '<div><span class="pill pill-ok">Active</span></div></div>';
    }).join("") +
    '</div>' +
    '</div>' +
    '<div class="card card-pad">' +
    '<h3 class="card-title">All active patients — routing monitor</h3>' +
    '<table class="table"><thead><tr>' +
    '<th>Patient</th><th>Risk</th><th>Score</th><th>Routed to</th><th>Assigned</th><th>Status</th><th>Queue</th><th></th>' +
    '</tr></thead><tbody>' +
    D.byRisk(active).map(function (p) {
      return '<tr class="row-link clickable-row" data-open="' + p.id + '">' +
        '<td><strong>' + esc(p.name) + '</strong><div class="small muted mono">' + esc(p.patientId) + '</div></td>' +
        '<td>' + riskPill(p.risk) + '</td>' +
        '<td class="mono">' + p.score + '%</td>' +
        '<td>' + routeTag(p) + '</td>' +
        '<td>' + assignee(p) + '</td>' +
        '<td>' + statusPill(p) + '</td>' +
        '<td class="mono">' + p.waitMin + ' min</td>' +
        '<td><span class="btn btn-secondary btn-sm">Open</span></td>' +
        '</tr>';
    }).join("") +
    '</tbody></table>' +
    '</div>';
  bindPatientRows(c);
  c.querySelectorAll("[data-specavail]").forEach(function (b) {
    b.addEventListener("click", function () {
      var sid = b.getAttribute("data-specavail");
      var s = D.spec(sid);
      s.available = !s.available;
      if (s.available) {
        var rerouted = D.patients.filter(function (p) {
          return p.risk === "HIGH" && p.routedTo === "mbbs" && p.status === "queued";
        });
        rerouted.forEach(function (p) { routePatient(p); });
        if (rerouted.length) toast(rerouted.length + " queued HIGH-risk case(s) re-routed to Specialist");
        else toast(s.name + " is now available");
      } else {
        toast(s.name + " is now unavailable");
      }
      render();
    });
  });
  c.querySelectorAll("[data-open]").forEach(function (r) {
    r.addEventListener("click", function () {
      var id = r.getAttribute("data-open");
      var p = D.pat(id);
      if (!p) return;
      openPatient(p);
      if (p.routedTo === "specialist" && p.status !== "completed") navigate("#/reading/" + id);
      else navigate("#/patient/" + id);
    });
  });
}

/* ---------------- boot ---------------- */

function boot() {
  App.role = loadRole();
  var body = document.getElementById("app");
  var r = parseRoute(location.hash);
  if (r.key !== "" && r.key !== "/" && App.role) {
    body.innerHTML = topbar(App.role) + '<div class="content" id="content"></div>';
  }
  render();
}

document.addEventListener("DOMContentLoaded", boot);