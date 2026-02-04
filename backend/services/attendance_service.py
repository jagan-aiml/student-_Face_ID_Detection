from datetime import datetime, time
from sqlalchemy.orm import Session
from backend.database import Student, AttendanceRecord, User, PendingVerification
try:
    from backend.services.face_recognition_service import FaceRecognitionService
    FACE_RECOGNITION_AVAILABLE = True
except ImportError:
    FaceRecognitionService = None
    FACE_RECOGNITION_AVAILABLE = False

try:
    from backend.services.qr_service import QRBarcodeService
    QR_SERVICE_AVAILABLE = True
except ImportError:
    QRBarcodeService = None
    QR_SERVICE_AVAILABLE = False
from typing import Optional, Tuple, Dict, List
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AttendanceService:
    def __init__(self):
        self.face_service = FaceRecognitionService() if FACE_RECOGNITION_AVAILABLE else None
        self.qr_service = QRBarcodeService() if QR_SERVICE_AVAILABLE else None
        
        # Get attendance cutoff time from environment (default: 8:45 AM)
        cutoff_str = os.getenv("ATTENDANCE_CUTOFF_TIME", "08:45")
        hour, minute = map(int, cutoff_str.split(":"))
        self.cutoff_time = time(hour, minute)
        
    def mark_attendance(
        self, 
        image_data: bytes, 
        qr_data: Optional[str] = None, 
        manual_register_number: Optional[str] = None,
        db: Session = None
    ) -> Dict:
        """
        Mark attendance based on three scenarios:
        1. Direct Attendance: Face + QR before cutoff -> Present
        2. Late Attendance: Face + QR after cutoff -> Late
        3. Forgot ID Case: Face only + manual register -> Pending Verification
        
        Returns: {
            "status": "success/error",
            "attendance_status": "Present/Late/Pending",
            "student": student_info,
            "verification_method": "face_qr/face_only/manual",
            "message": "descriptive_message"
        }
        """
        try:
            current_time = datetime.now()
            current_date = current_time.date().strftime("%Y-%m-%d")
            
            # Check if QR data is provided (Scenarios 1 & 2)
            if qr_data:
                return self._handle_face_qr_attendance(
                    image_data, qr_data, current_time, current_date, db
                )
            
            # Check if manual register number is provided (Scenario 3)
            elif manual_register_number:
                return self._handle_forgot_id_attendance(
                    image_data, manual_register_number, current_time, current_date, db
                )
            
            # Only face data provided - try to find matching student
            else:
                return self._handle_face_only_attendance(
                    image_data, current_time, current_date, db
                )
                
        except Exception as e:
            logger.error(f"Error marking attendance: {str(e)}")
            return {
                "status": "error",
                "message": f"Failed to mark attendance: {str(e)}"
            }
    
    def _handle_face_qr_attendance(
        self, 
        image_data: bytes, 
        qr_data: str, 
        current_time: datetime, 
        current_date: str, 
        db: Session
    ) -> Dict:
        """Handle Scenario 1 & 2: Face + QR verification"""
        try:
            # Decode QR code
            qr_decoded = self.qr_service.decode_qr_from_image(qr_data.encode() if isinstance(qr_data, str) else qr_data)
            
            if not qr_decoded:
                return {
                    "status": "error",
                    "message": "Invalid or unreadable QR code"
                }
            
            # Verify student from QR
            student = self.qr_service.verify_student_qr(qr_decoded, db)
            
            if not student:
                return {
                    "status": "error",
                    "message": "Student not found or inactive"
                }
            
            # Check for duplicate attendance
            existing_attendance = db.query(AttendanceRecord).filter(
                AttendanceRecord.student_register_number == student.register_number,
                AttendanceRecord.date == current_date
            ).first()
            
            if existing_attendance:
                return {
                    "status": "error",
                    "message": f"Attendance already marked for today: {existing_attendance.status}"
                }
            
            # Verify face
            face_match = False
            face_confidence = 0.0
            
            if student.face_encoding:
                face_match, face_confidence = self.face_service.verify_face(
                    image_data, student.face_encoding
                )
            
            if not face_match:
                return {
                    "status": "error",
                    "message": "Face verification failed. Please ensure proper lighting and positioning."
                }
            
            # Determine attendance status based on time
            is_late = current_time.time() > self.cutoff_time
            attendance_status = "Late" if is_late else "Present"
            
            # Create attendance record
            attendance_record = AttendanceRecord(
                student_register_number=student.register_number,
                date=current_date,
                time=current_time,
                status=attendance_status,
                verification_method="face_qr",
                face_confidence=face_confidence,
                qr_verified=True,
                verification_status="verified",
                notification_sent=False
            )
            
            db.add(attendance_record)
            db.commit()
            
            # Send notification for late attendance after verification
            if attendance_status == "Late":
                try:
                    from backend.services.notification_service import NotificationService
                    notification_service = NotificationService()
                    notif_result = notification_service.send_attendance_notification(
                        attendance_record_id=attendance_record.id,
                        db=db
                    )
                    if notif_result["status"] == "success":
                        attendance_record.notification_sent = True
                        db.commit()
                        logger.info(f"Late notification sent for {student.register_number}")
                except Exception as e:
                    logger.error(f"Failed to send late notification: {str(e)}")
            
            logger.info(f"Attendance marked: {student.register_number} - {attendance_status}")
            
            return {
                "status": "success",
                "attendance_status": attendance_status,
                "student": {
                    "register_number": student.register_number,
                    "name": student.name,
                    "department": student.department,
                    "year": student.year,
                    "section": student.section
                },
                "verification_method": "face_qr",
                "face_confidence": face_confidence,
                "time": current_time.strftime("%H:%M:%S"),
                "message": f"Attendance marked as {attendance_status}"
            }
            
        except Exception as e:
            logger.error(f"Error in face+QR attendance: {str(e)}")
            db.rollback()
            return {
                "status": "error",
                "message": f"Failed to process face+QR attendance: {str(e)}"
            }
    
    def _handle_forgot_id_attendance(
        self, 
        image_data: bytes, 
        register_number: str, 
        current_time: datetime, 
        current_date: str, 
        db: Session
    ) -> Dict:
        """Handle Scenario 3: Forgot ID - Face + Manual Register Number"""
        try:
            # Find student by register number
            student = db.query(Student).filter(
                Student.register_number == register_number,
                Student.is_active == True
            ).first()
            
            if not student:
                return {
                    "status": "error",
                    "message": "Student not found with provided register number"
                }
            
            # Check for duplicate attendance
            existing_attendance = db.query(AttendanceRecord).filter(
                AttendanceRecord.student_register_number == student.register_number,
                AttendanceRecord.date == current_date
            ).first()
            
            if existing_attendance:
                return {
                    "status": "error",
                    "message": f"Attendance already marked for today: {existing_attendance.status}"
                }
            
            # Verify face
            face_match = False
            face_confidence = 0.0
            
            if student.face_encoding:
                face_match, face_confidence = self.face_service.verify_face(
                    image_data, student.face_encoding
                )
            
            if not face_match:
                return {
                    "status": "error",
                    "message": "Face verification failed. Identity could not be confirmed."
                }
            
            # Create pending attendance record (requires department verification)
            attendance_record = AttendanceRecord(
                student_register_number=student.register_number,
                date=current_date,
                time=current_time,
                status="Pending",
                verification_method="face_only",
                face_confidence=face_confidence,
                qr_verified=False,
                verification_status="pending",
                notification_sent=False
            )
            
            db.add(attendance_record)
            db.commit()
            
            # Send notification for forgot ID card
            try:
                from backend.services.notification_service import NotificationService
                notification_service = NotificationService()
                notif_result = notification_service.send_attendance_notification(
                    attendance_record_id=attendance_record.id,
                    db=db
                )
                if notif_result["status"] == "success":
                    attendance_record.notification_sent = True
                    db.commit()
                    logger.info(f"Forgot ID card notification sent for {student.register_number}")
            except Exception as e:
                logger.error(f"Failed to send forgot ID notification: {str(e)}")
            
            logger.info(f"Pending attendance recorded: {student.register_number}")
            
            return {
                "status": "success",
                "attendance_status": "Pending",
                "student": {
                    "register_number": student.register_number,
                    "name": student.name,
                    "department": student.department,
                    "year": student.year,
                    "section": student.section
                },
                "verification_method": "face_only",
                "face_confidence": face_confidence,
                "time": current_time.strftime("%H:%M:%S"),
                "message": "Attendance marked as Pending. Requires department verification."
            }
            
        except Exception as e:
            logger.error(f"Error in forgot ID attendance: {str(e)}")
            db.rollback()
            return {
                "status": "error",
                "message": f"Failed to process forgot ID attendance: {str(e)}"
            }
    
    def _handle_face_only_attendance(
        self, 
        image_data: bytes, 
        current_time: datetime, 
        current_date: str, 
        db: Session
    ) -> Dict:
        """Handle face-only attendance (auto-detect student)"""
        try:
            # Try to find matching student by face
            match_result = self.face_service.find_matching_student(image_data, db)
            
            if not match_result:
                return {
                    "status": "error",
                    "message": "No matching student found. Please provide register number or valid ID card."
                }
            
            student, face_confidence = match_result
            
            # Check for duplicate attendance
            existing_attendance = db.query(AttendanceRecord).filter(
                AttendanceRecord.student_register_number == student.register_number,
                AttendanceRecord.date == current_date
            ).first()
            
            if existing_attendance:
                return {
                    "status": "error",
                    "message": f"Attendance already marked for today: {existing_attendance.status}"
                }
            
            # Mark as pending since no ID verification
            attendance_record = AttendanceRecord(
                student_register_number=student.register_number,
                date=current_date,
                time=current_time,
                status="Pending",
                verification_method="face_only",
                face_confidence=face_confidence,
                qr_verified=False,
                verification_status="pending",
                notification_sent=False
            )
            
            db.add(attendance_record)
            db.commit()
            
            # Send notification for forgot ID card (face-only)
            try:
                from backend.services.notification_service import NotificationService
                notification_service = NotificationService()
                notif_result = notification_service.send_attendance_notification(
                    attendance_record_id=attendance_record.id,
                    db=db
                )
                if notif_result["status"] == "success":
                    attendance_record.notification_sent = True
                    db.commit()
                    logger.info(f"Forgot ID notification sent for {student.register_number} (face-only)")
            except Exception as e:
                logger.error(f"Failed to send forgot ID notification: {str(e)}")
            
            logger.info(f"Face-only attendance recorded: {student.register_number}")
            
            return {
                "status": "success",
                "attendance_status": "Pending",
                "student": {
                    "register_number": student.register_number,
                    "name": student.name,
                    "department": student.department,
                    "year": student.year,
                    "section": student.section
                },
                "verification_method": "face_only",
                "face_confidence": face_confidence,
                "time": current_time.strftime("%H:%M:%S"),
                "message": "Student identified by face. Attendance pending verification."
            }
            
        except Exception as e:
            logger.error(f"Error in face-only attendance: {str(e)}")
            db.rollback()
            return {
                "status": "error",
                "message": f"Failed to process face-only attendance: {str(e)}"
            }
    
    def verify_pending_attendance(
        self, 
        attendance_id: int, 
        action: str, 
        verifier_username: str, 
        notes: Optional[str] = None,
        db: Session = None
    ) -> Dict:
        """
        Verify pending attendance record
        Actions: 'approve' or 'reject'
        """
        try:
            # Find attendance record
            attendance = db.query(AttendanceRecord).filter(
                AttendanceRecord.id == attendance_id,
                AttendanceRecord.verification_status == "pending"
            ).first()
            
            if not attendance:
                return {
                    "status": "error",
                    "message": "Pending attendance record not found"
                }
            
            if action.lower() == "approve":
                # Determine status based on time
                is_late = attendance.time.time() > self.cutoff_time
                attendance.status = "Late" if is_late else "Present"
                attendance.verification_status = "verified"
                message = f"Attendance approved and marked as {attendance.status}"
                
            elif action.lower() == "reject":
                attendance.verification_status = "rejected"
                message = "Attendance rejected"
                
            else:
                return {
                    "status": "error",
                    "message": "Invalid action. Use 'approve' or 'reject'"
                }
            
            # Update verification details
            attendance.verified_by = verifier_username
            attendance.verification_notes = notes
            attendance.updated_at = datetime.utcnow()
            
            db.commit()
            
            logger.info(f"Attendance verification: {attendance_id} - {action} by {verifier_username}")
            
            return {
                "status": "success",
                "action": action,
                "attendance_status": attendance.status,
                "message": message
            }
            
        except Exception as e:
            logger.error(f"Error verifying attendance: {str(e)}")
            db.rollback()
            return {
                "status": "error",
                "message": f"Failed to verify attendance: {str(e)}"
            }
    
    def get_pending_verifications(self, department: Optional[str] = None, db: Session = None) -> List[Dict]:
        """Get list of pending attendance records for verification"""
        try:
            query = db.query(AttendanceRecord, Student).join(
                Student, AttendanceRecord.student_register_number == Student.register_number
            ).filter(AttendanceRecord.verification_status == "pending")
            
            if department:
                query = query.filter(Student.department == department)
            
            results = query.order_by(AttendanceRecord.created_at.desc()).all()
            
            pending_list = []
            for attendance, student in results:
                pending_list.append({
                    "id": attendance.id,
                    "student": {
                        "register_number": student.register_number,
                        "name": student.name,
                        "department": student.department,
                        "year": student.year,
                        "section": student.section
                    },
                    "date": attendance.date,
                    "time": attendance.time.strftime("%H:%M:%S"),
                    "verification_method": attendance.verification_method,
                    "face_confidence": attendance.face_confidence,
                    "created_at": attendance.created_at
                })
            
            return pending_list
            
        except Exception as e:
            logger.error(f"Error getting pending verifications: {str(e)}")
            return []
    
    def get_attendance_stats(self, date: Optional[str] = None, db: Session = None) -> Dict:
        """Get attendance statistics for a specific date"""
        try:
            if not date:
                date = datetime.now().date().strftime("%Y-%m-%d")
            
            # Get total students
            total_students = db.query(Student).filter(Student.is_active == True).count()
            
            # Get attendance records for the date
            attendance_query = db.query(AttendanceRecord).filter(AttendanceRecord.date == date)
            
            present_count = attendance_query.filter(AttendanceRecord.status == "Present").count()
            late_count = attendance_query.filter(AttendanceRecord.status == "Late").count()
            pending_count = attendance_query.filter(AttendanceRecord.status == "Pending").count()
            
            absent_count = total_students - (present_count + late_count + pending_count)
            
            return {
                "date": date,
                "total_students": total_students,
                "present": present_count,
                "late": late_count,
                "pending": pending_count,
                "absent": absent_count,
                "attendance_percentage": round((present_count + late_count) / total_students * 100, 2) if total_students > 0 else 0
            }
            
        except Exception as e:
            logger.error(f"Error getting attendance stats: {str(e)}")
            return {
                "date": date or "unknown",
                "total_students": 0,
                "present": 0,
                "late": 0,
                "pending": 0,
                "absent": 0,
                "attendance_percentage": 0
            }
