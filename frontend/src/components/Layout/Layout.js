import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Scanner,
  Verified,
  PersonAdd,
  Assessment,
  Analytics,
  Settings,
  History,
  ExitToApp,
  AccountCircle,
  School,
  Notifications,
  Security
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useAuth } from '../../contexts/AuthContext';

const drawerWidth = 280;

const useStyles = (theme) => ({
  root: {
    display: 'flex',
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
    background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
  },
  menuButton: {
    marginRight: theme.spacing(2),
  },
  title: {
    flexGrow: 1,
    fontWeight: 600,
  },
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
  },
  drawerPaper: {
    width: drawerWidth,
    background: '#f8f9fa',
  },
  drawerContainer: {
    overflow: 'auto',
    marginTop: theme.spacing(8),
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing(3),
    marginTop: theme.spacing(8),
    background: '#f5f5f5',
    minHeight: 'calc(100vh - 64px)',
  },
  userInfo: {
    padding: theme.spacing(2),
    background: theme.palette.primary.main,
    color: 'white',
    textAlign: 'center',
  },
  avatar: {
    width: theme.spacing(6),
    height: theme.spacing(6),
    margin: '0 auto',
    marginBottom: theme.spacing(1),
    backgroundColor: theme.palette.secondary.main,
  },
  listItem: {
    borderRadius: theme.spacing(1),
    margin: theme.spacing(0.5, 1),
    '&.active': {
      backgroundColor: theme.palette.primary.main,
      color: 'white',
      '& .MuiListItemIcon-root': {
        color: 'white',
      },
    },
    '&:hover': {
      backgroundColor: theme.palette.primary.light,
      color: 'white',
      '& .MuiListItemIcon-root': {
        color: 'white',
      },
    },
  },
  sectionTitle: {
    padding: theme.spacing(1, 2),
    fontWeight: 600,
    color: theme.palette.text.secondary,
    fontSize: '0.875rem',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

const Layout = ({ children }) => {
  const theme = useTheme();
  const classes = useStyles(theme);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleUserMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleUserMenuClose();
  };

  const getMenuItems = () => {
    const baseItems = [];

    if (user.role === 'admin') {
      baseItems.push(
        { title: 'Main', items: [
          { text: 'Dashboard', icon: <Dashboard />, path: '/admin/dashboard' },
          { text: 'System Settings', icon: <Settings />, path: '/admin/settings' },
        ]},
        { title: 'Analytics', items: [
          { text: 'Analytics', icon: <Analytics />, path: '/analytics' },
          { text: 'Reports', icon: <Assessment />, path: '/reports' },
        ]},
      );
    } else if (user.role === 'department') {
      baseItems.push(
        { title: 'Department', items: [
          { text: 'Dashboard', icon: <Dashboard />, path: '/department/dashboard' },
          { text: 'Attendance Scanner', icon: <Scanner />, path: '/department/scanner' },
          { text: 'Pending Verifications', icon: <Verified />, path: '/department/verifications' },
          { text: 'Student Registration', icon: <PersonAdd />, path: '/department/registration' },
        ]},
        { title: 'Analytics', items: [
          { text: 'Department Reports', icon: <Assessment />, path: '/department/reports' },
          { text: 'Analytics', icon: <Analytics />, path: '/analytics' },
        ]},
      );
    } else if (user.role === 'student') {
      baseItems.push(
        { title: 'Student', items: [
          { text: 'Dashboard', icon: <Dashboard />, path: '/student/dashboard' },
          { text: 'Attendance History', icon: <History />, path: '/student/attendance' },
        ]},
      );
    }

    return baseItems;
  };

  const renderMenuItem = (item) => (
    <ListItem
      key={item.text}
      button
      className={`${classes.listItem} ${location.pathname === item.path ? 'active' : ''}`}
      onClick={() => {
        navigate(item.path);
        if (isMobile) {
          setMobileOpen(false);
        }
      }}
    >
      <ListItemIcon>{item.icon}</ListItemIcon>
      <ListItemText primary={item.text} />
    </ListItem>
  );

  const drawer = (
    <div>
      {/* User Info Section */}
      <Box className={classes.userInfo}>
        <Avatar className={classes.avatar}>
          {user?.username?.charAt(0).toUpperCase()}
        </Avatar>
        <Typography variant="h6">{user?.username}</Typography>
        <Typography variant="body2" style={{ opacity: 0.8 }}>
          {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
          {user?.department && ` - ${user.department}`}
        </Typography>
      </Box>

      {/* Navigation Menu */}
      <div className={classes.drawerContainer}>
        {getMenuItems().map((section, sectionIndex) => (
          <div key={sectionIndex}>
            <Typography className={classes.sectionTitle}>
              {section.title}
            </Typography>
            <List>
              {section.items.map(renderMenuItem)}
            </List>
            {sectionIndex < getMenuItems().length - 1 && <Divider />}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={classes.root}>
      {/* App Bar */}
      <AppBar position="fixed" className={classes.appBar}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            className={classes.menuButton}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" className={classes.title}>
            🎯 Smart Attendance System
          </Typography>

          <IconButton color="inherit">
            <Notifications />
          </IconButton>

          <IconButton
            color="inherit"
            onClick={handleUserMenu}
          >
            <AccountCircle />
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleUserMenuClose}
          >
            <MenuItem onClick={handleUserMenuClose}>
              <AccountCircle style={{ marginRight: 8 }} />
              Profile
            </MenuItem>
            <MenuItem onClick={handleUserMenuClose}>
              <Security style={{ marginRight: 8 }} />
              Security
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ExitToApp style={{ marginRight: 8 }} />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <nav className={classes.drawer}>
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          anchor="left"
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          classes={{
            paper: classes.drawerPaper,
          }}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
        >
          {drawer}
        </Drawer>
      </nav>

      {/* Main Content */}
      <main className={classes.content}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
