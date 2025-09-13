// --- UPDATED: Add useMemo to the import ---
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'api';

function ReportPage({ sessionId, onRestart, videoBlob }) {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- FIX 1: Use useMemo to create a stable URL ---
    // This ensures the URL doesn't change on every re-render, breaking the loop.
    const videoUrl = useMemo(() => {
        return videoBlob ? URL.createObjectURL(videoBlob) : null;
    }, [videoBlob]);

    useEffect(() => {
        if (!sessionId) return;
        const fetchReport = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`${API_BASE_URL}/sessions/${sessionId}`);
                setReport(response.data);
            } catch (err) {
                setError('Failed to load the report. Please try again.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchReport();

        // --- FIX 2: Correctly handle cleanup ---
        // This cleanup function now runs only when the component unmounts or the URL changes,
        // preventing memory leaks without causing re-renders.
        return () => {
            if (videoUrl) {
                URL.revokeObjectURL(videoUrl);
            }
        };
    // --- CHANGED: The dependency array now uses the stable videoUrl ---
    }, [sessionId]); // We can remove videoUrl from dependencies as it's stable and tied to videoBlob

    const calculateDuration = (start, end) => {
        if (!start || !end) return 'N/A';
        const duration = Math.round((new Date(end) - new Date(start)) / 1000);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        return `${minutes}m ${seconds}s`;
    };
    
    const countFocusLostEvents = (events) => {
        if (!events) return 0;
        return events.filter(event => 
            event.eventType === 'looking_away' || event.eventType === 'no_face'
        ).length;
    };

    const generatePdfReport = () => {
        if (!report) return;

        const doc = new jsPDF();
        const tableColumn = ["Time", "Suspicious Event", "Deduction"];
        const tableRows = [];

        report.events.forEach(event => {
            const eventData = [
                new Date(event.timestamp).toLocaleTimeString(),
                event.message,
                `-${event.deduction} pts`
            ];
            tableRows.push(eventData);
        });

        doc.setFontSize(22);
        doc.text("Proctoring Integrity Report", 14, 22);
        doc.setFontSize(12);
        doc.text(`Candidate Name: ${report.candidateName}`, 14, 40);
        doc.text(`Interview Duration: ${calculateDuration(report.startTime, report.endTime)}`, 14, 48);
        doc.text(`Number of Times Focus Lost: ${countFocusLostEvents(report.events)}`, 14, 56);
        doc.setFontSize(16);
        doc.text(`Final Integrity Score: ${report.finalIntegrityScore}`, 14, 70);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 80
        });

        doc.save(`Proctoring-Report-${report.candidateName.replace(' ', '_')}.pdf`);
    };
    
    if (loading) return <div className="text-center p-8"><p>Loading Report...</p></div>;
    if (error) return <div className="text-center p-8 text-red-500"><p>{error}</p></div>;
    if (!report) return null;

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg animate-fade-in max-w-4xl mx-auto">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
                <h1 className="text-3xl font-bold">Proctoring Report</h1>
                <button  
                    onClick={generatePdfReport}
                    className="px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-800"
                >
                    Download PDF
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-center">
                <div><h2 className="text-sm font-semibold text-gray-500">Candidate</h2><p className="text-lg">{report.candidateName}</p></div>
                <div><h2 className="text-sm font-semibold text-gray-500">Interview Duration</h2><p className="text-lg">{calculateDuration(report.startTime, report.endTime)}</p></div>
                <div><h2 className="text-sm font-semibold text-gray-500">Times Focus Lost</h2><p className="text-lg font-bold">{countFocusLostEvents(report.events)}</p></div>
                <div><h2 className="text-sm font-semibold text-gray-500">Final Integrity Score</h2><p className="text-4xl font-bold text-blue-600">{report.finalIntegrityScore}</p></div>
            </div>

            {videoUrl && (
                <div className="mb-6">
                    <h2 className="text-xl font-bold mb-3">Session Recording</h2>
                    <div className="bg-gray-100 p-4 rounded-lg flex items-center justify-between">
                        <p className="font-mono text-sm">recording.webm</p>
                        <a href={videoUrl} download={`proctoring-session-${sessionId}.webm`} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700">
                            Download Video
                        </a>
                    </div>
                </div>
            )}

            <h2 className="text-xl font-bold mb-3">Suspicious Events Log ({report.events.length})</h2>
            <div className="h-64 overflow-y-auto bg-gray-50 p-3 rounded-md border">
                {report.events.length > 0 ? (
                    report.events.map(event => (
                        <div key={event.id} className="font-mono text-sm mb-2 p-2 rounded bg-white border-l-4 border-yellow-500">
                           <span className="font-bold">[{new Date(event.timestamp).toLocaleTimeString()}]</span> {event.message} <span className="font-semibold text-red-600">(-{event.deduction} pts)</span>
                        </div>
                    ))
                ) : (
                    <p className="text-gray-500">No suspicious events were logged. Excellent!</p>
                )}
            </div>
            <div className="text-center mt-6">
                <button onClick={onRestart} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">
                    Start New Session
                </button>
            </div>
        </div>
    );
}

export default ReportPage;