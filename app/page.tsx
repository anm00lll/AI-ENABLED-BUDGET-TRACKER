"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import {
  BookOpen,
  Bot,
  Bus,
  Coffee,
  HeartPulse,
  Moon,
  Plus,
  Receipt,
  ShoppingBag,
  Sparkles,
  Sun,
  Send,
  Wallet,
  X,
  Gift,
} from "lucide-react";
import { format, parse } from "date-fns";

// ---------------- Types (Synced with Backend) ----------------
type CategoryKey =
  | "Food"
  | "Transport"
  | "Shopping"
  | "Bills"
  | "Coffee"
  | "Entertainment"
  | "Health"
  | "Education"
  | "Other";

type Expense = {
  id: string;
  amount: number;
  category: CategoryKey;
  note?: string;
  date: string; // dd-MM-yyyy format from API
};

type BudgetMap = Partial<Record<CategoryKey, number>> & { total?: number };

type Message = {
    id: string;
    sender: 'user' | 'bot';
    content: ReactNode;
};

// ---------------- Helpers & Constants (Synced with Backend) ----------------
const CATEGORIES: { key: CategoryKey; icon: ReactNode }[] = [
  { key: "Food", icon: <ShoppingBag className="h-4 w-4" /> },
  { key: "Transport", icon: <Bus className="h-4 w-4" /> },
  { key: "Shopping", icon: <ShoppingBag className="h-4 w-4" /> },
  { key: "Bills", icon: <Receipt className="h-4 w-4" /> },
  { key: "Coffee", icon: <Coffee className="h-4 w-4" /> },
  { key: "Entertainment", icon: <Gift className="h-4 w-4" /> },
  { key: "Health", icon: <HeartPulse className="h-4 w-4" /> },
  { key: "Education", icon: <BookOpen className="h-4 w-4" /> },
  { key: "Other", icon: <Sparkles className="h-4 w-4" /> },
];

const CATEGORY_COLORS = [ "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#14b8a6", "#f43f5e", "#3b82f6", "#84cc16", "#a855f7" ];

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function isSameMonth(dateString: string, ref = new Date()) {
  try {
    const d = parse(dateString, "dd-MM-yyyy", new Date());
    return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
  } catch {
    return false;
  }
}

// ---------------- UI Components ----------------
const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => <div className={`bg-card text-card-foreground rounded-2xl shadow-lg border ${className}`}>{children}</div>;
const CardHeader = ({ children, className = "" }: { children: ReactNode; className?: string }) => <div className={`p-6 pb-4 ${className}`}>{children}</div>;
const CardContent = ({ children, className = "" }: { children: ReactNode; className?: string }) => <div className={`p-6 pt-0 ${className}`}>{children}</div>;
const CardTitle = ({ children, className = "" }: { children: ReactNode; className?: string }) => <h3 className={`text-lg font-semibold tracking-tight ${className}`}>{children}</h3>;
const CardDescription = ({ children, className = "" }: { children: ReactNode; className?: string }) => <p className={`text-sm text-muted-foreground ${className}`}>{children}</p>;
const Button = ({ children, className = "", variant = "primary", size = "normal", ...props }: { children: ReactNode; className?: string; variant?: "primary" | "secondary" | "ghost" | "outline"; size?: "normal" | "icon" } & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
    const base = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none";
    const variants = { primary: "bg-primary text-primary-foreground hover:bg-primary/90", secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80", ghost: "hover:bg-accent hover:text-accent-foreground", outline: "border border-input hover:bg-accent hover:text-accent-foreground" };
    const sizes = { normal: "px-4 py-2", icon: "h-10 w-10" };
    return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>{children}</button>;
};
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
    <input className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`} ref={ref} {...props} />
));
Input.displayName = "Input";
const Progress = ({ value = 0 }: { value: number }) => (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <motion.div className="h-full w-full flex-1 bg-primary transition-all" style={{ transform: `translateX(-${100 - (value || 0)}%)` }} />
    </div>
);
const Badge = ({ children, className = "", variant = "secondary" }: { children: ReactNode; className?: string, variant?: "primary" | "secondary" | "outline" }) => {
    const variants = { primary: "bg-primary text-primary-foreground", secondary: "bg-secondary text-secondary-foreground", outline: "text-foreground border" };
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${variants[variant]} ${className}`}>{children}</span>
};

