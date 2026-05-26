# 06. Frontend Specification

## Tech Stack

- **Framework**: React 18 with TypeScript (strict mode)
- **Build**: Vite 5+
- **Styling**: TailwindCSS 3.4+
- **Component Library**: shadcn/ui (copy components into project, full control)
- **State Management**:
  - Server state: TanStack Query (React Query) v5
  - Client state: Zustand (simpler than Redux, perfect cho scope này)
  - Form state: React Hook Form + Zod validation
- **Routing**: React Router v6
- **HTTP Client**: Axios với interceptors
- **Charts**: Recharts
- **Date**: date-fns
- **Icons**: lucide-react
- **WebSocket**: native WebSocket API hoặc socket.io-client

## Project Structure

```
frontend/
├── public/
├── src/
│   ├── main.tsx                  # entry point
│   ├── App.tsx                   # root component, providers
│   ├── routes.tsx                # routing config
│   │
│   ├── features/                 # feature modules
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── api/
│   │   │   ├── store/
│   │   │   ├── types.ts
│   │   │   └── pages/
│   │   ├── cv/
│   │   ├── applications/
│   │   ├── ai-analysis/
│   │   ├── email/
│   │   ├── reminders/
│   │   ├── notifications/
│   │   └── analytics/
│   │
│   ├── components/               # shared components
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── layout/               # Layout, Header, Sidebar
│   │   └── common/               # ErrorBoundary, LoadingSpinner, etc.
│   │
│   ├── lib/                      # utilities
│   │   ├── api/                  # axios instance, interceptors
│   │   ├── auth/                 # token management
│   │   ├── utils.ts              # cn, formatters
│   │   └── constants.ts
│   │
│   ├── hooks/                    # shared hooks
│   │   ├── useDebounce.ts
│   │   ├── useLocalStorage.ts
│   │   └── ...
│   │
│   ├── types/                    # global types
│   │   ├── api.ts
│   │   └── common.ts
│   │
│   ├── styles/
│   │   └── globals.css           # Tailwind directives
│   │
│   └── config/
│       └── env.ts                # validated env vars
│
├── .env.example
├── index.html
├── tsconfig.json
├── tailwind.config.ts
├── vite.config.ts
└── package.json
```

## TypeScript Configuration

`tsconfig.json` highlights:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## State Management Strategy

### Server State (TanStack Query)
Mọi data từ backend → React Query.

Pattern:
```typescript
// features/applications/api/queries.ts
export const applicationQueries = {
  all: () => ['applications'] as const,
  lists: () => [...applicationQueries.all(), 'list'] as const,
  list: (filters: ApplicationFilters) => 
    [...applicationQueries.lists(), filters] as const,
  details: () => [...applicationQueries.all(), 'detail'] as const,
  detail: (id: number) => [...applicationQueries.details(), id] as const,
};

export function useApplications(filters: ApplicationFilters) {
  return useQuery({
    queryKey: applicationQueries.list(filters),
    queryFn: () => applicationApi.list(filters),
    staleTime: 30_000,
  });
}

export function useApplication(id: number) {
  return useQuery({
    queryKey: applicationQueries.detail(id),
    queryFn: () => applicationApi.get(id),
    enabled: !!id,
  });
}

export function useCreateApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: applicationApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationQueries.lists() });
    },
  });
}
```

### Client State (Zustand)
Chỉ cho global UI state: theme, sidebar open/close, auth user info.

```typescript
// features/auth/store/auth-store.ts
interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  setAuth: (user, accessToken) => 
    set({ user, accessToken, isAuthenticated: true }),
  clearAuth: () => 
    set({ user: null, accessToken: null, isAuthenticated: false }),
}));
```

### Form State (React Hook Form + Zod)
```typescript
const applicationSchema = z.object({
  companyName: z.string().min(1, "Required").max(255),
  position: z.string().min(1, "Required").max(255),
  jdContent: z.string().min(10, "Min 10 chars").max(50000),
  // ...
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

function ApplicationForm() {
  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
  });
  // ...
}
```

