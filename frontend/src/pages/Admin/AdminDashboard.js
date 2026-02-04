import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Avatar,
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
  Tooltip,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Badge,
  LinearProgress
} from '@mui/material';
import {
  AdminPanelSettings,
  People,
  School,
  Assessment,
  TrendingUp,
  Security,
  Refresh,
  Edit,
  Delete,
  DeleteForever,
  Download,
  Visibility,
  PersonAdd,
  Business,
  Analytics,
  Report,
  Notifications,
  CloudUpload,
  QrCode,
  Backup,
  Settings,
  MonitorHeart,
  Block,
  CheckCircle,
  Warning,
  Error,
  Schedule,
  Email,
  Sms,
  Storage,
  VpnKey,
  ExitToApp
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { handleApiError } from '../../utils/errorHandler';
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
  quickActionCard: {
    textAlign: 'center',
    padding: theme.spacing(2),
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
    transition: 'all 0.3s ease',
  },
  actionButton: {
    margin: theme.spacing(0.5),
  },
  formField: {
    marginBottom: theme.spacing(2),
  }
});

const AdminDashboard = () => {
  const theme = useTheme();
  const classes = useStyles(theme);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [systemStats, setSystemStats] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [students, setStudents] = useState([]);
  const [users, setUsers] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [blockchainLogs, setBlockchainLogs] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  
  // Dialog states
  const [departmentDialog, setDepartmentDialog] = useState(false);
  const [departmentEditDialog, setDepartmentEditDialog] = useState(false);
  const [departmentDeleteDialog, setDepartmentDeleteDialog] = useState(false);
  const [permanentDepartmentDeleteDialog, setPermanentDepartmentDeleteDialog] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [attendanceDialog, setAttendanceDialog] = useState(false);
  const [systemDialog, setSystemDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Student management states
  const [studentViewDialog, setStudentViewDialog] = useState(false);
  const [studentEditDialog, setStudentEditDialog] = useState(false);
  const [studentDeleteDialog, setStudentDeleteDialog] = useState(false);
  const [permanentDeleteDialog, setPermanentDeleteDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [studentFilters, setStudentFilters] = useState({
    department: '',
    year: '',
    section: ''
  });
  const [filteredStudents, setFilteredStudents] = useState([]);
  
  // Pending verification states
  const [pendingRecords, setPendingRecords] = useState([]);
  const [verificationDialog, setVerificationDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  
  // Form states
  const [departmentForm, setDepartmentForm] = useState({
    code: '',
    name: '',
    hod_name: '',
    hod_email: '',
    hod_phone: '',
    password: '' // department login password
  });
  
  // Removed separate user form - credentials will be captured within department/student forms

  const [studentForm, setStudentForm] = useState({
    register_number: '',
    name: '',
    email: '',
    phone: '',
    department: '',
    year: 1,
    section: '',
    parent_name: '',
    parent_email: '',
    parent_phone: '',
    date_of_birth: '', // compulsory
    face_image: null,
    qr_code: ''
  });


  const [systemForm, setSystemForm] = useState({
    admin_username: '',
    admin_password: '',
    smtp_host: '',
    smtp_port: '',
    smtp_username: '',
    smtp_password: '',
    backup_path: ''
  });

  const { token } = useAuth();

  useEffect(() => {
    if (!token) return; // wait for login
    fetchSystemData();
    fetchPendingVerifications();
    const interval = setInterval(() => {
      fetchSystemData();
      fetchPendingVerifications();
    }, 60000);
    return () => clearInterval(interval);
  }, [token]);

  // Filter students based on search term and filters
  useEffect(() => {
    let filtered = students;
    
    // Apply search filter
    if (studentSearchTerm) {
      filtered = filtered.filter(student => 
        student.name?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
        student.register_number?.toLowerCase().includes(studentSearchTerm.toLowerCase())
      );
    }
    
    // Apply department filter
    if (studentFilters.department) {
      filtered = filtered.filter(student => 
        student.department === studentFilters.department
      );
    }
    
    // Apply year filter
    if (studentFilters.year) {
      filtered = filtered.filter(student => 
        student.year === parseInt(studentFilters.year)
      );
    }
    
    // Apply section filter
    if (studentFilters.section) {
      filtered = filtered.filter(student => 
        student.section?.toLowerCase().includes(studentFilters.section.toLowerCase())
      );
    }
    
    setFilteredStudents(filtered);
  }, [students, studentSearchTerm, studentFilters]);

  const fetchSystemData = async () => {
    try {
      setLoading(true);
      
      // Check if we have a valid token
      if (!token) {
        console.log('No token available, redirecting to login');
        navigate('/login');
        return;
      }
      
      // Fetch system statistics (authorized)
      const statsResponse = await axios.get('http://localhost:8000/attendance/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSystemStats(statsResponse.data);
      
      // Fetch departments (authorized)
      const deptResponse = await axios.get('http://localhost:8000/departments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDepartments(deptResponse.data);
      
      // Fetch students (authorized)
      try {
        const studentsResponse = await axios.get('http://localhost:8000/admin/students', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStudents(studentsResponse.data);
      } catch (err) {
        console.log('Students fetch failed:', err);
      }
      
      // Fetch users (admin only)
      try {
        const usersResponse = await axios.get('http://localhost:8000/admin/users', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(usersResponse.data);
      } catch (err) {
        console.log('Users fetch failed:', err);
      }
      
      // Fetch blockchain logs (admin only)
      try {
        const blockchainResponse = await axios.get('http://localhost:8000/admin/blockchain/logs', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBlockchainLogs(blockchainResponse.data);
      } catch (err) {
        console.log('Blockchain logs fetch failed:', err);
      }
      
      // Fetch system health
      try {
        const healthResponse = await axios.get('http://localhost:8000/system/status');
        setSystemHealth(healthResponse.data);
      } catch (err) {
        console.log('System health fetch failed:', err);
      }
      
      // Mock recent activity - in real implementation, this would come from an API
      setRecentActivity([
        {
          id: 1,
          type: 'attendance',
          message: 'New attendance record marked for 20CS001',
          time: '2 minutes ago',
          status: 'success'
        },
        {
          id: 2,
          type: 'verification',
          message: 'Pending verification approved by AIML department',
          time: '5 minutes ago',
          status: 'info'
        },
        {
          id: 3,
          type: 'registration',
          message: 'New student registered: 20AIML002',
          time: '10 minutes ago',
          status: 'success'
        },
        {
          id: 4,
          type: 'alert',
          message: 'High absence rate detected in CS department',
          time: '15 minutes ago',
          status: 'warning'
        },
        {
          id: 5,
          type: 'blockchain',
          message: 'Blockchain transaction verified for attendance ID 1234',
          time: '20 minutes ago',
          status: 'success'
        }
      ]);
      
    } catch (error) {
      console.error('Error fetching system data:', error);
      
      // Handle 401 unauthorized - redirect to login
      if (error.response?.status === 401) {
        console.log('Authentication failed, redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }
      
      setError('Failed to load system data');
      
      // Use mock data as fallback
      setSystemStats({
        date: new Date().toISOString().split('T')[0],
        total_students: 0,
        present: 0,
        late: 0,
        pending: 0,
        absent: 0,
        attendance_percentage: 0
      });
      setDepartments([]);
      setUsers([]);
      setBlockchainLogs([]);
      setSystemHealth(null);
      setRecentActivity([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSystemData();
    setRefreshing(false);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleCreateDepartment = async () => {
    try {
      // Create department record first (without password field)
      const { code, name, hod_name, hod_email, hod_phone } = departmentForm;
      await axios.post('http://localhost:8000/departments', { code, name, hod_name, hod_email, hod_phone }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Then create department user credentials using provided password
      if (departmentForm.password && code) {
        await axios.post('http://localhost:8000/admin/create-user', {
          username: code,
          email: `${code.toLowerCase()}@university.edu`,
          password: departmentForm.password,
          role: 'department',
          department: code
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setSuccess('Department created successfully');
      setDepartmentDialog(false);
      resetDepartmentForm();
      fetchSystemData();
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to create department');
    }
  };

  // Department edit and delete handlers
  const handleEditDepartment = (department) => {
    setSelectedDepartment(department);
    setDepartmentForm({
      code: department.code,
      name: department.name,
      hod_name: department.hod_name || '',
      hod_email: department.hod_email || '',
      hod_phone: department.hod_phone || '',
      password: '' // Don't populate password for security
    });
    setDepartmentEditDialog(true);
  };

  const handleUpdateDepartment = async () => {
    try {
      const { code, name, hod_name, hod_email, hod_phone } = departmentForm;
      await axios.put(`http://localhost:8000/admin/departments/${selectedDepartment.id}`, 
        { code, name, hod_name, hod_email, hod_phone }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess('Department updated successfully');
      setDepartmentEditDialog(false);
      setSelectedDepartment(null);
      resetDepartmentForm();
      fetchSystemData();
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to update department');
    }
  };

  const handleDeleteDepartment = (department) => {
    setSelectedDepartment(department);
    setDepartmentDeleteDialog(true);
  };

  const handleConfirmDeleteDepartment = async () => {
    try {
      const response = await axios.delete(`http://localhost:8000/admin/departments/${selectedDepartment.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess(`Department deactivated successfully. ${response.data.user_account_deactivated ? 'Login credentials also deactivated.' : 'No user account found.'}`);
      setDepartmentDeleteDialog(false);
      setSelectedDepartment(null);
      fetchSystemData();
    } catch (error) {
      handleApiError(error, setError, 'Failed to delete department');
    }
  };

  const handlePermanentDeleteDepartment = (department) => {
    setSelectedDepartment(department);
    setPermanentDepartmentDeleteDialog(true);
  };

  const handleConfirmPermanentDeleteDepartment = async () => {
    try {
      const response = await axios.delete(`http://localhost:8000/admin/departments/${selectedDepartment.id}/permanent`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess(`Department permanently deleted! Removed ${response.data.students_deleted} students, ${response.data.attendance_records_deleted} attendance records, and ${response.data.user_account_deleted ? 'department credentials' : 'no user account found'}.`);
      setPermanentDepartmentDeleteDialog(false);
      setSelectedDepartment(null);
      fetchSystemData();
    } catch (error) {
      handleApiError(error, setError, 'Failed to permanently delete department');
    }
  };

  // Removed separate user creation handler; handled within department creation





  const resetDepartmentForm = () => {
    setDepartmentForm({
      code: '',
      name: '',
      hod_name: '',
      hod_email: '',
      hod_phone: '',
      password: ''
    });
  };

  // Removed user form reset

  const resetStudentForm = () => {
    setStudentForm({
      register_number: '',
      name: '',
      email: '',
      phone: '',
      department: '',
      year: 1,
      section: '',
      parent_name: '',
      parent_email: '',
      parent_phone: '',
      date_of_birth: '',
      face_image: null,
      qr_code: ''
    });
  };



  // Attendance Management state and handlers
  const [attendanceFilters, setAttendanceFilters] = useState({
    department: '',
    year: '',
    section: '',
    date_from: '',
    date_to: '',
    report_type: 'daily'
  });
  const [attendanceReport, setAttendanceReport] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  const fetchAttendanceReport = async () => {
    setAttendanceLoading(true);
    try {
      const payload = {
        department: attendanceFilters.department || undefined,
        year: attendanceFilters.year ? parseInt(attendanceFilters.year) : undefined,
        section: attendanceFilters.section || undefined,
        date_from: attendanceFilters.date_from || undefined,
        date_to: attendanceFilters.date_to || undefined,
        report_type: attendanceFilters.report_type
      };
      const response = await axios.post('http://localhost:8000/reports/attendance', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAttendanceReport(response.data);
      setSuccess('Attendance report loaded successfully');
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to load attendance report');
      setAttendanceReport(null);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const exportAttendance = async (format = 'excel') => {
    try {
      const payload = {
        format,
        department: attendanceFilters.department || undefined,
        start_date: attendanceFilters.date_from || undefined,
        end_date: attendanceFilters.date_to || undefined
      };
      const response = await axios.post('http://localhost:8000/admin/export-attendance', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // For now, just show success with count; wiring actual file download can be added later
      setSuccess(`Export prepared (${response.data.total_records} records) in ${format.toUpperCase()} format`);
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to export attendance');
    }
  };

  const resetAttendanceFilters = () => {
    setAttendanceFilters({
      department: '',
      year: '',
      section: '',
      date_from: '',
      date_to: '',
      report_type: 'daily'
    });
    setAttendanceReport(null); // Clear previous results
    setSuccess('Filters reset successfully');
  };

  // Password reset dialog state and handler
  const [resetDialog, setResetDialog] = useState(false);
  const [resetForm, setResetForm] = useState({
    user_type: 'user', // 'user' or 'student'
    identifier: '', // username or register_number
    new_password: ''
  });

  const handlePasswordReset = async () => {
    try {
      await axios.post('http://localhost:8000/admin/reset-password', resetForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Password reset successfully');
      setResetDialog(false);
      setResetForm({ user_type: 'user', identifier: '', new_password: '' });
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to reset password');
    }
  };

  // Student management handlers
  const fetchStudents = async () => {
    try {
      const response = await axios.get('http://localhost:8000/admin/students', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data);
      setSuccess('Students data refreshed');
    } catch (error) {
      setError('Failed to fetch students data');
    }
  };

  const fetchPendingVerifications = async () => {
    try {
      const response = await axios.get('http://localhost:8000/pending_list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingRecords(response.data.pending_verifications || []);
    } catch (error) {
      console.error('Error fetching pending verifications:', error);
      setPendingRecords([]);
    }
  };

  const handleVerification = async (action) => {
    if (!selectedRecord) return;

    try {
      const response = await axios.post('http://localhost:8000/verify_pending', {
        attendance_id: selectedRecord.id,
        action: action,
        notes: verificationNotes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess(`Attendance ${action}d successfully`);
      setVerificationDialog(false);
      setSelectedRecord(null);
      setVerificationNotes('');
      
      // Refresh data
      fetchSystemData();
      fetchPendingVerifications();
      
    } catch (error) {
      console.error('Error verifying attendance:', error);
      setError(error.response?.data?.detail || `Failed to ${action} attendance`);
    }
  };

  const openVerificationDialog = (record) => {
    setSelectedRecord(record);
    setVerificationDialog(true);
  };

  const handleViewStudent = (student) => {
    setSelectedStudent(student);
    setStudentViewDialog(true);
  };

  const handleEditStudent = (student) => {
    setSelectedStudent(student);
    setStudentForm({
      register_number: student.register_number || '',
      name: student.name || '',
      email: student.email || '',
      phone: student.phone || '',
      department: student.department || '',
      year: student.year || 1,
      section: student.section || '',
      parent_name: student.parent_name || '',
      parent_email: student.parent_email || '',
      parent_phone: student.parent_phone || '',
      date_of_birth: student.date_of_birth || '',
      face_image: null,
      qr_code: student.qr_code || ''
    });
    setStudentEditDialog(true);
  };

  const handleDeleteStudent = (student) => {
    setSelectedStudent(student);
    setStudentDeleteDialog(true);
  };

  const handleUpdateStudent = async () => {
    try {
      await axios.put(`http://localhost:8000/admin/students/${selectedStudent.id}`, studentForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Student updated successfully');
      setStudentEditDialog(false);
      fetchSystemData(); // Refresh all data
      resetStudentForm();
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to update student');
    }
  };

  const handleConfirmDeleteStudent = async () => {
    try {
      const response = await axios.delete(`http://localhost:8000/admin/students/${selectedStudent.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess(`Student deactivated successfully. ${response.data.user_account_deactivated ? 'Login credentials also deactivated.' : 'No user account found.'}`);
      setStudentDeleteDialog(false);
      fetchSystemData(); // Refresh all data
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to delete student');
    }
  };

  const handlePermanentDelete = (student) => {
    setSelectedStudent(student);
    setPermanentDeleteDialog(true);
  };

  const handleConfirmPermanentDelete = async () => {
    try {
      const response = await axios.delete(`http://localhost:8000/admin/students/${selectedStudent.id}/permanent`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess(`Student permanently deleted! Removed ${response.data.attendance_records_deleted} attendance records and ${response.data.user_account_deleted ? 'user account' : 'no user account found'}.`);
      setPermanentDeleteDialog(false);
      fetchSystemData(); // Refresh all data
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to permanently delete student');
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'attendance': return <People />;
      case 'verification': return <Security />;
      case 'registration': return <PersonAdd />;
      case 'alert': return <Notifications />;
      default: return <Assessment />;
    }
  };

  const getActivityColor = (status) => {
    switch (status) {
      case 'success': return '#4caf50';
      case 'warning': return '#ff9800';
      case 'error': return '#f44336';
      case 'info': return '#2196f3';
      default: return '#9e9e9e';
    }
  };

  if (loading && !systemStats) {
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
                <AdminPanelSettings fontSize="large" />
              </Avatar>
            </Grid>
            <Grid item xs>
              <Typography variant="h4" gutterBottom>
                🔐 Smart Attendance System
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Welcome, Administrator {user.username}
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.8 }}>
                Complete system control 
              </Typography>
            </Grid>
            <Grid item>
              <Box display="flex" gap={1}>
                <Tooltip title="System Health">
                  <IconButton sx={{ color: 'white' }}>
                    <Badge 
                      color={systemHealth?.status === 'active' ? 'success' : 'error'} 
                      variant="dot"
                    >
                      <MonitorHeart />
                    </Badge>
                  </IconButton>
                </Tooltip>
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
                    onClick={() => {
                      logout();
                      navigate('/login');
                    }}
                    sx={{ color: 'white' }}
                  >
                    <ExitToApp />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="📊 Dashboard" />
          <Tab label="👥 Student Management" />
          <Tab label="🏢 Department Management" />
          <Tab label="📋 Attendance Records" />
          <Tab label="⚙️ System Management" />
        </Tabs>
      </Card>

      {/* Dashboard Tab */}
      {activeTab === 0 && (
        <>
          {/* System Statistics */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={classes.statCard} style={{ borderLeft: '4px solid #2196f3' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography sx={classes.statNumber} style={{ color: '#2196f3' }}>
                        {systemStats?.total_students || 0}
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

        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={classes.statCard} style={{ borderLeft: '4px solid #4caf50' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography sx={classes.statNumber} style={{ color: '#4caf50' }}>
                    {systemStats?.present || 0}
                  </Typography>
                  <Typography sx={classes.statLabel}>
                    Present Today
                  </Typography>
                </Box>
                <Security style={{ fontSize: 48, color: '#4caf50', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={classes.statCard} style={{ borderLeft: '4px solid #ff9800' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography sx={classes.statNumber} style={{ color: '#ff9800' }}>
                    {systemStats?.late || 0}
                  </Typography>
                  <Typography sx={classes.statLabel}>
                    Late Today
                  </Typography>
                </Box>
                <TrendingUp style={{ fontSize: 48, color: '#ff9800', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={classes.statCard} style={{ borderLeft: '4px solid #9c27b0' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography sx={classes.statNumber} style={{ color: '#9c27b0' }}>
                    {systemStats?.pending || 0}
                  </Typography>
                  <Typography sx={classes.statLabel}>
                    Pending
                  </Typography>
                </Box>
                <Assessment style={{ fontSize: 48, color: '#9c27b0', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={classes.statCard} style={{ borderLeft: '4px solid #f44336' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography sx={classes.statNumber} style={{ color: '#f44336' }}>
                    {systemStats?.absent || 0}
                  </Typography>
                  <Typography sx={classes.statLabel}>
                    Absent Today
                  </Typography>
                </Box>
                <Notifications style={{ fontSize: 48, color: '#f44336', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
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
                    onClick={() => setDepartmentDialog(true)}
                  >
                    <Business style={{ fontSize: 40, color: '#2196f3', marginBottom: 8 }} />
                    <Typography variant="h6">Add Department</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Create new department
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12}>
                  <Paper 
                    sx={classes.quickActionCard}
                    onClick={() => navigate('/admin/registration')}
                  >
                    <PersonAdd style={{ fontSize: 40, color: '#4caf50', marginBottom: 8 }} />
                    <Typography variant="h6">Student Registration</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Register students with ID card barcode detection
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12}>
                  <Paper 
                    sx={classes.quickActionCard}
                    onClick={() => navigate('/reports')}
                  >
                    <Report style={{ fontSize: 40, color: '#ff9800', marginBottom: 8 }} />
                    <Typography variant="h6">System Reports</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Generate comprehensive reports
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12}>
                  <Paper 
                    sx={classes.quickActionCard}
                    onClick={() => navigate('/analytics')}
                  >
                    <Analytics style={{ fontSize: 40, color: '#9c27b0', marginBottom: 8 }} />
                    <Typography variant="h6">Analytics</Typography>
                    <Typography variant="body2" color="textSecondary">
                      View system analytics
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Departments Management */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🏢 Departments
              </Typography>
              
              {departments.length === 0 ? (
                <Box textAlign="center" p={2}>
                  <School style={{ fontSize: 60, color: '#ccc' }} />
                  <Typography variant="body2" color="textSecondary">
                    No departments found
                  </Typography>
                </Box>
              ) : (
                <Box>
                  {departments.slice(0, 5).map((dept) => (
                    <Box key={dept.id} display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                      <Box>
                        <Typography variant="body1" fontWeight="bold">
                          {dept.code}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {dept.name}
                        </Typography>
                      </Box>
                      <Chip 
                        label={dept.is_active ? 'Active' : 'Inactive'} 
                        color={dept.is_active ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                  ))}
                  
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    style={{ marginTop: 16 }}
                    onClick={() => navigate('/admin/departments')}
                  >
                    Manage All Departments
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Pending Verifications */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🔍 System-Wide Pending Verifications
              </Typography>
              
              {pendingRecords.length === 0 ? (
                <Box textAlign="center" p={4}>
                  <CheckCircle style={{ fontSize: 60, color: '#4caf50' }} />
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
                        <TableCell>Department</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Time</TableCell>
                        <TableCell>Method</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pendingRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <Box display="flex" alignItems="center">
                              <Avatar sx={{ mr: 2 }}>
                                <People />
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
                          <TableCell>{record.student?.department}</TableCell>
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
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              onClick={() => openVerificationDialog(record)}
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

      
       
        </Grid>
        </>
      )}

      {/* Student Management Tab */}
      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h5">👥 Student Management</Typography>
              <Button
                variant="contained"
                startIcon={<PersonAdd />}
                onClick={() => navigate('/admin/registration')}
                color="primary"
              >
                Student Registration
              </Button>
            </Box>
            
            {/* Search and Filter Section */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Search Students"
                  placeholder="Search by name or register number"
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth>
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={studentFilters.department}
                    label="Department"
                    onChange={(e) => setStudentFilters({ ...studentFilters, department: e.target.value })}
                  >
                    <MenuItem value=""><em>All Departments</em></MenuItem>
                    {departments.map((dept) => (
                      <MenuItem key={dept.id} value={dept.code}>{dept.code} - {dept.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField
                  fullWidth
                  label="Year"
                  type="number"
                  value={studentFilters.year}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only allow values between 1-4 or empty string
                    if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 4)) {
                      setStudentFilters({ ...studentFilters, year: value });
                    }
                  }}
                  inputProps={{
                    min: 1,
                    max: 4,
                    step: 1
                  }}
                  placeholder="1-4"
                  helperText="Enter year from 1 to 4"
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField
                  fullWidth
                  label="Section"
                  value={studentFilters.section}
                  onChange={(e) => setStudentFilters({ ...studentFilters, section: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={1}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={fetchStudents}
                  sx={{ height: '56px' }}
                >
                  <Refresh />
                </Button>
              </Grid>
            </Grid>

            {/* Student Statistics */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={3}>
                <Card sx={{ bgcolor: '#e3f2fd', borderLeft: '4px solid #2196f3' }}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="h4" sx={{ color: '#2196f3', fontWeight: 'bold' }}>
                      {filteredStudents.length}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Students
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Card sx={{ bgcolor: '#e8f5e8', borderLeft: '4px solid #4caf50' }}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="h4" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                      {filteredStudents.filter(s => s.is_active).length}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Active Students
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Card sx={{ bgcolor: '#fff3e0', borderLeft: '4px solid #ff9800' }}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                      {[...new Set(filteredStudents.map(s => s.department))].length}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Departments
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Card sx={{ bgcolor: '#fce4ec', borderLeft: '4px solid #e91e63' }}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="h4" sx={{ color: '#e91e63', fontWeight: 'bold' }}>
                      {filteredStudents.filter(s => !s.is_active).length}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Inactive Students
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Students Table */}
            {loading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Register No</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Department</TableCell>
                      <TableCell>Year/Section</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Phone</TableCell>
                      <TableCell>Parent Contact</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} align="center">
                          <Box py={4}>
                            <School style={{ fontSize: 60, color: '#ccc' }} />
                            <Typography variant="h6" color="textSecondary">
                              No students found
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {students.length === 0 ? 'Start by registering your first student' : 'Try adjusting your search filters'}
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStudents.map((student) => (
                        <TableRow key={student.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {student.register_number}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center">
                              <Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: '#2196f3' }}>
                                {student.name?.charAt(0)?.toUpperCase()}
                              </Avatar>
                              {student.name}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={student.department} 
                              color="primary" 
                              variant="outlined" 
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {student.year} - {student.section}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {student.email}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {student.phone}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {student.parent_name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {student.parent_phone}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={student.is_active ? 'Active' : 'Inactive'}
                              color={student.is_active ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Box display="flex" gap={1}>
                              <Tooltip title="View Details">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleViewStudent(student)}
                                  color="info"
                                >
                                  <Visibility />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Edit Student">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleEditStudent(student)}
                                  color="primary"
                                >
                                  <Edit />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Deactivate Student">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleDeleteStudent(student)}
                                  color="warning"
                                >
                                  <Delete />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Permanently Delete">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handlePermanentDelete(student)}
                                  color="error"
                                >
                                  <DeleteForever />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Department Management Tab */}
      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h5">🏢 Department Management</Typography>
              <Button
                variant="contained"
                startIcon={<Business />}
                onClick={() => setDepartmentDialog(true)}
              >
                Add Department
              </Button>
            </Box>
            <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
              Manage departments, update credentials, and configure department settings.
            </Typography>

            {/* Departments Table */}
            {loading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Department Code</strong></TableCell>
                      <TableCell><strong>Department Name</strong></TableCell>
                      <TableCell><strong>HOD Name</strong></TableCell>
                      <TableCell><strong>HOD Email</strong></TableCell>
                      <TableCell><strong>HOD Phone</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {departments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography variant="body2" color="textSecondary">
                            No departments found. Click "Add Department" to create one.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      departments.map((dept) => (
                        <TableRow key={dept.id}>
                          <TableCell>
                            <Chip 
                              label={dept.code} 
                              color="primary" 
                              variant="outlined"
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{dept.name}</TableCell>
                          <TableCell>{dept.hod_name || '-'}</TableCell>
                          <TableCell>{dept.hod_email || '-'}</TableCell>
                          <TableCell>{dept.hod_phone || '-'}</TableCell>
                          <TableCell>
                            <Chip 
                              label={dept.is_active ? 'Active' : 'Inactive'} 
                              color={dept.is_active ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Box display="flex" gap={1}>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleEditDepartment(dept)}
                                title="Edit Department"
                              >
                                <Edit />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={() => handleDeleteDepartment(dept)}
                                title="Deactivate Department"
                              >
                                <Delete />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handlePermanentDeleteDepartment(dept)}
                                title="Permanently Delete Department"
                              >
                                <DeleteForever />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Attendance Records Tab */}
      {activeTab === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>📋 Attendance Records Management</Typography>
            <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
              View, filter, and export attendance records with daily/weekly/monthly views.
            </Typography>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth sx={classes.formField}>
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={attendanceFilters.department}
                    label="Department"
                    onChange={(e) => setAttendanceFilters({ ...attendanceFilters, department: e.target.value })}
                  >
                    <MenuItem value=""><em>All</em></MenuItem>
                    {departments.map((dept) => (
                      <MenuItem key={dept.id} value={dept.code}>{dept.code} - {dept.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField
                  fullWidth
                  label="Year"
                  type="number"
                  value={attendanceFilters.year}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only allow values between 1-4 or empty string
                    if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 4)) {
                      setAttendanceFilters({ ...attendanceFilters, year: value });
                    }
                  }}
                  sx={classes.formField}
                  inputProps={{
                    min: 1,
                    max: 4,
                    step: 1
                  }}
                  placeholder="1-4"
                  helperText="Enter year from 1 to 4"
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField
                  fullWidth
                  label="Section"
                  value={attendanceFilters.section}
                  onChange={(e) => setAttendanceFilters({ ...attendanceFilters, section: e.target.value })}
                  sx={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField
                  fullWidth
                  label="From"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={attendanceFilters.date_from}
                  onChange={(e) => setAttendanceFilters({ ...attendanceFilters, date_from: e.target.value })}
                  sx={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField
                  fullWidth
                  label="To"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={attendanceFilters.date_to}
                  onChange={(e) => setAttendanceFilters({ ...attendanceFilters, date_to: e.target.value })}
                  sx={classes.formField}
                />
              </Grid>
              <Grid item xs={12} sm={1.5}>
                <FormControl fullWidth sx={classes.formField}>
                  <InputLabel>View</InputLabel>
                  <Select
                    value={attendanceFilters.report_type}
                    label="View"
                    onChange={(e) => setAttendanceFilters({ ...attendanceFilters, report_type: e.target.value })}
                  >
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={12}>
                <Box display="flex" gap={1} flexWrap="wrap">
                  <Button 
                    variant="contained" 
                    onClick={fetchAttendanceReport}
                    disabled={attendanceLoading}
                    startIcon={attendanceLoading ? <CircularProgress size={20} /> : null}
                  >
                    {attendanceLoading ? 'Loading...' : 'Apply Filters'}
                  </Button>
                  <Button variant="outlined" onClick={resetAttendanceFilters}>Reset Filters</Button>
                  <Button variant="outlined" startIcon={<Download />} onClick={() => exportAttendance('excel')}>Export Excel</Button>
                  <Button variant="outlined" startIcon={<Download />} onClick={() => exportAttendance('pdf')}>Export PDF</Button>
                </Box>
              </Grid>
            </Grid>

            {/* Loading state */}
            {attendanceLoading && (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <CircularProgress size={60} />
                <Typography variant="h6" color="textSecondary" sx={{ mt: 2 }}>
                  Loading attendance records...
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Please wait while we fetch the data
                </Typography>
              </Box>
            )}

            {/* No results message when no report is loaded */}
            {!attendanceReport && !attendanceLoading && (
              <Box sx={{ textAlign: 'center', py: 6, backgroundColor: 'rgba(0, 0, 0, 0.02)', borderRadius: 1 }}>
                <Typography variant="h6" color="textSecondary" gutterBottom>
                  📊 Attendance Records Dashboard
                </Typography>
                <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
                  Use the filters above to view detailed attendance records
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  • Select department, year, section, or date range
                  <br />
                  • Choose between Daily, Weekly, or Monthly views
                  <br />
                  • Click "Apply Filters" to generate the report
                </Typography>
              </Box>
            )}

            {attendanceReport && (
              <>
                <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="subtitle1">
                    📊 {attendanceReport.total_students} students found | Date Range: {attendanceReport.date_range?.from || 'All'} to {attendanceReport.date_range?.to || 'All'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    View: {attendanceFilters.report_type.charAt(0).toUpperCase() + attendanceFilters.report_type.slice(1)}
                  </Typography>
                </Box>
                
                <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Register No</strong></TableCell>
                        <TableCell><strong>Student Name</strong></TableCell>
                        <TableCell><strong>Department</strong></TableCell>
                        <TableCell><strong>Year</strong></TableCell>
                        <TableCell><strong>Section</strong></TableCell>
                        <TableCell align="center"><strong>Total Days</strong></TableCell>
                        <TableCell align="center"><strong>Present</strong></TableCell>
                        <TableCell align="center"><strong>Late</strong></TableCell>
                        <TableCell align="center"><strong>Absent</strong></TableCell>
                        <TableCell align="center"><strong>Attendance %</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {attendanceReport.data.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} align="center">
                            <Typography variant="body2" color="textSecondary" sx={{ py: 3 }}>
                              No attendance records found for the selected filters.
                              <br />
                              Try adjusting your filters or date range.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        attendanceReport.data.map((row, index) => (
                          <TableRow 
                            key={row.register_number || index}
                            sx={{ 
                              '&:nth-of-type(odd)': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                              '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.08)' }
                            }}
                          >
                            <TableCell>
                              <Chip 
                                label={row.register_number} 
                                size="small" 
                                color="primary" 
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>{row.name}</TableCell>
                            <TableCell>
                              <Chip 
                                label={row.department} 
                                size="small" 
                                color="secondary" 
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell align="center">{row.year}</TableCell>
                            <TableCell align="center">{row.section}</TableCell>
                            <TableCell align="center">
                              <Typography variant="body2" fontWeight="bold">
                                {row.total_days || 0}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={row.present_days || 0} 
                                size="small" 
                                color="success"
                                sx={{ minWidth: 45 }}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={row.late_days || 0} 
                                size="small" 
                                color="warning"
                                sx={{ minWidth: 45 }}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={row.absent_days || 0} 
                                size="small" 
                                color="error"
                                sx={{ minWidth: 45 }}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Box display="flex" alignItems="center" justifyContent="center">
                                <Typography 
                                  variant="body2" 
                                  fontWeight="bold"
                                  color={
                                    (row.attendance_percentage || 0) >= 75 ? 'success.main' :
                                    (row.attendance_percentage || 0) >= 50 ? 'warning.main' : 'error.main'
                                  }
                                >
                                  {row.attendance_percentage || 0}%
                                </Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Summary Statistics */}
                {attendanceReport.data.length > 0 && (
                  <Box sx={{ mt: 2, p: 2, backgroundColor: 'rgba(0, 0, 0, 0.02)', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>📈 Summary Statistics</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="textSecondary">Total Students</Typography>
                        <Typography variant="h6">{attendanceReport.total_students}</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="textSecondary">Avg Attendance</Typography>
                        <Typography variant="h6" color="primary">
                          {attendanceReport.data.length > 0 
                            ? Math.round(attendanceReport.data.reduce((sum, student) => sum + (student.attendance_percentage || 0), 0) / attendanceReport.data.length)
                            : 0}%
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="textSecondary">High Performers</Typography>
                        <Typography variant="h6" color="success.main">
                          {attendanceReport.data.filter(s => (s.attendance_percentage || 0) >= 75).length}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="body2" color="textSecondary">At Risk</Typography>
                        <Typography variant="h6" color="error.main">
                          {attendanceReport.data.filter(s => (s.attendance_percentage || 0) < 50).length}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}


      {/* System Management Tab */}
      {activeTab === 4 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h5">⚙️ System Management</Typography>
              <Button
                variant="contained"
                startIcon={<Settings />}
                onClick={() => setSystemDialog(true)}
              >
                System Settings
              </Button>
            </Box>
            <Typography variant="body1" color="textSecondary">
              Manage admin credentials, JWT sessions, database backup, and system health monitoring.
            </Typography>
            <Box mt={2}>
              <Button variant="outlined" startIcon={<VpnKey />} onClick={() => setResetDialog(true)}>
                Reset User/Student Password
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Department Creation Dialog */}
      <Dialog 
        open={departmentDialog} 
        onClose={() => setDepartmentDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Department</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Department Code"
            value={departmentForm.code}
            onChange={(e) => setDepartmentForm({...departmentForm, code: e.target.value})}
            sx={classes.formField}
            placeholder="e.g., CS, IT, ECE"
            required
          />
          <TextField
            fullWidth
            label="Department Login Password"
            type="password"
            value={departmentForm.password}
            onChange={(e) => setDepartmentForm({...departmentForm, password: e.target.value})}
            sx={classes.formField}
            placeholder="e.g., cs123"
            required
          />
          <TextField
            fullWidth
            label="Department Name"
            value={departmentForm.name}
            onChange={(e) => setDepartmentForm({...departmentForm, name: e.target.value})}
            sx={classes.formField}
            placeholder="e.g., Computer Science"
            required
          />
          <TextField
            fullWidth
            label="HOD Name"
            value={departmentForm.hod_name}
            onChange={(e) => setDepartmentForm({...departmentForm, hod_name: e.target.value})}
            sx={classes.formField}
            placeholder="Head of Department"
          />
          <TextField
            fullWidth
            label="HOD Email"
            type="email"
            value={departmentForm.hod_email}
            onChange={(e) => setDepartmentForm({...departmentForm, hod_email: e.target.value})}
            sx={classes.formField}
            placeholder="hod@department.edu"
          />
          <TextField
            fullWidth
            label="HOD Phone"
            value={departmentForm.hod_phone}
            onChange={(e) => setDepartmentForm({...departmentForm, hod_phone: e.target.value})}
            sx={classes.formField}
            placeholder="+91 9876543210"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDepartmentDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateDepartment}
            variant="contained"
            color="primary"
          >
            Create Department
          </Button>
        </DialogActions>
      </Dialog>

      {/* Department Edit Dialog */}
      <Dialog 
        open={departmentEditDialog} 
        onClose={() => setDepartmentEditDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Department</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Department Code"
            value={departmentForm.code}
            onChange={(e) => setDepartmentForm({...departmentForm, code: e.target.value})}
            sx={classes.formField}
            placeholder="e.g., CS, IT, ECE"
            required
          />
          <TextField
            fullWidth
            label="Department Name"
            value={departmentForm.name}
            onChange={(e) => setDepartmentForm({...departmentForm, name: e.target.value})}
            sx={classes.formField}
            placeholder="e.g., Computer Science"
            required
          />
          <TextField
            fullWidth
            label="HOD Name"
            value={departmentForm.hod_name}
            onChange={(e) => setDepartmentForm({...departmentForm, hod_name: e.target.value})}
            sx={classes.formField}
            placeholder="Head of Department"
          />
          <TextField
            fullWidth
            label="HOD Email"
            type="email"
            value={departmentForm.hod_email}
            onChange={(e) => setDepartmentForm({...departmentForm, hod_email: e.target.value})}
            sx={classes.formField}
            placeholder="hod@department.edu"
          />
          <TextField
            fullWidth
            label="HOD Phone"
            value={departmentForm.hod_phone}
            onChange={(e) => setDepartmentForm({...departmentForm, hod_phone: e.target.value})}
            sx={classes.formField}
            placeholder="+91 9876543210"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDepartmentEditDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateDepartment}
            variant="contained"
            color="primary"
          >
            Update Department
          </Button>
        </DialogActions>
      </Dialog>

      {/* Department Delete Confirmation Dialog */}
      <Dialog 
        open={departmentDeleteDialog} 
        onClose={() => setDepartmentDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Warning color="warning" />
            Deactivate Department
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            This will deactivate the department and login credentials. Data will be preserved for audit purposes.
          </Alert>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to deactivate the department "{selectedDepartment?.name}" ({selectedDepartment?.code})?
          </Typography>
          <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, mt: 2 }}>
            <Typography variant="body2"><strong>Department Code:</strong> {selectedDepartment?.code}</Typography>
            <Typography variant="body2"><strong>Department Name:</strong> {selectedDepartment?.name}</Typography>
            <Typography variant="body2"><strong>HOD:</strong> {selectedDepartment?.hod_name || 'Not specified'}</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDepartmentDeleteDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDeleteDepartment}
            variant="contained"
            color="warning"
            startIcon={<Delete />}
          >
            Deactivate Department
          </Button>
        </DialogActions>
      </Dialog>

      {/* Permanent Department Delete Confirmation Dialog */}
      <Dialog 
        open={permanentDepartmentDeleteDialog} 
        onClose={() => setPermanentDepartmentDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Error color="error" />
            ⚠️ PERMANENT DELETE DEPARTMENT - WARNING
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <strong>DANGER:</strong> This action CANNOT be undone! All department data, students, attendance records, and login credentials will be permanently removed from the database.
          </Alert>
          {selectedDepartment && (
            <Box>
              <Typography variant="body1" gutterBottom>
                Are you absolutely sure you want to permanently delete this department?
              </Typography>
              <Box sx={{ bgcolor: '#ffebee', p: 2, borderRadius: 1, mt: 2, border: '2px solid #f44336' }}>
                <Typography variant="body2"><strong>Department Code:</strong> {selectedDepartment.code}</Typography>
                <Typography variant="body2"><strong>Department Name:</strong> {selectedDepartment.name}</Typography>
                <Typography variant="body2"><strong>HOD:</strong> {selectedDepartment.hod_name || 'Not specified'}</Typography>
              </Box>
              <Typography variant="body2" color="error" sx={{ mt: 2, fontWeight: 'bold' }}>
                This will delete ALL associated data including:
              </Typography>
              <Typography variant="body2" component="ul" sx={{ pl: 2, color: 'error.main' }}>
                <li>Department profile and information</li>
                <li>ALL students in this department</li>
                <li>ALL attendance records for department students</li>
                <li>Face recognition data and encodings</li>
                <li>Department and student login credentials</li>
                <li>QR codes and generated data</li>
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermanentDepartmentDeleteDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleConfirmPermanentDeleteDepartment}
            variant="contained"
            color="error"
            startIcon={<DeleteForever />}
          >
            PERMANENTLY DELETE DEPARTMENT
          </Button>
        </DialogActions>
      </Dialog>

      {/* Removed User Creation Dialog */}


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

      {/* Password Reset Dialog */}
      <Dialog 
        open={resetDialog} 
        onClose={() => setResetDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Password Reset</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={classes.formField}>
            <InputLabel>Account Type</InputLabel>
            <Select
              value={resetForm.user_type}
              label="Account Type"
              onChange={(e) => setResetForm({ ...resetForm, user_type: e.target.value })}
            >
              <MenuItem value="user">Department/Admin (username)</MenuItem>
              <MenuItem value="student">Student (register number)</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label={resetForm.user_type === 'student' ? 'Register Number' : 'Username'}
            value={resetForm.identifier}
            onChange={(e) => setResetForm({ ...resetForm, identifier: e.target.value })}
            sx={classes.formField}
            required
          />
          <TextField
            fullWidth
            label="New Password"
            type="password"
            value={resetForm.new_password}
            onChange={(e) => setResetForm({ ...resetForm, new_password: e.target.value })}
            sx={classes.formField}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialog(false)}>Cancel</Button>
          <Button onClick={handlePasswordReset} variant="contained" color="primary">Reset Password</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
      >
        <Alert onClose={() => setError('')} severity="error">
          {error}
        </Alert>
      </Snackbar>

      {/* Student View Dialog */}
      <Dialog 
        open={studentViewDialog} 
        onClose={() => setStudentViewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: '#2196f3' }}>
              {selectedStudent?.name?.charAt(0)?.toUpperCase()}
            </Avatar>
            Student Details - {selectedStudent?.name}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedStudent && (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Typography variant="h6" gutterBottom>Basic Information</Typography>
                <Typography variant="body2"><strong>Register Number:</strong> {selectedStudent.register_number}</Typography>
                <Typography variant="body2"><strong>Name:</strong> {selectedStudent.name}</Typography>
                <Typography variant="body2"><strong>Email:</strong> {selectedStudent.email}</Typography>
                <Typography variant="body2"><strong>Phone:</strong> {selectedStudent.phone}</Typography>
                <Typography variant="body2"><strong>Date of Birth:</strong> {selectedStudent.date_of_birth}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="h6" gutterBottom>Academic Information</Typography>
                <Typography variant="body2"><strong>Department:</strong> {selectedStudent.department}</Typography>
                <Typography variant="body2"><strong>Year:</strong> {selectedStudent.year}</Typography>
                <Typography variant="body2"><strong>Section:</strong> {selectedStudent.section}</Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2"><strong>Status:</strong></Typography>
                  <Chip 
                    label={selectedStudent.is_active ? 'Active' : 'Inactive'}
                    color={selectedStudent.is_active ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="h6" gutterBottom>Parent Information</Typography>
                <Typography variant="body2"><strong>Parent Name:</strong> {selectedStudent.parent_name}</Typography>
                <Typography variant="body2"><strong>Parent Email:</strong> {selectedStudent.parent_email}</Typography>
                <Typography variant="body2"><strong>Parent Phone:</strong> {selectedStudent.parent_phone}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="h6" gutterBottom>System Information</Typography>
                <Typography variant="body2"><strong>QR Code:</strong> {selectedStudent.qr_code ? 'Generated' : 'Not Generated'}</Typography>
                <Typography variant="body2"><strong>Face Encoding:</strong> {selectedStudent.face_encoding ? 'Stored' : 'Not Stored'}</Typography>
                <Typography variant="body2"><strong>Created:</strong> {new Date(selectedStudent.created_at).toLocaleDateString()}</Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStudentViewDialog(false)}>Close</Button>
          <Button 
            onClick={() => {
              setStudentViewDialog(false);
              handleEditStudent(selectedStudent);
            }}
            variant="contained"
            startIcon={<Edit />}
          >
            Edit Student
          </Button>
        </DialogActions>
      </Dialog>

      {/* Student Edit Dialog */}
      <Dialog 
        open={studentEditDialog} 
        onClose={() => setStudentEditDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Student - {selectedStudent?.register_number}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Register Number"
                value={studentForm.register_number}
                onChange={(e) => setStudentForm({...studentForm, register_number: e.target.value})}
                sx={classes.formField}
                disabled // Usually register number shouldn't be editable
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Student Name"
                value={studentForm.name}
                onChange={(e) => setStudentForm({...studentForm, name: e.target.value})}
                sx={classes.formField}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={studentForm.email}
                onChange={(e) => setStudentForm({...studentForm, email: e.target.value})}
                sx={classes.formField}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={studentForm.phone}
                onChange={(e) => setStudentForm({...studentForm, phone: e.target.value})}
                sx={classes.formField}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date of Birth"
                type="date"
                value={studentForm.date_of_birth}
                onChange={(e) => setStudentForm({...studentForm, date_of_birth: e.target.value})}
                sx={classes.formField}
                InputLabelProps={{
                  shrink: true,
                }}
                helperText="Used for student/parent login authentication"
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth sx={classes.formField}>
                <InputLabel>Department</InputLabel>
                <Select
                  value={studentForm.department}
                  onChange={(e) => setStudentForm({...studentForm, department: e.target.value})}
                  label="Department"
                >
                  {departments.map((dept) => (
                    <MenuItem key={dept.id} value={dept.code}>
                      {dept.code} - {dept.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Year"
                type="number"
                value={studentForm.year}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  // Only allow values between 1-4
                  if (!isNaN(value) && value >= 1 && value <= 4) {
                    setStudentForm({...studentForm, year: value});
                  } else if (e.target.value === '') {
                    setStudentForm({...studentForm, year: ''});
                  }
                }}
                sx={classes.formField}
                inputProps={{
                  min: 1,
                  max: 4,
                  step: 1
                }}
                placeholder="1-4"
                helperText="Enter year from 1 to 4"
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Section"
                value={studentForm.section}
                onChange={(e) => setStudentForm({...studentForm, section: e.target.value})}
                sx={classes.formField}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Parent Information</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Parent Name"
                value={studentForm.parent_name}
                onChange={(e) => setStudentForm({...studentForm, parent_name: e.target.value})}
                sx={classes.formField}
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Parent Email"
                type="email"
                value={studentForm.parent_email}
                onChange={(e) => setStudentForm({...studentForm, parent_email: e.target.value})}
                sx={classes.formField}
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Parent Phone"
                value={studentForm.parent_phone}
                onChange={(e) => setStudentForm({...studentForm, parent_phone: e.target.value})}
                sx={classes.formField}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date of Birth"
                type="date"
                value={studentForm.date_of_birth}
                onChange={(e) => setStudentForm({...studentForm, date_of_birth: e.target.value})}
                sx={classes.formField}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStudentEditDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleUpdateStudent}
            variant="contained"
            color="primary"
          >
            Update Student
          </Button>
        </DialogActions>
      </Dialog>

      {/* Student Delete Confirmation Dialog */}
      <Dialog 
        open={studentDeleteDialog} 
        onClose={() => setStudentDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Warning color="warning" />
            Confirm Delete Student
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            This will deactivate the student record and login credentials. Data will be preserved for audit purposes.
          </Alert>
          {selectedStudent && (
            <Box>
              <Typography variant="body1" gutterBottom>
                Are you sure you want to delete the following student?
              </Typography>
              <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, mt: 2 }}>
                <Typography variant="body2"><strong>Register Number:</strong> {selectedStudent.register_number}</Typography>
                <Typography variant="body2"><strong>Name:</strong> {selectedStudent.name}</Typography>
                <Typography variant="body2"><strong>Department:</strong> {selectedStudent.department}</Typography>
                <Typography variant="body2"><strong>Year/Section:</strong> {selectedStudent.year} - {selectedStudent.section}</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStudentDeleteDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleConfirmDeleteStudent}
            variant="contained"
            color="warning"
            startIcon={<Delete />}
          >
            Deactivate Student
          </Button>
        </DialogActions>
      </Dialog>

      {/* Permanent Delete Confirmation Dialog */}
      <Dialog 
        open={permanentDeleteDialog} 
        onClose={() => setPermanentDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Error color="error" />
            ⚠️ PERMANENT DELETE - WARNING
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <strong>DANGER:</strong> This action CANNOT be undone! All student data, attendance records, and login credentials will be permanently removed from the database.
          </Alert>
          {selectedStudent && (
            <Box>
              <Typography variant="body1" gutterBottom>
                Are you absolutely sure you want to permanently delete this student?
              </Typography>
              <Box sx={{ bgcolor: '#ffebee', p: 2, borderRadius: 1, mt: 2, border: '2px solid #f44336' }}>
                <Typography variant="body2"><strong>Register Number:</strong> {selectedStudent.register_number}</Typography>
                <Typography variant="body2"><strong>Name:</strong> {selectedStudent.name}</Typography>
                <Typography variant="body2"><strong>Department:</strong> {selectedStudent.department}</Typography>
                <Typography variant="body2"><strong>Year/Section:</strong> {selectedStudent.year} - {selectedStudent.section}</Typography>
              </Box>
              <Typography variant="body2" color="error" sx={{ mt: 2, fontWeight: 'bold' }}>
                This will delete ALL associated data including:
              </Typography>
              <Typography variant="body2" component="ul" sx={{ pl: 2, color: 'error.main' }}>
                <li>Student profile and personal information</li>
                <li>All attendance records and history</li>
                <li>Face recognition data and encodings</li>
                <li>Login credentials and user account</li>
                <li>QR codes and generated data</li>
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermanentDeleteDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleConfirmPermanentDelete}
            variant="contained"
            color="error"
            startIcon={<DeleteForever />}
          >
            PERMANENTLY DELETE
          </Button>
        </DialogActions>
      </Dialog>

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
            startIcon={<Error />}
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

    </Container>
  );
};

export default AdminDashboard;
