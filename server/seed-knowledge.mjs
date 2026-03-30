/**
 * Knowledge Base Seed Script
 * Seeds UAE climate data, building codes, materials, design standards,
 * calculation rules, decision trees, and output templates.
 * Run: node server/seed-knowledge.mjs
 */

import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const db = await createConnection(process.env.DATABASE_URL);

console.log("🌱 Starting UAE Knowledge Base Seed...\n");

// ─────────────────────────────────────────────
// 1. CLIMATE DATA — UAE 7 Emirates × 12 Months
// ─────────────────────────────────────────────
console.log("📊 Seeding climate_data...");

const climateRows = [
  // Dubai
  { emirate: "dubai", month: 1, tempMaxAvg: 24.0, tempMinAvg: 14.3, designTempCooling: 43.5, designTempHeating: 12.0, humidityAvg: 65, solarIrradiancePeak: 680, solarRadiationDaily: 4.2, windSpeedAvg: 3.8, windDirection: 315, coolingDegreeDays: 186, heatingDegreeDays: 12 },
  { emirate: "dubai", month: 2, tempMaxAvg: 25.5, tempMinAvg: 15.1, designTempCooling: 43.5, designTempHeating: 12.0, humidityAvg: 63, solarIrradiancePeak: 720, solarRadiationDaily: 4.8, windSpeedAvg: 4.0, windDirection: 315, coolingDegreeDays: 210, heatingDegreeDays: 8 },
  { emirate: "dubai", month: 3, tempMaxAvg: 29.0, tempMinAvg: 18.2, designTempCooling: 43.5, designTempHeating: 12.0, humidityAvg: 58, solarIrradiancePeak: 810, solarRadiationDaily: 5.6, windSpeedAvg: 4.5, windDirection: 270, coolingDegreeDays: 341, heatingDegreeDays: 2 },
  { emirate: "dubai", month: 4, tempMaxAvg: 34.0, tempMinAvg: 22.5, designTempCooling: 43.5, designTempHeating: 12.0, humidityAvg: 52, solarIrradiancePeak: 900, solarRadiationDaily: 6.4, windSpeedAvg: 4.8, windDirection: 270, coolingDegreeDays: 480, heatingDegreeDays: 0 },
  { emirate: "dubai", month: 5, tempMaxAvg: 38.5, tempMinAvg: 26.8, designTempCooling: 43.5, designTempHeating: 12.0, humidityAvg: 48, solarIrradiancePeak: 960, solarRadiationDaily: 7.2, windSpeedAvg: 5.2, windDirection: 270, coolingDegreeDays: 635, heatingDegreeDays: 0 },
  { emirate: "dubai", month: 6, tempMaxAvg: 41.0, tempMinAvg: 29.5, designTempCooling: 43.5, designTempHeating: 12.0, humidityAvg: 55, solarIrradiancePeak: 980, solarRadiationDaily: 7.5, windSpeedAvg: 5.8, windDirection: 225, coolingDegreeDays: 735, heatingDegreeDays: 0 },
  { emirate: "dubai", month: 7, tempMaxAvg: 42.5, tempMinAvg: 31.2, designTempCooling: 43.5, designTempHeating: 12.0, humidityAvg: 60, solarIrradiancePeak: 940, solarRadiationDaily: 7.1, windSpeedAvg: 5.5, windDirection: 225, coolingDegreeDays: 760, heatingDegreeDays: 0 },
  { emirate: "dubai", month: 8, tempMaxAvg: 43.0, tempMinAvg: 31.8, designTempCooling: 43.5, designTempHeating: 12.0, humidityAvg: 62, solarIrradiancePeak: 920, solarRadiationDaily: 6.9, windSpeedAvg: 5.2, windDirection: 225, coolingDegreeDays: 775, heatingDegreeDays: 0 },
  { emirate: "dubai", month: 9, tempMaxAvg: 40.5, tempMinAvg: 28.5, designTempCooling: 43.5, designTempHeating: 12.0, humidityAvg: 60, solarIrradiancePeak: 870, solarRadiationDaily: 6.2, windSpeedAvg: 4.8, windDirection: 270, coolingDegreeDays: 690, heatingDegreeDays: 0 },
  { emirate: "dubai", month: 10, tempMaxAvg: 36.0, tempMinAvg: 24.5, designTempCooling: 43.5, designTempHeating: 12.0, humidityAvg: 58, solarIrradiancePeak: 790, solarRadiationDaily: 5.5, windSpeedAvg: 4.2, windDirection: 315, coolingDegreeDays: 558, heatingDegreeDays: 0 },
  { emirate: "dubai", month: 11, tempMaxAvg: 30.5, tempMinAvg: 19.8, designTempCooling: 43.5, designTempHeating: 12.0, humidityAvg: 62, solarIrradiancePeak: 700, solarRadiationDaily: 4.6, windSpeedAvg: 3.9, windDirection: 315, coolingDegreeDays: 375, heatingDegreeDays: 0 },
  { emirate: "dubai", month: 12, tempMaxAvg: 25.5, tempMinAvg: 15.5, designTempCooling: 43.5, designTempHeating: 12.0, humidityAvg: 66, solarIrradiancePeak: 650, solarRadiationDaily: 4.0, windSpeedAvg: 3.7, windDirection: 315, coolingDegreeDays: 232, heatingDegreeDays: 8 },
  // Abu Dhabi
  { emirate: "abu_dhabi", month: 1, tempMaxAvg: 24.3, tempMinAvg: 13.5, designTempCooling: 45.0, designTempHeating: 10.0, humidityAvg: 63, solarIrradiancePeak: 670, solarRadiationDaily: 4.1, windSpeedAvg: 4.2, windDirection: 315, coolingDegreeDays: 192, heatingDegreeDays: 15 },
  { emirate: "abu_dhabi", month: 2, tempMaxAvg: 26.0, tempMinAvg: 14.8, designTempCooling: 45.0, designTempHeating: 10.0, humidityAvg: 60, solarIrradiancePeak: 730, solarRadiationDaily: 4.9, windSpeedAvg: 4.5, windDirection: 315, coolingDegreeDays: 224, heatingDegreeDays: 9 },
  { emirate: "abu_dhabi", month: 3, tempMaxAvg: 30.0, tempMinAvg: 18.0, designTempCooling: 45.0, designTempHeating: 10.0, humidityAvg: 55, solarIrradiancePeak: 820, solarRadiationDaily: 5.8, windSpeedAvg: 5.0, windDirection: 270, coolingDegreeDays: 360, heatingDegreeDays: 1 },
  { emirate: "abu_dhabi", month: 4, tempMaxAvg: 35.5, tempMinAvg: 23.0, designTempCooling: 45.0, designTempHeating: 10.0, humidityAvg: 48, solarIrradiancePeak: 920, solarRadiationDaily: 6.6, windSpeedAvg: 5.5, windDirection: 270, coolingDegreeDays: 510, heatingDegreeDays: 0 },
  { emirate: "abu_dhabi", month: 5, tempMaxAvg: 40.0, tempMinAvg: 27.5, designTempCooling: 45.0, designTempHeating: 10.0, humidityAvg: 44, solarIrradiancePeak: 980, solarRadiationDaily: 7.4, windSpeedAvg: 6.0, windDirection: 270, coolingDegreeDays: 682, heatingDegreeDays: 0 },
  { emirate: "abu_dhabi", month: 6, tempMaxAvg: 42.5, tempMinAvg: 30.0, designTempCooling: 45.0, designTempHeating: 10.0, humidityAvg: 52, solarIrradiancePeak: 990, solarRadiationDaily: 7.6, windSpeedAvg: 6.5, windDirection: 225, coolingDegreeDays: 765, heatingDegreeDays: 0 },
  { emirate: "abu_dhabi", month: 7, tempMaxAvg: 44.0, tempMinAvg: 32.0, designTempCooling: 45.0, designTempHeating: 10.0, humidityAvg: 58, solarIrradiancePeak: 950, solarRadiationDaily: 7.2, windSpeedAvg: 6.2, windDirection: 225, coolingDegreeDays: 806, heatingDegreeDays: 0 },
  { emirate: "abu_dhabi", month: 8, tempMaxAvg: 44.5, tempMinAvg: 32.5, designTempCooling: 45.0, designTempHeating: 10.0, humidityAvg: 60, solarIrradiancePeak: 930, solarRadiationDaily: 7.0, windSpeedAvg: 5.8, windDirection: 225, coolingDegreeDays: 820, heatingDegreeDays: 0 },
  { emirate: "abu_dhabi", month: 9, tempMaxAvg: 41.5, tempMinAvg: 29.0, designTempCooling: 45.0, designTempHeating: 10.0, humidityAvg: 56, solarIrradiancePeak: 880, solarRadiationDaily: 6.4, windSpeedAvg: 5.5, windDirection: 270, coolingDegreeDays: 720, heatingDegreeDays: 0 },
  { emirate: "abu_dhabi", month: 10, tempMaxAvg: 37.0, tempMinAvg: 25.0, designTempCooling: 45.0, designTempHeating: 10.0, humidityAvg: 54, solarIrradiancePeak: 800, solarRadiationDaily: 5.7, windSpeedAvg: 5.0, windDirection: 315, coolingDegreeDays: 589, heatingDegreeDays: 0 },
  { emirate: "abu_dhabi", month: 11, tempMaxAvg: 31.0, tempMinAvg: 20.0, designTempCooling: 45.0, designTempHeating: 10.0, humidityAvg: 58, solarIrradiancePeak: 710, solarRadiationDaily: 4.7, windSpeedAvg: 4.5, windDirection: 315, coolingDegreeDays: 390, heatingDegreeDays: 0 },
  { emirate: "abu_dhabi", month: 12, tempMaxAvg: 26.0, tempMinAvg: 15.0, designTempCooling: 45.0, designTempHeating: 10.0, humidityAvg: 64, solarIrradiancePeak: 660, solarRadiationDaily: 4.1, windSpeedAvg: 4.2, windDirection: 315, coolingDegreeDays: 248, heatingDegreeDays: 12 },
  // Sharjah
  { emirate: "sharjah", month: 1, tempMaxAvg: 23.5, tempMinAvg: 13.8, designTempCooling: 43.0, designTempHeating: 11.0, humidityAvg: 67, solarIrradiancePeak: 670, solarRadiationDaily: 4.1, windSpeedAvg: 3.5, windDirection: 315, coolingDegreeDays: 176, heatingDegreeDays: 13 },
  { emirate: "sharjah", month: 7, tempMaxAvg: 42.0, tempMinAvg: 30.8, designTempCooling: 43.0, designTempHeating: 11.0, humidityAvg: 62, solarIrradiancePeak: 935, solarRadiationDaily: 7.0, windSpeedAvg: 5.3, windDirection: 225, coolingDegreeDays: 750, heatingDegreeDays: 0 },
  { emirate: "sharjah", month: 12, tempMaxAvg: 25.0, tempMinAvg: 15.0, designTempCooling: 43.0, designTempHeating: 11.0, humidityAvg: 67, solarIrradiancePeak: 645, solarRadiationDaily: 3.9, windSpeedAvg: 3.5, windDirection: 315, coolingDegreeDays: 225, heatingDegreeDays: 9 },
  // Ras Al Khaimah
  { emirate: "ras_al_khaimah", month: 1, tempMaxAvg: 22.5, tempMinAvg: 12.0, designTempCooling: 44.0, designTempHeating: 9.0, humidityAvg: 62, solarIrradiancePeak: 660, solarRadiationDaily: 4.0, windSpeedAvg: 3.2, windDirection: 315, coolingDegreeDays: 162, heatingDegreeDays: 18 },
  { emirate: "ras_al_khaimah", month: 7, tempMaxAvg: 43.5, tempMinAvg: 30.0, designTempCooling: 44.0, designTempHeating: 9.0, humidityAvg: 55, solarIrradiancePeak: 950, solarRadiationDaily: 7.2, windSpeedAvg: 5.0, windDirection: 225, coolingDegreeDays: 780, heatingDegreeDays: 0 },
  { emirate: "ras_al_khaimah", month: 12, tempMaxAvg: 24.5, tempMinAvg: 13.5, designTempCooling: 44.0, designTempHeating: 9.0, humidityAvg: 63, solarIrradiancePeak: 640, solarRadiationDaily: 3.9, windSpeedAvg: 3.2, windDirection: 315, coolingDegreeDays: 210, heatingDegreeDays: 14 },
  // Fujairah
  { emirate: "fujairah", month: 1, tempMaxAvg: 24.0, tempMinAvg: 14.0, designTempCooling: 42.0, designTempHeating: 12.0, humidityAvg: 70, solarIrradiancePeak: 650, solarRadiationDaily: 4.0, windSpeedAvg: 2.8, windDirection: 45, coolingDegreeDays: 180, heatingDegreeDays: 11 },
  { emirate: "fujairah", month: 7, tempMaxAvg: 41.0, tempMinAvg: 30.5, designTempCooling: 42.0, designTempHeating: 12.0, humidityAvg: 68, solarIrradiancePeak: 920, solarRadiationDaily: 6.8, windSpeedAvg: 4.5, windDirection: 45, coolingDegreeDays: 720, heatingDegreeDays: 0 },
  { emirate: "fujairah", month: 12, tempMaxAvg: 25.5, tempMinAvg: 15.5, designTempCooling: 42.0, designTempHeating: 12.0, humidityAvg: 71, solarIrradiancePeak: 630, solarRadiationDaily: 3.8, windSpeedAvg: 2.8, windDirection: 45, coolingDegreeDays: 232, heatingDegreeDays: 7 },
];

