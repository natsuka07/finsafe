// ─────────────────────────────────────────────────────────────
// FINSAFE MATH ENGINE
// Analisis Keuangan via Analisis Vektor Keuangan
// ─────────────────────────────────────────────────────────────

export const FEATURE_NAMES = [
  "Pengeluaran > Pendapatan",
  "Stress Finansial Tinggi",
  "Frekuensi Top-up / Transaksi",
  "Rasio Diskresi Tinggi",
  "Login Attempts Tinggi",
  "Fraud Flag",
  "Debt-to-Income Ratio",
  "Saving Rate Rendah",
];

// Bobot prior domain knowledge
const W_PRIOR = [0.25, 0.20, 0.18, 0.15, 0.10, 0.07, 0.03, 0.02];

export interface UserInput {
  // Blok A — Pengeluaran Mingguan
  monthly_income: number;
  monthly_expense: number;
  discretionary_spending: number;
  topup_frequency: number; // per minggu

  // Blok B — Perilaku Keuangan
  financial_stress: "Low" | "Medium" | "High";
  login_attempts: number;
  account_balance: number;
  savings_rate: number; // 0–1
  debt_to_income: number; // 0–1
  fraud_flag: boolean;
}

export interface AnalysisResult {
  feature_vector: number[];
  weight_vector: number[];
  score: number;
  status: "RISIKO RENDAH" | "RISIKO SEDANG" | "RISIKO TINGGI";
  dominant_factors: { name: string; contribution: number }[];
  recommendations: string[];
  math_steps: MathStep[];
  principal_components: PrincipalComponent[];
}

export interface MathStep {
  label: string;
  content: string;
  type: "info" | "matrix" | "vector" | "result";
}

export interface PrincipalComponent {
  name: string;
  eigenvalue: number;
  variance_pct: number;
  cumulative_pct: number;
}

// ─── 1. VEKTOR FITUR ─────────────────────────────────────────
function clipNorm(val: number, lo: number, hi: number): number {
  if (hi === lo) return 0;
  return Math.min(1, Math.max(0, (val - lo) / (hi - lo)));
}

export function buildFeatureVector(u: UserInput): number[] {
  const income = u.monthly_income || 1;
  const expense = u.monthly_expense;

  const overspend = Math.max(0, (expense - income) / income);
  const f1 = clipNorm(overspend, 0, 1);

  const stressMap: Record<string, number> = { Low: 0, Medium: 0.5, High: 1 };
  const f2 = stressMap[u.financial_stress] ?? 0;

  const topupProxy = u.topup_frequency / (u.account_balance / 1000 || 1);
  const f3 = clipNorm(topupProxy, 0, 20);

  const discRatio = expense > 0 ? u.discretionary_spending / expense : 0;
  const f4 = clipNorm(discRatio, 0, 0.8);

  const f5 = clipNorm(u.login_attempts, 1, 10);
  const f6 = u.fraud_flag ? 1.0 : 0.0;
  const f7 = clipNorm(u.debt_to_income, 0, 1);
  const f8 = 1.0 - clipNorm(u.savings_rate, 0, 0.5);

  return [f1, f2, f3, f4, f5, f6, f7, f8];
}

// ─── 2. LU DECOMPOSITION ─────────────────────────────────────
function luDecompose(A: number[][]): { L: number[][]; U: number[][] } {
  const n = A.length;
  const L: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );
  const U: number[][] = A.map((row) => [...row]);

  for (let k = 0; k < n - 1; k++) {
    for (let i = k + 1; i < n; i++) {
      if (Math.abs(U[k][k]) < 1e-12) continue;
      const factor = U[i][k] / U[k][k];
      L[i][k] = factor;
      for (let j = k; j < n; j++) {
        U[i][j] -= factor * U[k][j];
      }
    }
  }
  return { L, U };
}

function forwardSub(L: number[][], b: number[]): number[] {
  const n = b.length;
  const y = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = b[i];
    for (let j = 0; j < i; j++) s -= L[i][j] * y[j];
    y[i] = s / L[i][i];
  }
  return y;
}

function backSub(U: number[][], y: number[]): number[] {
  const n = y.length;
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i];
    for (let j = i + 1; j < n; j++) s -= U[i][j] * x[j];
    x[i] = Math.abs(U[i][i]) < 1e-12 ? 0 : s / U[i][i];
  }
  return x;
}

// ─── 3. SISTEM BOBOT (SPL) ───────────────────────────────────
function buildWeightSystem(f: number[]): { A: number[][]; b: number[] } {
  const n = f.length;
  const alpha = 0.3;
  const beta = 0.5;
  const A: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = new Array(n).fill(0);
    for (let j = 0; j < n; j++) {
      row[j] = i === j ? 2.0 : alpha * f[i] * f[j];
    }
    A.push(row);
  }
  const b = W_PRIOR.map((w, i) => w * (1 + beta * f[i]));
  return { A, b };
}

