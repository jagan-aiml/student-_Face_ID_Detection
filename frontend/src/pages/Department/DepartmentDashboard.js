import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Avatar,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useTheme,
  Alert,
  CircularProgress,
  Paper,
  Snackbar,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  People,
  Schedule,
  Verified,
  Warning,
  School,
  QrCodeScanner,
  CheckCircle,
  Cancel,
  Refresh,
  Person,
  Assessment,
  TrendingUp,
  Security,
  Logout
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const useStyles = (theme) => ({
  container: {
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
  },
  welcomeCard: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    marginBottom: theme.spacing(3),
  },
  statCard: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: theme.shadows[4],
    },
    transition: 'all 0.3s ease',
  },
  statNumber: {
    fontSize: '2.5rem',
    fontWeight: 700,
    lineHeight: 1,
  },
  statLabel: {
    fontSize: '1rem',
    opacity: 0.8,
    marginTop: theme.spacing(0.5),
  },
  pendingCard: {
    marginTop: theme.spacing(2),
  },
  actionButton: {
    margin: theme.spacing(0.5),
  },
  statusChip: {
    fontWeight: 600,
  },
  quickActionCard: {
    textAlign: 'center',
    padding: theme.spacing(2),
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
    transition: 'all 0.3s ease',
  },
  refreshButton: {
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(1),
  }
});