for (const row of climateRows) {
  await db.execute(
    `INSERT INTO climate_data (emirate, month, tempMaxAvg, tempMinAvg, designTempCooling, designTempHeating, humidityAvg, solarIrradiancePeak, solarRadiationDaily, windSpeedAvg, windDirection, coolingDegreeDays, heatingDegreeDays, source, lastUpdated, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE tempMaxAvg=VALUES(tempMaxAvg), tempMinAvg=VALUES(tempMinAvg)`,
    [row.emirate, row.month, row.tempMaxAvg, row.tempMinAvg, row.designTempCooling, row.designTempHeating,
     row.humidityAvg, row.solarIrradiancePeak, row.solarRadiationDaily, row.windSpeedAvg, row.windDirection,
     row.coolingDegreeDays, row.heatingDegreeDays, "UAE NMC / ASHRAE Fundamentals 2021"]
  );
}
console.log(`  ✅ ${climateRows.length} climate records inserted`);

// ─────────────────────────────────────────────
// 2. BUILDING CODES — DBC + ADIBC Key Sections
// ─────────────────────────────────────────────
console.log("📋 Seeding building_codes...");

const buildingCodeRows = [
  // DBC — Structural
  { codeSystem: "DBC", chapter: "الجزء الثالث - الهياكل الإنشائية", sectionNumber: "3.1.1", titleAr: "الحد الأدنى لأحمال الرياح", titleEn: "Minimum Wind Loads", contentAr: "يجب أن تُصمَّم جميع المباني في دبي لتحمّل أحمال رياح لا تقل عن 0.7 كيلو نيوتن/م² للمباني حتى 10 طوابق، و1.0 كيلو نيوتن/م² للمباني من 10 إلى 30 طابقاً، و1.4 كيلو نيوتن/م² للمباني التي تتجاوز 30 طابقاً. يُرجع إلى BS EN 1991-1-4 لحسابات تفصيلية.", contentEn: "All buildings in Dubai shall be designed to resist wind loads of not less than 0.7 kN/m² for buildings up to 10 floors, 1.0 kN/m² for 10-30 floors, and 1.4 kN/m² for buildings exceeding 30 floors. Refer to BS EN 1991-1-4 for detailed calculations.", category: "structural", tags: "wind,loads,structural,design", minValue: 0.7, maxValue: 1.4, unit: "kN/m²", edition: "2021", emirate: "dubai" },
  { codeSystem: "DBC", chapter: "الجزء الثالث - الهياكل الإنشائية", sectionNumber: "3.2.1", titleAr: "الحد الأدنى لمقاومة الخرسانة", titleEn: "Minimum Concrete Strength", contentAr: "يجب أن تكون مقاومة الخرسانة الاسطوانية (fck) لا تقل عن 25 ميجاباسكال للعناصر الإنشائية العادية، و30 ميجاباسكال للأعمدة والجدران الحاملة، و35 ميجاباسكال للأساسات والعناصر المعرضة للتربة أو المياه الجوفية.", contentEn: "Minimum concrete cylinder strength (fck) shall be 25 MPa for general structural elements, 30 MPa for columns and load-bearing walls, and 35 MPa for foundations and elements exposed to soil or groundwater.", category: "structural", tags: "concrete,strength,materials,foundation", minValue: 25, maxValue: 50, unit: "MPa", edition: "2021", emirate: "dubai" },
  { codeSystem: "DBC", chapter: "الجزء الرابع - السلامة من الحريق", sectionNumber: "4.1.2", titleAr: "الحد الأقصى لمسافة الإخلاء", titleEn: "Maximum Travel Distance", contentAr: "الحد الأقصى لمسافة الإخلاء من أي نقطة في المبنى إلى أقرب مخرج: 45 متراً في المباني المزودة برشاشات مياه، و30 متراً في المباني غير المزودة بها. للمباني السكنية: 35 متراً مع رشاشات، 25 متراً بدونها.", contentEn: "Maximum travel distance from any point in a building to the nearest exit: 45m in sprinklered buildings, 30m in non-sprinklered buildings. For residential: 35m with sprinklers, 25m without.", category: "fire_safety", tags: "fire,evacuation,exit,travel_distance", minValue: 25, maxValue: 45, unit: "m", edition: "2021", emirate: "dubai" },
  { codeSystem: "DBC", chapter: "الجزء الرابع - السلامة من الحريق", sectionNumber: "4.2.1", titleAr: "الحد الأدنى لعرض مخارج الطوارئ", titleEn: "Minimum Exit Width", contentAr: "يجب ألا يقل عرض مخارج الطوارئ عن 900 مم للمباني السكنية، و1200 مم للمباني التجارية والمكتبية، و1500 مم للمستشفيات والمدارس والتجمعات الكبيرة.", contentEn: "Minimum exit width: 900mm for residential buildings, 1200mm for commercial and office buildings, 1500mm for hospitals, schools, and large assembly occupancies.", category: "fire_safety", tags: "fire,exit,width,evacuation", minValue: 900, maxValue: 1500, unit: "mm", edition: "2021", emirate: "dubai" },
  { codeSystem: "DBC", chapter: "الجزء السادس - كفاءة الطاقة", sectionNumber: "6.1.1", titleAr: "الحد الأقصى لمعامل الانتقال الحراري للجدران", titleEn: "Maximum U-Value for Walls", contentAr: "يجب ألا يتجاوز معامل الانتقال الحراري (U-Value) للجدران الخارجية 0.57 واط/م²·كلفن للمباني السكنية، و0.44 واط/م²·كلفن للمباني التجارية والمكتبية. هذا وفقاً لكود الطاقة الإماراتي ESMA 2010.", contentEn: "Maximum U-Value for external walls: 0.57 W/m²·K for residential buildings, 0.44 W/m²·K for commercial and office buildings. Per UAE ESMA Energy Code 2010.", category: "energy", tags: "energy,thermal,u-value,insulation,walls", minValue: 0.3, maxValue: 0.57, unit: "W/m²·K", edition: "2021", emirate: "dubai" },
  { codeSystem: "DBC", chapter: "الجزء السادس - كفاءة الطاقة", sectionNumber: "6.1.2", titleAr: "الحد الأقصى لمعامل الانتقال الحراري للأسقف", titleEn: "Maximum U-Value for Roofs", contentAr: "يجب ألا يتجاوز معامل الانتقال الحراري للأسقف 0.30 واط/م²·كلفن للمباني السكنية، و0.25 واط/م²·كلفن للمباني التجارية. الأسقف هي المصدر الرئيسي للكسب الحراري في المناخ الإماراتي.", contentEn: "Maximum U-Value for roofs: 0.30 W/m²·K for residential, 0.25 W/m²·K for commercial. Roofs are the primary source of heat gain in UAE climate.", category: "energy", tags: "energy,thermal,u-value,insulation,roof", minValue: 0.2, maxValue: 0.30, unit: "W/m²·K", edition: "2021", emirate: "dubai" },
  { codeSystem: "DBC", chapter: "الجزء السادس - كفاءة الطاقة", sectionNumber: "6.1.3", titleAr: "الحد الأقصى لمعامل كسب الحرارة الشمسية للزجاج", titleEn: "Maximum SHGC for Glazing", contentAr: "يجب ألا يتجاوز معامل كسب الحرارة الشمسية (SHGC) للزجاج الخارجي 0.25 للواجهات المواجهة للجنوب والغرب، و0.30 للواجهات المواجهة للشمال والشرق. يُنصح باستخدام زجاج عازل مزدوج (Double Glazing) مع طلاء منخفض الانبعاث (Low-E).", contentEn: "Maximum SHGC for external glazing: 0.25 for south and west-facing facades, 0.30 for north and east-facing facades. Double glazing with Low-E coating is recommended.", category: "energy", tags: "energy,glazing,shgc,solar,windows", minValue: 0.20, maxValue: 0.30, unit: "dimensionless", edition: "2021", emirate: "dubai" },
  { codeSystem: "DBC", chapter: "الجزء الثاني - التخطيط والاشتراطات", sectionNumber: "2.1.1", titleAr: "الحد الأدنى لارتفاع الطابق السكني", titleEn: "Minimum Floor-to-Floor Height Residential", contentAr: "يجب ألا يقل الارتفاع الصافي (من الأرضية إلى السقف) في الوحدات السكنية عن 2.7 متر للطوابق العادية، و3.0 متر للطابق الأرضي. الارتفاع الإجمالي من طابق لطابق لا يقل عن 3.0 متر.", contentEn: "Minimum clear height (floor to ceiling) in residential units: 2.7m for typical floors, 3.0m for ground floor. Minimum floor-to-floor height: 3.0m.", category: "zoning", tags: "height,residential,floor,ceiling", minValue: 2.7, maxValue: null, unit: "m", edition: "2021", emirate: "dubai" },
  { codeSystem: "DBC", chapter: "الجزء الثاني - التخطيط والاشتراطات", sectionNumber: "2.2.1", titleAr: "الحد الأدنى لمساحة غرفة النوم", titleEn: "Minimum Bedroom Area", contentAr: "الحد الأدنى لمساحة غرفة النوم الرئيسية 12 م²، وغرفة النوم الثانوية 9 م². يجب أن يكون أصغر بُعد في غرفة النوم لا يقل عن 2.5 متر.", contentEn: "Minimum bedroom area: master bedroom 12 m², secondary bedroom 9 m². Minimum dimension in any bedroom: 2.5m.", category: "zoning", tags: "bedroom,area,residential,minimum", minValue: 9, maxValue: null, unit: "m²", edition: "2021", emirate: "dubai" },
  // ADIBC — Abu Dhabi
  { codeSystem: "ADIBC", chapter: "الفصل الثالث - المتطلبات الإنشائية", sectionNumber: "R301.1", titleAr: "متطلبات التصميم الزلزالي", titleEn: "Seismic Design Requirements", contentAr: "تقع إمارة أبوظبي في منطقة زلزالية منخفضة إلى متوسطة. يجب تطبيق متطلبات ASCE 7 للمنطقة الزلزالية B كحد أدنى. التسارع الطيفي الزلزالي المرجعي Ss = 0.25g، S1 = 0.10g.", contentEn: "Abu Dhabi is in a low-to-moderate seismic zone. ASCE 7 Seismic Zone B requirements apply as minimum. Reference spectral acceleration: Ss = 0.25g, S1 = 0.10g.", category: "structural", tags: "seismic,structural,abudhabi,earthquake", minValue: null, maxValue: null, unit: null, edition: "2013", emirate: "abu_dhabi" },
  { codeSystem: "ADIBC", chapter: "الفصل السادس - كفاءة الطاقة", sectionNumber: "C401.1", titleAr: "الحد الأقصى لكثافة الإضاءة الداخلية", titleEn: "Maximum Interior Lighting Power Density", contentAr: "الحد الأقصى لكثافة طاقة الإضاءة الداخلية: المكاتب 10.8 واط/م²، المحلات التجارية 16.1 واط/م²، الفنادق 11.0 واط/م²، المستشفيات 11.8 واط/م²، المساكن 6.7 واط/م². وفقاً لـ ASHRAE 90.1-2010.", contentEn: "Maximum interior lighting power density: Offices 10.8 W/m², Retail 16.1 W/m², Hotels 11.0 W/m², Hospitals 11.8 W/m², Residential 6.7 W/m². Per ASHRAE 90.1-2010.", category: "energy", tags: "lighting,energy,power_density,efficiency", minValue: null, maxValue: 16.1, unit: "W/m²", edition: "2013", emirate: "abu_dhabi" },
  // UAE Fire Code
  { codeSystem: "UAE_FIRE", chapter: "الفصل الثاني - أنظمة الإطفاء", sectionNumber: "2.1.1", titleAr: "إلزامية نظام الرشاشات", titleEn: "Mandatory Sprinkler Systems", contentAr: "يجب تركيب نظام رشاشات مياه تلقائي في: جميع المباني التي يتجاوز ارتفاعها 15 متراً، والمباني التجارية التي تتجاوز مساحتها 1000 م²، وجميع الفنادق والمستشفيات والمدارس بصرف النظر عن الارتفاع.", contentEn: "Automatic sprinkler systems are mandatory in: all buildings exceeding 15m height, commercial buildings exceeding 1000 m², all hotels, hospitals, and schools regardless of height.", category: "fire_safety", tags: "fire,sprinkler,mandatory,height", minValue: 15, maxValue: null, unit: "m", edition: "2018", emirate: "all" },
  { codeSystem: "UAE_FIRE", chapter: "الفصل الثالث - أنظمة الإنذار", sectionNumber: "3.1.1", titleAr: "إلزامية أنظمة الإنذار بالحريق", titleEn: "Mandatory Fire Alarm Systems", contentAr: "يجب تركيب نظام إنذار حريق معتمد في جميع المباني التي تتجاوز مساحتها 500 م² أو ارتفاعها 12 متراً. يجب أن يكون النظام متصلاً بمركز الدفاع المدني المحلي.", contentEn: "Certified fire alarm systems are mandatory in all buildings exceeding 500 m² or 12m height. Systems must be connected to the local Civil Defense center.", category: "fire_safety", tags: "fire,alarm,mandatory,civil_defense", minValue: 500, maxValue: null, unit: "m²", edition: "2018", emirate: "all" },
  // ESMA Energy Code
  { codeSystem: "ESMA_ENERGY", chapter: "الفصل الرابع - المغلف الحراري", sectionNumber: "4.3.1", titleAr: "نسبة مساحة النوافذ إلى الجدران", titleEn: "Window-to-Wall Ratio", contentAr: "يجب ألا تتجاوز نسبة مساحة النوافذ إلى إجمالي مساحة الجدران الخارجية (WWR) 40% للمباني التجارية، و30% للمباني السكنية. الزيادة عن هذه النسب تتطلب تعويضاً بتحسين عزل الجدران أو استخدام زجاج ذو أداء عالٍ.", contentEn: "Window-to-Wall Ratio (WWR) shall not exceed 40% for commercial buildings, 30% for residential. Exceeding these ratios requires compensation through improved wall insulation or high-performance glazing.", category: "energy", tags: "energy,wwr,windows,glazing,ratio", minValue: null, maxValue: 40, unit: "%", edition: "2010", emirate: "all" },
];

