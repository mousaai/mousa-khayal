/*
 * ErrorBoundary — يلتقط أخطاء React ويرسلها تلقائياً للخادم
 * ويعرض للمستخدم واجهة احترافية مع خيار الإبلاغ اليدوي
 */
import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";

interface Props {
  children: ReactNode;
  platform?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  reported: boolean;
  reporting: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, reported: false, reporting: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // إرسال تقرير الخطأ تلقائياً
    this.reportError(error, errorInfo, false);
  }

  private async reportError(error: Error, errorInfo: ErrorInfo | null, manual: boolean) {
    try {
      this.setState({ reporting: true });
      await fetch("/api/trpc/errors.report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          "0": {
            json: {
              platform: this.props.platform ?? "general",
              errorType: "ui",
              errorMessage: error.message?.substring(0, 2000),
              userDescription: manual ? "تقرير يدوي من المستخدم" : "خطأ تلقائي في React",
              pageUrl: window.location.pathname,
              stackTrace: (error.stack ?? "").substring(0, 5000),
              metadata: {
                componentStack: errorInfo?.componentStack?.substring(0, 2000),
                userAgent: navigator.userAgent.substring(0, 100),
                timestamp: new Date().toISOString(),
                manual,
              },
            },
          },
        }),
      });
      if (manual) this.setState({ reported: true });
    } catch {
      // Silently ignore
    } finally {
      this.setState({ reporting: false });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        dir="rtl"
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: "#080E1A" }}
      >
        <div
          className="max-w-md w-full rounded-2xl p-8 text-center"
          style={{
            background: "rgba(13,27,42,0.8)",
            border: "1px solid rgba(212,160,23,0.15)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Icon */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <AlertTriangle size={32} style={{ color: "#ef4444" }} />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold mb-2" style={{ color: "#e2e8f0" }}>
            حدث خطأ غير متوقع
          </h2>
          <p className="text-sm mb-6" style={{ color: "#64748b", lineHeight: 1.7 }}>
            نأسف على هذا الإزعاج. تم إرسال تقرير الخطأ تلقائياً لفريقنا.
            يمكنك المحاولة مجدداً أو العودة للصفحة الرئيسية.
          </p>

          {/* Error details (collapsed) */}
          {this.state.error && (
            <details className="text-right mb-6">
              <summary
                className="text-xs cursor-pointer mb-2"
                style={{ color: "#475569" }}
              >
                تفاصيل الخطأ التقنية
              </summary>
              <div
                className="p-3 rounded-lg text-xs text-left overflow-auto max-h-32"
                style={{
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  color: "#ef4444",
                  fontFamily: "monospace",
                }}
              >
                {this.state.error.message}
              </div>
            </details>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-semibold transition-all hover:opacity-90"
              style={{ background: "#d4a017", color: "#080e1a" }}
            >
              <RefreshCw size={16} />
              إعادة المحاولة
            </button>

            <button
              onClick={() => window.location.href = "/"}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-semibold transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#94a3b8",
              }}
            >
              <Home size={16} />
              الصفحة الرئيسية
            </button>

            {!this.state.reported && (
              <button
                onClick={() => this.state.error && this.reportError(this.state.error, this.state.errorInfo, true)}
                disabled={this.state.reporting || this.state.reported}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-sm transition-all"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(212,160,23,0.15)",
                  color: "#64748b",
                }}
              >
                <Bug size={14} />
                {this.state.reporting ? "جارٍ الإرسال..." : "إرسال تقرير مفصل"}
              </button>
            )}
            {this.state.reported && (
              <p className="text-xs" style={{ color: "#22c55e" }}>
                ✓ تم إرسال التقرير — شكراً لمساعدتنا
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
