const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export type LeadInput = {
  name: string;
  email: string;
  phone: string;
  restaurantName?: string;
  city?: string;
  message?: string;
  type: 'sales';
};

/** Submit a sales enquiry to the backend (public, no auth). */
export async function submitLead(input: LeadInput): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/public/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    // Network-level failure (server unreachable, CORS, offline).
    throw new Error('Couldn’t reach the server. Please try again in a moment.');
  }
  if (!res.ok) {
    let message = 'Something went wrong. Please try again.';
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      if (body?.error?.message) message = body.error.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
}