for (const row of buildingCodeRows) {
  await db.execute(
    `INSERT INTO building_codes (codeSystem, chapter, sectionNumber, titleAr, titleEn, contentAr, contentEn, category, tags, \`minValue\`, \`maxValue\`, unit, edition, emirate, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE contentAr=VALUES(contentAr), contentEn=VALUES(contentEn)`,
    [row.codeSystem, row.chapter, row.sectionNumber, row.titleAr, row.titleEn, row.contentAr, row.contentEn,
     row.category, row.tags, row.minValue ?? null, row.maxValue ?? null, row.unit ?? null, row.edition, row.emirate]
  );
}
console.log(`  ✅ ${buildingCodeRows.length} building code records inserted`);

// ─────────────────────────────────────────────
// 3. CONSTRUCTION MATERIALS
// ─────────────────────────────────────────────
console.log("🧱 Seeding construction_materials...");

const materialRows = [
  { nameAr: "خرسانة عادية C25", nameEn: "Normal Concrete C25", category: "concrete", thermalConductivity: 1.65, density: 2300, specificHeat: 840, priceAed: 280, priceUnit: "m³", suppliers: "CEMEX UAE, Unibeton, Gulf Precast" },
  { nameAr: "خرسانة عادية C30", nameEn: "Normal Concrete C30", category: "concrete", thermalConductivity: 1.70, density: 2350, specificHeat: 840, priceAed: 320, priceUnit: "m³", suppliers: "CEMEX UAE, Unibeton, Gulf Precast" },
  { nameAr: "طوب خفيف AAC (Ytong)", nameEn: "AAC Lightweight Block", category: "masonry", thermalConductivity: 0.16, thermalResistance: 0.625, density: 600, specificHeat: 1000, priceAed: 45, priceUnit: "m²", suppliers: "Xella UAE, Ytong UAE" },
  { nameAr: "طوب أسمنتي 200مم", nameEn: "CMU Block 200mm", category: "masonry", thermalConductivity: 0.72, density: 1800, specificHeat: 840, priceAed: 28, priceUnit: "m²", suppliers: "Emirates Precast, Gulf Precast" },
  { nameAr: "لوح عزل EPS 50مم", nameEn: "EPS Insulation Board 50mm", category: "insulation", thermalConductivity: 0.038, thermalResistance: 1.32, density: 20, specificHeat: 1450, priceAed: 35, priceUnit: "m²", suppliers: "Armacell, Knauf UAE" },
  { nameAr: "لوح عزل XPS 50مم", nameEn: "XPS Insulation Board 50mm", category: "insulation", thermalConductivity: 0.034, thermalResistance: 1.47, density: 35, specificHeat: 1450, priceAed: 55, priceUnit: "m²", suppliers: "Styrofoam, Ravago" },
  { nameAr: "عزل صوف صخري 100مم", nameEn: "Rock Wool Insulation 100mm", category: "insulation", thermalConductivity: 0.040, thermalResistance: 2.50, density: 80, specificHeat: 840, priceAed: 85, priceUnit: "m²", suppliers: "Rockwool UAE, Isover" },
  { nameAr: "زجاج مزدوج Low-E 6+12+6مم", nameEn: "Double Glazing Low-E 6+12+6mm", category: "glass", thermalConductivity: null, uValue: 1.6, shgc: 0.25, vlt: 0.65, priceAed: 320, priceUnit: "m²", suppliers: "Guardian Glass, AGC UAE, Emirates Glass" },
  { nameAr: "زجاج مزدوج عادي 6+12+6مم", nameEn: "Double Glazing Clear 6+12+6mm", category: "glass", thermalConductivity: null, uValue: 2.7, shgc: 0.60, vlt: 0.78, priceAed: 220, priceUnit: "m²", suppliers: "Guardian Glass, AGC UAE" },
  { nameAr: "زجاج مفرد 6مم", nameEn: "Single Glazing 6mm", category: "glass", thermalConductivity: null, uValue: 5.8, shgc: 0.82, vlt: 0.88, priceAed: 85, priceUnit: "m²", suppliers: "Emirates Glass, Guardian Glass" },
  { nameAr: "حديد تسليح 16مم", nameEn: "Rebar 16mm", category: "steel", density: 7850, priceAed: 3200, priceUnit: "ton", suppliers: "Emirates Steel, Hadeed" },
  { nameAr: "بلاط سيراميك 60×60", nameEn: "Ceramic Tile 60x60", category: "finishing", priceAed: 65, priceUnit: "m²", suppliers: "RAK Ceramics, Porcelanosa UAE" },
  { nameAr: "رخام كرارا طبيعي", nameEn: "Carrara Natural Marble", category: "finishing", density: 2700, thermalConductivity: 2.9, priceAed: 450, priceUnit: "m²", suppliers: "Emirates Marble, Stone World UAE" },
  { nameAr: "دهان خارجي أكريليك", nameEn: "Exterior Acrylic Paint", category: "finishing", priceAed: 25, priceUnit: "m²", suppliers: "Jotun UAE, Dulux UAE, Sigma" },
  { nameAr: "عازل مائي بيتوميني", nameEn: "Bituminous Waterproofing", category: "waterproofing", priceAed: 85, priceUnit: "m²", suppliers: "Sika UAE, BASF UAE, Mapei" },
];

