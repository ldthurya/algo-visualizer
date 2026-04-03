// State
let algorithm = 'booth';
let inputMode = 'decimal';
let steps = [];
let currentStep = 0;
let isStarted = false;

// Algorithm step definitions
const algorithmSteps = {
  booth: {
    initialization: [
      'Set A = 0 (n bits)',
      'Set Q = Multiplier (n bits)',
      'Set Q-1 = 0',
      'Set M = Multiplicand',
      'Set Count = n',
    ],
    loop: [
      'Check Q0 and Q-1',
      'If Q0=0, Q-1=1: A = A + M',
      'If Q0=1, Q-1=0: A = A - M',
      'If Q0=Q-1: No operation',
      'Arithmetic Right Shift (A, Q, Q-1)',
      'Decrement Count',
      'Repeat until Count = 0',
    ],
  },
  'modified-booth': {
    initialization: [
      'Set A = 0 (n bits)',
      'Set Q = Multiplier (n bits)',
      'Set Q-1 = 0',
      'Set M = Multiplicand',
      'Set Count = n/2',
    ],
    loop: [
      'Check Q1, Q0, Q-1',
      '000 or 111: No operation',
      '001 or 010: A = A + M',
      '011: A = A + 2M',
      '100: A = A - 2M',
      '101 or 110: A = A - M',
      'Arithmetic Right Shift by 2 bits',
      'Decrement Count',
      'Repeat until Count = 0',
    ],
  },
  restoring: {
    initialization: [
      'Set A = 0 (n bits)',
      'Set Q = Dividend (n bits)',
      'Set M = Divisor',
      'Set Count = n',
    ],
    loop: [
      'Shift Left (A, Q) by 1 bit',
      'A = A - M',
      'If A >= 0: Set Q0 = 1',
      'If A < 0: Restore A, Set Q0 = 0',
      'Decrement Count',
      'Repeat until Count = 0',
      'Result: Q = Quotient, A = Remainder',
    ],
  },
  'non-restoring': {
    initialization: [
      'Set A = 0 (n bits)',
      'Set Q = Dividend (n bits)',
      'Set M = Divisor',
      'Set Count = n',
    ],
    loop: [
      'If A >= 0: Shift Left, A = A - M',
      'If A < 0: Shift Left, A = A + M',
      'If A >= 0: Set Q0 = 1',
      'If A < 0: Set Q0 = 0',
      'Decrement Count',
      'Repeat until Count = 0',
      'Final correction if A < 0',
      'Result: Q = Quotient, A = Remainder',
    ],
  },
};

// Helper functions
function decimalToBinary(num, bits) {
  if (num >= 0) {
    return num.toString(2).padStart(bits, '0');
  }
  const twosComplement = (1 << bits) + num;
  return twosComplement.toString(2).padStart(bits, '0');
}

function twosComplementToDecimal(bin) {
  const bits = bin.length;
  if (bin[0] === '1') {
    return parseInt(bin, 2) - (1 << bits);
  }
  return parseInt(bin, 2);
}

function addBinary(a, b) {
  const bits = Math.max(a.length, b.length);
  const aVal = twosComplementToDecimal(a.padStart(bits, a[0]));
  const bVal = twosComplementToDecimal(b.padStart(bits, b[0]));
  return decimalToBinary(aVal + bVal, bits);
}

function subtractBinary(a, b) {
  const bits = Math.max(a.length, b.length);
  const aVal = twosComplementToDecimal(a.padStart(bits, a[0]));
  const bVal = twosComplementToDecimal(b.padStart(bits, b[0]));
  return decimalToBinary(aVal - bVal, bits);
}

function arithmeticRightShift(combined) {
  const signBit = combined[0];
  return signBit + combined.slice(0, -1);
}

function shiftLeft(combined) {
  return combined.slice(1) + '0';
}

