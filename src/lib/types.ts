export interface User {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'barber';
  createdAt: Date;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number; // minutos
  description?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  createdAt: Date;
  createdBy: string; // uid del barbero/admin
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  minQuantity: number; // umbral para alerta de stock bajo
  unit: string;
  price: number;
  addedAt: Date;
  addedBy: string;
}

export interface Objective {
  id: string;
  type: 'weekly' | 'monthly';
  targetAmount: number;
  currentAmount: number;
  barberoId?: string; // null = objetivo de la barbería
  startDate: Date;
  endDate: Date;
  createdAt: Date;
}

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  barberId: string;
  barberName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  status: 'pending' | 'completed' | 'cancelled';
  totalPrice: number;
  createdAt: Date;
}

export interface FinancialRecord {
  id: string;
  appointmentId: string;
  serviceId: string;
  serviceName: string;
  barberId: string;
  barberName: string;
  clientName: string;
  totalAmount: number;
  barberShare: number; // 60%
  barberiaShare: number; // 40%
  date: string;
  createdAt: Date;
}

export interface BankAccount {
  id: string;
  userId: string;
  userName: string;
  balance: number;
  totalEarned: number;
  totalPaid: number;
  lastUpdated: Date;
}

export interface BankTransaction {
  id: string;
  userId: string;
  userName: string;
  type: 'earning' | 'withdrawal' | 'adjustment';
  amount: number;
  description: string;
  date: string;
  createdAt: Date;
}

export interface DailyStats {
  date: string;
  totalServices: number;
  totalRevenue: number;
  barberRevenue: { [barberId: string]: number };
  serviceRevenue: { [serviceId: string]: number };
}

export const SERVICES: Service[] = [
  { id: '1', name: 'Corte de Cabello Simple', price: 7, duration: 45 },
  { id: '2', name: 'Corte de Cabello Completo', price: 8, duration: 45 },
  { id: '3', name: 'Barba', price: 4, duration: 45 },
  { id: '4', name: 'Corte de Cabello + Barba', price: 10, duration: 45 },
];

export const BARBERS = [
  { uid: 'barber-eduardo', name: 'Eduardo', role: 'admin' as const },
  { uid: 'barber-franyer', name: 'Franyer', role: 'barber' as const },
  { uid: 'barber-brayan', name: 'Brayan', role: 'barber' as const },
];
