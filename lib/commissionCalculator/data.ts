// Verbatim fallback rate table ported from the standalone Commission
// Calculator tool (carrier comp grids as of the source build). Used only
// when the portal's own CarrierPlan/CarrierPlanRate grid — the real source
// of truth, see /api/portal/carrier-plans/rates — has no row for a given
// carrier + product + the agent's comp level. Rate numbers are commission
// percentages at each of the 14 standard FFL contract levels (145 down to
// 80); `null` means the carrier doesn't offer that product at that level.

export const LEVELS = [145, 140, 135, 130, 125, 120, 115, 110, 105, 100, 95, 90, 85, 80] as const;
export type FflLevel = (typeof LEVELS)[number];

export const TIER_INFO: Record<FflLevel, { name: string; note: string }> = {
  80:  {name:"Starting", note:"Your starting contract — no minimum production required yet."},
  85:  {name:"Producer", note:"Requires $10,000 personal production issued/paid — unlocks $30,000 total hierarchy override."},
  90:  {name:"Producer", note:"Requires $15,000 personal production issued/paid — unlocks $40,000 total hierarchy override."},
  95:  {name:"Producer", note:"Requires $20,000 personal production issued/paid — unlocks $50,000 total hierarchy override."},
  100: {name:"Producer", note:"Requires $25,000 personal production issued/paid — unlocks $75,000 total hierarchy override."},
  105: {name:"Producer", note:"Requires $30,000 personal production issued/paid — unlocks $100,000 total hierarchy override."},
  110: {name:"Producer", note:"Requires $35,000 personal production issued/paid — unlocks $125,000 total hierarchy override."},
  115: {name:"Producer", note:"Requires $40,000 personal production issued/paid — unlocks $150,000 total hierarchy override."},
  120: {name:"Builder",  note:"Requires 2 issued/paid legs at $10,000 each — $200,000 total hierarchy issued/paid."},
  125: {name:"Builder",  note:"Requires 4 issued/paid legs at $50,000 each — $250,000 total hierarchy issued/paid."},
  130: {name:"Builder",  note:"Requires 6 issued/paid legs at $50,000 each — $400,000 total hierarchy issued/paid."},
  135: {name:"Builder",  note:"Requires 8 issued/paid legs at $50,000 each — $500,000 total hierarchy issued/paid."},
  140: {name:"Builder",  note:"Requires 10 issued/paid legs at $50,000 each — $750,000 total hierarchy issued/paid."},
  145: {name:"Builder",  note:"Requires 10 issued/paid legs at $50,000 each — $1,000,000 total hierarchy issued/paid."}
};

export type ProductType = "IUL" | "Term" | "WL" | "Other";

function R(vals: (number | null)[]): Record<FflLevel, number | null> {
  const o = {} as Record<FflLevel, number | null>;
  LEVELS.forEach((l, i) => (o[l] = vals[i]));
  return o;
}

