export type AppointmentStatus = "scheduled" | "cancelled" | "completed";

export interface Appointment {
  id: string;
  first_name: string;
  last_name: string;
  age: number;
  guardian_name: string | null;
  phone: string;
  email: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  status: AppointmentStatus;
  cancel_token: string;
  reminder_24h_sent_at: string | null;
  reminder_2h_sent_at: string | null;
  created_at: string;
}

export interface DayAvailability {
  closed: boolean;
  full: boolean;
  past: boolean;
  available: number;
  total: number;
}
