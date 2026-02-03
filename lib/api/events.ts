import apiClient from "./client";

export interface Event {
  _id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  /** Relative path from API (e.g. /uploads/events/xyz.jpg); full URL built via getEventImageUrl(event) */
  image?: string;
  imageUrl?: string;
  email: string;
  phone: string;
  ticketPrice: number;
  totalTickets: number;
  status?: "pending" | "approved";
  // Optional ticket theme configuration for advanced ticket styling
  ticketTheme?: any;
  createdBy?: {
    _id: string;
    fullName: string;
    username?: string;
    email: string;
    phone?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateEventRequest {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  /** Relative path from upload (e.g. /uploads/events/xyz.jpg) or base64 for legacy */
  image?: string;
  imageUrl?: string;
  email: string;
  phone: string;
  ticketPrice: number;
  totalTickets: number;
}

/** Payload for PUT /api/events/:id – partial event + optional ticketTheme */
export interface UpdateEventPayload extends Partial<CreateEventRequest> {
  ticketTheme?: unknown;
}

export interface EventsResponse {
  success: boolean;
  count: number;
  events: Event[];
}

export interface EventResponse {
  success: boolean;
  event: Event;
}

export interface CreateEventResponse {
  success: boolean;
  message: string;
  event: {
    id: string;
    title: string;
    status: string;
    createdAt: string;
  };
}

export interface UploadImageResponse {
  success: boolean;
  imageUrl: string;
}

export const eventsAPI = {
  /**
   * Upload event image. Returns imageUrl (relative path) to use when creating/updating event.
   * POST /api/events/upload-image
   */
  uploadEventImage: async (file: File): Promise<UploadImageResponse> => {
    const formData = new FormData();
    formData.append("image", file);
    const response = await apiClient.post("/events/upload-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000,
    });
    const data = response.data as { success?: boolean; imageUrl?: string };
    return {
      success: data.success !== false,
      imageUrl: data.imageUrl ?? (response.data as any).url ?? "",
    };
  },

  getApprovedEvents: async (): Promise<EventsResponse> => {
    const response = await apiClient.get("/events");
    
    // Debug: Log API response to check image fields
    if (response.data?.events && Array.isArray(response.data.events)) {
      console.log("=== API Events Response ===");
      console.log("Total events:", response.data.events.length);
      response.data.events.forEach((event: any, index: number) => {
        console.log(`Event ${index + 1}: ${event.title}`, {
          hasImage: !!event.image,
          hasImageUrl: !!event.imageUrl,
          imageUrlValue: event.imageUrl ? (typeof event.imageUrl === "string" ? `${event.imageUrl.substring(0, 100)}...` : event.imageUrl) : "null",
          imageUrlType: typeof event.imageUrl,
          imageUrlLength: event.imageUrl ? (typeof event.imageUrl === "string" ? event.imageUrl.length : 0) : 0,
          imageType: event.image ? typeof event.image : "none",
          imageLength: event.image ? event.image.length : 0,
          imagePreview: event.image ? `${event.image.substring(0, 50)}...` : "no image",
          allFields: Object.keys(event).filter(k => k.toLowerCase().includes("image"))
        });
      });
    }
    
    return response.data;
  },

  createEvent: async (data: CreateEventRequest): Promise<CreateEventResponse> => {
    try {
      console.log("=== Creating Event ===");
      console.log("Event data:", {
        title: data.title,
        date: data.date,
        location: data.location,
        email: data.email,
        phone: data.phone,
        hasImage: !!data.image,
        imageSize: data.image ? `${(data.image.length / 1024).toFixed(2)} KB` : "none"
      });
      
      const response = await apiClient.post("/events", data, {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 60000, // 60 seconds
      });
      
      console.log("✅ Event created successfully!");
      console.log("Response status:", response.status);
      console.log("Response data:", response.data);
      console.log("Response data type:", typeof response.data);
      
      // Return the response data - handle both direct data and nested structure
      const responseData = response.data || response;
      return responseData as CreateEventResponse;
    } catch (error: any) {
      console.error("❌ Error creating event:");
      console.error("Error type:", error?.constructor?.name);
      console.error("Error message:", error?.message);
      console.error("Error code:", error?.code);
      console.error("Error status:", error?.response?.status);
      console.error("Error response data:", error?.response?.data);
      console.error("Error response headers:", error?.response?.headers);
      console.error("Request URL:", error?.config?.url);
      console.error("Request method:", error?.config?.method);
      console.error("Request data size:", error?.config?.data ? JSON.stringify(error.config.data).length : "unknown");
      
      // Re-throw with more context
      throw error;
    }
  },

  getMyEvents: async (): Promise<EventsResponse> => {
    const response = await apiClient.get("/events/my");
    return response.data;
  },

  getEventById: async (id: string): Promise<EventResponse> => {
    const response = await apiClient.get(`/events/${id}`);
    return response.data;
  },

  getTicketsByEventId: async (eventId: string): Promise<{ success: boolean; count: number; tickets: any[] }> => {
    const response = await apiClient.get(`/events/${eventId}/tickets`);
    return response.data;
  },

  likeEvent: async (eventId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/events/${eventId}/like`);
    return response.data;
  },

  unlikeEvent: async (eventId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/events/${eventId}/unlike`);
    return response.data;
  },

  updateTicketColor: async (eventId: string, backgroundColor: string): Promise<{ success: boolean; message: string; ticket?: any }> => {
    const response = await apiClient.put(`/events/${eventId}/ticket/color`, {
      backgroundColor
    });
    return response.data;
  },

  updateEvent: async (eventId: string, data: UpdateEventPayload): Promise<{ success: boolean; message: string; event?: Event }> => {
    const response = await apiClient.put(`/events/${eventId}`, data, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 60000,
    });
    return response.data;
  }
};


