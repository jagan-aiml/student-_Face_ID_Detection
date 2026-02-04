import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import {
  CheckCircle,
  Cancel,
  Schedule,
  Person,
  Visibility,
  TrendingUp,
  Warning,
  Info
} from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';

const useStyles = (theme) => ({
  container: {
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
  },
  header: {
    marginBottom: theme.spacing(3),
  },
  pendingCard: {
    marginBottom: theme.spacing(2),
    border: `2px solid ${theme.palette.warning.main}`,
    '&:hover': {
      boxShadow: theme.shadows[4],
    },
  },
  studentInfo: {
    backgroundColor: theme.palette.grey[50],
    padding: theme.spacing(1.5),
    borderRadius: theme.spacing(1),
    margin: theme.spacing(1, 0),
  },
  actionButtons: {
    display: 'flex',
    gap: theme.spacing(1),
    marginTop: theme.spacing(2),
  },
  approveButton: {
    backgroundColor: theme.palette.success.main,
    color: 'white',
    '&:hover': {
      backgroundColor: theme.palette.success.dark,
    },
  },
  rejectButton: {
    backgroundColor: theme.palette.error.main,
    color: 'white',
    '&:hover': {
      backgroundColor: theme.palette.error.dark,
    },
  },
  confidenceScore: {
    textAlign: 'center',
    padding: theme.spacing(1),
    backgroundColor: theme.palette.info.light,
    color: 'white',
    borderRadius: theme.spacing(1),
    margin: theme.spacing(1, 0),
  },
  statsCard: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    marginBottom: theme.spacing(3),
  },
  emptyState: {
    textAlign: 'center',
    padding: theme.spacing(4),
    color: theme.palette.text.secondary,
  },
}));

