import apiClient from "./client";

export interface Ticket {
  id: string;
  event: {
    _id: string;
    title: string;
    description: string;
    date: string;
    time: string;
    location: string;
    image?: string;
    ticketPrice: number;
  };
  organizer?: {
    _id: string;
    fullName: string;
    username?: string;
    email: string;
  };
  user?: {
    _id: string;
    fullName: string;
    username?: string;
    email: string;
  };
  username: string;
  email: string;
  phone: string;
  status:
    | "pending_payment"
    | "payment_in_review"
    | "confirmed"
    | "used"
    | "cancelled"
    | string;
  accessKey?: string;
  qrCodeUrl?: string;
  createdAt: string;
  updatedAt: string;
  scannedAt?: string;
}

export interface CreateTicketRequest {
  eventId: string;
  username: string;
  email: string;
  phone: string;
}

export interface CreateTicketResponse {
  success: boolean;
  message: string;
  ticket: {
    id: string;
    eventId: string;
    username: string;
    email: string;
    phone: string;
    status: string;
    createdAt: string;
  };
}

export interface GetMyTicketsResponse {
  success: boolean;
  count: number;
  tickets: Ticket[];
}

export interface GetTicketByIdResponse {
  success: boolean;
  ticket: Ticket;
}

export interface ScanTicketRequest {
  accessKey: string;
}

export interface ScanTicketResponse {
  success: boolean;
  message: string;
  ticket: {
    id: string;
    event: {
      _id: string;
      title: string;
      date: string;
      time: string;
      location: string;
    };
    user: {
      _id: string;
      fullName: string;
      username?: string;
      email: string;
    };
    username: string;
    status: string;
    scannedAt: string;
  };
}

export interface UpdateTicketStatusByKeyRequest {
  accessKey: string;
  status: "used" | "cancelled";
}

export interface UpdateTicketStatusByKeyResponse {
  success: boolean;
  message: string;
  ticket?: Ticket;
}

export const ticketsAPI = {
  createTicket: async (data: CreateTicketRequest): Promise<CreateTicketResponse> => {
    const response = await apiClient.post("/tickets", data);
    return response.data;
  },

  getMyTickets: async (): Promise<GetMyTicketsResponse> => {
    const response = await apiClient.get("/tickets/my");
    return response.data;
  },

  getTicketById: async (ticketId: string): Promise<GetTicketByIdResponse> => {
    const response = await apiClient.get(`/tickets/${ticketId}`);
    return response.data;
  },

  scanTicket: async (data: ScanTicketRequest): Promise<ScanTicketResponse> => {
    const response = await apiClient.post("/tickets/scan", data);
    return response.data;
  },

  submitPayment: async (
    ticketId: string,
    method: string,
    screenshotUri: string
  ): Promise<{
    success: boolean;
    message: string;
    payment?: {
      id: string;
      ticketId: string;
      amount: number;
      method: string;
      status: string;
      screenshotUrl?: string;
      screenshotUrlFull?: string;
      createdAt: string;
    };
    ticket?: {
      id: string;
      status: string;
    };
  }> => {
    try {
      // Convert image URI to File/Blob
      let file: File | Blob;
      
      if (screenshotUri.startsWith("data:")) {
        // Base64 data URL
        const response = await fetch(screenshotUri);
        const blob = await response.blob();
        file = blob;
      } else if (screenshotUri.startsWith("blob:")) {
        // Blob URL
        const response = await fetch(screenshotUri);
        const blob = await response.blob();
        file = blob;
      } else if (screenshotUri.startsWith("http://") || screenshotUri.startsWith("https://")) {
        // HTTP URL
        const response = await fetch(screenshotUri);
        const blob = await response.blob();
        file = blob;
      } else {
        throw new Error("Unsupported image URI format");
      }

      // Create FormData
      const formData = new FormData();
      formData.append("ticketId", ticketId);
      formData.append("method", method);
      formData.append("screenshot", file, "payment-screenshot.jpg");

      // Upload to API
      const response = await apiClient.post("/payments", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 60000, // 60 seconds
      });

      return response.data;
    } catch (error: any) {
      console.error("Error submitting payment:", error);
      throw error;
    }
  },

  updateTicketStatusByKey: async (
    data: UpdateTicketStatusByKeyRequest
  ): Promise<UpdateTicketStatusByKeyResponse> => {
    const response = await apiClient.put("/tickets/update-status-by-key", data);
    return response.data;
  }
};


