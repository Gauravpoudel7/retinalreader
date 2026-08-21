# WORKFLOW.md — Demo Script

A 5-minute stakeholder walkthrough of the complete patient journey. Open `index.html` in a browser.

---

## 1. Entry — role selection (15s)

- Land on **Retinal Care Platform — Who are you?**
- Point out the four roles: Nurse/Intake, MBBS Doctor, Specialist, Admin.
- Click **Flowchart** link first (optional): shows the full system in one diagram — INTAKE → AI TRIAGE → WAITING ROOMS (risk-sorted) → MBBS → SPECIALIST → COMPLETION, with the admin band below.
- Return and enter as **Nurse / Intake**.

## 2. Nurse — intake (30s)

- Dashboard shows: Nurse queue (LOW risk), Awaiting MBBS, High-risk flagged, Completed today — no discharge desk (the nurse never discharges).
- Click **+ New Patient**.
- Fill: name (e.g. *Rohit Kumar*), age (e.g. *60*), reason for visit.
- Note the new **"Patient requested specialist consultation"** checkbox — tick it to demo a patient who asks for a specialist.
- Click the **upload zone** → simulated fundus image appears.
- Click **Analyze Retinal Image**.

## 3. AI analysis (20s)

- Result screen: retinal image + AI overlay, risk level, risk score, findings, biomarkers.
- The routing card shows where this patient goes next (MBBS queue / direct specialist / nurse queue).
- Emphasize: *simulated triage support — clinicians make final decisions.*
- Click **Send** → patient joins the correct waiting room.

## 4. Waiting rooms — master overview (30s)

- Every care level has its **own waiting room**: MBBS queue (HIGH first, then MEDIUM), Specialist queue (HIGH served first — direct consults, referrals and patient requests) and Nurse queue (LOW risk, routed from here).
- The **Waiting Room** screen shows all three queues side by side with each patient's routing, plus a banner showing which specialists are available for direct consults.
- Switch role (top bar) → **MBBS Doctor**.

## 5. MBBS — patient panel (45s)

- Dashboard shows **only the patient list with their data** — no stat tiles, no referral/completion counters.
- Open **Arjun Nair** (HIGH, 95%).
- Patient panel: information, **AI assessment + biomarkers** (no raw retinal image — that's reserved for the specialist's reading screen).
- **Previous visits**: click *Visit 2* → detail card; open full visit view (`#/visit/p1/2`) to compare.
- Enter clinical notes + prescription → **Complete / Prescribe — Discharge** → visit completed and **discharged by the doctor**.
- Now open **Sunita Verma** (HIGH, 91%): review, then **Refer to Specialist** → modal → confirm referral.
- If the patient requested a specialist, an extra button **"Send directly to Specialist (patient requested)"** appears — sends MEDIUM/LOW straight to the specialist queue.
- Toast confirms: added to specialist waiting room.

## 6. Specialist — retinal reading (60s) — hero screen

- Switch role → **Specialist**.
- Specialist dashboard shows **only the waiting room** (no stats, no availability panel) — queue is sorted **HIGH risk first**, then MEDIUM/LOW.
- The queue shows the referral (Sunita Verma, with reason + referring doctor), the direct consult (Mohan Gupta — routed straight here, WhatsApp, no MBBS visit) and any patient-requested consults.
- Open **Sunita Verma** → retinal reading screen:
  - Large fundus image dominates; try **+ Zoom** (pan by dragging), **Reset**, **Hide/Show AI overlay**.
  - Right panel: patient, AI assessment, biomarkers.
  - Previous visits strip: click a visit to compare inline.
- Enter assessment notes + prescription → **Sign Off — Discharge**.

## 7. Sign-off → discharge (20s)

- Review screen: patient, assessment, prescription, signer.
- Click **✍ Sign Off — Discharge** → **Visit Completed** banner; the patient drops out of the specialist queue — **discharged by the doctor** and archived.

## 8. Admin (optional, 20s)

- Switch role → **Admin**: stats, doctors/specialists status, full patient status monitor with click-through.
- Show the **Specialist availability** toggle — turn a specialist off → a new HIGH-risk case now routes to MBBS instead.

---

## Suggested talking points

- **Triage speed**: AI scores every image instantly; HIGH-risk patients are never buried in a queue.
- **Nurse routing, not discharge**: the nurse reviews LOW-risk cases and routes them — MEDIUM/LOW → MBBS, HIGH → Specialist; discharge happens only at the doctor's sign-off.
- **Patient choice**: a patient who requests a specialist can be sent directly by the nurse or the MBBS doctor — HIGH cases in the specialist queue are always served first.
- **Multi-queue routing**: every care level has its own waiting room — HIGH cases go to MBBS first (or *direct to a specialist* when one is available, in-person/Teams/WhatsApp), LOW cases to the nurse.
- **Decision support, not automation**: every screen shows findings + history; clinicians decide.
- **Continuity**: previous visits are one click away at every decision point.
- **Clean clinical views**: MBBS sees the AI response and biomarkers — not the raw image; specialist dashboards carry no extra numbers.
- **Blueprint**: flowchart is the source of truth; wireframe maps 1:1 to it.
