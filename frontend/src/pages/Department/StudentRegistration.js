import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  Avatar,
  Alert,
  CircularProgress,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import {
  PersonAdd,
  School,
  CameraAlt,
  CheckCircle,
  Upload,
  Face,
  ContactMail
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { handleApiError, extractErrorMessage } from '../../utils/errorHandler';

// Styled components for Material-UI v5
const StyledContainer = styled(Container)(({ theme }) => ({
  paddingTop: theme.spacing(2),
  paddingBottom: theme.spacing(2),
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  minHeight: 400,
}));

const StyledStepper = styled(Stepper)(({ theme }) => ({
  backgroundColor: 'transparent',
  marginBottom: theme.spacing(3),
}));

const steps = [
  'ID Card Upload',
  'Basic Information',
  'Parent/Guardian Details', 
  'Face Registration',
  'Complete Registration'
];

const StudentRegistration = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [departments, setDepartments] = useState([]);
  
  // Form data
  const [studentData, setStudentData] = useState({
    register_number: '',
    name: '',
    email: '',
    phone: '',
    department: '',
    year: 1,
    section: '',
    date_of_birth: '',
    parent_name: '',
    parent_email: '',
    parent_phone: ''
  });
  
  // Registration process data
  const [idCardImage, setIdCardImage] = useState(null);
  const [barcodeDetecting, setBarcodeDetecting] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState(null);
  const [faceImage, setFaceImage] = useState(null);
  const [registrationResult, setRegistrationResult] = useState(null);
  
  const idCardInputRef = React.useRef(null);
  const faceImageInputRef = React.useRef(null);

  // Fetch departments from database
  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/departments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setDepartments(response.data);
    } catch (error) {
      console.error('Error fetching departments:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load departments. Please refresh the page.'
      });
    }
  };

  // Load departments on component mount
  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleInputChange = (field, value) => {
    setStudentData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNext = async () => {
    if (activeStep === steps.length - 1) {
      await handleCompleteRegistration();
      return;
    }

    // Validation for each step
    if (activeStep === 0) {
      // ID Card Upload step - optional but recommended
      if (!idCardImage) {
        setAlert({
          type: 'warning',
          message: 'ID card upload is recommended for automatic register number detection'
        });
      }
    }

    if (activeStep === 1) {
      const requiredFields = ['register_number', 'name', 'email', 'phone', 'date_of_birth', 'department', 'section'];
      const missingFields = requiredFields.filter(field => !studentData[field]);
      
      if (missingFields.length > 0) {
        setAlert({
          type: 'error',
          message: 'Please fill in all required fields'
        });
        return;
      }
    }

    if (activeStep === 2) {
      const requiredFields = ['parent_name', 'parent_email', 'parent_phone'];
      const missingFields = requiredFields.filter(field => !studentData[field]);
      
      if (missingFields.length > 0) {
        setAlert({
          type: 'error',
          message: 'Please fill in all parent/guardian details'
        });
        return;
      }
    }

    if (activeStep === 3 && !faceImage) {
      setAlert({
        type: 'error',
        message: 'Please upload a face image'
      });
      return;
    }


    setActiveStep(prev => prev + 1);
    setAlert(null);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
    setAlert(null);
  };

  const handleIdCardUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setIdCardImage(file);
      handleBarcodeDetection(file);
    }
  };

  const handleBarcodeDetection = async (file) => {
    setBarcodeDetecting(true);
    setBarcodeResult(null);
    
    try {
      const formData = new FormData();
      formData.append('id_card_image', file);
      
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }
      
      const response = await axios.post('http://localhost:8000/detect_barcode', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Barcode detection response:', response.data);
      setBarcodeResult(response.data);
      
      if (response.data.success && response.data.register_number) {
        // Auto-fill register number
        handleInputChange('register_number', response.data.register_number);
        
        setAlert({
          type: 'success',
          message: `Register number ${response.data.register_number} detected and auto-filled!`
        });
      } else {
        setAlert({
          type: 'info',
          message: response.data.message || 'No register number detected. Please enter manually.'
        });
      }
      
    } catch (error) {
      console.error('Barcode detection error:', error);
      
      const errorMessage = extractErrorMessage(error);
      
      setBarcodeResult({
        success: false,
        message: errorMessage,
        register_number: null
      });
      
      setAlert({
        type: 'error',
        message: errorMessage
      });
    } finally {
      setBarcodeDetecting(false);
    }
  };

  const handleFaceImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFaceImage(e.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        setAlert({
          type: 'error',
          message: 'Please select a valid image file (JPG, PNG, etc.)'
        });
      }
    }
  };

  const handleFaceImageClick = () => {
    faceImageInputRef.current?.click();
  };


  const handleCompleteRegistration = async () => {
    setLoading(true);
    try {
      // Step 1: Register student basic info
      const studentResponse = await axios.post('http://localhost:8000/register_student', studentData);
      
      // Step 2: Upload face encoding
      if (faceImage) {
        const faceBlob = await (await fetch(faceImage)).blob();
        const faceFormData = new FormData();
        faceFormData.append('face_image', faceBlob, 'face.jpg');
        
        await axios.post(
          `http://localhost:8000/students/${studentData.register_number}/face-encoding`,
          faceFormData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
      }

      setRegistrationResult({
        success: true,
        student: studentResponse.data
      });
      
      setAlert({
        type: 'success',
        message: 'Student registered successfully!'
      });

    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = extractErrorMessage(error);
      setAlert({
        type: 'error',
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartNew = () => {
    setActiveStep(0);
    setStudentData({
      register_number: '',
      name: '',
      email: '',
      phone: '',
      department: '',
      year: 1,
      section: '',
      date_of_birth: '',
      parent_name: '',
      parent_email: '',
      parent_phone: ''
    });
    setIdCardImage(null);
    setBarcodeResult(null);
    setFaceImage(null);
    setRegistrationResult(null);
    setAlert(null);
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom textAlign="center">
              📄 Upload Student ID Card
            </Typography>
            <Typography variant="body2" color="textSecondary" textAlign="center" gutterBottom>
              Upload the student's ID card to automatically detect and extract the register number from barcode
            </Typography>
            
            <Box textAlign="center" p={3}>
              <input
                type="file"
                accept="image/*"
                onChange={handleIdCardUpload}
                style={{ display: 'none' }}
                ref={idCardInputRef}
              />
              
              {!idCardImage ? (
                <Box>
                  <Upload style={{ fontSize: 80, color: '#ccc', marginBottom: 16 }} />
                  <br />
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Upload />}
                    onClick={() => idCardInputRef.current.click()}
                    disabled={barcodeDetecting}
                  >
                    Upload ID Card
                  </Button>
                  <Typography variant="caption" display="block" style={{ marginTop: 8 }}>
                    Supports JPG, PNG, and other image formats
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <img 
                    src={URL.createObjectURL(idCardImage)} 
                    alt="ID Card" 
                    style={{ 
                      maxWidth: 300, 
                      maxHeight: 200, 
                      borderRadius: 8,
                      border: '2px solid #4caf50',
                      marginBottom: 16
                    }} 
                  />
                  <br />
                  
                  {barcodeDetecting ? (
                    <Box>
                      <CircularProgress size={24} />
                      <Typography variant="body2" style={{ marginTop: 8 }}>
                        Detecting barcode...
                      </Typography>
                    </Box>
                  ) : barcodeResult && typeof barcodeResult === 'object' && barcodeResult.hasOwnProperty('success') ? (
                    <Box>
                      <Chip
                        icon={barcodeResult.success ? <CheckCircle /> : <School />}
                        label={barcodeResult.success ? 
                          `Register Number: ${barcodeResult.register_number || 'Unknown'}` : 
                          (barcodeResult.message || 'No barcode detected')
                        }
                        color={barcodeResult.success ? "success" : "default"}
                        style={{ margin: 8 }}
                      />
                      {barcodeResult.student_exists && barcodeResult.student_name && (
                        <Typography variant="caption" color="error" display="block">
                          ⚠️ Student already exists: {barcodeResult.student_name}
                        </Typography>
                      )}
                    </Box>
                  ) : null}
                  
                  <br />
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setIdCardImage(null);
                      setBarcodeResult(null);
                      handleInputChange('register_number', '');
                    }}
                    style={{ marginTop: 8 }}
                  >
                    Upload Different Image
                  </Button>
                </Box>
              )}
            </Box>
          </Box>
        );

      case 1:
        return (
          <Grid container spacing={3} sx={{ '& .MuiTextField-root': { marginBottom: 2 } }}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Register Number *"
                value={studentData.register_number}
                onChange={(e) => handleInputChange('register_number', e.target.value)}
                fullWidth
                variant="outlined"
                placeholder="e.g., 20CS001"
                helperText={
                  barcodeResult && typeof barcodeResult === 'object' && barcodeResult.success 
                    ? "Auto-filled from ID card barcode" 
                    : "Enter manually or upload ID card"
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Full Name *"
                value={studentData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Email *"
                type="email"
                value={studentData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Phone Number *"
                value={studentData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Date of Birth *"
                type="date"
                value={studentData.date_of_birth}
                onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                fullWidth
                variant="outlined"
                InputLabelProps={{
                  shrink: true,
                }}
                helperText="Required for student/parent login credentials"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Department *</InputLabel>
                <Select
                  value={studentData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  label="Department *"
                  disabled={departments.length === 0}
                >
                  {departments.length === 0 ? (
                    <MenuItem disabled>Loading departments...</MenuItem>
                  ) : (
                    departments.map((dept) => (
                      <MenuItem key={dept.code} value={dept.code}>
                        {dept.name} ({dept.code})
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Year</InputLabel>
                <Select
                  value={studentData.year}
                  onChange={(e) => handleInputChange('year', e.target.value)}
                  label="Year"
                >
                  <MenuItem value={1}>1st Year</MenuItem>
                  <MenuItem value={2}>2nd Year</MenuItem>
                  <MenuItem value={3}>3rd Year</MenuItem>
                  <MenuItem value={4}>4th Year</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Section *</InputLabel>
                <Select
                  value={studentData.section}
                  onChange={(e) => handleInputChange('section', e.target.value)}
                  label="Section *"
                >
                  <MenuItem value="A">Section A</MenuItem>
                  <MenuItem value="B">Section B</MenuItem>
                  <MenuItem value="C">Section C</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3} sx={{ '& .MuiTextField-root': { marginBottom: 2 } }}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                👨‍👩‍👧‍👦 Parent/Guardian Information
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Parent/Guardian Name *"
                value={studentData.parent_name}
                onChange={(e) => handleInputChange('parent_name', e.target.value)}
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Parent/Guardian Email *"
                type="email"
                value={studentData.parent_email}
                onChange={(e) => handleInputChange('parent_email', e.target.value)}
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Parent/Guardian Phone *"
                value={studentData.parent_phone}
                onChange={(e) => handleInputChange('parent_phone', e.target.value)}
                fullWidth
                variant="outlined"
              />
            </Grid>
          </Grid>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom textAlign="center">
              📷 Face Registration
            </Typography>
            <Typography variant="body2" color="textSecondary" textAlign="center" gutterBottom>
              Upload a clear face photo of the student for facial recognition system
            </Typography>
            
            <Box sx={{ textAlign: 'center', marginBottom: 2 }}>
              {!faceImage ? (
                <Box>
                  <Box
                    sx={{
                      border: '3px dashed #1976d2',
                      borderRadius: 2,
                      padding: 4,
                      backgroundColor: '#f5f5f5',
                      cursor: 'pointer',
                      minHeight: 200,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      '&:hover': {
                        backgroundColor: '#e3f2fd',
                        borderColor: '#1565c0'
                      }
                    }}
                    onClick={handleFaceImageClick}
                  >
                    <Face sx={{ fontSize: 48, color: '#1976d2', marginBottom: 2 }} />
                    <Typography variant="h6" color="primary" gutterBottom>
                      Upload Student Face Photo
                    </Typography>
                    <Typography variant="body2" color="textSecondary" align="center">
                      Click here to select a clear face photo of the student
                      <br />
                      (JPG, PNG, or other image formats)
                    </Typography>
                  </Box>
                  <input
                    type="file"
                    ref={faceImageInputRef}
                    onChange={handleFaceImageUpload}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Upload />}
                    onClick={handleFaceImageClick}
                    sx={{ margin: 2, padding: '8px 24px' }}
                  >
                    Select Face Photo
                  </Button>
                </Box>
              ) : (
                <Box>
                  <img src={faceImage} alt="Uploaded face photo" style={{ maxWidth: 200, maxHeight: 200, borderRadius: 8, border: '2px solid #4caf50' }} />
                  <br />
                  <Chip
                    icon={<CheckCircle />}
                    label="Face Photo Uploaded Successfully"
                    color="primary"
                    style={{ margin: 16 }}
                  />
                  <br />
                  <Button
                    variant="outlined"
                    onClick={() => setFaceImage(null)}
                  >
                    Change Photo
                  </Button>
                </Box>
              )}
            </Box>
          </Box>
        );

      case 4:
        if (registrationResult?.success) {
          return (
            <Card sx={{ textAlign: 'center', padding: 4, background: 'linear-gradient(135deg, #4caf50 0%, #81c784 100%)', color: 'white' }}>
              <CardContent>
                <CheckCircle style={{ fontSize: 80, marginBottom: 16 }} />
                <Typography variant="h4" gutterBottom>
                  Registration Complete!
                </Typography>
                <Typography variant="h6" gutterBottom>
                  {studentData.name} ({studentData.register_number})
                </Typography>
                <Typography variant="body1" style={{ marginBottom: 24 }}>
                  Student has been successfully registered in the system
                </Typography>
                
                <Grid container spacing={2} style={{ marginTop: 24 }}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2">✅ Basic Information</Typography>
                    <Typography variant="subtitle2">✅ Parent Contact Details</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2">✅ Face Recognition Setup</Typography>
                    <Typography variant="subtitle2">✅ QR Code Generated</Typography>
                  </Grid>
                </Grid>

                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={handleStartNew}
                  style={{ marginTop: 24, color: 'white', borderColor: 'white' }}
                >
                  Register Another Student
                </Button>
              </CardContent>
            </Card>
          );
        }
        
        return (
          <Box textAlign="center" p={4}>
            <Typography variant="h6" gutterBottom>
              Review Registration Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Student: {studentData.name}</Typography>
                <Typography variant="body2">Register: {studentData.register_number}</Typography>
                <Typography variant="body2">Department: {studentData.department}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Parent: {studentData.parent_name}</Typography>
                <Typography variant="body2">Email: {studentData.parent_email}</Typography>
                <Typography variant="body2">Phone: {studentData.parent_phone}</Typography>
              </Grid>
            </Grid>
          </Box>
        );
    }
  };

  return (
    <StyledContainer maxWidth="md">
      <Typography variant="h4" gutterBottom textAlign="center">
        🎓 Student Registration
      </Typography>
      <Typography variant="subtitle1" color="textSecondary" textAlign="center" gutterBottom>
        Complete 5-step registration with biometric data collection
      </Typography>

      <StyledStepper activeStep={activeStep}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </StyledStepper>

      {alert && (
        <Alert severity={alert.type} style={{ marginBottom: 24 }}>
          {alert.message}
        </Alert>
      )}

      <StyledPaper>
        {renderStepContent()}

        {activeStep < steps.length - 1 || !registrationResult?.success ? (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
            >
              Back
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleNext}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 
               activeStep === steps.length - 1 ? 'Complete Registration' : 'Next'}
            </Button>
          </Box>
        ) : null}
      </StyledPaper>
    </StyledContainer>
  );
};

export default StudentRegistration;
