import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { FaPlug, FaRobot, FaShieldAlt, FaBars, FaChevronLeft, FaChartLine, FaCog, FaExternalLinkAlt, FaSignOutAlt, FaCubes, FaProjectDiagram } from 'react-icons/fa';
import { VscGraph } from 'react-icons/vsc';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_ACCESS } from '../lib/roles';

const mlflowUrl = import.meta.env.VITE_MLFLOW_URL || '/mlflow';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(window.innerWidth < 1024);
  const { user, logout } = useAuth();

  const allNavItems = [
    { name: 'Ingestion', icon: <FaPlug />, path: '/' },
    { name: 'ML', icon: <FaRobot />, path: '/ml' },
    { name: 'Analytics', icon: <VscGraph />, path: '/analytics' },
    { name: 'Performance', icon: <FaChartLine />, path: '/performance' },
    { name: 'Policy', icon: <FaShieldAlt />, path: '/policy' },
    { name: 'Decision', icon: <FaProjectDiagram />, path: '/decision' },
    { name: 'Architectures', icon: <FaCubes />, path: '/architectures' },
  ];

  // Only show nav items the user's role can access
  const navItems = allNavItems.filter(item =>
    ROLE_ACCESS[item.path]?.some(role => user.roles.includes(role))
  );

  // Display the most relevant role (admin > others)
  const displayRole = user.roles.includes('admin')
    ? 'Admin'
    : user.roles[0]?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) ?? 'User';

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
        {navItems.map(({ name, icon, path }) => (
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
            <span className="sidebar-nav-icon">{icon}</span>
            {!collapsed && <span>{name}</span>}
          </NavLink>
        ))}

        {/* MLflow external link - only for ml_engineer and debug_admin */}
        {(user.roles.includes('ml_engineer') || user.roles.includes('debug_admin')) && (
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
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className={`flex items-center ${collapsed ? 'justify-center flex-col gap-2 px-0' : 'px-4'} py-2 gap-2`}>
          {/* User avatar — first letter of username */}
          <div className="w-8 h-8 min-w-[2rem] bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
            {user.username.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.username}</p>
              <p className="text-xs text-gray-500 truncate">{displayRole}</p>
            </div>
          )}
          {/* Settings link */}
          <NavLink
            to="/settings"
            title="Settings"
            className={({ isActive }) =>
              `p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <FaCog className="text-base" />
          </NavLink>
          {/* Logout button */}
          <button
            onClick={logout}
            title="Log out"
            className="p-1.5 rounded-lg transition-colors flex-shrink-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
          >
            <FaSignOutAlt className="text-base" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
