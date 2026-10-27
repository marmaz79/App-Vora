import React, { useState } from 'react';
import { AppNotification, NotificationType } from '../types';
import {
  Bell,
  BellOff,
  X,
  Check,
  CheckCheck,
  Trash2,
  BookOpen,
  Volume2,
  FileText,
  Camera,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { TabType } from './Navbar';

interface NotificationsModalProps {
  notifications: AppNotification[];
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (id: string) => void;
  onClearAll: () => void;
  onResetSample: () => void;
  onNavigateTab?: (tab: TabType) => void;
}

type FilterCategory = 'all' | 'unread' | 'reading' | 'system';

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  notifications,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onClearAll,
  onResetSample,
  onNavigateTab,
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'unread') return !n.read;
    if (activeFilter === 'reading') return n.type === 'reading';
    if (activeFilter === 'system') return n.type === 'system' || n.type === 'update' || n.type === 'security';
    return true;
  });

  const formatRelativeTime = (isoString: string) => {
    try {
      const now = Date.now();
      const past = new Date(isoString).getTime();
      const diffMinutes = Math.floor((now - past) / (1000 * 60));

      if (diffMinutes < 1) return 'Adesso';
      if (diffMinutes < 60) return `${diffMinutes} min fa`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'ora' : 'ore'} fa`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Ieri';
      return `${diffDays} giorni fa`;
    } catch {
      return 'Recente';
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'reading':
        return <Volume2 size={16} className="text-[#5DADE2]" />;
      case 'update':
        return <FileText size={16} className="text-[#1E8C86]" />;
      case 'security':
        return <ShieldCheck size={16} className="text-[#27AE60]" />;
      case 'system':
      default:
        return <Camera size={16} className="text-[#EF6C4A]" />;
    }
  };

  const getNotificationTypeLabel = (type: NotificationType) => {
    switch (type) {
      case 'reading':
        return 'Lettura & Voce';
      case 'update':
        return 'Novità';
      case 'security':
        return 'Sicurezza';
      case 'system':
      default:
        return 'Sistema & OCR';
    }
  };

  const handleActionClick = (notification: AppNotification) => {
    onMarkAsRead(notification.id);
    if (notification.actionTab && onNavigateTab) {
      onNavigateTab(notification.actionTab);
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notifications-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4 animate-fade-in select-none font-sans"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border-2 border-[#2BA8A2]/30 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-card flex flex-col gap-4 text-slate-800 max-h-[90vh] overflow-hidden animate-slide-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-dashed border-[#2BA8A2]/20 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-2xl bg-[#E8F6F5] border-2 border-[#2BA8A2]/30 text-[#1E8C86] flex items-center justify-center shrink-0 shadow-xs">
              <Bell size={22} className="text-[#1E8C86]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#FFD23F] border border-[#1E8C86] text-[9px] font-black text-slate-900 shadow-accent-glow">
                  {unreadCount}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2
                  id="notifications-modal-title"
                  className="text-lg font-black text-[#1E8C86] leading-tight"
                >
                  Notifiche
                </h2>
                {unreadCount > 0 ? (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#FFF8E7] text-[#1E8C86] border border-[#FFD23F]">
                    {unreadCount} nuove
                  </span>
                ) : (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#E8F6F5] text-[#1E8C86] border border-[#2BA8A2]/30">
                    Tutte lette
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                Aggiornamenti sui libri, sintesi vocale e novità
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                aria-label="Segna tutte come lette"
                className="w-9 h-9 rounded-full bg-[#E8F6F5] text-[#1E8C86] hover:bg-[#2BA8A2]/20 border border-[#2BA8A2]/30 flex items-center justify-center transition-all active:scale-95"
                title="Segna tutte come lette"
              >
                <CheckCheck size={18} />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Chiudi notifiche"
              className="w-9 h-9 rounded-full bg-[#E8F6F5] text-[#1E8C86] hover:bg-[#2BA8A2]/20 border border-[#2BA8A2]/30 flex items-center justify-center transition-all active:scale-95"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all shrink-0 flex items-center gap-1.5 active:scale-95 ${
              activeFilter === 'all'
                ? 'bg-[#2BA8A2] text-white shadow-teal-glow'
                : 'bg-[#E8F6F5] text-[#1E8C86] hover:bg-[#3CC4BD]/20 border border-[#2BA8A2]/30'
            }`}
          >
            <span>Tutte</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeFilter === 'all' ? 'bg-[#1E8C86] text-white' : 'bg-white text-[#1E8C86] border border-[#2BA8A2]/30'
              }`}
            >
              {notifications.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('unread')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all shrink-0 flex items-center gap-1.5 active:scale-95 ${
              activeFilter === 'unread'
                ? 'bg-[#2BA8A2] text-white shadow-teal-glow'
                : 'bg-[#E8F6F5] text-[#1E8C86] hover:bg-[#3CC4BD]/20 border border-[#2BA8A2]/30'
            }`}
          >
            <span>Non lette</span>
            {unreadCount > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  activeFilter === 'unread' ? 'bg-[#FFD23F] text-slate-900' : 'bg-[#FFD23F] text-slate-900'
                }`}
              >
                {unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('reading')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all shrink-0 flex items-center gap-1.5 active:scale-95 ${
              activeFilter === 'reading'
                ? 'bg-[#2BA8A2] text-white shadow-teal-glow'
                : 'bg-[#E8F6F5] text-[#1E8C86] hover:bg-[#3CC4BD]/20 border border-[#2BA8A2]/30'
            }`}
          >
            <Volume2 size={13} />
            <span>Lettura</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('system')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all shrink-0 flex items-center gap-1.5 active:scale-95 ${
              activeFilter === 'system'
                ? 'bg-[#2BA8A2] text-white shadow-teal-glow'
                : 'bg-[#E8F6F5] text-[#1E8C86] hover:bg-[#3CC4BD]/20 border border-[#2BA8A2]/30'
            }`}
          >
            <Sparkles size={13} />
            <span>Sistema</span>
          </button>
        </div>

        {/* Notifications Scrollable List */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1 max-h-[50vh] sm:max-h-[55vh] select-text">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-3 my-auto">
              <div className="w-14 h-14 rounded-full bg-[#E8F6F5] border-2 border-[#2BA8A2]/30 flex items-center justify-center text-[#1E8C86]">
                <BellOff size={26} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">Nessuna notifica</h3>
                <p className="text-xs text-slate-500 font-medium mt-1 max-w-xs">
                  {activeFilter === 'unread'
                    ? 'Hai letto tutte le notifiche! Ottimo lavoro.'
                    : 'Non ci sono notifiche presenti per questa categoria.'}
                </p>
              </div>

              {notifications.length === 0 && (
                <button
                  type="button"
                  onClick={onResetSample}
                  className="mt-2 text-xs font-black text-[#1E8C86] hover:bg-[#2BA8A2]/20 bg-[#E8F6F5] border border-[#2BA8A2]/30 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <RotateCcw size={14} />
                  <span>Ripristina notifiche demo</span>
                </button>
              )}
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => onMarkAsRead(notif.id)}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative group flex flex-col gap-2.5 ${
                  notif.read
                    ? 'bg-white border-slate-200 border-l-[6px] border-l-slate-300 opacity-80 hover:opacity-100 hover:bg-[#FFF8E7]/30'
                    : 'bg-white border-[#2BA8A2]/30 border-l-[6px] border-l-[#2BA8A2] shadow-xs hover:border-[#2BA8A2]'
                }`}
              >
                {/* Header item: Icon, Badge, Time, Actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-xl bg-[#E8F6F5] border border-[#2BA8A2]/20 flex items-center justify-center shrink-0">
                      {getNotificationIcon(notif.type)}
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border bg-[#E8F6F5] border-[#2BA8A2]/30 text-[#1E8C86]">
                      {getNotificationTypeLabel(notif.type)}
                    </span>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-[#FFD23F] ring-2 ring-[#FFD23F]/30 shrink-0 shadow-accent-glow" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
                    <span className="text-[11px] font-semibold">
                      {formatRelativeTime(notif.timestamp)}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNotification(notif.id);
                      }}
                      aria-label="Elimina notifica"
                      className="w-6 h-6 rounded-md hover:bg-[#EF6C4A]/10 hover:text-[#EF6C4A] text-slate-400 flex items-center justify-center transition-colors"
                      title="Elimina"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-col gap-1 pl-1">
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-snug">
                    {notif.title}
                  </h4>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    {notif.message}
                  </p>
                </div>

                {/* Action CTA if present */}
                {notif.actionLabel && (
                  <div className="pt-1 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleActionClick(notif);
                      }}
                      className="text-xs font-black text-slate-900 bg-[#FFD23F] hover:bg-[#FFE47A] px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all shadow-accent-glow active:scale-95"
                    >
                      <span>{notif.actionLabel}</span>
                      <ArrowRight size={13} />
                    </button>

                    {!notif.read && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAsRead(notif.id);
                        }}
                        className="text-[11px] font-bold text-[#1E8C86] hover:underline flex items-center gap-1 transition-colors"
                      >
                        <Check size={13} />
                        <span>Segna come letta</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t-2 border-dashed border-[#2BA8A2]/20 text-xs text-slate-500">
          {notifications.length > 0 ? (
            <button
              type="button"
              onClick={onClearAll}
              className="text-slate-500 hover:text-[#EF6C4A] flex items-center gap-1.5 transition-colors font-bold py-1 px-1.5 rounded-lg active:scale-95"
            >
              <Trash2 size={14} />
              <span>Cancella tutte</span>
            </button>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={onClose}
            className="text-xs font-black text-[#1E8C86] bg-[#E8F6F5] hover:bg-[#2BA8A2]/20 border border-[#2BA8A2]/30 px-5 py-2 rounded-full transition-all active:scale-95"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
