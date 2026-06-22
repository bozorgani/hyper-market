"use client";

import Link from "next/link";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth-store";

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);

  return (
    <ProtectedRoute>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-black">Profile</h1>
        <Card className="mt-5 p-6">
          <p className="text-sm text-slate-500">User ID</p>
          <p className="mt-1 break-all font-mono text-sm">{user?.id}</p>
          <p className="mt-5 text-sm text-slate-500">Role</p>
          <p className="mt-1 text-xl font-black capitalize">{user?.role.replace("_", " ")}</p>
          <Link href="/orders"><Button className="mt-6">View orders</Button></Link>
        </Card>
      </main>
    </ProtectedRoute>
  );
}
