import apiClient from '../api/apiClient';
import type { CreateTicketPayload, MaintenanceTicket, Resource } from '../types/ticket';

export interface TicketCommentPayload {
  message?: string;
  imageDataUrl?: string;
  imageFileName?: string;
  imageContentType?: string;
  senderEmail?: string;
}

export interface TicketStatusUpdatePayload {
  status: string;
  reason?: string;
  resolutionNotes?: string;
}

export const getMyTickets = async (): Promise<MaintenanceTicket[]> => {
  const response = await apiClient.get<MaintenanceTicket[]>('/tickets/my');
  return response.data;
};

export const createTicket = async (payload: CreateTicketPayload): Promise<MaintenanceTicket> => {
  const response = await apiClient.post<MaintenanceTicket>('/tickets', payload);
  return response.data;
};

export const updateMyTicket = async (ticketId: string, payload: CreateTicketPayload): Promise<MaintenanceTicket> => {
  const response = await apiClient.patch<MaintenanceTicket>(`/tickets/my/${ticketId}`, payload);
  return response.data;
};

export const deleteMyTicket = async (ticketId: string): Promise<void> => {
  await apiClient.delete(`/tickets/my/${ticketId}`);
};

export const getResources = async (): Promise<Resource[]> => {
  const response = await apiClient.get<Resource[]>('/resources');
  return response.data;
};

export const getAssignedTechnicianTickets = async (): Promise<MaintenanceTicket[]> => {
  const response = await apiClient.get<MaintenanceTicket[]>('/tickets/technician/assigned');
  return response.data;
};

export const addTicketComment = async (
  ticketId: string,
  payload: TicketCommentPayload,
): Promise<MaintenanceTicket> => {
  const response = await apiClient.post<MaintenanceTicket>(`/tickets/${ticketId}/comments`, payload);
  return response.data;
};

export const updateTicketComment = async (
  ticketId: string,
  commentIndex: number,
  payload: TicketCommentPayload,
): Promise<MaintenanceTicket> => {
  const response = await apiClient.patch<MaintenanceTicket>(`/tickets/${ticketId}/comments/${commentIndex}`, payload);
  return response.data;
};

export const deleteTicketComment = async (
  ticketId: string,
  commentIndex: number,
): Promise<MaintenanceTicket> => {
  const response = await apiClient.delete<MaintenanceTicket>(`/tickets/${ticketId}/comments/${commentIndex}`);
  return response.data;
};

export const updateTicketStatusByTechnician = async (
  ticketId: string,
  payload: TicketStatusUpdatePayload,
): Promise<MaintenanceTicket> => {
  const response = await apiClient.patch<MaintenanceTicket>(`/tickets/${ticketId}/technician-status`, payload);
  return response.data;
};