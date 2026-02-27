import { NextRequest, NextResponse } from "next/server";

// Allow up to 60 seconds for AI generation on Vercel
export const maxDuration = 60;

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
      { error: "ANTHROPIC_API_KEY is not configured. Ask your admin to add it in Vercel → Settings → Environment Variables." },
      { status: 500 }
    );
  }

  let body: { entries: InsightEntry[]; context?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { entries, context } = body;

  if (!entries || entries.length === 0) {
    return NextResponse.json({ error: "No data provided" }, { status: 400 });
  }

  // Build a concise data summary
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
      `${name}: 2025=$${(sales25 / 1e6).toFixed(2)}M, 2026F=$${(sales26 / 1e6).toFixed(2)}M (${yoy}% YoY), GM ${(gm25 * 100).toFixed(1)}→${(gm26 * 100).toFixed(1)}%, CP ${(cp25 * 100).toFixed(1)}→${(cp26 * 100).toFixed(1)}%`
    );
  }

  // Company totals
  const total25 = entries.filter((e) => e.year === 2025).reduce((s, e) => s + e.grossBookedSales, 0);
  const total26 = entries.filter((e) => e.year === 2026).reduce((s, e) => s + e.grossBookedSales, 0);
  const totalYoy = total25 ? ((total26 - total25) / total25 * 100).toFixed(1) : "0";

  const AOP_SALES = 57_050_000;
  const vsAop = ((total26 - AOP_SALES) / AOP_SALES * 100).toFixed(1);

  const systemPrompt = `You are a senior FP&A analyst at Kathy Kuo Home (KKH), a luxury home furnishings e-commerce company. You provide sharp, data-driven executive analysis. Be concise — no fluff. Use specific numbers and percentages.`;

  const userPrompt = `Analyze this 2026 rolling forecast:

AOP targets: Sales=$57.05M, GM%=50.5%, CP%=46.7%.
Company totals: 2025=$${(total25 / 1e6).toFixed(2)}M, 2026F=$${(total26 / 1e6).toFixed(2)}M (${totalYoy}% YoY, ${vsAop}% vs AOP).

Departments:
${deptSummaries.join("\n")}
${context ? `\nUser question: ${context}` : ""}

Respond with these sections:
1. **Key Takeaways** (3 bullets max)
2. **Risk Flags** (2-3 bullets)
3. **Opportunities** (2-3 bullets)
4. **Recommendation** (1-2 sentences)`;

  try {
    // Use the Anthropic Messages API directly via fetch for reliability
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 50000); // 50s timeout

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Anthropic API error:", res.status, errBody);
      if (res.status === 401) {
        return NextResponse.json({ error: "Invalid API key. Check ANTHROPIC_API_KEY in your environment variables." }, { status: 500 });
      }
      return NextResponse.json({ error: `AI service returned an error (${res.status}). Please try again.` }, { status: 500 });
    }

    const data = await res.json();
    const text = (data.content || [])
      .filter((block: { type: string }) => block.type === "text")
      .map((block: { text: string }) => block.text)
      .join("\n");

    if (!text) {
      return NextResponse.json({ error: "AI returned an empty response. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ insights: text });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return NextResponse.json({ error: "AI request timed out. Please try again." }, { status: 504 });
    }
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("AI insights error:", errorMsg);
    return NextResponse.json({ error: `AI analysis failed: ${errorMsg}` }, { status: 500 });
  }
}
