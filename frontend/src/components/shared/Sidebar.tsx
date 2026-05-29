import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  LayoutGrid,
  FileText,
  ShieldCheck,
  Search,
  Users,
  Activity,
  Settings,
  LogOut,
  FolderOpen,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { prefetchRouteData } from '../../hooks/queries';

const STUDENT_SECTIONS = [
  {
    label: 'WORKSPACE',
    items: [
      { to: '/dashboard', icon: <LayoutGrid size={18} strokeWidth={2.5} />, label: 'Dashboard' },
      { to: '/setup', icon: <FolderOpen size={18} strokeWidth={2.5} />, label: 'Workspaces' },
      { to: '/artifacts', icon: <FileText size={18} strokeWidth={2.5} />, label: 'Artifacts' },
    ],
  },
  {
    label: 'AI PROTOCOL',
    items: [
      { to: '/matrix', icon: <ShieldCheck size={18} strokeWidth={2.5} />, label: 'Audit' },
      { to: '/diagnostics', icon: <Search size={18} strokeWidth={2.5} />, label: 'Gap Analysis' },
    ],
  },
];

const FACULTY_SECTIONS = [
  {
    label: 'MANAGEMENT',
    items: [{ to: '/faculty', icon: <Users size={18} strokeWidth={2.5} />, label: 'My Groups' }],
  },
];

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onClose }) => {
  const { user, logout, groupId } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const sections = user?.role === 'FACULTY' ? FACULTY_SECTIONS : STUDENT_SECTIONS;

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/login');
  };

  const handleNav = () => onClose();

  return (
    <aside
      className={`
        fixed lg:sticky inset-y-0 left-0 z-50
        flex flex-col w-[min(280px,85vw)] sm:w-64 h-screen h-dvh
        bg-[#0B1521] border-r border-white/[0.06]
        shadow-[10px_0_50px_rgba(0,0,0,0.3)]
        transition-transform duration-300 ease-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      <div className="flex items-center justify-between gap-3 px-5 pt-6 pb-4 lg:px-6 lg:pt-8 lg:pb-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-xl sm:rounded-[14px] bg-[#D4AF37] flex items-center justify-center shadow-[0_4px_20px_rgba(212,175,55,0.45)]">
            <Activity size={20} color="#0B1521" strokeWidth={3} />
          </div>
          <div className="min-w-0">
            <p className="text-sm sm:text-[15px] font-black text-white leading-tight m-0 truncate">SyncTrace</p>
            <p className="text-[8px] font-bold text-[rgba(212,175,55,0.5)] tracking-[0.2em] uppercase mt-0.5 truncate">
              {user?.role === 'FACULTY' ? 'Faculty Portal' : 'Student Portal'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg text-white/70 hover:bg-white/10"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 flex flex-col gap-6 lg:px-3">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="text-[9px] font-black text-white/25 uppercase tracking-[0.25em] px-3 mb-2">
              {section.label}
            </p>
            <nav className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end
                  onClick={handleNav}
                  onMouseEnter={() => prefetchRouteData(qc, item.to, groupId)}
                  onFocus={() => prefetchRouteData(qc, item.to, groupId)}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '11px 16px',
                    borderRadius: '14px',
                    fontSize: '13px',
                    fontWeight: 800,
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                    backgroundColor: isActive ? '#D4AF37' : 'transparent',
                    color: isActive ? '#0B1521' : 'rgba(255,255,255,0.55)',
                    boxShadow: isActive ? '0 4px 16px rgba(212,175,55,0.35)' : 'none',
                  })}
                >
                  <span className="flex shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        ))}

        <div>
          <p className="text-[9px] font-black text-white/25 uppercase tracking-[0.25em] px-3 mb-2">ACCOUNT</p>
          <button
            type="button"
            className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-[14px] text-[13px] font-extrabold text-white/55 bg-transparent border-0 cursor-pointer hover:bg-white/[0.04] hover:text-white transition-colors"
          >
            <Settings size={18} strokeWidth={2.5} />
            <span>Settings</span>
          </button>
        </div>
      </div>

      <div className="p-3 border-t border-white/[0.06] bg-black/25">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full h-11 flex items-center justify-center gap-2.5 rounded-[14px] text-[11px] font-black text-white/80 tracking-[0.12em] bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          <LogOut size={15} color="#D4AF37" />
          LOGOUT
        </button>
      </div>
    </aside>
  );
};
