import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Settings,
  Security,
  Notifications,
  Storage,
  CloudUpload,
  Refresh,
  Face,
  QrCode,
  Email,
  Sms,
  Schedule,
  Computer,
  Add,
  Edit,
  Delete,
  Save
} from '@mui/icons-material';

const SystemSettings = () => {
  const theme = useTheme();
  const [settings, setSettings] = useState({
    attendance: {
      cutoffTime: '08:45',
      allowLateEntry: true,
      requireVerification: true,
      confidenceThreshold: 0.4,
    },
    security: {
      sessionTimeout: 30,
      passwordComplexity: true,
      twoFactorAuth: false,
      blockchainEnabled: true,
    },
    notifications: {
      emailEnabled: true,
      smsEnabled: true,
      parentNotifications: true,
      adminAlerts: true,
      smtpServer: 'smtp.gmail.com',
      smtpPort: 587,
      twilioEnabled: false,
    },
    system: {
      autoBackup: true,
      backupFrequency: 'daily',
      logLevel: 'info',
      maintenanceMode: false,
    }
  });
  
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [systemStatus, setSystemStatus] = useState({
    database: 'healthy',
    blockchain: 'healthy',
    notifications: 'healthy',
    faceRecognition: 'healthy'
  });
  
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    loadSystemData();
  }, []);

  const loadSystemData = async () => {
    try {
      // Mock data - in production, these would come from APIs
      setUsers([
        { id: 1, username: 'admin', email: 'admin@system.com', role: 'admin', active: true, lastLogin: '2024-01-06 09:15' },
        { id: 2, username: 'CS', email: 'cs@system.com', role: 'department', department: 'CS', active: true, lastLogin: '2024-01-06 08:30' },
        { id: 3, username: 'IT', email: 'it@system.com', role: 'department', department: 'IT', active: true, lastLogin: '2024-01-05 16:45' },
        { id: 4, username: '20CS001', email: '20cs001@student.edu', role: 'student', active: true, lastLogin: '2024-01-06 09:00' },
      ]);
      
      setDepartments([
        { id: 1, code: 'CS', name: 'Computer Science', students: 45, active: true },
        { id: 2, code: 'IT', name: 'Information Technology', students: 40, active: true },
        { id: 3, code: 'ECE', name: 'Electronics & Communication', students: 38, active: true },
        { id: 4, code: 'ME', name: 'Mechanical Engineering', students: 27, active: true },
      ]);
      
    } catch (error) {
      console.error('Error loading system data:', error);
    }
  };

  const handleSettingChange = (category, setting, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value
      }
    }));
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // Mock API call - in production, this would save to backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setAlert({
        type: 'success',
        message: 'Settings saved successfully!'
      });
      
    } catch (error) {
      setAlert({
        type: 'error',
        message: 'Failed to save settings'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (service) => {
    setLoading(true);
    try {
      // Mock test - in production, this would test actual connections
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setAlert({
        type: 'success',
        message: `${service} connection test successful!`
      });
      
    } catch (error) {
      setAlert({
        type: 'error',
        message: `${service} connection test failed`
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return '#4caf50';
      case 'warning': return '#ff9800';
      case 'error': return '#f44336';
      default: return '#757575';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return '#f44336';
      case 'department': return '#2196f3';
      case 'student': return '#4caf50';
      default: return '#757575';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ pt: 2, pb: 2 }}>
      <Typography variant="h4" gutterBottom>
        ⚙️ System Settings
      </Typography>
      <Typography variant="subtitle1" color="textSecondary" gutterBottom>
        Configure system parameters, security, and user management
      </Typography>

      {alert && (
        <Alert 
          severity={alert.type} 
          onClose={() => setAlert(null)}
          style={{ marginBottom: 24 }}
        >
          {alert.message}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Attendance Settings */}
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Schedule sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Attendance Configuration</Typography>
              </Box>
              
              <Box sx={{ '& .MuiTextField-root': { mb: 2 } }}>
                <TextField
                  label="Attendance Cutoff Time"
                  type="time"
                  value={settings.attendance.cutoffTime}
                  onChange={(e) => handleSettingChange('attendance', 'cutoffTime', e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                
                <TextField
                  label="Face Recognition Threshold"
                  type="number"
                  inputProps={{ min: 0, max: 1, step: 0.1 }}
                  value={settings.attendance.confidenceThreshold}
                  onChange={(e) => handleSettingChange('attendance', 'confidenceThreshold', parseFloat(e.target.value))}
                  fullWidth
                  helperText="0.0 - 1.0 (higher = more strict)"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.attendance.allowLateEntry}
                      onChange={(e) => handleSettingChange('attendance', 'allowLateEntry', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Allow Late Entry"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.attendance.requireVerification}
                      onChange={(e) => handleSettingChange('attendance', 'requireVerification', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Require Department Verification for Face-Only"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Security Settings */}
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Security sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Security Configuration</Typography>
              </Box>
              
              <Box sx={{ '& .MuiTextField-root': { mb: 2 } }}>
                <TextField
                  label="Session Timeout (minutes)"
                  type="number"
                  value={settings.security.sessionTimeout}
                  onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
                  fullWidth
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.security.passwordComplexity}
                      onChange={(e) => handleSettingChange('security', 'passwordComplexity', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Enforce Password Complexity"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.security.twoFactorAuth}
                      onChange={(e) => handleSettingChange('security', 'twoFactorAuth', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Two-Factor Authentication"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.security.blockchainEnabled}
                      onChange={(e) => handleSettingChange('security', 'blockchainEnabled', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Blockchain Integration"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Notification Settings */}
        <Grid item xs={12}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Notifications sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Notification Configuration</Typography>
              </Box>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ '& .MuiTextField-root': { mb: 2 } }}>
                    <TextField
                      label="SMTP Server"
                      value={settings.notifications.smtpServer}
                      onChange={(e) => handleSettingChange('notifications', 'smtpServer', e.target.value)}
                      fullWidth
                    />
                    
                    <TextField
                      label="SMTP Port"
                      type="number"
                      value={settings.notifications.smtpPort}
                      onChange={(e) => handleSettingChange('notifications', 'smtpPort', parseInt(e.target.value))}
                      fullWidth
                    />
                    
                    <Button
                      variant="outlined"
                      onClick={() => handleTestConnection('Email')}
                      disabled={loading}
                      startIcon={<Email />}
                    >
                      Test Email Connection
                    </Button>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.notifications.emailEnabled}
                        onChange={(e) => handleSettingChange('notifications', 'emailEnabled', e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Email Notifications"
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.notifications.smsEnabled}
                        onChange={(e) => handleSettingChange('notifications', 'smsEnabled', e.target.checked)}
                        color="primary"
                      />
                    }
                    label="SMS Notifications"
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.notifications.parentNotifications}
                        onChange={(e) => handleSettingChange('notifications', 'parentNotifications', e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Parent Notifications"
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.notifications.adminAlerts}
                        onChange={(e) => handleSettingChange('notifications', 'adminAlerts', e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Admin Alerts"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* System Status */}
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Computer sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">System Status</Typography>
              </Box>
              
              <List>
                {Object.entries(systemStatus).map(([service, status]) => (
                  <ListItem key={service}>
                    <ListItemText
                      primary={service.charAt(0).toUpperCase() + service.slice(1)}
                      secondary={`Status: ${status}`}
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        label={status}
                        sx={{ fontWeight: 600 }}
                        style={{
                          backgroundColor: getStatusColor(status),
                          color: 'white'
                        }}
                        size="small"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* User Management */}
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Security sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">User Management</Typography>
                <Box ml="auto">
                  <Button
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={() => setDialogOpen(true)}
                    size="small"
                  >
                    Add User
                  </Button>
                </Box>
              </Box>
              
              <TableContainer component={Paper} style={{ maxHeight: 300 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Username</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>
                          <Chip
                            label={user.role}
                            size="small"
                            style={{
                              backgroundColor: getRoleColor(user.role),
                              color: 'white'
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={user.active ? 'Active' : 'Inactive'}
                            size="small"
                            color={user.active ? 'primary' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small">
                            <Edit />
                          </IconButton>
                          <IconButton size="small">
                            <Delete />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Save Button */}
        <Grid item xs={12}>
          <Box display="flex" justifyContent="center" mt={3}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={handleSaveSettings}
              disabled={loading}
              startIcon={<Save />}
            >
              {loading ? 'Saving...' : 'Save All Settings'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default SystemSettings;
