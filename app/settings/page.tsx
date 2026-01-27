"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authAPI } from "../../lib/api/auth";
import { useToast } from "../../lib/hooks/useToast";
import { useAppStore } from "../../store/useAppStore";

type Tab = "profile" | "security";

export default function SettingsPage() {
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);
  const logout = useAppStore((state) => state.logout);
  const { success, info, warning } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>("profile");

  const [name, setName] = useState(user?.fullName ?? "");
  const [loadingName, setLoadingName] = useState(false);
  const [nameError, setNameError] = useState("");

  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  const updateName = async () => {
    if (!name.trim()) {
      setNameError("Name is required.");
      return;
    }
    if (name === user?.fullName) {
      info("No changes made.");
      return;
    }
    setLoadingName(true);
    setNameError("");
    try {
      const response = await authAPI.updateUser({ name: name.trim() });
      if (response.success) {
        if (response.user) setUser(response.user);
        success("Name updated successfully.");
      } else {
        setNameError(response.message || "Failed to update name.");
      }
    } catch (error: any) {
      setNameError(
        error?.response?.data?.message ??
          "Failed to update name. Please try again."
      );
    } finally {
      setLoadingName(false);
    }
  };

  const updateEmail = async () => {
    if (!email.trim()) {
      setEmailError("Email is required.");
      return;
    }
    if (email === user?.email) {
      info("No changes made.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setLoadingEmail(true);
    setEmailError("");
    try {
      const response = await authAPI.updateUser({ email: email.trim() });
      if (response.success) {
        if (response.user) setUser(response.user);
        success("Email updated successfully.");
      } else {
        setEmailError(response.message || "Failed to update email.");
      }
    } catch (error: any) {
      setEmailError(
        error?.response?.data?.message ??
          "Failed to update email. Please try again."
      );
    } finally {
      setLoadingEmail(false);
    }
  };

  const updatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All password fields are required.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    setLoadingPassword(true);
    setPasswordError("");
    try {
      const response = await authAPI.updateUser({ password: newPassword });
      if (response.success) {
        success("Password updated successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordError(response.message || "Failed to update password.");
      }
    } catch (error: any) {
      setPasswordError(
        error?.response?.data?.message ??
          "Failed to update password. Please try again."
      );
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm("Are you sure you want to logout?")) return;
    setLoggingOut(true);
    try {
      await logout();
      router.replace("/");
    } finally {
      setLoggingOut(false);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-background px-4">
        <p className="mb-4 text-base font-semibold text-danger">
          Please login to manage your settings.
        </p>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90"
        >
          Login
        </button>
      </div>
    );
  }

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-3xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-mutedLight hover:text-white"
          >
            ← Back
          </button>
          <h1 className="text-lg font-bold text-white">Settings</h1>
          <div className="w-10" />
        </div>

        <div className="mb-6 flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex-1 rounded-lg px-3 py-2 font-semibold ${
              activeTab === "profile"
                ? "bg-accent text-white"
                : "bg-surface text-mutedLight"
            }`}
          >
            Edit profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`flex-1 rounded-lg px-3 py-2 font-semibold ${
              activeTab === "security"
                ? "bg-accent text-white"
                : "bg-surface text-mutedLight"
            }`}
          >
            Security
          </button>
        </div>

        {activeTab === "profile" && (
          <div className="space-y-4 rounded-2xl bg-surface p-5 shadow-xl">
            <h2 className="text-lg font-bold text-white">Update your name</h2>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">
                Full name
              </label>
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError("");
                }}
                placeholder="Enter your full name"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent ${
                  nameError ? "border-danger" : "border-border bg-[#111827]"
                }`}
              />
              {nameError && (
                <p className="mt-1 text-xs text-danger">{nameError}</p>
              )}
            </div>
            <button
              type="button"
              disabled={loadingName}
              onClick={updateName}
              className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-60"
            >
              {loadingName ? "Updating…" : "Update name"}
            </button>
          </div>
        )}

        {activeTab === "security" && (
          <div className="space-y-6 rounded-2xl bg-surface p-5 shadow-xl">
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-white">Change email</h2>
              <div>
                <label className="mb-1 block text-xs font-semibold text-white">
                  Email
                </label>
                <input
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError("");
                  }}
                  placeholder="Enter your email"
                  type="email"
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent ${
                    emailError ? "border-danger" : "border-border bg-[#111827]"
                  }`}
                />
                {emailError && (
                  <p className="mt-1 text-xs text-danger">{emailError}</p>
                )}
              </div>
              <button
                type="button"
                disabled={loadingEmail}
                onClick={updateEmail}
                className="inline-flex w-full items-center justify-center rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-60"
              >
                {loadingEmail ? "Updating…" : "Update email"}
              </button>
            </div>

            <div className="h-px bg-[#1F1F1F]" />

            <div className="space-y-3">
              <h2 className="text-lg font-bold text-white">Change password</h2>
              <div>
                <label className="mb-1 block text-xs font-semibold text-white">
                  Current password
                </label>
                <input
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  type="password"
                  placeholder="Enter current password"
                  className="w-full rounded-xl border border-border bg-[#111827] px-3.5 py-2.5 text-sm text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-white">
                  New password
                </label>
                <input
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (passwordError) setPasswordError("");
                  }}
                  type="password"
                  placeholder="Enter new password (min 8 characters)"
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent ${
                    passwordError ? "border-danger" : "border-border bg-[#111827]"
                  }`}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-white">
                  Confirm new password
                </label>
                <input
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (passwordError) setPasswordError("");
                  }}
                  type="password"
                  placeholder="Confirm new password"
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent ${
                    passwordError ? "border-danger" : "border-border bg-[#111827]"
                  }`}
                />
                {passwordError && (
                  <p className="mt-1 text-xs text-danger">
                    {passwordError}
                  </p>
                )}
              </div>
              <button
                type="button"
                disabled={loadingPassword}
                onClick={updatePassword}
                className="inline-flex w-full items-center justify-center rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-60"
              >
                {loadingPassword ? "Updating…" : "Update password"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-8">
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className="w-full rounded-xl bg-danger px-4 py-3 text-sm font-semibold text-white hover:bg-danger/90 disabled:opacity-60"
          >
            {loggingOut ? "Logging out…" : "Logout"}
          </button>
        </div>
      </div>
    </div>
  );
}


