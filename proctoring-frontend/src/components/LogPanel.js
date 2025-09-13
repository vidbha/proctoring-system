import React from 'react';

function LogPanel({ logs, score }) {
    const scoreColor = score < 60 ? 'text-red-600' : score < 85 ? 'text-yellow-500' : 'text-green-600';
    
    return (
        <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-3 border-b pb-2">Real-time Event Log</h2>
            <div className="h-64 overflow-y-auto bg-gray-50 p-2 rounded-md">
                {logs.map((log, index) => (
                    <p key={index} className="text-sm font-mono">
                        <span className="font-bold">[{log.timestamp}]</span> {log.message}
                    </p>
                ))}
            </div>
            <div className="mt-4">
                <h3 className="text-lg font-semibold">Integrity Score</h3>
                <p className={`text-5xl font-bold ${scoreColor}`}>{score}</p>
            </div>
        </div>
    );
}

export default LogPanel;