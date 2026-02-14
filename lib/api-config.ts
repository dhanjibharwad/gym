// Add this to your API routes for better caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// For static data that doesn't change often, use:
// export const revalidate = 60; // Revalidate every 60 seconds
