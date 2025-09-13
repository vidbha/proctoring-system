import React, { useRef, useEffect, useState, useCallback } from 'react';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { FaceMesh } from '@mediapipe/face_mesh';

// All event types and thresholds remain the same
const EVENTS = {
    NO_FACE: { eventType: 'no_face', message: 'Candidate not in frame for >10s', deduction: 5 },
    MULTIPLE_FACES: { eventType: 'multiple_faces', message: 'Multiple faces detected', deduction: 10 },
    LOOKING_AWAY: { eventType: 'looking_away', message: 'Candidate looking away from screen.', deduction: 2 },
    DROWSINESS_DETECTED: { eventType: 'drowsiness', message: 'Drowsiness or closed eyes detected.', deduction: 10 },
    PHONE_DETECTED: { eventType: 'phone_detected', message: 'Unauthorized item: cell phone', deduction: 10 },
    BOOK_DETECTED: { eventType: 'book_detected', message: 'Unauthorized item: book/notes', deduction: 10 },
    BACKGROUND_VOICE: { eventType: 'background_voice', message: 'Loud background noise detected.', deduction: 5 },
    EXTRA_DEVICE: { eventType: 'extra_device', message: 'Unauthorized electronic device detected.', deduction: 10 },
};
const NO_FACE_THRESHOLD = 10000;
const LOOKING_AWAY_THRESHOLD = 5000;
const COOLDOWN_PERIOD = 20000;
const AUDIO_THRESHOLD = 35;
const AUDIO_COOLDOWN = 15000;
const EAR_THRESHOLD = 0.20;
const DROWSINESS_TIME_THRESHOLD = 2000;
const OBJECT_CONFIDENCE_THRESHOLD = 0.60;

