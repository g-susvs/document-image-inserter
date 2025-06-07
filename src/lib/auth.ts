// lib/auth.ts
import { cookies } from 'next/headers';

export function login(email: string, password: string): boolean {
  // Lógica dummy
  return email === 'admin@example.com' && password === 'password123';
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = cookies();
  return !!(await cookieStore).get('auth');
}