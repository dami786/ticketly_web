"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { FiArrowLeft, FiChevronDown, FiChevronUp, FiEye, FiEyeOff, FiHeart, FiLock, FiLogOut, FiRefreshCw, FiUser } from "react-icons/fi";
import { authAPI } from "../../lib/api/auth";
import { useToast } from "../../lib/hooks/useToast";
import { useAppStore } from "../../store/useAppStore";
import { Modal } from "../../components/Modal";

type ExpandedSection = "profile" | "security" | "liked" | null;

export default function SettingsPage() {
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);
  const logout = useAppStore((state) => state.logout);
  const { success, info, warning, error: showError } = useToast();

  const [expandedSection, setExpandedSection] = useState<ExpandedSection>(null);

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
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [likedEventsVisibility, setLikedEventsVisibility] = useState<'public' | 'private'>(
    (user?.likedEventsVisibility as 'public' | 'private') || 'public'
  );
  const [loadingVisibility, setLoadingVisibility] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await authAPI.getProfile();
      if (response.success && response.user) {
        setUser(response.user);
        setUser(response.user);
        setName(response.user.fullName ?? "");
        setEmail(response.user.email ?? "");
        setLikedEventsVisibility((response.user.likedEventsVisibility as 'public' | 'private') || 'public');
        success("Profile refreshed successfully.");
      }
    } catch (error) {
      // Ignore errors silently
    } finally {
      setRefreshing(false);
    }
  }, [setUser, success]);

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
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
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
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-white px-4">
        <p className="mb-4 text-base font-semibold text-error">
          Please login to manage your settings.
        </p>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-[#B91C1C]"
        >
          Login
        </button>
      </div>
    );
  }

  const toggleSection = (section: ExpandedSection) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const updateLikedEventsVisibility = async (visibility: 'public' | 'private') => {
    if (visibility === likedEventsVisibility) return;
    
    setLoadingVisibility(true);
    try {
      const response = await authAPI.updateUser({ likedEventsVisibility: visibility });
      if (response.success) {
        if (response.user) setUser(response.user);
        setLikedEventsVisibility(visibility);
        success(`Liked events visibility set to ${visibility}.`);
      } else {
        showError(response.message || "Failed to update visibility.");
      }
    } catch (error: any) {
      showError(error?.response?.data?.message || "Failed to update visibility.");
    } finally {
      setLoadingVisibility(false);
    }
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Desktop Layout - Unchanged */}
      <div className="hidden sm:block mx-auto max-w-3xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
          <h1 className="text-lg font-bold text-gray-900">Settings</h1>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 transition-colors"
            aria-label="Refresh profile"
          >
            <FiRefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="mb-6 flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => setExpandedSection(expandedSection === "profile" ? null : "profile")}
            className={`flex-1 rounded-md px-3 py-2 font-semibold ${
              expandedSection === "profile"
                ? "bg-primary text-gray-900"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            Edit profile
          </button>
          <button
            type="button"
            onClick={() => setExpandedSection(expandedSection === "security" ? null : "security")}
            className={`flex-1 rounded-md px-3 py-2 font-semibold ${
              expandedSection === "security"
                ? "bg-primary text-gray-900"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            Security
          </button>
        </div>

        {/* Desktop Content - Keep existing tabs structure */}
        {expandedSection === "profile" && (
          <div className="space-y-4 rounded-xl bg-white border border-gray-200 p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Update your name</h2>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-900">
                Full name
              </label>
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError("");
                }}
                placeholder="Enter your full name"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary bg-gray-50 ${
                  nameError ? "border-error" : "border-gray-200"
                }`}
              />
              {nameError && (
                <p className="mt-1 text-xs text-error">{nameError}</p>
              )}
            </div>
            <button
              type="button"
              disabled={loadingName}
              onClick={updateName}
              className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-[#B91C1C] disabled:opacity-60"
            >
              {loadingName ? "Updating…" : "Update name"}
            </button>
          </div>
        )}

        {expandedSection === "profile" && (
          <div className="mt-4 space-y-4 rounded-xl bg-white border border-gray-200 p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Liked Events Visibility</h2>
            <p className="text-sm text-gray-600">
              Control who can see the events you've liked on your profile.
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {likedEventsVisibility === 'public' ? 'Public' : 'Private'}
                </p>
                <p className="text-xs text-gray-600">
                  {likedEventsVisibility === 'public' 
                    ? 'Everyone can see your liked events'
                    : 'Only you can see your liked events'}
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={likedEventsVisibility === 'public'}
                  onChange={(e) => {
                    const newVisibility = e.target.checked ? 'public' : 'private';
                    updateLikedEventsVisibility(newVisibility);
                  }}
                  disabled={loadingVisibility}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-300 transition-colors peer-checked:bg-primary peer-disabled:cursor-not-allowed peer-disabled:opacity-50"></div>
                <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5 peer-disabled:cursor-not-allowed"></div>
              </label>
            </div>
          </div>
        )}

        {expandedSection === "security" && (
          <div className="space-y-6 rounded-xl bg-white border border-gray-200 p-5 shadow-sm">
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-gray-900">Change email</h2>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-900">
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
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary bg-gray-50 ${
                    emailError ? "border-error" : "border-gray-200"
                  }`}
                />
                {emailError && (
                  <p className="mt-1 text-xs text-error">{emailError}</p>
                )}
              </div>
              <button
                type="button"
                disabled={loadingEmail}
                onClick={updateEmail}
                className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-[#B91C1C] disabled:opacity-60"
              >
                {loadingEmail ? "Updating…" : "Update email"}
              </button>
            </div>

            <div className="h-px bg-gray-200" />

            <div className="space-y-3">
              <h2 className="text-lg font-bold text-gray-900">Change password</h2>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-900">
                  Current password
                </label>
                <div className="relative">
                  <input
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="Enter current password"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 pr-10 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900 transition-colors"
                    aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                  >
                    {showCurrentPassword ? (
                      <FiEyeOff className="h-4 w-4" />
                    ) : (
                      <FiEye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-900">
                  New password
                </label>
                <div className="relative">
                  <input
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (passwordError) setPasswordError("");
                    }}
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter new password (min 8 characters)"
                    className={`w-full rounded-xl border px-3.5 py-2.5 pr-10 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary ${
                      passwordError ? "border-error" : "border-gray-200 bg-gray-50"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900 transition-colors"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? (
                      <FiEyeOff className="h-4 w-4" />
                    ) : (
                      <FiEye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-900">
                  Confirm new password
                </label>
                <div className="relative">
                  <input
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (passwordError) setPasswordError("");
                    }}
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    className={`w-full rounded-xl border px-3.5 py-2.5 pr-10 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary ${
                      passwordError ? "border-error" : "border-gray-200 bg-gray-50"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900 transition-colors"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <FiEyeOff className="h-4 w-4" />
                    ) : (
                      <FiEye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {passwordError && (
                  <p className="mt-1 text-xs text-error">
                    {passwordError}
                  </p>
                )}
              </div>
              <button
                type="button"
                disabled={loadingPassword}
                onClick={updatePassword}
                className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-60"
              >
                {loadingPassword ? "Updating…" : "Update password"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-8">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full rounded-xl bg-danger px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-danger/90 disabled:opacity-60"
          >
            {loggingOut ? "Logging out…" : "Logout"}
          </button>
        </div>
      </div>

      {/* Mobile Layout - Collapsible Sections (as per Mobile App Design Guide) */}
      <div className="sm:hidden">
        {/* Header */}
        <header 
          className="flex flex-row items-center px-3 pb-4 border-b border-gray-200"
          style={{ paddingTop: 'calc(60px + env(safe-area-inset-top))' }}
        >
          <button
            type="button"
            onClick={() => router.back()}
            className="-ml-2 p-2"
          >
            <FiArrowLeft size={24} className="text-gray-900" />
          </button>
          <h1 className="flex-1 text-center text-lg font-semibold text-gray-900 mr-8">
            Settings
          </h1>
        </header>

        {/* Sections Container */}
        <div className="px-3 pt-4 pb-8" style={{ paddingBottom: 'calc(32px + env(safe-area-inset-bottom))' }}>
          {/* Edit Profile Section */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("profile")}
              className="w-full flex flex-row items-center justify-between py-4 px-3 border-b border-gray-200 active:bg-gray-50 active:opacity-70 transition-colors"
            >
              <div className="flex flex-row items-center">
                <FiUser size={22} className="text-gray-900 mr-3" />
                <span className="text-base font-medium text-gray-900">Edit Profile</span>
              </div>
              {expandedSection === "profile" ? (
                <FiChevronUp size={24} className="text-gray-500" />
              ) : (
                <FiChevronDown size={24} className="text-gray-500" />
              )}
            </button>

            {expandedSection === "profile" && (
              <div className="pt-2 pb-6 px-3">
                <label className="block text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">
                  NAME
                </label>
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError("");
                  }}
                  placeholder="Full name"
                  className={`w-full rounded-lg border px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:bg-white bg-gray-50 mb-2 ${
                    nameError ? "border-red-500" : "border-gray-200"
                  }`}
                />
                {nameError && (
                  <p className="text-xs text-red-500 mb-4">{nameError}</p>
                )}
                <button
                  type="button"
                  disabled={loadingName}
                  onClick={updateName}
                  className="w-full bg-gray-900 py-3 rounded-lg flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
                >
                  <span className="text-sm font-semibold text-white">
                    {loadingName ? "Updating…" : "Update Name"}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Security Section */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("security")}
              className="w-full flex flex-row items-center justify-between py-4 px-3 border-b border-gray-200 active:bg-gray-50 active:opacity-70 transition-colors"
            >
              <div className="flex flex-row items-center">
                <FiLock size={22} className="text-gray-900 mr-3" />
                <span className="text-base font-medium text-gray-900">Security</span>
              </div>
              {expandedSection === "security" ? (
                <FiChevronUp size={24} className="text-gray-500" />
              ) : (
                <FiChevronDown size={24} className="text-gray-500" />
              )}
            </button>

            {expandedSection === "security" && (
              <div className="pt-2 pb-6 px-3">
                {/* Email Section */}
                <label className="block text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">
                  EMAIL
                </label>
                <input
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError("");
                  }}
                  placeholder="Email"
                  type="email"
                  className={`w-full rounded-lg border px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:bg-white bg-gray-50 mb-2 ${
                    emailError ? "border-red-500" : "border-gray-200"
                  }`}
                />
                {emailError && (
                  <p className="text-xs text-red-500 mb-4">{emailError}</p>
                )}
                <button
                  type="button"
                  disabled={loadingEmail}
                  onClick={updateEmail}
                  className="w-full bg-gray-900 py-3 rounded-lg flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed transition-opacity mb-8"
                >
                  <span className="text-sm font-semibold text-white">
                    {loadingEmail ? "Updating…" : "Update Email"}
                  </span>
                </button>

                {/* Password Section */}
                <label className="block text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">
                  PASSWORD
                </label>
                <div className="relative mb-3">
                  <input
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="Current password"
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 pr-12 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-3 p-1"
                  >
                    {showCurrentPassword ? (
                      <FiEyeOff size={20} className="text-gray-400" />
                    ) : (
                      <FiEye size={20} className="text-gray-400" />
                    )}
                  </button>
                </div>
                <div className="relative mb-3">
                  <input
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (passwordError) setPasswordError("");
                    }}
                    type={showNewPassword ? "text" : "password"}
                    placeholder="New password"
                    className={`w-full rounded-lg border px-4 py-3 pr-12 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:bg-white ${
                      passwordError ? "border-red-500" : "border-gray-200 bg-gray-50"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3 p-1"
                  >
                    {showNewPassword ? (
                      <FiEyeOff size={20} className="text-gray-400" />
                    ) : (
                      <FiEye size={20} className="text-gray-400" />
                    )}
                  </button>
                </div>
                <div className="relative mb-2">
                  <input
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (passwordError) setPasswordError("");
                    }}
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    className={`w-full rounded-lg border px-4 py-3 pr-12 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:bg-white ${
                      passwordError ? "border-red-500" : "border-gray-200 bg-gray-50"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 p-1"
                  >
                    {showConfirmPassword ? (
                      <FiEyeOff size={20} className="text-gray-400" />
                    ) : (
                      <FiEye size={20} className="text-gray-400" />
                    )}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-xs text-red-500 mb-4">{passwordError}</p>
                )}
                <button
                  type="button"
                  disabled={loadingPassword}
                  onClick={updatePassword}
                  className="w-full bg-gray-900 py-3 rounded-lg flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
                >
                  <span className="text-sm font-semibold text-white">
                    {loadingPassword ? "Updating…" : "Update Password"}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Liked Events Section */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("liked")}
              className="w-full flex flex-row items-center justify-between py-4 px-3 border-b border-gray-200 active:bg-gray-50 active:opacity-70 transition-colors"
            >
              <div className="flex flex-row items-center">
                <FiHeart size={22} className="text-gray-900 mr-3" />
                <span className="text-base font-medium text-gray-900">Liked Events</span>
              </div>
              <div className="flex flex-row items-center">
                <span className="text-sm text-gray-500 mr-2">
                  {likedEventsVisibility === 'public' ? 'Public' : 'Private'}
                </span>
                {expandedSection === "liked" ? (
                  <FiChevronUp size={24} className="text-gray-500" />
                ) : (
                  <FiChevronDown size={24} className="text-gray-500" />
                )}
              </div>
            </button>

            {expandedSection === "liked" && (
              <div className="pt-2 pb-6 px-3">
                <p className="text-sm text-gray-600 mb-3">
                  Choose who can see your liked events on your public profile
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateLikedEventsVisibility('public')}
                    disabled={loadingVisibility}
                    className={`flex-1 py-3 rounded-lg flex items-center justify-center border-2 transition-all ${
                      likedEventsVisibility === 'public'
                        ? 'bg-primary border-primary'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <span className={`text-sm font-semibold ${
                      likedEventsVisibility === 'public' ? 'text-white' : 'text-gray-600'
                    }`}>
                      Public
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateLikedEventsVisibility('private')}
                    disabled={loadingVisibility}
                    className={`flex-1 py-3 rounded-lg flex items-center justify-center border-2 transition-all ${
                      likedEventsVisibility === 'private'
                        ? 'bg-gray-900 border-gray-900'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <span className={`text-sm font-semibold ${
                      likedEventsVisibility === 'private' ? 'text-white' : 'text-gray-600'
                    }`}>
                      Private
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Logout Button - Mobile */}
        <div className="mt-12 px-3 pb-8" style={{ paddingBottom: 'calc(32px + env(safe-area-inset-bottom))' }}>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex flex-row items-center justify-center gap-2 py-3 rounded-lg border-2 border-red-500 bg-red-50 active:opacity-70 transition-opacity"
          >
            <FiLogOut size={20} className="text-red-600" />
            <span className="text-base font-semibold text-red-600">
              {loggingOut ? "Logging out…" : "Log out"}
            </span>
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Confirm Logout"
        message="Are you sure you want to logout? You will need to login again to access your account."
        variant="warning"
        primaryButtonText="Logout"
        secondaryButtonText="Cancel"
        onPrimaryPress={confirmLogout}
        onSecondaryPress={() => setShowLogoutModal(false)}
      />
    </div>
  );
}


