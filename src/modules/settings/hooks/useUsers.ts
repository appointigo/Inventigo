"use client";

import { useState, useEffect, useCallback } from "react";
import type { AppUser, CreateUserInput, UpdateUserInput } from "../types";

type UseUsersOptions = {
  enabled?: boolean;
};

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const payload = await res.json() as { error?: string };
    return payload.error ?? fallback;
  } catch {
    return fallback;
  }
}

export function useUsers(options: UseUsersOptions = {}) {
  const { enabled = true } = options;
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    if (!enabled) {
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "Failed to load users"));
      }
      setUsers(await res.json());
    } 
    catch (error) {
      console.error("Failed to fetch users:", error);
    } 
    finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const createUser = useCallback(
    async (input: CreateUserInput): Promise<AppUser> => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "Create failed"));
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
        throw new Error(await readErrorMessage(res, "Update failed"));
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
        throw new Error(await readErrorMessage(res, "Delete failed"));
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
        throw new Error(await readErrorMessage(res, "Password reset failed"));
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
