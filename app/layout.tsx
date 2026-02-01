"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { FiCompass, FiHome, FiPlusCircle, FiSearch, FiUser } from "react-icons/fi";
import AuthInitializer from "../components/AuthInitializer";
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
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <div className="flex min-h-screen flex-col">
          {/* Ensure auth state persists across refresh by hydrating from stored tokens */}
          <AuthInitializer />
          <header className="sticky top-0 z-30 border-b border-gray-200 bg-white sm:block hidden">
            <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
              <Link href="/" className="flex items-center text-xl font-bold tracking-tight text-gray-900 hover:text-primary transition-colors">
                <span>ticketly</span>
              </Link>
              {/* Desktop navigation (hidden on mobile to mimic mobile app layout) */}
              <nav className="hidden items-center gap-2 text-sm text-gray-600 sm:flex">
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
                          ? "bg-primary text-white"
                          : "hover:bg-gray-100 hover:text-gray-900"
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
          <main className="flex-1 pb-14 sm:pb-0">{children}</main>

          {/* Toast Container */}
          <ToastContainer />

          {/* Mobile bottom tab bar - as per Mobile App Design Guide */}
          <nav 
            className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-center border-t border-gray-200 bg-white text-gray-600 shadow-[0_-2px_8px_rgba(0,0,0,0.05)] sm:hidden"
            style={{ 
              height: '56px',
              paddingTop: '4px',
              paddingBottom: 'calc(36px + env(safe-area-inset-bottom))',
              minHeight: 'calc(56px + env(safe-area-inset-bottom))'
            }}
          >
            <div className="flex items-center justify-center gap-12 h-full w-full max-w-md mx-auto">
              <Link
                href="/"
                className={`flex flex-col items-center justify-center h-full transition-colors ${
                  pathname === "/"
                    ? "text-primary"
                    : "text-gray-600"
                }`}
              >
                <FiHome size={24} className="transition-transform" style={{ transform: pathname === "/" ? "scale(1.1)" : "scale(1)" }} />
              </Link>

              <Link
                href="/explore"
                className={`flex flex-col items-center justify-center h-full transition-colors ${
                  pathname.startsWith("/explore")
                    ? "text-primary"
                    : "text-gray-600"
                }`}
              >
                <FiSearch size={24} className="transition-transform" style={{ transform: pathname.startsWith("/explore") ? "scale(1.1)" : "scale(1)" }} />
              </Link>

              <Link
                href="/create-event"
                className={`flex flex-col items-center justify-center h-full transition-colors ${
                  pathname.startsWith("/create-event")
                    ? "text-primary"
                    : "text-gray-600"
                }`}
              >
                <FiPlusCircle size={24} className="transition-transform" style={{ transform: pathname.startsWith("/create-event") ? "scale(1.1)" : "scale(1)" }} />
              </Link>

              <Link
                href="/profile"
                className={`flex flex-col items-center justify-center h-full transition-colors ${
                  pathname.startsWith("/profile")
                    ? "text-primary"
                    : "text-gray-600"
                }`}
              >
                <FiUser size={24} className="transition-transform" style={{ transform: pathname.startsWith("/profile") ? "scale(1.1)" : "scale(1)" }} />
              </Link>
            </div>
          </nav>
          {/* Footer only on tablet/desktop, hidden on mobile */}
          <footer className="hidden border-t border-gray-200 bg-white px-4 py-4 text-xs text-gray-600 sm:block sm:px-6">
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

