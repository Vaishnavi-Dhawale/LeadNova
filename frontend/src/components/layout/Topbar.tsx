import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, User as UserIcon, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { RoleBadge } from '../common/Badge';

interface TopbarProps {
  onOpenMobileMenu: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenMobileMenu }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Derive breadcrumb / title
  const getPageTitle = (path: string) => {
    if (path.startsWith('/dashboard')) return 'Dashboard Overview';
    if (path.startsWith('/customers/')) return 'Customer Profile';
    if (path.startsWith('/customers')) return 'Customer Directory';
    if (path.startsWith('/enquiries/')) return 'Enquiry Detail';
    if (path.startsWith('/enquiries')) return 'Enquiry Logbook';
    if (path.startsWith('/follow-ups')) return 'Follow-up Schedule';
    if (path.startsWith('/email-leads/')) return 'Email Lead Review';
    if (path.startsWith('/email-leads')) return 'Email Leads Inbox';
    if (path.startsWith('/emails')) return 'Emails & Templates';
    if (path.startsWith('/campaigns')) return 'Marketing Campaigns';
    if (path.startsWith('/categories')) return 'Product Categories';
    if (path.startsWith('/territories')) return 'Sales Territories';
    if (path.startsWith('/documents')) return 'Document Repository';
    if (path.startsWith('/analytics')) return 'Sales Analytics & Reports';
    if (path.startsWith('/users')) return 'User Administration';
    if (path.startsWith('/activity-logs')) return 'System Activity Logs';
    return 'LeadNova CRM';
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 shadow-xs">
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Title */}
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
            {getPageTitle(location.pathname)}
          </h1>
          <p className="hidden sm:block text-xs text-slate-400">
            Intelligent Enquiry Tracking & Sales Pipeline
          </p>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Role Badge */}
        {user?.role && (
          <div className="hidden md:block">
            <RoleBadge role={user.role} />
          </div>
        )}



        {/* User avatar and dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 p-1 rounded-full hover:bg-slate-100 transition"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="hidden sm:block text-xs font-semibold text-slate-700">
              {user?.name}
            </span>
          </button>

          {showProfileMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowProfileMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-scale-up">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                  <div className="mt-1.5">
                    <RoleBadge role={user?.role || ''} />
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
