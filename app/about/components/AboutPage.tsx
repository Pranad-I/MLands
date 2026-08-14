'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Menu, Shield, Cpu, Wifi, Github,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { AdminMenu } from '@/components/AdminMenu';
import { GlobalSearch } from '@/components/GlobalSearch';
import { NotificationBell } from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { systemMetadataService } from '@/lib/services/system-metadata-service';

export function AboutPage() {
  const [collapsed, setCollapsed] = useState(false);
  const aboutPageInfo = systemMetadataService.getAboutPageInfo();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <button onClick={() => setCollapsed((v) => !v)} aria-label="Toggle sidebar" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <Menu className="h-4 w-4 cursor-pointer" />
            </button>
            <h1 className="text-sm font-bold text-slate-700 dark:text-slate-200">About</h1>
          </div>
          <div className="flex items-center gap-3">
            <GlobalSearch placeholder="Search..." />
            <ThemeToggle />
            <NotificationBell />
            <AdminMenu />
          </div>
        </header>

        <motion.main
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="flex-1 overflow-y-auto px-5 py-4"
        >
          <div className="stagger-children mx-auto max-w-3xl space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                {aboutPageInfo.title}
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{aboutPageInfo.version}</p>
              <p className="mx-auto mt-3 max-w-xl text-xs text-slate-500 dark:text-slate-400">
                {aboutPageInfo.description}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center gap-2">
                <Cpu className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Built With</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {aboutPageInfo.stack.map((s) => (
                  <span key={s} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center gap-2">
                <Wifi className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Connected Nodes</h3>
              </div>
              <div className="space-y-3">
                {aboutPageInfo.nodes.map((n) => (
                  <div key={n.name} className="flex items-start justify-between gap-3 border-b border-slate-50 pb-3 last:border-b-0 last:pb-0 dark:border-slate-800">
                    <div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{n.name}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{n.role}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                      Online
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-xs font-medium text-slate-400 dark:border-slate-800 dark:bg-slate-900">
              <Github className="h-4 w-4" /> MLaNDS · built for local network security monitoring
            </div>
          </div>
        </motion.main>
      </div>
    </div>
  );
}
