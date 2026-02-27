import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

type InsightEntry = {
  departmentName: string;
  year: number;
  month: number;
  grossBookedSales: number;
  gmPercent: number;
  cpPercent: number;
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured. Add it to your environment variables." },
      { status: 500 }
    );
  }

  const { entries, context } = (await request.json()) as {
    entries: InsightEntry[];
    context?: string;
  };

  if (!entries || entries.length === 0) {
    return NextResponse.json({ error: "No data provided" }, { status: 400 });
  }

  // Build a concise data summary for Claude
  const deptMap = new Map<string, InsightEntry[]>();
  for (const e of entries) {
    const key = e.departmentName;
    if (!deptMap.has(key)) deptMap.set(key, []);
    deptMap.get(key)!.push(e);
  }

  const deptSummaries: string[] = [];
  for (const [name, deptEntries] of deptMap) {
    const y25 = deptEntries.filter((e) => e.year === 2025);
    const y26 = deptEntries.filter((e) => e.year === 2026);
    const sales25 = y25.reduce((s, e) => s + e.grossBookedSales, 0);
    const sales26 = y26.reduce((s, e) => s + e.grossBookedSales, 0);
    const gm25 = sales25 ? y25.reduce((s, e) => s + e.grossBookedSales * e.gmPercent, 0) / sales25 : 0;
    const gm26 = sales26 ? y26.reduce((s, e) => s + e.grossBookedSales * e.gmPercent, 0) / sales26 : 0;
    const cp25 = sales25 ? y25.reduce((s, e) => s + e.grossBookedSales * e.cpPercent, 0) / sales25 : 0;
    const cp26 = sales26 ? y26.reduce((s, e) => s + e.grossBookedSales * e.cpPercent, 0) / sales26 : 0;
    const yoy = sales25 ? ((sales26 - sales25) / sales25 * 100).toFixed(1) : "N/A";

    deptSummaries.push(
      `${name}: 2025 Sales=$${(sales25 / 1e6).toFixed(2)}M, 2026 Fcst=$${(sales26 / 1e6).toFixed(2)}M (YoY ${yoy}%), GM% 25=${(gm25 * 100).toFixed(1)}% → 26=${(gm26 * 100).toFixed(1)}%, CP% 25=${(cp25 * 100).toFixed(1)}% → 26=${(cp26 * 100).toFixed(1)}%`
    );
  }

  // Company totals
  const total25 = entries.filter((e) => e.year === 2025).reduce((s, e) => s + e.grossBookedSales, 0);
  const total26 = entries.filter((e) => e.year === 2026).reduce((s, e) => s + e.grossBookedSales, 0);
  const totalYoy = total25 ? ((total26 - total25) / total25 * 100).toFixed(1) : "0";

  const AOP_SALES = 57_050_000;
  const AOP_GM = 0.505;
  const AOP_CP = 0.467;
  const vsAop = ((total26 - AOP_SALES) / AOP_SALES * 100).toFixed(1);

  const dataPrompt = `
You are a senior FP&A analyst at Kathy Kuo Home (KKH), a luxury home furnishings e-commerce company.
AOP (Annual Operating Plan) targets for 2026: Sales=$57.05M, GM%=50.5%, CP%=46.7%.

Company totals: 2025 Sales=$${(total25 / 1e6).toFixed(2)}M, 2026 Forecast=$${(total26 / 1e6).toFixed(2)}M (YoY ${totalYoy}%, vs AOP ${vsAop}%).

Department breakdown:
${deptSummaries.join("\n")}

${context ? `Additional context from user: ${context}` : ""}

Provide a concise executive analysis with these sections:
1. **Key Takeaways** (3 bullets max) — the most important things leadership should know
2. **Risk Flags** (2-3 bullets) — departments or metrics that need attention
3. **Opportunities** (2-3 bullets) — where there's upside potential
4. **Recommendation** (1-2 sentences) — what action to take next

Keep it sharp, data-driven, and actionable. Use specific numbers. No fluff. Format in markdown.
`.trim();

  try {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: dataPrompt }],
    });

    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return NextResponse.json({ insights: text });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `AI analysis failed: ${errorMsg}` }, { status: 500 });
  }
}