// Booth's Algorithm
function computeBoothSteps(multiplicand, multiplier) {
  const result = [];
  const n = Math.max(multiplicand.length, multiplier.length, 4);

  let A = '0'.repeat(n);
  let Q = multiplier.padStart(n, multiplier[0] || '0');
  let Q_1 = '0';
  const M = multiplicand.padStart(n, multiplicand[0] || '0');
  let count = n;

  result.push({ A, Q, Q_1, M, count, operation: 'Initialize', condition: '-', loopStepIndex: -1 });

  while (count > 0) {
    const Q0 = Q[Q.length - 1];
    let operation = '';
    let loopStepIndex = 0;
    const condition = `Q0Q-1 = ${Q0}${Q_1}`;

    if (Q0 === '0' && Q_1 === '1') {
      A = addBinary(A, M);
      operation = 'A = A + M';
      loopStepIndex = 1;
    } else if (Q0 === '1' && Q_1 === '0') {
      A = subtractBinary(A, M);
      operation = 'A = A - M';
      loopStepIndex = 2;
    } else {
      operation = 'No op';
      loopStepIndex = 3;
    }

    result.push({ A, Q, Q_1, M, count, operation, condition, loopStepIndex });

    const combined = A + Q + Q_1;
    const shifted = arithmeticRightShift(combined);
    A = shifted.slice(0, n);
    Q = shifted.slice(n, 2 * n);
    Q_1 = shifted.slice(2 * n);
    count--;

    result.push({ A, Q, Q_1, M, count, operation: 'Arithmetic Right Shift', condition: '-', loopStepIndex: 4 });
  }

  const resultDec = twosComplementToDecimal(A + Q);
  result.push({ A, Q, Q_1, M, count: 0, operation: `Result = ${A}${Q} (${resultDec})`, condition: 'Done', loopStepIndex: 6 });

  return result;
}

// Modified Booth's Algorithm
function computeModifiedBoothSteps(multiplicand, multiplier) {
  const result = [];
  let n = Math.max(multiplicand.length, multiplier.length, 4);
  if (n % 2 !== 0) n++;

  let A = '0'.repeat(n);
  let Q = multiplier.padStart(n, multiplier[0] || '0');
  let Q_1 = '0';
  const M = multiplicand.padStart(n, multiplicand[0] || '0');
  let count = n / 2;

  result.push({ A, Q, Q_1, M, count, operation: 'Initialize', condition: '-', loopStepIndex: -1 });

  while (count > 0) {
    const Q1 = Q[Q.length - 2];
    const Q0 = Q[Q.length - 1];
    const code = Q1 + Q0 + Q_1;
    let operation = '';
    let loopStepIndex = 0;
    const condition = `Q1Q0Q-1 = ${code}`;

    if (code === '000' || code === '111') {
      operation = 'No op';
      loopStepIndex = 1;
    } else if (code === '001' || code === '010') {
      A = addBinary(A, M);
      operation = 'A = A + M';
      loopStepIndex = 2;
    } else if (code === '011') {
      const M2 = decimalToBinary(twosComplementToDecimal(M) * 2, n);
      A = addBinary(A, M2);
      operation = 'A = A + 2M';
      loopStepIndex = 3;
    } else if (code === '100') {
      const M2 = decimalToBinary(twosComplementToDecimal(M) * 2, n);
      A = subtractBinary(A, M2);
      operation = 'A = A - 2M';
      loopStepIndex = 4;
    } else if (code === '101' || code === '110') {
      A = subtractBinary(A, M);
      operation = 'A = A - M';
      loopStepIndex = 5;
    }

    result.push({ A, Q, Q_1, M, count, operation, condition, loopStepIndex });

    let combined = A + Q + Q_1;
    combined = arithmeticRightShift(combined);
    combined = arithmeticRightShift(combined);
    A = combined.slice(0, n);
    Q = combined.slice(n, 2 * n);
    Q_1 = combined.slice(2 * n);
    count--;

    result.push({ A, Q, Q_1, M, count, operation: 'ASR x2 (Shift Right by 2)', condition: '-', loopStepIndex: 6 });
  }

  const resultDec = twosComplementToDecimal(A + Q);
  result.push({ A, Q, Q_1, M, count: 0, operation: `Result = ${A}${Q} (${resultDec})`, condition: 'Done', loopStepIndex: 8 });

  return result;
}

