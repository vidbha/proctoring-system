import React from 'react';

function LogPanel({ logs, score }) {
  return (
    // This container is now a flex column that will fill the height of its parent
    <div className="bg-white p-4 rounded-lg shadow-lg flex flex-col h-full">
      
      {/* --- Score Display --- */}
      <div className="text-center border-b pb-3 mb-3">
        <h2 className="text-sm font-semibold text-gray-500">Integrity Score</h2>
        <p className="text-5xl font-bold text-blue-600">{score}</p>
      </div>

      {/* --- Event Log Header --- */}
      <h3 className="text-lg font-bold mb-2">Suspicious Events Log</h3>

      {/* --- Scrollable Log List --- */}
      {/* This list will grow to fill available space and scroll internally */}
      <div className="flex-grow overflow-y-auto bg-gray-50 p-2 rounded-md border">
        {logs.length > 0 ? (
          logs.map((log, index) => (
            <div key={index} className="font-mono text-sm mb-2 p-2 rounded bg-white border-l-4 border-yellow-500">
              <span className="font-bold">[{log.timestamp}]</span> {log.message}
              {log.deduction > 0 && (
                <span className="font-semibold text-red-600"> (-{log.deduction} pts)</span>
              )}
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-center pt-4">No suspicious events logged yet.</p>
        )}
      </div>

    </div>
  );
}

export default LogPanel;