for (const row of materialRows) {
  await db.execute(
    `INSERT INTO construction_materials (nameAr, nameEn, category, thermalConductivity, thermalResistance, density, specificHeat, uValue, shgc, vlt, priceAed, priceUnit, suppliers, lastUpdated, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE priceAed=VALUES(priceAed)`,
    [row.nameAr, row.nameEn, row.category, row.thermalConductivity ?? null, row.thermalResistance ?? null,
     row.density ?? null, row.specificHeat ?? null, row.uValue ?? null, row.shgc ?? null, row.vlt ?? null,
     row.priceAed ?? null, row.priceUnit ?? null, row.suppliers ?? null]
  );
}
console.log(`  ✅ ${materialRows.length} material records inserted`);

// ─────────────────────────────────────────────
// 4. CALCULATION RULES
// ─────────────────────────────────────────────
console.log("🔢 Seeding calculation_rules...");

const calcRules = [
  {
    platform: "harara", nameAr: "حساب الحمل الحراري للتبريد (CLTD Method)", nameEn: "Cooling Load Calculation (CLTD)",
    category: "hvac_cooling",
    formulaAr: "الحمل الحراري = U × A × CLTD\nحيث:\n- U = معامل الانتقال الحراري (واط/م²·كلفن)\n- A = مساحة العنصر (م²)\n- CLTD = فرق درجة الحرارة المصحح للتبريد (كلفن)\n\nللجدران الخارجية في دبي: CLTD تتراوح من 8 إلى 38 كلفن حسب الاتجاه والوقت\nللأسقف: CLTD تتراوح من 25 إلى 55 كلفن",
    formulaEn: "Cooling Load = U × A × CLTD\nWhere:\n- U = Overall heat transfer coefficient (W/m²·K)\n- A = Element area (m²)\n- CLTD = Cooling Load Temperature Difference (K)\n\nFor Dubai external walls: CLTD ranges 8-38K depending on orientation and time\nFor roofs: CLTD ranges 25-55K",
    inputParams: JSON.stringify([
      { name: "uValue", type: "number", unit: "W/m²·K", description: "معامل الانتقال الحراري" },
      { name: "area", type: "number", unit: "m²", description: "مساحة العنصر" },
      { name: "orientation", type: "enum", values: ["N", "S", "E", "W", "Roof"], description: "اتجاه العنصر" },
      { name: "emirate", type: "enum", values: ["dubai", "abu_dhabi", "sharjah"], description: "الإمارة" }
    ]),
    outputParams: JSON.stringify([{ name: "coolingLoad", type: "number", unit: "W", description: "الحمل الحراري للتبريد" }]),
    formulaLogic: JSON.stringify({ method: "CLTD", standard: "ASHRAE Handbook Fundamentals 2021", cltdValues: { N: 12, S: 25, E: 20, W: 35, Roof: 45 } }),
    referenceStandard: "ASHRAE Handbook Fundamentals 2021, Chapter 18", emirate: "all", priority: 10
  },
  {
    platform: "harara", nameAr: "حساب الحمل الحراري للزجاج (Solar Gain)", nameEn: "Solar Heat Gain through Glazing",
    category: "hvac_solar",
    formulaAr: "كسب الحرارة الشمسية = SHGC × A × SHGF × SC\nحيث:\n- SHGC = معامل كسب الحرارة الشمسية للزجاج\n- A = مساحة الزجاج (م²)\n- SHGF = عامل الإشعاع الشمسي (واط/م²) — لدبي: الجنوب=650، الغرب=850، الشرق=750، الشمال=350\n- SC = معامل الظل (إن وجد)",
    formulaEn: "Solar Heat Gain = SHGC × A × SHGF × SC\nWhere:\n- SHGC = Solar Heat Gain Coefficient of glazing\n- A = Glazing area (m²)\n- SHGF = Solar Heat Gain Factor (W/m²) — Dubai: S=650, W=850, E=750, N=350\n- SC = Shading Coefficient (if applicable)",
    inputParams: JSON.stringify([
      { name: "shgc", type: "number", unit: "dimensionless", description: "معامل كسب الحرارة الشمسية" },
      { name: "area", type: "number", unit: "m²", description: "مساحة الزجاج" },
      { name: "orientation", type: "enum", values: ["N", "S", "E", "W"], description: "اتجاه الواجهة" }
    ]),
    outputParams: JSON.stringify([{ name: "solarGain", type: "number", unit: "W", description: "كسب الحرارة الشمسية" }]),
    formulaLogic: JSON.stringify({ method: "SHGF", shgfDubai: { N: 350, S: 650, E: 750, W: 850 }, shgfAbuDhabi: { N: 360, S: 680, E: 780, W: 880 } }),
    referenceStandard: "ASHRAE 90.1-2019, ESMA Energy Code 2010", emirate: "all", priority: 10
  },
  {
    platform: "harara", nameAr: "حساب حجم وحدة التكييف المركزي", nameEn: "Central AC Unit Sizing",
    category: "hvac_sizing",
    formulaAr: "القدرة التبريدية (طن تبريد) = إجمالي الحمل الحراري (واط) ÷ 3517\nقاعدة الإبهام للمناخ الإماراتي:\n- المساكن: 150-200 واط/م²\n- المكاتب: 120-160 واط/م²\n- المحلات: 200-300 واط/م²\nمثال: شقة 150م² = 150 × 175 = 26,250 واط = 7.5 طن تبريد",
    formulaEn: "Cooling capacity (TR) = Total cooling load (W) ÷ 3517\nRule of thumb for UAE climate:\n- Residential: 150-200 W/m²\n- Offices: 120-160 W/m²\n- Retail: 200-300 W/m²\nExample: 150m² apartment = 150 × 175 = 26,250 W = 7.5 TR",
    inputParams: JSON.stringify([
      { name: "area", type: "number", unit: "m²", description: "مساحة المبنى" },
      { name: "buildingType", type: "enum", values: ["residential", "office", "retail", "hotel"], description: "نوع المبنى" },
      { name: "totalCoolingLoad", type: "number", unit: "W", description: "الحمل الحراري الإجمالي (اختياري)" }
    ]),
    outputParams: JSON.stringify([
      { name: "capacityTR", type: "number", unit: "TR", description: "القدرة التبريدية بالطن" },
      { name: "capacityKW", type: "number", unit: "kW", description: "القدرة التبريدية بالكيلوواط" }
    ]),
    formulaLogic: JSON.stringify({ conversionFactor: 3517, ruleOfThumb: { residential: 175, office: 140, retail: 250, hotel: 200 } }),
    referenceStandard: "ASHRAE Handbook HVAC Applications 2019", emirate: "all", priority: 8
  },
  {
    platform: "maskan", nameAr: "حساب القدرة على تحمل قرض الرهن العقاري", nameEn: "Mortgage Affordability Calculator",
    category: "real_estate_finance",
    formulaAr: "الحد الأقصى للقسط الشهري = صافي الدخل الشهري × 50%\nقيمة القرض = القسط الشهري × [(1 - (1+r)^-n) / r]\nحيث:\n- r = معدل الفائدة الشهري (معدل سنوي ÷ 12)\n- n = عدد الأشهر (سنوات × 12)\nالدفعة الأولى في الإمارات: 20% للمواطنين، 25% للمقيمين\nالحد الأقصى للقرض: 80% من قيمة العقار للمواطنين، 75% للمقيمين",
    formulaEn: "Max monthly payment = Net monthly income × 50%\nLoan amount = Monthly payment × [(1 - (1+r)^-n) / r]\nWhere:\n- r = monthly interest rate (annual rate ÷ 12)\n- n = number of months (years × 12)\nDown payment UAE: 20% for nationals, 25% for residents\nMax LTV: 80% for nationals, 75% for residents",
    inputParams: JSON.stringify([
      { name: "monthlyIncome", type: "number", unit: "AED", description: "صافي الدخل الشهري" },
      { name: "annualRate", type: "number", unit: "%", description: "معدل الفائدة السنوي" },
      { name: "loanYears", type: "number", unit: "years", description: "مدة القرض بالسنوات" },
      { name: "nationality", type: "enum", values: ["national", "resident"], description: "الجنسية" }
    ]),
    outputParams: JSON.stringify([
      { name: "maxMonthlyPayment", type: "number", unit: "AED", description: "الحد الأقصى للقسط الشهري" },
      { name: "maxLoanAmount", type: "number", unit: "AED", description: "الحد الأقصى للقرض" },
      { name: "minDownPayment", type: "number", unit: "%", description: "الدفعة الأولى المطلوبة" }
    ]),
    formulaLogic: JSON.stringify({ debtToIncomeRatio: 0.5, maxLtvNational: 0.80, maxLtvResident: 0.75, downPaymentNational: 0.20, downPaymentResident: 0.25 }),
    referenceStandard: "UAE Central Bank Mortgage Regulations 2013 (amended 2021)", emirate: "all", priority: 10
  },
  {
    platform: "code", nameAr: "حساب عدد مخارج الطوارئ المطلوبة", nameEn: "Required Number of Emergency Exits",
    category: "fire_safety",
    formulaAr: "عدد المخارج المطلوبة حسب DBC:\n- حتى 49 شخص: مخرج واحد كافٍ\n- 50-499 شخص: مخرجان على الأقل\n- 500-999 شخص: 3 مخارج على الأقل\n- 1000+ شخص: 4 مخارج على الأقل\nالحمولة القصوى = مساحة الطابق (م²) ÷ معامل الإشغال\nمعامل الإشغال: مكاتب=9.3م²/شخص، محلات=2.8م²/شخص، مطاعم=1.4م²/شخص",
    formulaEn: "Required exits per DBC:\n- Up to 49 persons: 1 exit sufficient\n- 50-499 persons: minimum 2 exits\n- 500-999 persons: minimum 3 exits\n- 1000+ persons: minimum 4 exits\nOccupant load = Floor area (m²) ÷ Occupant load factor\nLoad factors: Offices=9.3m²/person, Retail=2.8m²/person, Restaurant=1.4m²/person",
    inputParams: JSON.stringify([
      { name: "floorArea", type: "number", unit: "m²", description: "مساحة الطابق" },
      { name: "buildingUse", type: "enum", values: ["office", "retail", "restaurant", "residential", "assembly"], description: "استخدام المبنى" }
    ]),
    outputParams: JSON.stringify([
      { name: "occupantLoad", type: "number", unit: "persons", description: "الحمولة القصوى من الأشخاص" },
      { name: "requiredExits", type: "number", unit: "exits", description: "عدد المخارج المطلوبة" }
    ]),
    formulaLogic: JSON.stringify({ occupantLoadFactors: { office: 9.3, retail: 2.8, restaurant: 1.4, residential: 18.6, assembly: 0.65 }, exitRequirements: [{ max: 49, exits: 1 }, { max: 499, exits: 2 }, { max: 999, exits: 3 }, { max: 9999, exits: 4 }] }),
    referenceStandard: "DBC 2021 Part 4, NFPA 101 Life Safety Code", emirate: "dubai", priority: 10
  },
  {
    platform: "raqaba", nameAr: "حساب نسبة التقدم الإنشائي", nameEn: "Construction Progress Calculation",
    category: "site_inspection",
    formulaAr: "نسبة التقدم الإجمالية = Σ (وزن المرحلة × نسبة إنجاز المرحلة)\nأوزان المراحل الإنشائية المعيارية:\n- الأساسات: 15%\n- الهيكل الإنشائي: 35%\n- الجدران والتشطيبات الخارجية: 20%\n- التشطيبات الداخلية: 20%\n- الأعمال الميكانيكية والكهربائية: 10%",
    formulaEn: "Overall progress = Σ (Phase weight × Phase completion %)\nStandard construction phase weights:\n- Foundations: 15%\n- Structural frame: 35%\n- External walls & finishes: 20%\n- Internal finishes: 20%\n- MEP works: 10%",
    inputParams: JSON.stringify([
      { name: "foundationsComplete", type: "number", unit: "%", description: "نسبة إنجاز الأساسات" },
      { name: "structureComplete", type: "number", unit: "%", description: "نسبة إنجاز الهيكل" },
      { name: "externalComplete", type: "number", unit: "%", description: "نسبة إنجاز الخارجي" },
      { name: "internalComplete", type: "number", unit: "%", description: "نسبة إنجاز الداخلي" },
      { name: "mepComplete", type: "number", unit: "%", description: "نسبة إنجاز الميكانيكي والكهربائي" }
    ]),
    outputParams: JSON.stringify([{ name: "overallProgress", type: "number", unit: "%", description: "نسبة التقدم الإجمالية" }]),
    formulaLogic: JSON.stringify({ weights: { foundations: 0.15, structure: 0.35, external: 0.20, internal: 0.20, mep: 0.10 } }),
    referenceStandard: "CIOB Construction Progress Monitoring Best Practices", emirate: "all", priority: 8
  },
];

