import { NextRequest, NextResponse } from "next/server";
import { 
  getExpenses, 
  getBudget, 
  setBudget, 
  Expense,
  BudgetMap,
} from "@/app/expenseStore";
import { format } from 'date-fns';

// This is the powerful, conversational AI call for analysis and advice.
async function callAssistantOllama(message: string, context: { expenses: Expense[], budget: BudgetMap }): Promise<any | null> {
  const { expenses, budget } = context;
  const today = format(new Date(), 'dd-MM-yyyy');
  const monthName = format(new Date(), 'MMMM');

  try {
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3:latest",
        prompt: `
You are "Fin", a world-class AI financial assistant. Your goal is to help users track spending and gain insights. You are conversational, insightful, and precise. You NEVER log expenses; your counterpart handles that. Your role is analysis and advice.

**Core Principles:**
1.  **Always Respond in JSON:** Your entire output MUST be a single, valid JSON object.
2.  **Be an Analyst:** When asked for data, don't just state it. Provide a brief, helpful insight.
3.  **Answer Freely:** You can answer general financial questions, give savings tips, and analyze spending patterns.

**User's Financial Context:**
- Today's Date: ${today}
- Current Month: ${monthName}
- All Expenses: ${JSON.stringify(expenses)}
- Budget: ${JSON.stringify(budget)}

**Your JSON Response Format:**
{
  "intent": "The user's goal (e.g., 'get_summary', 'get_advice', 'set_budget').",
  "data": { },
  "reply": "Your conversational response to the user. You can use markdown for lists."
}

**INTENT: "get_summary"**
- **Trigger:** User asks for a summary. E.g., "how much on food?", "show me my spending this month".
- **Data:** { "summary_type": "category_total" | "all_spending", "period": "${monthName}", "result": [{ "category": "<CategoryKey>", "total": <number> }] }
- **Action:** Calculate the summary and return it in 'result'. Your reply should also contain the summary in a conversational way.

**INTENT: "set_budget"**
- **Trigger:** User wants to change their budget. E.g., "set my total budget to 60000".
- **Data:** { "category": "<CategoryKey>" | "total", "amount": <number> }
- **Action:** Extract the category and amount for budget setting.

**INTENT: "get_advice"**
- **Trigger:** User asks for help saving money or for financial tips. E.g., "how can i save 2000?"
- **Data:** { "goal": <number | null> }
- **Action:** Analyze spending vs budget. Provide specific, actionable advice in the reply.

**Example Flow:**
User: "how much have i spent on shopping this month?"
You: { "intent": "get_summary", "data": { "summary_type": "category_total", "period": "${monthName}", "result": [{"category": "Shopping", "total": 8500}] }, "reply": "You've spent ₹8,500 on Shopping so far in ${monthName}. This is slightly above your average pace for the month."}

User: "set my entertainment budget to 4000"
You: { "intent": "set_budget", "data": {"category": "Entertainment", "amount": 4000}, "reply": "✅ Done. I've updated your Entertainment budget for the month to ₹4,000."}

User: "${message}"`,
        stream: false
      })
    });
    if (!res.ok) throw new Error(`Ollama server responded with status: ${res.status}`);
    const data = await res.json();
    const sanitizedResponse = data.response.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(sanitizedResponse);
  } catch (err) {
    console.error("❌ Assistant Ollama call failed:", err);
    return null;
  }
}


export async function POST(req: NextRequest) {
  const { message } = await req.json();

  const context = {
    expenses: getExpenses(),
    budget: getBudget(),
  };

  const parsed = await callAssistantOllama(message, context);

  if (!parsed || !parsed.intent) {
    return NextResponse.json({ reply: "⚠️ I had trouble understanding that. Could you rephrase your question?" });
  }
  
  switch (parsed.intent) {
    case "set_budget": {
        const d = parsed.data;
        const newBudget = { ...getBudget() };
        if (d.category && d.category.toLowerCase() !== 'total') {
            newBudget[d.category as keyof BudgetMap] = d.amount;
        } else {
            newBudget.total = d.amount;
        }
        setBudget(newBudget);
        return NextResponse.json({ reply: parsed.reply, updatedBudget: getBudget() });
    }

    // For summary and advice, the AI has already done the work. We just pass its response through.
    case "get_summary":
    case "get_advice": {
        return NextResponse.json({ reply: parsed.reply, summaryData: parsed.data.result });
    }

    default:
      return NextResponse.json({ reply: parsed.reply || "🤔 I'm not sure how to handle that request." });
  }
}
