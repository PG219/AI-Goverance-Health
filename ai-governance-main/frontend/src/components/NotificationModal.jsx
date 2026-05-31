import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";

export default function NotificationModal() {
  const [notification, setNotification] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleNotification = (event) => {
      const { type, title, message, duration = 4000 } = event.detail;
      setNotification({ type, title, message });
      setIsVisible(true);

      // Auto-hide after duration
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, duration);

      return () => clearTimeout(timer);
    };

    window.addEventListener("showNotification", handleNotification);

    return () => {
      window.removeEventListener("showNotification", handleNotification);
    };
  }, []);

  if (!notification) return null;

  const typeConfig = {
    success: {
      bg: "bg-emerald-50/90 border-emerald-500 text-emerald-900",
      icon: <CheckCircle2 className="w-6 h-6 text-emerald-600 animate-bounce" />,
      accent: "bg-emerald-600",
      glow: "shadow-emerald-100",
    },
    error: {
      bg: "bg-rose-50/90 border-rose-500 text-rose-900",
      icon: <XCircle className="w-6 h-6 text-rose-600 animate-shake" />,
      accent: "bg-rose-600",
      glow: "shadow-rose-100",
    },
    warning: {
      bg: "bg-amber-50/90 border-amber-500 text-amber-900",
      icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
      accent: "bg-amber-600",
      glow: "shadow-amber-100",
    },
    info: {
      bg: "bg-sky-50/90 border-sky-500 text-sky-900",
      icon: <Info className="w-6 h-6 text-sky-600" />,
      accent: "bg-sky-600",
      glow: "shadow-sky-100",
    },
  };

  const current = typeConfig[notification.type] || typeConfig.info;

  return (
    <div
      className={`fixed top-5 right-5 z-[9999] transition-all duration-500 transform ${
        isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-5 scale-95 pointer-events-none"
      }`}
    >
      <div
        className={`flex max-w-md w-[380px] border-l-4 rounded-2xl shadow-xl backdrop-blur-md p-5 border ${current.bg} ${current.glow}`}
      >
        <div className="flex items-start gap-4 flex-1">
          <div className="mt-0.5">{current.icon}</div>
          <div className="flex-1">
            <h4 className="font-bold text-sm text-gray-900 leading-tight">
              {notification.title || (notification.type === "success" ? "Success" : "Notification")}
            </h4>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">{notification.message}</p>
          </div>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-black/5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
