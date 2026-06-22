import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function OrderSuccessPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center px-4 py-10">
      <Card className="w-full p-8 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
        <h1 className="mt-5 text-3xl font-black">Order paid successfully</h1>
        <p className="mt-3 text-slate-500">Your order is now paid and ready for processing.</p>
        <Link href="/orders"><Button className="mt-6">View orders</Button></Link>
      </Card>
    </main>
  );
}
