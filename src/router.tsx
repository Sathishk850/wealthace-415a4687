import { QueryCache, MutationCache, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { isAuthError, triggerSessionExpired } from "./lib/session-expired";

export const getRouter = () => {
  const onError = (err: unknown) => {
    if (isAuthError(err)) triggerSessionExpired();
  };
  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({
      onError,
      // Global data refresh: the database is the single source of truth, so any
      // successful mutation (create/update/delete/import/buy/sell/bulk action)
      // invalidates every cached query across all modules.
      onSuccess: () => {
        queryClient.invalidateQueries();
      },
    }),
  });


  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
