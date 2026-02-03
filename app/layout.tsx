"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { FiCompass, FiHome, FiPlusCircle, FiSearch, FiUser } from "react-icons/fi";
import AuthInitializer from "../components/AuthInitializer";
import ToastContainer from "../components/Toast";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

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
          <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm shadow-sm sm:block hidden">
            <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
              <Link 
                href="/" 
                className="flex items-center text-xl font-bold tracking-tight text-gray-900 hover:text-primary transition-all duration-200 group"
              >
                <span className="relative">
                  <span className="bg-gradient-to-r from-primary to-[#B91C1C] bg-clip-text text-transparent group-hover:from-[#B91C1C] group-hover:to-primary transition-all duration-300">
                    ticketly
                  </span>
                  <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300"></span>
                </span>
              </Link>
              {/* Desktop navigation (hidden on mobile to mimic mobile app layout) */}
              <nav className="hidden items-center gap-1.5 text-sm text-gray-600 sm:flex">
                {navItems.map((item) => {
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`relative flex items-center gap-1.5 rounded-lg px-4 py-2 transition-all duration-200 ${
                        isActive
                          ? "bg-primary text-white shadow-md shadow-primary/20 scale-105"
                          : "hover:bg-gray-100 hover:text-gray-900 hover:scale-105"
                      }`}
                    >
                      <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                        <item.icon size={18} />
                      </span>
                      <span className="font-medium">{item.label}</span>
                      {isActive && (
                        <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full"></span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </header>
          <main className="flex-1 pb-20 sm:pb-0">{children}</main>

          {/* Toast Container */}
          <ToastContainer />

          {/* Mobile bottom tab bar - matches Mobile App bottom tab spec */}
          <nav 
            className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-center border-t border-gray-200 bg-white text-gray-600 shadow-[0_-2px_8px_rgba(0,0,0,0.05)] sm:hidden"
            style={{ 
              height: "56px",
              paddingBottom: 'calc(36px + env(safe-area-inset-bottom))',
              minHeight: 'calc(56px + env(safe-area-inset-bottom))'
            }}
          >
            <div className="flex items-center justify-around h-full w-full max-w-md mx-auto px-1">
              <Link
                href="/"
                className={`relative flex flex-col items-center justify-center h-full transition-all duration-200 ${
                  pathname === "/"
                    ? "text-primary"
                    : "text-gray-600 active:opacity-70"
                }`}
              >
                <div className={`relative transition-all duration-200 ${pathname === "/" ? "scale-110" : "scale-100"}`}>
                  {/* Discover tab - use compass-style icon per spec */}
                  <FiCompass size={20} />
                  {pathname === "/" && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                  )}
                </div>
                {pathname === "/" && (
                  <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full"></span>
                )}
              </Link>

              <Link
                href="/explore"
                className={`relative flex flex-col items-center justify-center h-full transition-all duration-200 ${
                  pathname.startsWith("/explore")
                    ? "text-primary"
                    : "text-gray-600 active:opacity-70"
                }`}
              >
                <div className={`relative transition-all duration-200 ${pathname.startsWith("/explore") ? "scale-110" : "scale-100"}`}>
                  {/* Search tab - magnifying glass icon per spec */}
                  <FiSearch size={20} />
                  {pathname.startsWith("/explore") && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                  )}
                </div>
                {pathname.startsWith("/explore") && (
                  <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full"></span>
                )}
              </Link>

              {/* Create tab - custom handler for future draft support */}
              <button
                type="button"
                className={`relative flex flex-col items-center justify-center h-full transition-all duration-200 ${
                  pathname.startsWith("/create-event")
                    ? "text-primary"
                    : "text-gray-600 active:opacity-70"
                }`}
                onClick={() => {
                  try {
                    if (typeof window !== "undefined") {
                      // Reserved for future draft logic:
                      // const draft = window.localStorage.getItem("CREATE_EVENT_DRAFT_KEY");
                    }
                  } catch {
                    // ignore localStorage errors
                  }
                  router.push("/create-event");
                }}
              >
                <div className={`relative transition-all duration-200 ${pathname.startsWith("/create-event") ? "scale-110" : "scale-100"}`}>
                  <FiPlusCircle size={20} />
                  {pathname.startsWith("/create-event") && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                  )}
                </div>
                {pathname.startsWith("/create-event") && (
                  <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full"></span>
                )}
              </button>

              <Link
                href="/profile"
                className={`relative flex flex-col items-center justify-center h-full transition-all duration-200 ${
                  pathname.startsWith("/profile")
                    ? "text-primary"
                    : "text-gray-600 active:opacity-70"
                }`}
              >
                <div className={`relative transition-all duration-200 ${pathname.startsWith("/profile") ? "scale-110" : "scale-100"}`}>
                  <FiUser size={20} />
                  {pathname.startsWith("/profile") && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                  )}
                </div>
                {pathname.startsWith("/profile") && (
                  <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full"></span>
                )}
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

