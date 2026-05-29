"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/lib/finsafe-engine";

const defaultInput = {
  monthly_income: "",
  monthly_expense: "",
  discretionary_spending: "",
  topup_frequency: "",
  financial_stress: "Low",
  login_attempts: "",
  account_balance: "",
  savings_rate: "",
  debt_to_income: "",
  fraud_flag: false,
};

export default function Home() {
  const [form, setForm] = useState<typeof defaultInput>(defaultInput);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showMath, setShowMath] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);

  function updateField(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    setError(""); setResult(null); setLogLines([]); setLoading(true); setShowMath(false);
    const lines: string[] = [];
    const addLog = async (line: string, ms = 200) => {
      lines.push(line);
      setLogLines([...lines]);
      await delay(ms);
    };
    await addLog("> inisialisasi FINSAFE engine v1.0...");
    await addLog("> membangun vektor fitur f \u2208 \u211d\u2078...", 300);
    await addLog("> menyusun matriks A \u2208 \u211d\u2078\u02e3\u2078...", 200);
    await addLog("> menjalankan LU Decomposition...", 400);
    await addLog("> forward substitution Ly = b \u2713", 150);
    await addLog("> back substitution Ux = y \u2713", 200);
    await addLog("> menghitung dot product w \u00b7 f...", 300);
    await addLog("> diagonalisasi matriks korelasi...", 300);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, savings_rate: Number(form.savings_rate) / 100 }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      await addLog(`> skor risiko: ${data.result.score}/100 \u2014 ${data.result.status}`, 200);
      await addLog("> analisis selesai \u2713", 100);
      setResult(data.result);
    } catch { setError("Gagal menghubungi server. Coba lagi."); }
    setLoading(false);
  }

  function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

  const scoreColor = result?.status === "RISIKO TINGGI" ? "var(--red)" : result?.status === "RISIKO SEDANG" ? "var(--yellow)" : "var(--green)";

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div className="scanline" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 860, margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>

        <header style={{ marginBottom: "2.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 8px var(--green)", display: "inline-block" }} />
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--green)", letterSpacing: "0.2em" }}>SISTEM AKTIF</span>
          </div>
          <h1 style={{ fontFamily: "var(--sans)", fontSize: "clamp(2rem,5vw,3rem)", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text)", lineHeight: 1.1 }}>
            FIN<span style={{ color: "var(--green)" }}>SAFE</span>
          </h1>
          <p style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text2)", marginTop: "0.5rem", maxWidth: 520, lineHeight: 1.7 }}>
            Deteksi potensi risiko judi online melalui analisis pola perilaku keuangan — menggunakan vektor fitur, SPL + LU Decomposition, dot product, dan diagonalisasi matriks korelasi.
          </p>
        </header>

        <div style={{ display: "grid", gap: "1.25rem" }}>
          <Block label="BLOK A" title="Data Pengeluaran Mingguan">
            <div className="igrid">
              <Field label="Pendapatan Bulanan (Rp)" placeholder="mis. 5000000" value={form.monthly_income} onChange={(v) => updateField("monthly_income", v)} />
              <Field label="Total Pengeluaran Bulanan (Rp)" placeholder="mis. 4500000" value={form.monthly_expense} onChange={(v) => updateField("monthly_expense", v)} />
              <Field label="Pengeluaran Diskresi / Tidak Perlu (Rp)" placeholder="mis. 1200000" value={form.discretionary_spending} onChange={(v) => updateField("discretionary_spending", v)} />
              <Field label="Frekuensi Top-up / Transfer Tidak Jelas (per minggu)" placeholder="mis. 5" value={form.topup_frequency} onChange={(v) => updateField("topup_frequency", v)} />
            </div>
          </Block>

          <Block label="BLOK B" title="Data Perilaku Keuangan">
            <div className="igrid">
              <div>
                <label style={lbl}>Tingkat Stress Finansial</label>
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  {["Low","Medium","High"].map((s) => {
                    const c = s==="High"?"var(--red)":s==="Medium"?"var(--yellow)":"var(--green)";
                    const active = form.financial_stress === s;
                    return <button key={s} onClick={() => updateField("financial_stress", s)} style={{ flex:1,padding:"8px 0",border:`1px solid ${active?c:"var(--border2)"}`,background:active?`${c}18`:"transparent",color:active?c:"var(--text2)",fontFamily:"var(--mono)",fontSize:11,cursor:"pointer",borderRadius:4,transition:"all 0.15s" }}>{s}</button>;
                  })}
                </div>
              </div>
              <Field label="Login Attempts (per hari)" placeholder="mis. 3" value={form.login_attempts} onChange={(v) => updateField("login_attempts", v)} />
              <Field label="Saldo Rekening (Rp)" placeholder="mis. 2000000" value={form.account_balance} onChange={(v) => updateField("account_balance", v)} />
              <Field label="Saving Rate (%)" placeholder="mis. 20" value={form.savings_rate} onChange={(v) => updateField("savings_rate", v)} hint="0–100" />
              <Field label="Debt-to-Income Ratio" placeholder="mis. 0.35" value={form.debt_to_income} onChange={(v) => updateField("debt_to_income", v)} hint="0.0 = tidak ada utang · 1.0 = utang = pendapatan" />
              <div>
                <label style={lbl}>Fraud Flag (ada transaksi mencurigakan?)</label>
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  {[{label:"Tidak",value:false},{label:"Ya",value:true}].map((opt) => {
                    const c = opt.value?"var(--red)":"var(--green)";
                    const active = form.fraud_flag === opt.value;
                    return <button key={String(opt.value)} onClick={() => updateField("fraud_flag", opt.value)} style={{ flex:1,padding:"8px 0",border:`1px solid ${active?c:"var(--border2)"}`,background:active?`${c}18`:"transparent",color:active?c:"var(--text2)",fontFamily:"var(--mono)",fontSize:11,cursor:"pointer",borderRadius:4,transition:"all 0.15s" }}>{opt.label}</button>;
                  })}
                </div>
              </div>
            </div>
          </Block>

          <button onClick={handleSubmit} disabled={loading} style={{ width:"100%",padding:14,background:loading?"transparent":"var(--green)",color:loading?"var(--green)":"#000",border:"1px solid var(--green)",borderRadius:6,fontFamily:"var(--mono)",fontSize:13,fontWeight:700,letterSpacing:"0.1em",cursor:loading?"not-allowed":"pointer",transition:"all 0.2s" }}>
            {loading ? "MEMPROSES..." : "\u25b6 JALANKAN ANALISIS"}
          </button>

          {error && <p style={{ fontFamily:"var(--mono)",fontSize:12,color:"var(--red)",textAlign:"center" }}>\u26a0 {error}</p>}
          {logLines.length > 0 && <Terminal lines={logLines} loading={loading} />}

          {result && <>
            <Block label="OUTPUT" title="Skor Risiko">
              <div style={{ display:"flex",alignItems:"flex-end",gap:"1rem",marginBottom:"1rem" }}>
                <span style={{ fontFamily:"var(--sans)",fontSize:"clamp(3rem,8vw,5rem)",fontWeight:800,color:scoreColor,lineHeight:1,textShadow:`0 0 30px ${scoreColor}60` }}>{result.score}</span>
                <span style={{ fontFamily:"var(--mono)",fontSize:14,color:"var(--text2)",paddingBottom:"0.5rem" }}>/ 100</span>
                <span style={{ marginLeft:"auto",padding:"6px 14px",border:`1px solid ${scoreColor}`,background:`${scoreColor}15`,color:scoreColor,fontFamily:"var(--mono)",fontSize:11,letterSpacing:"0.1em",borderRadius:4,paddingBottom:"0.5rem" }}>
                  {result.status==="RISIKO TINGGI"?"🔴":result.status==="RISIKO SEDANG"?"🟡":"🟢"} {result.status}
                </span>
              </div>
              <ProgressBar value={result.score} color={scoreColor} />
            </Block>

            <Block label="ANALISIS" title="Faktor Dominan">
              <div style={{ display:"grid",gap:8 }}>
                {result.dominant_factors.slice(0,5).map((f,i) => (
                  <div key={i} style={{ display:"flex",alignItems:"center",gap:10 }}>
                    <span style={{ width:20,fontFamily:"var(--mono)",fontSize:10,color:"var(--text3)" }}>{String(i+1).padStart(2,"0")}</span>
                    <span style={{ flex:1,fontFamily:"var(--mono)",fontSize:11,color:"var(--text2)" }}>{f.name}</span>
                    <div style={{ width:80,height:3,background:"var(--border2)",borderRadius:2,overflow:"hidden" }}>
                      <div style={{ width:`${Math.min(100,f.contribution*4)}%`,height:"100%",background:f.contribution>15?"var(--red)":f.contribution>8?"var(--yellow)":"var(--green)",borderRadius:2 }} />
                    </div>
                    <span style={{ width:40,textAlign:"right",fontFamily:"var(--mono)",fontSize:11,color:"var(--text)" }}>{f.contribution}%</span>
                  </div>
                ))}
              </div>
            </Block>

            <Block label="DIAGONALISASI" title="Komponen Utama (Eigenvalue)">
              <div style={{ display:"grid",gap:6 }}>
                {result.principal_components.map((pc,i) => (
                  <div key={i} style={{ display:"flex",alignItems:"center",gap:10 }}>
                    <span style={{ width:30,fontFamily:"var(--mono)",fontSize:10,color:"var(--text3)" }}>PC{i+1}</span>
                    <span style={{ flex:1,fontFamily:"var(--mono)",fontSize:11,color:"var(--text2)" }}>{pc.name}</span>
                    <div style={{ width:60,height:3,background:"var(--border2)",borderRadius:2,overflow:"hidden" }}>
                      <div style={{ width:`${pc.variance_pct}%`,height:"100%",background:i===0?scoreColor:i===1?"var(--blue)":"var(--text3)",borderRadius:2 }} />
                    </div>
                    <span style={{ width:44,textAlign:"right",fontFamily:"var(--mono)",fontSize:11,color:"var(--text2)" }}>{pc.variance_pct}%</span>
                    <span style={{ width:52,textAlign:"right",fontFamily:"var(--mono)",fontSize:10,color:"var(--text3)" }}>\u03bb={pc.eigenvalue}</span>
                  </div>
                ))}
              </div>
            </Block>

            <Block label="REKOMENDASI" title="Langkah Selanjutnya">
              <div style={{ display:"grid",gap:8 }}>
                {result.recommendations.map((r,i) => (
                  <div key={i} style={{ display:"flex",gap:10,padding:"10px 12px",background:"var(--bg3)",borderRadius:4,borderLeft:`2px solid ${scoreColor}` }}>
                    <span style={{ color:scoreColor,fontSize:12 }}>→</span>
                    <span style={{ fontFamily:"var(--mono)",fontSize:12,color:"var(--text)",lineHeight:1.6 }}>{r}</span>
                  </div>
                ))}
              </div>
            </Block>

            <button onClick={() => setShowMath(!showMath)} style={{ width:"100%",padding:10,background:"transparent",color:"var(--text2)",border:"1px solid var(--border2)",borderRadius:4,fontFamily:"var(--mono)",fontSize:11,cursor:"pointer",letterSpacing:"0.05em" }}>
              {showMath?"▾":"▸"} DETAIL PROSES MATEMATIS (SPL + LU Decomposition)
            </button>

            {showMath && <Block label="MATH" title="Langkah-langkah SPL & LU Decomposition">
              <div style={{ display:"grid",gap:12 }}>
                {result.math_steps.map((step,i) => (
                  <div key={i}>
                    <div style={{ fontFamily:"var(--mono)",fontSize:10,color:"var(--blue)",letterSpacing:"0.1em",marginBottom:4 }}>[{String(i+1).padStart(2,"0")}] {step.label}</div>
                    <pre style={{ fontFamily:"var(--mono)",fontSize:11,color:step.type==="result"?scoreColor:"var(--text2)",background:"var(--bg3)",padding:"10px 12px",borderRadius:4,whiteSpace:"pre-wrap",wordBreak:"break-word",lineHeight:1.7,border:`1px solid ${step.type==="result"?`${scoreColor}40`:"var(--border)"}` }}>{step.content}</pre>
                  </div>
                ))}
              </div>
            </Block>}

            <FinalTerminal result={result} scoreColor={scoreColor} />
          </>}
        </div>
      </div>

      <style>{`
        .igrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1rem}
        input[type="number"]{width:100%;background:var(--bg3);border:1px solid var(--border2);color:var(--text);font-family:var(--mono);font-size:13px;padding:9px 12px;border-radius:4px;outline:none;transition:border-color .15s;-moz-appearance:textfield}
        input[type="number"]::-webkit-inner-spin-button,input[type="number"]::-webkit-outer-spin-button{-webkit-appearance:none}
        input[type="number"]:focus{border-color:var(--green)}
        input::placeholder{color:var(--text3)}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
      `}</style>
    </main>
  );
}

