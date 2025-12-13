import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { FaHouse } from 'react-icons/fa6';
import { FaRobot } from 'react-icons/fa';
import { VscGraph } from 'react-icons/vsc';
import { FaBars, FaChevronLeft } from 'react-icons/fa';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 1024);

  const navItems = [
    { name: 'Dashboard', icon: <FaHouse />, path: '/' },
    { name: 'ML Models', icon: <FaRobot />, path: '/ml-models' },
    { name: 'Analytics', icon: <VscGraph />, path: '/analytics' },
  ];

  // Auto-collapse on small screens
  useEffect(() => {
    const handleResize = () => {
      setIsCollapsed(window.innerWidth < 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleToggle = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} h-screen bg-white border-r border-gray-200 flex flex-col shadow-sm transition-all duration-300`}>
      {/* Logo/Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className={`flex items-center space-x-3 ${isCollapsed ? 'hidden' : ''}`}>
            <img src="/logo.svg" alt="AION Logo" className="w-8 h-8" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">AION</h1>
          </div>
          <button
            onClick={handleToggle}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <FaBars className="text-gray-600" /> : <FaChevronLeft className="text-gray-600" />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 rounded-lg transition-colors ${
                    isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
                title={isCollapsed ? item.name : ''}
              >
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                {!isCollapsed && <span className="font-medium whitespace-nowrap">{item.name}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'space-x-3 px-4'} py-2`}>
          <div className="w-8 h-8 min-w-[2rem] bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0">U</div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">User</p>
              <p className="text-xs text-gray-500 truncate">Admin</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
