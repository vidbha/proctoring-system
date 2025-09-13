import React, { useState } from 'react';
import axios from 'axios';
import VideoFeed from './components/VideoFeed';
import ReportPage from './components/ReportPage';
import AlertToast from './components/AlertToast';


function LogPanel({ logs, score }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-lg flex flex-col h-full">
      <div className="text-center border-b pb-3 mb-3">
        <h2 className="text-sm font-semibold text-gray-500">Integrity Score</h2>
        <p className="text-5xl font-bold text-blue-600">{score}</p>
      </div>
      <h3 className="text-lg font-bold mb-2">Suspicious Events Log</h3>
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

// --- Main Proctoring Page Component ---
function ProctoringPage() {
    const [sessionId, setSessionId] = useState(null);
    const [logs, setLogs] = useState([]);
    const [integrityScore, setIntegrityScore] = useState(100);
    const [view, setView] = useState('idle');
    const [recordedVideoBlob, setRecordedVideoBlob] = useState(null);
    const [alert, setAlert] = useState({ show: false, message: '' });

    const startSession = async () => {
        const candidateName = prompt("Please enter candidate's name:", "John Doe");
        if (!candidateName) return;
        try {
            const response = await axios.post(`/api/sessions`, { candidateName });
            setSessionId(response.data.id);
            setLogs([]);
            setIntegrityScore(100);
            setRecordedVideoBlob(null);
            setView('proctoring');
            logEventToPanel({ message: `Session started for ${candidateName}.` });
        } catch (error) {
            console.error("Failed to start session", error);
            alert("Could not start session. Is the backend running?");
        }
    };

    const stopSession = async () => {
        if (!sessionId) return;
        try {
            await axios.put(`/api/sessions/${sessionId}/end`);
            setView('report'); 
        } catch (error) {
            console.error("Failed to stop session", error);
            alert("Could not stop the session on the server.");
        }
    };
    
    const restartSession = () => {
        setSessionId(null);
        setView('idle');
    };

    const logEventToPanel = (log) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prevLogs => [{ ...log, timestamp }, ...prevLogs]);
    };
    
    const handleDetectionEvent = async (event) => {
        if (!sessionId) return;
        logEventToPanel(event);
        if (event.deduction >= 5) {
            setAlert({ show: true, message: event.message });
        }
        try {
            const response = await axios.post(`/api/events`, { sessionId, ...event });
            setIntegrityScore(response.data.updatedScore);
        } catch (error) {
            console.error("Failed to log event to backend", error);
        }
    };
    
    const handleRecordingComplete = (blob) => {
        setRecordedVideoBlob(blob);
    };

    const renderContent = () => {
        switch (view) {
            case 'proctoring':
                // --- This is the new, better side-by-side layout ---
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Side: Video Feed */}
                        <div className="lg:col-span-2">
                            <VideoFeed 
                                onEvent={handleDetectionEvent} 
                                isProctoring={view === 'proctoring'}
                                onRecordingComplete={handleRecordingComplete} 
                            />
                            <div className="mt-4 flex justify-center">
                                <button onClick={stopSession} className="px-8 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700">
                                    Stop Proctoring & Generate Report
                                </button>
                            </div>
                        </div>
                        {/* Right Side: Log Panel */}
                        <div className="lg:col-span-1">
                            <LogPanel logs={logs} score={integrityScore} />
                        </div>
                    </div>
                );
            case 'report':
                return <ReportPage sessionId={sessionId} onRestart={restartSession} videoBlob={recordedVideoBlob} />;
            case 'idle':
            default:
                return (
                    <div className="text-center py-20">
                         <h2 className="text-2xl mb-6">Ready to begin a new proctoring session?</h2>
                        <button onClick={startSession} className="px-10 py-4 bg-blue-600 text-white font-bold text-lg rounded-lg shadow-xl hover:bg-blue-700">
                            Start New Session
                        </button>
                    </div>
                );
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-8 font-sans">
            <header className="text-center mb-8">
                <h1 className="text-4xl font-bold">Proctoring Dashboard</h1>
            </header>
            <main>
                {renderContent()}
            </main>
            <AlertToast 
                message={alert.message}
                show={alert.show}
                onClose={() => setAlert({ show: false, message: '' })}
            />
        </div>
    );
}

export default ProctoringPage;