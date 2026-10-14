import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Inbox,
  Mail,
  Send,
  Megaphone,
  MapPin,
  BarChart3,
  ShieldCheck,
  History,
  Sparkles,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const { user, logout, isAdmin } = useAuth();

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
      isActive
        ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
    }`;

  return (
    <aside className="w-64 bg-[#121429] text-slate-300 flex flex-col h-full border-r border-[#1e2240] select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-[#1e2240] gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-lg font-extrabold text-white tracking-tight flex items-center gap-1">
            Lead<span className="text-indigo-400">Nova</span>
          </span>
          <span className="block text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
            Sales & CRM
          </span>
        </div>
      </div>

      {/* Nav Links */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 custom-scrollbar">
        {/* MAIN Section */}
        <div>
          <p className="px-3 text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-2">
            MAIN
          </p>
          <nav className="space-y-1">
            <NavLink to="/dashboard" className={navItemClass} onClick={onCloseMobile}>
              <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
              <span>Dashboard</span>
            </NavLink>
          </nav>
        </div>

        {/* SALES Section */}
        <div className="pt-2 border-t border-[#1e2240]/60">
          <p className="px-3 text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-2">
            SALES
          </p>
          <nav className="space-y-1">
            <NavLink to="/email-leads" className={navItemClass} onClick={onCloseMobile}>
              <Mail className="w-4 h-4 flex-shrink-0" />
              <span>Email Leads</span>
            </NavLink>
            <NavLink to="/customers" className={navItemClass} onClick={onCloseMobile}>
              <Users className="w-4 h-4 flex-shrink-0" />
              <span>Customers</span>
            </NavLink>
            <NavLink to="/enquiries" className={navItemClass} onClick={onCloseMobile}>
              <Inbox className="w-4 h-4 flex-shrink-0" />
              <span>Enquiry Logbook</span>
            </NavLink>
          </nav>
        </div>

        {/* COMMUNICATION Section */}
        <div className="pt-2 border-t border-[#1e2240]/60">
          <p className="px-3 text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-2">
            COMMUNICATION
          </p>
          <nav className="space-y-1">
            <NavLink to="/emails" className={navItemClass} onClick={onCloseMobile}>
              <Send className="w-4 h-4 flex-shrink-0" />
              <span>Emails & Templates</span>
            </NavLink>
          </nav>
        </div>

        {/* MARKETING Section */}
        <div className="pt-2 border-t border-[#1e2240]/60">
          <p className="px-3 text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-2">
            MARKETING
          </p>
          <nav className="space-y-1">
            <NavLink to="/campaigns" className={navItemClass} onClick={onCloseMobile}>
              <Megaphone className="w-4 h-4 flex-shrink-0" />
              <span>Campaigns</span>
            </NavLink>
          </nav>
        </div>

        {/* INSIGHTS & GOVERNANCE Section */}
        <div className="pt-2 border-t border-[#1e2240]/60">
          <p className="px-3 text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-2">
            INSIGHTS & GOVERNANCE
          </p>
          <nav className="space-y-1">
            <NavLink to="/analytics" className={navItemClass} onClick={onCloseMobile}>
              <BarChart3 className="w-4 h-4 flex-shrink-0" />
              <span>Analytics & Reports</span>
            </NavLink>
            {isAdmin && (
              <>
                <NavLink to="/users" className={navItemClass} onClick={onCloseMobile}>
                  <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                  <span>User Management</span>
                </NavLink>
                <NavLink to="/activity-logs" className={navItemClass} onClick={onCloseMobile}>
                  <History className="w-4 h-4 flex-shrink-0" />
                  <span>Activity Logs</span>
                </NavLink>
              </>
            )}
            <NavLink to="/territories" className={navItemClass} onClick={onCloseMobile}>
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span>Territories</span>
            </NavLink>
          </nav>
        </div>
      </div>

      {/* User Footer Card */}
      <div className="p-4 border-t border-[#1e2240] bg-[#0d0f1f]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
