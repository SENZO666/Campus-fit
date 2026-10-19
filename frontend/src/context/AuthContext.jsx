import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // null = checking, object = signed in, false = signed out
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    api.get("/auth/me").then((r) => setUser(r.data)).catch(() => setUser(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    queryClient.clear();
    setUser(data);
    return data;
  }, [queryClient]);

  const register = useCallback(async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    queryClient.clear();
    setUser(data);
    return data;
  }, [queryClient]);

  const logout = useCallback(async () => {
    await api.post("/auth/logout").catch(() => {});
    queryClient.clear();
    setUser(false);
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
