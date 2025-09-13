import React, { useState } from 'react';
import axios from 'axios';
import VideoFeed from './components/VideoFeed';
import LogPanel from './components/LogPanel';
import ReportPage from './components/ReportPage';
import AlertToast from './components/AlertToast';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

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
     const response = await axios.post(`${API_BASE_URL}/sessions`, { candidateName });
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
            // Wait for the server to successfully end the session
            await axios.put(`${API_BASE_URL}/sessions/${sessionId}/end`);
            // Only update the view to 'report' after the successful API call
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
            const response = await axios.post(`${API_BASE_URL}/events`, { sessionId, ...event });
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
                return (
<div className="flex flex-col items-center gap-8">
    <div className="w-full max-w-4xl">
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
    <div className="w-full max-w-lg">
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