import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, date
import os
import logging
from typing import List, Optional
from sqlalchemy.orm import Session
from backend.database import Student, AttendanceRecord, Notification, Department

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self):
        """Initialize notification service with email configuration"""
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.email_user = os.getenv("EMAIL_USER", "")
        self.email_password = os.getenv("EMAIL_PASSWORD", "")
        self.from_email = os.getenv("FROM_EMAIL", self.email_user)
        
        if not self.email_user or not self.email_password:
            logger.warning("Email credentials not configured in .env file")
        else:
            logger.info(f"Notification service initialized with email: {self.email_user}")
    
    def send_email(self, to_email: str, subject: str, body: str, html: bool = False) -> bool:
        """
        Send email notification
        Args:
            to_email: Recipient email address
            subject: Email subject
            body: Email body content
            html: Whether body is HTML formatted
        Returns:
            bool: True if sent successfully, False otherwise
        """
        try:
            if not self.email_user or not self.email_password:
                logger.error("Email credentials not configured")
                return False
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = self.from_email
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Attach body
            if html:
                msg.attach(MIMEText(body, 'html'))
            else:
                msg.attach(MIMEText(body, 'plain'))
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.email_user, self.email_password)
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    def send_absent_notification(self, student: Student, db: Session) -> bool:
        """
        Send notification to parents when student is absent
        """
        try:
            if not student.parent_email:
                logger.warning(f"No parent email for student {student.register_number}")
                return False
            
            current_date = date.today().strftime("%Y-%m-%d")
            
            subject = f"Absence Alert - {student.name}"
            
            body = f"""
Dear Parent/Guardian,

This is to inform you that your ward {student.name} (Register Number: {student.register_number}) 
was marked ABSENT on {current_date}.

Student Details:
- Name: {student.name}
- Register Number: {student.register_number}
- Department: {student.department}
- Year: {student.year}, Section: {student.section}
- Date: {current_date}

If this absence was unplanned, please contact the department immediately.

For any queries, please contact the college administration.

Best Regards,
Attendance Management System
S.A. Engineering College
"""
            
            success = self.send_email(student.parent_email, subject, body)
            
            if success:
                # Record notification in database
                notification = Notification(
                    student_register_number=student.register_number,
                    type="absent",
                    message=f"Absent notification sent to parent",
                    date=current_date,
                    time=datetime.now().strftime("%H:%M:%S"),
                    sent=True,
                    email=student.parent_email
                )
                db.add(notification)
                db.commit()
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending absent notification: {str(e)}")
            return False
    
    def send_late_notification(self, student: Student, attendance_time: str, db: Session) -> bool:
        """
        Send notification to parents when student is late
        """
        try:
            if not student.parent_email:
                logger.warning(f"No parent email for student {student.register_number}")
                return False
            
            current_date = date.today().strftime("%Y-%m-%d")
            
            subject = f"Late Arrival - {student.name}"
            
            body = f"""
Dear Parent/Guardian,

This is to inform you that your ward {student.name} (Register Number: {student.register_number}) 
arrived LATE to college on {current_date} at {attendance_time}.

Student Details:
- Name: {student.name}
- Register Number: {student.register_number}
- Department: {student.department}
- Year: {student.year}, Section: {student.section}
- Arrival Time: {attendance_time}
- Date: {current_date}

Cutoff Time: 8:45 AM

Please ensure your ward arrives on time for future classes.

Best Regards,
Attendance Management System
S.A. Engineering College
"""
            
            success = self.send_email(student.parent_email, subject, body)
            
            if success:
                # Record notification in database
                notification = Notification(
                    student_register_number=student.register_number,
                    type="late",
                    message=f"Late arrival notification sent to parent",
                    date=current_date,
                    time=attendance_time,
                    sent=True,
                    email=student.parent_email
                )
                db.add(notification)
                db.commit()
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending late notification: {str(e)}")
            return False
    
    def send_pending_verification_notification(self, student: Student, reason: str, db: Session) -> bool:
        """
        Send notification to HOD when attendance needs verification
        """
        try:
            # Get department HOD email
            department = db.query(Department).filter(Department.code == student.department).first()
            
            if not department or not department.hod_email:
                logger.warning(f"No HOD email for department {student.department}")
                return False
            
            current_date = date.today().strftime("%Y-%m-%d")
            current_time = datetime.now().strftime("%H:%M:%S")
            
            subject = f"Attendance Verification Required - {student.name}"
            
            body = f"""
Dear HOD,

An attendance record requires your verification.

Student Details:
- Name: {student.name}
- Register Number: {student.register_number}
- Department: {student.department}
- Year: {student.year}, Section: {student.section}
- Date: {current_date}
- Time: {current_time}

Reason for Verification: {reason}

Please login to the department dashboard to review and approve/reject this attendance record.

Dashboard Link: http://localhost:3000/department/dashboard

Best Regards,
Attendance Management System
S.A. Engineering College
"""
            
            success = self.send_email(department.hod_email, subject, body)
            
            if success:
                # Record notification in database
                notification = Notification(
                    student_register_number=student.register_number,
                    type="pending_verification",
                    message=f"Pending verification notification sent to HOD",
                    date=current_date,
                    time=current_time,
                    sent=True,
                    email=department.hod_email
                )
                db.add(notification)
                db.commit()
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending pending verification notification: {str(e)}")
            return False
    
    def send_hod_daily_summary(self, department_code: str, db: Session) -> bool:
        """
        Send daily attendance summary to HOD
        """
        try:
            # Get department
            department = db.query(Department).filter(Department.code == department_code).first()
            
            if not department or not department.hod_email:
                logger.warning(f"No HOD email for department {department_code}")
                return False
            
            current_date = date.today().strftime("%Y-%m-%d")
            
            # Get today's attendance records
            attendance_records = db.query(AttendanceRecord).filter(
                AttendanceRecord.date == current_date
            ).join(Student).filter(
                Student.department == department_code
            ).all()
            
            # Count statuses
            present_count = sum(1 for r in attendance_records if r.status == "present")
            late_count = sum(1 for r in attendance_records if r.status == "late")
            absent_count = sum(1 for r in attendance_records if r.status == "absent")
            pending_count = sum(1 for r in attendance_records if r.status == "pending")
            
            # Get total students
            total_students = db.query(Student).filter(Student.department == department_code).count()
            
            # Calculate attendance rate
            attendance_rate = ((present_count + late_count) / total_students * 100) if total_students > 0 else 0
            
            subject = f"Daily Attendance Summary - {department.name} - {current_date}"
            
            body = f"""
Dear {department.hod_name},

Here is the attendance summary for {department.name} department on {current_date}:

ATTENDANCE STATISTICS:
- Total Students: {total_students}
- Present: {present_count}
- Late: {late_count}
- Absent: {absent_count}
- Pending Verification: {pending_count}
- Attendance Rate: {attendance_rate:.1f}%

"""
            
            # Add late students list
            if late_count > 0:
                body += "\nLATE ARRIVALS:\n"
                for record in attendance_records:
                    if record.status == "late":
                        student = db.query(Student).filter(Student.register_number == record.student_register_number).first()
                        if student:
                            body += f"- {student.name} ({student.register_number}) - Arrived at {record.time}\n"
            
            # Add absent students list
            if absent_count > 0:
                body += "\nABSENT STUDENTS:\n"
                for record in attendance_records:
                    if record.status == "absent":
                        student = db.query(Student).filter(Student.register_number == record.student_register_number).first()
                        if student:
                            body += f"- {student.name} ({student.register_number}) - Year {student.year}, Section {student.section}\n"
            
            # Add pending verifications
            if pending_count > 0:
                body += "\nPENDING VERIFICATIONS:\n"
                for record in attendance_records:
                    if record.status == "pending":
                        student = db.query(Student).filter(Student.register_number == record.student_register_number).first()
                        if student:
                            body += f"- {student.name} ({student.register_number}) - Reason: {record.verification_method}\n"
            
            body += f"""

Please login to the department dashboard for detailed records and verification actions.

Dashboard Link: http://localhost:3000/department/dashboard

Best Regards,
Attendance Management System
S.A. Engineering College
"""
            
            success = self.send_email(department.hod_email, subject, body)
            
            if success:
                logger.info(f"Daily summary sent to HOD of {department_code}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending HOD daily summary: {str(e)}")
            return False
