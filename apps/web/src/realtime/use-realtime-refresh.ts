import { useEffect, useState } from 'react';

import { useRealtime } from '../context/realtime-context';
import type { RealtimeEventType } from './realtime-socket';

/**
 * Returns a key that increments whenever the given realtime event arrives.
 * Add it to a fetch effect's dependency array to reload data on live updates.
 */
export function useRealtimeRefresh(type: RealtimeEventType): number {
  const { subscribe } = useRealtime();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    return subscribe(type, () => {
      setRefreshKey((key) => key + 1);
    });
  }, [subscribe, type]);

  return refreshKey;
}
