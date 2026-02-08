// src/lib/api.ts
// Един файл за всички заявки (Auth + Vehicles + Obligations)
// Cookie-based auth (HttpOnly): credentials: "include"
// Работи с Nest ако има CORS credentials + cookie-parser
//
// NEXT_PUBLIC_API_BASE пример:
//   http://localhost:4000
// Ако в Nest имаш глобален префикс "api", тогава пътищата "/api/..." са ОК.
// Ако НЯМАШ префикс, махни "/api" отпред от всички пътища по-долу.

export type VehicleStatus = "ok" | "soon" | "overdue";

export type Vehicle = {
  id: string;
  plate: string;
  make: string;
  model: string;
  status: VehicleStatus;
};
export type DocumentCategory =
  | "GO"
  | "GTP"
  | "VIGNETTE"
  | "TAX"
  | "SERVICE"
  | "CREDIT"
  | "OTHER";

export type ObligationType =
  | "Гражданска отговорност"
  | "Технически преглед"
  | "TAX"
  | "Винетка";

export type Obligation = {
  id: string;
  vehicleId: string;
  type: ObligationType;
  dueDate: string; // ISO
  status: VehicleStatus;
};

export type EnrichCheck =
  | "Винетка"
  | "Гражданска отговорност"
  | "Технически преглед";

export type EnrichResult = {
  check: EnrichCheck;
  status: "ok" | "not_found" | "needs_user" | "failed" | "cached";
  validUntil?: string;
  message?: string;

  challengeId?: string;
  captchaImageBase64?: string;
};

export type EnrichResponse = {
  vehicleId: string;
  results: EnrichResult[];
};
export type NotificationSettings = {
  emailEnabled: boolean;
  smsEnabled: boolean;
  email?: string | null;
  phone?: string | null;
  daysBefore: number[];
};
export type InboxItem = {
  id: string;
  type: "reminder" | "system" | "activity";
  title: string;
  body?: string | null;
  href?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export const inboxApi = {
  list: (take = 20) => http<InboxItem[]>(`/api/inbox?take=${take}`),
  unreadCount: () => http<{ count: number }>(`/api/inbox/unread-count`),
  read: (id: string) => http(`/api/inbox/${id}/read`, { method: "POST" }),
  readAll: () => http(`/api/inbox/read-all`, { method: "POST" }),
  del: (id: string) => http(`/api/inbox/${id}/delete`, { method: "POST" }),
  clear: () => http(`/api/inbox/clear`, { method: "POST" }),
};

export const notificationsApi = {
  get: () => http<NotificationSettings>("/api/notifications/settings"),
  update: (data: Partial<NotificationSettings>) =>
    http<NotificationSettings>("/api/notifications/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

export const historyApi = {
  list: (params?: {
    vehicleId?: string;
    kind?: string;
    q?: string;
    take?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.vehicleId) qs.set("vehicleId", params.vehicleId);
    if (params?.kind) qs.set("kind", params.kind);
    if (params?.q) qs.set("q", params.q);
    if (params?.take) qs.set("take", String(params.take));

    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return http<HistoryEvent[]>(`/api/history${suffix}`);
  },
};

// ✅ base URL
const API_BASE_RAW = process.env.NEXT_PUBLIC_API_BASE?.trim();
const base = API_BASE_RAW ? API_BASE_RAW.replace(/\/$/, "") : "";

// ✅ Helper: parse error body nicely
async function readError(res: Response) {
  const ct = res.headers.get("content-type") || "";
  const txt = await res.text().catch(() => "");
  if (!txt) return res.statusText;

  // ако е JSON – покажи message ако има
  if (ct.includes("application/json")) {
    try {
      const j = JSON.parse(txt);
      return j?.message ? String(j.message) : txt;
    } catch {
      return txt;
    }
  }

  return txt;
}

let refreshing: Promise<void> | null = null;

async function doRefresh() {
  const url = `${base}/api/auth/refresh`;
  const res = await fetch(url, { method: "POST", credentials: "include" });

  if (!res.ok) throw new Error("refresh failed");
}

async function http<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const url = `${base}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(init.headers ?? {}),
    },
    credentials: "include",
    cache: "no-store",
  });

  // ✅ ако е 401 → опитай refresh 1 път → retry
  if (res.status === 401 && retry) {
    try {
      if (!refreshing) {
        refreshing = doRefresh().finally(() => (refreshing = null));
      }
      await refreshing;
      return http<T>(path, init, false);
    } catch {
      // ако refresh fail → logout и хвърляй
      try {
        await fetch(`${base}/api/auth/logout`, {
          method: "POST",
          credentials: "include",
        });
      } catch {}
      throw new Error("HTTP 401: session expired");
    }
  }

  if (!res.ok) {
    const msg = await readError(res);
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const integrations = {
  goStart: (plate: string, vin?: string) =>
    http<{
      status: string;
      challengeId?: string;
      captchaImageBase64?: string;
      message?: string;
    }>("/api/integrations/go/start", {
      method: "POST",
      body: JSON.stringify({ plate, vin }),
    }),

  goSolve: (challengeId: string, code: string) =>
    http<{ status: string; validUntil?: string; message?: string }>(
      "/api/integrations/go/solve",
      { method: "POST", body: JSON.stringify({ challengeId, code }) },
    ),

  gtpStart: (plate: string) =>
    http<{
      status: string;
      challengeId?: string;
      captchaImageBase64?: string;
      message?: string;
    }>("/api/integrations/gtp/start", {
      method: "POST",
      body: JSON.stringify({ plate }),
    }),

  // ⚠️ твоят solve приема vehicleId + challengeId + code — оставям го както е при теб
  gtpSolve: (vehicleId: string, challengeId: string, code: string) =>
    http<
      | { status: "ok"; validUntil: string }
      | { status: "not_found"; message: string }
      | { status: "failed"; message: string }
    >("/api/integrations/gtp/solve", {
      method: "POST",
      body: JSON.stringify({ vehicleId, challengeId, code }),
    }),
};
export type DocumentRow = {
  id: string;
  userId: string;

  vehicleId?: string | null;
  obligationId?: string | null;

  category: DocumentCategory;

  // ако бекендът връща populate-нато задължение (препоръчително)
  obligation?: {
    id: string;
    type: ObligationType;
    dueDate: string;
  } | null;

  name: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  createdAt: string;
};

export const docsApi = {
  list: () => http<DocumentRow[]>("/api/documents"),
  listByVehicle: (vehicleId: string) =>
    http<DocumentRow[]>(`/api/documents/vehicle/${vehicleId}`),
  listByObligation: (obligationId: string) =>
    http<DocumentRow[]>(`/api/documents/obligation/${obligationId}`),

  upload: async (data: {
    file: File;
    vehicleId?: string;
    obligationId?: string;
    category: DocumentCategory;
  }) => {
    const url = `${base}/api/documents/upload`;

    const fd = new FormData();
    fd.append("file", data.file);
    fd.append("category", data.category);
    if (data.vehicleId) fd.append("vehicleId", data.vehicleId);
    if (data.obligationId) fd.append("obligationId", data.obligationId);

    const res = await fetch(url, {
      method: "POST",
      body: fd,
      credentials: "include",
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${t || res.statusText}`);
    }
    return (await res.json()) as DocumentRow;
  },
  delete: (id: string) =>
    http<{ ok: true }>(`/api/documents/${id}`, {
      method: "DELETE",
    }),
  downloadUrl: (id: string) => `${base}/api/documents/${id}/download`,
};

