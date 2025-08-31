// expenseStore.ts

// --- Unified Category Type (Single Source of Truth) ---
export type CategoryKey =
  | "Food"
  | "Transport"
  | "Shopping"
  | "Bills"
  | "Coffee"
  | "Entertainment"
  | "Health"
  | "Education"
  | "Other";

export type Expense = {
  id: string;
  amount: number;
  category: CategoryKey;
  note?: string;
  date: string; // dd-MM-yyyy
};

export type BudgetMap = Partial<Record<CategoryKey, number>> & { total?: number };

// --- In-memory "database" ---
let expenses: Expense[] = [];
let budget: BudgetMap = { total: 50000, Food: 15000, Entertainment: 5000 };
let lastTransaction: Expense | null = null;

// --- Functions ---
// ADDED: Function to hydrate the server's state from the client
export function setExpensesForRequest(clientExpenses: Expense[]) {
  expenses = clientExpenses;
  // Ensure lastTransaction is also in sync with the client's state
  if (clientExpenses && clientExpenses.length > 0) {
    // Assumes the list is sorted with the newest item first
    lastTransaction = clientExpenses[0];
  } else {
    lastTransaction = null;
  }
}

export function addExpense(expense: Expense) {
  expenses.unshift(expense); // Add to the top of the list
  lastTransaction = expense; // IMPORTANT: Update the last transaction reference.
}

export function getExpenses() {
  return expenses;
}

// NEW: A much safer way to update an expense using its unique ID.
export function updateExpenseById(id: string, updates: Partial<Omit<Expense, 'id'>>): boolean {
    const expenseIndex = expenses.findIndex(e => e.id === id);
    if (expenseIndex !== -1) {
        expenses[expenseIndex] = { ...expenses[expenseIndex], ...updates };
        // Also update the lastTransaction if it's the one being changed
        if (lastTransaction && lastTransaction.id === id) {
            lastTransaction = expenses[expenseIndex];
        }
        return true;
    }
    return false;
}

// DEPRECATED but kept for reference. We will use updateExpenseById instead.
export function updateExpenseByNoteAndDate(note: string, date: string, newAmount: number): boolean {
    const expenseIndex = expenses.findIndex(e => 
        (e.note?.toLowerCase() === note.toLowerCase() || e.category.toLowerCase() === note.toLowerCase()) && 
        e.date === date
    );

    if (expenseIndex !== -1) {
        expenses[expenseIndex].amount = newAmount;
        return true;
    }
    return false;
}


export function getBudget() {
  return budget;
}

export function setBudget(newBudget: BudgetMap) {
  budget = newBudget;
}

export function deleteExpense(id: string) {
  expenses = expenses.filter((e) => e.id !== id);
}

export function clearExpenses() {
  expenses = [];
  lastTransaction = null;
}

// ADDED: The two missing functions your new API route needs.
export function getLastTransaction() {
    return lastTransaction;
}

export function updateLastTransaction(expense: Expense | null) {
    lastTransaction = expense;
}