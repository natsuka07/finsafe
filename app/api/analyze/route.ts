import { NextRequest, NextResponse } from "next/server";
import { analyze, UserInput } from "@/lib/finsafe-engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const input: UserInput = {
      monthly_income: Number(body.monthly_income) || 0,
      monthly_expense: Number(body.monthly_expense) || 0,
      discretionary_spending: Number(body.discretionary_spending) || 0,
      topup_frequency: Number(body.topup_frequency) || 0,
      financial_stress: body.financial_stress || "Low",
      login_attempts: Number(body.login_attempts) || 1,
      account_balance: Number(body.account_balance) || 0,
      savings_rate: Number(body.savings_rate) || 0,
      debt_to_income: Number(body.debt_to_income) || 0,
      fraud_flag: Boolean(body.fraud_flag),
    };

    const result = analyze(input);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, error: "Analisis gagal" },
      { status: 500 }
    );
  }
}
