"use client";

import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";

type AuthFeature = {
  title: string;
  description: string;
};

export function AuthShell({
  eyebrow,
  title,
  description,
  features,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  features: AuthFeature[];
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center px-4 py-10">
      <div className="grid w-full gap-6 lg:grid-cols-[1.05fr,0.95fr]">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-3xl bg-gradient-to-bl from-rose-600 to-orange-500 p-6 text-right text-white shadow-xl md:p-8"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
            <ShieldCheck className="h-4 w-4" />
            {eyebrow}
          </div>
          <h1 className="mt-5 text-3xl font-black leading-tight md:text-4xl">{title}</h1>
          <p className="mt-4 max-w-xl leading-8 text-white/85">{description}</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-2xl bg-white/15 p-4 backdrop-blur">
                <p className="font-black">{feature.title}</p>
                <p className="mt-2 text-sm leading-7 text-white/80">{feature.description}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6 text-right md:p-8">
            {children}
            {footer ? <div className="mt-6">{footer}</div> : null}
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
