export const environment = {
  production: true,
  environmentName: 'production',
  // Uses the same-origin SSR reverse proxy (/backend-api) so HttpOnly SameSite=Lax
  // cookies work first-party without relying on cross-site cookies across onrender.com
  apiUrl: '/backend-api',
  ssrApiUrl: 'https://psigestor-api.onrender.com',
};
