import React from 'react';
import { useAccessibility } from '../contexts/AccessibilityContext';

const FONT_SIZE_OPTIONS = [
  { value: 'small',  label: 'S' },
  { value: 'medium', label: 'M' },
  { value: 'large',  label: 'L' },
  { value: 'xl',     label: 'XL' },
];

const CVD_OPTIONS = [
  {
    value: 'none',
    label: 'None',
    description: 'Standard color palette.',
  },
  {
    value: 'rg',
    label: 'Red-Green',
    description: 'For deuteranopia & protanopia.',
  },
  {
    value: 'tritan',
    label: 'Tritanopia',
    description: 'For blue-yellow deficiency.',
  },
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

const Settings = () => {
  const { preferences, setPreference } = useAccessibility();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Display</h2>
          <p className="text-sm text-gray-500 mb-2">Adjust visual contrast to improve readability.</p>
          <div className="divide-y divide-gray-100">
            <Toggle
              id="high-contrast"
              checked={preferences.highContrast}
              onChange={(val) => setPreference('highContrast', val)}
              label="High Contrast"
              description="Forces stark black and white backgrounds with strongly defined borders."
            />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Text Size</h2>
          <p className="text-sm text-gray-500 mb-4">Adjust the base font size across the dashboard.</p>
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
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm md:col-span-2">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Color Vision</h2>
          <p className="text-sm text-gray-500 mb-4">
            Select a palette correction for your type of color vision deficiency.
          </p>
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
        </div>

        {/* Motion - commented out for now
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm md:col-span-2">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Motion</h2>
          <p className="text-sm text-gray-500 mb-2">Disable transitions and animations that may cause discomfort.</p>
          <div className="divide-y divide-gray-100">
            <Toggle
              id="reduced-motion"
              checked={preferences.reducedMotion}
              onChange={(val) => setPreference('reducedMotion', val)}
              label="Reduce Motion"
              description="Disables all CSS transitions and animations across the dashboard."
            />
          </div>
        </div>
        */}

      </div>
    </div>
  );
};

export default Settings;
