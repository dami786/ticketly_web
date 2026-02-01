import apiClient, { clearTokens, setTokens, getAccessToken } from "./client";

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  otpRequired?: boolean;
  tempToken?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id: string;
    fullName: string;
    username?: string;
    email: string;
    authProvider?: string;
    role?: string;
    isVerified?: boolean;
    createdEvents?: string[];
    joinedEvents?: string[];
    likedEvents?: string[];
    createdAt?: string;
    updatedAt?: string;
  };
}

export interface VerifyOtpRequest {
  otp: string;
  tempToken: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  accessToken: string;
  refreshToken: string;
  user: {
    _id: string;
    fullName: string;
    email: string;
    username?: string;
    phone?: string;
    companyName?: string;
    role?: string;
  };
}

export interface RefreshTokenResponse {
  success: boolean;
  message: string;
  accessToken: string;
  refreshToken: string;
}

export interface JoinedEvent {
  event: {
    id: string;
    title: string;
    description: string;
    date: string;
    time: string;
    location: string;
    image?: string;
    email: string;
    phone: string;
    ticketPrice: number;
    totalTickets: number;
    status: string;
    createdBy?: {
      _id: string;
      fullName: string;
      username?: string;
      email: string;
    };
    createdAt: string;
    updatedAt: string;
  };
  tickets: Array<{
    id: string;
    eventId: string;
    username: string;
    email: string;
    phone: string;
    status: string;
    accessKey?: string;
    qrCodeUrl?: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface UserProfile {
  _id: string;
  id?: string;
  fullName: string;
  email: string;
  username?: string;
  phone?: string;
  companyName?: string;
  likedEventsVisibility?: 'public' | 'private';
  role?: string;
  profileImage?: string;
  profileImageUrl?: string;
  createdEvents?: any[];
  joinedEvents?: string[] | JoinedEvent[];
  likedEvents?: any[];
  createdAt?: string;
  updatedAt?: string;
}

export const authAPI = {
  signup: async (data: SignupRequest): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post("/auth/signup", data);
    return response.data;
  },

  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post("/auth/login", data);
    return response.data;
  },

  verifyOtp: async (data: VerifyOtpRequest): Promise<VerifyOtpResponse> => {
    const response = await apiClient.post("/auth/verify-otp", data);
    const result = response.data;
    if (result.accessToken && result.refreshToken) {
      setTokens(result.accessToken, result.refreshToken);
    }
    return result;
  },

  refreshToken: async (refreshToken: string): Promise<RefreshTokenResponse> => {
    const response = await apiClient.post("/auth/refresh-token", { refreshToken });
    const result = response.data;
    if (result.accessToken && result.refreshToken) {
      setTokens(result.accessToken, result.refreshToken);
    }
    return result;
  },

  getProfile: async (): Promise<{ success: boolean; user: UserProfile }> => {
    const response = await apiClient.get("/auth/profile");
    return response.data;
  },

  updateUser: async (data: { name?: string; email?: string; password?: string; likedEventsVisibility?: 'public' | 'private' }): Promise<{ success: boolean; message: string; user?: UserProfile }> => {
    const response = await apiClient.put("/auth/update", data);
    return response.data;
  },

