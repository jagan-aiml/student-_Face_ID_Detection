import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  TextField,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  FilterList,
  GetApp,
  Visibility,
  Security,
  CheckCircle,
  Schedule,
  Warning,
  Error,
  DateRange
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const useStyles = (theme) => ({
  container: {
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
  },
  header: {
    marginBottom: theme.spacing(3),
  },
  filterCard: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(3),
  },
  statusChip: {
    fontWeight: 600,
  },
  tableRow: {
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
  blockchainIcon: {
    color: '#9c27b0',
    cursor: 'pointer',
  },
  summaryCard: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    marginBottom: theme.spacing(3),
  },
  statBox: {
    textAlign: 'center',
    padding: theme.spacing(2),
  },
  confidenceBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e0e0e0',
    marginTop: theme.spacing(1),
  },
}));

const AttendanceHistory = () => {
  const theme = useTheme(); const classes = useStyles(theme);
  const { user } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Filters
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: '',
    verificationMethod: ''
  });
  
  // Summary stats
  const [summary, setSummary] = useState({
    total: 0,
    present: 0,
    late: 0,
    pending: 0,
    absent: 0,
    attendanceRate: 0
  });

  useEffect(() => {
    fetchAttendanceHistory();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [attendanceRecords, filters]);

  const fetchAttendanceHistory = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:8000/students/${user.username}/attendance`
      );
      
      const records = response.data.attendance_records || [];
      setAttendanceRecords(records);
      
      // Calculate summary
      const present = records.filter(r => r.status === 'Present').length;
      const late = records.filter(r => r.status === 'Late').length;
      const pending = records.filter(r => r.status === 'Pending').length;
      const total = records.length;
      
      setSummary({
        total,
        present,
        late,
        pending,
        absent: 0, // Calculated differently in production
        attendanceRate: total > 0 ? Math.round(((present + late) / total) * 100) : 0
      });
      
    } catch (error) {
      console.error('Error fetching attendance history:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...attendanceRecords];

    if (filters.dateFrom) {
      filtered = filtered.filter(record => record.date >= filters.dateFrom);
    }

    if (filters.dateTo) {
      filtered = filtered.filter(record => record.date <= filters.dateTo);
    }

    if (filters.status) {
      filtered = filtered.filter(record => record.status === filters.status);
    }

    if (filters.verificationMethod) {
      filtered = filtered.filter(record => record.verification_method === filters.verificationMethod);
    }

    setFilteredRecords(filtered);
    setPage(0); // Reset to first page when filtering
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      status: '',
      verificationMethod: ''
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return '#4caf50';
      case 'Late': return '#ff9800';
      case 'Pending': return '#2196f3';
      case 'Absent': return '#f44336';
      default: return '#757575';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Present': return <CheckCircle />;
      case 'Late': return <Schedule />;
      case 'Pending': return <Warning />;
      case 'Absent': return <Error />;
      default: return <Error />;
    }
  };

  const getVerificationMethodLabel = (method) => {
    switch (method) {
      case 'face_qr': return 'Face + QR';
      case 'face_only': return 'Face Only';
      case 'manual': return 'Manual';
      default: return method;
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return '#4caf50';
    if (confidence >= 0.6) return '#ff9800';
    return '#f44336';
  };

  const exportToCSV = () => {
    const csvContent = [
      'Date,Time,Status,Verification Method,Confidence,Verification Status',
      ...filteredRecords.map(record => 
        `${record.date},${record.time},${record.status},${record.verification_method},${record.face_confidence || 'N/A'},${record.verification_status}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_history_${user.username}.csv`;
    link.click();
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading) {
    return (
      <Container className={classes.container}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <Typography>Loading attendance history...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" className={classes.container}>
      {/* Header */}
      <Box className={classes.header}>
        <Typography variant="h4" gutterBottom>
          📋 Attendance History
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Complete record of your attendance with blockchain verification
        </Typography>
      </Box>

      {/* Summary Statistics */}
      <Card className={classes.summaryCard}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📊 Attendance Summary
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={6} md={2}>
              <Box className={classes.statBox}>
                <Typography variant="h4">{summary.total}</Typography>
                <Typography variant="body2" style={{ opacity: 0.9 }}>
                  Total Records
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={2}>
              <Box className={classes.statBox}>
                <Typography variant="h4">{summary.present}</Typography>
                <Typography variant="body2" style={{ opacity: 0.9 }}>
                  Present
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={2}>
              <Box className={classes.statBox}>
                <Typography variant="h4">{summary.late}</Typography>
                <Typography variant="body2" style={{ opacity: 0.9 }}>
                  Late
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={2}>
              <Box className={classes.statBox}>
                <Typography variant="h4">{summary.pending}</Typography>
                <Typography variant="body2" style={{ opacity: 0.9 }}>
                  Pending
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box className={classes.statBox}>
                <Typography variant="h4">{summary.attendanceRate}%</Typography>
                <Typography variant="body2" style={{ opacity: 0.9 }}>
                  Attendance Rate
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className={classes.filterCard}>
        <Typography variant="h6" gutterBottom>
          🔍 Filter Records
        </Typography>
        <Grid container spacing={2} alignItems="center">
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
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="Present">Present</MenuItem>
                <MenuItem value="Late">Late</MenuItem>
                <MenuItem value="Pending">Pending</MenuItem>
                <MenuItem value="Absent">Absent</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Method</InputLabel>
              <Select
                value={filters.verificationMethod}
                onChange={(e) => handleFilterChange('verificationMethod', e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="face_qr">Face + QR</MenuItem>
                <MenuItem value="face_only">Face Only</MenuItem>
                <MenuItem value="manual">Manual</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Button variant="outlined" onClick={clearFilters} fullWidth>
              Clear Filters
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<GetApp />}
              onClick={exportToCSV}
              fullWidth
            >
              Export CSV
            </Button>
          </Grid>
        </Grid>
      </Card>

      {/* Attendance Records Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Time</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Verification Method</TableCell>
                <TableCell>Confidence</TableCell>
                <TableCell>Verification</TableCell>
                <TableCell>Blockchain</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRecords
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((record, index) => (
                <TableRow 
                  key={index} 
                  className={`${classes.tableRow} ${record.status.toLowerCase()}`}
                >
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <DateRange style={{ marginRight: 8, color: '#666' }} />
                      {record.date}
                    </Box>
                  </TableCell>
                  <TableCell>{record.time}</TableCell>
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(record.status)}
                      label={record.status}
                      className={classes.statusChip}
                      style={{ 
                        backgroundColor: getStatusColor(record.status), 
                        color: 'white' 
                      }}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {getVerificationMethodLabel(record.verification_method)}
                  </TableCell>
                  <TableCell>
                    {record.face_confidence ? (
                      <Box>
                        <Typography variant="body2">
                          {(record.face_confidence * 100).toFixed(1)}%
                        </Typography>
                        <Box
                          className={classes.confidenceBar}
                          style={{
                            background: `linear-gradient(to right, ${getConfidenceColor(record.face_confidence)} ${record.face_confidence * 100}%, #e0e0e0 ${record.face_confidence * 100}%)`
                          }}
                        />
                      </Box>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={record.verification_status}
                      variant="outlined"
                      size="small"
                      color={record.verification_status === 'verified' ? 'primary' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View on Blockchain">
                      <IconButton size="small" className={classes.blockchainIcon}>
                        <Security />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          component="div"
          count={filteredRecords.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Paper>

      {/* Info Box */}
      <Box mt={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              ℹ️ Record Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" paragraph>
                  <strong>Blockchain Security:</strong> All attendance records are stored on an immutable blockchain ledger for tamper-proof verification.
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Confidence Scores:</strong> Face recognition confidence indicates the accuracy of biometric verification.
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" paragraph>
                  <strong>Verification Status:</strong> Shows whether the attendance record has been verified by department staff.
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Methods:</strong> Face+QR (complete verification), Face Only (requires verification), Manual (emergency entry).
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default AttendanceHistory;
