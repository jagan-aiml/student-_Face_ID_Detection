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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  useTheme
} from '@mui/material';
import {
  Security,
  Block,
  Verified,
  Search,
  FilterList,
  Download,
  Visibility,
  Link,
  CheckCircle,
  Schedule,
  Warning
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const BlockchainViewer = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [blockchainLogs, setBlockchainLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlockchainLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [searchTerm, filterType, blockchainLogs]);

  const fetchBlockchainLogs = async () => {
    try {
      setLoading(true);
      
      // Mock blockchain data
      const mockLogs = [
        {
          id: 1,
          blockHash: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890',
          transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          blockNumber: 12345,
          timestamp: '2025-01-06T09:15:30Z',
          type: 'attendance_marked',
          studentId: '20CS001',
          studentName: 'John Doe',
          status: 'Present',
          department: 'Computer Science',
          verificationMethod: 'Face + ID',
          confidence: 95.2,
          gasUsed: 21000,
          gasPrice: '20 gwei',
          verified: true
        },
        {
          id: 2,
          blockHash: '0x2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890ab',
          transactionHash: '0xbcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890a',
          blockNumber: 12346,
          timestamp: '2025-01-06T09:20:45Z',
          type: 'student_registered',
          studentId: '20CS002',
          studentName: 'Jane Smith',
          status: 'Registered',
          department: 'Computer Science',
          verificationMethod: 'Biometric Registration',
          confidence: null,
          gasUsed: 45000,
          gasPrice: '22 gwei',
          verified: true
        },
        {
          id: 3,
          blockHash: '0x3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
          transactionHash: '0xcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab',
          blockNumber: 12347,
          timestamp: '2025-01-06T09:20:12Z',
          type: 'attendance_verified',
          studentId: '20CS003',
          studentName: 'Mike Johnson',
          status: 'Late',
          department: 'Computer Science',
          verificationMethod: 'Manual Verification',
          confidence: 87.8,
          gasUsed: 32000,
          gasPrice: '19 gwei',
          verified: true
        },
        {
          id: 4,
          blockHash: '0x4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          transactionHash: '0xdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc',
          blockNumber: 12348,
          timestamp: '2025-01-06T09:30:28Z',
          type: 'attendance_marked',
          studentId: '20IT001',
          studentName: 'Alice Brown',
          status: 'Present',
          department: 'Information Technology',
          verificationMethod: 'Face + ID',
          confidence: 92.5,
          gasUsed: 21000,
          gasPrice: '21 gwei',
          verified: true
        },
        {
          id: 5,
          blockHash: '0x5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12',
          transactionHash: '0xef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
          blockNumber: 12349,
          timestamp: '2025-01-06T09:35:55Z',
          type: 'system_backup',
          studentId: null,
          studentName: null,
          status: 'Backup Created',
          department: 'System',
          verificationMethod: 'Automated',
          confidence: null,
          gasUsed: 75000,
          gasPrice: '25 gwei',
          verified: true
        }
      ];

      setBlockchainLogs(mockLogs);
      
    } catch (error) {
      console.error('Error fetching blockchain logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = blockchainLogs;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(log => log.type === filterType);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.studentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.blockHash.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.transactionHash.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'attendance_marked': return '#4caf50';
      case 'attendance_verified': return '#2196f3';
      case 'student_registered': return '#ff9800';
      case 'system_backup': return '#9c27b0';
      default: return '#757575';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'attendance_marked': return <CheckCircle />;
      case 'attendance_verified': return <Verified />;
      case 'student_registered': return <Schedule />;
      case 'system_backup': return <Security />;
      default: return <Block />;
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const truncateHash = (hash) => {
    return `${hash.substring(0, 10)}...${hash.substring(hash.length - 8)}`;
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setDetailDialog(true);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item>
              <Avatar sx={{ width: 60, height: 60, bgcolor: 'rgba(255,255,255,0.2)' }}>
                <Security sx={{ fontSize: 30 }} />
              </Avatar>
            </Grid>
            <Grid item xs>
              <Typography variant="h4" gutterBottom>
                Blockchain Audit Logs
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Immutable attendance records and system transactions
              </Typography>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                startIcon={<Download />}
                sx={{ color: 'white', borderColor: 'white' }}
              >
                Export Logs
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', borderLeft: '4px solid #4caf50' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" sx={{ color: '#4caf50', fontWeight: 700 }}>
                    {blockchainLogs.length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Transactions
                  </Typography>
                </Box>
                <Block sx={{ fontSize: 48, color: '#4caf50', opacity: 0.7 }} />
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
                    100%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Verification Rate
                  </Typography>
                </Box>
                <Verified sx={{ fontSize: 48, color: '#2196f3', opacity: 0.7 }} />
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
                    {Math.max(...blockchainLogs.map(log => log.blockNumber))}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Latest Block
                  </Typography>
                </Box>
                <Link sx={{ fontSize: 48, color: '#ff9800', opacity: 0.7 }} />
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
                    0
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Failed Transactions
                  </Typography>
                </Box>
                <Warning sx={{ fontSize: 48, color: '#9c27b0', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Search by Student ID, Name, or Hash"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Transaction Type</InputLabel>
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  startAdornment={<FilterList sx={{ mr: 1, color: 'text.secondary' }} />}
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="attendance_marked">Attendance Marked</MenuItem>
                  <MenuItem value="attendance_verified">Attendance Verified</MenuItem>
                  <MenuItem value="student_registered">Student Registered</MenuItem>
                  <MenuItem value="system_backup">System Backup</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('all');
                }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Blockchain Logs Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            🔗 Blockchain Transaction History
          </Typography>
          
          {loading ? (
            <Box textAlign="center" py={4}>
              <Typography>Loading blockchain logs...</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Block #</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Student</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Hash</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          #{log.blockNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Avatar sx={{ width: 24, height: 24, bgcolor: getTypeColor(log.type), mr: 1 }}>
                            {React.cloneElement(getTypeIcon(log.type), { sx: { fontSize: 14 } })}
                          </Avatar>
                          <Typography variant="caption">
                            {log.type.replace('_', ' ').toUpperCase()}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {log.studentId ? (
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {log.studentName}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {log.studentId}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            System
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.status}
                          color={
                            log.status === 'Present' ? 'success' :
                            log.status === 'Late' ? 'warning' :
                            log.status === 'Registered' ? 'info' : 'default'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatTimestamp(log.timestamp)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {truncateHash(log.blockHash)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          startIcon={<Visibility />}
                          onClick={() => handleViewDetails(log)}
                        >
                          Details
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

      {/* Detail Dialog */}
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Blockchain Transaction Details
        </DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                  <Typography variant="h6" gutterBottom>
                    Block Information
                  </Typography>
                  <Typography variant="body2"><strong>Block Number:</strong> #{selectedLog.blockNumber}</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', mt: 1 }}>
                    <strong>Block Hash:</strong><br />{selectedLog.blockHash}
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', mt: 1 }}>
                    <strong>Transaction Hash:</strong><br />{selectedLog.transactionHash}
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Transaction Details
                  </Typography>
                  <Typography variant="body2"><strong>Type:</strong> {selectedLog.type}</Typography>
                  <Typography variant="body2"><strong>Timestamp:</strong> {formatTimestamp(selectedLog.timestamp)}</Typography>
                  <Typography variant="body2"><strong>Status:</strong> {selectedLog.status}</Typography>
                  <Typography variant="body2"><strong>Verification Method:</strong> {selectedLog.verificationMethod}</Typography>
                  {selectedLog.confidence && (
                    <Typography variant="body2"><strong>Confidence:</strong> {selectedLog.confidence}%</Typography>
                  )}
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Gas Information
                  </Typography>
                  <Typography variant="body2"><strong>Gas Used:</strong> {selectedLog.gasUsed}</Typography>
                  <Typography variant="body2"><strong>Gas Price:</strong> {selectedLog.gasPrice}</Typography>
                  <Typography variant="body2"><strong>Verified:</strong> {selectedLog.verified ? 'Yes' : 'No'}</Typography>
                </Paper>
              </Grid>

              {selectedLog.studentId && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Student Information
                    </Typography>
                    <Typography variant="body2"><strong>Name:</strong> {selectedLog.studentName}</Typography>
                    <Typography variant="body2"><strong>Student ID:</strong> {selectedLog.studentId}</Typography>
                    <Typography variant="body2"><strong>Department:</strong> {selectedLog.department}</Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>Close</Button>
          <Button variant="contained" startIcon={<Download />}>
            Export Transaction
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BlockchainViewer;
