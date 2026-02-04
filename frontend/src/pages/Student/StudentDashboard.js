import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Avatar,
  Paper,
  Button,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Person,
  School,
  CheckCircle,
  Schedule,
  Warning,
  TrendingUp,
  CalendarToday,
  Assessment,
  Notifications,
  Security,
  Email,
  Phone,
  Logout,
  Refresh
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
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
  attendanceRow: {
    '&.present': {
      backgroundColor: '#e8f5e8',
    },
    '&.late': {
      backgroundColor: '#fff3e0',
    },
    '&.pending': {
      backgroundColor: '#e3f2fd',
    },
    '&.absent': {
      backgroundColor: '#ffebee',
    },
  },
  statusChip: {
    fontWeight: 600,
  },
  profileSection: {
    padding: theme.spacing(2),
    backgroundColor: theme.palette.grey[50],
    borderRadius: theme.spacing(1),
    margin: theme.spacing(2, 0),
  },
  progressCard: {
    textAlign: 'center',
    padding: theme.spacing(3),
  },
  blockchainBadge: {
    backgroundColor: '#9c27b0',
    color: 'white',
    marginLeft: theme.spacing(1),
  }
});

const StudentDashboard = () => {
  const theme = useTheme();
  const classes = useStyles(theme);
  const { user, logout } = useAuth();
  
  const [studentData, setStudentData] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('monthly');
  
  useEffect(() => {
    if (user && user.username) {
      fetchStudentData();
      fetchAttendanceData();
      
      // Auto-refresh attendance data every 30 seconds to reflect verification updates
      const interval = setInterval(() => {
        fetchAttendanceData();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [user, filterPeriod]);
  
  const fetchStudentData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:8000/students/${user.username}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const studentProfile = response.data;
      setStudentData({
        name: studentProfile.name,
        registerNumber: studentProfile.register_number,
        department: studentProfile.department,
        year: studentProfile.year,
        section: studentProfile.section,
        email: studentProfile.email,
        phone: studentProfile.phone,
        parentName: studentProfile.parent_name,
        parentEmail: studentProfile.parent_email,
        parentPhone: studentProfile.parent_phone,
        dateOfBirth: studentProfile.date_of_birth,
        isActive: studentProfile.is_active
      });
    } catch (error) {
      console.error('Error fetching student data:', error);
      setError('Failed to load student information');
      // Fallback to basic data if API fails
      setStudentData({
        name: 'Student',
        registerNumber: user.username,
        department: 'Unknown',
        year: 1,
        section: 'A',
        email: `${user.username.toLowerCase()}@student.edu`,
        parentEmail: `parent.${user.username.toLowerCase()}@gmail.com`,
        parentPhone: '+91 9876543210'
      });
    }
  };
  
  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      
      const endDate = new Date();
      const startDate = new Date();
      
      switch (filterPeriod) {
        case 'weekly':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'monthly':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case 'yearly':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setMonth(endDate.getMonth() - 1);
      }
      
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:8000/students/${user.username}/attendance`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        }
      });
      
      const attendanceRecords = response.data.attendance_records || [];
      
      const totalDays = attendanceRecords.length;
      const presentDays = attendanceRecords.filter(r => r.status === 'Present').length;
      const lateDays = attendanceRecords.filter(r => r.status === 'Late').length;
      const absentDays = attendanceRecords.filter(r => r.status === 'Absent').length;
      const pendingDays = attendanceRecords.filter(r => r.status === 'Pending').length;
      
      const attendancePercentage = totalDays > 0 ? ((presentDays + lateDays) / totalDays) * 100 : 0;
      
      setAttendanceStats({
        totalDays,
        presentDays,
        lateDays,
        absentDays,
        pendingDays,
        attendancePercentage: Math.round(attendancePercentage * 100) / 100,
        currentStreak: calculateStreak(attendanceRecords)
      });
      
      setRecentAttendance(attendanceRecords.slice(0, 10).map(record => ({
        date: record.date,
        status: record.status,
        time: record.time,
        method: record.verification_method === 'face_qr' ? 'Face + QR' : 
               record.verification_method === 'face_only' ? 'Face Only' : 'Manual',
        confidence: record.face_confidence
      })));
      
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      setAttendanceStats({
        totalDays: 0,
        presentDays: 0,
        lateDays: 0,
        absentDays: 0,
        pendingDays: 0,
        attendancePercentage: 0,
        currentStreak: 0
      });
      setRecentAttendance([]);
    } finally {
      setLoading(false);
    }
  };
  
  const calculateStreak = (records) => {
    let streak = 0;
    for (const record of records) {
      if (record.status === 'Present' || record.status === 'Late') {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'present': return '#4caf50';
      case 'late': return '#ff9800';
      case 'pending': return '#2196f3';
      case 'absent': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getAttendanceRowClass = (status) => {
    return status.toLowerCase();
  };

  if (loading) {
    return (
      <Container sx={classes.container}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={classes.container}>
        <Alert severity="error">{error}</Alert>
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
                <Person fontSize="large" />
              </Avatar>
            </Grid>
            <Grid item xs>
              <Typography variant="h4" gutterBottom>
                Welcome, {studentData?.name || 'Student'}!
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                {studentData?.registerNumber} • {studentData?.department}
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.8 }}>
                Year {studentData?.year} • Section {studentData?.section}
              </Typography>
            </Grid>
            <Grid item>
              <Box textAlign="center">
                <Typography variant="h3" sx={{ fontWeight: 700 }}>
                  {attendanceStats?.attendancePercentage || 0}%
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Attendance Rate
                </Typography>
              </Box>
            </Grid>
            <Grid item>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  color="inherit"
                  startIcon={<Refresh />}
                  onClick={() => {
                    setLoading(true);
                    fetchStudentData();
                    fetchAttendanceData();
                  }}
                  sx={{ 
                    backgroundColor: 'rgba(255,255,255,0.2)', 
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' }
                  }}
                >
                  Refresh
                </Button>
                <Button
                  variant="contained"
                  color="inherit"
                  startIcon={<Logout />}
                  onClick={logout}
                  sx={{ 
                    backgroundColor: 'rgba(255,255,255,0.2)', 
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' }
                  }}
                >
                  Logout
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Filter Controls */}
      <Box mb={3}>
        <FormControl variant="outlined" size="small" style={{ minWidth: 120 }}>
          <InputLabel>Period</InputLabel>
          <Select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            label="Period"
          >
            <MenuItem value="weekly">Weekly</MenuItem>
            <MenuItem value="monthly">Monthly</MenuItem>
            <MenuItem value="yearly">Yearly</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={classes.statCard} style={{ borderLeft: '4px solid #4caf50' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography sx={classes.statNumber} style={{ color: '#4caf50' }}>
                    {attendanceStats?.presentDays || 0}
                  </Typography>
                  <Typography sx={classes.statLabel}>
                    Present Days
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
                    {attendanceStats?.lateDays || 0}
                  </Typography>
                  <Typography sx={classes.statLabel}>
                    Late Days
                  </Typography>
                </Box>
                <Schedule style={{ fontSize: 48, color: '#ff9800', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={classes.statCard} style={{ borderLeft: '4px solid #2196f3' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography sx={classes.statNumber} style={{ color: '#2196f3' }}>
                    {attendanceStats?.pendingDays || 0}
                  </Typography>
                  <Typography sx={classes.statLabel}>
                    Pending
                  </Typography>
                </Box>
                <Assessment style={{ fontSize: 48, color: '#2196f3', opacity: 0.7 }} />
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
                    {attendanceStats?.absentDays || 0}
                  </Typography>
                  <Typography sx={classes.statLabel}>
                    Absent Days
                  </Typography>
                </Box>
                <Warning style={{ fontSize: 48, color: '#f44336', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Attendance */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📅 Recent Attendance Records
              </Typography>
              
              {recentAttendance.length === 0 ? (
                <Box textAlign="center" p={4}>
                  <CalendarToday style={{ fontSize: 60, color: '#ccc' }} />
                  <Typography variant="h6" color="textSecondary">
                    No attendance records yet
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Your attendance records will appear here once you start marking attendance
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Time</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Method</TableCell>
                        <TableCell>Verification</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentAttendance.map((record, index) => (
                        <TableRow 
                          key={index} 
                          sx={{
                            ...classes.attendanceRow,
                            ...(record.status === 'present' && { backgroundColor: '#e8f5e8' }),
                            ...(record.status === 'late' && { backgroundColor: '#fff3e0' }),
                            ...(record.status === 'absent' && { backgroundColor: '#ffebee' }),
                            ...(record.status === 'pending' && { backgroundColor: '#e3f2fd' })
                          }}
                        >
                          <TableCell>{record.date}</TableCell>
                          <TableCell>{record.time}</TableCell>
                          <TableCell>
                            <Chip
                              label={record.status}
                              sx={classes.statusChip}
                              style={{
                                backgroundColor: getStatusColor(record.status),
                                color: 'white'
                              }}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{record.method}</TableCell>
                          <TableCell>
                            {record.confidence && (
                              <Box display="flex" alignItems="center">
                                <Security fontSize="small" style={{ marginRight: 4 }} />
                                <Typography variant="body2">
                                  {Math.round(record.confidence * 100)}%
                                </Typography>
                              </Box>
                            )}
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

        {/* Student Profile & Progress */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                👤 Student Profile
              </Typography>
              
              <Box sx={classes.profileSection}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Contact Information
                </Typography>
                <Box display="flex" alignItems="center" mb={1}>
                  <Email fontSize="small" style={{ marginRight: 8, color: '#666' }} />
                  <Typography variant="body2">{studentData?.email}</Typography>
                </Box>
                <Box display="flex" alignItems="center" mb={1}>
                  <Email fontSize="small" style={{ marginRight: 8, color: '#666' }} />
                  <Typography variant="body2">{studentData?.parentEmail}</Typography>
                </Box>
                <Box display="flex" alignItems="center">
                  <Phone fontSize="small" style={{ marginRight: 8, color: '#666' }} />
                  <Typography variant="body2">{studentData?.parentPhone}</Typography>
                </Box>
                {studentData?.parentName && (
                  <Box mt={2}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Parent/Guardian: {studentData.parentName}
                    </Typography>
                  </Box>
                )}
              </Box>

              <Box sx={classes.progressCard}>
                <Typography variant="h4" color="primary" gutterBottom>
                  {attendanceStats?.currentStreak || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Current Attendance Streak
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.min((attendanceStats?.currentStreak || 0) * 10, 100)} 
                  style={{ marginTop: 16, height: 8, borderRadius: 4 }}
                />
              </Box>

              <Box mt={2}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Attendance Progress
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={attendanceStats?.attendancePercentage || 0} 
                  style={{ height: 8, borderRadius: 4 }}
                />
                <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
                  {attendanceStats?.attendancePercentage || 0}% of {attendanceStats?.totalDays || 0} days
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default StudentDashboard;
