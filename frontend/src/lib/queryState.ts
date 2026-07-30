/**
 * True when a query has nothing to show and won't get anything on its own.
 *
 * Checking `isError` alone is not enough: when a request cannot reach the
 * server, React Query parks the query as `paused` — status stays `pending`,
 * `isError` stays false, and `isLoading` goes false because nothing is in
 * flight. The page would then render its empty state forever and claim the user
 * has no data.
 */
export function queryHasNoData(status: string, fetchStatus: string): boolean {
  return status === 'error' || (status === 'pending' && fetchStatus === 'paused')
}
