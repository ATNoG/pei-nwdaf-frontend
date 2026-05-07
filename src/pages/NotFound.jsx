import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      {/* Road sign SVG */}
      <svg width="130" height="150" viewBox="0 0 130 150" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Octagonal sign */}
        <polygon
          points="45,5 85,5 110,30 110,70 85,95 45,95 20,70 20,30"
          fill="#1e3a6e"
        />
        <polygon
          points="48,10 82,10 105,33 105,67 82,90 48,90 25,67 25,33"
          fill="none"
          stroke="white"
          strokeWidth="2"
        />
        <text
          x="65"
          y="60"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="26"
          fontWeight="bold"
          fontFamily="sans-serif"
        >
          404
        </text>

        {/* Pole */}
        <rect x="61" y="95" width="8" height="35" fill="#6b7280" />

        {/* Traffic cone */}
        <polygon points="38,148 92,148 75,110 55,110" fill="#f97316" />
        <rect x="45" y="120" width="40" height="5" fill="white" opacity="0.6" />
        <rect x="34" y="145" width="62" height="8" rx="2" fill="#f97316" />
      </svg>

      <h1 className="text-3xl font-semibold text-gray-800 mt-6 mb-2">Page Not Found</h1>
      <p className="text-gray-500 mb-8 max-w-sm text-sm">
        The page you are looking for doesn't exist or has been moved
      </p>
      <Link
        to="/"
        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
