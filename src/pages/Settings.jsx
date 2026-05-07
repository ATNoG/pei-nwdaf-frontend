import React from 'react';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { FaSun, FaMoon, FaDesktop } from 'react-icons/fa';

const FONT_SIZE_OPTIONS = [
  { value: 'small',  label: 'S' },
  { value: 'medium', label: 'M' },
  { value: 'large',  label: 'L' },
  { value: 'xl',     label: 'XL' },
];

const CVD_OPTIONS = [
  { value: 'none',   label: 'None',        description: 'Standard color palette.' },
  { value: 'rg',     label: 'Red-Green',   description: 'For deuteranopia & protanopia.' },
  { value: 'tritan', label: 'Tritanopia',  description: 'For blue-yellow deficiency.' },
];

const THEME_OPTIONS = [
  { value: 'light',  label: 'Light',  Icon: FaSun },
  { value: 'dark',   label: 'Dark',   Icon: FaMoon },
  { value: 'system', label: 'System', Icon: FaDesktop },
];

const Toggle = ({ id, checked, onChange, label, description }) => (
  <div className="flex items-center justify-between py-4">
    <div>
      <label htmlFor={id} className="text-sm font-medium text-gray-900 cursor-pointer">{label}</label>
      {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
    </div>
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        checked ? 'bg-blue-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

const SectionCard = ({ title, description, children }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
    <h2 className="text-sm font-semibold text-gray-900 mb-0.5">{title}</h2>
    {description && <p className="text-xs text-gray-500 mb-4">{description}</p>}
    {children}
  </div>
);

const Settings = () => {
  const { preferences, setPreference } = useAccessibility();

  return (
    <div className="max-w-4xl mx-auto space-y-4">

      {/* Theme */}
      <SectionCard
        title="Theme"
        description="Choose light, dark, or follow your system preference."
      >
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Color theme">
          {THEME_OPTIONS.map(({ value, label, Icon }) => {
            const isActive = preferences.theme === value;
            return (
              <button
                key={value}
                onClick={() => setPreference('theme', value)}
                aria-pressed={isActive}
                className={`flex flex-col items-center gap-2 px-3 py-4 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                  isActive
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <Icon className="text-lg" />
                <span className="text-xs font-semibold">{label}</span>
              </button>
            );
          })}
        </div>
        {preferences.theme === 'system' && (
          <p className="text-xs text-gray-400 mt-3 text-center">
            Follows your OS preference automatically.
          </p>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Display */}
        <SectionCard
          title="Display"
          description="Adjust visual contrast to improve readability."
        >
          <div className="divide-y divide-gray-100">
            <Toggle
              id="high-contrast"
              checked={preferences.highContrast}
              onChange={(val) => setPreference('highContrast', val)}
              label="High Contrast"
              description="Forces stark black/white backgrounds with strong borders."
            />
          </div>
        </SectionCard>

        {/* Text Size */}
        <SectionCard
          title="Text Size"
          description="Adjust the base font size across the dashboard."
        >
          <div className="flex gap-2" role="group" aria-label="Text size">
            {FONT_SIZE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPreference('fontSize', opt.value)}
                aria-pressed={preferences.fontSize === opt.value}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                  preferences.fontSize === opt.value
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </SectionCard>

      </div>

      {/* Color Vision */}
      <SectionCard
        title="Color Vision"
        description="Select a palette correction for your type of color vision deficiency."
      >
        <div role="radiogroup" aria-label="Color vision mode" className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {CVD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              role="radio"
              aria-checked={preferences.colorVision === opt.value}
              onClick={() => setPreference('colorVision', opt.value)}
              className={`text-left px-4 py-3 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                preferences.colorVision === opt.value
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="block text-sm font-medium text-gray-900">{opt.label}</span>
              <span className="block text-xs text-gray-500 mt-0.5">{opt.description}</span>
            </button>
          ))}
        </div>
      </SectionCard>

    </div>
  );
};

export default Settings;
