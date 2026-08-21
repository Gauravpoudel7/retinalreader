/* ============================================================
   Demo data — all patients, doctors, specialists, visits are
   fictional and generated for wireframe demonstration only.
   ============================================================ */

var D = {};

D.doctors = [
  { id: "d1", name: "Dr. Anjali Sharma", role: "MBBS Doctor", shift: "Morning" },
  { id: "d2", name: "Dr. Rohan Mehta",   role: "MBBS Doctor", shift: "Morning" },
  { id: "d3", name: "Dr. Kavita Iyer",   role: "MBBS Doctor", shift: "Evening" }
];

D.specialists = [
  { id: "s1", name: "Dr. Vikram Rao",     role: "Retina Specialist",   clinic: "Retina Clinic A", available: true,  modes: ["In-person", "Teams", "WhatsApp"] },
  { id: "s2", name: "Dr. Meera Nair",     role: "Vitreo-Retinal Spec.", clinic: "Retina Clinic B", available: false, modes: ["In-person", "Teams"] },
  { id: "s3", name: "Dr. Arjun Pillai",   role: "Retina Specialist",   clinic: "Retina Clinic A", available: true,  modes: ["In-person", "WhatsApp"] }
];

D.nurses = [
  { id: "n1", name: "Priya Nair", station: "Intake Desk 1" },
  { id: "n2", name: "Sneha Kulkarni", station: "Intake Desk 2" }
];