const lbl: React.CSSProperties = { display:"block",fontFamily:"var(--mono)",fontSize:10,letterSpacing:"0.1em",color:"var(--text2)",marginBottom:6 };

function Block({label,title,children}:{label:string;title:string;children:React.ReactNode}) {
  return (
    <div style={{ border:"1px solid var(--border2)",borderRadius:6,overflow:"hidden" }}>
      <div style={{ background:"var(--bg2)",padding:"10px 16px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:10 }}>
        <span style={{ fontFamily:"var(--mono)",fontSize:9,letterSpacing:"0.2em",color:"var(--green)",background:"rgba(0,255,136,0.08)",padding:"2px 6px",borderRadius:2 }}>{label}</span>
        <span style={{ fontFamily:"var(--sans)",fontSize:13,fontWeight:600,color:"var(--text)" }}>{title}</span>
      </div>
      <div style={{ padding:"1.25rem",background:"var(--bg)" }}>{children}</div>
    </div>
  );
}

function Field({label,placeholder,value,onChange,hint}:{label:string;placeholder:string;value:string;onChange:(v:string)=>void;hint?:string}) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      <input type="number" placeholder={placeholder} value={value} onChange={(e)=>onChange(e.target.value)} />
      {hint && <span style={{ display:"block",fontFamily:"var(--mono)",fontSize:9,color:"var(--text3)",marginTop:4 }}>{hint}</span>}
    </div>
  );
}

