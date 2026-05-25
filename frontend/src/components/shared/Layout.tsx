import React from 'react';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  badge?: string;
  heroIcon?: React.ReactNode;
  headerAction?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children, title, subtitle, badge, heroIcon, headerAction }) => (
  <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F1F5F9', fontFamily: 'Inter, system-ui, sans-serif' }}>
    <Sidebar />
    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>

      {/* ── Hero / Page Header ──────────────────────────────── */}
      {(title || headerAction) && (
        <header
          style={{
            position: 'relative',
            backgroundColor: '#0B1521',
            overflow: 'hidden',
            padding: '44px 48px 48px',
            flexShrink: 0,
            margin: '20px 20px 0 20px',
            borderRadius: '20px',
          }}
        >
          {/* Decorative grid */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.06,
            backgroundImage: 'linear-gradient(rgba(212,175,55,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.6) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            pointerEvents: 'none',
          }} />
          {/* Gold orb top-right */}
          <div style={{
            position: 'absolute', top: '-80px', right: '-80px',
            width: '320px', height: '320px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.18) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          {/* Subtle orb bottom-left */}
          <div style={{
            position: 'absolute', bottom: '-60px', left: '30%',
            width: '200px', height: '200px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(30,58,95,0.6) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              {/* Optional page icon */}
              {heroIcon && (
                <div style={{
                  width: '56px', height: '56px', borderRadius: '16px',
                  backgroundColor: 'rgba(212,175,55,0.15)',
                  border: '1px solid rgba(212,175,55,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#D4AF37', flexShrink: 0,
                }}>
                  {heroIcon}
                </div>
              )}
              <div>
                {badge && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    backgroundColor: 'rgba(212,175,55,0.12)',
                    border: '1px solid rgba(212,175,55,0.25)',
                    borderRadius: '999px',
                    padding: '3px 12px',
                    marginBottom: '10px',
                  }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#D4AF37', display: 'block' }} />
                    <span style={{ fontSize: '9px', fontWeight: 900, color: '#D4AF37', letterSpacing: '0.2em', textTransform: 'uppercase' }}>{badge}</span>
                  </div>
                )}
                {title && (
                  <h1 style={{
                    fontSize: '32px', fontWeight: 900, color: '#ffffff',
                    letterSpacing: '-0.02em', lineHeight: 1.1, margin: 0,
                  }}>{title}</h1>
                )}
                {subtitle && (
                  <p style={{
                    fontSize: '13px', color: 'rgba(255,255,255,0.65)',
                    fontWeight: 600, marginTop: '8px', letterSpacing: '0.01em',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}>
                    <span style={{ width: '20px', height: '2px', backgroundColor: '#D4AF37', borderRadius: '2px', flexShrink: 0 }} />
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            {headerAction && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {headerAction}
              </div>
            )}
          </div>
        </header>
      )}

      {/* ── Page Body ───────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 40px 48px 40px' }}>
        {children}
      </div>
    </main>
  </div>
);
