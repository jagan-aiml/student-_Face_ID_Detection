import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Tab,
  Tabs,
  Alert,
  CircularProgress,
  Avatar,
  useTheme
} from '@mui/material';
import {
  AdminPanelSettings,
  School,
  Person,
  Security
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const useStyles = (theme) => ({
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: theme.spacing(2),
  },
  paper: {
    padding: theme.spacing(4),
    borderRadius: theme.spacing(2),
    maxWidth: 450,
    width: '100%',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
  },
  header: {
    textAlign: 'center',
    marginBottom: theme.spacing(3),
  },
  logo: {
    width: theme.spacing(8),
    height: theme.spacing(8),
    margin: '0 auto',
    marginBottom: theme.spacing(2),
    background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
  },
  title: {
    fontWeight: 600,
    color: theme.palette.primary.main,
    marginBottom: theme.spacing(1),
  },
  subtitle: {
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(2),
  },
  form: {
    width: '100%',
    marginTop: theme.spacing(1),
  },
  submit: {
    margin: theme.spacing(3, 0, 2),
    padding: theme.spacing(1.5),
    borderRadius: theme.spacing(1),
    textTransform: 'none',
    fontSize: '1.1rem',
    fontWeight: 600,
  },
  tabContent: {
    padding: theme.spacing(2, 0),
  },
  roleDescription: {
    backgroundColor: theme.palette.grey[50],
    padding: theme.spacing(2),
    borderRadius: theme.spacing(1),
    marginBottom: theme.spacing(2),
    border: `1px solid ${theme.palette.grey[200]}`,
  },
  credentialInfo: {
    backgroundColor: '#e3f2fd',
    padding: theme.spacing(1.5),
    borderRadius: theme.spacing(1),
    marginTop: theme.spacing(2),
  },
  tabs: {
    '& .MuiTab-root': {
      textTransform: 'none',
      minWidth: 0,
      fontWeight: 600,
      '&.Mui-selected': {
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.common.white,
      },
    },
  }
});

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && children}
    </div>
  );
}

const Login = () => {
  const theme = useTheme();
  const classes = useStyles(theme);
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    departmentCode: '',
    registerNumber: '',
    dateOfBirth: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      switch (user.role) {
        case 'admin':
          navigate('/admin');
          break;
        case 'department':
          navigate('/department');
          break;
        case 'student':
          navigate('/student');
          break;
        default:
          navigate('/');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const roleInfo = [
    {
      title: 'Admin',
      icon: <AdminPanelSettings />,
      description: 'Complete system administration, user management, and system-wide analytics.',
      credentials: 'Username: admin | Password: admin123',
      defaultCredentials: { username: 'admin', password: 'admin123' },
      loginType: 'admin'
    },
    {
      title: 'Department',
      icon: <School />,
      description: 'Department management, attendance scanning, student registration, and verification workflow.',
      credentials: 'Department Code: AIML | Password: aiml123',
      defaultCredentials: { departmentCode: 'AIML', password: 'aiml123' },
      loginType: 'department'
    },
    {
      title: 'Student/Parent',
      icon: <Person />,
      description: 'Personal attendance tracking and history.',
      credentials: 'Register Number: 20CS001 | Date of Birth: 2000-01-01',
      defaultCredentials: { registerNumber: '20CS001', dateOfBirth: '2000-01-01' },
      loginType: 'student'
    }
  ];

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setFormData({
      username: '',
      password: '',
      departmentCode: '',
      registerNumber: '',
      dateOfBirth: ''
    });
    setError('');
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const currentRole = roleInfo[tabValue];
    let credentials = {};
    let isValid = false;

    // Validate based on login type
    switch (currentRole.loginType) {
      case 'admin':
        if (formData.username && formData.password) {
          credentials = { username: formData.username, password: formData.password };
          isValid = true;
        }
        break;
      case 'department':
        if (formData.departmentCode && formData.password) {
          credentials = { departmentCode: formData.departmentCode, password: formData.password };
          isValid = true;
        }
        break;
      case 'student':
        if (formData.registerNumber && formData.dateOfBirth) {
          credentials = { registerNumber: formData.registerNumber, dateOfBirth: formData.dateOfBirth };
          isValid = true;
        }
        break;
    }

    if (!isValid) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await login(credentials, currentRole.loginType);
      
      if (!result.success) {
        setError(result.error || 'Login failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (credentials) => {
    setFormData(credentials);
  };

  return (
    <Container sx={classes.container}>
      <Paper sx={classes.paper}>
        <Box sx={classes.header}>
          <Avatar sx={classes.logo}>
            <Security fontSize="large" />
          </Avatar>
          <Typography variant="h4" sx={classes.title}>
            Smart Attendance System
          </Typography>
        </Box>

        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          sx={classes.tabs}
          variant="fullWidth"
          indicatorColor="primary"
        >
          {roleInfo.map((role, index) => (
            <Tab 
              key={index}
              icon={role.icon}
              label={role.title}
            />
          ))}
        </Tabs>

        {roleInfo.map((role, index) => (
          <TabPanel key={index} value={tabValue} index={index}>
            <Box sx={classes.tabContent}>

              <form style={classes.form} onSubmit={handleSubmit}>
                {/* Admin Login Fields */}
                {tabValue === 0 && (
                  <>
                    <TextField
                      variant="outlined"
                      margin="normal"
                      required
                      fullWidth
                      id="username"
                      label="Username"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      autoComplete="username"
                      autoFocus
                    />
                    <TextField
                      variant="outlined"
                      margin="normal"
                      required
                      fullWidth
                      name="password"
                      label="Password"
                      type="password"
                      id="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      autoComplete="current-password"
                    />
                  </>
                )}

                {/* Department Login Fields */}
                {tabValue === 1 && (
                  <>
                    <TextField
                      variant="outlined"
                      margin="normal"
                      required
                      fullWidth
                      id="departmentCode"
                      label="Department Code"
                      name="departmentCode"
                      value={formData.departmentCode}
                      onChange={handleInputChange}
                      autoComplete="username"
                      autoFocus
                    />
                    <TextField
                      variant="outlined"
                      margin="normal"
                      required
                      fullWidth
                      name="password"
                      label="Password"
                      type="password"
                      id="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      autoComplete="current-password"
                    />
                  </>
                )}

                {/* Student/Parent Login Fields */}
                {tabValue === 2 && (
                  <>
                    <TextField
                      variant="outlined"
                      margin="normal"
                      required
                      fullWidth
                      id="registerNumber"
                      label="Register Number"
                      name="registerNumber"
                      value={formData.registerNumber}
                      onChange={handleInputChange}
                      autoComplete="username"
                      autoFocus
                    />
                    <TextField
                      variant="outlined"
                      margin="normal"
                      required
                      fullWidth
                      name="dateOfBirth"
                      label="Date of Birth"
                      type="date"
                      id="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                  </>
                )}

                {error && (
                  <Alert severity="error" style={{ marginTop: 16 }}>
                    {error}
                  </Alert>
                )}

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  sx={classes.submit}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Sign In'}
                </Button>
              </form>

            </Box>
          </TabPanel>
        ))}

        
      </Paper>
    </Container>
  );
};

export default Login;