/* Status values:
   new          — freshly analyzed, waiting for MBBS
   with-mbbs    — opened by MBBS doctor (in review)
   referred     — waiting in specialist queue
   with-spec    — opened by specialist (in review)
   completed    — visit finished
*/
D.patients = [
  {
    id: "p1", name: "Arjun Nair", age: 62, patientId: "RP-10241", contact: "+91 98450 22130",
    condition: "Type 2 Diabetes (12 yrs), Hypertension",
    risk: "HIGH", score: 95, waitMin: 12, status: "queued", routedTo: "mbbs", assignedTo: "d1",
    requestedSpec: false, visitNo: 4,
    findings: [
      { text: "Moderate non-proliferative diabetic retinopathy signs in both eyes", sev: "high" },
      { text: "Microaneurysms cluster — superior temporal quadrant, right eye", sev: "high" },
      { text: "Small intraretinal hemorrhages near fovea, left eye", sev: "medium" },
      { text: "Hard exudates along arcade — suggestive of macular involvement", sev: "medium" }
    ],
    biomarkers: [
      { name: "Microaneurysms", count: 14 },
      { name: "Intraretinal hemorrhages", count: 6 },
      { name: "Hard exudates", count: 11 },
      { name: "Vessel tortuosity", count: 3 }
    ],
    history: [
      { no: 1, date: "2025-02-14", risk: "LOW", score: 32, notes: "Mild background changes. Advised annual review and HbA1c control.", rx: "No pharmacological intervention. Lifestyle counselling provided.", by: "Dr. Anjali Sharma" },
      { no: 2, date: "2025-08-03", risk: "MEDIUM", score: 58, notes: "Progression noted in right eye. Referred for dilated fundus exam.", rx: "Systemic BP optimisation advised. Review in 6 months.", by: "Dr. Rohan Mehta" },
      { no: 3, date: "2026-01-19", risk: "MEDIUM", score: 71, notes: "Further progression. Fovea not yet involved. Close follow-up.", rx: "HbA1c target < 7%. Review in 3 months.", by: "Dr. Anjali Sharma" }
    ],
    aiModel: "RetinaNet v2 · triage model · demo"
  },
  {
    id: "p2", name: "Sunita Verma", age: 55, patientId: "RP-10242", contact: "+91 98220 44871",
    condition: "Sudden vision loss (right eye)",
    risk: "HIGH", score: 91, waitMin: 8, status: "queued", routedTo: "mbbs", assignedTo: "d2",
    requestedSpec: false, visitNo: 1,
    findings: [
      { text: "Macular edema with central thickening — right eye", sev: "high" },
      { text: "Hard exudates in macular star pattern", sev: "high" },
      { text: "Blot hemorrhages — posterior pole", sev: "high" }
    ],
    biomarkers: [
      { name: "Macular edema index", count: 0.82 },
      { name: "Blot hemorrhages", count: 9 },
      { name: "Exudate area", count: 4.6 }
    ],
    history: [],
    aiModel: "RetinaNet v2 · triage model · demo"
  },
  {
    id: "p3", name: "Mohan Gupta", age: 70, patientId: "RP-10243", contact: "+91 98330 11590",
    condition: "Glaucoma suspect, poor vision",
    risk: "HIGH", score: 88, waitMin: 21, status: "queued", routedTo: "specialist", assignedTo: "s3",
    directConsult: true, mode: "WhatsApp",
    referral: { reason: "Direct HIGH-risk consult — specialist available (teleconsult)", byDoctor: "AI Triage · direct routing", date: "Today 09:05", priority: "High" },
    requestedSpec: false, visitNo: 2,
    findings: [
      { text: "Optic disc cupping increase vs baseline — cup/disc 0.7", sev: "high" },
      { text: "Peripapillary atrophy — superior sector", sev: "medium" },
      { text: "Retinal nerve fibre layer thinning suggested", sev: "high" }
    ],
    biomarkers: [
      { name: "Cup-to-disc ratio", count: 0.72 },
      { name: "RNFL thinning score", count: 0.61 },
      { name: "Vessel density (macular)", count: 0.44 }
    ],
    history: [
      { no: 1, date: "2025-11-22", risk: "MEDIUM", score: 64, notes: "Ocular hypertension. IOP 24 mmHg. Started travoprost.", rx: "Travoprost 0.004% OD at night. Review in 3 months.", by: "Dr. Kavita Iyer" }
    ],
    aiModel: "RetinaNet v2 · triage model · demo"
  },
  {
    id: "p4", name: "Farah Khan", age: 47, patientId: "RP-10244", contact: "+91 90040 77112",
    condition: "Diabetic retinopathy screening",
    risk: "MEDIUM", score: 72, waitMin: 14, status: "queued", routedTo: "mbbs", assignedTo: "d2",
    requestedSpec: false, visitNo: 3,
    findings: [
      { text: "Mild NPDR — scattered microaneurysms", sev: "medium" },
      { text: "Few dot hemorrhages, nasal retina", sev: "medium" }
    ],
    biomarkers: [
      { name: "Microaneurysms", count: 5 },
      { name: "Dot hemorrhages", count: 3 },
      { name: "Cotton-wool spots", count: 1 }
    ],
    history: [
      { no: 1, date: "2024-09-10", risk: "LOW", score: 21, notes: "No diabetic retinopathy. Annual screening advised.", rx: "None.", by: "Dr. Rohan Mehta" },
      { no: 2, date: "2025-10-05", risk: "MEDIUM", score: 55, notes: "Mild NPDR detected. Glycaemic control discussed.", rx: "Metformin 500 mg BD (continuation). Review in 6 months.", by: "Dr. Anjali Sharma" }
    ],
    aiModel: "RetinaNet v2 · triage model · demo"
  },
  {
id: "p5", name: "Rajesh Pillai", age: 58, patientId: "RP-10245", contact: "+91 98110 88234",
    condition: "Wet AMD suspicion (left eye)",
    risk: "MEDIUM", score: 68, waitMin: 6, status: "queued", routedTo: "specialist", assignedTo: "s2",
    referral: { reason: "Suspect neovascular AMD — specialist review for anti-VEGF assessment", byDoctor: "Dr. Rohan Mehta", date: "Today 10:42", priority: "High" },
    requestedSpec: true, visitNo: 2,
    findings: [
      { text: "Drusen clusters — central macula, left eye", sev: "medium" },
      { text: "Possible subretinal fluid — needs OCT confirmation", sev: "high" },
      { text: "Pigmentary changes at RPE layer", sev: "medium" }
    ],
    biomarkers: [
      { name: "Drusen area", count: 5.1 },
      { name: "Subretinal fluid probability", count: 0.58 },
      { name: "Geographic atrophy risk", count: 0.31 }
    ],
    history: [
      { no: 1, date: "2025-06-28", risk: "LOW", score: 29, notes: "Small hard drusen. No active disease. Annual review.", rx: "None.", by: "Dr. Kavita Iyer" }
    ],
    aiModel: "RetinaNet v2 · triage model · demo"
  },
  {
id: "p6", name: "Geeta Desai", age: 51, patientId: "RP-10246", contact: "+91 97690 33921",
    condition: "Retinal vein occlusion follow-up (right eye)",
    risk: "MEDIUM", score: 66, waitMin: 18, status: "queued", routedTo: "specialist", assignedTo: "s1",
    referral: { reason: "CRVO follow-up — review for persistent macular edema", byDoctor: "Dr. Anjali Sharma", date: "Today 09:15", priority: "Medium" },
    requestedSpec: false, visitNo: 3,
    findings: [
      { text: "Resolving retinal hemorrhages along arcades", sev: "medium" },
      { text: "Cystoid changes suggested at macula", sev: "medium" },
      { text: "Collateral vessels forming — optic disc", sev: "low" }
    ],
    biomarkers: [
      { name: "Macular edema index", count: 0.47 },
      { name: "Hemorrhage area", count: 2.2 },
      { name: "Collateral vessel score", count: 1.6 }
    ],
    history: [
      { no: 1, date: "2025-04-02", risk: "HIGH", score: 82, notes: "Acute CRVO right eye. Referred for immediate specialist review.", rx: "Aspirin 75 mg OD. Urgent retinal review.", by: "Dr. Anjali Sharma" },
      { no: 2, date: "2025-07-11", risk: "MEDIUM", score: 63, notes: "Post anti-VEGF, edema improved. Continue follow-up.", rx: "Ranibizumab cycle (completed 3 doses).", by: "Dr. Meera Nair" }
    ],
    aiModel: "RetinaNet v2 · triage model · demo"
  },
  {
    id: "p7", name: "Kiran Joshi", age: 38, patientId: "RP-10247", contact: "+91 99870 66410",
    condition: "Routine diabetic screening",
    risk: "LOW", score: 25, waitMin: 20, status: "queued", routedTo: "nurse", assignedTo: "n1",
    requestedSpec: false, visitNo: 1,
    findings: [
      { text: "No diabetic retinopathy detected", sev: "low" },
      { text: "Mild dry eye pattern noted", sev: "low" }
    ],
    biomarkers: [
      { name: "Microaneurysms", count: 0 },
      { name: "Hemorrhages", count: 0 },
      { name: "Exudates", count: 0 }
    ],
    history: [],
    aiModel: "RetinaNet v2 · triage model · demo"
  },
  {
    id: "p8", name: "Lakshmi Iyer", age: 66, patientId: "RP-10248", contact: "+91 94000 55718",
    condition: "Cataract + glaucoma screening",
    risk: "LOW", score: 18, waitMin: 10, status: "queued", routedTo: "nurse", assignedTo: "n2",
    requestedSpec: false, visitNo: 2,
    findings: [
      { text: "Minimal age-related changes", sev: "low" },
      { text: "Mild nerve fibre layer thinning — non-progressive", sev: "low" }
    ],
    biomarkers: [
      { name: "Cup-to-disc ratio", count: 0.48 },
      { name: "RNFL thinning score", count: 0.22 }
    ],
    history: [
      { no: 1, date: "2024-12-18", risk: "LOW", score: 22, notes: "Normal fundus for age. Routine screening.", rx: "None.", by: "Dr. Kavita Iyer" }
    ],
    aiModel: "RetinaNet v2 · triage model · demo"
  }
];

