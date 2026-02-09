// ============================================================
// Calculator Function Tests - Node.js Runner
// Tests each function from the Financial Planning Calculator
// ============================================================

// ============================================================
// CONSTANTS (from index.html)
// ============================================================

const TAX_BRACKETS_2026 = {
  single: [
    { min: 0, max: 12400, rate: 0.10 },
    { min: 12400, max: 50400, rate: 0.12 },
    { min: 50400, max: 105700, rate: 0.22 },
    { min: 105700, max: 201775, rate: 0.24 },
    { min: 201775, max: 256225, rate: 0.32 },
    { min: 256225, max: 640600, rate: 0.35 },
    { min: 640600, max: Infinity, rate: 0.37 }
  ],
  mfj: [
    { min: 0, max: 24800, rate: 0.10 },
    { min: 24800, max: 100800, rate: 0.12 },
    { min: 100800, max: 211400, rate: 0.22 },
    { min: 211400, max: 403550, rate: 0.24 },
    { min: 403550, max: 512450, rate: 0.32 },
    { min: 512450, max: 768700, rate: 0.35 },
    { min: 768700, max: Infinity, rate: 0.37 }
  ],
  hoh: [
    { min: 0, max: 17700, rate: 0.10 },
    { min: 17700, max: 67450, rate: 0.12 },
    { min: 67450, max: 105700, rate: 0.22 },
    { min: 105700, max: 201775, rate: 0.24 },
    { min: 201775, max: 256200, rate: 0.32 },
    { min: 256200, max: 640600, rate: 0.35 },
    { min: 640600, max: Infinity, rate: 0.37 }
  ]
};

const CAPITAL_GAINS_BRACKETS_2026 = {
  single: [
    { min: 0, max: 48350, rate: 0.00 },
    { min: 48350, max: 533400, rate: 0.15 },
    { min: 533400, max: Infinity, rate: 0.20 }
  ],
  mfj: [
    { min: 0, max: 96700, rate: 0.00 },
    { min: 96700, max: 600050, rate: 0.15 },
    { min: 600050, max: Infinity, rate: 0.20 }
  ],
  hoh: [
    { min: 0, max: 64750, rate: 0.00 },
    { min: 64750, max: 566700, rate: 0.15 },
    { min: 566700, max: Infinity, rate: 0.20 }
  ]
};

const STANDARD_DEDUCTION_2026 = { single: 16100, mfj: 32200, hoh: 24150 };

const UNIFORM_LIFETIME_TABLE = {
  73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1, 80: 20.2,
  81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4, 88: 13.7,
  89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9, 96: 8.4,
  97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4, 101: 6.0, 102: 5.6, 103: 5.2, 104: 4.9,
  105: 4.6, 106: 4.3, 107: 4.1, 108: 3.9, 109: 3.7, 110: 3.5, 111: 3.4, 112: 3.3,
  113: 3.1, 114: 3.0, 115: 2.9, 116: 2.8, 117: 2.7, 118: 2.5, 119: 2.3, 120: 2.0
};

// ============================================================
// FUNCTIONS UNDER TEST (from index.html)
// ============================================================

const calculateRMD = (age, preTaxBalance, rmdStartAge = 73) => {
  if (age < rmdStartAge || preTaxBalance <= 0) return 0;
  const divisor = UNIFORM_LIFETIME_TABLE[Math.min(age, 120)] || 2.0;
  return preTaxBalance / divisor;
};

const getInflatedBrackets = (filingStatus, baseInflation, yearsFromStart) => {
  const brackets = TAX_BRACKETS_2026[filingStatus];
  const factor = Math.pow(1 + baseInflation, yearsFromStart);
  return brackets.map(b => ({
    min: b.min * factor,
    max: b.max === Infinity ? Infinity : b.max * factor,
    rate: b.rate
  }));
};

const getInflatedCapGainsBrackets = (filingStatus, baseInflation, yearsFromStart) => {
  const brackets = CAPITAL_GAINS_BRACKETS_2026[filingStatus];
  const factor = Math.pow(1 + baseInflation, yearsFromStart);
  return brackets.map(b => ({
    min: b.min * factor,
    max: b.max === Infinity ? Infinity : b.max * factor,
    rate: b.rate
  }));
};

const getInflatedStandardDeduction = (filingStatus, baseInflation, yearsFromStart) => {
  return STANDARD_DEDUCTION_2026[filingStatus] * Math.pow(1 + baseInflation, yearsFromStart);
};

const getTopOf12PercentBracket = (filingStatus, baseInflation, yearsFromStart) => {
  const brackets = getInflatedBrackets(filingStatus, baseInflation, yearsFromStart);
  const bracket12 = brackets.find(b => b.rate === 0.12);
  return bracket12 ? bracket12.max : 0;
};

const calculateFederalTax = (taxableIncome, brackets) => {
  if (taxableIncome <= 0) return 0;
  let tax = 0;
  let remaining = taxableIncome;
  for (const bracket of brackets) {
    const bracketWidth = bracket.max - bracket.min;
    const taxableInBracket = Math.min(remaining, bracketWidth);
    if (taxableInBracket <= 0) break;
    tax += taxableInBracket * bracket.rate;
    remaining -= taxableInBracket;
  }
  return tax;
};

const calculateCapitalGainsTax = (capitalGains, ordinaryTaxableIncome, capGainsBrackets) => {
  if (capitalGains <= 0) return 0;
  let tax = 0;
  let gainsRemaining = capitalGains;
  let incomeLevel = ordinaryTaxableIncome;
  for (const bracket of capGainsBrackets) {
    if (gainsRemaining <= 0) break;
    const bracketCeiling = bracket.max;
    const roomInBracket = Math.max(0, bracketCeiling - incomeLevel);
    if (roomInBracket > 0) {
      const gainsInBracket = Math.min(gainsRemaining, roomInBracket);
      tax += gainsInBracket * bracket.rate;
      gainsRemaining -= gainsInBracket;
      incomeLevel += gainsInBracket;
    }
  }
  return tax;
};