function ProgressBar({value,color}:{value:number;color:string}) {
  return (
    <div style={{ height:4,background:"var(--border2)",borderRadius:2,overflow:"hidden" }}>
      <div style={{ width:`${value}%`,height:"100%",background:color,borderRadius:2,boxShadow:`0 0 8px ${color}`,transition:"width 0.8s cubic-bezier(.22,1,.36,1)" }} />
    </div>
  );
}

function Terminal({lines,loading}:{lines:string[];loading:boolean}) {
  return (
    <div style={{ background:"#080a0c",border:"1px solid var(--border2)",borderRadius:6,overflow:"hidden" }}>
      <div style={{ background:"var(--bg2)",padding:"6px 12px",display:"flex",alignItems:"center",gap:6,borderBottom:"1px solid var(--border)" }}>
        {["#ff5f56","#ffbd2e","#27c93f"].map((c)=><div key={c} style={{ width:8,height:8,borderRadius:"50%",background:c }} />)}
        <span style={{ fontFamily:"var(--mono)",fontSize:10,color:"var(--text3)",marginLeft:4 }}>FINSAFE MATH ENGINE v1.0</span>
      </div>
      <div style={{ padding:"12px 16px" }}>
        {lines.map((line,i)=><div key={i} style={{ fontFamily:"var(--mono)",fontSize:11,color:line.startsWith(">")?"var(--green)":"var(--text2)",lineHeight:1.9 }}>{line}</div>)}
        {loading && <span style={{ display:"inline-block",width:8,height:14,background:"var(--green)",animation:"blink 0.8s step-end infinite" }} />}
      </div>
    </div>
  );
}

