"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { authAPI } from "../../lib/api/auth";
import { getAccessToken, getRefreshToken, setTokens } from "../../lib/api/client";
import { useAppStore } from "../../store/useAppStore";

type Mode = "login" | "signup";
type LoginMethod = "google" | "email" | null;

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";
  const login = useAppStore((state) => state.login);

  const [mode, setMode] = useState<Mode>("login");
  const [loginMethod, setLoginMethod] = useState<LoginMethod>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [otpError, setOtpError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const accessToken = getAccessToken();
      if (!accessToken) return;
      try {
        const response = await authAPI.getProfile();
        if (response.success && response.user) {
           login(response.user);
           router.replace(redirect);
          return;
        }
      } catch (error: any) {
        if (error.response?.status === 401) {
          const refreshToken = getRefreshToken();
          if (refreshToken) {
            try {
              const refreshResponse = await authAPI.refreshToken(refreshToken);
              if (refreshResponse.success) {
                const profileResponse = await authAPI.getProfile();
                 if (profileResponse.success && profileResponse.user) {
                   login(profileResponse.user);
                   router.replace(redirect);
                 }
              }
            } catch {
              // ignore, stay on login
            }
          }
        }
      }
    };
    void checkAuth();
  }, [login, router, redirect]);

  const handleSignup = async () => {
    setErrorMessage("");
    if (!name || !email || !password) {
      setErrorMessage("Please fill in all fields.");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const response = await authAPI.signup({ name, email, password });
      if (response.success) {
        setName("");
        setPassword("");
        setErrorMessage("");
        setMode("login");
        setLoginMethod("email");
        alert("Account created successfully! Please login with your email and password.");
      } else {
        setErrorMessage(response.message || "Failed to create account.");
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message ??
        error.message ??
        "Failed to create account. Please try again.";
      setErrorMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    setLoginError("");
    if (!email || !password) {
      setLoginError("Please enter both email and password.");
      return;
    }
    if (password.length < 8) {
      setLoginError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const response = await authAPI.login({ email, password });
      if (response.success) {
        if (response.accessToken && response.refreshToken && response.user) {
          await setTokens(response.accessToken, response.refreshToken);
           const userProfile = {
             ...response.user,
             _id: response.user.id
           };
           login(userProfile);
           router.replace(redirect);
        } else if (response.tempToken) {
          setLoginError("");
          setTempToken(response.tempToken);
          setOtpSent(true);
          alert(`OTP has been sent to ${email}. Please check your email.`);
          setLoading(false);
        } else {
          setLoginError(response.message || "Login failed.");
          setLoading(false);
        }
      } else {
        setLoginError(response.message || "Login failed.");
        setLoading(false);
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message ??
        error.response?.data?.error ??
        error.message ??
        "Login failed. Please try again.";
      setLoginError(errorMsg);
      setLoading(false);
    }
  };

  const handleOTPSubmit = async () => {
    setOtpError("");
    if (!otp || otp.length !== 6) {
      setOtpError("Please enter a valid 6-digit OTP.");
      return;
    }
    if (!tempToken) {
      setOtpError("Session expired. Please try logging in again.");
      setOtpSent(false);
      return;
    }
    setLoading(true);
    try {
      const response = await authAPI.verifyOtp({ otp, tempToken });
       if (response.success && response.user) {
         login(response.user);
         router.replace(redirect);
      } else {
        setOtpError(response.message || "Failed to verify OTP.");
        setLoading(false);
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message ??
        error.message ??
        "Failed to verify OTP. Please try again.";
      setOtpError(errorMsg);
      setLoading(false);
    }
  };

  const baseContainer =
    "flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4";

  if (mode === "signup" && loginMethod === "email" && !otpSent) {
    return (
      <div className={baseContainer}>
        <div className="w-full max-w-md rounded-2xl bg-surface px-6 py-8 shadow-xl">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-white">ticketly</h1>
            <p className="text-sm text-mutedLight">Create your account</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">
                Full name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Fatima Ali"
                className="w-full rounded-xl border border-border bg-[#111827] px-3.5 py-2.5 text-sm text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">
                Email
              </label>
              <input
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage("");
                }}
                placeholder="e.g. fatimaali@gmail.com"
                type="email"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent ${
                  errorMessage ? "border-danger" : "border-border"
                }`}
              />
              {errorMessage && (
                <p className="mt-1 text-xs text-danger">{errorMessage}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">
                Password
              </label>
              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  type={showSignupPassword ? "text" : "password"}
                  className="w-full rounded-xl border border-border bg-[#111827] px-3.5 py-2.5 pr-10 text-sm text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-mutedLight"
                >
                  {showSignupPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={handleSignup}
              className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-60"
            >
              {loading ? "Creating account…" : "Sign up"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setName("");
                setEmail("");
                setPassword("");
                setErrorMessage("");
              }}
              className="w-full text-center text-xs font-semibold text-accent"
            >
              Already have an account? Login
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMethod(null);
                setName("");
                setEmail("");
                setPassword("");
                setErrorMessage("");
              }}
              className="mt-2 w-full rounded-xl border border-border bg-[#111827] px-3 py-2.5 text-sm font-semibold text-white"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "login" && loginMethod === "email" && !otpSent) {
    return (
      <div className={baseContainer}>
        <div className="w-full max-w-md rounded-2xl bg-surface px-6 py-8 shadow-xl">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-white">ticketly</h1>
            <p className="text-sm text-mutedLight">Login to your account</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">
                Email
              </label>
              <input
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (loginError) setLoginError("");
                }}
                placeholder="e.g. fatimaali@gmail.com"
                type="email"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent ${
                  loginError ? "border-danger" : "border-border"
                }`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">
                Password
              </label>
              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (loginError) setLoginError("");
                  }}
                  placeholder="Enter your password"
                  type={showPassword ? "text" : "password"}
                  className={`w-full rounded-xl border px-3.5 py-2.5 pr-10 text-sm text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent ${
                    loginError ? "border-danger" : "border-border"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-mutedLight"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {loginError && (
                <p className="mt-1 text-xs text-danger">{loginError}</p>
              )}
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={handleEmailLogin}
              className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-60"
            >
              {loading ? "Logging in…" : "Login"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setEmail("");
                setPassword("");
                setLoginError("");
              }}
              className="w-full text-center text-xs font-semibold text-accent"
            >
              Don&apos;t have an account? Sign up
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMethod(null);
                setEmail("");
                setPassword("");
                setLoginError("");
              }}
              className="mt-2 w-full rounded-xl border border-border bg-[#111827] px-3 py-2.5 text-sm font-semibold text-white"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loginMethod === "email" && otpSent) {
    return (
      <div className={baseContainer}>
        <div className="w-full max-w-md rounded-2xl bg-surface px-6 py-8 shadow-xl">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-white">ticketly</h1>
            <p className="text-sm text-mutedLight">
              {email
                ? `Enter the OTP sent to ${email}`
                : "Enter the OTP sent to your email"}
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">
                OTP
              </label>
              <input
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value);
                  if (otpError) setOtpError("");
                }}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent ${
                  otpError ? "border-danger" : "border-border"
                }`}
              />
              {otpError && (
                <p className="mt-1 text-xs text-danger">{otpError}</p>
              )}
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={handleOTPSubmit}
              className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-60"
            >
              {loading ? "Verifying…" : "Verify OTP"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOtpSent(false);
                setOtp("");
                setOtpError("");
              }}
              className="w-full text-center text-xs font-semibold text-accent"
            >
              Resend OTP
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMethod(null);
                setOtpSent(false);
                setOtp("");
                setEmail("");
                setPassword("");
                setName("");
                setTempToken("");
                setOtpError("");
              }}
              className="mt-2 w-full rounded-xl border border-border bg-[#111827] px-3 py-2.5 text-sm font-semibold text-white"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleGoogleLogin = () => {
    alert("Google login will be implemented with OAuth flow.");
  };

  return (
    <div className={baseContainer}>
      <div className="w-full max-w-md rounded-2xl bg-surface px-6 py-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-white">ticketly</h1>
          <p className="text-sm text-mutedLight">
            Login via Google or email to proceed.
          </p>
        </div>
        <div className="mb-10 space-y-3">
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#111827]"
          >
            <span className="text-xl font-bold text-[#4285F4]">G</span>
            <span>Sign in with Google</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMethod("email");
              setMode("login");
            }}
            className="w-full rounded-xl border border-border bg-[#111827] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Login with email
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMethod("email");
              setMode("signup");
            }}
            className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent/90"
          >
            Sign up with email
          </button>
        </div>
        <div className="mb-4 flex flex-wrap justify-center gap-4 text-xs text-mutedLight">
          <span>Contact us</span>
          <span>Privacy policy</span>
          <span>Terms of service</span>
        </div>
        <p className="text-center text-[11px] text-muted">
          2025 Ticketly. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}


