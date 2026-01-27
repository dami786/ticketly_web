"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { FiCompass, FiGrid, FiHome, FiPlusCircle, FiUser } from "react-icons/fi";
import ToastContainer from "../components/Toast";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/",
      label: "Discover",
      icon: FiHome
    },
    {
      href: "/explore",
      label: "Explore",
      icon: FiCompass
    },
    {
      href: "/create-event",
      label: "Create",
      icon: FiPlusCircle
    },
    {
      href: "/profile",
      label: "Profile",
      icon: FiUser
    }
  ];

  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-background text-white antialiased">
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-30 border-b border-[#1F1F1F] bg-[#050505]/95 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
              <Link href="/" className="flex items-center text-xl font-bold tracking-tight text-white hover:text-accent transition-colors">
                <span>ticketly</span>
              </Link>
              {/* Desktop navigation (hidden on mobile to mimic mobile app layout) */}
              <nav className="hidden items-center gap-2 text-sm text-mutedLight sm:flex">
                {navItems.map((item) => {
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-1 rounded-full px-3 py-1.5 transition ${
                        isActive
                          ? "bg-accent text-white"
                          : "hover:bg-[#111827] hover:text-white"
                      }`}
                    >
                      <span>
                        <item.icon size={16} />
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </header>
          <main className="flex-1">{children}</main>

          {/* Toast Container */}
          <ToastContainer />

          {/* Mobile bottom tab bar (icons only) */}
          <nav className="sticky bottom-0 z-20 flex h-16 items-center justify-around border-t border-[#1F1F1F] bg-[#050505] px-6 text-mutedLight sm:hidden">
            <Link
              href="/"
              className={`flex flex-1 items-center justify-center ${
                pathname === "/" || pathname.startsWith("/explore")
                  ? "text-accent"
                  : "text-mutedLight"
              }`}
            >
              <FiHome size={22} />
            </Link>

            <Link
              href="/create-event"
              className="flex flex-1 items-center justify-center"
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition ${
                  pathname.startsWith("/create-event")
                    ? "bg-accent text-black"
                    : "bg-[#111827] text-mutedLight"
                }`}
              >
                <FiPlusCircle size={22} />
              </div>
            </Link>

            <Link
              href="/profile"
              className={`flex flex-1 items-center justify-center ${
                pathname.startsWith("/profile")
                  ? "text-accent"
                  : "text-mutedLight"
              }`}
            >
              <FiUser size={22} />
            </Link>
          </nav>
          {/* Footer only on tablet/desktop, hidden on mobile */}
          <footer className="hidden border-t border-[#1F1F1F] bg-black/80 px-4 py-4 text-xs text-mutedLight sm:block sm:px-6">
            <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-center sm:text-left">
                © {new Date().getFullYear()} Ticketly. All rights reserved.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] sm:text-xs">
                <a href="#" className="hover:text-white">
                  Privacy policy
                </a>
                <a href="#" className="hover:text-white">
                  Terms
                </a>
                <a href="#" className="hover:text-white">
                  Support
                </a>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