const PendingVerifications = () => {
  const theme = useTheme(); const classes = useStyles(theme);
  const [pendingList, setPendingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState(''); // 'approve' or 'reject'
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    fetchPendingVerifications();
  }, []);

  const fetchPendingVerifications = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8000/pending_list');
      setPendingList(response.data.pending_verifications || []);
    } catch (error) {
      console.error('Error fetching pending verifications:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load pending verifications'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (record, action) => {
    setSelectedRecord(record);
    setActionType(action);
    setNotes('');
    setDialogOpen(true);
  };

  const confirmAction = async () => {
    if (!selectedRecord) return;

    setProcessing(true);
    try {
      const response = await axios.post('http://localhost:8000/verify_pending', {
        attendance_id: selectedRecord.id,
        action: actionType,
        notes: notes.trim() || undefined
      });

      if (response.data.status === 'success') {
        setAlert({
          type: 'success',
          message: `Attendance ${actionType}d successfully`
        });
        
        // Refresh the list
        await fetchPendingVerifications();
        
        // Close dialog
        setDialogOpen(false);
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error('Error processing verification:', error);
      setAlert({
        type: 'error',
        message: error.response?.data?.detail || 'Failed to process verification'
      });
    } finally {
      setProcessing(false);
    }
  };

  const getVerificationMethodLabel = (method) => {
    switch (method) {
      case 'face_qr':
        return 'Face + QR';
      case 'face_only':
        return 'Face Only';
      case 'manual':
        return 'Manual Entry';
      default:
        return method;
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return '#4caf50';
    if (confidence >= 0.6) return '#ff9800';
    return '#f44336';
  };

  if (loading) {
    return (
      <Container className={classes.container}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <Typography>Loading pending verifications...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" className={classes.container}>
      {/* Header */}
      <Box className={classes.header}>
        <Typography variant="h4" gutterBottom>
          🔍 Pending Verifications
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Review and verify attendance records that require manual approval
        </Typography>
      </Box>

      {/* Alert */}
      {alert && (
        <Alert 
          severity={alert.type} 
          onClose={() => setAlert(null)}
          style={{ marginBottom: 24 }}
        >
          {alert.message}
        </Alert>
      )}

      {/* Statistics */}
      <Card className={classes.statsCard}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box textAlign="center">
                <Typography variant="h3" gutterBottom>
                  {pendingList.length}
                </Typography>
                <Typography variant="h6">
                  Pending Verifications
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box textAlign="center">
                <Typography variant="h3" gutterBottom>
                  {pendingList.filter(p => p.verification_method === 'face_only').length}
                </Typography>
                <Typography variant="h6">
                  Face Only Scans
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box textAlign="center">
                <Typography variant="h3" gutterBottom>
                  {pendingList.filter(p => p.face_confidence >= 0.8).length}
                </Typography>
                <Typography variant="h6">
                  High Confidence
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Pending Verifications List */}
      {pendingList.length === 0 ? (
        <Card>
          <CardContent className={classes.emptyState}>
            <CheckCircle style={{ fontSize: 80, color: '#4caf50', marginBottom: 16 }} />
            <Typography variant="h6" gutterBottom>
              No Pending Verifications
            </Typography>
            <Typography color="textSecondary">
              All attendance records have been verified. Great job!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {pendingList.map((record) => (
            <Grid item xs={12} md={6} key={record.id}>
              <Card className={classes.pendingCard}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Box display="flex" alignItems="center">
                      <Avatar style={{ marginRight: 16, backgroundColor: '#ff9800' }}>
                        <Person />
                      </Avatar>
                      <Box>
                        <Typography variant="h6">
                          {record.student.name}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {record.student.register_number}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      icon={<Schedule />}
                      label="Pending"
                      color="secondary"
                      variant="outlined"
                    />
                  </Box>

                  <Box className={classes.studentInfo}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">
                          Department
                        </Typography>
                        <Typography variant="body2">
                          {record.student.department}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">
                          Year & Section
                        </Typography>
                        <Typography variant="body2">
                          {record.student.year}-{record.student.section}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">
                          Date
                        </Typography>
                        <Typography variant="body2">
                          {record.date}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">
                          Time
                        </Typography>
                        <Typography variant="body2">
                          {record.time}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>

                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Verification Method
                      </Typography>
                      <Typography variant="body2">
                        {getVerificationMethodLabel(record.verification_method)}
                      </Typography>
                    </Box>
                    {record.face_confidence && (
                      <Box 
                        className={classes.confidenceScore}
                        style={{ backgroundColor: getConfidenceColor(record.face_confidence) }}
                      >
                        <Typography variant="caption">
                          Confidence
                        </Typography>
                        <Typography variant="body2" style={{ fontWeight: 600 }}>
                          {(record.face_confidence * 100).toFixed(1)}%
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  <Box className={classes.actionButtons}>
                    <Button
                      variant="contained"
                      className={classes.approveButton}
                      startIcon={<CheckCircle />}
                      onClick={() => handleAction(record, 'approve')}
                      fullWidth
                    >
                      Approve
                    </Button>
                    <Button
                      variant="contained"
                      className={classes.rejectButton}
                      startIcon={<Cancel />}
                      onClick={() => handleAction(record, 'reject')}
                      fullWidth
                    >
                      Reject
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Verification Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionType === 'approve' ? 'Approve Attendance' : 'Reject Attendance'}
        </DialogTitle>
        <DialogContent>
          {selectedRecord && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedRecord.student.name}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {selectedRecord.student.register_number} - {selectedRecord.student.department}
              </Typography>
              
              <Box my={2}>
                <Typography variant="body2">
                  Date: {selectedRecord.date} | Time: {selectedRecord.time}
                </Typography>
                <Typography variant="body2">
                  Method: {getVerificationMethodLabel(selectedRecord.verification_method)}
                </Typography>
                {selectedRecord.face_confidence && (
                  <Typography variant="body2">
                    Face Confidence: {(selectedRecord.face_confidence * 100).toFixed(1)}%
                  </Typography>
                )}
              </Box>

              <TextField
                label="Notes (Optional)"
                multiline
                rows={3}
                fullWidth
                variant="outlined"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={`Add notes for ${actionType}ing this attendance...`}
                margin="normal"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDialogOpen(false)} 
            color="primary"
            disabled={processing}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmAction} 
            color={actionType === 'approve' ? 'primary' : 'secondary'}
            variant="contained"
            disabled={processing}
          >
            {processing ? 'Processing...' : 
             actionType === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Instructions */}
      <Box mt={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📋 Verification Guidelines
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Box display="flex" alignItems="flex-start">
                  <Info style={{ color: '#2196f3', marginRight: 8, marginTop: 4 }} />
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Face-Only Verifications
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Review students who scanned without ID cards. Verify identity against records.
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box display="flex" alignItems="flex-start">
                  <TrendingUp style={{ color: '#4caf50', marginRight: 8, marginTop: 4 }} />
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Confidence Scores
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Green (80%+): High confidence. Orange (60-80%): Medium. Red (<60%): Low confidence.
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box display="flex" alignItems="flex-start">
                  <Warning style={{ color: '#ff9800', marginRight: 8, marginTop: 4 }} />
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Manual Review
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Use additional verification methods if confidence is low or identity is uncertain.
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default PendingVerifications;
