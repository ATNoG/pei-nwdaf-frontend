import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { FaPlug, FaRobot, FaShieldAlt, FaBars, FaChevronLeft, FaChartLine, FaCog, FaExternalLinkAlt } from 'react-icons/fa';
import { VscGraph } from 'react-icons/vsc';

const NAV_ITEMS = [
  { name: 'Ingestion',   icon: FaPlug,      path: '/' },
  { name: 'ML Models',   icon: FaRobot,     path: '/ml' },
  { name: 'Analytics',   icon: VscGraph,    path: '/analytics' },
  { name: 'Performance', icon: FaChartLine, path: '/performance' },
  { name: 'Policy',      icon: FaShieldAlt, path: '/policy' },
];

const mlflowUrl = import.meta.env.VITE_MLFLOW_URL || 'http://localhost:5000';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const onResize = () => setCollapsed(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className="sidebar" style={{ width: collapsed ? '60px' : '220px' }}>
      {/* Logo */}
      <div className="sidebar-logo-area">
        {collapsed ? (
          <div className="flex justify-center w-full">
            <img src="/logo.svg" alt="AION" className="w-7 h-7" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              <img src="/logo.svg" alt="AION" className="w-7 h-7 shrink-0" />
              <span className="text-xl font-bold tracking-tight" style={{ color: 'var(--accent)' }}>
                AION
              </span>
            </div>
            <button
              className="sidebar-toggle-btn shrink-0"
              onClick={() => setCollapsed(true)}
              title="Collapse sidebar"
            >
              <FaChevronLeft size={12} />
            </button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {collapsed && (
          <button
            className="sidebar-toggle-btn w-full flex justify-center py-2 mb-1"
            onClick={() => setCollapsed(false)}
            title="Expand sidebar"
          >
            <FaBars size={14} />
          </button>
        )}
        {NAV_ITEMS.map(({ name, icon: Icon, path }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            title={collapsed ? name : undefined}
            className={({ isActive }) =>
              ['sidebar-nav-item', isActive && 'active', collapsed && 'justify-center']
                .filter(Boolean).join(' ')
            }
          >
            <span className="sidebar-nav-icon"><Icon /></span>
            {!collapsed && <span>{name}</span>}
          </NavLink>
        ))}

        {/* MLflow external link */}
        <div className="pt-1 mt-1" style={{ borderTop: '1px solid var(--border)' }}>
          <a
            href={mlflowUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open MLflow"
            className={['sidebar-nav-item', collapsed && 'justify-center'].filter(Boolean).join(' ')}
          >
            <span className="sidebar-nav-icon">
              <FaExternalLinkAlt size={12} />
            </span>
            {!collapsed && (
              <span className="flex-1 flex items-center justify-between">
                MLflow
                <FaExternalLinkAlt size={9} style={{ color: 'var(--text-muted)' }} />
              </span>
            )}
          </a>
        </div>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className={`flex items-center gap-2 ${collapsed ? 'justify-center flex-col' : ''}`}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: 'var(--accent-sub)', color: 'var(--accent)' }}
          >
            U
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>User</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>Admin</p>
              </div>
              <NavLink
                to="/settings"
                title="Settings"
                className={({ isActive }) =>
                  `sidebar-toggle-btn shrink-0${isActive ? ' !text-[--accent]' : ''}`
                }
              >
                <FaCog size={14} />
              </NavLink>
            </>
          )}
          {collapsed && (
            <NavLink to="/settings" title="Settings" className="sidebar-toggle-btn">
              <FaCog size={13} />
            </NavLink>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
