
export type TransactionType = 'INCOME' | 'EXPENSE';
export type AccountType = 'WALLET' | 'INVESTMENT' | 'SAVINGS' | 'CREDIT_CARD';

export interface Category {
  id: string;
  name: string;
  color: string;
  userId: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  color: string;
  userId: string;
  creditLimit?: number; // Apenas para cartões
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  accountId: string; // Vínculo com a conta
  date: string;
  userId: string;
  paymentMethod?: string;
}

export interface PayableBill {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  categoryId: string;
  userId: string;
  isPaid: boolean;
  accountId?: string; // Conta usada para pagar
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  startDate: string;
  endDate: string;
  userId: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export type View = 'dashboard' | 'transactions' | 'categories' | 'goals' | 'profile' | 'payables' | 'accounts' | 'budget';