  deleteUser: async (): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete("/auth/delete");
    clearTokens();
    return response.data;
  },

  // Web: Upload using File object directly (recommended)
  uploadProfileImageFile: async (file: File): Promise<{ 
    success: boolean; 
    message: string; 
    profileImage?: string;
    profileImageUrl?: string;
    user?: UserProfile;
  }> => {
    try {
      console.log("=== Uploading Profile Image (Web - File) ===");
      console.log("📤 File:", {
        name: file.name,
        type: file.type,
        size: file.size,
        sizeInMB: (file.size / (1024 * 1024)).toFixed(2),
      });

      // Validate file
      if (!file.type.startsWith("image/")) {
        throw new Error("Invalid image file. Please select an image file.");
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Image file is too large. Maximum size is 5MB.");
      }

      // Create FormData
      const formData = new FormData();
      // ✅ CRITICAL: Field name must be exactly 'image'
      formData.append("image", file);

      console.log("✅ FormData created");
      console.log("✅ FormData field name: 'image'");
      
      // Verify FormData contents
      const formDataFile = formData.get("image");
      if (formDataFile instanceof File) {
        console.log("✅ FormData file verified:", {
          name: formDataFile.name,
          type: formDataFile.type,
          size: formDataFile.size,
          sizeInMB: (formDataFile.size / (1024 * 1024)).toFixed(2),
        });
      } else {
        console.warn("⚠️ FormData file is not a File instance:", typeof formDataFile);
      }
      
      // Log all FormData entries
      const entries = Array.from(formData.entries());
      console.log(`✅ FormData entries count: ${entries.length}`);
      entries.forEach(([key, value]) => {
        if (value instanceof File) {
          console.log(`  - ${key}: File (${value.name}, ${value.type}, ${value.size} bytes)`);
        } else {
          console.log(`  - ${key}: ${value}`);
        }
      });

      // Get access token
      const accessToken = getAccessToken();
      if (!accessToken) {
        throw new Error("No access token found. Please login again.");
      }
      console.log("✅ Access token:", accessToken ? "Present" : "Missing");

      // Upload to API - DO NOT set Content-Type header, axios will set it with boundary
      const response = await apiClient.post("/auth/upload-profile-image", formData, {
        timeout: 60000, // 60 seconds
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      console.log("=== Upload Response ===");
      console.log("✅ Response status:", response.status);
      console.log("✅ Response data:", JSON.stringify(response.data, null, 2));

      const responseData = response.data;
      
      // Log all possible image URL fields
      if (responseData) {
        console.log("profileImage:", responseData.profileImage);
        console.log("profileImageUrl:", responseData.profileImageUrl);
        console.log("image:", responseData.image);
        console.log("imageUrl:", responseData.imageUrl);
        if (responseData.user) {
          console.log("user.profileImage:", responseData.user.profileImage);
          console.log("user.profileImageUrl:", responseData.user.profileImageUrl);
        }
      }

      return responseData;
    } catch (error: any) {
      console.error("=== Error uploading profile image ===");
      console.error("❌ Error:", error);
      console.error("❌ Error message:", error?.message);
      console.error("❌ Error response:", error?.response?.data);
      console.error("❌ Error status:", error?.response?.status);
      console.error("❌ Error code:", error?.code);
      
      // Handle specific errors
      if (error?.response?.status === 400) {
        throw new Error(error?.response?.data?.message || "Invalid image file. Please try a different image.");
      }
      if (error?.response?.status === 401) {
        throw new Error("Unauthorized. Please login again.");
      }
      if (error?.response?.status === 413) {
        throw new Error("Image file is too large. Maximum size is 5MB.");
      }
      if (error?.code === "ERR_NETWORK" || !error?.response) {
        throw new Error("Network error. Please check your internet connection.");
      }
      
      throw new Error(error?.response?.data?.message || error?.message || "Failed to upload image. Please try again.");
    }
  },

  // Legacy: Upload using image URI (for compatibility)
  uploadProfileImage: async (imageUri: string): Promise<{ 
    success: boolean; 
    message: string; 
    profileImage?: string;
    profileImageUrl?: string;
    user?: UserProfile;
  }> => {
    try {
      console.log("=== Uploading Profile Image (URI) ===");
      console.log("Image URI type:", imageUri.substring(0, 20));
      
      // Convert image URI to File/Blob
      let file: File | Blob;
      let filename = "profile-image.jpg";
      let mimeType = "image/jpeg";
      
      if (imageUri.startsWith("data:")) {
        // Base64 data URL - extract MIME type
        const mimeMatch = imageUri.match(/data:([^;]+);/);
        if (mimeMatch) {
          mimeType = mimeMatch[1];
          const ext = mimeType.split("/")[1] || "jpg";
          filename = `profile-image.${ext}`;
        }
        const response = await fetch(imageUri);
        const blob = await response.blob();
        file = blob;
      } else if (imageUri.startsWith("blob:")) {
        // Blob URL
        const response = await fetch(imageUri);
        const blob = await response.blob();
        mimeType = blob.type || "image/jpeg";
        const ext = mimeType.split("/")[1] || "jpg";
        filename = `profile-image.${ext}`;
        file = blob;
      } else if (imageUri.startsWith("http://") || imageUri.startsWith("https://")) {
        // HTTP URL
        const response = await fetch(imageUri);
        const blob = await response.blob();
        mimeType = blob.type || "image/jpeg";
        const ext = mimeType.split("/")[1] || "jpg";
        filename = `profile-image.${ext}`;
        file = blob;
      } else {
        throw new Error("Unsupported image URI format");
      }

      // Create FormData
      const formData = new FormData();
      // Create File from Blob if needed
      const fileObj = file instanceof File ? file : new File([file], filename, { type: mimeType });
      // ✅ CRITICAL: Field name must be exactly 'image'
      formData.append("image", fileObj, filename);

      console.log("FormData created, file size:", fileObj.size, "bytes");
      console.log("File type:", mimeType);
      console.log("Filename:", filename);

      // Upload to API - DO NOT set Content-Type header, axios will set it with boundary
      const response = await apiClient.post("/auth/upload-profile-image", formData, {
        timeout: 60000, // 60 seconds
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      console.log("=== Upload Response ===");
      console.log("Response status:", response.status);
      console.log("Response data:", JSON.stringify(response.data, null, 2));

      const responseData = response.data;
      
      // Log all possible image URL fields
      if (responseData) {
        console.log("profileImage:", responseData.profileImage);
        console.log("profileImageUrl:", responseData.profileImageUrl);
        console.log("image:", responseData.image);
        console.log("imageUrl:", responseData.imageUrl);
        if (responseData.user) {
          console.log("user.profileImage:", responseData.user.profileImage);
          console.log("user.profileImageUrl:", responseData.user.profileImageUrl);
        }
      }

      return responseData;
    } catch (error: any) {
      console.error("=== Error uploading profile image ===");
      console.error("Error:", error);
      console.error("Error message:", error?.message);
      console.error("Error response:", error?.response?.data);
      console.error("Error status:", error?.response?.status);
      throw error;
    }
  },

  getUserProfileById: async (userId: string): Promise<{
    success: boolean;
    user: {
      _id: string;
      fullName: string;
      username?: string;
      email: string;
      phone?: string;
      companyName?: string;
      profileImage?: string;
      profileImageUrl?: string;
      createdEvents?: any[];
      joinedEvents?: any[];
      likedEvents?: any[];
      createdAt?: string;
    };
  }> => {
    // Public endpoint - no auth required
    const response = await apiClient.get(`/users/${userId}/profile`, {
      skipAuth: true, // Skip adding auth headers
    } as any);
    return response.data;
  }
};


