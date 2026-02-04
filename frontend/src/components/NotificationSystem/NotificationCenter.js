import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Switch,
  FormControlLabel,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Chip,
  Avatar,
  Paper,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme
} from '@mui/material';
import {
  Notifications,
  Email,
  Sms,
  Settings,
  Send,
  Schedule,
  CheckCircle,
  Warning,
  Info,
  Error,
  Delete,
  Edit,
  Add,
  NotificationsActive,
  NotificationsOff,
  Phone,
  Message
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const NotificationCenter = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [notificationSettings, setNotificationSettings] = useState({
    emailEnabled: true,
    smsEnabled: true,
    attendanceAlerts: true,
    lateArrivalAlerts: true,
    absentAlerts: true,
    weeklyReports: true,
    monthlyReports: true,
    systemAlerts: true
  });
  const [notificationHistory, setNotificationHistory] = useState([
    {
      id: 1,
      type: 'attendance',
      title: 'Daily Attendance Report',
      message: 'Your child John Doe was marked Present today at 8:30 AM',
      recipient: 'parent@email.com',
      method: 'email',
      status: 'sent',
      timestamp: '2025-01-06T09:30:00Z',
      priority: 'normal'
    },
    {
      id: 2,
      type: 'late_arrival',
      title: 'Late Arrival Alert',
      message: 'Jane Smith arrived late at 9:15 AM',
      recipient: '+1234567890',
      method: 'sms',
      status: 'sent',
      timestamp: '2025-01-06T09:15:00Z',
      priority: 'high'
    },
    {
      id: 3,
      type: 'absent',
      title: 'Absence Alert',
      message: 'Mike Johnson was marked absent today',
      recipient: 'parent2@email.com',
      method: 'email',
      status: 'failed',
      timestamp: '2025-01-06T08:45:00Z',
      priority: 'high'
    },
    {
      id: 4,
      type: 'system',
      title: 'System Maintenance',
      message: 'Scheduled maintenance completed successfully',
      recipient: 'admin@school.edu',
      method: 'email',
      status: 'sent',
      timestamp: '2025-01-06T06:00:00Z',
      priority: 'low'
    }
  ]);
  const [templates, setTemplates] = useState([
    {
      id: 1,
      name: 'Daily Attendance',
      type: 'attendance',
      subject: 'Daily Attendance Report - {date}',
      message: 'Dear {parent_name}, your child {student_name} was marked {status} today at {time}.',
      active: true
    },
    {
      id: 2,
      name: 'Late Arrival Alert',
      type: 'late_arrival',
      subject: 'Late Arrival Notification',
      message: 'Alert: {student_name} arrived late at {time}. Please ensure punctuality.',
      active: true
    },
    {
      id: 3,
      name: 'Absence Alert',
      type: 'absent',
      subject: 'Absence Notification',
      message: 'Important: {student_name} was marked absent today. Please contact the school if this is an error.',
      active: true
    }
  ]);
  const [newNotificationDialog, setNewNotificationDialog] = useState(false);
  const [templateDialog, setTemplateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [newNotification, setNewNotification] = useState({
    type: 'info',
    title: '',
    message: '',
    recipients: '',
    method: 'email',
    priority: 'normal'
  });

  const handleSettingChange = (setting, value) => {
    setNotificationSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const sendNotification = async () => {
    try {
      const notification = {
        id: Date.now(),
        ...newNotification,
        status: 'sent',
        timestamp: new Date().toISOString()
      };

      setNotificationHistory(prev => [notification, ...prev]);
      setNewNotificationDialog(false);
      setNewNotification({
        type: 'info',
        title: '',
        message: '',
        recipients: '',
        method: 'email',
        priority: 'normal'
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'attendance': return <CheckCircle sx={{ color: '#4caf50' }} />;
      case 'late_arrival': return <Schedule sx={{ color: '#ff9800' }} />;
      case 'absent': return <Warning sx={{ color: '#f44336' }} />;
      case 'system': return <Settings sx={{ color: '#2196f3' }} />;
      default: return <Info sx={{ color: '#757575' }} />;
    }
  };

  const getMethodIcon = (method) => {
    switch (method) {
      case 'email': return <Email />;
      case 'sms': return <Sms />;
      case 'phone': return <Phone />;
      default: return <Message />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent': return 'success';
      case 'failed': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#f44336';
      case 'normal': return '#2196f3';
      case 'low': return '#757575';
      default: return '#757575';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item>
              <Avatar sx={{ width: 60, height: 60, bgcolor: 'rgba(255,255,255,0.2)' }}>
                <Notifications sx={{ fontSize: 30 }} />
              </Avatar>
            </Grid>
            <Grid item xs>
              <Typography variant="h4" gutterBottom>
                Notification Center
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Manage automated notifications and communication settings
              </Typography>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={() => setNewNotificationDialog(true)}
                sx={{ color: 'white', borderColor: 'white', mr: 2 }}
              >
                Send Notification
              </Button>
              <Button
                variant="outlined"
                startIcon={<Settings />}
                sx={{ color: 'white', borderColor: 'white' }}
              >
                Settings
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Notification Settings */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ⚙️ Notification Settings
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Delivery Methods
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.emailEnabled}
                      onChange={(e) => handleSettingChange('emailEnabled', e.target.checked)}
                    />
                  }
                  label="Email Notifications"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.smsEnabled}
                      onChange={(e) => handleSettingChange('smsEnabled', e.target.checked)}
                    />
                  }
                  label="SMS Notifications"
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Alert Types
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.attendanceAlerts}
                      onChange={(e) => handleSettingChange('attendanceAlerts', e.target.checked)}
                    />
                  }
                  label="Attendance Alerts"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.lateArrivalAlerts}
                      onChange={(e) => handleSettingChange('lateArrivalAlerts', e.target.checked)}
                    />
                  }
                  label="Late Arrival Alerts"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.absentAlerts}
                      onChange={(e) => handleSettingChange('absentAlerts', e.target.checked)}
                    />
                  }
                  label="Absence Alerts"
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Reports
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.weeklyReports}
                      onChange={(e) => handleSettingChange('weeklyReports', e.target.checked)}
                    />
                  }
                  label="Weekly Reports"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.monthlyReports}
                      onChange={(e) => handleSettingChange('monthlyReports', e.target.checked)}
                    />
                  }
                  label="Monthly Reports"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.systemAlerts}
                      onChange={(e) => handleSettingChange('systemAlerts', e.target.checked)}
                    />
                  }
                  label="System Alerts"
                />
              </Box>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 Notification Stats
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">Sent Today</Typography>
                  <Typography variant="h6" color="success.main">24</Typography>
                </Box>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">Failed</Typography>
                  <Typography variant="h6" color="error.main">1</Typography>
                </Box>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">Email Delivery Rate</Typography>
                  <Typography variant="h6" color="primary.main">98.5%</Typography>
                </Box>
              </Box>
              
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">SMS Delivery Rate</Typography>
                  <Typography variant="h6" color="primary.main">99.2%</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Notification History */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  📨 Recent Notifications
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={() => setTemplateDialog(true)}
                >
                  Manage Templates
                </Button>
              </Box>
              
              <List>
                {notificationHistory.map((notification, index) => (
                  <React.Fragment key={notification.id}>
                    <ListItem>
                      <ListItemIcon>
                        {getNotificationIcon(notification.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center">
                            <Typography variant="body1" sx={{ mr: 1 }}>
                              {notification.title}
                            </Typography>
                            <Chip
                              label={notification.status}
                              color={getStatusColor(notification.status)}
                              size="small"
                              sx={{ mr: 1 }}
                            />
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: getPriorityColor(notification.priority)
                              }}
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="textSecondary">
                              {notification.message}
                            </Typography>
                            <Box display="flex" alignItems="center" mt={0.5}>
                              {getMethodIcon(notification.method)}
                              <Typography variant="caption" sx={{ ml: 0.5, mr: 2 }}>
                                {notification.recipient}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {formatTimestamp(notification.timestamp)}
                              </Typography>
                            </Box>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton size="small">
                          <Delete />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < notificationHistory.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>

              {notificationHistory.length === 0 && (
                <Box textAlign="center" py={4}>
                  <NotificationsOff sx={{ fontSize: 60, color: '#ccc', mb: 2 }} />
                  <Typography variant="h6" color="textSecondary">
                    No notifications sent yet
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Send Notification Dialog */}
      <Dialog open={newNotificationDialog} onClose={() => setNewNotificationDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Send New Notification</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="dense">
                <InputLabel>Type</InputLabel>
                <Select
                  value={newNotification.type}
                  onChange={(e) => setNewNotification(prev => ({ ...prev, type: e.target.value }))}
                >
                  <MenuItem value="info">Information</MenuItem>
                  <MenuItem value="attendance">Attendance</MenuItem>
                  <MenuItem value="late_arrival">Late Arrival</MenuItem>
                  <MenuItem value="absent">Absence</MenuItem>
                  <MenuItem value="system">System</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="dense">
                <InputLabel>Method</InputLabel>
                <Select
                  value={newNotification.method}
                  onChange={(e) => setNewNotification(prev => ({ ...prev, method: e.target.value }))}
                >
                  <MenuItem value="email">Email</MenuItem>
                  <MenuItem value="sms">SMS</MenuItem>
                  <MenuItem value="both">Both</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                margin="dense"
                label="Title"
                value={newNotification.title}
                onChange={(e) => setNewNotification(prev => ({ ...prev, title: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                margin="dense"
                label="Message"
                multiline
                rows={3}
                value={newNotification.message}
                onChange={(e) => setNewNotification(prev => ({ ...prev, message: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                margin="dense"
                label="Recipients (comma separated)"
                value={newNotification.recipients}
                onChange={(e) => setNewNotification(prev => ({ ...prev, recipients: e.target.value }))}
                placeholder="email@example.com, +1234567890"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth margin="dense">
                <InputLabel>Priority</InputLabel>
                <Select
                  value={newNotification.priority}
                  onChange={(e) => setNewNotification(prev => ({ ...prev, priority: e.target.value }))}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewNotificationDialog(false)}>Cancel</Button>
          <Button onClick={sendNotification} variant="contained" startIcon={<Send />}>
            Send Notification
          </Button>
        </DialogActions>
      </Dialog>

      {/* Template Management Dialog */}
      <Dialog open={templateDialog} onClose={() => setTemplateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Notification Templates</DialogTitle>
        <DialogContent>
          <List>
            {templates.map((template, index) => (
              <React.Fragment key={template.id}>
                <ListItem>
                  <ListItemText
                    primary={template.name}
                    secondary={
                      <Box>
                        <Typography variant="body2">
                          <strong>Subject:</strong> {template.subject}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Message:</strong> {template.message}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={template.active}
                      onChange={(e) => {
                        const updatedTemplates = templates.map(t =>
                          t.id === template.id ? { ...t, active: e.target.checked } : t
                        );
                        setTemplates(updatedTemplates);
                      }}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                {index < templates.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialog(false)}>Close</Button>
          <Button variant="contained" startIcon={<Add />}>
            Add Template
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default NotificationCenter;
