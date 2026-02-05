export async function verifyAuth() {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) throw new Error('Not authenticated');
    return await res.json();
  } catch (error) {
    throw new Error('Authentication failed');
  }
}