for (const rule of calcRules) {
  await db.execute(
    `INSERT INTO calculation_rules (platform, nameAr, nameEn, category, formulaAr, formulaEn, inputParams, outputParams, formulaLogic, referenceStandard, emirate, priority, isActive, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
     ON DUPLICATE KEY UPDATE formulaAr=VALUES(formulaAr)`,
    [rule.platform, rule.nameAr, rule.nameEn, rule.category, rule.formulaAr, rule.formulaEn,
     rule.inputParams, rule.outputParams, rule.formulaLogic, rule.referenceStandard, rule.emirate, rule.priority]
  );
}
console.log(`  ✅ ${calcRules.length} calculation rules inserted`);

// ─────────────────────────────────────────────
// 5. DESIGN STANDARDS (for فضاء platform)
// ─────────────────────────────────────────────
console.log("🎨 Seeding design_standards...");

const designStds = [
  { category: "space_planning", titleAr: "الحد الأدنى لمساحة غرفة المعيشة", titleEn: "Minimum Living Room Area", contentAr: "الحد الأدنى الموصى به لغرفة المعيشة في الوحدات السكنية الإماراتية: 20-25 م² للشقق الصغيرة (استوديو - غرفة نوم)، 30-40 م² للشقق المتوسطة (2-3 غرف)، 45-60 م² للفلل والوحدات الكبيرة. يُراعى أن الثقافة الإماراتية تُفضل مجالس واسعة.", contentEn: "Minimum recommended living room area for UAE residential units: 20-25m² for small apartments (studio-1BR), 30-40m² for medium (2-3BR), 45-60m² for villas. UAE culture prefers spacious majlis areas.", minValue: 20, maxValue: 60, unit: "m²", source: "UAE Housing Standards, DBC 2021", tags: "living_room,area,residential,uae" },
  { category: "lighting", titleAr: "مستويات الإضاءة الموصى بها", titleEn: "Recommended Illuminance Levels", contentAr: "مستويات الإضاءة الموصى بها (لوكس) حسب CIBSE:\n- غرفة المعيشة: 100-300 لوكس (عام)، 300-500 (قراءة)\n- غرفة النوم: 100-200 لوكس (عام)، 300 (مرآة)\n- المطبخ: 300-500 لوكس (عام)، 500-750 (سطح العمل)\n- المكتب: 300-500 لوكس\n- الممرات: 50-100 لوكس", contentEn: "Recommended illuminance levels (lux) per CIBSE:\n- Living room: 100-300 lux (general), 300-500 (reading)\n- Bedroom: 100-200 lux (general), 300 (mirror)\n- Kitchen: 300-500 lux (general), 500-750 (work surface)\n- Office: 300-500 lux\n- Corridors: 50-100 lux", minValue: 50, maxValue: 750, unit: "lux", source: "CIBSE LG3, IESNA Lighting Handbook", tags: "lighting,lux,illuminance,interior" },
  { category: "color_theory", titleAr: "الألوان الملائمة للمناخ الإماراتي", titleEn: "Colors Suitable for UAE Climate", contentAr: "في المناخ الإماراتي الحار، يُنصح بـ:\n- الألوان الفاتحة والباردة للجدران الخارجية (بيضاء، رمادية فاتحة، كريمية) لتعكس الإشعاع الشمسي\n- الألوان الدافئة الهادئة للداخل (بيج، كريمي، رمادي دافئ) لإيجاد جو مريح\n- تجنب الألوان الداكنة في الغرف ذات الإضاءة الطبيعية المحدودة\n- اللون الأبيض يعكس 80-90% من الإشعاع الشمسي مقارنة بـ 10-20% للألوان الداكنة", contentEn: "For UAE hot climate:\n- Light, cool colors for external walls (white, light gray, cream) to reflect solar radiation\n- Warm, calm colors for interiors (beige, cream, warm gray) for comfortable atmosphere\n- Avoid dark colors in rooms with limited natural light\n- White reflects 80-90% of solar radiation vs 10-20% for dark colors", minValue: null, maxValue: null, unit: null, source: "UAE Green Building Council, ASHRAE 90.1", tags: "color,climate,uae,solar,exterior" },
  { category: "cultural_uae", titleAr: "المجلس الإماراتي - المتطلبات والأبعاد", titleEn: "UAE Majlis - Requirements and Dimensions", contentAr: "المجلس هو قلب المنزل الإماراتي. المتطلبات الأساسية:\n- المساحة: 25-50 م² للمنازل المتوسطة، 60-100 م² للفلل الكبيرة\n- الشكل: مستطيل أو L-Shape مع جلوس على الجانبين\n- الارتفاع: 3.0-3.5 متر للشعور بالفخامة\n- مدخل مستقل عن باقي المنزل لاستقبال الضيوف\n- إضاءة خافتة قابلة للتعديل\n- تكييف قوي (المجلس يستقبل أعداداً كبيرة)", contentEn: "Majlis is the heart of UAE home. Key requirements:\n- Area: 25-50m² for medium homes, 60-100m² for large villas\n- Shape: rectangular or L-shape with seating on sides\n- Height: 3.0-3.5m for sense of grandeur\n- Separate entrance from rest of home for guests\n- Dimmable lighting\n- Strong AC (majlis hosts large gatherings)", minValue: 25, maxValue: 100, unit: "m²", source: "UAE Cultural Heritage Authority, Traditional Architecture Guidelines", tags: "majlis,uae,cultural,traditional,living" },
  { category: "furniture", titleAr: "مسافات التنقل حول الأثاث", titleEn: "Furniture Clearance Distances", contentAr: "المسافات الدنيا الموصى بها للتنقل:\n- الممر الرئيسي: 90 سم على الأقل\n- الممر الثانوي: 60 سم\n- أمام الأريكة: 45-60 سم للطاولة\n- حول طاولة الطعام: 90 سم للكراسي + 45 سم للمرور\n- أمام الخزانة: 90 سم لفتح الأبواب\n- حول السرير: 60-75 سم للجانبين", contentEn: "Minimum recommended clearance distances:\n- Primary circulation: 90cm minimum\n- Secondary circulation: 60cm\n- In front of sofa: 45-60cm for coffee table\n- Around dining table: 90cm for chairs + 45cm for passing\n- In front of wardrobe: 90cm for door opening\n- Around bed: 60-75cm on both sides", minValue: 45, maxValue: 90, unit: "cm", source: "Neufert Architects Data, Human Dimension & Interior Space", tags: "furniture,clearance,circulation,ergonomics" },
];

