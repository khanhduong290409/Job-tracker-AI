import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from './settings-api';
import type { NotificationPreferencesRequest } from '../types';

// Key hồ sơ user hiện tại — 1 entry duy nhất (không tham số vì luôn là "me").
const PROFILE_KEY = ['profile'] as const;

// ── Query ───────────────────────────────────────────────────────────────────

export function useProfile() {
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: () => settingsApi.getProfile(),
  });
}

// ── Mutation ──────────────────────────────────────────────────────────────────

// PUT trả về profile đã cập nhật → setQueryData ghi thẳng cache, khỏi refetch.
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: NotificationPreferencesRequest) =>
      settingsApi.updateNotificationPreferences(body),
    onSuccess: (updated) => {
      queryClient.setQueryData(PROFILE_KEY, updated);
    },
  });
}
