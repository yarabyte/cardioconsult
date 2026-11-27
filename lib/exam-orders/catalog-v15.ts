/** Catalogue V15 — bilans d’examens complémentaires (version figée du prototype client). */

export const EXAM_ORDER_CATALOG_VERSION = "v15.0.0" as const;

export const EXAM_ORDER_GROUPS = [
  "Cardiologie",
  "Infectiologie",
  "Endocrinologie",
  "HTA secondaire",
  "Autres",
] as const;

export type ExamOrderGroup = (typeof EXAM_ORDER_GROUPS)[number];

export type ExamOrderItem = {
  id: string;
  label: string;
  /** Indication / remarque optionnelle (items optionnels). */
  hint?: string;
};

export type ExamOrderProtocol = {
  id: string;
  group: ExamOrderGroup;
  label: string;
  description: string;
  core: ExamOrderItem[];
  optional: ExamOrderItem[];
  /** Flags de sécurité documentaires (pas de décision automatique). */
  flags: {
    dynamicTest?: boolean;
    endocarditisPrecaution?: boolean;
    noAutoDrugStop?: boolean;
    emptyCoreByDesign?: boolean;
  };
};

export const EXAM_ORDER_PROTOCOLS: readonly ExamOrderProtocol[] = [
  {
    id: "standard",
    group: "Cardiologie",
    label: "Biologie standard",
    description:
      "Bilan initial ciblé ; les examens inflammatoires, lipidiques ou de coagulation dépendent du motif.",
    core: [
      { id: "nfs", label: "NFS–plaquettes" },
      { id: "na", label: "Sodium" },
      { id: "k", label: "Potassium" },
      { id: "creat", label: "Créatinine + DFG estimé" },
      { id: "gly", label: "Glycémie" },
    ],
    optional: [
      { id: "urea", label: "Urée", hint: "Altération rénale, déshydratation ou hospitalisation" },
      { id: "cl", label: "Chlorures", hint: "Trouble hydro-électrolytique" },
      { id: "hco3", label: "Bicarbonates", hint: "Trouble acido-basique" },
      { id: "crp", label: "CRP", hint: "Suspicion inflammatoire/infectieuse" },
      { id: "lipid", label: "Bilan lipidique complet", hint: "Risque cardiovasculaire" },
      {
        id: "coag",
        label: "TP/INR et TCA",
        hint: "Indication particulière : hémostase, AVK, procédure",
      },
    ],
    flags: {},
  },
  {
    id: "sca",
    group: "Cardiologie",
    label: "Cardiopathie ischémique — urgence",
    description:
      "Suspicion de SCA : orientation urgente. ECG 12 dérivations immédiatement ; la biologie ne doit pas retarder une reperfusion indiquée. Utiliser le protocole local de troponine hs 0 h/1 h OU 0 h/2 h selon le dosage.",
    core: [
      { id: "ecg12", label: "ECG 12 dérivations immédiat (hors biologie)" },
      { id: "trop0", label: "Troponine ultrasensible — prélèvement H0" },
      {
        id: "tropserial",
        label: "Troponine ultrasensible — contrôle selon algorithme local validé (H1 ou H2)",
      },
      { id: "nfs", label: "NFS–plaquettes" },
      { id: "na", label: "Sodium" },
      { id: "k", label: "Potassium" },
      { id: "creat", label: "Créatinine + DFG estimé" },
      { id: "gly", label: "Glycémie" },
    ],
    optional: [
      { id: "mg", label: "Magnésémie", hint: "Troubles du rythme ou désordres ioniques" },
      { id: "coag", label: "TP/INR et TCA", hint: "Anticoagulants, saignement, geste programmé" },
      { id: "hba1c", label: "HbA1c", hint: "Évaluation du risque métabolique" },
      {
        id: "lipid",
        label: "Bilan lipidique complet",
        hint: "Prévention secondaire, dès la phase initiale",
      },
      { id: "crp", label: "CRP", hint: "Diagnostic différentiel selon contexte" },
    ],
    flags: {},
  },
  {
    id: "cmh",
    group: "Cardiologie",
    label: "Bilan biologique CMH",
    description:
      "Orientation étiologique de cardiomyopathie hypertrophique : biologie générale puis recherche ciblée des phénocopies ; génétique après évaluation spécialisée.",
    core: [
      { id: "creat", label: "Créatinine + DFG estimé" },
      { id: "na", label: "Sodium" },
      { id: "k", label: "Potassium" },
      { id: "liver", label: "Bilan hépatique (ASAT/ALAT, PAL, GGT, bilirubine)" },
      { id: "ntprobnp", label: "NT-proBNP" },
      { id: "ck", label: "CK" },
      { id: "troponin", label: "Troponine hs — selon contexte" },
      { id: "proteinuria", label: "Protéinurie / rapport albumine-créatinine urinaire" },
    ],
    optional: [
      { id: "tsh", label: "TSH", hint: "Thyrotoxicose ou suspicion de cause secondaire" },
      {
        id: "ferritin",
        label: "Ferritine + coefficient de saturation de la transferrine",
        hint: "Maladie de surcharge / contexte",
      },
      { id: "sif", label: "Immunofixation sérique", hint: "Suspicion d’amylose AL" },
      { id: "uif", label: "Immunofixation urinaire", hint: "Suspicion d’amylose AL" },
      {
        id: "sflc",
        label: "Chaînes légères libres sériques κ/λ avec ratio",
        hint: "Suspicion d’amylose AL",
      },
      {
        id: "fabry",
        label: "Activité alpha-galactosidase A / lyso-Gb3",
        hint: "Suspicion maladie de Fabry, interprétation selon sexe",
      },
      {
        id: "genetic",
        label: "Avis génétique / panel cardiomyopathie (non biologique de routine)",
        hint: "Après conseil et consentement appropriés",
      },
    ],
    flags: {},
  },
  {
    id: "cmd",
    group: "Cardiologie",
    label: "Bilan biologique CMD",
    description:
      "Recherche de facteurs aggravants et étiologies accessibles : métaboliques, thyroïdiennes, martiales, rénales, myocardiques.",
    core: [
      { id: "nfs", label: "NFS–plaquettes" },
      { id: "creat", label: "Créatinine + DFG estimé" },
      { id: "na", label: "Sodium" },
      { id: "k", label: "Potassium" },
      { id: "calcium", label: "Calcémie" },
      { id: "phosphate", label: "Phosphatémie" },
      { id: "liver", label: "Bilan hépatique" },
      { id: "tsh", label: "TSH" },
      { id: "ferritin", label: "Ferritine" },
      { id: "tsat", label: "Fer / transferrine et saturation (TSAT)" },
      { id: "ntprobnp", label: "NT-proBNP" },
    ],
    optional: [
      {
        id: "troponin",
        label: "Troponine hs",
        hint: "Phase aiguë ou suspicion de lésion myocardique",
      },
      { id: "ck", label: "CK", hint: "Suspicion myopathie associée" },
      { id: "hba1c", label: "HbA1c", hint: "Diabète / métabolisme" },
      { id: "crp", label: "CRP", hint: "Contexte inflammatoire" },
      {
        id: "autoimmune",
        label: "Bilan auto-immun ciblé",
        hint: "Phénotype ou contexte évocateur",
      },
      {
        id: "serology",
        label: "Sérologies infectieuses ciblées",
        hint: "Exposition/épidémiologie, pas systématique",
      },
      {
        id: "genetic",
        label: "Consultation génétique / panel CMD",
        hint: "Indication spécialisée",
      },
    ],
    flags: {},
  },
  {
    id: "restrictive",
    group: "Cardiologie",
    label: "Cardiomyopathie restrictive",
    description:
      "Bilan étiologique ciblé (amylose, surcharge, inflammation et autres causes). Une immunofixation anormale nécessite un avis spécialisé ; aucune scintigraphie seule ne permet de conclure à ATTR.",
    core: [
      { id: "nfs", label: "NFS–plaquettes" },
      { id: "creat", label: "Créatinine + DFG estimé" },
      { id: "liver", label: "Bilan hépatique" },
      { id: "ntprobnp", label: "NT-proBNP" },
      { id: "troponin", label: "Troponine hs" },
      { id: "ferritin", label: "Ferritine" },
      { id: "tsat", label: "Fer / transferrine et saturation (TSAT)" },
      { id: "proteinuria", label: "Protéinurie / rapport albumine-créatinine urinaire" },
    ],
    optional: [
      { id: "sif", label: "Immunofixation sérique", hint: "Suspicion amylose AL" },
      { id: "uif", label: "Immunofixation urinaire", hint: "Suspicion amylose AL" },
      {
        id: "sflc",
        label: "Chaînes légères libres sériques κ/λ avec ratio",
        hint: "Suspicion amylose AL, indispensable avec immunofixations",
      },
      {
        id: "ace",
        label: "Enzyme de conversion de l’angiotensine",
        hint: "Seulement suspicion de sarcoïdose selon contexte",
      },
      { id: "ck", label: "CK", hint: "Myopathie ou cause infiltrative" },
      { id: "autoimmune", label: "Bilan auto-immun ciblé", hint: "Contexte évocateur" },
    ],
    flags: {},
  },
  {
    id: "ic",
    group: "Cardiologie",
    label: "Insuffisance cardiaque",
    description:
      "Évaluation initiale et suivi : congestion, comorbidités, déficience martiale et sécurité thérapeutique (ESC 2026).",
    core: [
      { id: "nfs", label: "NFS–plaquettes" },
      { id: "creat", label: "Créatinine + DFG estimé" },
      { id: "na", label: "Sodium" },
      { id: "k", label: "Potassium" },
      { id: "ntprobnp", label: "NT-proBNP" },
      { id: "ferritin", label: "Ferritine" },
      { id: "tsat", label: "Saturation de la transferrine (TSAT)" },
      { id: "liver", label: "Bilan hépatique" },
      { id: "tsh", label: "TSH" },
      { id: "hba1c", label: "HbA1c" },
      { id: "lipid", label: "Bilan lipidique complet" },
      { id: "uacr", label: "Rapport albumine/créatinine urinaire" },
    ],
    optional: [
      { id: "mg", label: "Magnésémie", hint: "Diurétiques, troubles du rythme" },
      {
        id: "troponin",
        label: "Troponine hs",
        hint: "Décompensation aiguë, suspicion SCA ou lésion",
      },
      { id: "crp", label: "CRP", hint: "Infection ou inflammation suspectée" },
      { id: "abg", label: "Gaz du sang", hint: "Détresse respiratoire ou trouble métabolique" },
      { id: "urea", label: "Urée", hint: "Suivi rénal / déshydratation" },
    ],
    flags: {},
  },
  {
    id: "diab",
    group: "Endocrinologie",
    label: "Bilan diabète",
    description:
      "Suivi glycémique et évaluation des complications, surtout rénales et cardiovasculaires.",
    core: [
      { id: "hba1c", label: "HbA1c" },
      { id: "creat", label: "Créatinine + DFG estimé" },
      { id: "uacr", label: "Rapport albumine/créatinine urinaire" },
      { id: "lipid", label: "Bilan lipidique complet" },
    ],
    optional: [
      { id: "gly", label: "Glycémie à jeun", hint: "Selon diagnostic ou suivi" },
      { id: "liver", label: "ALAT/ASAT", hint: "Stéatopathie ou traitement selon contexte" },
      { id: "k", label: "Potassium", hint: "Médicaments ou maladie rénale" },
      {
        id: "cpeptide",
        label: "C-peptide",
        hint: "Difficulté de classification du diabète, spécialisé",
      },
      { id: "b12", label: "Vitamine B12", hint: "Metformine prolongée, anémie/neuropathie" },
    ],
    flags: {},
  },
  {
    id: "foie",
    group: "Autres",
    label: "Bilan hépatique",
    description:
      "Première ligne pour cytolyse, cholestase et fonction hépatique ; bilan étiologique adapté aux résultats.",
    core: [
      { id: "ast", label: "ASAT" },
      { id: "alt", label: "ALAT" },
      { id: "alp", label: "Phosphatases alcalines" },
      { id: "ggt", label: "Gamma-GT" },
      { id: "bili", label: "Bilirubine totale et conjuguée" },
    ],
    optional: [
      { id: "albumin", label: "Albumine", hint: "Fonction de synthèse, maladie chronique" },
      {
        id: "inr",
        label: "TP/INR",
        hint: "Fonction de synthèse, maladie hépatique sévère (attention AVK)",
      },
      { id: "serology", label: "Sérologies virales ciblées", hint: "Selon exposition, phénotype" },
      {
        id: "ferritin",
        label: "Ferritine et saturation transferrine",
        hint: "Hémochromatose / surcharge",
      },
      {
        id: "autoimmune",
        label: "Auto-anticorps hépatiques ciblés",
        hint: "Suspicion hépatite auto-immune ou cholangite",
      },
    ],
    flags: {},
  },
  {
    id: "thyroid",
    group: "Endocrinologie",
    label: "Bilan thyroïdien",
    description:
      "TSH en première intention ; T4 libre et T3 libre sont guidées par la TSH et le contexte clinique.",
    core: [{ id: "tsh", label: "TSH" }],
    optional: [
      {
        id: "ft4",
        label: "T4 libre",
        hint: "Anomalie TSH, suspicion centrale ou indication précise",
      },
      { id: "ft3", label: "T3 libre", hint: "Hyperthyroïdie ou discordance clinique-biologique" },
      { id: "anti_tpo", label: "Anticorps anti-TPO", hint: "Suspicion thyroïdite auto-immune" },
      { id: "trab", label: "TRAb", hint: "Suspicion maladie de Basedow" },
    ],
    flags: {},
  },
  {
    id: "tumor",
    group: "Autres",
    label: "Marqueurs tumoraux",
    description:
      "NE PAS sélectionner de marqueurs tumoraux en dépistage non ciblé. Ils n’ont pas de place dans un bilan général systématique ; demander seulement dans une indication oncologique documentée.",
    core: [],
    optional: [
      {
        id: "psa",
        label: "PSA total",
        hint: "Selon décision partagée et indications urologiques spécifiques, pas automatique",
      },
      {
        id: "cea",
        label: "ACE / CEA",
        hint: "Surveillance ciblée d’un cancer déjà diagnostiqué, selon protocole",
      },
      {
        id: "ca125",
        label: "CA 125",
        hint: "Indication gynéco-oncologique définie, pas dépistage",
      },
      {
        id: "ca199",
        label: "CA 19-9",
        hint: "Contexte pancréatobiliaire spécialisé, pas dépistage",
      },
      {
        id: "afp",
        label: "Alpha-fœtoprotéine",
        hint: "Contexte hépatique ou tumeur germinale selon stratégie",
      },
      {
        id: "bhcg",
        label: "β-hCG",
        hint: "Suspicion tumeur germinale ou autre indication spécifique",
      },
    ],
    flags: { emptyCoreByDesign: true },
  },
  {
    id: "other",
    group: "Autres",
    label: "Autres bilans",
    description:
      "Compléments à sélectionner selon clinique ; ajouter librement des examens non présents.",
    core: [],
    optional: [
      { id: "crp", label: "CRP", hint: "Suspicion inflammation/infection" },
      {
        id: "dimer",
        label: "D-dimères",
        hint: "Uniquement selon probabilité clinique et stratégie EP/TVP",
      },
      { id: "coag", label: "TP/INR et TCA", hint: "Indications ciblées, gestes / anticoagulants" },
      { id: "inr", label: "INR", hint: "Suivi AVK" },
      { id: "urine", label: "ECBU", hint: "Symptômes ou suspicion d’infection urinaire" },
      {
        id: "cultures",
        label: "Hémocultures × séries adaptées",
        hint: "Suspicion bactériémie/endocardite avant antibiothérapie si possible",
      },
      { id: "mg", label: "Magnésémie", hint: "Trouble ionique / rythme" },
      { id: "uric", label: "Uricémie", hint: "Contexte clinique" },
      { id: "vitd", label: "Vitamine D", hint: "Indication ciblée" },
      { id: "b12", label: "Vitamine B12", hint: "Anémie / neuropathie" },
    ],
    flags: { emptyCoreByDesign: true },
  },
  {
    id: "infectio",
    group: "Infectiologie",
    label: "Infectiologie — orientation",
    description:
      "Bilan clinique et biologique INITIAL uniquement selon foyer suspecté, gravité et contexte. Ne pas commander de panel bactérien/viral/fongique indifférencié. Évaluer la nécessité d'une prise en charge urgente.",
    core: [
      { id: "nfs", label: "NFS–plaquettes" },
      { id: "crp", label: "CRP" },
      { id: "creat", label: "Créatinine + DFG estimé" },
    ],
    optional: [
      {
        id: "pct",
        label: "Procalcitonine",
        hint: "Situations ciblées ; ne remplace pas l'examen clinique",
      },
      { id: "lactate", label: "Lactatémie", hint: "Sepsis grave, choc ou hypoperfusion" },
      {
        id: "hc_sets",
        label: "Hémocultures en séries adaptées",
        hint: "Suspicion de bactériémie ou d'endocardite ; idéalement avant antibiothérapie sans retarder les soins urgents",
      },
      {
        id: "urine",
        label: "ECBU avec antibiogramme si positif",
        hint: "Symptômes urinaires ou indication spécifique",
      },
      {
        id: "nasal_pcr",
        label: "PCR respiratoire ciblée",
        hint: "Syndrome respiratoire et impact attendu sur la prise en charge",
      },
      {
        id: "hiv",
        label: "VIH 1/2 Ag/Ac 4e génération",
        hint: "Indication et information du patient",
      },
      {
        id: "serology",
        label: "Sérologie ciblée selon agent suspecté",
        hint: "Exposition/épidémiologie ; pas de panel systématique",
      },
    ],
    flags: {},
  },
  {
    id: "infect_endocardite",
    group: "Infectiologie",
    label: "Endocardite — microbiologie",
    description:
      "Suspicion d'endocardite : prélèvements avant antibiothérapie lorsque possible ; pour patient grave, ne jamais retarder la prise en charge. Trois séries d'hémocultures selon protocole ESC, avec microbiologie et équipe d'endocardite.",
    core: [
      { id: "hc3", label: "Hémocultures : trois séries avant antibiothérapie si réalisable" },
      { id: "nfs", label: "NFS–plaquettes" },
      { id: "crp", label: "CRP" },
      { id: "creat", label: "Créatinine + DFG estimé" },
    ],
    optional: [
      {
        id: "ei_coxiella",
        label: "Sérologie Coxiella burnetii",
        hint: "Si hémocultures négatives et forte suspicion, après avis microbiologique",
      },
      {
        id: "ei_bartonella",
        label: "Sérologie Bartonella spp.",
        hint: "Endocardite à hémocultures négatives",
      },
      {
        id: "ei_brucella",
        label: "Sérologie Brucella",
        hint: "Exposition compatible / microbiologie",
      },
      {
        id: "ei_pcr",
        label: "PCR ciblée / séquençage si prélèvement disponible",
        hint: "Discussion avec microbiologiste ; matériel valvulaire si chirurgie",
      },
      {
        id: "hc_follow",
        label: "Hémocultures de contrôle",
        hint: "Selon agent, évolution et protocole local",
      },
      {
        id: "ttee",
        label: "ETT/ETO (examen non biologique)",
        hint: "Indispensable à l'évaluation diagnostique selon stratégie imagerie",
      },
    ],
    flags: { endocarditisPrecaution: true },
  },
  {
    id: "infect_bacterien",
    group: "Infectiologie",
    label: "Bactériologie ciblée",
    description:
      "Choisir les prélèvements selon le foyer suspecté ; l'antibiogramme dépend de la culture. Ne pas prescrire hémocultures sans suspicion de bactériémie/endocardite.",
    core: [],
    optional: [
      {
        id: "hc_sets",
        label: "Hémocultures en séries adaptées",
        hint: "Fièvre avec suspicion de bactériémie/sepsis, avant antibiotiques si possible",
      },
      {
        id: "urine",
        label: "ECBU + antibiogramme selon résultat",
        hint: "Infection urinaire suspectée ou indication spécifique",
      },
      {
        id: "sputum",
        label: "Examen microbiologique d'expectorations",
        hint: "Infection respiratoire appropriée et prélèvement de qualité",
      },
      {
        id: "wound",
        label: "Prélèvement profond / foyer documenté",
        hint: "Selon localisation, éviter les prélèvements superficiels peu pertinents",
      },
      {
        id: "stool",
        label: "PCR/culture des selles ciblée",
        hint: "Diarrhée avec indication microbiologique",
      },
      {
        id: "c_difficile",
        label: "Recherche Clostridioides difficile",
        hint: "Diarrhée compatible, pas de dépistage de portage",
      },
      {
        id: "pcr_bact",
        label: "PCR bactérienne ciblée",
        hint: "Agent présumé, site et question diagnostique définis",
      },
    ],
    flags: { emptyCoreByDesign: true },
  },
  {
    id: "infect_urine",
    group: "Infectiologie",
    label: "ECBU / infection urinaire",
    description:
      "ECBU si symptômes urinaires, pyélonéphrite, infection compliquée, grossesse ou contexte urologique pertinent. Ne pas rechercher une bactériurie asymptomatique sans indication.",
    core: [],
    optional: [
      {
        id: "urine",
        label: "ECBU avec antibiogramme si culture positive",
        hint: "Indication clinique documentée",
      },
      { id: "nfs", label: "NFS–plaquettes", hint: "Infection fébrile ou compliquée" },
      { id: "crp", label: "CRP", hint: "Suspicion pyélonéphrite, infection systémique" },
      {
        id: "creat",
        label: "Créatinine + DFG estimé",
        hint: "Atteinte rénale, infection compliquée ou traitement à adapter",
      },
      {
        id: "hc_sets",
        label: "Hémocultures en séries adaptées",
        hint: "Si sepsis ou bactériémie suspectée",
      },
    ],
    flags: { emptyCoreByDesign: true },
  },
  {
    id: "infect_viral",
    group: "Infectiologie",
    label: "Virologie ciblée",
    description:
      "Les PCR et sérologies sont sélectionnées selon le syndrome, l'exposition, le statut immunitaire et l'effet attendu sur la prise en charge. Pas de panel universel.",
    core: [],
    optional: [
      {
        id: "pcr_influenza",
        label: "PCR influenza A/B",
        hint: "Syndrome compatible / saison / prise en charge",
      },
      { id: "pcr_sars", label: "PCR SARS-CoV-2", hint: "Indication clinique et stratégie locale" },
      { id: "pcr_rsv", label: "PCR VRS", hint: "Patient à risque, hospitalisation ou indication" },
      {
        id: "hiv",
        label: "Test VIH 1/2 Ag/Ac 4e génération",
        hint: "Dépistage orienté / information et parcours de confirmation",
      },
      {
        id: "hbv",
        label: "Hépatite B : AgHBs, anti-HBc, anti-HBs",
        hint: "Sérologies selon indication",
      },
      {
        id: "hcv",
        label: "Hépatite C : anticorps anti-VHC ± ARN VHC",
        hint: "Stratégie sérologique et réflexe ARN si indiqué",
      },
      {
        id: "ebv",
        label: "EBV sérologie ciblée",
        hint: "Syndrome mononucléosique, interpréter l'évolution",
      },
      {
        id: "cmv",
        label: "CMV PCR ou sérologie ciblée",
        hint: "Immunodépression, grossesse ou suspicion spécifique",
      },
      {
        id: "parvo",
        label: "Parvovirus B19 PCR/sérologie ciblée",
        hint: "Suspicion spécifique, notamment contexte hématologique",
      },
      {
        id: "pcr_other_virus",
        label: "PCR virale ciblée selon prélèvement",
        hint: "Agent défini, indication pertinente",
      },
    ],
    flags: { emptyCoreByDesign: true },
  },
  {
    id: "infect_fungal",
    group: "Infectiologie",
    label: "Mycologie ciblée",
    description:
      "Bilan réservé à des contextes évocateurs (immunodépression, endocardite fongique, infection invasive) après discussion infectiologie/microbiologie. Tests souvent non spécifiques.",
    core: [],
    optional: [
      {
        id: "fungal_cult",
        label: "Examen direct et culture mycologique adaptée au site",
        hint: "Choisir un prélèvement pertinent",
      },
      {
        id: "fungal_blood",
        label: "Hémocultures / cultures adaptées aux levures",
        hint: "Candidémie ou infection systémique suspectée",
      },
      {
        id: "bdg",
        label: "β-D-glucane sérique",
        hint: "Mycose invasive sélectionnée ; nombreuses causes de faux positifs",
      },
      {
        id: "galacto",
        label: "Antigénémie galactomannane Aspergillus",
        hint: "Suspicion aspergillose invasive, contexte approprié",
      },
      {
        id: "asp_pcr",
        label: "PCR Aspergillus ciblée",
        hint: "Site / risque définis, avec microbiologie",
      },
      {
        id: "crypto",
        label: "Antigène cryptococcique",
        hint: "Immunodépression ou présentation évocatrice",
      },
      {
        id: "candida_pcr",
        label: "PCR fongique ciblée",
        hint: "Si disponible et interprétable selon stratégie locale",
      },
    ],
    flags: { emptyCoreByDesign: true },
  },
  {
    id: "endo_general",
    group: "Endocrinologie",
    label: "Endocrinologie — orientation",
    description:
      "Pas de bilan hormonal global systématique. Les explorations se font en fonction des signes, de la biologie initiale et des traitements (biotine, corticoïdes, etc.).",
    core: [],
    optional: [
      { id: "tsh", label: "TSH", hint: "Syndrome évocateur d'une anomalie thyroïdienne" },
      { id: "ft4", label: "T4 libre", hint: "Selon TSH ou suspicion d'atteinte centrale" },
      {
        id: "calcium",
        label: "Calcémie totale corrigée sur albumine",
        hint: "Anomalie calcique / suspicion parathyroïdienne",
      },
      { id: "pth", label: "PTH intacte", hint: "À interpréter avec calcémie et DFG" },
      { id: "hba1c", label: "HbA1c", hint: "Trouble glycémique et suivi" },
      {
        id: "cort8",
        label: "Cortisol sérique 8 h",
        hint: "Suspicion insuffisance surrénalienne, avec ACTH",
      },
      {
        id: "aldoren",
        label: "Aldostérone + rénine + ratio (ARR)",
        hint: "HTA et recherche d'hyperaldostéronisme, médicaments interférents",
      },
      {
        id: "metaph",
        label: "Métanéphrines plasmatiques libres",
        hint: "Suspicion phéochromocytome",
      },
    ],
    flags: { emptyCoreByDesign: true },
  },
  {
    id: "endo_parathyroid",
    group: "Endocrinologie",
    label: "Parathyroïdes / métabolisme phosphocalcique",
    description:
      "Mesures couplées calcémie–PTH indispensables ; interpréter avec albumine, vitamine D et fonction rénale.",
    core: [
      { id: "calcalb", label: "Calcémie totale + albuminémie (correction)" },
      { id: "pth", label: "PTH intacte" },
      { id: "phosphate", label: "Phosphatémie" },
      { id: "vitd25", label: "25-OH vitamine D" },
      { id: "creat", label: "Créatinine + DFG estimé" },
    ],
    optional: [
      {
        id: "caion",
        label: "Calcémie ionisée",
        hint: "Discordance, hypoalbuminémie majeure ou suspicion normocalcémique",
      },
      {
        id: "ca24",
        label: "Calciurie des 24 h + créatininurie",
        hint: "Différentiel et évaluation rénale ciblée",
      },
      { id: "mg", label: "Magnésémie", hint: "Hypocalcémie ou désordre du métabolisme minéral" },
      { id: "alp", label: "Phosphatases alcalines", hint: "Retentissement osseux selon clinique" },
    ],
    flags: {},
  },
  {
    id: "pancreatite",
    group: "Endocrinologie",
    label: "Pancréatite aiguë — bilan initial",
    description:
      "Urgence clinique si suspicion de pancréatite aiguë : lipase diagnostique, évaluation de gravité et étiologie. Pas de surveillance répétée systématique de la lipase. Le bilan ne doit pas différer les soins urgents.",
    core: [
      { id: "lipase", label: "Lipasémie" },
      { id: "nfs", label: "NFS–plaquettes" },
      { id: "na", label: "Sodium" },
      { id: "k", label: "Potassium" },
      { id: "creat", label: "Créatinine + DFG estimé" },
      { id: "gly", label: "Glycémie" },
      { id: "calcium", label: "Calcémie" },
      { id: "liver", label: "Bilan hépatique" },
      { id: "crp", label: "CRP (interprétation selon délai d'évolution)" },
    ],
    optional: [
      {
        id: "tg",
        label: "Triglycérides",
        hint: "Étiologie hypertriglycéridémie, surtout sans cause évidente",
      },
      { id: "lactate", label: "Lactatémie", hint: "Instabilité, hypoperfusion" },
      {
        id: "abg",
        label: "Gaz du sang",
        hint: "Forme sévère / trouble respiratoire ou acido-basique",
      },
      { id: "igg4", label: "IgG4", hint: "Suspicion pancréatite auto-immune seulement" },
      {
        id: "abdo_us",
        label: "Échographie abdominale (non biologique)",
        hint: "Recherche étiologie biliaire",
      },
    ],
    flags: {},
  },
  {
    id: "endo_adrenal",
    group: "Endocrinologie",
    label: "Surrénales — bilan basal",
    description:
      "Selon suspicion (insuffisance, hypercortisolisme, phéochromocytome ou hyperaldostéronisme) ; les tests dynamiques sont séparés et prescrits avec consignes spécialisées. En crise surrénale suspectée, soins urgents sans attendre le test.",
    core: [],
    optional: [
      { id: "cort8", label: "Cortisolémie à 8 h", hint: "Insuffisance surrénale suspectée" },
      {
        id: "acth8",
        label: "ACTH plasmatique à 8 h",
        hint: "Prélever conjointement au cortisol, circuit de prélèvement spécifique",
      },
      { id: "na", label: "Natrémie", hint: "Trouble hydro-électrolytique" },
      { id: "k", label: "Kaliémie", hint: "Trouble hydro-électrolytique" },
      { id: "gly", label: "Glycémie", hint: "Hypoglycémie, insuffisance surrénale" },
      { id: "creat", label: "Créatinine + DFG estimé", hint: "Évaluation associée" },
      { id: "dheas", label: "DHEA-S", hint: "Contexte endocrinien sélectionné" },
      {
        id: "aldoren",
        label: "Aldostérone, rénine et ratio ARR",
        hint: "Hyperaldostéronisme primaire, interprétation médicamenteuse",
      },
      {
        id: "metaph",
        label: "Métanéphrines plasmatiques libres",
        hint: "Suspicion phéochromocytome / position et conditions de prélèvement",
      },
      {
        id: "meta24",
        label: "Métanéphrines urinaires fractionnées sur 24 h",
        hint: "Alternative selon contexte",
      },
      {
        id: "cortsal",
        label: "Cortisol salivaire nocturne",
        hint: "Suspicion syndrome de Cushing, selon contexte",
      },
      {
        id: "cort24",
        label: "Cortisol libre urinaire 24 h",
        hint: "Suspicion hypercortisolisme selon indication",
      },
    ],
    flags: { emptyCoreByDesign: true },
  },
  {
    id: "endo_synacthene",
    group: "Endocrinologie",
    label: "Surrénales — test de stimulation ACTH",
    description:
      "TEST DYNAMIQUE SPÉCIALISÉ : Synacthène/cosyntropine selon protocole local, avec cortisol à T0 puis T30/T60 selon laboratoire. Ne pas générer l'administration automatiquement ; interprétation dépend du dosage. Urgence surrénalienne : traitement immédiat, ne pas retarder.",
    core: [],
    optional: [
      {
        id: "synacthen_protocol",
        label: "Demande test de stimulation à l'ACTH — protocole endocrinologie",
        hint: "Vérifier indication et préparation",
      },
      { id: "cort0", label: "Cortisol basal T0", hint: "Avant stimulation" },
      { id: "cort30", label: "Cortisol à T30 min", hint: "Selon protocole du laboratoire" },
      { id: "cort60", label: "Cortisol à T60 min", hint: "Selon protocole du laboratoire" },
      {
        id: "acth8",
        label: "ACTH plasmatique de base",
        hint: "Si nécessaire et conditions adaptées avant stimulation",
      },
    ],
    flags: { dynamicTest: true, emptyCoreByDesign: true },
  },
  {
    id: "endo_dexa",
    group: "Endocrinologie",
    label: "Surrénales — test de freinage",
    description:
      "TEST DYNAMIQUE SPÉCIALISÉ : freinage minute par dexaméthasone 1 mg (souvent prise à 23 h, cortisol vers 8–9 h le lendemain) selon protocole validé. Vérifier interactions, traitements, grossesse et causes de faux résultats. Aucune délivrance médicamenteuse automatique.",
    core: [],
    optional: [
      {
        id: "dexa_request",
        label: "Demande de test de freinage minute — protocole spécialisé",
        hint: "Prescription et prise de dexaméthasone validées séparément",
      },
      {
        id: "cort_post_dexa",
        label: "Cortisolémie le lendemain matin après freinage",
        hint: "Dosage à 8–9 h selon protocole",
      },
      {
        id: "dex_level",
        label: "Dosage de dexaméthasone concomitant",
        hint: "Selon disponibilité et risque de résultat non interprétable",
      },
      {
        id: "acth8",
        label: "ACTH de base",
        hint: "Selon séquence diagnostique, ne pas confondre avec le prélèvement post-freinage",
      },
    ],
    flags: { dynamicTest: true, emptyCoreByDesign: true },
  },
  {
    id: "hta_secondaire",
    group: "HTA secondaire",
    label: "HTA secondaire — exploration orientée",
    description:
      "Confirmer l'HTA, revoir médicaments/substances, signes d'apnée du sommeil, causes rénales et endocriniennes. Les tests hormonaux dépendent du contexte et des traitements ; aldostérone/rénine/rapport ARR en première intention selon recommandations 2025.",
    core: [
      { id: "na", label: "Sodium" },
      { id: "k", label: "Potassium" },
      { id: "creat", label: "Créatinine + DFG estimé" },
      { id: "uacr", label: "Rapport albumine/créatinine urinaire" },
      { id: "aldoren", label: "Aldostérone + rénine + ratio ARR (interférences à vérifier)" },
    ],
    optional: [
      { id: "tsh", label: "TSH", hint: "Thyroïde si tableau évocateur" },
      {
        id: "metaph",
        label: "Métanéphrines plasmatiques libres",
        hint: "Crises paroxystiques, symptômes évocateurs, incidentalome",
      },
      {
        id: "meta24",
        label: "Métanéphrines urinaires fractionnées 24 h",
        hint: "Alternative à dosage plasmatique",
      },
      {
        id: "dexa_request",
        label: "Test de freinage minute (évaluation spécialisée)",
        hint: "Suspicion d'hypercortisolisme",
      },
      { id: "calcalb", label: "Calcémie corrigée", hint: "Hyperparathyroïdie ou hypercalcémie" },
      {
        id: "renal_doppler",
        label: "Écho-Doppler des artères rénales (non biologique)",
        hint: "Suspicion HTA rénovasculaire",
      },
      {
        id: "mapa",
        label: "MAPA / automesure tensionnelle (non biologique)",
        hint: "Confirmation et phénotype d'HTA",
      },
      {
        id: "sleep_apnea",
        label: "Polygraphie ventilatoire (non biologique)",
        hint: "Symptômes apnées du sommeil, obésité, HTA résistante",
      },
    ],
    flags: { noAutoDrugStop: true },
  },
];
