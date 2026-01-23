import { Obligation, Vehicle } from "@/lib/api";

export const store: {
  vehicles: Vehicle[];
  obligations: Obligation[];
} = {
  vehicles: [
    { id: "v1", plate: "CA1234AB", make: "VW", model: "Golf", status: "soon" },
    { id: "v2", plate: "PB9876CD", make: "BMW", model: "320d", status: "ok" },
  ],
  obligations: [
    {
      id: "o1",
      vehicleId: "v1",
      type: "Гражданска отговорност",
      dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
      status: "soon",
    },
    {
      id: "o2",
      vehicleId: "v1",
      type: "Технически преглед",
      dueDate: new Date(Date.now() + 20 * 86400000).toISOString(),
      status: "ok",
    },
    {
      id: "o3",
      vehicleId: "v2",
      type: "TAX",
      dueDate: new Date(Date.now() - 2 * 86400000).toISOString(),
      status: "overdue",
    },
  ],
};

export function computeStatus(dueDateISO: string): Vehicle["status"] {
  const due = new Date(dueDateISO).getTime();
  const now = Date.now();
  const diffDays = Math.ceil((due - now) / 86400000);

  if (diffDays < 0) return "overdue";
  if (diffDays <= 7) return "soon";
  return "ok";
}
