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