// Restoring Division
function computeRestoringDivisionSteps(dividend, divisor) {
  const result = [];
  const n = Math.max(dividend.length, divisor.length, 4);

  let A = '0'.repeat(n);
  let Q = dividend.padStart(n, '0');
  const M = divisor.padStart(n, '0');
  let count = n;

  result.push({ A, Q, M, count, operation: 'Initialize', condition: '-', loopStepIndex: -1 });

  while (count > 0) {
    const combined = A + Q;
    const shifted = shiftLeft(combined);
    A = shifted.slice(0, n);
    Q = shifted.slice(n);

    result.push({ A, Q, M, count, operation: 'Shift Left', condition: '-', loopStepIndex: 0 });

    A = subtractBinary(A, M);
    const AVal = twosComplementToDecimal(A);
    const condition = `A = ${AVal >= 0 ? '>= 0' : '< 0'}`;

    if (AVal >= 0) {
      Q = Q.slice(0, -1) + '1';
      result.push({ A, Q, M, count, operation: 'A - M, Q0 = 1', condition, loopStepIndex: 2 });
    } else {
      A = addBinary(A, M);
      Q = Q.slice(0, -1) + '0';
      result.push({ A, Q, M, count, operation: 'A - M, Restore, Q0 = 0', condition, loopStepIndex: 3 });
    }

    count--;
  }

  const quotient = parseInt(Q, 2);
  const remainder = parseInt(A, 2);
  result.push({ A, Q, M, count: 0, operation: `Q=${Q} (${quotient}), R=${A} (${remainder})`, condition: 'Done', loopStepIndex: 6 });

  return result;
}

// Non-Restoring Division
function computeNonRestoringDivisionSteps(dividend, divisor) {
  const result = [];
  const n = Math.max(dividend.length, divisor.length, 4);

  let A = '0'.repeat(n);
  let Q = dividend.padStart(n, '0');
  const M = divisor.padStart(n, '0');
  let count = n;

  result.push({ A, Q, M, count, operation: 'Initialize', condition: '-', loopStepIndex: -1 });

  while (count > 0) {
    const AVal = twosComplementToDecimal(A);
    const prevSign = AVal >= 0 ? '>= 0' : '< 0';

    const combined = A + Q;
    const shifted = shiftLeft(combined);
    A = shifted.slice(0, n);
    Q = shifted.slice(n);

    if (AVal >= 0) {
      A = subtractBinary(A, M);
      const newAVal = twosComplementToDecimal(A);
      if (newAVal >= 0) {
        Q = Q.slice(0, -1) + '1';
        result.push({ A, Q, M, count, operation: 'SL, A - M, Q0 = 1', condition: `A was ${prevSign}`, loopStepIndex: 0 });
      } else {
        Q = Q.slice(0, -1) + '0';
        result.push({ A, Q, M, count, operation: 'SL, A - M, Q0 = 0', condition: `A was ${prevSign}`, loopStepIndex: 0 });
      }
    } else {
      A = addBinary(A, M);
      const newAVal = twosComplementToDecimal(A);
      if (newAVal >= 0) {
        Q = Q.slice(0, -1) + '1';
        result.push({ A, Q, M, count, operation: 'SL, A + M, Q0 = 1', condition: `A was ${prevSign}`, loopStepIndex: 1 });
      } else {
        Q = Q.slice(0, -1) + '0';
        result.push({ A, Q, M, count, operation: 'SL, A + M, Q0 = 0', condition: `A was ${prevSign}`, loopStepIndex: 1 });
      }
    }

    count--;
  }

  const finalAVal = twosComplementToDecimal(A);
  if (finalAVal < 0) {
    A = addBinary(A, M);
    result.push({ A, Q, M, count: 0, operation: 'Correction: A + M', condition: 'A < 0', loopStepIndex: 6 });
  }

  const quotient = parseInt(Q, 2);
  const remainder = parseInt(A, 2);
  result.push({ A, Q, M, count: 0, operation: `Q=${Q} (${quotient}), R=${A} (${remainder})`, condition: 'Done', loopStepIndex: 7 });

  return result;
}