for (const std of designStds) {
  await db.execute(
    `INSERT INTO design_standards (category, titleAr, titleEn, contentAr, contentEn, \`minValue\`, \`maxValue\`, unit, source, tags, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE contentAr=VALUES(contentAr)`,
    [std.category, std.titleAr, std.titleEn, std.contentAr, std.contentEn, std.minValue ?? null, std.maxValue ?? null, std.unit ?? null, std.source, std.tags]
  );
}
console.log(`  ✅ ${designStds.length} design standards inserted`);

// ─────────────────────────────────────────────
// 6. PROPERTY MARKET DATA
// ─────────────────────────────────────────────
console.log("🏠 Seeding property_market_data...");

const propertyData = [
  { emirate: "dubai", area: "داون تاون دبي", propertyType: "apartment", avgSalePricePerSqft: 2800, avgRentYearly: 180000, avgServiceCharge: 25, avgRoi: 5.2, mortgageRate: 4.5, transactionsLastQuarter: 450, quarter: "Q4-2024" },
  { emirate: "dubai", area: "دبي مارينا", propertyType: "apartment", avgSalePricePerSqft: 1900, avgRentYearly: 120000, avgServiceCharge: 20, avgRoi: 6.1, mortgageRate: 4.5, transactionsLastQuarter: 680, quarter: "Q4-2024" },
  { emirate: "dubai", area: "جميرا", propertyType: "villa", avgSalePricePerSqft: 1600, avgRentYearly: 350000, avgServiceCharge: 8, avgRoi: 4.8, mortgageRate: 4.5, transactionsLastQuarter: 120, quarter: "Q4-2024" },
  { emirate: "dubai", area: "الخليج التجاري", propertyType: "apartment", avgSalePricePerSqft: 1700, avgRentYearly: 95000, avgServiceCharge: 18, avgRoi: 6.8, mortgageRate: 4.5, transactionsLastQuarter: 520, quarter: "Q4-2024" },
  { emirate: "dubai", area: "مدينة محمد بن راشد", propertyType: "villa", avgSalePricePerSqft: 1400, avgRentYearly: 280000, avgServiceCharge: 10, avgRoi: 5.5, mortgageRate: 4.5, transactionsLastQuarter: 200, quarter: "Q4-2024" },
  { emirate: "dubai", area: "الروضة", propertyType: "apartment", avgSalePricePerSqft: 1100, avgRentYearly: 65000, avgServiceCharge: 15, avgRoi: 7.2, mortgageRate: 4.5, transactionsLastQuarter: 380, quarter: "Q4-2024" },
  { emirate: "abu_dhabi", area: "جزيرة الريم", propertyType: "apartment", avgSalePricePerSqft: 1200, avgRentYearly: 85000, avgServiceCharge: 18, avgRoi: 6.5, mortgageRate: 4.3, transactionsLastQuarter: 290, quarter: "Q4-2024" },
  { emirate: "abu_dhabi", area: "جزيرة السعديات", propertyType: "villa", avgSalePricePerSqft: 2100, avgRentYearly: 450000, avgServiceCharge: 12, avgRoi: 4.2, mortgageRate: 4.3, transactionsLastQuarter: 85, quarter: "Q4-2024" },
  { emirate: "abu_dhabi", area: "الخالدية", propertyType: "apartment", avgSalePricePerSqft: 950, avgRentYearly: 70000, avgServiceCharge: 14, avgRoi: 7.0, mortgageRate: 4.3, transactionsLastQuarter: 180, quarter: "Q4-2024" },
  { emirate: "sharjah", area: "الخان", propertyType: "apartment", avgSalePricePerSqft: 650, avgRentYearly: 35000, avgServiceCharge: 10, avgRoi: 7.8, mortgageRate: 4.8, transactionsLastQuarter: 220, quarter: "Q4-2024" },
];

for (const prop of propertyData) {
  await db.execute(
    `INSERT INTO property_market_data (emirate, area, propertyType, avgSalePricePerSqft, avgRentYearly, avgServiceCharge, avgRoi, mortgageRate, transactionsLastQuarter, quarter, source, lastUpdated, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE avgSalePricePerSqft=VALUES(avgSalePricePerSqft), avgRentYearly=VALUES(avgRentYearly)`,
    [prop.emirate, prop.area, prop.propertyType, prop.avgSalePricePerSqft, prop.avgRentYearly, prop.avgServiceCharge,
     prop.avgRoi, prop.mortgageRate, prop.transactionsLastQuarter, prop.quarter, "DLD / Bayut / Property Finder Q4-2024"]
  );
}
console.log(`  ✅ ${propertyData.length} property market records inserted`);

// ─────────────────────────────────────────────
// 7. FAQ CACHE — Pre-seeded common questions
// ─────────────────────────────────────────────
console.log("💬 Seeding faq_cache...");

