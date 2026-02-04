import schedule
import time
import threading
import logging
from datetime import datetime
import requests
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SchedulerService:
    def __init__(self):
        self.running = False
        self.thread = None
        self.backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")
        self.admin_token = None
        
    def start(self):
        """Start the scheduler in a background thread"""
        if self.running:
            logger.warning("Scheduler already running")
            return
            
        self.running = True
        
        # Schedule daily tasks
        schedule.every().day.at("09:20").do(self.send_hod_attendance_summary)  # HOD summary at 9:20 AM
        schedule.every().day.at("09:20").do(self.send_absent_notifications)     # Parent absent notifications at 9:20 AM
        
        # You can also schedule test runs every few minutes for testing
        # schedule.every(2).minutes.do(self.send_hod_attendance_summary)
        # schedule.every(5).minutes.do(self.send_absent_notifications)
        
        # Start the scheduler thread
        self.thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self.thread.start()
        
        logger.info("Scheduler service started - HOD summaries at 9:20 AM, Absent notifications at 9:20 AM")
        
    def stop(self):
        """Stop the scheduler"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        logger.info("Scheduler service stopped")
        
    def _run_scheduler(self):
        """Run the scheduler loop"""
        while self.running:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
            
    def send_hod_attendance_summary(self):
        """
        Send HOD attendance summary at 9:20 AM
        This function is called by the scheduler
        """
        try:
            logger.info(f"Triggering HOD attendance summary at {datetime.now()}")
            
            # Get admin token if not already available
            if not self.admin_token:
                self._login_as_admin()
            
            # Call the API endpoint to send HOD summaries
            headers = {
                "Authorization": f"Bearer {self.admin_token}"
            }
            
            response = requests.post(
                f"{self.backend_url}/notifications/send_hod_summary",
                headers=headers
            )
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"HOD attendance summaries sent successfully: {result}")
            else:
                logger.error(f"Failed to send HOD summaries: {response.status_code} - {response.text}")
                # Try to refresh token
                self.admin_token = None
                
        except Exception as e:
            logger.error(f"Error in scheduled HOD summary: {str(e)}")
    
    def send_absent_notifications(self):
        """
        Send absent notifications at 9:20 AM
        This function is called by the scheduler
        """
        try:
            logger.info(f"Triggering absent notifications at {datetime.now()}")
            
            # Get admin token if not already available
            if not self.admin_token:
                self._login_as_admin()
            
            # Call the API endpoint to send absent notifications
            headers = {
                "Authorization": f"Bearer {self.admin_token}"
            }
            
            response = requests.post(
                f"{self.backend_url}/notifications/send_absent",
                headers=headers
            )
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"Absent notifications sent successfully: {result}")
            else:
                logger.error(f"Failed to send absent notifications: {response.status_code} - {response.text}")
                # Try to refresh token
                self.admin_token = None
                
        except Exception as e:
            logger.error(f"Error in scheduled absent notification: {str(e)}")
            
    def _login_as_admin(self):
        """Login as admin to get authentication token"""
        try:
            # Use default admin credentials or environment variables
            admin_username = os.getenv("ADMIN_USERNAME", "admin")
            admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
            
            response = requests.post(
                f"{self.backend_url}/auth/admin",
                json={
                    "username": admin_username,
                    "password": admin_password
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get("access_token")
                logger.info("Admin authentication successful for scheduler")
            else:
                logger.error(f"Failed to authenticate as admin: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Error authenticating as admin: {str(e)}")
            
# Create a global scheduler instance
scheduler_service = SchedulerService()
