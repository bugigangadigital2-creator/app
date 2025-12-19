
import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Payables from './components/Payables';
import Accounts from './components/Accounts';
import Goals from './components/Goals';
import Categories from './components/Categories';
import BudgetRule from './components/BudgetRule';
import { db } from './lib/db';
import { View, User, Transaction, Category, Goal, PayableBill, Account } from './types';
import { Wallet, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [payables, setPayables] = useState<PayableBill[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const authUser = db.getAuthUser();
    if (authUser) {
      setUser(authUser);
      setTransactions(db.getTransactions(authUser.id));
      setCategories(db.getCategories(authUser.id));
      setGoals(db.getGoals(authUser.id));
      setPayables(db.getPayables(authUser.id));
      setAccounts(db.getAccounts(authUser.id));
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const mockUser: User = { 
      id: 'usr-1', 
      name: 'João Silva', 
      email: 'joao@exemplo.com', 
      avatarUrl: 'https://picsum.photos/200' 
    };
    db.setAuthUser(mockUser);
    setUser(mockUser);
    setTransactions(db.getTransactions(mockUser.id));
    setCategories(db.getCategories(mockUser.id));
    setGoals(db.getGoals(mockUser.id));
    setPayables(db.getPayables(mockUser.id));
    setAccounts(db.getAccounts(mockUser.id));
  };

  const handleLogout = () => {
    db.setAuthUser(null);
    setUser(null);
    setActiveView('dashboard');
  };

  const handleAddAccount = (newA: Omit<Account, 'id'>) => {
    if (!user) return;
    const account: Account = { ...newA, id: `acc-${Date.now()}`, userId: user.id };
    db.saveAccount(account);
    setAccounts(prev => [...prev, account]);
  };

  const handleUpdateAccount = (updatedA: Account) => {
    if (!user) return;
    db.updateAccount(updatedA);
    setAccounts(prev => prev.map(acc => acc.id === updatedA.id ? updatedA : acc));
  };

  const handleDeleteAccount = (id: string) => {
    db.deleteAccount(id);
    setAccounts(prev => prev.filter(a => a.id !== id));
  };

  const handleAddTransaction = (newT: Omit<Transaction, 'id'>) => {
    if (!user) return;
    const transaction: Transaction = { ...newT, id: `txn-${Date.now()}`, userId: user.id };
    db.saveTransaction(transaction);
    setTransactions(prev => [...prev, transaction]);

    setAccounts(prev => prev.map(acc => {
      if (acc.id === transaction.accountId) {
        const adjustment = transaction.type === 'INCOME' ? transaction.amount : -transaction.amount;
        const newBalance = acc.balance + adjustment;
        db.updateAccountBalance(acc.id, newBalance);
        return { ...acc, balance: newBalance };
      }
      return acc;
    }));
  };

  const handleUpdateTransaction = (updatedT: Transaction) => {
    if (!user) return;
    const oldT = transactions.find(t => t.id === updatedT.id);
    if (!oldT) return;

    db.updateTransaction(updatedT);
    setTransactions(prev => prev.map(t => t.id === updatedT.id ? updatedT : t));

    setAccounts(prev => prev.map(acc => {
      let balance = acc.balance;
      if (acc.id === oldT.accountId) {
        balance += (oldT.type === 'INCOME' ? -oldT.amount : oldT.amount);
      }
      if (acc.id === updatedT.accountId) {
        balance += (updatedT.type === 'INCOME' ? updatedT.amount : -updatedT.amount);
      }
      if (balance !== acc.balance) {
        db.updateAccountBalance(acc.id, balance);
        return { ...acc, balance };
      }
      return acc;
    }));
  };

  const handleDeleteTransaction = (id: string) => {
    const t = transactions.find(txn => txn.id === id);
    if (!t) return;
    db.deleteTransaction(id);
    setTransactions(prev => prev.filter(txn => txn.id !== id));
    setAccounts(prev => prev.map(acc => {
      if (acc.id === t.accountId) {
        const adjustment = t.type === 'INCOME' ? -t.amount : t.amount;
        const newBalance = acc.balance + adjustment;
        db.updateAccountBalance(acc.id, newBalance);
        return { ...acc, balance: newBalance };
      }
      return acc;
    }));
  };

  const handleAddPayable = (newP: Omit<PayableBill, 'id'>) => {
    if (!user) return;
    const payable: PayableBill = { ...newP, id: `pay-${Date.now()}`, userId: user.id };
    db.savePayable(payable);
    setPayables(prev => [...prev, payable]);
  };

  const handleMarkAsPaid = (id: string) => {
    if (!user || accounts.length === 0) return;
    const bill = payables.find(p => p.id === id);
    if (bill && !bill.isPaid) {
      const defaultAccountId = accounts[0].id;
      const updatedBill = { ...bill, isPaid: true, accountId: defaultAccountId };
      db.updatePayable(updatedBill);
      setPayables(prev => prev.map(p => p.id === id ? updatedBill : p));
      handleAddTransaction({
        userId: user.id,
        description: `Pagam. Conta: ${bill.description}`,
        amount: bill.amount,
        type: 'EXPENSE',
        categoryId: bill.categoryId,
        accountId: defaultAccountId,
        date: new Date().toISOString().split('T')[0]
      });
    }
  };

  const handleDeletePayable = (id: string) => {
    db.deletePayable(id);
    setPayables(prev => prev.filter(p => p.id !== id));
  };

  const handleAddGoal = (newG: Omit<Goal, 'id'>) => {
    if (!user) return;
    const goal: Goal = { ...newG, id: `goal-${Date.now()}`, userId: user.id };
    db.saveGoal(goal);
    setGoals(prev => [...prev, goal]);
  };

  const handleContributeToGoal = (goalId: string, amount: number) => {
    if (!user) return;
    setGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        const newAmount = g.currentAmount + amount;
        db.updateGoalProgress(goalId, newAmount);
        return { ...g, currentAmount: newAmount };
      }
      return g;
    }));
  };

  const handleAddCategory = (newC: Omit<Category, 'id'>) => {
    if (!user) return;
    const category: Category = { ...newC, id: `cat-u-${Date.now()}`, userId: user.id };
    db.saveCategory(category);
    setCategories(prev => [...prev, category]);
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard transactions={transactions} categories={categories} />;
      case 'accounts':
        return <Accounts accounts={accounts} onAddAccount={handleAddAccount} onUpdateAccount={handleUpdateAccount} onDeleteAccount={handleDeleteAccount} />;
      case 'transactions':
        return <Transactions transactions={transactions} categories={categories} accounts={accounts} onAddTransaction={handleAddTransaction} onUpdateTransaction={handleUpdateTransaction} onDeleteTransaction={handleDeleteTransaction} />;
      case 'payables':
        return <Payables payables={payables} categories={categories} onAddPayable={handleAddPayable} onMarkAsPaid={handleMarkAsPaid} onDeletePayable={handleDeletePayable} />;
      case 'budget':
        return <BudgetRule transactions={transactions} categories={categories} />;
      case 'goals':
        return <Goals goals={goals} onAddGoal={handleAddGoal} onContribute={handleContributeToGoal} onDeleteGoal={() => {}} />;
      case 'categories':
        return <Categories categories={categories} onAddCategory={handleAddCategory} onDeleteCategory={(id) => setCategories(prev => prev.filter(c => c.id !== id))} />;
      case 'profile':
        return <div className="text-slate-800 font-bold p-8 bg-white rounded-2xl border border-slate-100">Configurações de Perfil em Breve.</div>;
      default:
        return <Dashboard transactions={transactions} categories={categories} />;
    }
  };

  if (isLoading) return <div className="h-screen w-full flex items-center justify-center"><Loader2 className="animate-spin text-emerald-600" /></div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 bg-emerald-600 rounded-2xl mb-4"><Wallet className="w-8 h-8 text-white" /></div>
            <h1 className="text-2xl font-bold text-slate-800">FinanFlow</h1>
            <p className="text-slate-500">Gestão financeira simplificada</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input required type="email" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="E-mail" defaultValue="joao@exemplo.com" />
            <input required type="password" title="Minimo 6 caracteres" minLength={6} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="Senha" defaultValue="123456" />
            <button type="submit" className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-100 transition-all hover:bg-emerald-700">Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar activeView={activeView} onViewChange={setActiveView} onLogout={handleLogout} userName={user.name} />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto pb-12">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
