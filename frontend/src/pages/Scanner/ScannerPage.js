import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  Chip,
  Avatar,
  TextField,
  List,
  ListItem,
  ListItemText,
  Divider,
  useTheme,
  CircularProgress,
  Paper,
  Snackbar,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListItemIcon,
  IconButton,
  LinearProgress
} from '@mui/material';
import {
  CameraAlt,
  QrCodeScanner,
  PersonAdd,
  Person,
  CheckCircle,
  Schedule,
  Warning,
  Face,
  Badge,
  School,
  Security,
  Stop,
  Refresh,
  CardMembership,
  Cancel,
  Fingerprint,
  Timer,
  CheckCircleOutline,
  Info,
  VerifiedUser,
  PhotoCamera,
  Visibility,
  PlayArrow,
  Close,
  Help
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { handleApiError } from '../../utils/errorHandler';
import axios from 'axios';

// Style constants for sx prop usage
const globalStyles = `
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.7; }
    100% { opacity: 1; }
  }
`;

// Inject global styles
if (typeof document !== 'undefined' && !document.getElementById('scanner-global-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'scanner-global-styles';
  styleSheet.textContent = globalStyles;
  document.head.appendChild(styleSheet);
}

const styles = {
  container: {
    padding: 3,
  },
  titleCard: {
    marginBottom: 3,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
  },
  webcamContainer: {
    position: 'relative',
    width: '100%',
    height: '480px',
    backgroundColor: '#000',
    borderRadius: 2,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webcam: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: 'white',
    flexDirection: 'column',
  },
  captureButton: {
    position: 'absolute',
    bottom: 2,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10,
  },
  resultCard: {
    marginTop: 2,
    padding: 2,
  },
  statusChip: {
    fontWeight: 600,
    fontSize: '1rem',
    padding: 1,
  },
  formField: {
    marginBottom: 2,
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: 200,
    borderRadius: 1,
  }
};

const ScannerPage = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Mode state
  const [isRegistrationMode, setIsRegistrationMode] = useState(false);
  
  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Registration state
  
  // Manual entry state
  const [manualEntry, setManualEntry] = useState(false);
  const [manualRegisterNumber, setManualRegisterNumber] = useState('');
  const [manualEntryError, setManualEntryError] = useState('');
  
  // Continuous scanning state
  const [continuousMode, setContinuousMode] = useState(false);
  const [detectedFace, setDetectedFace] = useState(false);
  const [detectedID, setDetectedID] = useState(null);
  const [autoStopOnSuccess, setAutoStopOnSuccess] = useState(true);
  const continuousScanIntervalRef = useRef(null);
  const [livenessStatus, setLivenessStatus] = useState(null); // null | 'checking' | 'live' | 'not-live'
  const [livenessScore, setLivenessScore] = useState(0);
  const [showLivenessInstructions, setShowLivenessInstructions] = useState(false);
  
  // Forgot ID Case states
  const [forgotIdDialog, setForgotIdDialog] = useState(false);
  const [forgotIdRegisterNumber, setForgotIdRegisterNumber] = useState('');
  const [forgotIdProcessing, setForgotIdProcessing] = useState(false);
  
  // Start camera
  const startCamera = useCallback(async () => {
    try {
      // If stream exists, just resume it
      if (stream && videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
        setError('');
        return;
      }
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported by this browser');
      }
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      
      setStream(mediaStream);
      
      // Video element is always rendered, so it should be available
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Wait a moment before playing to ensure stream is ready
        setTimeout(() => {
          if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.play().catch(err => {
              // Only log if it's not an abort error (which happens during normal operation)
              if (err.name !== 'AbortError') {
                console.error('Error playing video:', err);
              }
            });
          }
        }, 100);
      } else {
        console.error('Video ref is null!');
      }
      
      setIsCameraActive(true);
      setError('');
    } catch (err) {
      console.error('Error accessing camera:', err);
      setIsCameraActive(false);
      let errorMessage = 'Failed to access camera. ';
      
      if (err.name === 'NotAllowedError') {
        errorMessage += 'Camera permission denied. Please allow camera access and try again.';
      } else if (err.name === 'NotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else if (err.name === 'NotSupportedError') {
        errorMessage += 'Camera not supported by this browser.';
      } else {
        errorMessage += 'Please ensure camera permissions are granted. ' + err.message;
      }
      
      setError(errorMessage);
    }
  }, [stream]);

  // Stop camera (pause feed without releasing camera)
  const stopCamera = useCallback(() => {
    // Just pause the video without stopping the tracks
    // This keeps camera permission active
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setIsCameraActive(false);
  }, []);
  
  // Release camera completely (only on unmount)
  const releaseCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  }, [stream]);

  // Capture image from video stream
  const captureImage = useCallback(() => {
    if (videoRef.current && isCameraActive) {
      const video = videoRef.current;
      // Make sure video has dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.log('Video dimensions not ready');
        return null;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      // Draw with better quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Use higher quality for better barcode detection
      const dataURL = canvas.toDataURL('image/jpeg', 0.95);
      
      // Verify we got actual image data
      if (dataURL && dataURL.length > 100) {
        return dataURL;
      }
    }
    return null;
  }, [isCameraActive]);

  // Convert data URL to blob
  const dataURLToBlob = (dataURL) => {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  // Stop continuous scanning
  const stopContinuousScanning = useCallback(() => {
    setContinuousMode(false);
    setDetectedFace(false);
    setDetectedID(null);
    setSuccess('Auto-scan stopped.');
  }, []);

  // Handle Case C: Face detected but no ID card - create pending verification
  const handleCaseCPendingVerification = useCallback(async (faceBlob) => {
    console.log('🔄 Case C: Starting pending verification process...');
    setIsScanning(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('face_image', faceBlob, 'face.jpg');
      
      const response = await axios.post('http://localhost:8000/create_pending_verification', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
      });
      
      const result = response.data;
      setScanResult(result);
      
      // Show pending verification message
      setSuccess('⚠️ Face detected but ID card not readable. Pending verification created for manual review.');
      
      // Send notification to HOD/Parent
      if (result.notification_sent) {
        setSuccess(prev => prev + ' Notification sent to HOD and parents.');
      }
      
      if (autoStopOnSuccess) {
        stopContinuousScanning();
        stopCamera();
      }
      
    } catch (error) {
      console.error('❌ Case C pending verification error:', error);
      handleApiError(error, setError, 'Failed to create pending verification');
    } finally {
      setIsScanning(false);
    }
  }, [autoStopOnSuccess, stopContinuousScanning, stopCamera]);

  // Handle Forgot ID Case - Simplified approach
  const handleForgotId = useCallback(async () => {
    if (!isCameraActive) {
      setError('Please start the camera first');
      return;
    }

    console.log('🆔 Forgot ID: Enabling manual register number entry...');
    
    // Simply open the dialog for manual register number entry
    setManualEntry(true);
    setForgotIdDialog(true);
    setError('');
    setSuccess('Enter your register number manually to mark attendance without ID card');
  }, [isCameraActive]);

  // Submit Forgot ID Case using the standard attendance marking
  const submitForgotIdCase = useCallback(async () => {
    if (!forgotIdRegisterNumber) {
      setError('Please enter register number');
      return;
    }
    
    setForgotIdProcessing(true);
    console.log(`📤 Marking attendance for ${forgotIdRegisterNumber} without ID card...`);
    
    try {
      // Capture current face image
      const imageDataURL = captureImage();
      if (!imageDataURL) {
        setError('Failed to capture face image');
        setForgotIdProcessing(false);
        return;
      }
      
      const imageBlob = dataURLToBlob(imageDataURL);
      const formData = new FormData();
      formData.append('face_image', imageBlob, 'face.jpg');
      formData.append('register_number', forgotIdRegisterNumber);
      
      // Use the standard mark_attendance endpoint which handles forgot ID case
      const response = await axios.post('http://localhost:8000/mark_attendance', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
      });
      
      const result = response.data;
      setScanResult(result);
      
      // Close dialog and show appropriate message
      setForgotIdDialog(false);
      
      if (result.attendance_status === 'Pending') {
        setSuccess('⚠️ Attendance marked as pending (Forgot ID). Email notification sent to parent about missing ID card.');
      } else if (result.attendance_status === 'Late') {
        setSuccess('⏰ Late attendance marked. Email notification sent to parent.');
      } else {
        setSuccess(`✅ Attendance marked successfully: ${result.attendance_status}`);
      }
      
      // Reset forgot ID states
      setForgotIdRegisterNumber('');
      setManualEntry(false);
      setManualRegisterNumber('');
      
      // Auto-clear result after 5 seconds
      setTimeout(() => {
        setScanResult(null);
      }, 5000);
      
      if (autoStopOnSuccess) {
        stopCamera();
      }
      
    } catch (error) {
      console.error('❌ Failed to mark attendance:', error);
      handleApiError(error, setError, 'Failed to mark attendance');
    } finally {
      setForgotIdProcessing(false);
    }
  }, [forgotIdRegisterNumber, captureImage, dataURLToBlob, autoStopOnSuccess, stopCamera]);

  // Mark attendance with verification
  const markAttendanceWithVerification = useCallback(async (faceBlob, registerNumber) => {
    console.log(`🚀 Starting attendance marking for register: ${registerNumber}`);
    setIsScanning(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('face_image', faceBlob, 'face.jpg');
      formData.append('id_register_number', registerNumber);
      
      console.log(`📤 Sending attendance request to backend for ${registerNumber}`);
      const response = await axios.post('http://localhost:8000/mark_attendance_verified', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
      });
      
      console.log(`📥 Received response:`, response.data);
      const result = response.data;
      setScanResult(result);
      
      // Handle different cases
      switch(result.case) {
        case 'A':
          // Face & ID Match → Attendance Recorded
          setSuccess('✅ Attendance recorded successfully!');
          if (autoStopOnSuccess) {
            stopContinuousScanning();
            stopCamera();
          }
          break;
          
        case 'B':
          // Face & ID Mismatch
          setError('❌ Face and ID not match. Please retry.');
          setDetectedFace(false);
          setDetectedID(null);
          break;
          
        case 'C':
          // Case C: Pending Verification (Face detected but no ID)
          setSuccess('⚠️ Face detected but ID card not readable. Pending verification created for manual review.');
          if (result.notification_sent) {
            setSuccess(prev => prev + ' Notification sent to HOD and parents.');
          }
          if (autoStopOnSuccess) {
            stopContinuousScanning();
            stopCamera();
          }
          break;
          
        case 'D':
          // Late Entry
          setSuccess('⏰ Attendance marked as Late - Present. Notification sent.');
          if (autoStopOnSuccess) {
            stopContinuousScanning();
            stopCamera();
          }
          break;
      }
      
      // Clear detection states after success
      if (['A', 'C', 'D'].includes(result.case)) {
        setTimeout(() => {
          setDetectedFace(false);
          setDetectedID(null);
          setScanResult(null);
        }, 5000);
      }
      
    } catch (err) {
      console.error('❌ Attendance marking error:', err);
      console.error('❌ Error details:', err.response?.data || err.message);
      handleApiError(err, setError, 'Failed to mark attendance');
    } finally {
      console.log('🏁 Attendance marking process completed');
      setIsScanning(false);
    }
  }, [autoStopOnSuccess, stopContinuousScanning, stopCamera]);

  // Handle continuous scanning for simultaneous face and ID detection
  const performContinuousScan = useCallback(async () => {
    if (!isCameraActive || !continuousMode || isScanning) return;
    
    try {
      const imageDataURL = captureImage();
      if (!imageDataURL) {
        console.log('No image captured');
        return;
      }
      
      const imageBlob = dataURLToBlob(imageDataURL);
      const formData = new FormData();
      formData.append('image', imageBlob, 'scan.jpg');
      
      // Detect face and ID card in the image
      const response = await axios.post('http://localhost:8000/detect_face_and_id', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
      });
      
      // Update detection states
      const faceDetected = response.data.face_detected || false;
      const idDetected = response.data.id_detected || false;
      const registerNumber = response.data.register_number || null;
      const liveness = response.data.liveness || null;
      const liveness_score = response.data.liveness_score || 0;
      
      // Update UI indicators
      setDetectedFace(faceDetected);
      setDetectedID(idDetected ? registerNumber : null);
      
      // Update liveness status
      if (faceDetected && liveness !== null) {
        setLivenessStatus(liveness ? 'live' : 'not-live');
        setLivenessScore(liveness_score);
      } else if (faceDetected) {
        setLivenessStatus('checking');
      } else {
        setLivenessStatus(null);
        setLivenessScore(0);
      }
      
      // Clear old errors if we have detections
      if (faceDetected || idDetected) {
        setError('');
      }
      
      // Debug logging
      console.log(`🔍 Detection Results: Face=${faceDetected}, ID=${idDetected}, Register=${registerNumber}`);
      
      // If both face and ID are detected, verify face matches register number and mark attendance
      if (faceDetected && idDetected && registerNumber) {
        console.log(`✅ Case A: Both detected! Face: ${faceDetected}, ID: ${registerNumber}, Live: ${liveness}`);
        // Clear messages before marking attendance
        setError('');
        if (liveness) {
          setSuccess('Face and ID detected with liveness verification! Marking attendance...');
        } else {
          setSuccess('Face and ID detected! Verifying identity and marking attendance...');
        }
        console.log(`🎯 About to call markAttendanceWithVerification with register: ${registerNumber}`);
        await markAttendanceWithVerification(imageBlob, registerNumber);
        console.log(`✅ markAttendanceWithVerification call completed`);
      } else {
        // Case C is now manual only through Forgot ID button
        // Provide feedback on what's missing
        if (!faceDetected && !idDetected) {
          // Only set error if not already showing this message
          if (error !== '📷 Position your face and ID card barcode in view') {
            setError('📷 Position your face and ID card barcode in view');
          }
        } else if (!faceDetected) {
          if (error !== '👤 Face not detected - look directly at the camera') {
            setError('👤 Face not detected - look directly at the camera');
          }
        } else if (!idDetected && faceDetected) {
          // Face detected but no ID - suggest using Forgot ID button
          if (error !== '🔍 ID card not detected. Use "Forgot ID Card" button for manual verification') {
            setError('🔍 ID card not detected. Use "Forgot ID Card" button for manual verification');
          }
        }
      }
      
    } catch (err) {
      console.error('Scan error:', err);
      // Show error briefly then clear for next scan
      setError('Scanning... Please hold steady');
      setTimeout(() => setError(''), 1000);
    }
  }, [isCameraActive, continuousMode, isScanning, captureImage, dataURLToBlob, markAttendanceWithVerification, error]);

  // Handle manual attendance scanning (for forgot ID case)
  const handleAttendanceScan = async () => {
    if (!isCameraActive) {
      setError('Please start the camera first');
      return;
    }

    setIsScanning(true);
    setError('');
    setScanResult(null);

    try {
      const imageDataURL = captureImage();
      if (!imageDataURL) {
        throw new Error('Failed to capture image');
      }

      const imageBlob = dataURLToBlob(imageDataURL);
      const formData = new FormData();
      formData.append('face_image', imageBlob, 'face.jpg');
      
      if (manualEntry && manualRegisterNumber) {
        formData.append('register_number', manualRegisterNumber);
      }

      const response = await axios.post('http://localhost:8000/mark_attendance', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
      });

      setScanResult(response.data);
      
      // Handle Case C - Missing ID
      if (response.data.attendance_status === 'Pending') {
        setSuccess('⚠️ ID card not detected. Attendance recorded. Notification sent to HOD and Parents.');
      } else {
        setSuccess(`✅ Attendance marked successfully: ${response.data.attendance_status}`);
      }
      
      // Auto-clear result after 5 seconds
      setTimeout(() => {
        setScanResult(null);
        setManualRegisterNumber('');
        setManualEntry(false);
      }, 5000);

    } catch (err) {
      console.error('Attendance scanning error:', err);
      handleApiError(err, setError, 'Failed to mark attendance');
    } finally {
      setIsScanning(false);
    }
  };

  // Start continuous scanning
  const startContinuousScanning = useCallback(() => {
    if (!isCameraActive) {
      setError('Please start the camera first');
      return;
    }
    
    setContinuousMode(true);
    setDetectedFace(false);
    setDetectedID(null);
    setError('');
    setSuccess('Auto-scan started. Position your face and ID card in view.');
  }, [isCameraActive]);

  // Handle student registration
  const handleCaptureForRegistration = () => {
    // Navigate to the enhanced registration page
    if (user.role === 'admin') {
      navigate('/admin/registration');
    } else if (user.role === 'department') {
      navigate('/department/registration');
    }
  };

  // Handle stream changes
  useEffect(() => {
    if (stream && videoRef.current && isCameraActive) {
      const assignStream = async () => {
        try {
          if (videoRef.current && videoRef.current.srcObject !== stream) {
            videoRef.current.srcObject = stream;
            // Small delay to let stream settle
            await new Promise(resolve => setTimeout(resolve, 100));
            if (videoRef.current && videoRef.current.paused) {
              await videoRef.current.play();
            }
          }
        } catch (e) {
          // Ignore abort errors as they're normal during stream switching
          if (e.name !== 'AbortError') {
            console.error('Video play error in useEffect:', e);
          }
        }
      };
      assignStream();
    }
  }, [stream, isCameraActive]);

  // Handle continuous scanning interval
  useEffect(() => {
    let interval = null;
    
    if (continuousMode && isCameraActive) {
      // Start scanning every 1 second (increased from 500ms for better performance)
      interval = setInterval(() => {
        performContinuousScan();
      }, 1000);
      
      // Also perform an initial scan
      performContinuousScan();
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [continuousMode, isCameraActive, performContinuousScan]);

  // Start camera automatically when component mounts
  useEffect(() => {
    startCamera();
    
    // Release camera completely on unmount
    return () => {
      releaseCamera();
    };
  }, []); // Empty dependency array to run only once on mount
  
  // Handle stream cleanup separately  
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'present': return '#4caf50';
      case 'late': return '#ff9800';
      case 'pending': return '#2196f3';
      default: return '#9e9e9e';
    }
  };

  return (
    <Container sx={styles.container}>
      {/* Mode Selection Header */}
      <Card sx={styles.modeCard}>
        <CardContent>
          <Grid container alignItems="center" spacing={2}>
            <Grid item>
              <Avatar sx={{ width: 60, height: 60, bgcolor: 'rgba(255,255,255,0.2)' }}>
                {isRegistrationMode ? <PersonAdd fontSize="large" /> : <QrCodeScanner fontSize="large" />}
              </Avatar>
            </Grid>
            <Grid item xs>
              <Typography variant="h4" gutterBottom>
                {isRegistrationMode ? 'Student Registration' : 'Attendance Scanner'}
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                {isRegistrationMode 
                  ? 'Register new students with face recognition and biometric data'
                  : 'Mark attendance using face recognition and ID verification'
                }
              </Typography>
            </Grid>
            <Grid item>
              <FormControlLabel
                control={
                  <Switch
                    checked={isRegistrationMode}
                    onChange={(e) => setIsRegistrationMode(e.target.checked)}
                    color="default"
                  />
                }
                label={isRegistrationMode ? "Registration Mode" : "Attendance Mode"}
                sx={{ color: 'white' }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Camera Section */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📷 Camera Feed
              </Typography>
              
              <Box sx={styles.webcamContainer}>
                {/* Always render video element to prevent DOM removal */}
                <video
                  ref={videoRef}
                  style={{
                    ...styles.webcam,
                    display: isCameraActive ? 'block' : 'none'
                  }}
                  autoPlay
                  playsInline
                  muted
                  controls={false}
                  width="640"
                  height="480"
                />
                
                {/* Detection Indicators */}
                {isCameraActive && continuousMode && (
                  <Box sx={{ 
                    position: 'absolute', 
                    top: 16, 
                    left: 16, 
                    right: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    zIndex: 20
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Chip
                        icon={<Face />}
                        label={detectedFace ? "✓ Face Detected" : "Scanning Face..."}
                        color={detectedFace ? "success" : "default"}
                        sx={{ 
                          backgroundColor: detectedFace ? '#4caf50' : 'rgba(255,255,255,0.9)',
                          animation: !detectedFace ? 'pulse 1.5s infinite' : 'none'
                        }}
                      />
                      <Box sx={{ 
                        color: 'white', 
                        backgroundColor: 'rgba(0,0,0,0.5)', 
                        padding: '4px 8px', 
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        AUTO-SCAN ACTIVE
                      </Box>
                      <Chip
                        icon={<Badge />}
                        label={detectedID ? `✓ ID: ${detectedID}` : "Scanning ID..."}
                        color={detectedID ? "success" : "default"}
                        sx={{ 
                          backgroundColor: detectedID ? '#4caf50' : 'rgba(255,255,255,0.9)',
                          animation: !detectedID ? 'pulse 1.5s infinite' : 'none'
                        }}
                      />
                    </Box>
                    
                    {/* Liveness Detection Indicator */}
                    {detectedFace && (
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Chip
                          icon={livenessStatus === 'live' ? <VerifiedUser /> : <Visibility />}
                          label={
                            livenessStatus === 'checking' ? 'Checking Liveness...' :
                            livenessStatus === 'live' ? `✓ Live Person (${(livenessScore * 100).toFixed(0)}%)` :
                            livenessStatus === 'not-live' ? '❌ Liveness Check Failed' :
                            'Liveness Check Pending'
                          }
                          color={
                            livenessStatus === 'live' ? 'success' :
                            livenessStatus === 'not-live' ? 'error' :
                            'warning'
                          }
                          sx={{ 
                            backgroundColor: 
                              livenessStatus === 'live' ? '#4caf50' :
                              livenessStatus === 'not-live' ? '#f44336' :
                              'rgba(255,193,7,0.9)',
                            animation: livenessStatus === 'checking' ? 'pulse 1s infinite' : 'none'
                          }}
                        />
                      </Box>
                    )}
                  </Box>
                )}
                
                {/* Show overlay when camera is not active */}
                {!isCameraActive && (
                  <Box sx={styles.overlay}>
                    <CameraAlt style={{ fontSize: 60, marginBottom: 16 }} />
                    <Typography variant="h6" gutterBottom>
                      Camera Not Active
                    </Typography>
                    <Typography variant="body2" style={{ marginBottom: 16 }}>
                      Click start camera to begin {isRegistrationMode ? 'registration' : 'attendance scanning'}
                    </Typography>
                  </Box>
                )}
                
                {/* Show capture button when camera is active and not in continuous mode */}
                {isCameraActive && !continuousMode && (
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    sx={styles.captureButton}
                    onClick={isRegistrationMode ? handleCaptureForRegistration : handleAttendanceScan}
                    disabled={isScanning}
                    startIcon={isScanning ? <CircularProgress size={20} /> : <CameraAlt />}
                  >
                    {isScanning ? 'Processing...' : (isRegistrationMode ? 'Capture for Registration' : 'Mark Attendance')}
                  </Button>
                )}
              </Box>

              {/* Liveness Instructions */}
              {showLivenessInstructions && (
                <Paper sx={{ p: 2, mt: 2, backgroundColor: '#e3f2fd', border: '2px solid #1976d2' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <VerifiedUser color="primary" />
                    Liveness Detection Instructions
                  </Typography>
                  <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
                    <li>Look directly at the camera</li>
                    <li>Ensure your face is clearly visible</li>
                    <li>Remove sunglasses or face coverings</li>
                    <li>Ensure good lighting on your face</li>
                    <li>Do not use photos or screens</li>
                    <li>Blink naturally during scanning</li>
                  </Typography>
                  <LinearProgress 
                    variant="indeterminate" 
                    sx={{ mt: 1 }}
                    color={livenessStatus === 'live' ? 'success' : 'primary'}
                  />
                </Paper>
              )}

              <Box mt={2} display="flex" gap={2} justifyContent="center" flexWrap="wrap">
                <Button
                  variant="contained"
                  color="primary"
                  onClick={startCamera}
                  disabled={isCameraActive}
                  startIcon={<CameraAlt />}
                >
                  Start Camera
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={stopCamera}
                  disabled={!isCameraActive}
                  startIcon={<Stop />}
                >
                  Stop Camera
                </Button>
                
                {/* Continuous Scanning Controls */}
                {!isRegistrationMode && (
                  <>
                    <Button
                      variant={continuousMode ? "contained" : "outlined"}
                      color="success"
                      onClick={continuousMode ? stopContinuousScanning : startContinuousScanning}
                      disabled={!isCameraActive}
                      startIcon={continuousMode ? <Stop /> : <QrCodeScanner />}
                    >
                      {continuousMode ? 'Stop Auto-Scan' : 'Start Auto-Scan'}
                    </Button>
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={autoStopOnSuccess}
                          onChange={(e) => setAutoStopOnSuccess(e.target.checked)}
                        />
                      }
                      label="Auto-stop on success"
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={showLivenessInstructions}
                          onChange={(e) => setShowLivenessInstructions(e.target.checked)}
                        />
                      }
                      label="Show Liveness Guide"
                    />
                  </>
                )}
                
                <Button
                  variant="contained"
                  color="warning"
                  size="small"
                  startIcon={<CardMembership />}
                  onClick={handleForgotId}
                  disabled={!isCameraActive || isScanning}
                >
                  Forgot ID Card
                </Button>
              </Box>

              {/* Manual Entry for Forgot ID Case */}
              {!isRegistrationMode && (
                <Box mt={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={manualEntry}
                        onChange={(e) => setManualEntry(e.target.checked)}
                      />
                    }
                    label="Manual Register Number Entry (Forgot ID Case)"
                  />
                  
                  {manualEntry && (
                    <TextField
                      fullWidth
                      label="Register Number"
                      value={manualRegisterNumber}
                      onChange={(e) => setManualRegisterNumber(e.target.value)}
                      placeholder="Enter student register number"
                      style={{ marginTop: 16 }}
                    />
                  )}
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Results Section */}
          {scanResult && (
            <Card sx={{
              ...styles.resultCard,
              borderLeft: `4px solid ${getStatusColor(scanResult.attendance_status || scanResult.case)}`,
            }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {scanResult.case === 'A' && '✅ Attendance Recorded'}
                  {scanResult.case === 'B' && '❌ Face & ID Mismatch'}
                  {scanResult.case === 'C' && '⚠️ Missing ID Card'}
                  {scanResult.case === 'D' && '⏰ Late Attendance'}
                  {!scanResult.case && '📋 Attendance Result'}
                </Typography>
                
                {scanResult.student && (
                  <Grid container spacing={2} alignItems="center">
                    <Grid item>
                      <Avatar sx={{
                        backgroundColor: scanResult.case === 'B' ? '#f44336' : '#4caf50'
                      }}>
                        {scanResult.case === 'B' ? <Warning /> : <Person />}
                      </Avatar>
                    </Grid>
                    <Grid item xs>
                      <Typography variant="h6">
                        {scanResult.student.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {scanResult.student.register_number} • {scanResult.student.department}
                      </Typography>
                    </Grid>
                    <Grid item>
                      <Chip
                        label={scanResult.attendance_status || scanResult.status}
                        sx={styles.statusChip}
                        style={{
                          backgroundColor: getStatusColor(scanResult.attendance_status),
                          color: 'white'
                        }}
                      />
                    </Grid>
                  </Grid>
                )}

                <Box mt={2}>
                  {/* Case-specific messages */}
                  {scanResult.case === 'A' && (
                    <Alert severity="success">
                      Face and ID verified successfully. Attendance marked as {scanResult.attendance_status}.
                    </Alert>
                  )}
                  {scanResult.case === 'B' && (
                    <Alert severity="error">
                      Face and ID do not match. Please ensure you're using your own ID card and try again.
                    </Alert>
                  )}
                  {scanResult.case === 'C' && (
                    <Alert severity="warning">
                      Barcode could not be read from ID card. Please ensure your ID card barcode is clean and undamaged. 
                      Attendance recorded using facial recognition only. Email notification sent to HOD and parents.
                    </Alert>
                  )}
                  {scanResult.case === 'D' && (
                    <Alert severity="info">
                      Late attendance recorded. Notification has been sent to HOD and parents. 
                      Please arrive before 8:45 AM in future.
                    </Alert>
                  )}
                </Box>

                <Box mt={2}>
                  <Typography variant="body2" color="textSecondary">
                    Time: {scanResult.time} | Method: {scanResult.verification_method}
                    {scanResult.face_confidence && (
                      <> | Confidence: {Math.round(scanResult.face_confidence * 100)}%</>
                    )}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Information Panel */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {isRegistrationMode ? '📝 Registration Guide' : '📋 Attendance Guide'}
              </Typography>
              
              {/* Continuous Scanning Status */}
              {!isRegistrationMode && continuousMode && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Auto-Scan Active</strong> - Hold your ID card visible while looking at the camera. 
                    Attendance will be marked automatically when both face and ID are detected.
                  </Typography>
                </Alert>
              )}
              
              {isRegistrationMode ? (
                <List>
                  <ListItem>
                    <ListItemText
                      primary="1. Navigate to Registration"
                      secondary="Click 'Capture for Registration' to access the full registration wizard"
                    />
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText
                      primary="2. Upload ID & Face Photo"
                      secondary="Follow the 5-step wizard to complete student enrollment"
                    />
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText
                      primary="3. System Registration"
                      secondary="Student data and biometric information will be stored securely"
                    />
                  </ListItem>
                </List>
              ) : (
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="✅ Case A: Face & ID Match"
                      secondary="Both verified → Attendance recorded automatically"
                    />
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText
                      primary="❌ Case B: Face & ID Mismatch"
                      secondary="Different person's ID → Attendance denied with alert"
                    />
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText
                      primary="⚠️ Case C: Barcode Not Readable"
                      secondary="Face detected but barcode scan failed → Manual entry + HOD/Parent notification"
                    />
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText
                      primary="⏰ Case D: Late Entry"
                      secondary="After 8:45 AM → Late attendance + notification"
                    />
                  </ListItem>
                </List>
              )}

              <Box mt={2}>
                <Typography variant="body2" color="textSecondary">
                  <Security style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  All data is secured with blockchain verification
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Current Time */}
          <Card style={{ marginTop: 16 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🕐 Current Time
              </Typography>
              <Typography variant="h4" color="primary">
                {new Date().toLocaleTimeString()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Cutoff: 8:45 AM
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />


      {/* Success/Error Snackbars */}
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess('')}
      >
        <Alert onClose={() => setSuccess('')} severity="success">
          {success}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
      >
        <Alert onClose={() => setError('')} severity="error">
          {error}
        </Alert>
      </Snackbar>

      {/* Forgot ID Dialog */}
      <Dialog
        open={forgotIdDialog}
        onClose={() => !forgotIdProcessing && setForgotIdDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <CardMembership color="warning" />
            <Typography variant="h6">Forgot ID Card - Manual Verification</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Please enter your register number manually to mark attendance without ID card.
            </Typography>
            <Typography variant="caption">
              Your attendance will be marked as pending and will require verification.
            </Typography>
          </Alert>
          
          <TextField
            autoFocus
            margin="dense"
            label="Register Number"
            fullWidth
            variant="outlined"
            value={forgotIdRegisterNumber}
            onChange={(e) => setForgotIdRegisterNumber(e.target.value)}
            placeholder="Enter your register number (e.g., 2227021)"
            disabled={forgotIdProcessing}
            helperText="Enter the student's register number for manual verification"
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setForgotIdDialog(false);
              setForgotIdRegisterNumber('');
            }} 
            disabled={forgotIdProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={submitForgotIdCase}
            color="primary"
            variant="contained"
            disabled={!forgotIdRegisterNumber || forgotIdProcessing}
            startIcon={forgotIdProcessing ? <CircularProgress size={20} /> : <CheckCircle />}
          >
            {forgotIdProcessing ? 'Submitting...' : 'Submit for Verification'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ScannerPage;