D.seed = {
  id: "p9", name: "", age: "", patientId: "RP-10249", contact: "",
  condition: "", risk: null, score: null, waitMin: 0, status: "queued", routedTo: null, assignedTo: "n1",
  requestedSpec: false, visitNo: 1, findings: [], biomarkers: [], history: [], aiModel: "RetinaNet v2 · triage model · demo",
  isNew: true
};

D.riskOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
D.riskOf = function (p) { return p.risk || "LOW"; };
D.byRisk = function (list) {
  return list.slice().sort(function (a, b) {
    var r = D.riskOrder[D.riskOf(a)] - D.riskOrder[D.riskOf(b)];
    if (r !== 0) return r;
    return (b.score || 0) - (a.score || 0);
  });
};
D.pat = function (id) {
  for (var i = 0; i < D.patients.length; i++) if (D.patients[i].id === id) return D.patients[i];
  return null;
};
D.doc = function (id) { for (var i = 0; i < D.doctors.length; i++) if (D.doctors[i].id === id) return D.doctors[i]; return null; };
D.spec = function (id) { for (var i = 0; i < D.specialists.length; i++) if (D.specialists[i].id === id) return D.specialists[i]; return null; };
D.nurse = function (id) { for (var i = 0; i < D.nurses.length; i++) if (D.nurses[i].id === id) return D.nurses[i]; return null; };
D.findingsFor = function (p) {
  if (p.findings && p.findings.length) return p.findings;
  return [
    { text: "No significant retinal abnormality detected", sev: "low" },
    { text: "Fundus within normal limits for age", sev: "low" }
  ];
};