// DOM Elements
const tabs = document.querySelectorAll('.tab');
const modeBtns = document.querySelectorAll('.mode-btn');
const input1El = document.getElementById('input1');
const input2El = document.getElementById('input2');
const error1El = document.getElementById('error1');
const error2El = document.getElementById('error2');
const label1El = document.getElementById('label1');
const label2El = document.getElementById('label2');
const startBtn = document.getElementById('start-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const resetBtn = document.getElementById('reset-btn');
const emptyState = document.getElementById('empty-state');
const tableEl = document.getElementById('computation-table');
const tableBody = document.getElementById('table-body');
const colQ1 = document.getElementById('col-q1');
const controlsSection = document.getElementById('controls-section');
const stepInfo = document.getElementById('step-info');
const initSteps = document.getElementById('init-steps');
const loopSteps = document.getElementById('loop-steps');
const initBlock = document.getElementById('init-block');
const leftPanel = document.querySelector('.left-panel');

// Helper functions
function isMultiplication() {
  return algorithm === 'booth' || algorithm === 'modified-booth';
}

function getBinaryValue(value) {
  if (inputMode === 'binary') {
    return value || '0';
  }
  const num = parseInt(value, 10);
  if (isNaN(num)) return '0000';
  
  // Calculate bits needed: 1 for sign bit + bits for magnitude
  let bits = 4;
  if (num >= 0) {
    bits = Math.max(4, Math.ceil(Math.log2(num + 1)) + 1);
  } else {
    // For negative numbers, we need enough bits for two's complement
    bits = Math.max(4, Math.ceil(Math.log2(Math.abs(num))) + 2);
  }
  
  return decimalToBinary(num, bits);
}

function updateLabels() {
  if (isMultiplication()) {
    label1El.textContent = 'Multiplicand (M)';
    label2El.textContent = 'Multiplier (Q)';
  } else {
    label1El.textContent = 'Divisor (M)';
    label2El.textContent = 'Dividend (Q)';
  }
}

function updateAlgorithmSteps() {
  const info = algorithmSteps[algorithm];
  
  initSteps.innerHTML = info.initialization.map((step, i) => 
    `<li>${step}</li>`
  ).join('');
  
  loopSteps.innerHTML = info.loop.map((step, i) => 
    `<li>${step}</li>`
  ).join('');
}

function highlightCurrentStep() {
  if (!isStarted || steps.length === 0) {
    initBlock.classList.remove('active');
    document.querySelectorAll('.step-list li').forEach(li => li.classList.remove('active'));
    return;
  }

  const step = steps[currentStep];
  const loopIndex = step.loopStepIndex;

  // Highlight init block
  if (loopIndex === -1) {
    initBlock.classList.add('active');
  } else {
    initBlock.classList.remove('active');
  }

  // Highlight specific loop step
  const loopItems = loopSteps.querySelectorAll('li');
  loopItems.forEach((li, i) => {
    if (i === loopIndex) {
      li.classList.add('active');
    } else {
      li.classList.remove('active');
    }
  });
}

function renderTable() {
  if (!isStarted || steps.length === 0) {
    emptyState.classList.remove('hidden');
    tableEl.classList.add('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  tableEl.classList.remove('hidden');

  // Show/hide Q-1 column
  if (isMultiplication()) {
    colQ1.classList.remove('hidden');
  } else {
    colQ1.classList.add('hidden');
  }

  // Render rows up to currentStep
  let html = '';
  for (let i = 0; i <= currentStep; i++) {
    const step = steps[i];
    const isCurrent = i === currentStep;
    html += `
      <tr class="${isCurrent ? 'current' : ''}">
        <td class="muted">${i}</td>
        <td class="mono">${step.A}</td>
        <td class="mono">${step.Q}</td>
        ${isMultiplication() ? `<td class="mono">${step.Q_1}</td>` : ''}
        <td class="mono">${step.M}</td>
        <td>${step.count}</td>
        <td class="mono muted">${step.condition}</td>
        <td>${step.operation}</td>
      </tr>
    `;
  }
  tableBody.innerHTML = html;

  // Auto-scroll to current row
  const currentRow = tableBody.querySelector('.current');
  if (currentRow) {
    currentRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function updateStepInfo() {
  const step = steps[currentStep];
  const isFinal = step.condition === 'Done';

  if (isFinal) {
    stepInfo.className = 'step-info final';
    stepInfo.innerHTML = `
      <div class="step-info-left">
        <span class="step-label">Final Result</span>
        <span class="step-operation">${step.operation}</span>
      </div>
      <span class="step-meta">Step ${currentStep + 1}/${steps.length}</span>
    `;
  } else {
    stepInfo.className = 'step-info current';
    const conditionHtml = step.condition !== '-' ? `<span class="step-condition">(${step.condition})</span>` : '';
    stepInfo.innerHTML = `
      <div class="step-info-left">
        <span class="step-label">Current Step</span>
        <span class="step-operation">${step.operation}</span>
        ${conditionHtml}
      </div>
      <span class="step-meta">Step ${currentStep + 1}/${steps.length} | Count: ${step.count}</span>
    `;
  }
}

function updateControls() {
  prevBtn.disabled = currentStep === 0;
  nextBtn.disabled = currentStep >= steps.length - 1;
}

function render() {
  renderTable();
  if (isStarted) {
    updateStepInfo();
    updateControls();
    highlightCurrentStep();
  }
}

function computeSteps() {
  const bin1 = getBinaryValue(input1El.value);
  const bin2 = getBinaryValue(input2El.value);
  
  switch (algorithm) {
    case 'booth':
      return computeBoothSteps(bin1, bin2);
    case 'modified-booth':
      return computeModifiedBoothSteps(bin1, bin2);
    case 'restoring':
      return computeRestoringDivisionSteps(bin2, bin1);
    case 'non-restoring':
      return computeNonRestoringDivisionSteps(bin2, bin1);
    default:
      return [];
  }
}

function handleStart() {
  // Validate both inputs before starting
  const input1Valid = validateInput(input1El, error1El);
  const input2Valid = validateInput(input2El, error2El);

  if (!input1Valid || !input2Valid) {
    return;
  }

  steps = computeSteps();
  currentStep = 0;
  isStarted = true;
  
  startBtn.classList.add('hidden');
  controlsSection.classList.remove('hidden');
  input1El.disabled = true;
  input2El.disabled = true;
  modeBtns.forEach(btn => btn.disabled = true);
  
  render();
}

function handleReset() {
  steps = [];
  currentStep = 0;
  isStarted = false;
  
  startBtn.classList.remove('hidden');
  controlsSection.classList.add('hidden');
  input1El.disabled = false;
  input2El.disabled = false;
  modeBtns.forEach(btn => btn.disabled = false);
  
  highlightCurrentStep();
  render();
}

function handleNext() {
  if (currentStep < steps.length - 1) {
    currentStep++;
    render();
  }
}

function handlePrevious() {
  if (currentStep > 0) {
    currentStep--;
    render();
  }
}

function handleAlgorithmChange(newAlgorithm) {
  algorithm = newAlgorithm;
  tabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.algorithm === algorithm);
  });
  updateLabels();
  updateAlgorithmSteps();
  handleReset();
}

function handleModeChange(newMode) {
  inputMode = newMode;
  modeBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === inputMode);
  });
  
  // Update placeholders
  if (inputMode === 'binary') {
    input1El.placeholder = 'e.g. 0101';
    input2El.placeholder = 'e.g. 0011';
  } else {
    input1El.placeholder = 'e.g. 5';
    input2El.placeholder = 'e.g. 3';
  }
}

