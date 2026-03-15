"use client";

import Link from "next/link";
import { useState } from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/#analyze", label: "Analyze" },
  { href: "/#about", label: "About" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-xl">
      <nav className="mx-auto w-full max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="group inline-flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-sm font-bold text-white shadow-lg transition duration-200 group-hover:scale-105">
              FC
            </span>
            <div>
              <p className="font-heading text-lg font-semibold leading-none text-slate-900">
                FoodieCare
              </p>
              <p className="text-xs text-slate-500">AI Nutrition Analysis</p>
            </div>
          </Link>

          <div className="hidden items-center gap-2 sm:flex">
            {navLinks.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition duration-200 hover:bg-slate-100 hover:text-slate-900"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/#analyze"
              className="ml-1 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-emerald-600"
            >
              Get Started
            </Link>
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 sm:hidden"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-label="Toggle navigation"
          >
            <span className="text-lg">{isOpen ? "x" : "="}</span>
          </button>
        </div>

        {isOpen ? (
          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:hidden">
            <div className="flex flex-col gap-1">
              {navLinks.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </nav>
    </header>
  );
}