function FinalTerminal({result,scoreColor}:{result:AnalysisResult;scoreColor:string}) {
  const b="═".repeat(48);
  const lines=[
    `\u2554${b}\u2557`,
    `\u2551${"HASIL ANALISIS FINSAFE".padStart(35).padEnd(48)}\u2551`,
    `\u2560${b}\u2563`,
    `\u2551  Skor Risiko Kamu: ${result.score}/100${"".padEnd(26)}\u2551`,
    `\u2551  Status: ${result.status}${"".padEnd(48-10-result.status.length)}\u2551`,
    `\u2560${b}\u2563`,
    `\u2551  Faktor Dominan:${"".padEnd(31)}\u2551`,
    ...result.dominant_factors.slice(0,3).map(f=>`\u2551  \u26a0 ${f.name}: ${f.contribution}%${"".padEnd(Math.max(0,44-f.name.length-String(f.contribution).length-2))}\u2551`),
    `\u2560${b}\u2563`,
    `\u2551  Rekomendasi:${"".padEnd(34)}\u2551`,
    ...result.recommendations.slice(0,3).map(r=>`\u2551  \u2192 ${r.substring(0,43).padEnd(43)}\u2551`),
    `\u255a${b}\u255d`,
  ];
  return (
    <div style={{ background:"#080a0c",border:`1px solid ${scoreColor}30`,borderRadius:6,overflow:"hidden" }}>
      <div style={{ background:"var(--bg2)",padding:"6px 12px",display:"flex",alignItems:"center",gap:6,borderBottom:`1px solid ${scoreColor}20` }}>
        {["#ff5f56","#ffbd2e","#27c93f"].map((c)=><div key={c} style={{ width:8,height:8,borderRadius:"50%",background:c }} />)}
        <span style={{ fontFamily:"var(--mono)",fontSize:10,color:"var(--text3)",marginLeft:4 }}>OUTPUT APLIKASI</span>
      </div>
      <div style={{ padding:16,overflowX:"auto" }}>
        {lines.map((line,i)=>{
          const isHdr=line.includes("HASIL ANALISIS");
          const isStatus=line.includes("Status:");
          const isWarn=line.includes("\u26a0")||line.includes("TINGGI")||line.includes("SEDANG");
          const isRec=line.includes("\u2192");
          const color=isHdr?"#fff":isStatus||isWarn?scoreColor:isRec?"var(--blue)":"var(--text2)";
          return <div key={i} style={{ fontFamily:"var(--mono)",fontSize:11,color,lineHeight:1.8,whiteSpace:"pre" }}>{line}</div>;
        })}
      </div>
    </div>
  );
}
