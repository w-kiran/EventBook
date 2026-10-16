import axios from 'axios';

// All calls go to /api, which Next.js forwards to the Express backend
export const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // send the login cookie
});

// Turns any error into a message we can show to the user
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Cannot reach the server. It may be waking up, please try again in a moment.';
    }
    const apiError = error.response.data?.error;
    // for form errors, show the first field message (for example "Password must be at least 8 characters")
    return apiError?.details?.[0]?.message ?? apiError?.message ?? 'Something went wrong.';
  }
  return 'Something went wrong.';
}