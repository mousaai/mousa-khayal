import { trpc } from "@/lib/trpc";
import "./i18n"; // initialize i18n before App renders
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  // Pass current page URL as returnPath so user returns to where they were after login
  window.location.href = getLoginUrl(window.location.href);
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

/**
 * Determine the correct API base URL.
 * 
 * The server always runs on mousa.ai (or the manus.space preview domain).
 * Sub-platform pages (fada.mousa.ai, raqaba.mousa.ai, etc.) must point their
 * API calls to the main server — NOT to their own subdomain which has no backend.
 * 
 * Rules:
 * - On mousa.ai / www.mousa.ai → use relative "/api/trpc" (same origin)
 * - On *.mousa.ai subdomains → use "https://mousa.ai/api/trpc" (cross-origin, with credentials)
 * - On *.manus.space preview → use relative "/api/trpc" (same origin)
 * - On localhost → use relative "/api/trpc"
 */
function getApiUrl(): string {
  if (typeof window === "undefined") return "/api/trpc";
  
  const hostname = window.location.hostname;
  
  // Sub-platform subdomains: point to main mousa.ai server
  const isSubPlatform = /^[a-z]+\.mousa\.ai$/.test(hostname) && 
    hostname !== "www.mousa.ai";
  
  if (isSubPlatform) {
    return "https://mousa.ai/api/trpc";
  }
  
  // All other cases (mousa.ai, manus.space, localhost): use relative URL
  return "/api/trpc";
}

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: getApiUrl(),
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
