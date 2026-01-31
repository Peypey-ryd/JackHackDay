/**
 * California Airport Efficiency — Website
 * Loads policy output and California_Data.csv for display.
 */

const POLICY_FILE = 'policy_output.txt';
const CSV_FILE = 'California_Data.csv';

// Parse CSV row handling quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if ((c === ',' && !inQuotes) || (c === '\r' && !inQuotes)) {
      result.push(current.trim());
      current = '';
      if (c === '\r') i++;
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text) {
  const lines = text.split('\n').filter((l) => l.length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map((line) => parseCSVLine(line));
  return { headers, rows };
}

function formatCurrency(val) {
  if (val === '' || val === 'NULL' || val == null) return '—';
  const n = Number(val);
  if (Number.isNaN(n)) return val;
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(2) + 'K';
  return n.toLocaleString();
}

// Load policy from file or placeholder
async function loadPolicy() {
  const placeholder = document.getElementById('policy-placeholder');
  const content = document.getElementById('policy-content');
  try {
    const res = await fetch(POLICY_FILE);
    if (res.ok) {
      const text = await res.text();
      if (text.trim()) {
        placeholder.classList.add('hidden');
        content.classList.remove('hidden');
        content.textContent = text.trim();
        return;
      }
    }
  } catch (_) {
    // No policy file or CORS/local — keep placeholder
  }
  placeholder.classList.remove('hidden');
  content.classList.add('hidden');
}

function initPolicyPaste() {
  const placeholder = document.getElementById('policy-placeholder');
  const content = document.getElementById('policy-content');
  const pasteBtn = document.getElementById('paste-btn');
  const clearBtn = document.getElementById('clear-btn');

  pasteBtn.addEventListener('click', () => {
    const raw = prompt('Paste the policy text from your terminal (output of GeminiHoyaHack.py):');
    if (raw != null && raw.trim()) {
      placeholder.classList.add('hidden');
      content.classList.remove('hidden');
      content.textContent = raw.trim();
    }
  });

  clearBtn.addEventListener('click', () => {
    content.textContent = '';
    content.classList.add('hidden');
    placeholder.classList.remove('hidden');
  });
}

// Load CSV and render table + summary stats
async function loadData() {
  const tableBody = document.getElementById('table-body');
  const statsGrid = document.getElementById('stats-grid');
  if (!tableBody || !statsGrid) return;

  try {
    const res = await fetch(CSV_FILE);
    if (!res.ok) throw new Error('Could not load CSV');
    const text = await res.text();
    const { headers, rows } = parseCSV(text);

    const idxEntity = headers.findIndex((h) => h === 'Entity Name');
    const idxYear = headers.findIndex((h) => h === 'Fiscal Year');
    const idxRev = headers.findIndex((h) => h === 'Total Operating Revenues');
    const idxExp = headers.findIndex((h) => h === 'Total Operating Expenses');
    const idxIncome = headers.findIndex((h) => h === 'Operating Income (Loss)');

    if (idxEntity < 0 || idxYear < 0) return;

    // FY 2024 only for summary
    const fy2024 = rows.filter((r) => r[idxYear] === '2024');
    const withRev = fy2024.filter((r) => r[idxRev] && r[idxRev] !== 'NULL');
    const withExp = fy2024.filter((r) => r[idxExp] && r[idxExp] !== 'NULL');
    const totalRev = withRev.reduce((s, r) => s + Number(r[idxRev]) || 0, 0);
    const totalExp = withExp.reduce((s, r) => s + Number(r[idxExp]) || 0, 0);

    statsGrid.innerHTML = `
      <div class="stat-card">
        <div class="stat-label">Airports (FY 2024)</div>
        <div class="stat-value">${fy2024.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Operating Revenues</div>
        <div class="stat-value">${formatCurrency(totalRev)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Operating Expenses</div>
        <div class="stat-value">${formatCurrency(totalExp)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Rows in dataset</div>
        <div class="stat-value">${rows.length}</div>
      </div>
    `;

    // Table: show first 50 FY2024 rows
    const displayRows = fy2024.slice(0, 50);
    tableBody.innerHTML = displayRows
      .map((r) => {
        const rev = r[idxRev];
        const exp = r[idxExp];
        const income = r[idxIncome];
        const incomeNum = income && income !== 'NULL' ? Number(income) : null;
        const incomeClass =
          incomeNum != null
            ? incomeNum >= 0
              ? 'num-positive'
              : 'num-negative'
            : '';
        return `
          <tr>
            <td>${escapeHtml(r[idxEntity] || '—')}</td>
            <td>${escapeHtml(r[idxYear] || '—')}</td>
            <td>${formatCurrency(rev)}</td>
            <td>${formatCurrency(exp)}</td>
            <td class="${incomeClass}">${formatCurrency(income)}</td>
          </tr>
        `;
      })
      .join('');
  } catch (e) {
    tableBody.innerHTML = '<tr><td colspan="5">Load California_Data.csv in the same folder as this page to see data.</td></tr>';
    statsGrid.innerHTML = '';
  }
}

function escapeHtml(s) {
  if (s == null) return '—';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

// Run on load
(async () => {
  await loadPolicy();
  initPolicyPaste();
  await loadData();
})();
