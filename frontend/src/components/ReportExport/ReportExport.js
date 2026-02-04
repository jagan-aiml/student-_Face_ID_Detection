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
  Checkbox,
  FormControlLabel,
  FormGroup,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  CircularProgress,
  Alert,
  useTheme
} from '@mui/material';
import {
  GetApp,
  Description,
  PictureAsPdf,
  TableChart,
  Assessment,
  DateRange,
  FilterList,
  School,
  People,
  CheckCircle,
  Schedule,
  Warning,
  Download
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const ReportExport = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [reportConfig, setReportConfig] = useState({
    type: 'attendance_summary',
    format: 'excel',
    dateRange: 'month',
    startDate: '',
    endDate: '',
    departments: [],
    includeCharts: true,
    includeDetails: true,
    includeStatistics: true,
    includeBlockchain: false
  });
  const [availableDepartments] = useState([
    'Computer Science',
    'Information Technology',
    'Electronics & Communication',
    'Mechanical Engineering',
    'Civil Engineering'
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [recentReports, setRecentReports] = useState([
    {
      id: 1,
      name: 'Monthly Attendance Report - December 2024',
      type: 'attendance_summary',
      format: 'excel',
      generatedAt: '2025-01-05T10:30:00Z',
      size: '2.5 MB',
      downloadUrl: '#'
    },
    {
      id: 2,
      name: 'Department Performance Analysis - Q4 2024',
      type: 'department_analysis',
      format: 'pdf',
      generatedAt: '2025-01-03T14:15:00Z',
      size: '1.8 MB',
      downloadUrl: '#'
    },
    {
      id: 3,
      name: 'Student Attendance Trends - November 2024',
      type: 'trend_analysis',
      format: 'excel',
      generatedAt: '2025-01-01T09:00:00Z',
      size: '3.2 MB',
      downloadUrl: '#'
    }
  ]);

  const reportTypes = [
    {
      value: 'attendance_summary',
      label: 'Attendance Summary Report',
      description: 'Overall attendance statistics and summaries',
      icon: <Assessment />
    },
    {
      value: 'department_analysis',
      label: 'Department Performance Analysis',
      description: 'Department-wise attendance analysis and comparisons',
      icon: <School />
    },
    {
      value: 'student_detailed',
      label: 'Detailed Student Report',
      description: 'Individual student attendance records and patterns',
      icon: <People />
    },
    {
      value: 'trend_analysis',
      label: 'Attendance Trend Analysis',
      description: 'Time-based trends and predictive analytics',
      icon: <DateRange />
    },
    {
      value: 'blockchain_audit',
      label: 'Blockchain Audit Report',
      description: 'Immutable transaction logs and verification records',
      icon: <CheckCircle />
    }
  ];

  const formatOptions = [
    { value: 'excel', label: 'Excel (.xlsx)', icon: <TableChart /> },
    { value: 'pdf', label: 'PDF Document', icon: <PictureAsPdf /> },
    { value: 'csv', label: 'CSV File', icon: <Description /> }
  ];

  const handleConfigChange = (field, value) => {
    setReportConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDepartmentChange = (department) => {
    setReportConfig(prev => ({
      ...prev,
      departments: prev.departments.includes(department)
        ? prev.departments.filter(d => d !== department)
        : [...prev.departments, department]
    }));
  };

  const generateReport = async () => {
    setIsGenerating(true);
    setGenerationStatus('Initializing report generation...');

    try {
      // Simulate report generation process
      const steps = [
        'Collecting attendance data...',
        'Processing department statistics...',
        'Generating charts and visualizations...',
        'Applying filters and formatting...',
        'Creating final document...',
        'Report generated successfully!'
      ];

      for (let i = 0; i < steps.length; i++) {
        setGenerationStatus(steps[i]);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Add to recent reports
      const newReport = {
        id: Date.now(),
        name: `${reportTypes.find(t => t.value === reportConfig.type)?.label} - ${new Date().toLocaleDateString()}`,
        type: reportConfig.type,
        format: reportConfig.format,
        generatedAt: new Date().toISOString(),
        size: `${(Math.random() * 3 + 1).toFixed(1)} MB`,
        downloadUrl: '#'
      };

      setRecentReports(prev => [newReport, ...prev]);
      
    } catch (error) {
      setGenerationStatus('Error generating report. Please try again.');
    } finally {
      setIsGenerating(false);
      setTimeout(() => setGenerationStatus(''), 3000);
    }
  };

  const getFormatIcon = (format) => {
    const formatOption = formatOptions.find(f => f.value === format);
    return formatOption ? formatOption.icon : <Description />;
  };

  const formatFileSize = (size) => {
    return size;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item>
              <GetApp sx={{ fontSize: 60 }} />
            </Grid>
            <Grid item xs>
              <Typography variant="h4" gutterBottom>
                Report Export Center
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Generate comprehensive attendance reports in multiple formats
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Report Configuration */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 Report Configuration
              </Typography>

              {/* Report Type Selection */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Report Type
                </Typography>
                <Grid container spacing={2}>
                  {reportTypes.map((type) => (
                    <Grid item xs={12} sm={6} key={type.value}>
                      <Paper
                        sx={{
                          p: 2,
                          cursor: 'pointer',
                          border: reportConfig.type === type.value ? 2 : 1,
                          borderColor: reportConfig.type === type.value ? 'primary.main' : 'grey.300',
                          '&:hover': { borderColor: 'primary.main' }
                        }}
                        onClick={() => handleConfigChange('type', type.value)}
                      >
                        <Box display="flex" alignItems="center" mb={1}>
                          {type.icon}
                          <Typography variant="subtitle2" sx={{ ml: 1 }}>
                            {type.label}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="textSecondary">
                          {type.description}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              {/* Format Selection */}
              <Box sx={{ mb: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Export Format</InputLabel>
                  <Select
                    value={reportConfig.format}
                    onChange={(e) => handleConfigChange('format', e.target.value)}
                  >
                    {formatOptions.map((format) => (
                      <MenuItem key={format.value} value={format.value}>
                        <Box display="flex" alignItems="center">
                          {format.icon}
                          <Typography sx={{ ml: 1 }}>{format.label}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Date Range */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Date Range
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth>
                      <InputLabel>Quick Select</InputLabel>
                      <Select
                        value={reportConfig.dateRange}
                        onChange={(e) => handleConfigChange('dateRange', e.target.value)}
                      >
                        <MenuItem value="week">This Week</MenuItem>
                        <MenuItem value="month">This Month</MenuItem>
                        <MenuItem value="semester">This Semester</MenuItem>
                        <MenuItem value="year">This Year</MenuItem>
                        <MenuItem value="custom">Custom Range</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  {reportConfig.dateRange === 'custom' && (
                    <>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          type="date"
                          label="Start Date"
                          value={reportConfig.startDate}
                          onChange={(e) => handleConfigChange('startDate', e.target.value)}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          type="date"
                          label="End Date"
                          value={reportConfig.endDate}
                          onChange={(e) => handleConfigChange('endDate', e.target.value)}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                    </>
                  )}
                </Grid>
              </Box>

              {/* Department Filter */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Departments (Leave empty for all)
                </Typography>
                <FormGroup row>
                  {availableDepartments.map((dept) => (
                    <FormControlLabel
                      key={dept}
                      control={
                        <Checkbox
                          checked={reportConfig.departments.includes(dept)}
                          onChange={() => handleDepartmentChange(dept)}
                        />
                      }
                      label={dept}
                    />
                  ))}
                </FormGroup>
              </Box>

              {/* Report Options */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Report Options
                </Typography>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={reportConfig.includeCharts}
                        onChange={(e) => handleConfigChange('includeCharts', e.target.checked)}
                      />
                    }
                    label="Include Charts and Visualizations"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={reportConfig.includeDetails}
                        onChange={(e) => handleConfigChange('includeDetails', e.target.checked)}
                      />
                    }
                    label="Include Detailed Records"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={reportConfig.includeStatistics}
                        onChange={(e) => handleConfigChange('includeStatistics', e.target.checked)}
                      />
                    }
                    label="Include Statistical Analysis"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={reportConfig.includeBlockchain}
                        onChange={(e) => handleConfigChange('includeBlockchain', e.target.checked)}
                      />
                    }
                    label="Include Blockchain Verification Data"
                  />
                </FormGroup>
              </Box>

              {/* Generation Status */}
              {generationStatus && (
                <Alert severity={isGenerating ? "info" : "success"} sx={{ mb: 2 }}>
                  <Box display="flex" alignItems="center">
                    {isGenerating && <CircularProgress size={20} sx={{ mr: 1 }} />}
                    {generationStatus}
                  </Box>
                </Alert>
              )}

              {/* Generate Button */}
              <Button
                variant="contained"
                size="large"
                startIcon={<GetApp />}
                onClick={generateReport}
                disabled={isGenerating}
                fullWidth
              >
                {isGenerating ? 'Generating Report...' : 'Generate Report'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Reports */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📁 Recent Reports
              </Typography>
              
              <List>
                {recentReports.map((report, index) => (
                  <React.Fragment key={report.id}>
                    <ListItem>
                      <ListItemIcon>
                        {getFormatIcon(report.format)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" noWrap>
                            {report.name}
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="textSecondary">
                              {formatDate(report.generatedAt)} • {formatFileSize(report.size)}
                            </Typography>
                          </Box>
                        }
                      />
                      <Button
                        size="small"
                        startIcon={<Download />}
                        onClick={() => {
                          // Simulate download
                          console.log('Downloading:', report.name);
                        }}
                      >
                        Download
                      </Button>
                    </ListItem>
                    {index < recentReports.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>

              {recentReports.length === 0 && (
                <Box textAlign="center" py={4}>
                  <Description sx={{ fontSize: 48, color: '#ccc', mb: 2 }} />
                  <Typography variant="body2" color="textSecondary">
                    No reports generated yet
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📈 Quick Statistics
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">Total Students</Typography>
                  <Typography variant="h6" color="primary">1,250</Typography>
                </Box>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">Average Attendance</Typography>
                  <Typography variant="h6" color="success.main">87.5%</Typography>
                </Box>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">Departments</Typography>
                  <Typography variant="h6" color="info.main">5</Typography>
                </Box>
              </Box>
              
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">Reports Generated</Typography>
                  <Typography variant="h6" color="warning.main">{recentReports.length}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ReportExport;
