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

async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${base}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    credentials: "include", // ⭐️ MUST for HttpOnly cookies
    cache: "no-store",
  });

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
  }) => {
    const url = `${base}/api/documents/upload`;

    const fd = new FormData();
    fd.append("file", data.file);
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

  enrichVehicle: (
    vehicleId: string,
    data?: { plate?: string; vin?: string; checks?: EnrichCheck[] },
  ) =>
    http<EnrichResponse>(`/api/vehicles/${vehicleId}/enrich`, {
      method: "POST",
      body: JSON.stringify(data ?? {}),
    }),
};