const DepartmentDashboard = () => {
  const theme = useTheme();
  const classes = useStyles(theme);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState(null);
  const [pendingRecords, setPendingRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [verificationDialog, setVerificationDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchPendingVerifications();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
      fetchPendingVerifications();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:8000/reports/department/${user.department}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Use mock data as fallback
      setStats({
        department: user.department,
        total_students: 0,
        present_today: 0,
        late_today: 0,
        absent_today: 0,
        pending_verifications: 0,
        attendance_percentage: 0
      });
    }
  };

  const fetchPendingVerifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/pending_list', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setPendingRecords(response.data.pending_verifications || []);
    } catch (error) {
      console.error('Error fetching pending verifications:', error);
      setPendingRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (action) => {
    if (!selectedRecord) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:8000/verify_pending', {
        attendance_id: selectedRecord.id,
        action: action,
        notes: verificationNotes
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setSuccess(`Attendance ${action}d successfully`);
      setVerificationDialog(false);
      setSelectedRecord(null);
      setVerificationNotes('');
      
      // Refresh data
      fetchDashboardData();
      fetchPendingVerifications();
      
    } catch (error) {
      console.error('Error verifying attendance:', error);
      setError(error.response?.data?.detail || `Failed to ${action} attendance`);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboardData(), fetchPendingVerifications()]);
    setRefreshing(false);
  };

  const openVerificationDialog = (record) => {
    setSelectedRecord(record);
    setVerificationDialog(true);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'present': return '#4caf50';
      case 'late': return '#ff9800';
      case 'pending': return '#2196f3';
      case 'absent': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  if (loading && !stats) {
    return (
      <Container sx={classes.container}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  return (
    <Container sx={classes.container}>
      {/* Welcome Header */}
      <Card sx={classes.welcomeCard}>
        <CardContent>
          <Grid container alignItems="center" spacing={2}>
            <Grid item>
              <Avatar sx={{ width: 80, height: 80, bgcolor: 'rgba(255,255,255,0.2)' }}>
                <School fontSize="large" />
              </Avatar>
            </Grid>
            <Grid item xs>
              <Typography variant="h4" gutterBottom>
                {user.department} Department Dashboard
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Welcome, {user.username}
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.8 }}>
                Manage attendance verification and department operations
              </Typography>
            </Grid>
            <Grid item>
              <Box display="flex" gap={1}>
                <Tooltip title="Refresh Data">
                  <IconButton 
                    onClick={handleRefresh}
                    disabled={refreshing}
                    sx={{ color: 'white' }}
                  >
                    {refreshing ? <CircularProgress size={24} /> : <Refresh />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Logout">
                  <IconButton 
                    onClick={logout}
                    sx={{ color: 'white' }}
                  >
                    <Logout />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={classes.statCard} style={{ borderLeft: '4px solid #2196f3' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography sx={classes.statNumber} style={{ color: '#2196f3' }}>
                    {stats?.total_students || 0}
                  </Typography>
                  <Typography sx={classes.statLabel}>
                    Total Students
                  </Typography>
                </Box>
                <People style={{ fontSize: 48, color: '#2196f3', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={classes.statCard} style={{ borderLeft: '4px solid #4caf50' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography sx={classes.statNumber} style={{ color: '#4caf50' }}>
                    {stats?.present_today || 0}
                  </Typography>
                  <Typography sx={classes.statLabel}>
                    Present Today
                  </Typography>
                </Box>
                <CheckCircle style={{ fontSize: 48, color: '#4caf50', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={classes.statCard} style={{ borderLeft: '4px solid #ff9800' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography sx={classes.statNumber} style={{ color: '#ff9800' }}>
                    {stats?.late_today || 0}
                  </Typography>
                  <Typography sx={classes.statLabel}>
                    Late Today
                  </Typography>
                </Box>
                <Schedule style={{ fontSize: 48, color: '#ff9800', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={classes.statCard} style={{ borderLeft: '4px solid #f44336' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography sx={classes.statNumber} style={{ color: '#f44336' }}>
                    {stats?.pending_verifications || 0}
                  </Typography>
                  <Typography sx={classes.statLabel}>
                    Pending Verifications
                  </Typography>
                </Box>
                <Warning style={{ fontSize: 48, color: '#f44336', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Pending Verifications */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🔍 Pending Attendance Verifications
              </Typography>
              
              {pendingRecords.length === 0 ? (
                <Box textAlign="center" p={4}>
                  <Verified style={{ fontSize: 60, color: '#4caf50' }} />
                  <Typography variant="h6" color="textSecondary">
                    No Pending Verifications
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    All attendance records have been verified
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Student</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Time</TableCell>
                        <TableCell>Method</TableCell>
                        <TableCell>Confidence</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pendingRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <Box display="flex" alignItems="center">
                              <Avatar sx={{ mr: 2 }}>
                                <Person />
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight="bold">
                                  {record.student?.name}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {record.student?.register_number}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>{record.date}</TableCell>
                          <TableCell>{record.time}</TableCell>
                          <TableCell>
                            <Chip
                              label={record.verification_method === 'face_only' ? 'Face Only' : 'Face + QR'}
                              size="small"
                              color={record.verification_method === 'face_only' ? 'warning' : 'primary'}
                            />
                          </TableCell>
                          <TableCell>
                            {record.face_confidence && (
                              <Box display="flex" alignItems="center">
                                <Security fontSize="small" style={{ marginRight: 4 }} />
                                <Typography variant="body2">
                                  {Math.round(record.face_confidence * 100)}%
                                </Typography>
                              </Box>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              onClick={() => openVerificationDialog(record)}
                              sx={classes.actionButton}
                            >
                              Review
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🚀 Quick Actions
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Paper 
                    sx={classes.quickActionCard}
                    onClick={() => navigate('/department/scanner')}
                  >
                    <QrCodeScanner style={{ fontSize: 40, color: '#2196f3', marginBottom: 8 }} />
                    <Typography variant="h6">Attendance Scanner</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Mark attendance with face & ID verification
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12}>
                  <Paper 
                    sx={classes.quickActionCard}
                    onClick={() => navigate('/department/registration')}
                  >
                    <Person style={{ fontSize: 40, color: '#9c27b0', marginBottom: 8 }} />
                    <Typography variant="h6">Student Registration</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Register new students with ID card barcode detection
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12}>
                  <Paper 
                    sx={classes.quickActionCard}
                    onClick={() => navigate('/reports')}
                  >
                    <Assessment style={{ fontSize: 40, color: '#4caf50', marginBottom: 8 }} />
                    <Typography variant="h6">Generate Reports</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Export attendance reports
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12}>
                  <Paper 
                    sx={classes.quickActionCard}
                    onClick={() => navigate('/analytics')}
                  >
                    <TrendingUp style={{ fontSize: 40, color: '#ff9800', marginBottom: 8 }} />
                    <Typography variant="h6">View Analytics</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Attendance trends & insights
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Attendance Rate */}
          <Card style={{ marginTop: 16 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 Today's Attendance Rate
              </Typography>
              
              <Box textAlign="center" p={2}>
                <Typography variant="h3" color="primary" gutterBottom>
                  {stats?.attendance_percentage || 0}%
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {stats?.present_today + stats?.late_today || 0} of {stats?.total_students || 0} students
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Verification Dialog */}
      <Dialog 
        open={verificationDialog} 
        onClose={() => setVerificationDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Verify Attendance Record
        </DialogTitle>
        <DialogContent>
          {selectedRecord && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedRecord.student?.name}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {selectedRecord.student?.register_number} • {selectedRecord.student?.department}
              </Typography>
              
              <Box mt={2} mb={2}>
                <Typography variant="body2">
                  <strong>Date:</strong> {selectedRecord.date}
                </Typography>
                <Typography variant="body2">
                  <strong>Time:</strong> {selectedRecord.time}
                </Typography>
                <Typography variant="body2">
                  <strong>Method:</strong> {selectedRecord.verification_method === 'face_only' ? 'Face Only (Forgot ID)' : 'Face + QR'}
                </Typography>
                {selectedRecord.face_confidence && (
                  <Typography variant="body2">
                    <strong>Face Confidence:</strong> {Math.round(selectedRecord.face_confidence * 100)}%
                  </Typography>
                )}
              </Box>

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Verification Notes (Optional)"
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="Add any notes about this verification..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVerificationDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => handleVerification('reject')}
            color="error"
            startIcon={<Cancel />}
          >
            Reject
          </Button>
          <Button 
            onClick={() => handleVerification('approve')}
            variant="contained"
            color="success"
            startIcon={<CheckCircle />}
          >
            Approve
          </Button>
        </DialogActions>
      </Dialog>

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
    </Container>
  );
};

export default DepartmentDashboard;
