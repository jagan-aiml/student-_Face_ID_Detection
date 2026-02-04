import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Chip,
  Avatar,
  Divider
} from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import {
  CameraAlt,
  QrCodeScanner,
  Check,
  Warning,
  Error,
  Person,
  Schedule,
  Verified,
  Stop
} from '@mui/icons-material';
import axios from 'axios';

const useStyles = (theme) => ({
  container: {
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
  },
  header: {
    marginBottom: theme.spacing(3),
    textAlign: 'center',
  },
  scannerCard: {
    padding: theme.spacing(3),
    textAlign: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    marginBottom: theme.spacing(3),
  },
  webcamContainer: {
    position: 'relative',
    display: 'inline-block',
    borderRadius: theme.spacing(1),
    overflow: 'hidden',
    marginBottom: theme.spacing(2),
  },
  webcam: {
    width: '100%',
    maxWidth: 640,
    height: 480,
  },
  captureButton: {
    margin: theme.spacing(2),
    padding: theme.spacing(1.5, 4),
    fontSize: '1.1rem',
    fontWeight: 600,
  },
  resultCard: {
    marginTop: theme.spacing(2),
    border: `2px solid ${theme.palette.success.main}`,
  },
  errorCard: {
    marginTop: theme.spacing(2),
    border: `2px solid ${theme.palette.error.main}`,
  },
  warningCard: {
    marginTop: theme.spacing(2),
    border: `2px solid ${theme.palette.warning.main}`,
  },
  statusChip: {
    fontSize: '1rem',
    fontWeight: 600,
    padding: theme.spacing(1, 2),
  },
  studentInfo: {
    padding: theme.spacing(2),
    backgroundColor: theme.palette.grey[50],
    borderRadius: theme.spacing(1),
    margin: theme.spacing(2, 0),
  },
  confidenceScore: {
    textAlign: 'center',
    margin: theme.spacing(1, 0),
  },
  modeSelector: {
    marginBottom: theme.spacing(3),
  },
  modeCard: {
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: theme.shadows[4],
    },
    '&.active': {
      border: `2px solid ${theme.palette.primary.main}`,
      backgroundColor: theme.palette.primary.light,
      color: 'white',
    },
  },
});