export const auth = {
  register: (email: string, password: string) =>
    http<{ id: string; email: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  // ✅ login: вече НЕ връщаме accessToken, а разчитаме на cookies
  login: async (email: string, password: string) => {
    return http<{ ok: true }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
  },
  verifyEmail: (token: string) =>
    http<{ ok: true }>(`/api/auth/verify-email`, {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  // ✅ кой е логнат (за Navbar / guards)
  me: () =>
    http<{ userId: string }>("/api/auth/me", {
      method: "GET",
    }),

  // ✅ чисти cookies от бекенда
  logout: () =>
    http<{ ok: true }>("/api/auth/logout", {
      method: "POST",
    }),

  resendVerifyEmail: () =>
    http<{ ok: true }>(`/api/auth/resend-verify-email`, { method: "POST" }),
};

export const api = {
  // Vehicles
  listVehicles: () => http<Vehicle[]>("/api/vehicles"),
  getVehicle: (id: string) => http<Vehicle>(`/api/vehicles/${id}`),

  createVehicle: (data: Pick<Vehicle, "plate" | "make" | "model">) =>
    http<Vehicle>("/api/vehicles", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateVehicle: (
    id: string,
    data: Partial<Pick<Vehicle, "plate" | "make" | "model">>,
  ) =>
    http<Vehicle>(`/api/vehicles/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteVehicle: (id: string) =>
    http<{ status: "ok" }>(`/api/vehicles/${id}`, { method: "DELETE" }),

  // Obligations
  listObligations: (vehicleId: string) =>
    http<Obligation[]>(`/api/vehicles/${vehicleId}/obligations`),

  createObligation: (
    vehicleId: string,
    data: Pick<Obligation, "type" | "dueDate">,
  ) =>
    http<Obligation>(`/api/vehicles/${vehicleId}/obligations`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  // Obligations (upsert – 1 per type)
  upsertObligation: (
    vehicleId: string,
    type: string,
    data: { dueDate: string },
  ) =>
    http<Obligation>(`/api/vehicles/${vehicleId}/obligations/${type}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteObligation: (vehicleId: string, type: string) =>
    http<{ status: "ok" }>(`/api/vehicles/${vehicleId}/obligations/${type}`, {
      method: "DELETE",
    }),

  enrichVehicle: (
    vehicleId: string,
    data?: { plate?: string; vin?: string; checks?: EnrichCheck[] },
  ) =>
    http<EnrichResponse>(`/api/vehicles/${vehicleId}/enrich`, {
      method: "POST",
      body: JSON.stringify(data ?? {}),
    }),
};