function validateInput(inputEl, errorEl) {
  const value = inputEl.value.trim();
  let isValid = true;
  let errorMsg = '';

  if (value === '') {
    isValid = false;
    errorMsg = 'Please enter a value';
  } else if (inputMode === 'binary') {
    // Binary mode: only accept 0s and 1s
    if (!/^[01]+$/.test(value)) {
      isValid = false;
      errorMsg = 'Binary only';
    }
  } else {
    // Decimal mode: only accept digits and optional minus sign
    if (!/^-?\d+$/.test(value)) {
      isValid = false;
      errorMsg = 'Decimal only';
    }
  }

  // Update UI
  if (isValid) {
    inputEl.classList.remove('error');
    errorEl.textContent = '';
  } else {
    inputEl.classList.add('error');
    errorEl.textContent = errorMsg;
  }

  return isValid;
}

function handleInputValidation(e) {
  const errorEl = e.target === input1El ? error1El : error2El;
  validateInput(e.target, errorEl);
}

// Event Listeners
tabs.forEach(tab => {
  tab.addEventListener('click', () => handleAlgorithmChange(tab.dataset.algorithm));
});

modeBtns.forEach(btn => {
  btn.addEventListener('click', () => handleModeChange(btn.dataset.mode));
});

startBtn.addEventListener('click', handleStart);
prevBtn.addEventListener('click', handlePrevious);
nextBtn.addEventListener('click', handleNext);
resetBtn.addEventListener('click', handleReset);

input1El.addEventListener('input', handleInputValidation);
input2El.addEventListener('input', handleInputValidation);

// Initialize
updateLabels();
updateAlgorithmSteps();