const calculateWithdrawalAllocation = (
  grossWithdrawal, totalRMD, client1RMD, client2RMD,
  totalPreTax, totalRoth, totalTaxable, taxableBasis, taxableGainRatio,
  qualifiedDividends, interestIncome, otherIncome, socialSecurityIncome, filingStatus,
  standardDeduction, topOf12Bracket, brackets, capGainsBrackets, stateTaxRate
) => {
  let fromPreTax = Math.min(totalRMD, totalPreTax);
  let fromTaxable = 0;
  let fromRoth = 0;
  let remainingNeed = grossWithdrawal - fromPreTax;
  let availablePreTax = totalPreTax - fromPreTax;
  let availableTaxable = totalTaxable;
  let availableRoth = totalRoth;
  if (remainingNeed > 0) {
    const ordinaryIncomeSoFar = fromPreTax + interestIncome + otherIncome;
    const roomIn12Bracket = Math.max(0, topOf12Bracket - (ordinaryIncomeSoFar - standardDeduction));
    const additionalPreTaxFor12 = Math.min(roomIn12Bracket, availablePreTax, remainingNeed);
    if (additionalPreTaxFor12 > 0) {
      fromPreTax += additionalPreTaxFor12;
      availablePreTax -= additionalPreTaxFor12;
      remainingNeed -= additionalPreTaxFor12;
    }
    if (remainingNeed > 0) {
      const fromTaxableNow = Math.min(remainingNeed, availableTaxable);
      fromTaxable += fromTaxableNow;
      availableTaxable -= fromTaxableNow;
      remainingNeed -= fromTaxableNow;
    }
    if (remainingNeed > 0) {
      const additionalPreTax = Math.min(remainingNeed, availablePreTax);
      fromPreTax += additionalPreTax;
      availablePreTax -= additionalPreTax;
      remainingNeed -= additionalPreTax;
    }
    if (remainingNeed > 0) {
      fromRoth = Math.min(remainingNeed, availableRoth);
      remainingNeed -= fromRoth;
    }
  }
  const ssIncome = socialSecurityIncome || 0;
  let taxableSocialSecurity = 0;
  let provisionalIncome = 0;
  const ssBaseThreshold = filingStatus === 'mfj' ? 32000 : 25000;
  const ssUpperThreshold = filingStatus === 'mfj' ? 44000 : 34000;
  if (ssIncome > 0) {
    provisionalIncome = fromPreTax + otherIncome + interestIncome + qualifiedDividends + (ssIncome * 0.5);
    if (provisionalIncome > ssUpperThreshold) {
      taxableSocialSecurity = Math.min(ssIncome * 0.85,
        0.85 * (provisionalIncome - ssUpperThreshold) + 0.5 * Math.min(provisionalIncome - ssBaseThreshold, ssUpperThreshold - ssBaseThreshold));
    } else if (provisionalIncome > ssBaseThreshold) {
      taxableSocialSecurity = Math.min(ssIncome * 0.5, 0.5 * (provisionalIncome - ssBaseThreshold));
    }
    taxableSocialSecurity = Math.min(taxableSocialSecurity, ssIncome * 0.85);
  }
  const ordinaryIncome = fromPreTax + interestIncome + otherIncome + taxableSocialSecurity;
  const taxableOrdinaryIncome = Math.max(0, ordinaryIncome - standardDeduction);
  const taxableWithdrawalGains = fromTaxable * taxableGainRatio;
  const totalCapitalGains = taxableWithdrawalGains + qualifiedDividends;
  const federalOrdinaryTax = calculateFederalTax(taxableOrdinaryIncome, brackets);
  const federalCapGainsTax = calculateCapitalGainsTax(totalCapitalGains, taxableOrdinaryIncome, capGainsBrackets);
  const niitThreshold = filingStatus === 'mfj' ? 250000 : 200000;
  const netInvestmentIncome = interestIncome + qualifiedDividends + taxableWithdrawalGains;
  const magiForNiit = ordinaryIncome + totalCapitalGains;
  const magiOverThreshold = Math.max(0, magiForNiit - niitThreshold);
  const niitTax = 0.038 * Math.min(netInvestmentIncome, magiOverThreshold);
  const federalTax = federalOrdinaryTax + federalCapGainsTax + niitTax;
  const stateTax = (taxableOrdinaryIncome + totalCapitalGains) * stateTaxRate;
  const totalTax = federalTax + stateTax;
  const actualGrossWithdrawal = fromPreTax + fromTaxable + fromRoth;
  const afterTax = actualGrossWithdrawal - totalTax;
  const excessRMD = Math.max(0, totalRMD - grossWithdrawal);
  const rawExcessRMDAfterTax = excessRMD > 0 && actualGrossWithdrawal > 0
    ? excessRMD - (excessRMD / actualGrossWithdrawal * totalTax)
    : 0;
  const excessRMDAfterTax = rawExcessRMDAfterTax > 100 ? rawExcessRMDAfterTax : 0;
  return {
    grossWithdrawal: actualGrossWithdrawal, fromPreTax, fromTaxable, fromRoth,
    totalTax, federalTax, federalOrdinaryTax, federalCapGainsTax, niitTax, stateTax,
    afterTax, taxableOrdinaryIncome, totalCapitalGains, excessRMDAfterTax,
    taxableSocialSecurity, provisionalIncome, ssBaseThreshold, ssUpperThreshold, otherIncome
  };
};

const calculateOptimizedWithdrawal = (targetAfterTax, accountBalances, taxParams) => {
  const {
    client1PreTax, client2PreTax, totalPreTax,
    client1Roth, client2Roth, totalRoth,
    totalTaxable, taxableBasis, stockAllocation,
    filingStatus, stateTaxRate, baseInflation, yearsFromStart,
    client1Age, client2Age, client1RmdAge, client2RmdAge,
    otherIncome, socialSecurityIncome,
    cachedBrackets, cachedCapGainsBrackets, cachedDeduction, cachedTopOf12
  } = taxParams;
  const brackets = cachedBrackets || getInflatedBrackets(filingStatus, baseInflation, yearsFromStart);
  const capGainsBrackets = cachedCapGainsBrackets || getInflatedCapGainsBrackets(filingStatus, baseInflation, yearsFromStart);
  const standardDeduction = cachedDeduction || getInflatedStandardDeduction(filingStatus, baseInflation, yearsFromStart);
  const topOf12Bracket = cachedTopOf12 || getTopOf12PercentBracket(filingStatus, baseInflation, yearsFromStart);
  const client1RMD = calculateRMD(client1Age, client1PreTax, client1RmdAge || 73);
  const client2RMD = calculateRMD(client2Age, client2PreTax, client2RmdAge || 73);
  const totalRMD = client1RMD + client2RMD;
  const bondAllocation = 1 - stockAllocation;
  const qualifiedDividends = totalTaxable * stockAllocation * 0.01;
  const interestIncome = totalTaxable * bondAllocation * 0.04;
  const taxableGainRatio = totalTaxable > 0 ? Math.max(0, (totalTaxable - taxableBasis) / totalTaxable) : 0;
  const ssIncome = socialSecurityIncome || 0;
  let low = 0;
  let high = Math.max(targetAfterTax * 3, 1);
  let result = null;
  if (targetAfterTax === 0) {
    result = calculateWithdrawalAllocation(
      0, totalRMD, client1RMD, client2RMD,
      totalPreTax, totalRoth, totalTaxable, taxableBasis, taxableGainRatio,
      qualifiedDividends, interestIncome, otherIncome, ssIncome, filingStatus,
      standardDeduction, topOf12Bracket, brackets, capGainsBrackets, stateTaxRate
    );
  } else {
    for (let iter = 0; iter < 20; iter++) {
      const testGross = (low + high) / 2;
      const withdrawalResult = calculateWithdrawalAllocation(
        testGross, totalRMD, client1RMD, client2RMD,
        totalPreTax, totalRoth, totalTaxable, taxableBasis, taxableGainRatio,
        qualifiedDividends, interestIncome, otherIncome, ssIncome, filingStatus,
        standardDeduction, topOf12Bracket, brackets, capGainsBrackets, stateTaxRate
      );
      if (Math.abs(withdrawalResult.afterTax - targetAfterTax) < 50) {
        result = withdrawalResult;
        break;
      }
      if (withdrawalResult.afterTax < targetAfterTax) {
        low = testGross;
      } else {
        high = testGross;
      }
    }
    if (!result) {
      const testGross = (low + high) / 2;
      result = calculateWithdrawalAllocation(
        testGross, totalRMD, client1RMD, client2RMD,
        totalPreTax, totalRoth, totalTaxable, taxableBasis, taxableGainRatio,
        qualifiedDividends, interestIncome, otherIncome, ssIncome, filingStatus,
        standardDeduction, topOf12Bracket, brackets, capGainsBrackets, stateTaxRate
      );
    }
  }
  return {
    ...result, client1RMD, client2RMD, totalRMD, qualifiedDividends, interestIncome, otherIncome
  };
};

