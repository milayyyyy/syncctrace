import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const STUDENT_SECTIONS = [
  {
    label: 'WORKSPACE',
    items: [
      { to: '/dashboard',   icon: <LayoutGrid  size={18} strokeWidth={2.5} />, label: 'Dashboard'  },
      { to: '/setup',       icon: <FolderOpen  size={18} strokeWidth={2.5} />, label: 'Workspaces' },
      { to: '/artifacts',   icon: <FileText    size={18} strokeWidth={2.5} />, label: 'Artifacts'  },
    ]
  },
  {
    label: 'AI PROTOCOL',
    items: [
      { to: '/matrix',      icon: <ShieldCheck size={18} strokeWidth={2.5} />, label: 'Audit' },
      { to: '/diagnostics', icon: <Search      size={18} strokeWidth={2.5} />, label: 'Gap Analysis' },
    ]
  },
];

const FACULTY_SECTIONS = [
  {
    label: 'MANAGEMENT',
    items: [
      { to: '/faculty', icon: <Users    size={18} strokeWidth={2.5} />, label: 'My Groups' },
    ]
  },
];

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const sections = user?.role === 'FACULTY' ? FACULTY_SECTIONS : STUDENT_SECTIONS;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '256px',
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflow: 'hidden',
        flexShrink: 0,
        backgroundColor: '#0B1521',
        boxShadow: '10px 0 50px rgba(0, 0, 0, 0.3)',
        borderRight: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '32px 24px 28px' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            backgroundColor: '#D4AF37',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 20px rgba(212, 175, 55, 0.45)',
          }}
        >
          <Activity size={22} color="#0B1521" strokeWidth={3} />
        </div>
        <div>
          <p style={{ fontSize: '15px', fontWeight: 900, color: '#ffffff', lineHeight: 1.2, letterSpacing: '0.02em', margin: 0 }}>SyncTrace</p>
          <p style={{ fontSize: '8px', fontWeight: 700, color: 'rgba(212,175,55,0.5)', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '3px 0 0' }}>
            {user?.role === 'FACULTY' ? 'Faculty Portal' : 'Student Portal'}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {sections.map((section) => (
          <div key={section.label}>
            <p style={{
              fontSize: '9px',
              fontWeight: 900,
              color: 'rgba(255,255,255,0.25)',
              textTransform: 'uppercase',
              letterSpacing: '0.25em',
              padding: '0 16px',
              marginBottom: '8px',
            }}>
              {section.label}
            </p>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end
                  className={({ isActive }) => isActive ? '__nav-active' : '__nav-idle'}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '11px 18px',
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
                  <span style={{ display: 'flex', flexShrink: 0 }}>{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        ))}

        {/* Account */}
        <div>
          <p style={{
            fontSize: '9px',
            fontWeight: 900,
            color: 'rgba(255,255,255,0.25)',
            textTransform: 'uppercase',
            letterSpacing: '0.25em',
            padding: '0 16px',
            marginBottom: '8px',
          }}>
            ACCOUNT
          </p>
          <button style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '11px 18px',
            borderRadius: '14px',
            fontSize: '13px',
            fontWeight: 800,
            color: 'rgba(255,255,255,0.55)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
          >
            <Settings size={18} strokeWidth={2.5} />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Bottom: Logout + Tour */}
      <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            height: '46px',
            backgroundColor: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            fontSize: '11px',
            fontWeight: 900,
            color: 'rgba(255,255,255,0.8)',
            letterSpacing: '0.12em',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; }}
        >
          <LogOut size={15} color="#D4AF37" />
          LOGOUT
        </button>

      </div>
    </aside>
  );
};
