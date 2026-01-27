import apiClient from "./client";

export interface Event {
  _id: string;
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
  status?: "pending" | "approved";
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
  image?: string;
  email: string;
  phone: string;
  ticketPrice: number;
  totalTickets: number;
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

export const eventsAPI = {
  getApprovedEvents: async (): Promise<EventsResponse> => {
    const response = await apiClient.get("/events");
    return response.data;
  },

  createEvent: async (data: CreateEventRequest): Promise<CreateEventResponse> => {
    const response = await apiClient.post("/events", data);
    return response.data;
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
  }
};