function VideoFeed({ onEvent, isProctoring, onRecordingComplete }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [models, setModels] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [micVolume, setMicVolume] = useState(0);
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const timers = useRef({ noFace: null, drowsiness: null, lookingAway: null }).current;
    const cooldowns = useRef({ multipleFaces: 0, phone: 0, book: 0, audio: 0, drowsiness: 0, extraDevice: 0 }).current;
    
    // Refs for the new stable animation loop
    const animationFrameId = useRef(null);
    const lastDetectionTime = useRef(0);

    useEffect(() => {
        async function loadModels() {
            setIsLoading(true);
            try {
                const objectModel = await cocoSsd.load();
                const faceMesh = new FaceMesh({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
                faceMesh.setOptions({ maxNumFaces: 2, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
                setModels({ objectModel, faceMesh });
            } catch (error) { console.error("Failed to load models:", error); } 
            finally { setIsLoading(false); }
        }
        loadModels();
    }, []);

    const getDistance = (p1, p2) => {
        if (!p1 || !p2) return 0;
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    };
    
    const getEAR = (landmarks, eyePoints) => {
        const points = eyePoints.map(index => landmarks[index]);
        if (points.some(p => !p)) return 0;
        const verticalDist = getDistance(points[1], points[5]) + getDistance(points[2], points[4]);
        const horizontalDist = getDistance(points[0], points[3]);
        if (horizontalDist === 0) return 0;
        return verticalDist / (2.0 * horizontalDist);
    };
    
    const drawObjectBox = (ctx, prediction) => {
        const [x, y, width, height] = prediction.bbox;
        const text = `${prediction.class} (${Math.round(prediction.score * 100)}%)`;
        ctx.strokeStyle = '#FF0000';
        ctx.fillStyle = '#FF0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(text, x, y > 10 ? y - 5 : 10);
    };

    useEffect(() => {
        if (!isProctoring || !models) {
            return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let localStream = null;

        const processFaceResults = (results) => {
            const faces = results.multiFaceLandmarks;
            const now = Date.now();
            if (!faces || faces.length === 0) {
                if (!timers.noFace) {
                    console.log("[DEBUG] Starting NO FACE timer...");
                    timers.noFace = setTimeout(() => onEvent(EVENTS.NO_FACE), NO_FACE_THRESHOLD);
                }
            } else if (faces.length > 1) {
                if(timers.noFace) console.log("[DEBUG] Face detected, clearing NO FACE timer.");
                clearTimeout(timers.noFace);
                timers.noFace = null;
                if (now - cooldowns.multipleFaces > COOLDOWN_PERIOD) {
                    onEvent(EVENTS.MULTIPLE_FACES);
                    cooldowns.multipleFaces = now;
                }
            } else {
                if(timers.noFace) console.log("[DEBUG] Face detected, clearing NO FACE timer.");
                clearTimeout(timers.noFace);
                timers.noFace = null;
                const landmarks = faces[0];
                if (!landmarks) return;
                const nose = landmarks[1];
                const leftEye = landmarks[133];
                const rightEye = landmarks[362];
                if (nose && leftEye && rightEye) {
                    const eyeCenterX = (leftEye.x + rightEye.x) / 2;
                    const horizontalGaze = Math.abs(nose.x - eyeCenterX);
                    if (horizontalGaze > 0.05) {
                        if (!timers.lookingAway) {
                            console.log("[DEBUG] Starting LOOKING AWAY timer...");
                            timers.lookingAway = setTimeout(() => onEvent(EVENTS.LOOKING_AWAY), LOOKING_AWAY_THRESHOLD);
                        }
                    } else {
                        if(timers.lookingAway) console.log("[DEBUG] Looking forward, clearing LOOKING AWAY timer.");
                        clearTimeout(timers.lookingAway);
                        timers.lookingAway = null;
                    }
                }
                const leftEyePoints = [33, 160, 158, 133, 153, 144];
                const rightEyePoints = [362, 385, 387, 263, 380, 373];
                const avgEAR = (getEAR(landmarks, leftEyePoints) + getEAR(landmarks, rightEyePoints)) / 2.0;
                if (avgEAR < EAR_THRESHOLD) {
                    if (!timers.drowsiness) {
                        timers.drowsiness = setTimeout(() => {
                            if (now - cooldowns.drowsiness > COOLDOWN_PERIOD) {
                                onEvent(EVENTS.DROWSINESS_DETECTED);
                                cooldowns.drowsiness = now;
                            }
                        }, DROWSINESS_TIME_THRESHOLD);
                    }
                } else {
                    clearTimeout(timers.drowsiness);
                    timers.drowsiness = null;
                }
            }
        };

        const handleObjectDetection = (predictions) => {
            const unauthorizedDevices = ['laptop', 'tv', 'remote'];
            predictions.forEach(p => {
                drawObjectBox(ctx, p);
                const now = Date.now();
                if (p.class === 'cell phone' && p.score > OBJECT_CONFIDENCE_THRESHOLD) { if (now - cooldowns.phone > COOLDOWN_PERIOD) { onEvent(EVENTS.PHONE_DETECTED); cooldowns.phone = now; } }
                if (p.class === 'book' && p.score > OBJECT_CONFIDENCE_THRESHOLD) { if (now - cooldowns.book > COOLDOWN_PERIOD) { onEvent(EVENTS.BOOK_DETECTED); cooldowns.book = now; } }
                if (unauthorizedDevices.includes(p.class) && p.score > OBJECT_CONFIDENCE_THRESHOLD) { if (now - cooldowns.extraDevice > COOLDOWN_PERIOD) { onEvent(EVENTS.EXTRA_DEVICE); cooldowns.extraDevice = now; } }
            });
        };

        const handleAudioDetection = () => {
            if (!analyserRef.current) return;
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
            setMicVolume(average);
            const now = Date.now();
            if (average > AUDIO_THRESHOLD && now - cooldowns.audio > AUDIO_COOLDOWN) { onEvent(EVENTS.BACKGROUND_VOICE); cooldowns.audio = now; }
        };
        
        models.faceMesh.onResults(processFaceResults);

        const detectionLoop = async () => {
            if (!video.srcObject || video.paused || video.ended) {
                animationFrameId.current = requestAnimationFrame(detectionLoop);
                return;
            }
            
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const now = Date.now();
            if (now - lastDetectionTime.current > 400) { // Run heavy models ~2.5 times/sec
                lastDetectionTime.current = now;
                
                await models.faceMesh.send({ image: video });
                const objectPredictions = await models.objectModel.detect(video);
                
                handleObjectDetection(objectPredictions);
                handleAudioDetection();
            }

            animationFrameId.current = requestAnimationFrame(detectionLoop);
        };
    
        const startProctoring = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: true });
                localStream = stream;
                video.srcObject = stream;
                
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
                analyserRef.current = audioContextRef.current.createAnalyser();
                const audioSource = audioContextRef.current.createMediaStreamSource(stream);
                audioSource.connect(analyserRef.current);
                
                video.onloadedmetadata = () => {
                    video.play();
                    
                    const canvasStream = canvas.captureStream(25);
                    const audioTracks = stream.getAudioTracks();
                    const combinedStream = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);
                    
                    const recorderOptions = {
                        mimeType: 'video/webm',
                        videoBitsPerSecond: 2500000,
                    };
                    mediaRecorderRef.current = new MediaRecorder(combinedStream, recorderOptions);
                    
                    mediaRecorderRef.current.ondataavailable = (event) => { if (event.data.size > 0) recordedChunksRef.current.push(event.data); };
                    
                    mediaRecorderRef.current.onstop = () => {
                        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                        onRecordingComplete(blob);
                        recordedChunksRef.current = [];
                    };
                    
                    mediaRecorderRef.current.start();
                    animationFrameId.current = requestAnimationFrame(detectionLoop);
                };
            } catch (error) { console.error("ERROR accessing webcam/mic:", error); alert("WEBCAM/MIC ERROR: " + error.message); }
        };
    
        const stopProctoring = () => {
            cancelAnimationFrame(animationFrameId.current);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            Object.values(timers).forEach(clearTimeout);
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
            }
        };

        startProctoring();
    
        return () => {
            stopProctoring();
        };
    }, [isProctoring, models]);

    return (
        <div className="relative w-full max-w-4xl mx-auto bg-gray-900 rounded-lg shadow-lg">
            {isLoading && (<div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 text-white z-20"><p className="text-xl">Loading AI Models...</p></div>)}
            <div className="absolute top-2 left-2 w-24 h-6 bg-gray-800 rounded-full border border-gray-600 overflow-hidden z-10">
                <div className="h-full bg-green-500 transition-all duration-100" style={{ width: `${Math.min((micVolume / 100) * 100, 100)}%` }}></div>
            </div>
            <video ref={videoRef} style={{ display: 'none' }} autoPlay playsInline muted />
            <canvas ref={canvasRef} className="w-full h-auto rounded-lg" width="640" height="480" style={{ transform: 'scaleX(-1)' }} />
        </div>
    );
}

export default VideoFeed;
