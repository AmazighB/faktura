import { useState, type ReactNode } from 'react';
import { AuthContext, type AuthUser } from './AuthContext';


const STORAGE_KEY = 'factura.auth';

const mockUser: AuthUser = {
  name: 'Administrateur',
  email: 'admin@factura.dz',
  role: 'admin',
};

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function saveUser(user: AuthUser | null) {
  try {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => loadUser());

  const login = async (email: string, _password: string): Promise<void> => {
    await new Promise((r) => setTimeout(r, 600));
    const u: AuthUser = { ...mockUser, email: email || mockUser.email };
    setUser(u);
    saveUser(u);
  };

  const logout = () => {
    setUser(null);
    saveUser(null);
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}