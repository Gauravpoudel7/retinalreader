# WORKFLOW.md — Demo Script

A 5-minute stakeholder walkthrough of the complete patient journey. Open `index.html` in a browser.

---

## 1. Entry — role selection (15s)

- Land on **Retinal Care Platform — Who are you?**
- Point out the four roles: Nurse/Intake, MBBS Doctor, Specialist, Admin.
- Click **Flowchart** link first (optional): shows the full system in one diagram — INTAKE → AI TRIAGE → WAITING ROOMS (risk-sorted) → MBBS → SPECIALIST → COMPLETION → NURSE DISCHARGE DESK, with the admin band below.
- Return and enter as **Nurse / Intake**.

## 2. Nurse — intake (30s)

- Dashboard shows: Registered today, Nurse queue (LOW risk), Awaiting discharge, High-risk flagged.
- Click **+ New Patient**.
- Fill: name (e.g. *Rohit Kumar*), age (e.g. *60*), reason for visit.
- Click the **upload zone** → simulated fundus image appears.
- Click **Analyze Retinal Image**.

## 3. AI analysis (20s)

- Result screen: retinal image + AI overlay, risk level, risk score, findings, biomarkers.
- The routing card shows where this patient goes next (MBBS queue / direct specialist / nurse queue).
- Emphasize: *simulated triage support — clinicians make final decisions.*
- Click **Send** → patient joins the correct waiting room.

## 4. Waiting rooms — master overview (30s)

- Every care level has its **own waiting room**: MBBS queue (HIGH first, then MEDIUM), Specialist queue (referrals + direct consults) and Nurse queue (LOW risk).
- The **Waiting Room** screen shows all three queues side by side with each patient's routing, plus a banner showing which specialists are available for direct consults.
- Switch role (top bar) → **MBBS Doctor**.

## 5. MBBS — patient panel (45s)

- Dashboard: queue tiles + waiting room list. HIGH-risk cases are served before MEDIUM.
- Open **Arjun Nair** (HIGH, 95%).
- Patient panel: information, current retinal image, AI assessment, biomarkers.
- **Previous visits**: click *Visit 2* → detail card; open full visit view (`#/visit/p1/2`) to compare.
- Enter clinical notes + prescription → **Complete / Prescribe** → visit completed — note the patient now appears on the **Nurse discharge desk**.
- Now open **Sunita Verma** (HIGH, 91%): review, then **Refer to Specialist** → modal → confirm referral.
- Toast confirms: added to specialist waiting room.

## 6. Specialist — retinal reading (60s) — hero screen

- Switch role → **Specialist**.
- Specialist queue shows the referral (Sunita Verma, with reason + referring doctor) **and** direct consult (Mohan Gupta — routed straight here, WhatsApp, no MBBS visit).
- Open **Sunita Verma** → retinal reading screen:
  - Large fundus image dominates; try **+ Zoom** (pan by dragging), **Reset**, **Hide/Show AI overlay**.
  - Right panel: patient, AI assessment, biomarkers.
  - Previous visits strip: click a visit to compare inline.
- Enter assessment notes + prescription → **Sign Off →**.

## 7. Sign-off → returns to nurse (20s)

- Review screen: patient, assessment, prescription, signer.
- Click **✍ Sign Off** → **Visit Completed** banner; the patient drops out of the specialist queue.
- Switch to **Nurse** → the completed visit now sits on the **Discharge desk** → **Discharge all returned patients** → visit archived.

## 8. Admin (optional, 20s)

- Switch role → **Admin**: stats, doctors/specialists status, full patient status monitor with click-through.
- Show the **Specialist availability** toggle — turn a specialist off → a new HIGH-risk case now routes to MBBS instead.

---

## Suggested talking points

- **Triage speed**: AI scores every image instantly; HIGH-risk patients are never buried in a queue.
- **Multi-queue routing**: every care level has its own waiting room — HIGH cases go to MBBS first (or *direct to a specialist* when one is available, in-person/Teams/WhatsApp), LOW cases to the nurse.
- **Decision support, not automation**: every screen shows findings + history; clinicians decide.
- **Continuity**: previous visits are one click away at every decision point.
- **Routing**: every care level has its own waiting room; HIGH → MBBS first (or direct to a specialist when available), MEDIUM → MBBS after HIGH, LOW → nurse queue; completed visits return to the nurse for discharge.
- **Loop closure**: completed visits return to the Nurse discharge desk — nothing leaves the system without a final discharge.
- **Blueprint**: flowchart is the source of truth; wireframe maps 1:1 to it.