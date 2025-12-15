import React, { useState, useEffect } from 'react';

const TrainingStatus = ({ modelName, trainingStatus, trainingLogs }) => {
  const [showLogsModal, setShowLogsModal] = useState(false);

  const status = trainingStatus || null;
  const logs = trainingLogs || [];
  const isCompleted = status?.status === 'completed' || status?.status === 'error';

  if (!status) {
    return null; // Don't show anything if no training status
  }

  return (
    <>
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-700">Training Status</p>
          {isCompleted && logs.length > 0 && (
            <button
              onClick={() => setShowLogsModal(true)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              View Full Log
            </button>
          )}
        </div>

        {/* Progress Bar */}
        {status.current_epoch !== undefined && status.total_epochs && (
          <div className="mb-2">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Epoch {status.current_epoch}/{status.total_epochs}</span>
              <span>{Math.round((status.current_epoch / status.total_epochs) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(status.current_epoch / status.total_epochs) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Current Status Line */}
        <div className="space-y-1">
          <div className="text-xs text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded">
            Epoch {status.current_epoch}/{status.total_epochs}
            {status.loss !== undefined && status.loss !== null && ` - Loss: ${status.loss.toFixed(4)}`}
          </div>
        </div>

        {status.status === 'completed' && (
          <div className="mt-2 text-xs text-green-600 font-medium">
            ✓ {status.message || 'Training completed'}
          </div>
        )}
        {status.status === 'error' && (
          <div className="mt-2 text-xs text-red-600 font-medium">
            ✗ {status.message || 'Training failed'}
          </div>
        )}
      </div>

      {/* Full Logs Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Training Logs</h3>
                <p className="text-sm text-gray-600 mt-1">{modelName}</p>
              </div>
              <button
                onClick={() => setShowLogsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {logs.length > 0 ? (
                <div className="space-y-2 font-mono text-sm">
                  {logs.map((log, idx) => (
                    <div
                      key={idx}
                      className={`px-4 py-2 rounded ${
                        log.status === 'error' ? 'bg-red-50 text-red-900' :
                        log.status === 'completed' ? 'bg-green-50 text-green-900' :
                        'bg-gray-50 text-gray-900'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 text-xs">[{log.timestamp?.toLocaleTimeString()}]</span>
                        <div className="flex-1">
                          <div>
                            Epoch {log.current_epoch}/{log.total_epochs}
                            {log.loss !== undefined && log.loss !== null && ` - Loss: ${log.loss.toFixed(6)}`}
                          </div>
                          {log.message && (
                            <div className="text-xs mt-1 opacity-75">{log.message}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">No training logs available</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setShowLogsModal(false)}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TrainingStatus;