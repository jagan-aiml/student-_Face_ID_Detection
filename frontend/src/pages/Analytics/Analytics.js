import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer
} from 'recharts';
import {
  Analytics as AnalyticsIcon,
  TrendingUp,
  People,
  Schedule,
  Assessment,
  GetApp,
  DateRange,
  ArrowBack
} from '@mui/icons-material';
import axios from 'axios';

// Style constants for sx prop usage
const styles = {
  container: {
    paddingTop: 2,
    paddingBottom: 2,
  },
  filterCard: {
    padding: 2,
    marginBottom: 3,
  },
  chartCard: {
    padding: 2,
    height: 400,
  },
  statCard: {
    textAlign: 'center',
    padding: 2,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
  },
  statNumber: {
    fontSize: '2rem',
    fontWeight: 700,
  },
  trendUp: {
    color: '#4caf50',
  },
  trendDown: {
    color: '#f44336',
  },
};

const Analytics = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const [filters, setFilters] = useState({
    dateRange: '30',
    department: '',
    dateFrom: '',
    dateTo: ''
  });
  
  const [analyticsData, setAnalyticsData] = useState({
    overview: {
      totalStudents: 0,
      averageAttendance: 0,
      totalClasses: 0,
      presentDays: 0,
      trendPercent: 0
    },
    departmentStats: [],
    attendanceTrend: [],
    statusDistribution: [],
    monthlyTrends: []
  });
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAnalyticsData();
  }, [filters]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // Prepare date range for API
      let dateFrom = filters.dateFrom;
      let dateTo = filters.dateTo;
      
      if (!dateFrom || !dateTo) {
        const today = new Date();
        dateTo = today.toISOString().split('T')[0];
        
        if (filters.dateRange === '7') {
          dateFrom = new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0];
        } else if (filters.dateRange === '90') {
          dateFrom = new Date(today.setDate(today.getDate() - 90)).toISOString().split('T')[0];
        } else if (filters.dateRange === '365') {
          dateFrom = new Date(today.setDate(today.getDate() - 365)).toISOString().split('T')[0];
        } else {
          dateFrom = new Date(today.setDate(today.getDate() - 30)).toISOString().split('T')[0];
        }
      }

      // Fetch real data from multiple endpoints
      const [studentsRes, attendanceRes, statsRes] = await Promise.all([
        axios.get('http://localhost:8000/students'),
        axios.get(`http://localhost:8000/attendance/records?date_from=${dateFrom}&date_to=${dateTo}`),
        axios.get(`http://localhost:8000/analytics/stats?date_from=${dateFrom}&date_to=${dateTo}&department=${filters.department || ''}`)
      ]);

      const students = studentsRes.data;
      const attendanceRecords = attendanceRes.data;
      const stats = statsRes.data;

      // Calculate department statistics from real data
      const departmentMap = {};
      students.forEach(student => {
        if (!departmentMap[student.department]) {
          departmentMap[student.department] = {
            name: student.department,
            students: 0,
            present: 0,
            late: 0,
            absent: 0,
            pending: 0
          };
        }
        departmentMap[student.department].students++;
      });

      // Calculate attendance statistics
      attendanceRecords.forEach(record => {
        const dept = record.student?.department;
        if (dept && departmentMap[dept]) {
          if (record.status === 'Present') departmentMap[dept].present++;
          else if (record.status === 'Late') departmentMap[dept].late++;
          else if (record.status === 'Pending') departmentMap[dept].pending++;
        }
      });

      // Convert to array and calculate attendance percentage
      const departmentStats = Object.values(departmentMap).map(dept => ({
        ...dept,
        attendance: dept.students > 0 ? 
          Math.round(((dept.present + dept.late) / (dept.present + dept.late + dept.absent)) * 100 * 10) / 10 : 0
      }));

      // Calculate status distribution
      let presentCount = 0, lateCount = 0, pendingCount = 0, absentCount = 0;
      attendanceRecords.forEach(record => {
        if (record.status === 'Present') presentCount++;
        else if (record.status === 'Late') lateCount++;
        else if (record.status === 'Pending') pendingCount++;
      });
      
      const totalRecords = attendanceRecords.length || 1;
      const statusDistribution = [
        { name: 'Present', value: Math.round((presentCount / totalRecords) * 100), color: '#4caf50' },
        { name: 'Late', value: Math.round((lateCount / totalRecords) * 100), color: '#ff9800' },
        { name: 'Pending', value: Math.round((pendingCount / totalRecords) * 100), color: '#2196f3' },
        { name: 'Absent', value: Math.round((absentCount / totalRecords) * 100), color: '#f44336' }
      ];

      // Calculate attendance trend by date
      const trendMap = {};
      attendanceRecords.forEach(record => {
        const date = record.date;
        if (!trendMap[date]) {
          trendMap[date] = { date, total: 0, present: 0 };
        }
        trendMap[date].total++;
        if (record.status === 'Present' || record.status === 'Late') {
          trendMap[date].present++;
        }
      });

      const attendanceTrend = Object.values(trendMap)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(-7) // Last 7 days
        .map(item => ({
          date: item.date,
          attendance: item.total > 0 ? Math.round((item.present / item.total) * 100) : 0
        }));

      // Calculate monthly trends
      const monthlyMap = {};
      attendanceRecords.forEach(record => {
        const month = new Date(record.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (!monthlyMap[month]) {
          monthlyMap[month] = { month, total: 0, present: 0 };
        }
        monthlyMap[month].total++;
        if (record.status === 'Present' || record.status === 'Late') {
          monthlyMap[month].present++;
        }
      });

      const monthlyTrends = Object.values(monthlyMap)
        .sort((a, b) => new Date(a.month) - new Date(b.month))
        .slice(-6) // Last 6 months
        .map(item => ({
          month: item.month.split(' ')[0], // Just month name
          attendance: item.total > 0 ? Math.round((item.present / item.total) * 100) : 0
        }));

      // Calculate overview
      const averageAttendance = totalRecords > 0 ? 
        Math.round(((presentCount + lateCount) / totalRecords) * 100 * 10) / 10 : 0;
      
      setAnalyticsData({
        overview: {
          totalStudents: students.length,
          averageAttendance,
          totalClasses: Math.ceil(attendanceRecords.length / students.length) || 0,
          presentDays: presentCount + lateCount,
          trendPercent: stats.trend_percent || 0
        },
        departmentStats,
        attendanceTrend,
        statusDistribution,
        monthlyTrends
      });
      
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      // Set empty data on error
      setAnalyticsData({
        overview: {
          totalStudents: 0,
          averageAttendance: 0,
          totalClasses: 0,
          presentDays: 0,
          trendPercent: 0
        },
        departmentStats: [],
        attendanceTrend: [],
        statusDistribution: [],
        monthlyTrends: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const exportData = () => {
    // Mock export functionality
    const csvContent = [
      'Department,Students,Attendance Rate,Present,Late,Absent',
      ...analyticsData.departmentStats.map(dept => 
        `${dept.name},${dept.students},${dept.attendance}%,${dept.present},${dept.late},${dept.absent}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'attendance_analytics.csv';
    link.click();
  };

  const handleBack = () => {
    // Navigate back to appropriate dashboard based on user role
    if (user.role === 'admin') {
      navigate('/admin');
    } else if (user.role === 'department') {
      navigate('/department');
    } else {
      navigate('/');
    }
  };

  // Check if there's any data
  const hasData = analyticsData.overview.totalStudents > 0 || analyticsData.departmentStats.length > 0;

  return (
    <Container maxWidth="xl" sx={styles.container}>
      {/* Navigation Header */}
      <Box display="flex" alignItems="center" mb={2}>
        <IconButton 
          onClick={handleBack}
          sx={{ mr: 2 }}
          color="primary"
        >
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" gutterBottom sx={{ mb: 0 }}>
          📈 Analytics Dashboard
        </Typography>
      </Box>
      
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="subtitle1" color="textSecondary">
            Comprehensive attendance analytics and insights
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<GetApp />}
          onClick={exportData}
        >
          Export Data
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={styles.filterCard}>
        <Typography variant="h6" gutterBottom>
          🔍 Filter Analytics
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Date Range</InputLabel>
              <Select
                value={filters.dateRange}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              >
                <MenuItem value="7">Last 7 Days</MenuItem>
                <MenuItem value="30">Last 30 Days</MenuItem>
                <MenuItem value="90">Last 3 Months</MenuItem>
                <MenuItem value="365">Last Year</MenuItem>
                <MenuItem value="custom">Custom Range</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Department</InputLabel>
              <Select
                value={filters.department}
                onChange={(e) => handleFilterChange('department', e.target.value)}
              >
                <MenuItem value="">All Departments</MenuItem>
                <MenuItem value="CS">Computer Science</MenuItem>
                <MenuItem value="IT">Information Technology</MenuItem>
                <MenuItem value="ECE">Electronics & Communication</MenuItem>
                <MenuItem value="ME">Mechanical Engineering</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {filters.dateRange === 'custom' && (
            <>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  label="From Date"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  label="To Date"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </>
          )}
          
          <Grid item xs={12} sm={6} md={2}>
            <Button
              variant="outlined"
              onClick={fetchAnalyticsData}
              disabled={loading}
              fullWidth
            >
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </Grid>
        </Grid>
      </Card>

      {/* No Data Message */}
      {!hasData && !loading && (
        <Card sx={{ p: 4, textAlign: 'center', backgroundColor: '#f5f5f5' }}>
          <Typography variant="h5" gutterBottom>
            📊 No Data Available Yet
          </Typography>
          <Typography variant="body1" color="textSecondary" paragraph>
            The system is ready for real-time attendance tracking.
          </Typography>
          <Typography variant="body2" color="textSecondary">
            • Register students through the Admin or Department dashboard
            <br />
            • Start marking attendance using the Scanner page
            <br />
            • Analytics will be generated automatically from real attendance data
          </Typography>
        </Card>
      )}

      {/* Overview Statistics */}
      {hasData && (
      <>
      <Grid container spacing={3} style={{ marginBottom: 24 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={styles.statCard}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Students
              </Typography>
              <Typography sx={styles.statNumber}>
                {analyticsData.overview.totalStudents}
              </Typography>
              <Box display="flex" alignItems="center" justifyContent="center" mt={1}>
                <TrendingUp sx={styles.trendUp} />
                <Typography variant="body2">
                  +{analyticsData.overview.trendPercent}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={styles.statCard}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Average Attendance
              </Typography>
              <Typography sx={styles.statNumber}>
                {analyticsData.overview.averageAttendance}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={analyticsData.overview.averageAttendance}
                style={{ marginTop: 8, backgroundColor: 'rgba(255,255,255,0.3)' }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={styles.statCard}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Classes
              </Typography>
              <Typography sx={styles.statNumber}>
                {analyticsData.overview.totalClasses}
              </Typography>
              <Typography variant="body2" style={{ opacity: 0.9 }}>
                Days Conducted
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={styles.statCard}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Present Days
              </Typography>
              <Typography sx={styles.statNumber}>
                {analyticsData.overview.presentDays}
              </Typography>
              <Typography variant="body2" style={{ opacity: 0.9 }}>
                Student-Days Present
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Department Comparison */}
        <Grid item xs={12} md={8}>
          <Card sx={styles.chartCard}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 Department Attendance Comparison
              </Typography>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.departmentStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="present" fill="#4caf50" name="Present" />
                  <Bar dataKey="late" fill="#ff9800" name="Late" />
                  <Bar dataKey="absent" fill="#f44336" name="Absent" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Status Distribution */}
        <Grid item xs={12} md={4}>
          <Card sx={styles.chartCard}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🥧 Attendance Distribution
              </Typography>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analyticsData.statusDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({name, value}) => `${name}: ${value}%`}
                  >
                    {analyticsData.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Attendance Trend */}
        <Grid item xs={12}>
          <Card sx={styles.chartCard}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📈 Attendance Trend Over Time
              </Typography>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analyticsData.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="attendance" 
                    stroke="#2196f3" 
                    strokeWidth={3}
                    name="Attendance %" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Department Details Table */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📋 Detailed Department Statistics
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Department</TableCell>
                      <TableCell align="center">Total Students</TableCell>
                      <TableCell align="center">Attendance Rate</TableCell>
                      <TableCell align="center">Present</TableCell>
                      <TableCell align="center">Late</TableCell>
                      <TableCell align="center">Absent</TableCell>
                      <TableCell align="center">Performance</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analyticsData.departmentStats.map((dept, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <AnalyticsIcon style={{ marginRight: 8, color: '#1976d2' }} />
                            {dept.name}
                          </Box>
                        </TableCell>
                        <TableCell align="center">{dept.students}</TableCell>
                        <TableCell align="center">
                          <Box display="flex" alignItems="center" justifyContent="center">
                            <Typography variant="body2" style={{ marginRight: 8 }}>
                              {dept.attendance}%
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={dept.attendance}
                              style={{ width: 60, height: 4 }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={dept.present} 
                            size="small" 
                            style={{ backgroundColor: '#4caf50', color: 'white' }} 
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={dept.late} 
                            size="small" 
                            style={{ backgroundColor: '#ff9800', color: 'white' }} 
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={dept.absent} 
                            size="small" 
                            style={{ backgroundColor: '#f44336', color: 'white' }} 
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={dept.attendance >= 90 ? 'Excellent' : dept.attendance >= 80 ? 'Good' : 'Needs Improvement'}
                            size="small"
                            color={dept.attendance >= 90 ? 'primary' : dept.attendance >= 80 ? 'default' : 'secondary'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      </>
      )}
    </Container>
  );
};

export default Analytics;