const AttendanceScanner = () => {
  const theme = useTheme();
  const classes = useStyles(theme);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('face_qr'); // face_qr, face_only, manual
  const [manualRegister, setManualRegister] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrImage, setQrImage] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState(null);

  const modes = [
    {
      id: 'face_qr',
      title: 'Face + QR Scan',
      description: 'Complete verification with face recognition and ID card scan',
      icon: <QrCodeScanner />,
      color: 'primary'
    },
    {
      id: 'face_only',
      title: 'Face Only',
      description: 'Face recognition without ID card (requires verification)',
      icon: <Person />,
      color: 'secondary'
    },
    {
      id: 'manual',
      title: 'Manual Entry',
      description: 'Face scan with manual register number entry',
      icon: <Schedule />,
      color: 'default'
    }
  ];

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
      
      // Otherwise get new stream
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Ensure video plays
        videoRef.current.play().catch(err => {
          console.error('Error playing video:', err);
        });
      }
      setIsCameraActive(true);
      setError('');
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Failed to access camera. Please ensure camera permissions are granted.');
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

  // Capture image from video
  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

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

  const handleScan = async () => {
    if (!isCameraActive) {
      setError('Please start the camera first');
      return;
    }

    if (mode === 'manual' && !manualRegister.trim()) {
      setError('Please enter register number for manual mode');
      return;
    }

    setScanning(true);
    setError('');
    setResult(null);

    try {
      // Capture face image
      const faceImage = captureImage();
      if (!faceImage) {
        throw new Error('Failed to capture image');
      }

      // Convert data URL to blob
      const blob = dataURLToBlob(faceImage);

      // Prepare form data
      const formData = new FormData();
      formData.append('face_image', blob, 'face.jpg');

      if (mode === 'face_qr' && qrImage) {
        const qrResponse = await fetch(qrImage);
        const qrBlob = await qrResponse.blob();
        formData.append('qr_image', qrBlob, 'qr.jpg');
      }

      if (mode === 'manual') {
        formData.append('register_number', manualRegister.trim());
      }

      // Submit to backend
      const apiResponse = await axios.post('http://localhost:8000/mark_attendance', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResult(apiResponse.data);
      
      // Clear manual register after successful scan
      if (mode === 'manual') {
        setManualRegister('');
      }

    } catch (error) {
      console.error('Scan error:', error);
      
      let errorMessage = 'Failed to mark attendance';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setScanning(false);
    }
  };

  const handleQRUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setQrImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present':
        return 'success';
      case 'Late':
        return 'warning';
      case 'Pending':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Present':
        return <Check />;
      case 'Late':
        return <Warning />;
      case 'Pending':
        return <Schedule />;
      default:
        return <Error />;
    }
  };

  const renderResult = () => {
    if (!result) return null;

    const cardClass = result.status === 'success' 
      ? (result.attendance_status === 'Present' ? classes.resultCard : 
         result.attendance_status === 'Late' ? classes.warningCard : classes.warningCard)
      : classes.errorCard;

    return (
      <Card className={cardClass}>
        <CardContent>
          {result.status === 'success' ? (
            <Box>
              <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
                <Chip
                  icon={getStatusIcon(result.attendance_status)}
                  label={result.attendance_status}
                  color={getStatusColor(result.attendance_status)}
                  className={classes.statusChip}
                />
              </Box>

              <Box className={classes.studentInfo}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Student Name
                    </Typography>
                    <Typography variant="h6">
                      {result.student.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Register Number
                    </Typography>
                    <Typography variant="h6">
                      {result.student.register_number}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Department
                    </Typography>
                    <Typography variant="body1">
                      {result.student.department}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Year
                    </Typography>
                    <Typography variant="body1">
                      {result.student.year}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Section
                    </Typography>
                    <Typography variant="body1">
                      {result.student.section}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Time
                  </Typography>
                  <Typography variant="body1">
                    {result.time}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Verification Method
                  </Typography>
                  <Typography variant="body1">
                    {result.verification_method.replace('_', ' + ').toUpperCase()}
                  </Typography>
                </Grid>
              </Grid>

              {result.face_confidence && (
                <Box className={classes.confidenceScore}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Face Recognition Confidence
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {(result.face_confidence * 100).toFixed(1)}%
                  </Typography>
                </Box>
              )}

              <Alert severity="success" style={{ marginTop: 16 }}>
                {result.message}
              </Alert>
            </Box>
          ) : (
            <Alert severity="error">
              {result.message}
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

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

  return (
    <Container maxWidth="lg" className={classes.container}>
      <Box className={classes.header}>
        <Typography variant="h4" gutterBottom>
          📷 Attendance Scanner
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Capture student attendance using face recognition and QR verification
        </Typography>
      </Box>

      {/* Mode Selection */}
      <Box className={classes.modeSelector}>
        <Typography variant="h6" gutterBottom>
          Select Scanning Mode
        </Typography>
        <Grid container spacing={2}>
          {modes.map((modeOption) => (
            <Grid item xs={12} md={4} key={modeOption.id}>
              <Card
                className={`${classes.modeCard} ${mode === modeOption.id ? 'active' : ''}`}
                onClick={() => setMode(modeOption.id)}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    {modeOption.icon}
                    <Typography variant="h6" style={{ marginLeft: 8 }}>
                      {modeOption.title}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    {modeOption.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Scanner Interface */}
      <Card className={classes.scannerCard}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            {modes.find(m => m.id === mode)?.title} Scanner
          </Typography>
          
          <Box className={classes.webcamContainer}>
            {isCameraActive ? (
              <video
                ref={videoRef}
                className={classes.webcam}
                autoPlay={true}
                playsInline={true}
                muted={true}
                onLoadedMetadata={(e) => {
                  e.target.play().catch(err => console.error('Video play error:', err));
                }}
                style={{
                  width: '100%',
                  maxWidth: 640,
                  height: 480,
                  objectFit: 'cover',
                  backgroundColor: '#000'
                }}
              />
            ) : (
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                flexDirection="column"
                style={{
                  width: '100%',
                  maxWidth: 640,
                  height: 480,
                  backgroundColor: '#000',
                  color: 'white'
                }}
              >
                <CameraAlt style={{ fontSize: 60, marginBottom: 16 }} />
                <Typography variant="h6" gutterBottom>
                  Camera Not Active
                </Typography>
                <Typography variant="body2" style={{ marginBottom: 16 }}>
                  Click start camera to begin scanning
                </Typography>
              </Box>
            )}
          </Box>

          <Box mt={2} display="flex" gap={2} justifyContent="center">
            <Button
              variant="outlined"
              color="inherit"
              onClick={startCamera}
              disabled={isCameraActive}
              startIcon={<CameraAlt />}
              style={{ color: 'white', borderColor: 'white' }}
            >
              Start Camera
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              onClick={stopCamera}
              disabled={!isCameraActive}
              startIcon={<Stop />}
              style={{ color: 'white', borderColor: 'white' }}
            >
              Stop Camera
            </Button>
          </Box>

          {/* Additional inputs based on mode */}
          {mode === 'face_qr' && (
            <Box mb={2}>
              <Button
                variant="outlined"
                component="label"
                style={{ color: 'white', borderColor: 'white', margin: 8 }}
              >
                Upload QR/ID Image
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleQRUpload}
                />
              </Button>
              {qrImage && (
                <Typography variant="body2" style={{ marginTop: 8 }}>
                  ✅ QR Image uploaded
                </Typography>
              )}
            </Box>
          )}

          {mode === 'manual' && (
            <Box mb={2}>
              <TextField
                label="Register Number"
                value={manualRegister}
                onChange={(e) => setManualRegister(e.target.value)}
                variant="outlined"
                size="small"
                style={{ 
                  backgroundColor: 'white',
                  borderRadius: 4,
                  width: 200
                }}
              />
            </Box>
          )}

          <Button
            variant="contained"
            color="secondary"
            size="large"
            onClick={handleScan}
            disabled={scanning}
            className={classes.captureButton}
            startIcon={scanning ? <CircularProgress size={20} /> : <CameraAlt />}
          >
            {scanning ? 'Processing...' : 'Capture & Mark Attendance'}
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert severity="error" style={{ marginTop: 16 }}>
          {error}
        </Alert>
      )}

      {/* Results Display */}
      {renderResult()}

      {/* Info Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Scanning Instructions</DialogTitle>
        <DialogContent>
          <Typography paragraph>
            <strong>Face + QR Mode:</strong> Position your face clearly in the camera and upload a clear image of your QR/ID card.
          </Typography>
          <Typography paragraph>
            <strong>Face Only Mode:</strong> Only face recognition will be used. This may require manual verification.
          </Typography>
          <Typography paragraph>
            <strong>Manual Mode:</strong> Enter the register number manually along with face verification.
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Ensure good lighting and clear visibility of your face for best results.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} color="primary">
            Got it
          </Button>
        </DialogActions>
      </Dialog>

      {/* Instructions */}
      <Box mt={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📋 Instructions
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  1. Select Mode
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Choose the appropriate scanning mode based on available verification methods.
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  2. Position Correctly
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Ensure your face is clearly visible with good lighting. Upload QR image if required.
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  3. Capture Attendance
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Click the capture button to process attendance. Results will be displayed immediately.
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>

      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </Container>
  );
};

export default AttendanceScanner;
