import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The default 'online' mode pauses a query when a request can't reach the
      // server: status stays 'pending' forever, isError never flips, and refetch
      // waits for an online event that never arrives because the browser was
      // never offline — only our backend was. 'always' turns that into a normal
      // error the UI can show and retry.
      networkMode: 'always',
      // Three retries with backoff means ~7s before a failure is visible.
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
