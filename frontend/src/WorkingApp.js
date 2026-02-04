import React, { useState } from 'react';
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
  Card,
  CardContent,
  Grid
} from '@mui/material';
import { 
  AdminPanelSettings, 
  School, 
  Person,
  Dashboard,
  QrCodeScanner,
  Assessment
} from '@mui/icons-material';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function WorkingApp() {
  const [tabValue, setTabValue] = useState(0);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [error, setError] = useState('');

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError('');
    // Pre-fill credentials based on tab
    switch(newValue) {
      case 0:
        setLoginData({ username: 'admin', password: 'password' });
        break;
      case 1:
        setLoginData({ username: 'CS', password: 'password' });
        break;
      case 2:
        setLoginData({ username: '20CS001', password: 'student123' });
        break;
      default:
        setLoginData({ username: '', password: '' });
    }
  };

  const handleLogin = async () => {
    try {
      const response = await fetch('http://localhost:8000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      if (response.ok) {
        const data = await response.json();
        setIsLoggedIn(true);
        setUserRole(data.user?.role || 'user');
        setError('');
      } else {
        setError('Invalid credentials. Try: admin/password, CS/password, or 20CS001/student123');
      }
    } catch (err) {
      setError('Backend connection failed. Make sure backend is running on port 8000.');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole('');
    setLoginData({ username: '', password: '' });
  };

  if (isLoggedIn) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ minHeight: '100vh', py: 4 }}>
          <Paper sx={{ p: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
              <Typography variant="h4" component="h1" color="primary">
                🎯 Smart Attendance Dashboard
              </Typography>
              <Button variant="outlined" onClick={handleLogout}>
                Logout
              </Button>
            </Box>
            
            <Alert severity="success" sx={{ mb: 4 }}>
              Successfully logged in as: <strong>{loginData.username}</strong> ({userRole})
            </Alert>

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Dashboard sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>Dashboard</Typography>
                    <Typography variant="body2" color="textSecondary">
                      View attendance statistics and system overview
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <QrCodeScanner sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>Attendance Scanner</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Face recognition + QR code scanning
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Assessment sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>Reports & Analytics</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Comprehensive attendance reports
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Box sx={{ mt: 4, p: 3, bgcolor: 'background.default', borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>System Features:</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2">✅ Face Recognition (OpenCV + DeepFace)</Typography>
                  <Typography variant="body2">✅ QR/Barcode ID Verification</Typography>
                  <Typography variant="body2">✅ Three Attendance Scenarios</Typography>
                  <Typography variant="body2">✅ Blockchain Integration</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2">✅ Email/SMS Notifications</Typography>
                  <Typography variant="body2">✅ Role-based Dashboards</Typography>
                  <Typography variant="body2">✅ Comprehensive Reports</Typography>
                  <Typography variant="body2">✅ Real-time Analytics</Typography>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Paper sx={{ width: '100%', p: 4 }}>
          <Typography variant="h4" component="h1" align="center" gutterBottom color="primary">
            🎯 Smart Attendance System
          </Typography>
          <Typography variant="subtitle1" align="center" gutterBottom color="textSecondary" sx={{ mb: 4 }}>
            Blockchain-Integrated Face Recognition + QR Verification
          </Typography>

          <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth" sx={{ mb: 3 }}>
            <Tab icon={<AdminPanelSettings />} label="Admin" />
            <Tab icon={<School />} label="Department" />
            <Tab icon={<Person />} label="Student" />
          </Tabs>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" gutterBottom>👑 Admin Login</Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Complete system management and configuration
            </Typography>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>🏫 Department Login</Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Attendance scanning, verification, and department management
            </Typography>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" gutterBottom>🎓 Student Login</Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              View personal attendance history and blockchain verification
            </Typography>
          </TabPanel>

          <Box sx={{ mt: 3 }}>
            <TextField
              fullWidth
              label="Username"
              value={loginData.username}
              onChange={(e) => setLoginData({...loginData, username: e.target.value})}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={loginData.password}
              onChange={(e) => setLoginData({...loginData, password: e.target.value})}
              sx={{ mb: 3 }}
            />
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleLogin}
              sx={{ mb: 2 }}
            >
              Login
            </Button>
          </Box>

          <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="caption" color="textSecondary" align="center" display="block">
              Demo Credentials:<br/>
              Admin: admin/password • Department: CS/password • Student: 20CS001/student123
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default WorkingApp;