## Routing

```typescript
// routes.tsx
const routes: RouteObject[] = [
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'auth/callback', element: <AuthCallbackPage /> },
    ],
  },
  {
    path: '/app',
    element: <ProtectedLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'applications', element: <ApplicationsListPage /> },
      { path: 'applications/new', element: <CreateApplicationPage /> },
      { path: 'applications/:id', element: <ApplicationDetailPage /> },
      { path: 'cvs', element: <CvListPage /> },
      { path: 'cvs/:id', element: <CvDetailPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
];
```

`<ProtectedLayout>`:
- Check authenticated
- Redirect to /login if not
- Render Sidebar + Header + Outlet

## API Client

```typescript
// lib/api/axios.ts
import axios from 'axios';
import { useAuthStore } from '@/features/auth/store/auth-store';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30_000,
});

// Request interceptor: attach token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 with refresh
let refreshPromise: Promise<string> | null = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        refreshPromise = refreshPromise || refreshAccessToken();
        const newToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        refreshPromise = null;
      }
    }
    
    return Promise.reject(error);
  }
);
```

## UI/UX Design

### Design System
- Color palette: dùng default Tailwind hoặc define custom in `tailwind.config.ts`
- Primary: indigo-600 (action buttons, links)
- Success: green-600
- Warning: yellow-500
- Error: red-600
- Neutral: gray scale
- Typography: Inter font, 4 sizes max (xs, sm, base, lg)

### Layout
- Sidebar collapsible (icon-only when collapsed)
- Top header with: search, notifications dropdown, user menu
- Main content area with padding
- Mobile: bottom nav bar thay vì sidebar

### Loading States
- Skeleton loaders cho list/detail (not spinners)
- Optimistic updates với React Query

### Error States
- Toast notification cho action errors
- Inline error cho form validation
- Empty state với illustration + CTA
- Error boundary cho crashes

### Accessibility
- All interactive elements: keyboard accessible
- Focus visible ring
- Aria labels cho icon-only buttons
- Color contrast WCAG AA min

## Pages

### Dashboard (`/app`)
- Overview cards: total apps, active, offers, response time
- Funnel chart
- Recent activity timeline
- Upcoming reminders
- Quick action: create application

### Applications List (`/app/applications`)
- Tabs: List view | Kanban view
- Filters: status, source, date range
- Search bar (debounced 300ms)
- Sort options
- Bulk actions (advanced)
- Pagination

### Application Detail (`/app/applications/:id`)
- Header: company logo, position, status badge, actions
- Tabs:
  - Overview: basic info, JD, contact
  - AI Analysis: match score, suggestions, JD insights
  - Timeline: events chronologically
  - Files: attachments
  - Emails: thread list
  - Notes: rich text editor

### Create Application (`/app/applications/new`)
- Step 1: Paste JD URL or text, AI extract preview
- Step 2: Edit extracted fields
- Step 3: Select CV version
- Step 4: Confirm và create

### CV Management (`/app/cvs`)
- Grid view: thumbnail + label + status
- Upload button (drag & drop area)
- Detail: PDF preview side-by-side with parsed data (editable)

### Analytics (`/app/analytics`)
- Date range selector
- Charts grid: funnel, time series, sources, tech stack
- Activity heatmap

### Settings (`/app/settings`)
- Profile (name, avatar)
- Gmail integration (connect/disconnect)
- Notification preferences
- Email templates (CRUD)
- Account (delete account button với confirm)

## Performance

- Code splitting: route-based với React.lazy
- Image lazy loading
- Debounce search inputs
- React Query stale time + cache time tuning
- Memo expensive components

## Environment Variables

```
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_GOOGLE_CLIENT_ID=
VITE_WS_BASE_URL=ws://localhost:8080/ws
```

Validate at startup:
```typescript
// config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_GOOGLE_CLIENT_ID: z.string().min(1),
  VITE_WS_BASE_URL: z.string(),
});

export const env = envSchema.parse(import.meta.env);
```
