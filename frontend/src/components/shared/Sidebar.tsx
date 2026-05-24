import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  Upload,
  GitBranch,
  GitFork,
  Download,
  Users,
  Activity,
  ChevronsUpDown,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { cn } from '../../lib/utils';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
}

const STUDENT_NAV: NavItem[] = [
  { to: '/setup',       icon: <LayoutGrid size={17} />, label: 'Dashboard',    end: true },
  { to: '/artifacts',   icon: <Upload     size={17} />, label: 'Artifacts',    end: true },
  { to: '/matrix',      icon: <GitBranch  size={17} />, label: 'Audit',        end: true },
  { to: '/diagnostics', icon: <GitFork    size={17} />, label: 'Gap Analysis', end: true },
  { to: '/export',      icon: <Download   size={17} />, label: 'Export',       end: true },
];

const FACULTY_NAV: NavItem[] = [
  { to: '/faculty', icon: <Users    size={17} />, label: 'My Groups', end: true },
  { to: '/export',  icon: <Download size={17} />, label: 'Export',    end: true },
];

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const navItems = user?.role === 'FACULTY' ? FACULTY_NAV : STUDENT_NAV;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name?.charAt(0).toUpperCase() ?? '?';

  return (
    <aside
      className="flex flex-col w-64 h-screen shrink-0 overflow-hidden sticky top-0"
      style={{
        background: 'linear-gradient(180deg, #0f2044 0%, #162d5a 100%)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.25)',
        color: 'white',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <div className="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
          <Activity size={17} className="text-amber-900" />
        </div>
        <div>
          <p className="text-[15px] font-bold text-white leading-tight tracking-tight">SyncTrace</p>
          <p className="text-[11px] text-white/40 mt-0.5">Academic Audit</p>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-white/[0.08] mb-5" />

      {/* Navigation */}
      <div className="px-3 flex-1">
        <p className="text-[10px] font-semibold text-white/30 uppercase tracking-[0.14em] px-3 mb-2">
          Navigation
        </p>
        <nav className="space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-colors duration-100',
                  isActive
                    ? 'bg-white/[0.1] text-white'
                    : 'text-white/60 hover:text-white/85 hover:bg-white/[0.05]',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn('shrink-0', isActive ? 'text-white' : 'text-white/50')}>
                    {item.icon}
                  </span>
                  <span className="flex-1 tracking-tight">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User card */}
      <div className="px-3 pb-4 pt-3 border-t border-white/[0.08]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.07] transition-colors duration-100 text-left"
          title="Sign out"
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user?.name ?? 'User'}
              className="w-8 h-8 rounded-full shrink-0 object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-amber-900 text-[13px] font-bold shrink-0">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white/80 truncate leading-tight">
              {user?.name ?? 'User'}
            </p>
            <p className="text-[11px] text-white/35 mt-0.5">
              {user?.role === 'FACULTY' ? 'Adviser' : 'Student'}
            </p>
          </div>
          <ChevronsUpDown size={14} className="text-white/30 shrink-0" />
        </button>
      </div>
    </aside>
  );
};
