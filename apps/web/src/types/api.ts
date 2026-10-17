export type User = {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
};

export type EventItem = {
  id: string;
  title: string;
  description: string;
  venue: string;
  startsAt: string;
  totalSeats: number;
  bookedSeats: number;
  availableSeats: number;
  hasStarted: boolean;
  viewerBooking?: { id: string } | null;
};

export type PaginationInfo = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type BookingItem = {
  id: string;
  status: 'ACTIVE' | 'CANCELLED';
  createdAt: string;
  cancelledAt: string | null;
  canCancel: boolean;
  event: { id: string; title: string; venue: string; startsAt: string; hasStarted: boolean };
};