const faqRows = [
  {
    platform: "code", questionAr: "ما هو الحد الأدنى لارتفاع السقف في المباني السكنية في دبي؟", questionEn: "What is the minimum ceiling height for residential buildings in Dubai?",
    answerAr: "وفقاً لكود البناء في دبي (DBC 2021)، الحد الأدنى للارتفاع الصافي من الأرضية إلى السقف في الوحدات السكنية هو **2.7 متر** للطوابق العادية، و**3.0 متر** للطابق الأرضي. الارتفاع الإجمالي من طابق لطابق لا يقل عن 3.0 متر. المرجع: DBC 2021، القسم 2.1.1.",
    answerEn: "Per Dubai Building Code (DBC 2021), minimum clear height (floor to ceiling) in residential units is **2.7m** for typical floors and **3.0m** for ground floor. Minimum floor-to-floor height is 3.0m. Reference: DBC 2021, Section 2.1.1.",
    source: "manual", qualityScore: 95
  },
  {
    platform: "code", questionAr: "هل يلزم تركيب رشاشات مياه في المباني السكنية؟", questionEn: "Are sprinkler systems mandatory in residential buildings?",
    answerAr: "نعم، وفقاً لكود الحريق الإماراتي (UAE Fire Code 2018)، يجب تركيب نظام رشاشات مياه تلقائي في:\n- جميع المباني التي يتجاوز ارتفاعها **15 متراً**\n- الفنادق والمستشفيات والمدارس بصرف النظر عن الارتفاع\n- المباني التجارية التي تتجاوز مساحتها 1000 م²\n\nللمباني السكنية التي لا تتجاوز 15 متراً، الرشاشات غير إلزامية لكن يُنصح بها.",
    answerEn: "Yes, per UAE Fire Code 2018, automatic sprinkler systems are mandatory in: all buildings exceeding **15m height**, hotels/hospitals/schools regardless of height, commercial buildings exceeding 1000m². For residential buildings under 15m, sprinklers are not mandatory but recommended.",
    source: "manual", qualityScore: 95
  },
  {
    platform: "harara", questionAr: "ما هو معامل الانتقال الحراري المسموح به للجدران الخارجية في الإمارات؟", questionEn: "What is the maximum U-value for external walls in UAE?",
    answerAr: "وفقاً لكود الطاقة الإماراتي (ESMA 2010) وكود دبي (DBC 2021)، الحد الأقصى لمعامل الانتقال الحراري (U-Value) للجدران الخارجية:\n- **المباني السكنية:** 0.57 واط/م²·كلفن\n- **المباني التجارية والمكتبية:** 0.44 واط/م²·كلفن\n\nللأسقف:\n- **السكني:** 0.30 واط/م²·كلفن\n- **التجاري:** 0.25 واط/م²·كلفن\n\nكلما انخفض الـ U-Value، كان العزل الحراري أفضل.",
    answerEn: "Per UAE ESMA Energy Code 2010 and DBC 2021, maximum U-Value for external walls: **Residential:** 0.57 W/m²·K, **Commercial/Office:** 0.44 W/m²·K. For roofs: **Residential:** 0.30 W/m²·K, **Commercial:** 0.25 W/m²·K. Lower U-value = better insulation.",
    source: "manual", qualityScore: 95
  },
  {
    platform: "harara", questionAr: "ما هو أفضل نوع زجاج للمناخ الإماراتي الحار؟", questionEn: "What is the best glass type for UAE hot climate?",
    answerAr: "للمناخ الإماراتي الحار، يُنصح بـ:\n\n**الخيار الأمثل:** زجاج مزدوج Low-E (6+12+6 مم)\n- U-Value: 1.6 واط/م²·كلفن (مقارنة بـ 5.8 للزجاج المفرد)\n- SHGC: 0.25 (يمنع 75% من الحرارة الشمسية)\n- يوفر 40-60% من تكاليف التبريد\n- السعر التقريبي: 320 درهم/م²\n\n**الحد الأقصى المسموح به:** SHGC لا يتجاوز 0.25 للواجهات الجنوبية والغربية، 0.30 للشمالية والشرقية.\n\n**تجنب:** الزجاج المفرد أو الزجاج المزدوج بدون طلاء Low-E.",
    answerEn: "For UAE hot climate, recommended: **Best option:** Double glazing Low-E (6+12+6mm) - U-Value: 1.6 W/m²·K (vs 5.8 for single), SHGC: 0.25 (blocks 75% of solar heat), saves 40-60% cooling costs, ~320 AED/m². **Maximum allowed:** SHGC ≤ 0.25 for south/west facades, ≤ 0.30 for north/east. **Avoid:** Single glazing or double glazing without Low-E coating.",
    source: "manual", qualityScore: 92
  },
  {
    platform: "maskan", questionAr: "ما هي نسبة الدفعة الأولى المطلوبة لشراء عقار في الإمارات؟", questionEn: "What is the down payment required to buy property in UAE?",
    answerAr: "وفقاً للبنك المركزي الإماراتي (لوائح الرهن العقاري 2013):\n\n**للمواطنين الإماراتيين:**\n- أول عقار: 20% دفعة أولى\n- العقارات الإضافية: 35%\n\n**للمقيمين (غير مواطنين):**\n- أول عقار: 25% دفعة أولى\n- العقارات الإضافية: 35%\n\n**للعقارات على الخارطة:** عادةً 10-20% حسب المطور\n\n**الحد الأقصى للتمويل:** 80% للمواطنين، 75% للمقيمين من قيمة العقار.",
    answerEn: "Per UAE Central Bank Mortgage Regulations 2013: **UAE Nationals:** First property: 20% down payment, Additional properties: 35%. **Residents (non-nationals):** First property: 25% down payment, Additional: 35%. **Off-plan:** Usually 10-20% per developer. **Max LTV:** 80% for nationals, 75% for residents.",
    source: "manual", qualityScore: 95
  },
  {
    platform: "fada", questionAr: "ما هي الأبعاد المثالية لغرفة المعيشة في الشقق الإماراتية؟", questionEn: "What are ideal living room dimensions for UAE apartments?",
    answerAr: "أبعاد غرفة المعيشة الموصى بها للشقق الإماراتية:\n\n**الشقق الصغيرة (استوديو - غرفة نوم):**\n- المساحة: 20-25 م²\n- الأبعاد: 4×5 متر أو 4.5×5.5 متر\n\n**الشقق المتوسطة (2-3 غرف):**\n- المساحة: 30-40 م²\n- الأبعاد: 5×6 متر أو 5.5×7 متر\n\n**الفلل والشقق الكبيرة:**\n- المساحة: 45-60 م² (مع مجلس منفصل)\n\n**نصيحة:** في الثقافة الإماراتية، يُفضل وجود مجلس منفصل للضيوف بمساحة 25-40 م².",
    answerEn: "Recommended living room dimensions for UAE apartments: **Small (studio-1BR):** 20-25m², 4×5m or 4.5×5.5m. **Medium (2-3BR):** 30-40m², 5×6m or 5.5×7m. **Large villas:** 45-60m² (with separate majlis). **Tip:** UAE culture prefers a separate majlis for guests at 25-40m².",
    source: "manual", qualityScore: 90
  },
  {
    platform: "raqaba", questionAr: "ما هي أهم بنود التفتيش على مرحلة الأساسات؟", questionEn: "What are the key inspection items for foundations stage?",
    answerAr: "بنود التفتيش الأساسية لمرحلة الأساسات:\n\n**1. قبل الصب:**\n- التحقق من أبعاد الحفر وعمق الأساس\n- فحص جودة التربة ومطابقتها لتقرير التربة\n- التحقق من قطر وتباعد حديد التسليح\n- فحص الغطاء الخرساني (لا يقل عن 75 مم للأساسات)\n- التحقق من مواقع الأنابيب والمجاري\n\n**2. أثناء الصب:**\n- مراقبة الانهيار (Slump Test): 75-150 مم\n- أخذ عينات الخرسانة للاختبار\n- التحقق من التسوية والاهتزاز\n\n**3. بعد الصب:**\n- المعالجة المائية لمدة 7 أيام على الأقل\n- فحص الشقوق والعيوب السطحية",
    answerEn: "Key foundation inspection items: **1. Before pouring:** Check excavation dimensions and depth, soil quality vs geotechnical report, rebar diameter and spacing, concrete cover (min 75mm for foundations), pipe/drain locations. **2. During pouring:** Slump test 75-150mm, concrete samples for testing, leveling and vibration. **3. After pouring:** Water curing for min 7 days, check for cracks and surface defects.",
    source: "manual", qualityScore: 92
  },
];

for (const faq of faqRows) {
  await db.execute(
    `INSERT INTO faq_cache (platform, questionAr, questionEn, answerAr, answerEn, hitCount, creditsSaved, source, qualityScore, isActive, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, 1, NOW(), NOW())
     ON DUPLICATE KEY UPDATE answerAr=VALUES(answerAr), qualityScore=VALUES(qualityScore)`,
    [faq.platform, faq.questionAr, faq.questionEn, faq.answerAr, faq.answerEn, faq.source, faq.qualityScore]
  );
}
console.log(`  ✅ ${faqRows.length} FAQ cache entries inserted`);

// ─────────────────────────────────────────────
// 8. OUTPUT TEMPLATES
// ─────────────────────────────────────────────
console.log("📄 Seeding output_templates...");

