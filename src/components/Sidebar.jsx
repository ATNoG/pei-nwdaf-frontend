import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaHouse } from 'react-icons/fa6';
import { FaRobot } from 'react-icons/fa';
import { VscGraph } from 'react-icons/vsc';

const Sidebar = () => {
  const navItems = [
    { name: 'Dashboard', icon: <FaHouse />, path: '/' },
    { name: 'ML Models', icon: <FaRobot />, path: '/ml-models' },
    { name: 'Analytics', icon: <VscGraph />, path: '/analytics' },
  ];

  return (
    <div className="w-64 h-screen bg-white border-r border-gray-200 flex flex-col shadow-sm">
      {/* Logo/Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <img src="/logo.svg" alt="AION Logo" className="w-8 h-8" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">AION</h1>
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
                  `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3 px-4 py-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold text-white">U</div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">User</p>
            <p className="text-xs text-gray-500">Admin</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