const choleskyDecomposition = (matrix) => {
  const n = matrix.length;
  const L = Array.from({length: n}, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
      if (i === j) {
        const diag = matrix[i][i] - sum;
        if (diag <= 0) return null;
        L[i][j] = Math.sqrt(diag);
      } else {
        L[i][j] = (matrix[i][j] - sum) / L[j][j];
      }
    }
  }
  return L;
};

const ensurePositiveDefinite = (matrix) => {
  const n = matrix.length;
  const S = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => (matrix[i][j] + matrix[j][i]) / 2));
  const L = choleskyDecomposition(S);
  if (L) return S;
  const A = S.map(row => [...row]);
  const V = Array.from({length: n}, (_, i) => { const r = new Array(n).fill(0); r[i] = 1; return r; });
  for (let iter = 0; iter < 1000; iter++) {
    let maxVal = 0, p = 0, q = 1;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      if (Math.abs(A[i][j]) > maxVal) { maxVal = Math.abs(A[i][j]); p = i; q = j; }
    }
    if (maxVal < 1e-12) break;
    const denom = 2 * A[p][q];
    const theta = (A[q][q] - A[p][p]) / denom;
    const t = theta === 0 ? 1 : (theta > 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
    const c = 1 / Math.sqrt(t * t + 1), s = t * c;
    for (let i = 0; i < n; i++) {
      if (i !== p && i !== q) {
        const aip = A[i][p], aiq = A[i][q];
        A[i][p] = A[p][i] = c * aip - s * aiq;
        A[i][q] = A[q][i] = s * aip + c * aiq;
      }
    }
    const app = A[p][p], aqq = A[q][q], apq = A[p][q];
    A[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
    A[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
    A[p][q] = A[q][p] = 0;
    for (let i = 0; i < n; i++) {
      const vip = V[i][p], viq = V[i][q];
      V[i][p] = c * vip - s * viq;
      V[i][q] = s * vip + c * viq;
    }
  }
  const eigenvalues = A.map((row, i) => row[i]);
  const minEig = 1e-6;
  const clampedEigs = eigenvalues.map(e => Math.max(e, minEig));
  const result = Array.from({length: n}, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
    let val = 0;
    for (let k = 0; k < n; k++) val += V[i][k] * clampedEigs[k] * V[j][k];
    result[i][j] = result[j][i] = val;
  }
  const diag = result.map((row, i) => Math.sqrt(row[i]));
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) result[i][j] /= (diag[i] * diag[j]);
  return result;
};

