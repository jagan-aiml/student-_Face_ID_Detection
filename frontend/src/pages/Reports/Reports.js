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
  Paper,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  IconButton,
  Toolbar,
  AppBar
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Assessment,
  GetApp,
  Print,
  ExpandMore,
  Description,
  PictureAsPdf,
  TableChart,
  BarChart,
  DateRange,
  School,
  People,
  ArrowBack
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

// Style constants for sx prop usage
const styles = {
  container: {
    paddingTop: 2,
    paddingBottom: 2,
  },
  reportCard: {
    marginBottom: 2,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: 4,
    },
  },
  reportIcon: {
    fontSize: 48,
    marginRight: 2,
  },
  filterSection: {
    padding: 2,
    marginBottom: 3,
    backgroundColor: 'grey.50',
  },
  actionButtons: {
    display: 'flex',
    gap: 1,
    marginTop: 2,
  },
  previewTable: {
    maxHeight: 400,
    overflow: 'auto',
  },
  statusChip: {
    fontWeight: 600,
  },
  reportStats: {
    textAlign: 'center',
    padding: 2,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    marginBottom: 2,
  },
};

const Reports = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const [selectedReport, setSelectedReport] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    date: '',
    dateFrom: '',
    dateTo: '',
    department: '',
    status: '',
    format: 'pdf'
  });

  // Initialize empty data structure to prevent errors
  const initializeEmptyData = () => ({
    title: 'No Report Selected',
    records: [],
    departments: [],
    summary: null
  });
  const reportTypes = [
    {
      id: 'daily_attendance',
      title: 'Daily Attendance Report',
      description: 'Complete attendance records for a specific date',
      icon: <DateRange sx={styles.reportIcon} color="primary" />,
      filters: ['date', 'department', 'status']
    },
    {
      id: 'student_summary',
      title: 'Student Attendance Summary',
      description: 'Individual student attendance statistics over time',
      icon: <People sx={styles.reportIcon} color="secondary" />,
      filters: ['dateRange', 'department', 'student']
    },
    {
      id: 'department_analytics',
      title: 'Department Analytics Report',
      description: 'Comprehensive department-wise attendance analysis',
      icon: <School sx={styles.reportIcon} style={{ color: '#ff9800' }} />,
      filters: ['dateRange', 'department']
    }
  ];

  useEffect(() => {
    if (selectedReport) {
      generatePreview();
    }
  }, [selectedReport, filters]);

  const generatePreview = async () => {
    setLoading(true);
    try {
      // Fetch real data based on report type
      const reportData = await fetchReportData(selectedReport);
      
      // Ensure data structure is valid
      const validatedData = {
        ...reportData,
        records: Array.isArray(reportData.records) ? reportData.records : [],
        departments: Array.isArray(reportData.departments) ? reportData.departments : []
      };
      
      setPreviewData(validatedData);
      
    } catch (error) {
      console.error('Error generating preview:', error);
      // Set empty data structure on error
      setPreviewData({
        title: 'Error Loading Report',
        records: [],
        departments: [],
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchReportData = async (reportType) => {
    try {
      // Get date range from filters
      let dateFrom = filters.dateFrom || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
      let dateTo = filters.dateTo || new Date().toISOString().split('T')[0];
      
      if (filters.date && reportType === 'daily_attendance') {
        dateFrom = filters.date;
        dateTo = filters.date;
      }

      const department = filters.department || '';

      switch (reportType) {
        case 'daily_attendance': {
          // Fetch today's or selected date's attendance
          const attendanceRes = await axios.get(
            `http://localhost:8000/attendance/records?date_from=${dateFrom}&date_to=${dateTo}&department=${department}`
          );
          
          const records = attendanceRes.data;
          const summary = {
            total: 0,
            present: 0,
            late: 0,
            absent: 0,
            pending: 0
          };

          // Process records to get formatted data
          const formattedRecords = records.map((record, index) => {
            summary.total++;
            if (record.status === 'Present') summary.present++;
            else if (record.status === 'Late') summary.late++;
            else if (record.status === 'Pending') summary.pending++;
            
            return {
              id: index + 1,
              registerNo: record.student?.register_number || record.register_number,
              name: record.student?.name || 'Unknown',
              department: record.student?.department || '-',
              time: record.timestamp ? new Date(record.timestamp).toLocaleTimeString() : '-',
              status: record.status,
              method: record.verification_method || '-'
            };
          });

          // Get all students to find absent ones
          const studentsRes = await axios.get('http://localhost:8000/students');
          const allStudents = studentsRes.data;
          const attendedRegNumbers = records.map(r => r.register_number);
          
          allStudents.forEach(student => {
            if (!attendedRegNumbers.includes(student.register_number)) {
              summary.total++;
              summary.absent++;
              formattedRecords.push({
                id: formattedRecords.length + 1,
                registerNo: student.register_number,
                name: student.name,
                department: student.department,
                time: '-',
                status: 'Absent',
                method: '-'
              });
            }
          });

          return {
            title: 'Daily Attendance Report',
            date: dateFrom,
            summary,
            records: formattedRecords
          };
        }
        
        case 'weekly_summary': {
          // Get last 7 days of data
          const weekStart = new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0];
          const weeklyRes = await axios.get(
            `http://localhost:8000/attendance/records?date_from=${weekStart}&date_to=${dateTo}&department=${department}`
          );
          
          return {
            title: 'Weekly Summary Report',
            period: `${weekStart} to ${dateTo}`,
            records: weeklyRes.data
          };
        }
        
        case 'student_summary': {
          // Fetch student attendance summary
          const studentsRes = await axios.get(`http://localhost:8000/students`);
          const students = studentsRes.data;
          
          const attendanceRes = await axios.get(
            `http://localhost:8000/attendance/records?date_from=${dateFrom}&date_to=${dateTo}`
          );
          const attendanceRecords = attendanceRes.data;
          
          // Calculate summary for each student
          const studentSummary = students.map(student => {
            const studentRecords = attendanceRecords.filter(r => r.student?.register_number === student.register_number || r.register_number === student.register_number);
            const present = studentRecords.filter(r => r.status === 'Present').length;
            const late = studentRecords.filter(r => r.status === 'Late').length;
            const pending = studentRecords.filter(r => r.status === 'Pending').length;
            
            // Calculate total working days (approximate)
            const totalDays = Math.ceil((new Date(dateTo) - new Date(dateFrom)) / (1000 * 60 * 60 * 24));
            const attended = present + late;
            const percentage = totalDays > 0 ? Math.round((attended / totalDays) * 100 * 10) / 10 : 0;
            
            return {
              registerNo: student.register_number,
              name: student.name,
              department: student.department,
              totalDays,
              present,
              late,
              pending,
              absent: totalDays - attended - pending,
              percentage
            };
          });

          return {
            title: 'Student Attendance Summary',
            period: `${dateFrom} to ${dateTo}`,
            records: studentSummary
          };
        }
        
        case 'department_analytics': {
          // Fetch department-wise analytics
          const deptStudentsRes = await axios.get('http://localhost:8000/students');
          const deptAttendanceRes = await axios.get(
            `http://localhost:8000/attendance/records?date_from=${dateFrom}&date_to=${dateTo}`
          );
          
          const deptStudents = deptStudentsRes.data;
          const deptAttendance = deptAttendanceRes.data;
          
          // Group by department
          const departmentMap = {};
          deptStudents.forEach(student => {
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
          
          // Calculate attendance for each department
          deptAttendance.forEach(record => {
            const dept = record.student?.department;
            if (dept && departmentMap[dept]) {
              if (record.status === 'Present') departmentMap[dept].present++;
              else if (record.status === 'Late') departmentMap[dept].late++;
              else if (record.status === 'Pending') departmentMap[dept].pending++;
            }
          });
          
          const departments = Object.values(departmentMap).map(dept => ({
            ...dept,
            attendance: dept.students > 0 && (dept.present + dept.late) > 0 ?
              Math.round(((dept.present + dept.late) / dept.students) * 100 * 10) / 10 : 0
          }));

          return {
            title: 'Department Analytics Report',
            period: `${dateFrom} to ${dateTo}`,
            departments: departments.map(dept => ({
              ...dept,
              attendance: dept.students > 0 && (dept.present + dept.late) > 0 ?
                Math.round(((dept.present + dept.late) / dept.students) * 100 * 10) / 10 : 0
            }))
          };
        }
        
        default:
          return { title: 'Report Preview', records: [], departments: [] };
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      return { 
        title: 'Error Loading Report', 
        records: [], 
        departments: [],
        error: error.message 
      };
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return '#4caf50';
      case 'Late': return '#ff9800';
      case 'Absent': return '#f44336';
      default: return '#757575';
    }
  };

  const exportReport = async (format) => {
    setLoading(true);
    try {
      // Fetch fresh data for export
      const reportData = await fetchReportData(selectedReport);
      
      const filename = `${selectedReport}_${new Date().toISOString().split('T')[0]}.${format}`;
      
      if (format === 'csv') {
        // Generate CSV content from real data
        let csvContent = '';
        
        if (reportData?.records && reportData.records.length > 0) {
          const headers = Object.keys(reportData.records[0]).join(',');
          const rows = reportData.records.map(record => 
            Object.values(record).map(val => 
              typeof val === 'string' && val.includes(',') ? `"${val}"` : val
            ).join(',')
          );
          csvContent = [headers, ...rows].join('\n');
        } else if (reportData?.departments && reportData.departments.length > 0) {
          // For department analytics report
          const headers = Object.keys(reportData.departments[0]).join(',');
          const rows = reportData.departments.map(dept =>
            Object.values(dept).map(val =>
              typeof val === 'string' && val.includes(',') ? `"${val}"` : val
            ).join(',')
          );
          csvContent = [headers, ...rows].join('\n');
        }
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
      }
      
      console.log(`Report exported as ${format}: ${filename}`);
      
    } catch (error) {
      console.error('Error exporting report:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderFilters = () => {
    const currentReport = reportTypes.find(r => r.id === selectedReport);
    if (!currentReport) return null;

    return (
      <Card sx={styles.filterSection}>
        <Typography variant="h6" gutterBottom>
          🔍 Report Filters
        </Typography>
        <Grid container spacing={2}>
          {currentReport.filters.includes('date') && (
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Date"
                type="date"
                value={filters.date}
                onChange={(e) => handleFilterChange('date', e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          )}
          
          {(currentReport.filters.includes('dateRange') || currentReport.filters.includes('dateFrom')) && (
            <>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="From Date"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
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
          
          {currentReport.filters.includes('department') && (
            <Grid item xs={12} sm={6} md={3}>
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
          )}
          
          {currentReport.filters.includes('status') && (
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="Present">Present</MenuItem>
                  <MenuItem value="Late">Late</MenuItem>
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="Absent">Absent</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          )}
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Export Format</InputLabel>
              <Select
                value={filters.format}
                onChange={(e) => handleFilterChange('format', e.target.value)}
              >
                <MenuItem value="pdf">PDF</MenuItem>
                <MenuItem value="xlsx">Excel</MenuItem>
                <MenuItem value="csv">CSV</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        
        <Box sx={styles.actionButtons}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => exportReport(filters.format)}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <GetApp />}
          >
            {loading ? 'Generating...' : `Export ${filters.format.toUpperCase()}`}
          </Button>
          
          <Button
            variant="outlined"
            onClick={() => exportReport('pdf')}
            disabled={loading}
            startIcon={<Print />}
          >
            Print
          </Button>
          
          <Button
            variant="outlined"
            onClick={() => console.log('Send via email')}
            disabled={loading}
            startIcon={<GetApp />}
          >
            Email Report
          </Button>
        </Box>
      </Card>
    );
  };

  const renderPreview = () => {
    if (!previewData) return null;

    // Check if preview has no data
    const hasNoRecords = (!previewData.records || previewData.records.length === 0) && 
                        (!previewData.departments || previewData.departments.length === 0);

    if (hasNoRecords) {
      return (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📋 No Data Available
            </Typography>
            <Typography variant="body1" color="textSecondary">
              No records found for the selected report criteria.
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
              This report will populate automatically when:
              <br />
              • Students are registered in the system
              <br />
              • Attendance records are marked through the scanner
              <br />
              • The selected date range contains attendance data
            </Typography>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📋 Report Preview: {previewData.title}
          </Typography>
          
          {/* Summary Statistics */}
          {previewData.summary && (
            <Box sx={styles.reportStats}>
              <Grid container spacing={2}>
                <Grid item xs={3}>
                  <Typography variant="h4">{previewData.summary.total}</Typography>
                  <Typography variant="body2">Total</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="h4">{previewData.summary.present}</Typography>
                  <Typography variant="body2">Present</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="h4">{previewData.summary.late}</Typography>
                  <Typography variant="body2">Late</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="h4">{previewData.summary.absent}</Typography>
                  <Typography variant="body2">Absent</Typography>
                </Grid>
              </Grid>
            </Box>
          )}
          
          {/* Data Table */}
          {((previewData.records && previewData.records.length > 0) || (previewData.departments && previewData.departments.length > 0)) && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    {previewData.records && previewData.records.length > 0 && 
                      Object.keys(previewData.records[0]).map((key) => (
                        <TableCell key={key} sx={{ fontWeight: 'bold' }}>
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </TableCell>
                      ))
                    }
                    {previewData.departments && previewData.departments.length > 0 && !previewData.records?.length && (
                      <>
                        <TableCell sx={{ fontWeight: 'bold' }}>Department</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Students</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Attendance %</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Present</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Late</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Absent</TableCell>
                      </>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewData.records && previewData.records.map((record, index) => (
                    <TableRow key={index}>
                      {Object.entries(record).map(([key, value]) => (
                        <TableCell key={key}>
                          {key === 'status' ? (
                            <Chip
                              label={value}
                              sx={styles.statusChip}
                              style={{
                                backgroundColor: getStatusColor(value),
                                color: 'white'
                              }}
                              size="small"
                            />
                          ) : (
                            String(value)
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  
                  {previewData.departments && previewData.departments.map((dept, index) => (
                    <TableRow key={index}>
                      <TableCell>{dept.name}</TableCell>
                      <TableCell>{dept.students}</TableCell>
                      <TableCell>{dept.attendance}%</TableCell>
                      <TableCell>{dept.present}</TableCell>
                      <TableCell>{dept.late}</TableCell>
                      <TableCell>{dept.absent}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    );
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
          📊 Reports & Analytics
        </Typography>
      </Box>
      <Typography variant="subtitle1" color="textSecondary" gutterBottom>
        Generate comprehensive attendance reports with export capabilities
      </Typography>

      <Grid container spacing={3}>
        {/* Report Types */}
        <Grid item xs={12} md={4}>
          <Typography variant="h6" gutterBottom>
            📋 Available Reports
          </Typography>
          
          {reportTypes.map((report) => (
            <Card
              key={report.id}
              sx={styles.reportCard}
              onClick={() => setSelectedReport(report.id)}
              style={{
                border: selectedReport === report.id ? '2px solid #1976d2' : '1px solid #e0e0e0'
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center">
                  {report.icon}
                  <Box>
                    <Typography variant="h6">{report.title}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {report.description}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Grid>

        {/* Report Configuration & Preview */}
        <Grid item xs={12} md={8}>
          {selectedReport ? (
            <Box>
              {renderFilters()}
              {renderPreview()}
            </Box>
          ) : (
            <Card>
              <CardContent style={{ textAlign: 'center', padding: 64 }}>
                <Assessment style={{ fontSize: 80, color: '#ccc', marginBottom: 16 }} />
                <Typography variant="h6" color="textSecondary">
                  Select a report type to get started
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Choose from the available reports on the left to generate and export attendance data
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Box mt={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              🚀 Quick Actions
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<DateRange />}
                  onClick={() => setSelectedReport('daily_attendance')}
                >
                  Today's Report
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<BarChart />}
                  onClick={() => setSelectedReport('department_analytics')}
                >
                  Department Analytics
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default Reports;