// --- NEW COMPONENT: CATEGORY BUDGETS ---
const CategoryBudgets = ({ byCategory, budget }: { byCategory: { name: CategoryKey, value: number }[], budget: BudgetMap }) => {
    const spendingMap = new Map(byCategory.map(item => [item.name, item.value]));
    const budgetedCategories = CATEGORIES.filter(cat => budget[cat.key] !== undefined && budget[cat.key]! > 0);

    if (budgetedCategories.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Category Budgets</CardTitle>
                <CardDescription>Your spending progress for each category.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {budgetedCategories.map(({ key, icon }) => {
                    const spent = spendingMap.get(key) || 0;
                    const catBudget = budget[key] || 0;
                    const progress = catBudget > 0 ? Math.min(100, (spent / catBudget) * 100) : 0;
                    const remaining = catBudget - spent;

                    return (
                        <div key={key}>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium flex items-center gap-2">{icon} {key}</span>
                                <span className={`text-sm font-medium ${remaining < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                    {formatCurrency(spent)} / {formatCurrency(catBudget)}
                                </span>
                            </div>
                            <Progress value={progress} />
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
};

// ---------------- Main Page Component ----------------
export default function BudgetTrackerPage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [budget, setBudget] = useState<BudgetMap>({ total: 50000 });
    const [dark, setDark] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [query, setQuery] = useState("");
    const [activeChart, setActiveChart] = useState(0);

    useEffect(() => {
        const isDarkMode = localStorage.getItem("budget_theme") === "dark" || (!("budget_theme" in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
        setDark(isDarkMode);
        try {
            const storedExpenses = localStorage.getItem("budget_expenses");
            const storedBudget = localStorage.getItem("budget_budget");
            if (storedExpenses) setExpenses(JSON.parse(storedExpenses));
            if (storedBudget) setBudget(JSON.parse(storedBudget));
        } catch (e) { console.error("Failed to load data", e); }
        setIsInitialized(true);
    }, []);

    useEffect(() => {
        if (!isInitialized) return;
        if (dark) document.documentElement.classList.add("dark"); else document.documentElement.classList.remove("dark");
        localStorage.setItem("budget_theme", dark ? "dark" : "light");
        localStorage.setItem("budget_expenses", JSON.stringify(expenses));
        localStorage.setItem("budget_budget", JSON.stringify(budget));
    }, [dark, expenses, budget, isInitialized]);

    const monthExpenses = useMemo(() => expenses.filter((e) => isSameMonth(e.date)), [expenses]);
    const totalSpent = useMemo(() => monthExpenses.reduce((a, b) => a + b.amount, 0), [monthExpenses]);
    const byCategory = useMemo(() => {
        const m = new Map<CategoryKey, number>();
        monthExpenses.forEach((e) => m.set(e.category, (m.get(e.category) || 0) + e.amount));
        return Array.from(m.entries()).map(([k, v]) => ({ name: k, value: v }));
    }, [monthExpenses]);
    const filteredExpenses = useMemo(() => {
        const q = query.toLowerCase().trim();
        if (!q) return monthExpenses;
        return monthExpenses.filter((e) => e.note?.toLowerCase().includes(q) || e.category.toLowerCase().includes(q));
    }, [monthExpenses, query]);

    const handleDataUpdate = ({ expenses: updatedExpenses, budget: updatedBudget }: { expenses?: Expense[], budget?: BudgetMap }) => {
        if (updatedExpenses) setExpenses(updatedExpenses);
        if (updatedBudget) setBudget(updatedBudget);
    };
    
    const monthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
    const itemVariants = { hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } };

    return (
        <div className="relative min-h-screen bg-background text-foreground">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]"></div>

            <header className="sticky top-0 z-20 backdrop-blur-lg border-b bg-background/80">
                <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h1 className="text-lg font-semibold tracking-tight">My Budget Buddy</h1>
                    <div className="ml-auto flex items-center gap-2">
                        <Input placeholder="Search expenses..." value={query} onChange={e => setQuery(e.target.value)} className="w-48"/>
                        <Button variant="outline" size="icon" onClick={() => setDark(d => !d)}>{dark ? <Sun size={16} /> : <Moon size={16} />}</Button>
                        <Button onClick={() => setChatOpen(true)}><Plus size={16} className="mr-2"/> Add / Ask</Button>
                    </div>
                </div>
            </header>

            <motion.main variants={containerVariants} initial="hidden" animate="show" className="mx-auto max-w-6xl px-4 py-6 space-y-8">
                <motion.div variants={itemVariants}>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">{monthName} Overview</CardTitle>
                            <CardDescription>Your financial summary for the current month. Use the dots to switch views.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-4">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-sm text-muted-foreground">Total Spent</span>
                                        <Badge variant="outline">{monthExpenses.length} entries</Badge>
                                    </div>
                                    <p className="text-4xl font-bold">{formatCurrency(totalSpent)}</p>
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span>Monthly Budget</span>
                                            <span>{formatCurrency(budget.total || 0)}</span>
                                        </div>
                                        <Progress value={budget.total ? Math.min(100, (totalSpent / budget.total) * 100) : 0} />
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <div className="h-[250px] relative overflow-hidden">
                                        <motion.div
                                            className="w-[200%] h-full flex"
                                            animate={{ x: `-${activeChart * 50}%` }}
                                            transition={{ type: "tween", ease: "easeInOut" }}
                                        >
                                            <div className="w-1/2 h-full">
                                                <BarChartView data={byCategory.map(d => ({...d, category: d.name}))} />
                                            </div>
                                            <div className="w-1/2 h-full">
                                                <PieChartView data={byCategory} />
                                            </div>
                                        </motion.div>
                                    </div>
                                    <div className="flex justify-center items-center gap-2 mt-4">
                                        {[0, 1].map((index) => (
                                            <button
                                                key={index}
                                                onClick={() => setActiveChart(index)}
                                                // --- THIS IS THE CORRECTED LINE ---
                                                className={`h-2 rounded-full transition-all duration-300 ${
                                                    activeChart === index ? 'w-4 bg-primary' : 'w-2 bg-secondary hover:bg-border'
                                                }`}
                                                aria-label={`Go to chart ${index + 1}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={containerVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <motion.div variants={itemVariants} className="lg:col-span-2">
                        <Card>
                            <CardHeader><CardTitle>Recent Expenses</CardTitle><CardDescription>Your latest transactions this month.</CardDescription></CardHeader>
                            <CardContent>
                                <motion.ul variants={containerVariants} className="space-y-2">
                                    {filteredExpenses.length > 0 ? filteredExpenses.slice(0, 10).map((e) => (
                                        <motion.li key={e.id} variants={itemVariants} className="flex items-center gap-4 p-2 rounded-lg hover:bg-accent">
                                            <div className="w-9 h-9 flex-shrink-0 rounded-full bg-secondary flex items-center justify-center">{CATEGORIES.find(c => c.key === e.category)?.icon}</div>
                                            <div className="flex-grow"><p className="font-medium">{e.note || e.category}</p><p className="text-xs text-muted-foreground">{e.date}</p></div>
                                            <p className="font-semibold">{formatCurrency(e.amount)}</p>
                                        </motion.li>
                                    )) : <p className="text-center py-8 text-muted-foreground">No expenses found.</p>}
                                </motion.ul>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div variants={itemVariants} className="space-y-6">
                        <Card>
                            <CardHeader><CardTitle className="flex items-center gap-2"><Wallet />Budget Settings</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium">Total Monthly Budget (₹)</label>
                                    <Input type="number" placeholder="e.g., 50000" value={budget.total || ""} onChange={(e) => setBudget(b => ({...b, total: parseInt(e.target.value) || 0}))}/>
                                </div>
                                <div className="border-t pt-4">
                                  <h4 className="text-sm font-semibold mb-3">Category Budgets (Optional)</h4>
                                  <div className="grid grid-cols-2 gap-3">
                                      {CATEGORIES.map(({ key, icon }) => (
                                          <div key={key}>
                                              <label htmlFor={`budget-${key}`} className="text-xs font-medium flex items-center gap-1.5 mb-1.5 text-muted-foreground">{icon} {key}</label>
                                              <Input 
                                                  id={`budget-${key}`}
                                                  type="number"
                                                  placeholder="-"
                                                  value={budget[key] || ""}
                                                  onChange={(e) => {
                                                      const value = e.target.value;
                                                      setBudget(b => {
                                                          const newBudget = {...b};
                                                          if (value === '' || parseInt(value, 10) === 0) {
                                                              delete newBudget[key];
                                                          } else {
                                                              newBudget[key] = parseInt(value, 10);
                                                          }
                                                          return newBudget;
                                                      });
                                                  }}
                                              />
                                          </div>
                                      ))}
                                  </div>
                              </div>
                            </CardContent>
                        </Card>
                        <CategoryBudgets byCategory={byCategory} budget={budget} />
                    </motion.div>
                </motion.div>
            </motion.main>

            <AnimatePresence>{chatOpen && <Chatbot expenses={expenses} onClose={() => setChatOpen(false)} onDataUpdate={handleDataUpdate} />}</AnimatePresence>
        </div>
    );
}

// --- Chart Components with Improved Styling ---
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-popover text-popover-foreground p-3 rounded-xl shadow-lg border text-sm">
                <p className="font-bold mb-1">{label || payload[0]?.name}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={`item-${index}`} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.payload.fill }} />
                            <span>{entry.name}:</span>
                        </div>
                        <span className="font-semibold">{formatCurrency(entry.value)}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const BarChartView = ({ data }: { data: { category: string, value: number }[] }) => (
    <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="category" fontSize={12} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
            <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${Number(v)/1000}k`} stroke="hsl(var(--muted-foreground))" />
            <RechartsTooltip cursor={{ fill: 'hsl(var(--accent))' }} content={<CustomTooltip />} />
            <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]}>
                {data.map((_, i) => <Cell key={`cell-${i}`} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
            </Bar>
        </BarChart>
    </ResponsiveContainer>
);

const PieChartView = ({ data }: { data: { name: string, value: number }[] }) => (
    <ResponsiveContainer width="100%" height="100%">
        <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {data.map((_, i) => <Cell key={`cell-${i}`} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} stroke="hsl(var(--background))" />)}
            </Pie>
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }} />
        </PieChart>
    </ResponsiveContainer>
);

// --- SummaryCard Component ---
const SummaryCard = ({ data }: { data: { category: string, total: number }[] }) => {
  return (
    <div className="mt-2 border-t border-black/10 dark:border-white/10 pt-3">
      <ul className="space-y-2 text-sm">
        {data.map((item, i) => (
          <li key={i} className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
              />
              <span>{item.category || "Item"}</span>
            </div>
            <span className="font-medium">{formatCurrency(item.total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// --- Chatbot Component ---
const Chatbot: React.FC<{ expenses: Expense[]; onClose: () => void; onDataUpdate: (data: { expenses?: Expense[]; budget?: BudgetMap }) => void; }> = ({ expenses, onClose, onDataUpdate }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [input]);

  const quickAction = (text: string) => {
    setInput(text);
    setTimeout(() => handleSend(text), 0);
  };

  const handleSend = async (messageText = input) => {
    if (!messageText.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), content: messageText, sender: "user" };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    const endpoint = '/api/entries';

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText, expenses: expenses })
      });
      if (!res.ok) throw new Error("API request failed");
      const data = await res.json();
      let botContent: ReactNode = data.reply || "Sorry, something went wrong.";
      if (data.summaryData && Array.isArray(data.summaryData) && data.summaryData.length > 0) {
          botContent = (
            <div>
              <p>{data.reply}</p>
              <SummaryCard data={data.summaryData} />
            </div>
          );
      }
      setMessages((prev) => [...prev, { id: Date.now().toString() + "-bot", content: botContent, sender: "bot" }]);
      if (data.updatedExpenses || data.updatedBudget) {
        onDataUpdate({ expenses: data.updatedExpenses, budget: data.updatedBudget });
      }
    } catch (e) {
      setMessages(p => [...p, { id: 'err', content: "⚠️ Error contacting server. Please try again.", sender: 'bot'}]);
    } finally {
      setLoading(false);
    }
  };

  const WelcomeScreen = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 mb-4 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
            <Sparkles size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2">My Budget Buddy Assistant</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">
          You can add an expense like "150 for coffee" or ask for insights like "How much did I spend on food?"
        </p>
        <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" size="normal" onClick={() => quickAction("How much did I spend on food this month?")}>Spending on Food?</Button>
            <Button variant="outline" size="normal" onClick={() => quickAction("Compare my shopping vs entertainment spending")}>Shopping vs Entertainment</Button>
            <Button variant="outline" size="normal" onClick={() => quickAction("Give me a tip to save money")}>Savings Tip</Button>
        </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex flex-col items-center justify-end">
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose}></div>
        <motion.div
            initial={{ y: "100%" }}
            animate={{ y: "0%" }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col h-full max-h-[700px] w-full max-w-2xl bg-card rounded-t-2xl border-t shadow-2xl relative z-10"
        >
            <header className="flex items-center justify-between p-4 shrink-0">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" /> Budget Assistant
                </h2>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                    <X className="h-5 w-5" />
                </Button>
            </header>
            <div className="flex-1 overflow-y-auto px-6 pb-6">
                <div className="space-y-6">
                    {messages.length === 0 && !loading && <WelcomeScreen />}
                    {messages.map((m) => (
                        <div key={m.id} className={`flex items-end gap-3 ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                            {m.sender === 'bot' && (
                                <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shrink-0">
                                    <Bot size={18}/>
                                </div>
                            )}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`px-4 py-2.5 rounded-2xl max-w-lg leading-relaxed ${m.sender === "user" ? "bg-primary text-primary-foreground rounded-br-none" : "bg-secondary text-secondary-foreground rounded-bl-none"}`}
                            >
                                {m.content}
                            </motion.div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex items-end gap-3 justify-start">
                            <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shrink-0"><Bot size={18}/></div>
                            <div className="px-4 py-3 rounded-2xl bg-secondary text-secondary-foreground rounded-bl-none flex items-center gap-2">
                                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5, repeat: Infinity }} className="h-2 w-2 bg-muted-foreground rounded-full"/>
                                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5, repeat: Infinity, delay: 0.1 }} className="h-2 w-2 bg-muted-foreground rounded-full"/>
                                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5, repeat: Infinity, delay: 0.2 }} className="h-2 w-2 bg-muted-foreground rounded-full"/>
                            </div>
                        </div>
                    )}
                </div>
                <div ref={messagesEndRef} />
            </div>
            <footer className="p-4 bg-card border-t">
                <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="flex items-end gap-3 max-w-3xl mx-auto bg-secondary rounded-xl p-2"
                >
                    <textarea
                        ref={inputRef}
                        rows={1}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                        placeholder="Log '150 for coffee' or ask 'how can I save?'..."
                        className="flex-1 bg-transparent resize-none outline-none max-h-40 py-2.5 px-2 text-base placeholder:text-muted-foreground"
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="w-10 h-10 bg-primary text-primary-foreground rounded-lg flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send className="h-5 w-5" />
                    </button>
                </form>
            </footer>
        </motion.div>
    </motion.div>
  );
};