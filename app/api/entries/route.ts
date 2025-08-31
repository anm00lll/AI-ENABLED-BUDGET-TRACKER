// route.ts

import { NextRequest, NextResponse } from "next/server";
import { 
  addExpense, 
  getExpenses, 
  getBudget, 
  setBudget, 
  Expense,
  BudgetMap,
  getLastTransaction,
  updateLastTransaction,
  updateExpenseById,
  // --- UPDATED IMPORT ---
  setExpensesForRequest
} from "@/app/expenseStore";
import { format } from 'date-fns';

async function callAdvancedOllama(message: string, context: { expenses: Expense[], budget: BudgetMap, lastTransaction: Expense | null }): Promise<any | null> {
  const { expenses, budget, lastTransaction } = context;
  const today = format(new Date(), 'dd-MM-yyyy');
  const monthName = format(new Date(), 'MMMM');
  const validCategories = ["Food", "Transport", "Shopping", "Bills", "Coffee", "Entertainment", "Health", "Education", "Other"];

  try {
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3:latest",
        prompt: `
You are "Fin", a world-class AI financial assistant. Your goal is to help users track spending and gain insights. You are conversational, insightful, and precise.

**Core Principles:**
1.  **Always Respond in JSON:** Your entire output MUST be a single, valid JSON object.
2.  **Infer, then Confirm:** Make intelligent deductions. If a user says "amazon", it's likely "Shopping". If they say "uber", it's "Transport". If truly ambiguous, ask for clarification.
3.  **Use Valid Categories ONLY:** You must use one of these categories: ${JSON.stringify(validCategories)}. You must set the date for new expenses to today's date unless another date is specified.
4.  **Remember Context:** The user's last action is provided. Use it for follow-up commands like "oops, change it to 250".
5.  **Be Proactive:** After logging an expense, provide a small, relevant insight.

**User's Financial Context:**
- Today's Date: ${today}
- Last Transaction: ${JSON.stringify(lastTransaction)}
- Recent Expenses: ${JSON.stringify(expenses.slice(0, 5))}
- Budget: ${JSON.stringify(budget)}

**Your JSON Response Format:**
{
  "intent": "The user's goal (e.g., 'log_expense', 'get_summary').",
  "execution_status": "SUCCESS" | "CLARIFICATION_NEEDED" | "ERROR",
  "data": { },
  "reply": "Your conversational response to the user."
}

User: "${message}"`,
        stream: false
      })
    });
    if (!res.ok) throw new Error(`Ollama server responded with status: ${res.status}`);
    const data = await res.json();
    const sanitizedResponse = data.response.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(sanitizedResponse);
  } catch (err) {
    console.error("❌ Advanced Ollama call failed:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { message, expenses: clientExpenses } = await req.json();

  // --- ADDED: Hydrate the store with the client's current state ---
  if (clientExpenses && Array.isArray(clientExpenses)) {
    setExpensesForRequest(clientExpenses);
  }

  const context = {
    expenses: getExpenses(), // This now correctly reflects the user's full list
    budget: getBudget(),
    lastTransaction: getLastTransaction()
  };

  const parsed = await callAdvancedOllama(message, context);

  if (!parsed || !parsed.intent || parsed.execution_status === "ERROR") {
    return NextResponse.json({ reply: "⚠️ I couldn’t understand that. Could you rephrase?" });
  }

  if (parsed.execution_status === "CLARIFICATION_NEEDED") {
    return NextResponse.json({ reply: parsed.reply, data: parsed.data });
  }

  switch (parsed.intent) {
    case "log_expense": {
      const d = parsed.data;
      const newExpense: Expense = {
        id: Date.now().toString(),
        amount: d.amount,
        category: d.category,
        note: d.note,
        date: d.date || format(new Date(), 'dd-MM-yyyy'), // Ensure date is never missing
      };
      addExpense(newExpense);
      return NextResponse.json({ reply: parsed.reply, updatedExpenses: getExpenses() });
    }

    case "update_last_expense": {
      const lastTx = getLastTransaction();
      if (!lastTx) return NextResponse.json({ reply: "🤔 There's no recent transaction to update." });
      
      const d = parsed.data;
      const success = updateExpenseById(lastTx.id, d);

      if (success) {
        const updatedTxInMemory = { ...lastTx, ...d };
        updateLastTransaction(updatedTxInMemory);
        return NextResponse.json({ reply: parsed.reply, updatedExpenses: getExpenses() });
      } else {
        return NextResponse.json({ reply: "❌ Sorry, I couldn't find the transaction to update." });
      }
    }
      
    case "get_summary": {
        return NextResponse.json({ reply: parsed.reply, summaryData: parsed.data.result });
    }
      
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

    case "get_advice": {
        return NextResponse.json({ reply: parsed.reply });
    }

    default:
      return NextResponse.json({ reply: "🤔 I'm not sure how to handle that request." });
  }
}

export async function GET() {
    return NextResponse.json({ 
        expenses: getExpenses(),
        budget: getBudget()
    });
}