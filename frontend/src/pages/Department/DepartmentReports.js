import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  GetApp,
  Assessment,
  School,
  DateRange,
  People
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const DepartmentReports = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    reportType: 'attendance_summary',
    year: '',
    section: ''
  });
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReportData();
  }, [filters]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const payload = {
        department: user.department,
        year: filters.year ? Number(filters.year) : undefined,
        section: filters.section || undefined,
        date_from: filters.dateFrom || undefined,
        date_to: filters.dateTo || undefined,
        report_type: filters.reportType === 'daily_report' ? 'daily' : filters.reportType === 'pending_verifications' ? 'daily' : filters.reportType === 'late_arrivals' ? 'daily' : 'daily'
      };

      const resp = await axios.post('http://localhost:8000/reports/attendance', payload);
      const data = resp.data?.data || [];
      // Normalize to table rows
      const rows = data.map(item => ({
        registerNo: item.register_number,
        name: item.name,
        totalDays: item.total_days,
        present: item.present_days,
        late: item.late_days,
        absent: item.absent_days,
        percentage: item.attendance_percentage
      }));
      setReportData(rows);
    } catch (error) {
      console.error('Error fetching report data:', error);
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csvContent = [
      'Register No,Name,Total Days,Present,Late,Absent,Percentage',
      ...reportData.map(record => 
        `${record.registerNo},${record.name},${record.totalDays},${record.present},${record.late},${record.absent},${record.percentage}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${user.department}_attendance_report.csv`;
    link.click();
  };

  const getPerformanceColor = (percentage) => {
    if (percentage >= 90) return '#4caf50';
    if (percentage >= 75) return '#ff9800';
    return '#f44336';
  };

  return (
    <Container maxWidth="lg" sx={{ pt: 2, pb: 2 }}>
      <Typography variant="h4" gutterBottom>
        📊 Department Reports
      </Typography>
      <Typography variant="subtitle1" color="textSecondary" gutterBottom>
        Generate and export attendance reports for {user.department} department
      </Typography>

      {/* Summary Statistics */}
      <Card sx={{ textAlign: 'center', p: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={3}>
              <Typography variant="h4">{reportData.length}</Typography>
              <Typography variant="body2">Total Students</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="h4">{reportData.filter(r => r.percentage >= 90).length}</Typography>
              <Typography variant="body2">Excellent (&gt;90%)</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="h4">{reportData.filter(r => r.percentage >= 75 && r.percentage < 90).length}</Typography>
              <Typography variant="body2">Good (75-90%)</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="h4">{reportData.filter(r => r.percentage < 75).length}</Typography>
              <Typography variant="body2">Needs Improvement (&lt;75%)</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          🔍 Report Filters
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="From Date"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({...prev, dateFrom: e.target.value}))}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="To Date"
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({...prev, dateTo: e.target.value}))}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Report Type</InputLabel>
              <Select
                value={filters.reportType}
                onChange={(e) => setFilters(prev => ({...prev, reportType: e.target.value}))}
              >
                <MenuItem value="attendance_summary">Attendance Summary</MenuItem>
                <MenuItem value="daily_report">Daily Report</MenuItem>
                <MenuItem value="late_arrivals">Late Arrivals</MenuItem>
                <MenuItem value="pending_verifications">Pending Verifications</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Year</InputLabel>
              <Select
                value={filters.year}
                onChange={(e) => setFilters(prev => ({...prev, year: e.target.value}))}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value={1}>1st Year</MenuItem>
                <MenuItem value={2}>2nd Year</MenuItem>
                <MenuItem value={3}>3rd Year</MenuItem>
                <MenuItem value={4}>4th Year</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Section</InputLabel>
              <Select
                value={filters.section}
                onChange={(e) => setFilters(prev => ({...prev, section: e.target.value}))}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="A">A</MenuItem>
                <MenuItem value="B">B</MenuItem>
                <MenuItem value="C">C</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleExport}
              startIcon={<GetApp />}
              fullWidth
            >
              Export CSV
            </Button>
          </Grid>
        </Grid>
      </Card>

      {/* Report Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📋 {user.department} Department Attendance Report
          </Typography>
          {loading && (
            <Box sx={{ my: 2 }}>
              <LinearProgress />
            </Box>
          )}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Register No</TableCell>
                  <TableCell>Student Name</TableCell>
                  <TableCell align="center">Total Days</TableCell>
                  <TableCell align="center">Present</TableCell>
                  <TableCell align="center">Late</TableCell>
                  <TableCell align="center">Absent</TableCell>
                  <TableCell align="center">Attendance %</TableCell>
                  <TableCell align="center">Performance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.map((student, index) => (
                  <TableRow key={index}>
                    <TableCell>{student.registerNo}</TableCell>
                    <TableCell>{student.name}</TableCell>
                    <TableCell align="center">{student.totalDays}</TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={student.present} 
                        size="small" 
                        style={{ backgroundColor: '#4caf50', color: 'white' }} 
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={student.late} 
                        size="small" 
                        style={{ backgroundColor: '#ff9800', color: 'white' }} 
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={student.absent} 
                        size="small" 
                        style={{ backgroundColor: '#f44336', color: 'white' }} 
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" alignItems="center" justifyContent="center">
                        <Typography variant="body2" style={{ marginRight: 8 }}>
                          {student.percentage}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={student.percentage}
                          style={{ 
                            width: 60, 
                            height: 4,
                            backgroundColor: '#e0e0e0'
                          }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={
                          student.percentage >= 90 ? 'Excellent' : 
                          student.percentage >= 75 ? 'Good' : 
                          'Needs Improvement'
                        }
                        size="small"
                        style={{
                          backgroundColor: getPerformanceColor(student.percentage),
                          color: 'white'
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
    </Container>
  );
};

export default DepartmentReports;