const templates = [
  {
    platform: "harara", nameAr: "تقرير الحمل الحراري", nameEn: "Thermal Load Report",
    outputType: "report", tone: "technical",
    templateAr: `# تقرير الحمل الحراري — {{projectName}}

## معلومات المشروع
- **الموقع:** {{location}}
- **نوع المبنى:** {{buildingType}}
- **المساحة الإجمالية:** {{totalArea}} م²
- **تاريخ التقرير:** {{reportDate}}

## ملخص الأحمال الحرارية
| العنصر | المساحة (م²) | U-Value | الحمل (واط) |
|--------|-------------|---------|------------|
{{#each elements}}
| {{name}} | {{area}} | {{uValue}} | {{load}} |
{{/each}}

**إجمالي الحمل الحراري:** {{totalLoad}} واط ({{totalLoadTR}} طن تبريد)

## توصيات العزل
{{insulationRecommendations}}

## المراجع
- كود دبي للبناء DBC 2021، الجزء السادس
- كود الطاقة الإماراتي ESMA 2010`,
    requiredFields: JSON.stringify(["projectName", "location", "buildingType", "totalArea", "elements", "totalLoad"]),
    optionalFields: JSON.stringify(["insulationRecommendations", "reportDate"])
  },
  {
    platform: "code", nameAr: "ملخص الكود الهندسي", nameEn: "Engineering Code Summary",
    outputType: "summary", tone: "formal",
    templateAr: `## ملخص الكود الهندسي

**الاستفسار:** {{query}}
**المرجع:** {{codeSystem}} — {{sectionNumber}}

### النص الرسمي
{{codeContent}}

### القيم الرقمية
{{#if minValue}}الحد الأدنى: **{{minValue}} {{unit}}**{{/if}}
{{#if maxValue}}الحد الأقصى: **{{maxValue}} {{unit}}**{{/if}}

### ملاحظات تطبيقية
{{applicationNotes}}

*المصدر: {{codeSystem}} الإصدار {{edition}} — {{chapter}}*`,
    requiredFields: JSON.stringify(["query", "codeSystem", "sectionNumber", "codeContent"]),
    optionalFields: JSON.stringify(["minValue", "maxValue", "unit", "applicationNotes"])
  },
  {
    platform: "raqaba", nameAr: "تقرير التفتيش الميداني", nameEn: "Site Inspection Report",
    outputType: "report", tone: "formal",
    templateAr: `# تقرير التفتيش الميداني

**المشروع:** {{projectName}}
**تاريخ الزيارة:** {{visitDate}}
**المرحلة الإنشائية:** {{constructionPhase}}
**نسبة الإنجاز:** {{progressPercent}}%

## الملاحظات الميدانية
{{observations}}

## المخالفات المرصودة
{{#each violations}}
- ⚠️ **{{severity}}:** {{description}} — **الإجراء المطلوب:** {{action}}
{{/each}}

## التوصيات
{{recommendations}}

## الخطوات التالية
{{nextSteps}}`,
    requiredFields: JSON.stringify(["projectName", "visitDate", "constructionPhase", "progressPercent"]),
    optionalFields: JSON.stringify(["observations", "violations", "recommendations", "nextSteps"])
  },
  {
    platform: "maskan", nameAr: "تقرير تحليل الاحتياج السكني", nameEn: "Housing Needs Analysis Report",
    outputType: "analysis", tone: "conversational",
    templateAr: `# تحليل احتياجاتك السكنية

## ملف الأسرة
- **عدد أفراد الأسرة:** {{familySize}} أشخاص
- **الدخل الشهري:** {{monthlyIncome}} درهم
- **الميزانية المتاحة:** {{budget}} درهم

## التوصية
{{recommendation}}

## الخيارات المقترحة
{{#each options}}
### {{name}}
- **المنطقة:** {{area}}
- **السعر التقريبي:** {{price}} درهم
- **المزايا:** {{pros}}
- **العيوب:** {{cons}}
{{/each}}

## التحليل المالي
- **الدفعة الأولى المطلوبة:** {{downPayment}} درهم ({{downPaymentPercent}}%)
- **القسط الشهري المتوقع:** {{monthlyPayment}} درهم
- **نسبة القسط من الدخل:** {{paymentToIncomeRatio}}%`,
    requiredFields: JSON.stringify(["familySize", "monthlyIncome", "budget", "recommendation"]),
    optionalFields: JSON.stringify(["options", "downPayment", "monthlyPayment"])
  },
];

for (const tmpl of templates) {
  await db.execute(
    `INSERT INTO output_templates (platform, nameAr, nameEn, outputType, templateAr, tone, requiredFields, optionalFields, isActive, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
     ON DUPLICATE KEY UPDATE templateAr=VALUES(templateAr)`,
    [tmpl.platform, tmpl.nameAr, tmpl.nameEn, tmpl.outputType, tmpl.templateAr, tmpl.tone, tmpl.requiredFields, tmpl.optionalFields]
  );
}
console.log(`  ✅ ${templates.length} output templates inserted`);

// ─────────────────────────────────────────────
// 9. DECISION TREES
// ─────────────────────────────────────────────
console.log("🌳 Seeding decision_trees...");

const decisionTrees = [
  {
    platform: "code", nameAr: "تحديد متطلبات الحريق حسب ارتفاع المبنى", nameEn: "Fire Requirements by Building Height",
    triggerCondition: "عندما يسأل المستخدم عن متطلبات السلامة من الحريق لمبنى",
    treeLogic: JSON.stringify({
      question: "ما ارتفاع المبنى؟",
      branches: [
        { condition: "height <= 15", result: "إنذار حريق إلزامي إذا تجاوزت المساحة 500م². رشاشات غير إلزامية لكن موصى بها. مخرجان كافيان للمباني حتى 499 شخص." },
        { condition: "height > 15 && height <= 23", result: "إنذار حريق إلزامي. رشاشات مياه إلزامية. مخرجان على الأقل. درج هروب محمي مطلوب." },
        { condition: "height > 23 && height <= 60", result: "إنذار حريق + رشاشات إلزامية. درجان للهروب على الأقل. نظام إطفاء مركزي. مصعد إطفاء مطلوب." },
        { condition: "height > 60", result: "جميع المتطلبات السابقة + نظام ضغط هواء في درج الهروب + غرفة تحكم حريق + مروحية إنقاذ + مشاورة إلزامية مع الدفاع المدني." }
      ]
    }),
    referencedIds: JSON.stringify([1, 2, 3]),
    confidenceScore: 95
  },
  {
    platform: "harara", nameAr: "اختيار نوع العزل الحراري المناسب", nameEn: "Thermal Insulation Selection",
    triggerCondition: "عندما يسأل المستخدم عن أفضل عزل حراري للمناخ الإماراتي",
    treeLogic: JSON.stringify({
      question: "ما العنصر المراد عزله؟",
      branches: [
        { condition: "element == 'roof'", result: "للأسقف: XPS 80-100مم (R-value ≥ 2.9) أو EPS 100-120مم. الأسقف هي المصدر الأول للكسب الحراري في الإمارات (30-40% من الحمل). يُنصح بإضافة طبقة عازلة بيضاء عاكسة للإشعاع الشمسي." },
        { condition: "element == 'wall'", result: "للجدران: XPS 50-75مم أو صوف صخري 75-100مم. الجدران الغربية والجنوبية تحتاج عزلاً أقوى. يُنصح بـ AAC (Ytong) كبديل للطوب التقليدي." },
        { condition: "element == 'floor'", result: "للأرضيات المعلقة: EPS 50مم كافٍ. للأرضيات الأرضية: لا يلزم عزل حراري لكن يُنصح بعازل رطوبة." },
        { condition: "element == 'glazing'", result: "للزجاج: Low-E مزدوج (6+12+6مم) هو الخيار الأمثل. SHGC ≤ 0.25 للجنوب والغرب. تجنب الزجاج المفرد في الإمارات." }
      ]
    }),
    referencedIds: JSON.stringify([5, 6, 7]),
    confidenceScore: 92
  },
];

for (const tree of decisionTrees) {
  await db.execute(
    `INSERT INTO decision_trees (platform, nameAr, nameEn, triggerCondition, treeLogic, referencedIds, confidenceScore, isActive, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
     ON DUPLICATE KEY UPDATE treeLogic=VALUES(treeLogic)`,
    [tree.platform, tree.nameAr, tree.nameEn, tree.triggerCondition, tree.treeLogic, tree.referencedIds, tree.confidenceScore]
  );
}
console.log(`  ✅ ${decisionTrees.length} decision trees inserted`);

// ─────────────────────────────────────────────
// 10. SYNC LOG
// ─────────────────────────────────────────────
await db.execute(
  `INSERT INTO knowledge_sync_log (dataSource, targetTable, recordsAffected, status, durationMs, syncedAt)
   VALUES (?, ?, ?, ?, ?, NOW())`,
  ["Initial Seed Script", "all_tables", climateRows.length + buildingCodeRows.length + materialRows.length + calcRules.length + designStds.length + propertyData.length + faqRows.length + templates.length + decisionTrees.length, "success", 0]
);

console.log("\n✅ Knowledge Base Seed Complete!");
console.log(`📊 Summary:`);
console.log(`   - Climate Data: ${climateRows.length} records`);
console.log(`   - Building Codes: ${buildingCodeRows.length} records`);
console.log(`   - Materials: ${materialRows.length} records`);
console.log(`   - Calculation Rules: ${calcRules.length} records`);
console.log(`   - Design Standards: ${designStds.length} records`);
console.log(`   - Property Market Data: ${propertyData.length} records`);
console.log(`   - FAQ Cache: ${faqRows.length} records`);
console.log(`   - Output Templates: ${templates.length} records`);
console.log(`   - Decision Trees: ${decisionTrees.length} records`);

await db.end();
