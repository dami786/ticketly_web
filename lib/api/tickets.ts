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
  status: "pending_payment" | "confirmed" | "used" | "cancelled" | string;
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
  }
};


