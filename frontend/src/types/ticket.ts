export interface Resource {
  location: string;
  id: string;
  name: string;
  type: string;
  status: string;
}

export interface TicketAttachment {
  fileName: string;
  contentType: string;
  dataUrl: string;
}

export interface TicketMessage {
  senderId: string;
  senderRole: string;
  senderEmail?: string;
  message?: string;
  imageDataUrl?: string;
  imageFileName?: string;
  imageContentType?: string;
  createdAt?: string;
}

export interface MaintenanceTicket {
  id: string;
  userId: string;
  userDisplayName?: string;
  userEmail?: string;
  resourceId?: string;
  resourceName?: string;
  location: string;
  category: string;
  description: string;
  priority: string;
  status: string;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  assignedTechnicianEmail?: string;
  assignedAt?: string;
  rejectionReason?: string;
  resolutionNotes?: string;
  closedAt?: string;
  preferredContactDetails: string;
  preferredContactMethod?: string;
  attachments: TicketAttachment[];
  ticketMessages?: TicketMessage[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTicketPayload {
  resourceId?: string;
  resourceName?: string;
  location: string;
  category: string;
  description: string;
  priority: string;
  preferredContactDetails: string;
  preferredContactMethod?: string;
  attachments: TicketAttachment[];
}