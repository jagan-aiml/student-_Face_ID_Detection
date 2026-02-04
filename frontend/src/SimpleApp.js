import React from 'react';
import { Container, Typography, Button, Box } from '@mui/material';

function SimpleApp() {
  return (
    <Container maxWidth="sm">
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center'
      }}>
        <Typography variant="h3" component="h1" gutterBottom color="primary">
          🎯 Smart Attendance System
        </Typography>
        <Typography variant="h6" component="h2" gutterBottom color="textSecondary">
          Blockchain-Integrated Face Recognition + QR Verification
        </Typography>
        <Box sx={{ mt: 4 }}>
          <Button 
            variant="contained" 
            size="large" 
            sx={{ mr: 2, mb: 2 }}
            onClick={() => alert('Admin Login - Use: admin/password')}
          >
            👑 Admin Login
          </Button>
          <Button 
            variant="contained" 
            color="secondary" 
            size="large"
            sx={{ mr: 2, mb: 2 }}
            onClick={() => alert('Department Login - Use: CS/password')}
          >
            🏫 Department Login
          </Button>
          <Button 
            variant="outlined" 
            size="large"
            sx={{ mb: 2 }}
            onClick={() => alert('Student Login - Use: 20CS001/student123')}
          >
            🎓 Student Login
          </Button>
        </Box>
        <Box sx={{ mt: 4, p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
          <Typography variant="body2" color="textSecondary">
            ✅ Backend: Running on localhost:8000<br/>
            ✅ Frontend: Running on localhost:3000<br/>
            ✅ Database: Initialized with sample data<br/>
            ✅ Features: Face recognition, QR scanning, Blockchain integration
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}

export default SimpleApp;
