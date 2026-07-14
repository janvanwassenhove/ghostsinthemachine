/** Central tuning constants. */
export const BAL = {
  dayLength: 75, // real seconds per in-game day at 1x speed

  grid: { w: 24, h: 15, tile: 40 },

  // Movement (tiles per second)
  incidentSpeed: 2.2,
  staffSpeed: 3.0,

  // Staff
  energyDrainWork: 2.2, // per second while working
  energyDrainIdle: 0.3,
  energyBreakThreshold: 22,
  breakDuration: 5, // seconds at the Coffee Reactor
  breakEnergyCoffee: 100,
  breakEnergyNoCoffee: 55,
  moraleCoffeeBonus: 4,
  moraleNoCoffeePenalty: 7,
  moralePaydayBonus: 3,
  moraleDisasterPenalty: 6,
  moraleResignThreshold: 8,
  moraleResignSeconds: 20, // sustained below threshold
  trainSkillPerDay: 0.6,
  trainDebtPerStaffPerDay: 13, // per staff; rooms cap at 2, so this is the Dojo's ceiling per pair
  maxRoomStaff: 2, // a room takes at most two workers
  secondStaffFactor: 0.6, // a 2nd worker adds this fraction of their output on top of the first

  // Coffee
  brewSeconds: 4, // unstaffed seconds per coffee
  brewStaffedFactor: 0.4,
  coffeeStockBase: 12,
  coffeeStockPerLevel: 8,
  beansPerPurchase: 10,
  beanPrice: 80,

  // Incidents
  escalate1: 0.5, // patience fraction thresholds
  escalate2: 0.25,
  warRoomEscalateFactor: 0.55, // thresholds multiplied when war room staffed
  failTrustHit: 2.5,
  failDebtHit: 1.5,
  resolveTrustPerSeverity: 1.0,
  retargetInterval: 4, // seconds between "is there a room for me now?" checks
  stuckPatienceFactor: 1.6, // patience drains faster when no room exists

  // Rooms
  triageServiceFactor: 0.4, // Triage is quick sorting, not treatment — much faster
  conditionPerService: 4, // wear per completed service
  brokenThreshold: 0, // condition <= 0 -> broken
  roomLevelSpeed: 0.25, // +25% speed per level above 1
  roomLevelQueue: 2, // +cap per level above 1
  maxRoomLevel: 3,

  // Economy
  demolishDebt: 3,
  mutationDebt: 1,
  bankruptcyGrace: -300, // default fail floor override per scenario

  // Meters
  observatoryStability: 6, // flat stability bonus per staffed observatory
  monitorDisasterFactor: 0.6,
  monitorAuditBonus: 10,
  backupSaveChance: 0.45,

  // Disasters
  disasterCheckInterval: 18, // seconds
  disasterBaseChance: 0.14,

  // Audits
  auditPassScore: 46,
  auditFine: 170,
  auditGrant: 200,
  auditTrustPass: 6,
  auditTrustFail: 8,

  // Hiring
  candidateCount: 5,

  // Release ritual
  releaseIncomePerLevel: 45,

  // Garden (outdoor rooms)
  plantationBeanSeconds: 9, // seconds to grow one bean, per plantation
  plantationBeanCap: 40, // stop growing beans above this from plantations
  farmIncomePerDay: 60, // passive income per server farm per day
  oakStability: 5, // flat stability bonus per oak grove
  oakMoraleRegen: 0.25, // morale/second bonus per oak grove
} as const;
