/**
 * NotificationBell.tsx — جرس التنبيهات الداخلي
 *
 * يعرض عدد التنبيهات غير المقروءة كـ badge أحمر
 * عند الضغط تظهر قائمة منسدلة بآخر 50 تنبيه
 * مستقل 100% عن مانوس
 */
import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/components/AuthGate";

interface NotificationItem {
  id: number;
  title: string;
  content: string;
  type: "info" | "success" | "warning" | "error";
  isRead: number;
  createdAt: Date;
}

const TYPE_COLORS = {
  info: "#60a5fa",
  success: "#4ade80",
  warning: "#fbbf24",
  error: "#f87171",
};

const TYPE_ICONS = {
  info: "ℹ️",
  success: "✅",
  warning: "⚠️",
  error: "❌",
};

function timeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${days} يوم`;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // جلب عدد التنبيهات غير المقروءة (كل 30 ثانية)
  const { data: countData, refetch: refetchCount } = trpc.notifications.getUnreadCount.useQuery(
    undefined,
    {
      refetchInterval: 30000,
      retry: false,
      // فقط للمستخدمين المسجلين (ليس الزوار)
      enabled: !!user && user.openId !== "guest",
    }
  );

  // جلب التنبيهات عند فتح القائمة
  const { data: notifData, refetch: refetchAll } = trpc.notifications.getAll.useQuery(
    undefined,
    {
      enabled: open && !!user && user.openId !== "guest",
      retry: false,
    }
  );

  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => { refetchCount(); refetchAll(); },
  });

  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => { refetchCount(); refetchAll(); },
  });

  const unreadCount = countData?.count ?? 0;
  const notifications = (notifData ?? []) as NotificationItem[];

  // إغلاق القائمة عند الضغط خارجها
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // لا تُعرض للزوار
  if (!user || user.openId === "guest") return null;

  return (
    <div ref={panelRef} style={{ position: "relative" }}>
      {/* زر الجرس */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          borderRadius: 10,
          background: open ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.06)",
          border: `1px solid ${open ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.1)"}`,
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
        title="التنبيهات"
      >
        {/* أيقونة الجرس */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={open ? "#a78bfa" : "rgba(255,255,255,0.6)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {/* Badge عدد التنبيهات */}
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              background: "#ef4444",
              color: "#fff",
              fontSize: 10,
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 3px",
              border: "1.5px solid #080E1A",
              fontFamily: "monospace",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* القائمة المنسدلة */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: 44,
            right: 0,
            width: 340,
            maxHeight: 480,
            borderRadius: 14,
            background: "rgba(12,16,28,0.97)",
            border: "1px solid rgba(139,92,246,0.2)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
            backdropFilter: "blur(20px)",
            zIndex: 1000,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
          dir="rtl"
        >
          {/* رأس القائمة */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: "1px solid rgba(139,92,246,0.1)",
            }}
          >
            <span style={{ color: "rgba(196,181,253,0.9)", fontWeight: "bold", fontSize: 13, fontFamily: "'Tajawal', sans-serif" }}>
              التنبيهات {unreadCount > 0 && <span style={{ color: "#ef4444", fontSize: 11 }}>({unreadCount} جديد)</span>}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                style={{
                  background: "none",
                  border: "none",
                  color: "#a78bfa",
                  fontSize: 11,
                  cursor: "pointer",
                  fontFamily: "'Tajawal', sans-serif",
                  padding: "2px 6px",
                  borderRadius: 6,
                  transition: "background 0.2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(139,92,246,0.15)")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}
              >
                تعليم الكل كمقروء
              </button>
            )}
          </div>

          {/* قائمة التنبيهات */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "40px 20px",
                  color: "rgba(148,163,184,0.4)",
                  fontFamily: "'Tajawal', sans-serif",
                  fontSize: 13,
                  gap: 8,
                }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.4}>
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                لا توجد تنبيهات
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (!notif.isRead) markReadMutation.mutate({ id: notif.id });
                  }}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: notif.isRead ? "transparent" : "rgba(139,92,246,0.05)",
                    cursor: notif.isRead ? "default" : "pointer",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={e => {
                    if (!notif.isRead) (e.currentTarget as HTMLDivElement).style.background = "rgba(139,92,246,0.1)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.background = notif.isRead ? "transparent" : "rgba(139,92,246,0.05)";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    {/* أيقونة النوع */}
                    <span style={{ fontSize: 14, marginTop: 1, flexShrink: 0 }}>
                      {TYPE_ICONS[notif.type] ?? "ℹ️"}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <span
                          style={{
                            color: notif.isRead ? "rgba(255,255,255,0.7)" : "#fff",
                            fontWeight: notif.isRead ? "normal" : "bold",
                            fontSize: 12,
                            fontFamily: "'Tajawal', sans-serif",
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {notif.title}
                        </span>
                        {!notif.isRead && (
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: TYPE_COLORS[notif.type] ?? "#60a5fa", flexShrink: 0 }} />
                        )}
                      </div>
                      <p
                        style={{
                          color: "rgba(148,163,184,0.7)",
                          fontSize: 11,
                          fontFamily: "'Tajawal', sans-serif",
                          margin: 0,
                          lineHeight: 1.5,
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {notif.content}
                      </p>
                      <span style={{ color: "rgba(148,163,184,0.35)", fontSize: 10, fontFamily: "'Tajawal', sans-serif", marginTop: 4, display: "block" }}>
                        {timeAgo(notif.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
