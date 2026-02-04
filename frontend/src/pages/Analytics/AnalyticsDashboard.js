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
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme
} from '@mui/material';
import {
  Analytics,
  TrendingUp,
  TrendingDown,
  People,
  School,
  Assessment,
  CalendarToday,
  Timeline,
  PieChart,
  BarChart,
  ShowChart
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const AnalyticsDashboard = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('week');
  const [analytics, setAnalytics] = useState({
    overallStats: {
      totalStudents: 1250,
      averageAttendance: 87.5,
      attendanceTrend: 2.3,
      punctualityRate: 92.1
    },
    departmentStats: [
      { name: 'Computer Science', students: 350, attendance: 89.2, trend: 1.5 },
      { name: 'Information Technology', students: 280, attendance: 91.8, trend: 3.2 },
      { name: 'Electronics & Communication', students: 240, attendance: 85.6, trend: -0.8 },
      { name: 'Mechanical Engineering', students: 220, attendance: 83.4, trend: 0.9 },
      { name: 'Civil Engineering', students: 160, attendance: 88.7, trend: 2.1 }
    ],
    weeklyTrends: [
      { day: 'Monday', attendance: 92.1, late: 5.2, absent: 2.7 },
      { day: 'Tuesday', attendance: 89.8, late: 6.1, absent: 4.1 },
      { day: 'Wednesday', attendance: 87.3, late: 7.8, absent: 4.9 },
      { day: 'Thursday', attendance: 85.6, late: 8.9, absent: 5.5 },
      { day: 'Friday', attendance: 83.2, late: 9.1, absent: 7.7 }
    ],
    topPerformers: [
      { name: 'Jane Smith', registerNumber: '20CS001', attendance: 98.5, department: 'CS' },
      { name: 'John Doe', registerNumber: '20IT002', attendance: 97.8, department: 'IT' },
      { name: 'Alice Johnson', registerNumber: '20EC003', attendance: 96.9, department: 'EC' },
      { name: 'Bob Wilson', registerNumber: '20ME004', attendance: 96.2, department: 'ME' },
      { name: 'Carol Brown', registerNumber: '20CE005', attendance: 95.8, department: 'CE' }
    ],
    lowPerformers: [
      { name: 'David Miller', registerNumber: '20CS101', attendance: 65.2, department: 'CS' },
      { name: 'Emma Davis', registerNumber: '20IT102', attendance: 67.8, department: 'IT' },
      { name: 'Frank Garcia', registerNumber: '20EC103', attendance: 69.1, department: 'EC' },
      { name: 'Grace Lee', registerNumber: '20ME104', attendance: 71.5, department: 'ME' },
      { name: 'Henry Taylor', registerNumber: '20CE105', attendance: 72.9, department: 'CE' }
    ]
  });

  const getAttendanceColor = (percentage) => {
    if (percentage >= 90) return '#4caf50';
    if (percentage >= 75) return '#ff9800';
    return '#f44336';
  };

  const getTrendIcon = (trend) => {
    if (trend > 0) return <TrendingUp sx={{ color: '#4caf50', fontSize: 16 }} />;
    if (trend < 0) return <TrendingDown sx={{ color: '#f44336', fontSize: 16 }} />;
    return <ShowChart sx={{ color: '#757575', fontSize: 16 }} />;
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item>
              <Avatar sx={{ width: 60, height: 60, bgcolor: 'rgba(255,255,255,0.2)' }}>
                <Analytics sx={{ fontSize: 30 }} />
              </Avatar>
            </Grid>
            <Grid item xs>
              <Typography variant="h4" gutterBottom>
                Analytics Dashboard
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Comprehensive attendance analytics and insights
              </Typography>
            </Grid>
            <Grid item>
              <FormControl sx={{ minWidth: 120, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                <InputLabel sx={{ color: 'white' }}>Time Range</InputLabel>
                <Select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  sx={{ color: 'white', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' } }}
                >
                  <MenuItem value="week">This Week</MenuItem>
                  <MenuItem value="month">This Month</MenuItem>
                  <MenuItem value="semester">This Semester</MenuItem>
                  <MenuItem value="year">This Year</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Overall Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', borderLeft: '4px solid #4caf50' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" sx={{ color: '#4caf50', fontWeight: 700 }}>
                    {analytics.overallStats.totalStudents}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Students
                  </Typography>
                </Box>
                <People sx={{ fontSize: 48, color: '#4caf50', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', borderLeft: '4px solid #2196f3' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" sx={{ color: '#2196f3', fontWeight: 700 }}>
                    {analytics.overallStats.averageAttendance}%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Average Attendance
                  </Typography>
                  <Box display="flex" alignItems="center" mt={0.5}>
                    {getTrendIcon(analytics.overallStats.attendanceTrend)}
                    <Typography variant="caption" sx={{ ml: 0.5 }}>
                      {analytics.overallStats.attendanceTrend > 0 ? '+' : ''}{analytics.overallStats.attendanceTrend}%
                    </Typography>
                  </Box>
                </Box>
                <Assessment sx={{ fontSize: 48, color: '#2196f3', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', borderLeft: '4px solid #ff9800' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 700 }}>
                    {analytics.overallStats.punctualityRate}%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Punctuality Rate
                  </Typography>
                </Box>
                <CalendarToday sx={{ fontSize: 48, color: '#ff9800', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', borderLeft: '4px solid #9c27b0' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" sx={{ color: '#9c27b0', fontWeight: 700 }}>
                    5
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Departments
                  </Typography>
                </Box>
                <School sx={{ fontSize: 48, color: '#9c27b0', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Department Performance */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 Department Performance Analysis
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Department</TableCell>
                      <TableCell align="center">Students</TableCell>
                      <TableCell align="center">Attendance Rate</TableCell>
                      <TableCell align="center">Trend</TableCell>
                      <TableCell align="center">Performance</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics.departmentStats.map((dept, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {dept.name}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">{dept.students}</TableCell>
                        <TableCell align="center">
                          <Box display="flex" alignItems="center" justifyContent="center">
                            <Typography variant="body2" sx={{ mr: 1 }}>
                              {dept.attendance}%
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={dept.attendance}
                              sx={{ 
                                width: 60, 
                                height: 6, 
                                borderRadius: 3,
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: getAttendanceColor(dept.attendance)
                                }
                              }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box display="flex" alignItems="center" justifyContent="center">
                            {getTrendIcon(dept.trend)}
                            <Typography variant="caption" sx={{ ml: 0.5 }}>
                              {dept.trend > 0 ? '+' : ''}{dept.trend}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={dept.attendance >= 90 ? 'Excellent' : dept.attendance >= 80 ? 'Good' : 'Needs Improvement'}
                            color={dept.attendance >= 90 ? 'success' : dept.attendance >= 80 ? 'primary' : 'error'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Weekly Trends */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📈 Weekly Attendance Trends
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Day</TableCell>
                      <TableCell align="center">Attendance %</TableCell>
                      <TableCell align="center">Late %</TableCell>
                      <TableCell align="center">Absent %</TableCell>
                      <TableCell align="center">Visual</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics.weeklyTrends.map((day, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {day.day}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" sx={{ color: getAttendanceColor(day.attendance) }}>
                            {day.attendance}%
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" sx={{ color: '#ff9800' }}>
                            {day.late}%
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" sx={{ color: '#f44336' }}>
                            {day.absent}%
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <LinearProgress
                            variant="determinate"
                            value={day.attendance}
                            sx={{ 
                              width: 80, 
                              height: 8, 
                              borderRadius: 4,
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: getAttendanceColor(day.attendance)
                              }
                            }}
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

        {/* Top & Low Performers */}
        <Grid item xs={12} md={4}>
          {/* Top Performers */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#4caf50' }}>
                🏆 Top Performers
              </Typography>
              {analytics.topPerformers.map((student, index) => (
                <Paper key={index} sx={{ p: 2, mb: 1, bgcolor: '#f8f9fa' }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {student.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {student.registerNumber} | {student.department}
                      </Typography>
                    </Box>
                    <Chip
                      label={`${student.attendance}%`}
                      color="success"
                      size="small"
                    />
                  </Box>
                </Paper>
              ))}
            </CardContent>
          </Card>

          {/* Low Performers */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#f44336' }}>
                ⚠️ Needs Attention
              </Typography>
              {analytics.lowPerformers.map((student, index) => (
                <Paper key={index} sx={{ p: 2, mb: 1, bgcolor: '#fff3e0' }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {student.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {student.registerNumber} | {student.department}
                      </Typography>
                    </Box>
                    <Chip
                      label={`${student.attendance}%`}
                      color="error"
                      size="small"
                    />
                  </Box>
                </Paper>
              ))}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🚀 Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button variant="contained" startIcon={<Assessment />} fullWidth>
                  Generate Report
                </Button>
                <Button variant="outlined" startIcon={<Timeline />} fullWidth>
                  Export Analytics
                </Button>
                <Button variant="outlined" startIcon={<PieChart />} fullWidth>
                  View Charts
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AnalyticsDashboard;