export const COMPANIES: Record<string, { products: Record<string, { type: ProductType; rates: Record<FflLevel, number | null> }> }> = {
  "Aetna": { products: {
    "Whole Life": {type:"WL", rates:R([null,144,137,130,125,120,115,107.5,100,92.5,85,77.5,70,70])},
  }},
  "Aflac": { products: {
    "Final EX": {type:"WL", rates:R([null,123,118,113,108,100,93,85,78,70,70,70,63,63])},
  }},
  "Americo": { products: {
    "HMS 125": {type:"Term", rates:R([145,140,135,130,125,120,115,110,105,100,95,90,85,80])},
    "Eagle Premier": {type:"WL", rates:R([135,135,130,125,120,115,110,105,100,95,90,85,80,75])},
  }},
  "American Amicable": { products: {
    "Senior/Family Choice": {type:"WL", rates:R([125,125,120,115,110,105,100,95,90,85,80,75,70,65])},
    "EZ Term": {type:"Term", rates:R([100,100,95,90,85,80,75,70,65,60,55,50,45,40])},
    "Secure Life": {type:"WL", rates:R([140,140,135,130,125,120,115,110,105,100,95,90,85,80])},
    "Home Protector": {type:"Term", rates:R([145,140,135,130,125,120,115,110,105,100,95,90,85,80])},
    "OBA": {type:"Term", rates:R([100,100,95,90,85,80,75,70,65,60,55,50,45,40])},
    "Term Made Simple": {type:"Term", rates:R([130,130,125,120,115,110,105,100,95,90,85,80,75,70])},
    "Family Protector": {type:"WL", rates:R([130,130,125,120,115,110,105,100,95,90,85,80,75,70])},
    "IUL": {type:"IUL", rates:R([105,105,100,95,90,85,80,75,70,76,60,55,50,45])},
  }},
  "Corebridge": { products: {
    "GIWL": {type:"WL", rates:R([null,80,77.5,75,72.5,70,67.5,65,62.5,60,57.5,57.5,55,55])},
    "Graded WL": {type:"WL", rates:R([null,70,67.5,65,62.5,60,57.5,55,52.5,50,47.5,47.5,45,45])},
    "SIWL": {type:"WL", rates:R([null,132,127,122,117,112,107,102,97,92,87,82,77,72])},
  }},
  "Ethos": { products: {
    "LGA Prime": {type:"Term", rates:R([120,117.5,115,112.5,110,107.5,105,102.5,100,97.5,95,92.5,90,87.5])},
    "TruStage TAWL": {type:"WL", rates:R([120,120,115,110,105,100,95,90,85,82.5,80,77.5,75,72.5])},
    "TruStage SITL": {type:"Term", rates:R([120,115,110,105,100,95,90,85,80,75,70,65,60,55])},
    "TruStage GAWL": {type:"WL", rates:R([30,27.5,25,22.5,20,17.5,15,12.5,10,7.5,5,2.5,2.5,2.5])},
    "Ameritas IUL": {type:"IUL", rates:R([125,120,115,110,105,100,95,90,85,80,75,70,65,60])},
    "Ameritas SI Term": {type:"Term", rates:R([120,117.5,115,112.5,110,107.5,105,102.5,100,97.5,95,92.5,90,87.5])},
    "JH ROP": {type:"Term", rates:R([145,145,135,130,125,115,105,100,95,90,85,80,75,70])},
  }},
  "Foresters": { products: {
    "Strong Foundation": {type:"WL", rates:R([null,120,115,110,105,100,95,90,85,80,75,70,65,60])},
    "Planright": {type:"WL", rates:R([null,120,115,110,105,100,95,90,85,80,75,70,65,60])},
  }},
  "Liberty Bankers": { products: {
    "FEX": {type:"WL", rates:R([null,125,120,115,110,105,100,95,90,85,80,75,70,65])},
  }},
  "Ladder Life": { products: {
    "FEX": {type:"WL", rates:R([null,120,115,110,105,100,95,90,85,80,75,70,65,60])},
  }},
  "NLG": { products: {
    "Universal Life": {type:"IUL", rates:R([null,110,105,100,95,90,85,80,75,70,65,60,55,50])},
  }},
  "Mutual of Omaha": { products: {
    "Term Life Express": {type:"Term", rates:R([145,140,135,130,125,120,115,110,105,100,95,90,85,80])},
    "Final Expense": {type:"WL", rates:R([125,125,120,115,110,105,100,95,90,86,82,78,74,70])},
    "IUL": {type:"IUL", rates:R([125,125,120,115,110,105,100,95,90,85,80,75,70,65])},
    "Children's Whole Life": {type:"WL", rates:R([100,100,97,95,92,90,85,80,75,70,65,60,55,50])},
    "IULE": {type:"IUL", rates:R([130,130,125,120,115,110,105,100,95,90,85,80,75,70])},
    "Term Life Answers": {type:"Term", rates:R([110,110,105,100,95,90,85,80,75,70,65,60,55,50])},
    "Accidental Death": {type:"Term", rates:R([130,130,125,120,115,110,105,100,95,90,85,80,75,70])},
  }},
  "Royal Neighbors": { products: {
    "Term": {type:"Term", rates:R([null,120,115,110,100,100,100,95,90,85,80,75,50,50])},
    "Royal Legacy SPWL": {type:"WL", rates:R([null,16,15,14,13,13,13,13,12,11,10,9,7,7])},
    "Secure Life IUL": {type:"IUL", rates:R([null,125,120,112,105,105,105,100,95,90,85,80,50,50])},
    "SI Whole Life": {type:"WL", rates:R([null,125,120,110,100,100,100,95,90,85,80,75,45,45])},
  }},
  "Transamerica": { products: {
    "FEX": {type:"WL", rates:R([140,140,135,130,125,120,115,110,105,100,95,90,85,80])},
    "IUL": {type:"IUL", rates:R([120,120,115,110,105,100,95,90,80,75,70,60,55,50])},
    "Trendsetter LB": {type:"Term", rates:R([130,125,120,115,110,105,100,95,90,85,80,75,70,65])},
  }},
  "United Home Life": { products: {
    "FEX": {type:"WL", rates:R([null,110,105,100,95,90,85,80,75,70,65,60,55,50])},
    "GIWL": {type:"WL", rates:R([null,70,65,60,55,50,45,40,35,30,25,25,25,25])},
    "Whole Life": {type:"WL", rates:R([null,120,115,110,105,100,95,90,85,80,75,70,65,60])},
    "Accidental": {type:"Term", rates:R([null,100,95,90,85,80,75,70,65,60,55,50,50,50])},
    "Term": {type:"Term", rates:R([null,110,105,100,95,90,85,80,75,70,65,60,55,50])},
  }},
};

export const TYPE_LABEL: Record<ProductType, string> = { IUL: "IUL", Term: "Term", WL: "Whole Life", Other: "Other" };
export const TYPE_BADGE_CLASS: Record<ProductType, string> = { IUL: "IUL", Term: "Term", WL: "WL", Other: "Other" };