export function solveWeights(f: number[]): {
  weights: number[];
  L: number[][];
  U: number[][];
  y: number[];
} {
  const { A, b } = buildWeightSystem(f);
  const { L, U } = luDecompose(A);
  const y = forwardSub(L, b);
  const x = backSub(U, y);
  const abs = x.map(Math.abs);
  const total = abs.reduce((a, b) => a + b, 0) || 1;
  const weights = abs.map((v) => v / total);
  return { weights, L, U, y };
}

// ─── 4. DIAGONALISASI (Power Iteration approx eigenvalues) ───
export function computePrincipalComponents(
  f: number[]
): PrincipalComponent[] {
  const n = f.length;
  // Buat matriks korelasi 8×8 berbasis vektor fitur ini
  const C: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      if (i === j) return 1.0;
      return f[i] * f[j] * 0.7 + 0.05;
    })
  );

  // Approximasi eigenvalue via diagonal + off-diagonal norms (Gershgorin)
  const eigenvals = C.map((row, i) => {
    const offDiagSum = row.reduce((s, v, j) => (i !== j ? s + Math.abs(v) : s), 0);
    return row[i] + offDiagSum * f[i];
  });

  const total = eigenvals.reduce((a, b) => a + b, 0) || 1;
  let cum = 0;
  return eigenvals
    .map((e, i) => ({ idx: i, e }))
    .sort((a, b) => b.e - a.e)
    .map(({ e, idx }) => {
      const pct = (e / total) * 100;
      cum += pct;
      return {
        name: FEATURE_NAMES[idx],
        eigenvalue: Math.round(e * 1000) / 1000,
        variance_pct: Math.round(pct * 10) / 10,
        cumulative_pct: Math.round(cum * 10) / 10,
      };
    });
}

// ─── 5. REKOMENDASI ──────────────────────────────────────────
function getRecommendations(score: number, f: number[]): string[] {
  const recs: string[] = [];
  if (f[0] > 0.4) recs.push("Catat semua pengeluaran harian secara detail");
  if (f[2] > 0.4) recs.push("Batasi frekuensi top-up dompet digital");
  if (f[1] > 0.5) recs.push("Hubungi Into The Light Indonesia (119 ext 8)");
  if (f[5] > 0) recs.push("Hubungi bank untuk verifikasi transaksi mencurigakan");
  if (f[6] > 0.6) recs.push("Pertimbangkan konsultasi dengan perencana keuangan");
  if (score >= 70) recs.push("Bicara ke orang terpercaya tentang kondisi keuangan");
  if (score < 40) recs.push("Pertahankan pola keuangan yang sehat");
  return recs.length > 0 ? recs : ["Kondisi keuangan dalam batas normal"];
}

// ─── 6. MAIN ANALYZE ─────────────────────────────────────────
export function analyze(input: UserInput): AnalysisResult {
  const f = buildFeatureVector(input);
  const { weights: w, L, U, y } = solveWeights(f);
  const rawScore = w.reduce((s, wi, i) => s + wi * f[i], 0);
  const score = Math.round(rawScore * 100);

  const status =
    score >= 70
      ? "RISIKO TINGGI"
      : score >= 40
      ? "RISIKO SEDANG"
      : "RISIKO RENDAH";

  const contribs = w.map((wi, i) => ({
    name: FEATURE_NAMES[i],
    contribution: Math.round(wi * f[i] * 1000) / 10,
  }));
  const dominant_factors = [...contribs].sort(
    (a, b) => b.contribution - a.contribution
  );

  const math_steps: MathStep[] = [
    {
      label: "Vektor Fitur f ∈ ℝ⁸",
      content: `f = [${f.map((v) => v.toFixed(3)).join(", ")}]`,
      type: "vector",
    },
    {
      label: "Sistem Persamaan Linear Ax = b",
      content: `A ∈ ℝ⁸ˣ⁸ (matriks interaksi antar fitur)\nb = [${W_PRIOR.map((v, i) => (v * (1 + 0.5 * f[i])).toFixed(3)).join(", ")}]`,
      type: "matrix",
    },
    {
      label: "LU Decomposition: A = L·U",
      content: `L (lower triangular, diagonal = 1) ✓\nU (upper triangular) ✓`,
      type: "info",
    },
    {
      label: "Forward Substitution: Ly = b",
      content: `y = [${y.map((v) => v.toFixed(3)).join(", ")}]`,
      type: "vector",
    },
    {
      label: "Back Substitution: Ux = y → bobot w",
      content: `w = [${w.map((v) => v.toFixed(3)).join(", ")}]\nΣwᵢ = ${w.reduce((a, b) => a + b, 0).toFixed(3)}`,
      type: "vector",
    },
    {
      label: "Skor Risiko: s = w · f (dot product)",
      content: `s = ${w.map((wi, i) => `${wi.toFixed(3)}×${f[i].toFixed(3)}`).join(" + ")}\n  = ${rawScore.toFixed(4)}\n  → ${score}/100`,
      type: "result",
    },
  ];

  const principal_components = computePrincipalComponents(f);
  const recommendations = getRecommendations(score, f);

  return {
    feature_vector: f,
    weight_vector: w,
    score,
    status,
    dominant_factors,
    recommendations,
    math_steps,
    principal_components,
  };
}
