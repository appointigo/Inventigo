"use client";

import { useState, useEffect, useCallback } from "react";
import type { AppUser, CreateUserInput, UpdateUserInput } from "../types";

export function useUsers() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) setUsers(await res.json());
    } 
    catch (error) {
      console.error("Failed to fetch users:", error);
    } 
    finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const createUser = useCallback(
    async (input: CreateUserInput): Promise<AppUser> => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Create failed");
      }

      const user = await res.json();
      await fetchUsers();
      return user;
    }, [fetchUsers]
  );

  const updateUser = useCallback(
    async (id: string, input: UpdateUserInput): Promise<AppUser> => {
      const res = await fetch(`/api/users/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Update failed");
      }

      const user = await res.json();
      await fetchUsers();
      return user;
    }, [fetchUsers]
  );

  const deleteUser = useCallback(
    async (id: string): Promise<void> => {
      const res = await fetch(`/api/users/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Delete failed");
      }

      await fetchUsers();
    }, [fetchUsers]
  );

  const resetPassword = useCallback(
    async (id: string, newPassword: string): Promise<void> => {
      const res = await fetch(
        `/api/users/${encodeURIComponent(id)}/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Password reset failed");
      }
    }, []
  );

  return {
    users,
    loading,
    refresh: fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    resetPassword,
  };
}
