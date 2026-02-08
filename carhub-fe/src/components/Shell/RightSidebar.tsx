"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Trash2, CheckCheck, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { inboxApi, InboxItem } from "@/lib/api";

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString("bg-BG");
  } catch {
    return iso;
  }
}

export default function RightInbox() {
  const router = useRouter();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await inboxApi.list(30);
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 60000); // 60s
    return () => clearInterval(t);
  }, []);

  async function openItem(it: InboxItem) {
    try {
      await inboxApi.read(it.id);
    } catch {}
    if (it.href) router.push(it.href);
    else await load();
  }

  return (
    <div className="w-[340px] shrink-0 hidden xl:block mr-5">
      <Card className="bg-background/70 backdrop-blur">
        <CardHeader className="py-3 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <Bell className="w-4 h-4" />
            Известия
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={load}
              disabled={loading}
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                await inboxApi.readAll();
                await load();
              }}
              title="Маркирай всички прочетени"
            >
              <CheckCheck className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                await inboxApi.clear();
                await load();
              }}
              title="Изчисти"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="max-h-[70vh] overflow-auto p-3 space-y-2">
            {items.length === 0 && (
              <div className="text-sm text-muted-foreground p-2">
                Няма нови известия.
              </div>
            )}

            {items.map((it) => {
              const unread = !it.readAt;
              return (
                <div
                  key={it.id}
                  className={`rounded-xl border p-3 cursor-pointer bg-background/60 hover:bg-background/80 ${
                    unread ? "ring-1 ring-border" : ""
                  }`}
                  onClick={() => openItem(it)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div
                        className={`text-sm ${unread ? "font-semibold" : "font-medium"} truncate`}
                      >
                        {it.title}
                      </div>
                      {it.body && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {it.body}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-2">
                        {fmt(it.createdAt)}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await inboxApi.del(it.id);
                        await load();
                      }}
                      title="Изтрий"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
