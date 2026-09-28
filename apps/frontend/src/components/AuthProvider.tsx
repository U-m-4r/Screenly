import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { BACKEND_URL } from "../lib/config";

export type ScreenlyUser = {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
};

type AuthContextType = {
  user: ScreenlyUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(
  null
);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] =
    useState<ScreenlyUser | null>(null);

  const [loading, setLoading] = useState(true);

  async function refreshUser() {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/v1/auth/me`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        setUser(null);
        return;
      }

      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      console.error("Session check failed:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    const response = await fetch(
      `${BACKEND_URL}/api/v1/auth/logout`,
      {
        method: "POST",
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to sign out");
    }

    setUser(null);
  }

  useEffect(() => {
    void refreshUser();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}