const generateReturn = (geometricMean, logVolatility, z) => {
  if (z === undefined) {
    const u1 = Math.random(), u2 = Math.random();
    z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
  z = Math.max(-5, Math.min(5, z));
  const logMean = Math.log(1 + geometricMean);
  const logReturn = logMean + logVolatility * z;
  return Math.exp(logReturn) - 1;
};

const formatCurrency = (v) => v == null || isNaN(v) ? '$0' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
const formatNumberWithCommas = (v) => v == null || v === '' ? '' : v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const inflateValue = (base, rate, years) => base * Math.pow(1 + rate, years);

const inflateSpendingSmile = (base, baseInflation, currentYear, calYear, phase2Year, phase2Reduction, phase3Year, phase3Reduction) => {
  let spending = base;
  for (let y = currentYear + 1; y <= calYear; y++) {
    let rate = baseInflation;
    if (y >= phase3Year) {
      rate = baseInflation - phase3Reduction;
    } else if (y >= phase2Year) {
      rate = baseInflation - phase2Reduction;
    }
    spending *= (1 + rate);
  }
  return spending;
};

const getPercentile = (arr, p) => arr[Math.min(Math.floor(arr.length * p), arr.length - 1)];

// ============================================================
// TEST FRAMEWORK
// ============================================================
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let currentSection = '';

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

function section(name) {
  currentSection = name;
  console.log(`\n${CYAN}${BOLD}${name}${RESET}`);
  console.log(`${CYAN}${'─'.repeat(60)}${RESET}`);
}

function test(name, fn) {
  totalTests++;
  try {
    const result = fn();
    if (result === true || (result && result.pass)) {
      passedTests++;
      const detail = result && result.detail ? ` ${DIM}${result.detail}${RESET}` : '';
      console.log(`  ${GREEN}PASS${RESET}  ${name}${detail}`);
      return;
    }
    failedTests++;
    const detail = result && result.detail ? result.detail : (typeof result === 'string' ? result : JSON.stringify(result));
    console.log(`  ${RED}FAIL${RESET}  ${name}`);
    console.log(`        ${DIM}${detail}${RESET}`);
  } catch (e) {
    failedTests++;
    console.log(`  ${RED}FAIL${RESET}  ${name}`);
    console.log(`        ${DIM}Error: ${e.message}${RESET}`);
  }
}

function approxEqual(a, b, tolerance = 0.01) {
  return Math.abs(a - b) <= tolerance;
}

// ============================================================
// 1. calculateRMD Tests
// ============================================================
section('1. calculateRMD');

test('Age below RMD start age (72) returns 0', () => {
  const result = calculateRMD(72, 1000000);
  return result === 0 ? true : { detail: `Expected 0, got ${result}` };
});

test('Age 73 with $1,000,000 balance uses divisor 26.5', () => {
  const result = calculateRMD(73, 1000000);
  const expected = 1000000 / 26.5;
  return approxEqual(result, expected, 0.01)
    ? { pass: true, detail: `RMD = $${result.toFixed(2)} (expected $${expected.toFixed(2)})` }
    : { detail: `Expected $${expected.toFixed(2)}, got $${result.toFixed(2)}` };
});

test('Age 80 with $500,000 balance uses divisor 20.2', () => {
  const result = calculateRMD(80, 500000);
  const expected = 500000 / 20.2;
  return approxEqual(result, expected, 0.01)
    ? { pass: true, detail: `RMD = $${result.toFixed(2)} (expected $${expected.toFixed(2)})` }
    : { detail: `Expected $${expected.toFixed(2)}, got $${result.toFixed(2)}` };
});

test('Age 100 with $200,000 balance uses divisor 6.4', () => {
  const result = calculateRMD(100, 200000);
  const expected = 200000 / 6.4;
  return approxEqual(result, expected, 0.01)
    ? { pass: true, detail: `RMD = $${result.toFixed(2)} (expected $${expected.toFixed(2)})` }
    : { detail: `Expected $${expected.toFixed(2)}, got $${result.toFixed(2)}` };
});

test('Age 120+ uses divisor 2.0 (max age cap)', () => {
  const result = calculateRMD(125, 100000);
  const expected = 100000 / 2.0;
  return approxEqual(result, expected, 0.01)
    ? { pass: true, detail: `RMD = $${result.toFixed(2)} (expected $${expected.toFixed(2)})` }
    : { detail: `Expected $${expected.toFixed(2)}, got $${result.toFixed(2)}` };
});

test('Zero balance returns 0 regardless of age', () => {
  return calculateRMD(80, 0) === 0 ? true : { detail: `Expected 0` };
});

test('Negative balance returns 0', () => {
  return calculateRMD(80, -1000) === 0 ? true : { detail: `Expected 0` };
});

test('Custom RMD start age 75 - age 74 returns 0', () => {
  return calculateRMD(74, 1000000, 75) === 0 ? true : { detail: `Expected 0` };
});

test('Custom RMD start age 75 - age 75 returns RMD', () => {
  const result = calculateRMD(75, 1000000, 75);
  const expected = 1000000 / 24.6;
  return approxEqual(result, expected, 0.01)
    ? { pass: true, detail: `RMD = $${result.toFixed(2)}` }
    : { detail: `Expected $${expected.toFixed(2)}, got $${result.toFixed(2)}` };
});

// ============================================================
// 2. getInflatedBrackets Tests
// ============================================================
section('2. getInflatedBrackets');

test('Year 0 inflation returns original brackets (single)', () => {
  const brackets = getInflatedBrackets('single', 0.03, 0);
  return brackets[0].max === 12400 && brackets[1].rate === 0.12
    ? { pass: true, detail: `First bracket max=$${brackets[0].max}, 2nd rate=${brackets[1].rate}` }
    : { detail: `Brackets not matching base values` };
});

test('3% inflation for 10 years inflates single brackets correctly', () => {
  const brackets = getInflatedBrackets('single', 0.03, 10);
  const factor = Math.pow(1.03, 10);
  const expectedMax = 12400 * factor;
  return approxEqual(brackets[0].max, expectedMax, 1)
    ? { pass: true, detail: `1st bracket max=$${brackets[0].max.toFixed(0)} (expected $${expectedMax.toFixed(0)})` }
    : { detail: `Expected $${expectedMax.toFixed(0)}, got $${brackets[0].max.toFixed(0)}` };
});

test('MFJ brackets inflate correctly (5 years, 2.5%)', () => {
  const brackets = getInflatedBrackets('mfj', 0.025, 5);
  const factor = Math.pow(1.025, 5);
  const expectedMax = 24800 * factor;
  return approxEqual(brackets[0].max, expectedMax, 1)
    ? { pass: true, detail: `MFJ 1st bracket max=$${brackets[0].max.toFixed(0)}` }
    : { detail: `Expected $${expectedMax.toFixed(0)}, got $${brackets[0].max.toFixed(0)}` };
});

test('Infinity bracket max stays Infinity after inflation', () => {
  const brackets = getInflatedBrackets('single', 0.03, 10);
  return brackets[brackets.length - 1].max === Infinity
    ? { pass: true, detail: `Last bracket max = Infinity` }
    : { detail: `Expected Infinity` };
});

test('Rates are preserved through inflation', () => {
  const brackets = getInflatedBrackets('single', 0.03, 20);
  const rates = brackets.map(b => b.rate);
  const expected = [0.10, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37];
  const match = rates.every((r, i) => r === expected[i]);
  return match
    ? { pass: true, detail: `All 7 rates preserved: ${rates.join(', ')}` }
    : { detail: `Rates mismatch` };
});

// ============================================================
// 3. getInflatedCapGainsBrackets Tests
// ============================================================
section('3. getInflatedCapGainsBrackets');

test('Year 0 returns base cap gains brackets (mfj)', () => {
  const brackets = getInflatedCapGainsBrackets('mfj', 0.03, 0);
  return brackets[0].max === 96700 && brackets[0].rate === 0.00
    ? { pass: true, detail: `0% bracket max=$${brackets[0].max}` }
    : { detail: `Expected 96700, got ${brackets[0].max}` };
});

test('Cap gains brackets inflate correctly (single, 3%, 10 years)', () => {
  const brackets = getInflatedCapGainsBrackets('single', 0.03, 10);
  const factor = Math.pow(1.03, 10);
  const expected = 48350 * factor;
  return approxEqual(brackets[0].max, expected, 1)
    ? { pass: true, detail: `0% bracket inflated to $${brackets[0].max.toFixed(0)}` }
    : { detail: `Expected $${expected.toFixed(0)}, got $${brackets[0].max.toFixed(0)}` };
});

test('Cap gains rates are 0%, 15%, 20%', () => {
  const brackets = getInflatedCapGainsBrackets('hoh', 0.02, 5);
  const rates = brackets.map(b => b.rate);
  return rates[0] === 0.00 && rates[1] === 0.15 && rates[2] === 0.20
    ? { pass: true, detail: `Rates: ${rates.join(', ')}` }
    : { detail: `Expected [0, 0.15, 0.20], got [${rates.join(', ')}]` };
});

// ============================================================
// 4. getInflatedStandardDeduction Tests
// ============================================================
section('4. getInflatedStandardDeduction');

test('Year 0 returns base standard deduction (single = $16,100)', () => {
  const result = getInflatedStandardDeduction('single', 0.03, 0);
  return result === 16100
    ? { pass: true, detail: `Deduction = $${result}` }
    : { detail: `Expected 16100, got ${result}` };
});

test('MFJ base deduction is $32,200', () => {
  const result = getInflatedStandardDeduction('mfj', 0.03, 0);
  return result === 32200
    ? { pass: true, detail: `MFJ deduction = $${result}` }
    : { detail: `Expected 32200, got ${result}` };
});

test('HOH base deduction is $24,150', () => {
  const result = getInflatedStandardDeduction('hoh', 0.03, 0);
  return result === 24150
    ? { pass: true, detail: `HOH deduction = $${result}` }
    : { detail: `Expected 24150, got ${result}` };
});

test('Single deduction inflates correctly at 3% for 10 years', () => {
  const result = getInflatedStandardDeduction('single', 0.03, 10);
  const expected = 16100 * Math.pow(1.03, 10);
  return approxEqual(result, expected, 0.01)
    ? { pass: true, detail: `Inflated = $${result.toFixed(2)} (expected $${expected.toFixed(2)})` }
    : { detail: `Expected $${expected.toFixed(2)}, got $${result.toFixed(2)}` };
});

// ============================================================
// 5. getTopOf12PercentBracket Tests
// ============================================================
section('5. getTopOf12PercentBracket');

test('Single at year 0: top of 12% = $50,400', () => {
  return getTopOf12PercentBracket('single', 0.03, 0) === 50400
    ? { pass: true, detail: `Top of 12% = $50,400` }
    : { detail: `Unexpected value` };
});

test('MFJ at year 0: top of 12% = $100,800', () => {
  return getTopOf12PercentBracket('mfj', 0.03, 0) === 100800
    ? { pass: true, detail: `Top of 12% = $100,800` }
    : { detail: `Unexpected value` };
});

test('Top of 12% inflates with years', () => {
  const year0 = getTopOf12PercentBracket('single', 0.03, 0);
  const year10 = getTopOf12PercentBracket('single', 0.03, 10);
  const expected = year0 * Math.pow(1.03, 10);
  return approxEqual(year10, expected, 1)
    ? { pass: true, detail: `Year10=$${year10.toFixed(0)} (expected $${expected.toFixed(0)})` }
    : { detail: `Expected $${expected.toFixed(0)}, got $${year10.toFixed(0)}` };
});

// ============================================================
// 6. calculateFederalTax Tests
// ============================================================
section('6. calculateFederalTax');

test('Zero taxable income returns $0 tax', () => {
  return calculateFederalTax(0, TAX_BRACKETS_2026.single) === 0 ? true : { detail: `Not zero` };
});

test('Negative taxable income returns $0 tax', () => {
  return calculateFederalTax(-5000, TAX_BRACKETS_2026.single) === 0 ? true : { detail: `Not zero` };
});

test('$10,000 income (single) is fully in 10% bracket', () => {
  const result = calculateFederalTax(10000, TAX_BRACKETS_2026.single);
  const expected = 10000 * 0.10;
  return approxEqual(result, expected, 0.01)
    ? { pass: true, detail: `Tax = $${result.toFixed(2)} (expected $${expected.toFixed(2)})` }
    : { detail: `Expected $${expected.toFixed(2)}, got $${result.toFixed(2)}` };
});

test('$30,000 income (single) spans 10% and 12% brackets', () => {
  const result = calculateFederalTax(30000, TAX_BRACKETS_2026.single);
  const expected = 12400 * 0.10 + 17600 * 0.12;
  return approxEqual(result, expected, 0.01)
    ? { pass: true, detail: `Tax = $${result.toFixed(2)} ($1,240 + $2,112 = $${expected.toFixed(2)})` }
    : { detail: `Expected $${expected.toFixed(2)}, got $${result.toFixed(2)}` };
});

test('$75,000 income (single) spans 10%, 12%, and 22% brackets', () => {
  const result = calculateFederalTax(75000, TAX_BRACKETS_2026.single);
  const expected = 12400 * 0.10 + 38000 * 0.12 + 24600 * 0.22;
  return approxEqual(result, expected, 0.01)
    ? { pass: true, detail: `Tax = $${result.toFixed(2)} (expected $${expected.toFixed(2)})` }
    : { detail: `Expected $${expected.toFixed(2)}, got $${result.toFixed(2)}` };
});

test('$200,000 income (mfj) spans multiple brackets correctly', () => {
  const result = calculateFederalTax(200000, TAX_BRACKETS_2026.mfj);
  const expected = 24800 * 0.10 + 76000 * 0.12 + 99200 * 0.22;
  return approxEqual(result, expected, 0.01)
    ? { pass: true, detail: `Tax = $${result.toFixed(2)} (expected $${expected.toFixed(2)})` }
    : { detail: `Expected $${expected.toFixed(2)}, got $${result.toFixed(2)}` };
});

test('Very high income ($1M single) reaches 37% bracket', () => {
  const result = calculateFederalTax(1000000, TAX_BRACKETS_2026.single);
  const expected = 12400*0.10 + 38000*0.12 + 55300*0.22 + 96075*0.24 + 54450*0.32 + 384375*0.35 + (1000000-640600)*0.37;
  return approxEqual(result, expected, 1)
    ? { pass: true, detail: `Tax = $${result.toFixed(2)} (expected $${expected.toFixed(2)})` }
    : { detail: `Expected $${expected.toFixed(2)}, got $${result.toFixed(2)}` };
});

// ============================================================
// 7. calculateCapitalGainsTax Tests
// ============================================================
section('7. calculateCapitalGainsTax');

test('Zero capital gains returns $0', () => {
  return calculateCapitalGainsTax(0, 30000, CAPITAL_GAINS_BRACKETS_2026.single) === 0 ? true : { detail: `Not zero` };
});

test('Negative capital gains returns $0', () => {
  return calculateCapitalGainsTax(-5000, 30000, CAPITAL_GAINS_BRACKETS_2026.single) === 0 ? true : { detail: `Not zero` };
});

test('$20,000 gains with $20,000 ordinary income (single) - all at 0%', () => {
  const result = calculateCapitalGainsTax(20000, 20000, CAPITAL_GAINS_BRACKETS_2026.single);
  return result === 0
    ? { pass: true, detail: `Tax = $0 (gains within 0% bracket up to $48,350)` }
    : { detail: `Expected 0, got ${result}` };
});

test('$50,000 gains with $40,000 ordinary income (single) - straddles 0%/15%', () => {
  const result = calculateCapitalGainsTax(50000, 40000, CAPITAL_GAINS_BRACKETS_2026.single);
  const expected = 8350 * 0.00 + 41650 * 0.15;
  return approxEqual(result, expected, 1)
    ? { pass: true, detail: `Tax = $${result.toFixed(2)} ($8,350 at 0% + $41,650 at 15%)` }
    : { detail: `Expected $${expected.toFixed(2)}, got $${result.toFixed(2)}` };
});

test('High gains ($600k) with high income ($100k mfj) reaches 20% bracket', () => {
  const result = calculateCapitalGainsTax(600000, 100000, CAPITAL_GAINS_BRACKETS_2026.mfj);
  const expected = 500050 * 0.15 + 99950 * 0.20;
  return approxEqual(result, expected, 1)
    ? { pass: true, detail: `Tax = $${result.toFixed(2)} (expected $${expected.toFixed(2)})` }
    : { detail: `Expected $${expected.toFixed(2)}, got $${result.toFixed(2)}` };
});

// ============================================================
// 8. formatCurrency Tests
// ============================================================
section('8. formatCurrency');

test('Formats $1234567 as $1,234,567', () => {
  const result = formatCurrency(1234567);
  return result === '$1,234,567'
    ? { pass: true, detail: `"${result}"` }
    : { detail: `Expected "$1,234,567", got "${result}"` };
});

test('Formats $0 correctly', () => {
  return formatCurrency(0) === '$0' ? true : { detail: `Got "${formatCurrency(0)}"` };
});

test('Formats negative values', () => {
  const result = formatCurrency(-5000);
  return result.includes('5,000')
    ? { pass: true, detail: `"${result}"` }
    : { detail: `Got "${result}"` };
});

test('Handles null input', () => {
  return formatCurrency(null) === '$0' ? true : { detail: `Got "${formatCurrency(null)}"` };
});

test('Handles NaN input', () => {
  return formatCurrency(NaN) === '$0' ? true : { detail: `Got "${formatCurrency(NaN)}"` };
});

// ============================================================
// 9. formatNumberWithCommas Tests
// ============================================================
section('9. formatNumberWithCommas');

test('Formats 1234567 as "1,234,567"', () => {
  const result = formatNumberWithCommas(1234567);
  return result === '1,234,567' ? true : { detail: `Got "${result}"` };
});

test('Formats small number (999) without commas', () => {
  return formatNumberWithCommas(999) === '999' ? true : { detail: `Got "${formatNumberWithCommas(999)}"` };
});

test('Returns empty string for null', () => {
  return formatNumberWithCommas(null) === '' ? true : { detail: `Got "${formatNumberWithCommas(null)}"` };
});

test('Returns empty string for empty string', () => {
  return formatNumberWithCommas('') === '' ? true : { detail: `Got "${formatNumberWithCommas('')}"` };
});

// ============================================================
// 10. inflateValue Tests
// ============================================================
section('10. inflateValue');

test('$100,000 at 3% for 0 years = $100,000', () => {
  return inflateValue(100000, 0.03, 0) === 100000
    ? { pass: true, detail: `$100,000` }
    : { detail: `Got ${inflateValue(100000, 0.03, 0)}` };
});

test('$100,000 at 3% for 1 year = $103,000', () => {
  const result = inflateValue(100000, 0.03, 1);
  return approxEqual(result, 103000, 0.01)
    ? { pass: true, detail: `$${result.toFixed(2)}` }
    : { detail: `Expected 103000, got ${result}` };
});

test('$100,000 at 3% for 10 years', () => {
  const result = inflateValue(100000, 0.03, 10);
  const expected = 100000 * Math.pow(1.03, 10);
  return approxEqual(result, expected, 0.01)
    ? { pass: true, detail: `$${result.toFixed(2)} (expected $${expected.toFixed(2)})` }
    : { detail: `Expected $${expected.toFixed(2)}, got $${result.toFixed(2)}` };
});

test('$50,000 at 0% for 20 years = $50,000', () => {
  return inflateValue(50000, 0, 20) === 50000
    ? { pass: true, detail: `Zero inflation preserved value` }
    : { detail: `Got ${inflateValue(50000, 0, 20)}` };
});

// ============================================================
// 11. inflateSpendingSmile Tests
// ============================================================
section('11. inflateSpendingSmile');

test('Same year returns base spending unchanged', () => {
  const result = inflateSpendingSmile(100000, 0.03, 2026, 2026, 2040, 0.01, 2055, 0.02);
  return result === 100000
    ? { pass: true, detail: `Spending = $${result}` }
    : { detail: `Expected 100000, got ${result}` };
});

test('Phase 1 (before phase2Year) uses full base inflation', () => {
  const result = inflateSpendingSmile(100000, 0.03, 2026, 2030, 2040, 0.01, 2055, 0.02);
  const expected = 100000 * Math.pow(1.03, 4);
  return approxEqual(result, expected, 0.01)
    ? { pass: true, detail: `$${result.toFixed(2)} (expected $${expected.toFixed(2)})` }
    : { detail: `Expected $${expected.toFixed(2)}, got $${result.toFixed(2)}` };
});

test('Phase 2 uses reduced inflation', () => {
  const result = inflateSpendingSmile(100000, 0.03, 2026, 2042, 2040, 0.01, 2055, 0.02);
  let expected = 100000;
  for (let y = 2027; y <= 2039; y++) expected *= 1.03;
  for (let y = 2040; y <= 2042; y++) expected *= 1.02;
  return approxEqual(result, expected, 0.01)
    ? { pass: true, detail: `$${result.toFixed(2)} (expected $${expected.toFixed(2)})` }
    : { detail: `Expected $${expected.toFixed(2)}, got $${result.toFixed(2)}` };
});

test('Phase 3 uses further reduced inflation', () => {
  const result = inflateSpendingSmile(100000, 0.03, 2026, 2060, 2040, 0.01, 2055, 0.02);
  let expected = 100000;
  for (let y = 2027; y <= 2039; y++) expected *= 1.03;
  for (let y = 2040; y <= 2054; y++) expected *= 1.02;
  for (let y = 2055; y <= 2060; y++) expected *= 1.01;
  return approxEqual(result, expected, 0.01)
    ? { pass: true, detail: `$${result.toFixed(2)} (expected $${expected.toFixed(2)})` }
    : { detail: `Expected $${expected.toFixed(2)}, got $${result.toFixed(2)}` };
});

// ============================================================
// 12. choleskyDecomposition Tests
// ============================================================
section('12. choleskyDecomposition');

test('2x2 identity matrix decomposes to identity', () => {
  const L = choleskyDecomposition([[1,0],[0,1]]);
  return L && L[0][0] === 1 && L[1][1] === 1 && L[0][1] === 0 && L[1][0] === 0
    ? { pass: true, detail: `L = [[${L[0]}],[${L[1]}]]` }
    : { detail: `Unexpected: ${JSON.stringify(L)}` };
});

test('3x3 positive definite matrix decomposes correctly', () => {
  const A = [[4,2,0],[2,5,1],[0,1,3]];
  const L = choleskyDecomposition(A);
  if (!L) return { detail: 'Returned null' };
  return approxEqual(L[0][0], 2, 0.001) && L[0][1] === 0 && L[0][2] === 0
    ? { pass: true, detail: `L[0][0]=${L[0][0].toFixed(4)}, lower triangular verified` }
    : { detail: `L = ${JSON.stringify(L)}` };
});

test('L * L^T reconstructs original matrix', () => {
  const A = [[4,2,0],[2,5,1],[0,1,3]];
  const L = choleskyDecomposition(A);
  if (!L) return { detail: 'Returned null' };
  const n = 3;
  const product = Array.from({length:n}, () => new Array(n).fill(0));
  for (let i=0;i<n;i++) for(let j=0;j<n;j++) for(let k=0;k<n;k++) product[i][j]+=L[i][k]*L[j][k];
  let match = true;
  for (let i=0;i<n;i++) for(let j=0;j<n;j++) if(!approxEqual(product[i][j],A[i][j],0.0001)) match=false;
  return match
    ? { pass: true, detail: `L*L^T matches A within tolerance` }
    : { detail: `Product doesn't match` };
});

test('Non positive-definite matrix returns null', () => {
  return choleskyDecomposition([[1,2],[2,1]]) === null
    ? { pass: true, detail: `Correctly returned null` }
    : { detail: `Should have returned null` };
});

// ============================================================
// 13. ensurePositiveDefinite Tests
// ============================================================
section('13. ensurePositiveDefinite');

test('Already PD matrix is returned as-is (symmetrized)', () => {
  const result = ensurePositiveDefinite([[1,0.5],[0.5,1]]);
  return approxEqual(result[0][0], 1, 0.001) && approxEqual(result[0][1], 0.5, 0.001)
    ? { pass: true, detail: `Matrix preserved` }
    : { detail: `Result: ${JSON.stringify(result)}` };
});

test('Result is symmetric', () => {
  const result = ensurePositiveDefinite([[1,0.9,0.9],[0.9,1,0.9],[0.9,0.9,1]]);
  let sym = true;
  for (let i=0;i<3;i++) for(let j=0;j<3;j++) if(!approxEqual(result[i][j],result[j][i],0.0001)) sym=false;
  return sym ? { pass: true, detail: `Symmetric` } : { detail: `Not symmetric` };
});

test('Result has diagonal of 1s (correlation matrix)', () => {
  const result = ensurePositiveDefinite([[1,0.8,0.8],[0.8,1,0.8],[0.8,0.8,1]]);
  const ok = approxEqual(result[0][0],1,0.001) && approxEqual(result[1][1],1,0.001) && approxEqual(result[2][2],1,0.001);
  return ok
    ? { pass: true, detail: `Diagonal: [${result[0][0].toFixed(4)}, ${result[1][1].toFixed(4)}, ${result[2][2].toFixed(4)}]` }
    : { detail: `Diagonal not all 1s` };
});

test('Result can be Cholesky-decomposed (is positive definite)', () => {
  const fixed = ensurePositiveDefinite([[1,0.99,0.99],[0.99,1,0.99],[0.99,0.99,1]]);
  return choleskyDecomposition(fixed) !== null
    ? { pass: true, detail: `Cholesky succeeded on fixed matrix` }
    : { detail: `Cholesky failed` };
});

// ============================================================
// 14. generateReturn Tests
// ============================================================
section('14. generateReturn');

test('z=0 returns the geometric mean', () => {
  const result = generateReturn(0.07, 0.18, 0);
  return approxEqual(result, 0.07, 0.0001)
    ? { pass: true, detail: `Return = ${(result*100).toFixed(4)}% (expected 7%)` }
    : { detail: `Expected 7%, got ${(result*100).toFixed(4)}%` };
});

test('Positive z gives higher-than-mean return', () => {
  const result = generateReturn(0.07, 0.18, 2);
  return result > 0.07
    ? { pass: true, detail: `Return = ${(result*100).toFixed(2)}% (> 7%)` }
    : { detail: `Expected > 7%, got ${(result*100).toFixed(2)}%` };
});

test('Negative z gives lower-than-mean return', () => {
  const result = generateReturn(0.07, 0.18, -2);
  return result < 0.07
    ? { pass: true, detail: `Return = ${(result*100).toFixed(2)}% (< 7%)` }
    : { detail: `Expected < 7%, got ${(result*100).toFixed(2)}%` };
});

test('Return is always > -100%', () => {
  const result = generateReturn(0.07, 0.18, -5);
  return result > -1
    ? { pass: true, detail: `Return = ${(result*100).toFixed(2)}% (> -100%)` }
    : { detail: `Expected > -100%` };
});

test('z is clamped to +/-5 (z=10 same as z=5)', () => {
  const r5 = generateReturn(0.07, 0.18, 5);
  const r10 = generateReturn(0.07, 0.18, 10);
  return approxEqual(r5, r10, 0.0001)
    ? { pass: true, detail: `z=5: ${(r5*100).toFixed(2)}%, z=10: ${(r10*100).toFixed(2)}%` }
    : { detail: `z=5: ${r5}, z=10: ${r10}` };
});

test('Zero volatility always returns geometric mean', () => {
  const r1 = generateReturn(0.05, 0, 2);
  const r2 = generateReturn(0.05, 0, -3);
  return approxEqual(r1, 0.05, 0.0001) && approxEqual(r2, 0.05, 0.0001)
    ? { pass: true, detail: `Both = ${(r1*100).toFixed(4)}%` }
    : { detail: `r1=${r1}, r2=${r2}` };
});

test('Random return (no z) is a valid number', () => {
  const result = generateReturn(0.07, 0.18);
  return typeof result === 'number' && !isNaN(result) && result > -1
    ? { pass: true, detail: `Random return = ${(result*100).toFixed(2)}%` }
    : { detail: `Invalid: ${result}` };
});

// ============================================================
// 15. getPercentile Tests
// ============================================================
section('15. getPercentile');

test('Median of sorted [10,20,30,40,50] is 30', () => {
  return getPercentile([10,20,30,40,50], 0.5) === 30
    ? { pass: true, detail: `P50 = 30` }
    : { detail: `Got ${getPercentile([10,20,30,40,50], 0.5)}` };
});

test('10th percentile of 100-element array', () => {
  const arr = Array.from({length:100}, (_,i) => i+1);
  const result = getPercentile(arr, 0.1);
  return result === 11
    ? { pass: true, detail: `P10 = ${result}` }
    : { detail: `Expected 11, got ${result}` };
});

test('90th percentile of 100-element array', () => {
  const arr = Array.from({length:100}, (_,i) => i+1);
  const result = getPercentile(arr, 0.9);
  return result === 91
    ? { pass: true, detail: `P90 = ${result}` }
    : { detail: `Expected 91, got ${result}` };
});

test('Percentile never exceeds array bounds', () => {
  return getPercentile([1,2,3], 0.99) === 3
    ? { pass: true, detail: `P99 = 3 (last element)` }
    : { detail: `Got ${getPercentile([1,2,3], 0.99)}` };
});

// ============================================================
// 16. calculateWithdrawalAllocation Tests
// ============================================================
section('16. calculateWithdrawalAllocation');

test('Zero withdrawal with no RMD returns all zeros', () => {
  const result = calculateWithdrawalAllocation(
    0, 0, 0, 0,
    500000, 200000, 300000, 150000, 0.5,
    0, 0, 0, 0, 'single',
    16100, 50400, TAX_BRACKETS_2026.single, CAPITAL_GAINS_BRACKETS_2026.single, 0.05
  );
  return result.grossWithdrawal === 0 && result.fromPreTax === 0 && result.fromRoth === 0
    ? { pass: true, detail: `All withdrawal amounts = $0` }
    : { detail: `gross=${result.grossWithdrawal}` };
});

test('RMDs are taken first from pre-tax', () => {
  const result = calculateWithdrawalAllocation(
    50000, 30000, 15000, 15000,
    500000, 200000, 100000, 50000, 0.5,
    500, 2000, 0, 0, 'mfj',
    32200, 100800, TAX_BRACKETS_2026.mfj, CAPITAL_GAINS_BRACKETS_2026.mfj, 0.05
  );
  return result.fromPreTax >= 30000
    ? { pass: true, detail: `fromPreTax = $${result.fromPreTax.toFixed(0)} (>= $30k RMD)` }
    : { detail: `Expected >= 30000, got ${result.fromPreTax}` };
});

test('Roth is used last (when other accounts exhausted)', () => {
  const result = calculateWithdrawalAllocation(
    800000, 0, 0, 0,
    100000, 500000, 100000, 50000, 0.5,
    0, 0, 0, 0, 'single',
    16100, 50400, TAX_BRACKETS_2026.single, CAPITAL_GAINS_BRACKETS_2026.single, 0.05
  );
  return result.fromRoth > 0 && result.fromPreTax > 0
    ? { pass: true, detail: `PreTax=$${result.fromPreTax.toFixed(0)}, Taxable=$${result.fromTaxable.toFixed(0)}, Roth=$${result.fromRoth.toFixed(0)}` }
    : { detail: `fromRoth=${result.fromRoth}` };
});

test('Social Security taxable portion calculated for high provisional income', () => {
  const result = calculateWithdrawalAllocation(
    100000, 50000, 50000, 0,
    500000, 200000, 100000, 50000, 0.5,
    500, 2000, 10000, 40000, 'single',
    16100, 50400, TAX_BRACKETS_2026.single, CAPITAL_GAINS_BRACKETS_2026.single, 0.05
  );
  return result.taxableSocialSecurity > 0 && result.taxableSocialSecurity <= 40000 * 0.85
    ? { pass: true, detail: `Taxable SS = $${result.taxableSocialSecurity.toFixed(0)} (max $${(40000*0.85).toFixed(0)})` }
    : { detail: `taxableSS = ${result.taxableSocialSecurity}` };
});

test('State tax is flat rate on taxable income + gains', () => {
  const result = calculateWithdrawalAllocation(
    50000, 0, 0, 0,
    500000, 0, 0, 0, 0,
    0, 0, 0, 0, 'single',
    16100, 50400, TAX_BRACKETS_2026.single, CAPITAL_GAINS_BRACKETS_2026.single, 0.05
  );
  const expected = (result.taxableOrdinaryIncome + result.totalCapitalGains) * 0.05;
  return approxEqual(result.stateTax, expected, 0.01)
    ? { pass: true, detail: `State tax = $${result.stateTax.toFixed(2)}` }
    : { detail: `Expected $${expected.toFixed(2)}, got $${result.stateTax.toFixed(2)}` };
});

// ============================================================
// 17. calculateOptimizedWithdrawal Tests
// ============================================================
section('17. calculateOptimizedWithdrawal');

test('$0 target produces minimal withdrawal (no RMDs at age 65)', () => {
  const result = calculateOptimizedWithdrawal(0, null, {
    client1PreTax: 500000, client2PreTax: 0, totalPreTax: 500000,
    client1Roth: 200000, client2Roth: 0, totalRoth: 200000,
    totalTaxable: 100000, taxableBasis: 50000, stockAllocation: 0.6,
    filingStatus: 'single', stateTaxRate: 0.05, baseInflation: 0.03, yearsFromStart: 0,
    client1Age: 65, client2Age: 0, client1RmdAge: 73, client2RmdAge: 73,
    otherIncome: 0, socialSecurityIncome: 0
  });
  return result.totalRMD === 0 && result.grossWithdrawal === 0
    ? { pass: true, detail: `No RMD at 65, gross = $0` }
    : { detail: `RMD=${result.totalRMD}, gross=${result.grossWithdrawal}` };
});

test('Age 75 triggers RMDs in optimized withdrawal', () => {
  const result = calculateOptimizedWithdrawal(50000, null, {
    client1PreTax: 1000000, client2PreTax: 0, totalPreTax: 1000000,
    client1Roth: 200000, client2Roth: 0, totalRoth: 200000,
    totalTaxable: 100000, taxableBasis: 50000, stockAllocation: 0.6,
    filingStatus: 'single', stateTaxRate: 0.05, baseInflation: 0.03, yearsFromStart: 0,
    client1Age: 75, client2Age: 0, client1RmdAge: 73, client2RmdAge: 73,
    otherIncome: 0, socialSecurityIncome: 0
  });
  const expectedRMD = 1000000 / 24.6;
  return approxEqual(result.client1RMD, expectedRMD, 1)
    ? { pass: true, detail: `RMD = $${result.client1RMD.toFixed(0)} (expected $${expectedRMD.toFixed(0)})` }
    : { detail: `Expected ~$${expectedRMD.toFixed(0)}, got $${result.client1RMD.toFixed(0)}` };
});

test('Binary search converges to target after-tax within $50', () => {
  const target = 80000;
  const result = calculateOptimizedWithdrawal(target, null, {
    client1PreTax: 500000, client2PreTax: 0, totalPreTax: 500000,
    client1Roth: 200000, client2Roth: 0, totalRoth: 200000,
    totalTaxable: 300000, taxableBasis: 150000, stockAllocation: 0.6,
    filingStatus: 'mfj', stateTaxRate: 0.05, baseInflation: 0.03, yearsFromStart: 0,
    client1Age: 65, client2Age: 63, client1RmdAge: 73, client2RmdAge: 73,
    otherIncome: 0, socialSecurityIncome: 0
  });
  const diff = Math.abs(result.afterTax - target);
  return diff < 100
    ? { pass: true, detail: `After-tax=$${result.afterTax.toFixed(0)}, target=$${target} (diff $${diff.toFixed(0)})` }
    : { detail: `After-tax=$${result.afterTax.toFixed(0)}, target=$${target}, diff=$${diff.toFixed(0)}` };
});

test('Gross withdrawal exceeds after-tax target (taxes paid)', () => {
  const target = 60000;
  const result = calculateOptimizedWithdrawal(target, null, {
    client1PreTax: 800000, client2PreTax: 0, totalPreTax: 800000,
    client1Roth: 100000, client2Roth: 0, totalRoth: 100000,
    totalTaxable: 200000, taxableBasis: 100000, stockAllocation: 0.6,
    filingStatus: 'single', stateTaxRate: 0.05, baseInflation: 0.03, yearsFromStart: 0,
    client1Age: 65, client2Age: 0, client1RmdAge: 73, client2RmdAge: 73,
    otherIncome: 0, socialSecurityIncome: 0
  });
  return result.grossWithdrawal >= target && result.totalTax >= 0
    ? { pass: true, detail: `Gross=$${result.grossWithdrawal.toFixed(0)}, Tax=$${result.totalTax.toFixed(0)}, Net=$${result.afterTax.toFixed(0)}` }
    : { detail: `Gross=${result.grossWithdrawal}` };
});

test('Qualified dividends and interest income from taxable balance', () => {
  const result = calculateOptimizedWithdrawal(50000, null, {
    client1PreTax: 300000, client2PreTax: 0, totalPreTax: 300000,
    client1Roth: 100000, client2Roth: 0, totalRoth: 100000,
    totalTaxable: 500000, taxableBasis: 250000, stockAllocation: 0.7,
    filingStatus: 'single', stateTaxRate: 0.05, baseInflation: 0.03, yearsFromStart: 0,
    client1Age: 65, client2Age: 0, client1RmdAge: 73, client2RmdAge: 73,
    otherIncome: 0, socialSecurityIncome: 0
  });
  return approxEqual(result.qualifiedDividends, 3500, 1) && approxEqual(result.interestIncome, 6000, 1)
    ? { pass: true, detail: `Dividends=$${result.qualifiedDividends.toFixed(0)}, Interest=$${result.interestIncome.toFixed(0)}` }
    : { detail: `Div=${result.qualifiedDividends}, Int=${result.interestIncome}` };
});

// ============================================================
// SUMMARY
// ============================================================
console.log(`\n${'='.repeat(60)}`);
console.log(`${BOLD}TEST SUMMARY${RESET}`);
console.log(`${'='.repeat(60)}`);
console.log(`Total:  ${totalTests}`);
console.log(`${GREEN}Passed: ${passedTests}${RESET}`);
if (failedTests > 0) {
  console.log(`${RED}Failed: ${failedTests}${RESET}`);
} else {
  console.log(`Failed: 0`);
}
console.log(`${'='.repeat(60)}`);
if (failedTests === 0) {
  console.log(`\n${GREEN}${BOLD}ALL ${totalTests} TESTS PASSED${RESET}\n`);
} else {
  console.log(`\n${RED}${BOLD}${failedTests} of ${totalTests} TESTS FAILED${RESET}\n`);
}

process.exit(failedTests > 0 ? 1 : 0);
