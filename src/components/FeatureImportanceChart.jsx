import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const FeatureImportanceChart = ({ importances, axisLabel = 'Importance', computedAt }) => {
  const sorted = useMemo(() => {
    if (!importances) return [];
    return Object.entries(importances)
      .map(([name, val]) => ({ name, mean: val.mean }))
      .sort((a, b) => b.mean - a.mean);
  }, [importances]);

  const chartData = useMemo(() => ({
    labels: sorted.map(f => f.name),
    datasets: [{
      data: sorted.map(f => f.mean),
      backgroundColor: sorted.map(f => f.mean >= 0 ? 'rgba(59,130,246,0.7)' : 'rgba(239,68,68,0.7)'),
      borderColor: sorted.map(f => f.mean >= 0 ? 'rgb(59,130,246)' : 'rgb(239,68,68)'),
      borderWidth: 1,
      borderRadius: 3,
    }],
  }), [sorted]);

  const chartOptions = useMemo(() => ({
    indexAxis: 'y',
    animation: false,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (item) => ` ${item.raw.toFixed(4)}`,
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: axisLabel },
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
      y: { ticks: { font: { size: 12 } } },
    },
  }), [axisLabel]);

  if (!sorted.length) return null;

  return (
    <div className="space-y-4">
      <div style={{ height: Math.max(200, sorted.length * 36) }}>
        <Bar data={chartData} options={chartOptions} />
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Feature</th>
            <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((f, i) => (
            <tr key={f.name} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
              <td className="py-1.5 px-3 font-mono text-xs text-gray-800">{f.name}</td>
              <td className={`py-1.5 px-3 text-right font-medium text-xs ${f.mean >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                {f.mean.toFixed(4)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {computedAt && (
        <p className="text-xs text-gray-400">Computed {new Date(computedAt).toLocaleString()}</p>
      )}
    </div>
  );
};

export default FeatureImportanceChart;
