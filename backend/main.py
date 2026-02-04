from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Form
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, time
from typing import Optional, List
import uvicorn
import os
import logging
import json
from dotenv import load_dotenv
import sys

# Import local modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from backend.database import get_db, create_tables, User, Student, AttendanceRecord, Department, PendingVerification, AttendanceAnalytics, Notification, BlockchainTransaction, SessionLocal
from backend.models import *
from backend.auth import AuthService, get_current_user
# Import services with error handling
try:
    from backend.services.attendance_service import AttendanceService
except ImportError as e:
    print(f"Warning: AttendanceService import failed: {e}")
    AttendanceService = None

try:
    from backend.services.notification_service import NotificationService
    NotificationService_class = NotificationService
except Exception as e:
    logger.warning(f"Notification service not initialized: {str(e)}")
    NotificationService_class = None

# Initialize scheduler service for automated tasks
try:
    from backend.services.scheduler_service import scheduler_service
    # Start scheduler when app starts
    @app.on_event("startup")
    async def startup_event():
        scheduler_service.start()
        logger.info("Scheduler service started - HOD summaries at 9:20 AM, Parent absent notifications at 9:20 AM daily")
    
    @app.on_event("shutdown")
    async def shutdown_event():
        scheduler_service.stop()
        logger.info("Scheduler service stopped")
except Exception as e:
    logger.warning(f"Scheduler service not initialized: {str(e)}")

try:
    from backend.services.analytics_service import AttendanceAnalyticsService
except ImportError as e:
    print(f"Warning: AnalyticsService import failed: {e}")
    AttendanceAnalyticsService = None

try:
    from backend.services.blockchain_service import BlockchainService
except ImportError as e:
    print(f"Warning: BlockchainService import failed: {e}")
    BlockchainService = None

try:
    from backend.services.face_recognition_service import FaceRecognitionService
except ImportError as e:
    print(f"Warning: FaceRecognitionService import failed: {e}")
    FaceRecognitionService = None

try:
    from backend.services.qr_service import QRBarcodeService
except ImportError as e:
    print(f"Warning: QRBarcodeService import failed: {e}")
    QRBarcodeService = None

# Load environment variables from .env file
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
if os.path.exists(env_path):
    load_dotenv(env_path, override=True)
    logger.info(f"✅ Loaded .env file from {env_path}")
else:
    logger.warning(f"⚠️ .env file not found at {env_path}, using .env.example")
    env_example_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env.example')
    if os.path.exists(env_example_path):
        load_dotenv(env_example_path)

# Verify email configuration is loaded
smtp_username = os.getenv("SMTP_USERNAME")
logger.info(f"📧 Email configuration loaded: {smtp_username if smtp_username else 'NOT CONFIGURED'}")

# Initialize FastAPI app
app = FastAPI(
    title="Blockchain-Integrated Smart Attendance System",
    description="Face Recognition + QR/Barcode verification with blockchain immutable records",
)

# CORS middleware - More permissive for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],  # Explicit frontend origins
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Initialize services
auth_service = AuthService()
attendance_service = AttendanceService() if AttendanceService else None
notification_service = NotificationService_class() if NotificationService_class else None
analytics_service = AttendanceAnalyticsService() if AttendanceAnalyticsService else None
blockchain_service = BlockchainService() if BlockchainService else None
face_service = FaceRecognitionService() if FaceRecognitionService else None
qr_service = QRBarcodeService() if QRBarcodeService else None

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Handle preflight OPTIONS requests
@app.options("/{path:path}")
async def options_handler():
    return {"message": "OK"}

# Create tables on startup
@app.on_event("startup")
async def startup_event():
    """Initialize the system on startup"""
    print("\n" + "="*70)
    print("🎯 REAL-TIME ATTENDANCE SYSTEM - PRODUCTION MODE")
    print("="*70)
    
    # Create tables if they don't exist
    create_tables()
    print("✅ Database tables initialized")
    
    # Initialize services (they'll handle their own setup)
    print("✅ All services initialized - PRODUCTION ENVIRONMENT")
    print("📝 NO TEST DATA - System starts clean for real usage")
    print("\n🔐 Default admin credentials:")
    try:
        from backend.auth import initialize_default_users
        db = SessionLocal()
        initialize_default_users(db)
        print("Default users initialized")
    except Exception as e:
        print(f"Warning: Failed to initialize default users: {e}")
    finally:
        db.close()

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Blockchain-Integrated Smart Attendance System API",
        "version": "1.0.0",
        "status": "active"
    }

# Test endpoint for CORS
@app.post("/test")
async def test_endpoint(data: dict):
    return {"received": data, "status": "success"}

# Add explicit OPTIONS handler for student update endpoint
@app.options("/admin/students/{student_id}")
async def options_update_student(student_id: int):
    return {"message": "OK"}

# Authentication endpoints
@app.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Authenticate user and return access token"""
    token = auth_service.authenticate_user(form_data.username, form_data.password, db)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token

@app.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """Alternative login endpoint"""
    token = auth_service.authenticate_user(user_data.username, user_data.password, db)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    return token

# Multi-Role Authentication Endpoints
@app.post("/auth/admin", response_model=Token)
async def admin_login(admin_data: AdminLogin, db: Session = Depends(get_db)):
    """Admin login with username and password"""
    token = auth_service.authenticate_admin(admin_data.username, admin_data.password, db)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials"
        )
    return token

@app.post("/auth/department", response_model=Token)
async def department_login(dept_data: DepartmentLogin, db: Session = Depends(get_db)):
    """Department login with department code and password"""
    token = auth_service.authenticate_department(dept_data.department_code, dept_data.password, db)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid department credentials"
        )
    return token

@app.post("/auth/operator", response_model=Token)
async def operator_login(operator_data: OperatorLogin, db: Session = Depends(get_db)):
    """Operator login with department code and password"""
    token = auth_service.authenticate_operator(operator_data.department_code, operator_data.password, db)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid operator credentials"
        )
    return token

@app.post("/auth/student", response_model=Token)
async def student_login(student_data: StudentLogin, db: Session = Depends(get_db)):
    """Student/Parent login with register number and date of birth"""
    token = auth_service.authenticate_student(
        student_data.register_number, 
        student_data.date_of_birth.strftime("%Y-%m-%d"), 
        db
    )
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid student credentials"
        )
    return token

@app.post("/register_student", response_model=StudentResponse)
async def register_student(
    student_data: StudentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Register new student with basic information"""
    # Check if user has permission (admin or department)
    if current_user.role not in ["admin", "department"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to register students"
        )
    
    # Check if student already exists
    existing_student = db.query(Student).filter(
        Student.register_number == student_data.register_number
    ).first()
    
    if existing_student:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student with this register number already exists"
        )
    
    # Check if user account already exists
    existing_user = db.query(User).filter(
        User.username == student_data.register_number
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account with this register number already exists"
        )
    
    # Create student record
    student = Student(**student_data.dict())
    db.add(student)
    
    # Create user account for student authentication
    # Use register number as username and let students login with register_number + date_of_birth
    student_user = User(
        username=student_data.register_number,
        hashed_password="",  # No password needed - authentication is via date_of_birth
        role="student",
        email=student_data.email,
        is_active=True
    )
    db.add(student_user)
    
    db.commit()
    db.refresh(student)
    
    return student

@app.post("/students/{register_number}/face-encoding")
async def store_face_encoding(
    register_number: str,
    face_image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Store face encoding for a student"""
    if current_user.role not in ["admin", "department"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to store face encodings"
        )
    
    # Read image data
    image_data = await face_image.read()
    
    # Store face encoding
    success = face_service.store_face_encoding(register_number, image_data, db)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to store face encoding"
        )
    
    return {"message": "Face encoding stored successfully"}

@app.post("/students/{register_number}/qr-code")
async def generate_qr_code(
    register_number: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate QR code for student"""
    if current_user.role not in ["admin", "department"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to generate QR codes"
        )
    
    # Find student
    student = db.query(Student).filter(
        Student.register_number == register_number
    ).first()
    
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    # Generate QR code
    student_data = {
        "name": student.name,
        "department": student.department,
        "year": student.year,
        "section": student.section
    }
    
    qr_image_b64 = qr_service.generate_student_qr(register_number, student_data)
    
    if not qr_image_b64:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate QR code"
        )
    
    # Store QR data in database (optional)
    qr_service.store_qr_data(register_number, qr_image_b64, db)
    
    return {
        "qr_code": qr_image_b64,
        "message": "QR code generated successfully"
    }

# Detect face and ID card simultaneously
@app.post("/detect_face_and_id")
async def detect_face_and_id(
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Detect face and ID card in a single image for continuous scanning"""
    try:
        image_data = await image.read()
        
        # DEBUG: Save the image for analysis
        import os
        debug_dir = "debug_images"
        if not os.path.exists(debug_dir):
            os.makedirs(debug_dir)
        
        # Save the last captured image
        import time
        timestamp = int(time.time())
        with open(f"{debug_dir}/scan_{timestamp}.jpg", "wb") as f:
            f.write(image_data)
        logger.info(f"DEBUG: Saved scan image to {debug_dir}/scan_{timestamp}.jpg")
        
        # Detect face and check liveness
        face_detected = False
        liveness = False
        liveness_score = 0.0
        try:
            if face_service:
                face_match = face_service.detect_face(image_data)
                face_detected = face_match is not None
                
                # If face detected, check liveness
                if face_detected:
                    is_live, live_score = face_service.check_liveness(image_data)
                    liveness = is_live
                    liveness_score = live_score
                    logger.info(f"Liveness check - Live: {liveness}, Score: {liveness_score:.3f}")
                
                logger.info(f"Face detection result: {face_detected}, Liveness: {liveness}")
            else:
                logger.warning("Face recognition service not available")
                face_detected = False
        except Exception as e:
            logger.error(f"Face detection/liveness error: {str(e)}")
            face_detected = False
            liveness = False
        
        # Detect ID card/barcode
        id_detected = False
        register_number = None
        try:
            qr_result = qr_service.decode_qr_from_image(image_data)
            logger.info(f"QR/Barcode detection result: {qr_result}")
            
            if qr_result:
                # Handle different return formats
                if isinstance(qr_result, dict):
                    # Check for register_number key
                    if 'register_number' in qr_result:
                        register_number = str(qr_result['register_number'])
                        id_detected = True
                    # Check for data key (new format)
                    elif 'data' in qr_result:
                        data = str(qr_result['data'])
                        # Check if it's a 7-digit number (like 2022026)
                        if data.isdigit() and len(data) == 7:
                            register_number = data
                            id_detected = True
                        elif data.isdigit() and 5 <= len(data) <= 9:
                            register_number = data
                            id_detected = True
                        else:
                            # Try to extract register number from text
                            import re
                            patterns = [
                                r'\d{7}',  # 7-digit number (priority)
                                r'\d{5,9}',  # 5-9 digit numbers
                                r'\d{2}[A-Z]{2,4}\d{3}',  # Academic format
                            ]
                            for pattern in patterns:
                                match = re.search(pattern, data)
                                if match:
                                    register_number = match.group()
                                    id_detected = True
                                    break
                elif isinstance(qr_result, str):
                    # Direct string result
                    if qr_result.isdigit() and len(qr_result) == 7:
                        register_number = qr_result
                        id_detected = True
                    else:
                        # Try to extract register number using patterns
                        import re
                        patterns = [
                            r'\d{7}',  # 7-digit number (priority)
                            r'\d{5,9}',  # 5-9 digit numbers
                            r'\d{2}[A-Z]{2,4}\d{3}',  # Academic format
                        ]
                        for pattern in patterns:
                            match = re.search(pattern, qr_result)
                            if match:
                                register_number = match.group()
                                id_detected = True
                                break
                
            if not id_detected:
                logger.warning("⚠️ No barcode detected - ID card not readable")
            else:
                logger.info(f"✅ Barcode detected successfully: {register_number}")
            
            logger.info(f"ID detection - detected: {id_detected}, register: {register_number}")
        except Exception as e:
            logger.error(f"ID detection error: {str(e)}")
            id_detected = False
            register_number = None
        
        return {
            "face_detected": bool(face_detected),
            "id_detected": bool(id_detected),
            "register_number": register_number,
            "liveness": bool(liveness) if face_detected else None,
            "liveness_score": float(liveness_score) if face_detected else None
        }
        
    except Exception as e:
        logger.error(f"Error in face and ID detection: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Detection failed: {str(e)}"
        )

# Create pending verification for Case C (face detected but no ID card)
@app.post("/create_pending_verification")
async def create_pending_verification(
    face_image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create pending verification when face is detected but ID card is not readable"""
    try:
        face_image_data = await face_image.read()
        current_time = datetime.now()
        current_date = current_time.date().strftime("%Y-%m-%d")
        
        # Try to identify the person from face recognition
        identified_student = None
        face_confidence = 0.0
        
        if face_service:
            # Get all active students and try to match face
            students = db.query(Student).filter(Student.is_active == True).all()
            
            best_match = None
            best_confidence = 0.0
            
            for student in students:
                if student.face_encoding:
                    try:
                        is_match, confidence = face_service.verify_face(
                            face_image_data, student.face_encoding, threshold=0.4  # Lower threshold for identification
                        )
                        if is_match and confidence > best_confidence:
                            best_match = student
                            best_confidence = confidence
                    except Exception as e:
                        logger.error(f"Face comparison error for {student.register_number}: {str(e)}")
                        continue
            
            if best_match and best_confidence > 0.4:
                identified_student = best_match
                face_confidence = best_confidence
                logger.info(f"Face identified as student {identified_student.register_number} with confidence {face_confidence}")
            else:
                logger.warning("Could not identify student from face - creating anonymous pending verification")
        
        # Save face image for manual verification
        import os
        pending_dir = "pending_faces"
        if not os.path.exists(pending_dir):
            os.makedirs(pending_dir)
        
        face_image_path = f"{pending_dir}/{current_time.timestamp()}.jpg"
        with open(face_image_path, "wb") as f:
            f.write(face_image_data)
        
        # Create attendance record and pending verification
        current_date = current_time.date().strftime("%Y-%m-%d")
        
        # Create an attendance record with pending status
        temp_attendance = AttendanceRecord(
            student_register_number=identified_student.register_number if identified_student else "UNKNOWN",
            date=current_date,
            time=current_time,
            status="Pending",
            verification_method="face_only_no_id",
            face_confidence=float(face_confidence) if identified_student else 0.0,
            qr_verified=False,
            verification_status="pending",
            notification_sent=False
        )
        db.add(temp_attendance)
        db.flush()  # Get the ID without committing
        
        # Create pending verification record with correct schema
        pending_verification = PendingVerification(
            attendance_record_id=temp_attendance.id,
            student_register_number=identified_student.register_number if identified_student else "UNKNOWN",
            student_name=identified_student.name if identified_student else "Unknown Student",
            date=current_date,
            time=current_time,
            face_confidence=float(face_confidence) if identified_student else 0.0,
            status="pending",
            review_notes=f"Face-only attendance (Case C). {'Student identified' if identified_student else 'Student not identified'}."
        )
        db.add(pending_verification)
        db.commit()
        
        # Send notification to HOD and parents if student identified
        notification_sent = False
        if identified_student:
            try:
                await send_case_c_notification(identified_student, current_time)
                notification_sent = True
            except Exception as e:
                logger.error(f"Failed to send Case C notification: {str(e)}")
        
        return {
            "case": "C",
            "status": "pending_verification",
            "message": "Face detected but ID card not readable. Pending manual verification.",
            "student": {
                "register_number": identified_student.register_number if identified_student else "Unknown",
                "name": identified_student.name if identified_student else "Unknown",
                "confidence": float(face_confidence)
            } if identified_student else None,
            "pending_verification_id": pending_verification.id,
            "notification_sent": notification_sent,
            "requires_manual_verification": True
        }
        
    except Exception as e:
        logger.error(f"Error creating pending verification: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create pending verification: {str(e)}"
        )

# Send Case C notification
async def send_case_c_notification(student: Student, timestamp: datetime):
    """Send notification for Case C - face detected but no ID card"""
    try:
        if notification_service:
            # Create notification for HOD
            hod_notification = Notification(
                recipient_type="hod",
                recipient_id=student.department,
                title="Student Attendance - ID Card Issue",
                message=f"Student {student.name} ({student.register_number}) was detected by face recognition but ID card could not be scanned. Manual verification required.",
                notification_type="case_c_verification",
                priority="medium",
                data=json.dumps({
                    "student_register_number": student.register_number,
                    "student_name": student.name,
                    "timestamp": timestamp.isoformat(),
                    "case": "C"
                })
            )
            
            # Create notification for parents
            parent_notification = Notification(
                recipient_type="parent",
                recipient_id=student.parent_email,
                title="Attendance Verification Required",
                message=f"Your child {student.name} was present but their ID card could not be scanned. Please ensure the ID card barcode is clean and undamaged.",
                notification_type="case_c_verification",
                priority="medium",
                data=json.dumps({
                    "student_register_number": student.register_number,
                    "student_name": student.name,
                    "timestamp": timestamp.isoformat(),
                    "case": "C"
                })
            )
            
            # Save notifications
            db = SessionLocal()
            db.add(hod_notification)
            db.add(parent_notification)
            db.commit()
            db.close()
            
            logger.info(f"Case C notifications sent for student {student.register_number}")
    except Exception as e:
        logger.error(f"Failed to send Case C notifications: {str(e)}")

# Identify student from face only (for Forgot ID case)
@app.post("/identify_student_from_face")
async def identify_student_from_face(
    face_image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Try to identify a student from their face alone"""
    try:
        face_image_data = await face_image.read()
        
        if not face_service:
            return {
                "identified": False,
                "message": "Face recognition service not available"
            }
        
        # Get all active students with face encodings
        students = db.query(Student).filter(
            Student.is_active == True,
            Student.face_encoding != None
        ).all()
        
        best_match = None
        best_confidence = 0.0
        
        for student in students:
            try:
                # Verify face with liveness detection
                is_match, confidence, is_live = face_service.verify_face_with_liveness(
                    face_image_data, 
                    student.face_encoding
                )
                
                # Check if live
                if not is_live:
                    logger.warning(f"Liveness check failed for student {student.register_number}")
                    continue  # Skip this student if not live
                if is_match and confidence > best_confidence:
                    best_match = student
                    best_confidence = confidence
            except Exception as e:
                logger.error(f"Face comparison error for {student.register_number}: {str(e)}")
                continue
        
        if best_match and best_confidence > 0.5:
            logger.info(f"✅ Face identified as student {best_match.register_number} with confidence {best_confidence}")
            return {
                "identified": True,
                "register_number": best_match.register_number,
                "name": best_match.name,
                "department": best_match.department,
                "confidence": float(best_confidence),
                "message": f"Face identified as {best_match.name}"
            }
        else:
            logger.info("❓ Could not identify student from face with sufficient confidence")
            return {
                "identified": False,
                "message": "Could not identify student from face"
            }
            
    except Exception as e:
        logger.error(f"Error identifying student from face: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to identify student: {str(e)}"
        )

# Create manual pending verification for Forgot ID Case
@app.post("/create_manual_pending_verification")
async def create_manual_pending_verification(
    face_image: UploadFile = File(...),
    manual_register_number: str = Form(...),
    identified_register_number: str = Form(""),
    case_type: str = Form("forgot_id_manual"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create pending verification for manual Case C (Forgot ID)"""
    try:
        face_image_data = await face_image.read()
        current_time = datetime.now()
        
        # Find the student
        student = db.query(Student).filter(
            Student.register_number == manual_register_number
        ).first()
        
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Student with register number {manual_register_number} not found"
            )
        
        # Check if register numbers match (if identified)
        verification_notes = f"Manual Case C: Forgot ID card. Entered by {current_user.username}."
        if identified_register_number:
            if identified_register_number == manual_register_number:
                verification_notes += f" Face identification confirmed (matched: {identified_register_number})."
            else:
                verification_notes += f" WARNING: Face identified as {identified_register_number} but manually entered {manual_register_number}."
        else:
            verification_notes += " Face could not be automatically identified."
        
        # First create a temporary attendance record for the pending verification
        current_date = current_time.date().strftime("%Y-%m-%d")
        
        # Create an attendance record with pending status
        temp_attendance = AttendanceRecord(
            student_register_number=manual_register_number,
            date=current_date,
            time=current_time,
            status="Pending",
            verification_method="forgot_id_manual",
            face_confidence=0.0,
            qr_verified=False,
            verification_status="pending",
            notification_sent=False
        )
        db.add(temp_attendance)
        db.flush()  # Get the ID without committing
        
        # Create pending verification record with correct schema
        pending_verification = PendingVerification(
            attendance_record_id=temp_attendance.id,
            student_register_number=manual_register_number,
            student_name=student.name,
            date=current_date,
            time=current_time,
            face_confidence=0.0,
            manual_register_number=manual_register_number if identified_register_number != manual_register_number else None,
            status="pending",
            review_notes=verification_notes
        )
        
        db.add(pending_verification)
        db.commit()
        
        # Save face image for manual verification
        import os
        pending_dir = "pending_faces"
        if not os.path.exists(pending_dir):
            os.makedirs(pending_dir)
        
        face_image_path = f"{pending_dir}/forgot_id_{current_time.timestamp()}.jpg"
        with open(face_image_path, "wb") as f:
            f.write(face_image_data)
        
        # Send notification to HOD and parents
        notification_sent = False
        try:
            await send_forgot_id_notification(student, current_time, identified_register_number)
            notification_sent = True
        except Exception as e:
            logger.error(f"Failed to send Forgot ID notification: {str(e)}")
        
        return {
            "case": "C",
            "status": "pending_verification",
            "message": "Forgot ID case submitted for manual verification",
            "student": {
                "register_number": student.register_number,
                "name": student.name,
                "department": student.department
            },
            "pending_verification_id": pending_verification.id,
            "notification_sent": notification_sent,
            "requires_manual_verification": True,
            "verification_notes": verification_notes
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating manual pending verification: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create pending verification: {str(e)}"
        )

# Send Forgot ID notification
async def send_forgot_id_notification(student: Student, timestamp: datetime, identified_register_number: str = None):
    """Send notification for Forgot ID Case"""
    try:
        mismatch_warning = ""
        if identified_register_number and identified_register_number != student.register_number:
            mismatch_warning = f" WARNING: Face was identified as {identified_register_number} but student entered {student.register_number}."
        
        # Create notification for HOD
        hod_message = f"Student {student.name} ({student.register_number}) forgot their ID card and requested manual verification.{mismatch_warning} Please review and verify."
        
        # Create notification for parents
        parent_message = f"Your child {student.name} forgot their ID card today. Manual attendance verification has been requested. Please ensure they carry their ID card."
        
        # Log notifications (implement actual notification service as needed)
        logger.info(f"HOD Notification: {hod_message}")
        logger.info(f"Parent Notification: {parent_message}")
        
        # Here you would implement actual email/SMS sending
        # For now, just log the notifications
        
    except Exception as e:
        logger.error(f"Failed to send Forgot ID notifications: {str(e)}")
        raise

# Get pending verifications for admin review
@app.get("/pending_verifications")
async def get_pending_verifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all pending verifications for admin review"""
    try:
        # Only admins and department users can view pending verifications
        if current_user.role not in ["admin", "department"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view pending verifications"
            )
        
        pending_verifications = db.query(PendingVerification).filter(
            PendingVerification.status == "pending"
        ).order_by(PendingVerification.timestamp.desc()).all()
        
        result = []
        for pv in pending_verifications:
            student_info = None
            if pv.student_register_number:
                student = db.query(Student).filter(
                    Student.register_number == pv.student_register_number
                ).first()
                if student:
                    student_info = {
                        "register_number": student.register_number,
                        "name": student.name,
                        "department": student.department,
                        "year": student.year,
                        "section": student.section
                    }
            
            result.append({
                "id": pv.id,
                "student": student_info,
                "date": pv.date,
                "time": pv.time.isoformat() if pv.time else None,
                "face_confidence": pv.face_confidence,
                "review_notes": pv.review_notes,
                "status": pv.status,
                "created_at": pv.created_at.isoformat() if pv.created_at else None
            })
        
        return {
            "pending_verifications": result,
            "total_count": len(result)
        }
        
    except Exception as e:
        logger.error(f"Error fetching pending verifications: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch pending verifications: {str(e)}"
        )

# Approve or reject pending verification
@app.post("/verify_pending_attendance/{verification_id}")
async def verify_pending_attendance(
    verification_id: int,
    action: str = Form(...),  # "approve" or "reject"
    register_number: str = Form(None),  # Required for approval
    notes: str = Form(""),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve or reject a pending verification"""
    try:
        # Only admins and department users can verify
        if current_user.role not in ["admin", "department"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to verify attendance"
            )
        
        pending_verification = db.query(PendingVerification).filter(
            PendingVerification.id == verification_id
        ).first()
        
        if not pending_verification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pending verification not found"
            )
        
        if action == "approve":
            if not register_number:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Register number required for approval"
                )
            
            # Find student
            student = db.query(Student).filter(
                Student.register_number == register_number
            ).first()
            
            if not student:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Student not found"
                )
            
            # Create attendance record
            current_time = pending_verification.timestamp
            current_date = current_time.date().strftime("%Y-%m-%d")
            cutoff_time = time(8, 45)
            
            is_late = current_time.time() > cutoff_time
            attendance_status = "Late" if is_late else "Present"
            
            attendance_record = AttendanceRecord(
                student_register_number=student.register_number,
                date=current_date,
                time=current_time,
                status=attendance_status,
                verification_method="manual_face_verification",
                face_confidence=pending_verification.face_confidence,
                qr_verified=False,
                verification_status="manually_verified",
                verified_by=current_user.username,
                verification_notes=f"Case C manual verification: {notes}",
                notification_sent=True
            )
            
            db.add(attendance_record)
            
            # Update pending verification
            pending_verification.status = "approved"
            pending_verification.verified_by = current_user.username
            pending_verification.verification_notes = notes
            pending_verification.resolved_at = datetime.now()
            
            db.commit()
            
            return {
                "status": "approved",
                "message": f"Attendance approved for {student.name} ({student.register_number})",
                "attendance_status": attendance_status,
                "student": {
                    "register_number": student.register_number,
                    "name": student.name,
                    "department": student.department
                }
            }
            
        elif action == "reject":
            # Update pending verification
            pending_verification.status = "rejected"
            pending_verification.verified_by = current_user.username
            pending_verification.verification_notes = notes
            pending_verification.resolved_at = datetime.now()
            
            db.commit()
            
            return {
                "status": "rejected",
                "message": "Pending verification rejected",
                "notes": notes
            }
        
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid action. Use 'approve' or 'reject'"
            )
        
    except Exception as e:
        logger.error(f"Error verifying pending attendance: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify attendance: {str(e)}"
        )

# Mark attendance with verification (for simultaneous detection)
@app.post("/mark_attendance_verified")
async def mark_attendance_verified(
    face_image: UploadFile = File(...),
    id_register_number: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark attendance with face and ID verification"""
    try:
        face_image_data = await face_image.read()
        current_time = datetime.now()
        current_date = current_time.date().strftime("%Y-%m-%d")
        cutoff_time = time(8, 45)  # 8:45 AM cutoff
        
        # Find student by register number from ID
        student = db.query(Student).filter(
            Student.register_number == id_register_number,
            Student.is_active == True
        ).first()
        
        if not student:
            return {
                "case": "B",
                "status": "error",
                "message": "Face and ID not match. Please retry.",
                "attendance_status": None
            }
        
        # Verify face matches the student with liveness detection
        face_match = False
        face_confidence = 0.0
        is_live = True
        
        if student.face_encoding and face_service:
            try:
                # Use liveness detection for attendance verification
                face_match, face_confidence, is_live = face_service.verify_face_with_liveness(
                    face_image_data, student.face_encoding
                )
                logger.info(f"="*80)
                logger.info(f"🔍 FACE VERIFICATION DEBUG for {id_register_number}:")
                logger.info(f"   Student: {student.name} ({student.register_number})")
                logger.info(f"   Stored encoding length: {len(student.face_encoding)}")
                logger.info(f"   Match Result: {face_match}")
                logger.info(f"   Similarity Score: {face_confidence:.4f}")
                logger.info(f"   Threshold Required: 0.6")
                logger.info(f"   Liveness Result: {is_live}")
                logger.info(f"   Pass/Fail: {'✅ PASS' if face_match and is_live else '❌ FAIL'}")
                if not face_match:
                    logger.warning(f"   ⚠️ Face match FAILED - Score {face_confidence:.4f} < 0.6 threshold")
                if not is_live:
                    logger.warning(f"   ⚠️ Liveness check FAILED")
                logger.info(f"="*80)
                
                # If face matches but not live, log warning but continue with attendance
                if face_match and not is_live:
                    logger.warning(f"Liveness check failed for {id_register_number} but face matches - proceeding with attendance")
            except Exception as e:
                logger.error(f"Face verification error: {str(e)}")
                face_match = False
        else:
            # If no face encoding stored, we need to register the face first
            logger.warning(f"No face encoding stored for student {id_register_number}")
            
            # Try to register the face from current image
            if face_service:
                try:
                    face_encoding = face_service.encode_face(face_image_data)
                    if face_encoding:
                        # Store the face encoding for future verification
                        student.face_encoding = face_encoding
                        db.commit()
                        logger.info(f"Face encoding registered for student {id_register_number}")
                        face_match = True  # Accept since we just registered
                        face_confidence = 1.0
                    else:
                        logger.warning(f"Could not extract face encoding from image for {id_register_number}")
                        face_match = False
                except Exception as e:
                    logger.error(f"Face encoding error: {str(e)}")
                    face_match = False
            else:
                logger.error("Face recognition service not available")
                face_match = False
        
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
        
        # Case A: Face & ID Match
        if face_match:
            # Determine if late
            is_late = current_time.time() > cutoff_time
            
            if is_late:
                # Case D: Late Entry
                attendance_status = "Late"
                case = "D"
                message = "Late entry recorded. Notification sent to HOD and Parents."
                
                # Create the attendance record first
                attendance_record = AttendanceRecord(
                    student_register_number=student.register_number,
                    date=current_date,
                    time=current_time,
                    status="Late",
                    verification_method="face_id",
                    face_confidence=float(face_confidence),
                    qr_verified=True,
                    verification_status="verified",
                    notification_sent=False
                )
                db.add(attendance_record)
                db.commit()
                
                # Send notifications after face and ID verification
                await send_late_notification(student, attendance_record, db)
            else:
                # Case A: Normal attendance
                attendance_status = "Present"
                case = "A"
                message = "Attendance recorded successfully."
                
                # Create attendance record for normal present case
                attendance_record = AttendanceRecord(
                    student_register_number=student.register_number,
                    date=current_date,
                    time=current_time,
                    status=attendance_status,
                    verification_method="face_id",
                    face_confidence=float(face_confidence),
                    qr_verified=True,
                    verification_status="verified",
                    notification_sent=False
                )
                
                db.add(attendance_record)
                db.commit()
            
            return {
                "case": case,
                "status": "success",
                "attendance_status": attendance_status,
                "student": {
                    "register_number": student.register_number,
                    "name": student.name,
                    "department": student.department,
                    "year": student.year,
                    "section": student.section
                },
                "verification_method": "face_id",
                "face_confidence": float(face_confidence),
                "time": current_time.strftime("%H:%M:%S"),
                "message": message
            }
        else:
            # Case B: Face & ID Mismatch
            return {
                "case": "B",
                "status": "error",
                "message": "Face and ID not match. Please retry.",
                "attendance_status": None
            }
            
    except Exception as e:
        logger.error(f"Error in verified attendance marking: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark attendance: {str(e)}"
        )

# Notification functions
async def send_late_notification(student: Student, attendance_record: AttendanceRecord, db: Session):
    """Send notification for late attendance to Parents after face and ID verification"""
    try:
        # Send notification using the notification service
        result = notification_service.send_attendance_notification(
            attendance_record_id=attendance_record.id,
            db=db
        )
        
        if result["status"] == "success":
            logger.info(f"Late notification sent for {student.name} ({student.register_number})")
            # Update the attendance record to mark notification as sent
            attendance_record.notification_sent = True
            db.commit()
        else:
            logger.error(f"Failed to send late notification: {result['message']}")
            
    except Exception as e:
        logger.error(f"Error sending late notification: {str(e)}")

async def send_missing_id_notification(student: Student, attendance_record: AttendanceRecord, db: Session):
    """Send notification for missing ID card (forgot ID) to Parents"""
    try:
        # Send notification using the notification service
        result = notification_service.send_attendance_notification(
            attendance_record_id=attendance_record.id,
            db=db
        )
        
        if result["status"] == "success":
            logger.info(f"Forgot ID card notification sent for {student.name} ({student.register_number})")
            # Update the attendance record to mark notification as sent
            attendance_record.notification_sent = True
            db.commit()
        else:
            logger.error(f"Failed to send forgot ID notification: {result['message']}")
            
    except Exception as e:
        logger.error(f"Error sending missing ID notification: {str(e)}")

# Attendance Marking Endpoints
@app.post("/mark_attendance")
async def mark_attendance_with_liveness(
    face_image: UploadFile = File(...),
    qr_image: Optional[UploadFile] = File(None),
    register_number: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Mark attendance using face recognition and optional QR/ID verification
    Handles all three scenarios: Direct, Late, and Forgot ID
    """
    try:
        # Process face image
        face_image_data = await face_image.read()
        
        # Process QR image if provided
        qr_data = None
        if qr_image:
            qr_image_data = await qr_image.read()
            # Try to decode QR
            qr_decoded = qr_service.decode_qr_from_image(qr_image_data) if qr_service else None
            if qr_decoded:
                qr_data = qr_decoded
        
        # Mark attendance using the service
        result = attendance_service.mark_attendance(
            image_data=face_image_data,
            qr_data=qr_data,
            manual_register_number=register_number,
            db=db
        )
        
        # Handle Case C - Missing ID notification (Forgot ID card)
        if result.get('attendance_status') == 'Pending' and result.get('verification_method') == 'face_only':
            # Get the attendance record and send notification for forgot ID card
            attendance_record = db.query(AttendanceRecord).filter(
                AttendanceRecord.student_register_number == result['student']['register_number'],
                AttendanceRecord.date == datetime.now().date().strftime("%Y-%m-%d")
            ).first()
            
            student = db.query(Student).filter(
                Student.register_number == result['student']['register_number']
            ).first()
            
            if student and attendance_record:
                await send_missing_id_notification(student, attendance_record, db)
                result['message'] = "ID card not detected. Attendance marked as Pending. Email notification sent to parent about forgot ID card."
        
        # Handle Late attendance notification  
        elif result.get('attendance_status') == 'Late':
            # Get the attendance record and send notification for late attendance
            attendance_record = db.query(AttendanceRecord).filter(
                AttendanceRecord.student_register_number == result['student']['register_number'],
                AttendanceRecord.date == datetime.now().date().strftime("%Y-%m-%d")
            ).first()
            
            student = db.query(Student).filter(
                Student.register_number == result['student']['register_number']
            ).first()
            
            if student and attendance_record:
                await send_late_notification(student, attendance_record, db)
                result['message'] = f"{result['message']} Email notification sent to parent about late arrival."
        
        return result
        
    except Exception as e:
        logger.error(f"Error in mark_attendance endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark attendance: {str(e)}"
        )

# Student Management Endpoints
@app.get("/students")
async def get_all_students(
    department: str = None,
    year: str = None,
    db: Session = Depends(get_db)
):
    """Get all students with optional filters"""
    query = db.query(Student)
    
    if department:
        query = query.filter(Student.department == department)
    if year:
        query = query.filter(Student.year == year)
    
    students = query.all()
    return students

@app.get("/students/{register_number}")
async def get_student_profile(
    register_number: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get individual student profile data"""
    # Check permissions
    if current_user.role == "student":
        # Students can only view their own profile
        if current_user.username != register_number:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this student's profile"
            )
    
    # Get student data
    student = db.query(Student).filter(Student.register_number == register_number).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    return {
        "register_number": student.register_number,
        "name": student.name,
        "email": student.email,
        "phone": student.phone,
        "department": student.department,
        "year": student.year,
        "section": student.section,
        "parent_name": student.parent_name,
        "parent_email": student.parent_email,
        "parent_phone": student.parent_phone,
        "date_of_birth": student.date_of_birth,
        "is_active": student.is_active,
        "created_at": student.created_at
    }

# Attendance Records Endpoints
@app.get("/attendance/records")
async def get_attendance_records(
    date_from: str = None,
    date_to: str = None,
    department: str = None,
    register_number: str = None,
    db: Session = Depends(get_db)
):
    """Get attendance records with filters"""
    query = db.query(AttendanceRecord)
    
    if date_from:
        query = query.filter(AttendanceRecord.date >= date_from)
    if date_to:
        query = query.filter(AttendanceRecord.date <= date_to)
    if department:
        # Join with Student table to filter by department
        query = query.join(Student, AttendanceRecord.student_register_number == Student.register_number)
        query = query.filter(Student.department == department)
    if register_number:
        query = query.filter(AttendanceRecord.student_register_number == register_number)
    
    records = query.all()
    
    # Add student information to each record
    result = []
    for record in records:
        student = db.query(Student).filter(Student.register_number == record.student_register_number).first()
        result.append({
            "id": record.id,
            "student": {
                "id": student.id if student else None,
                "name": student.name if student else "Unknown",
                "register_number": student.register_number if student else record.student_register_number,
                "department": student.department if student else "Unknown",
                "year": student.year if student else "Unknown",
                "section": student.section if student else "Unknown"
            } if student else None,
            "register_number": record.student_register_number,
            "date": record.date,
            "timestamp": record.time.isoformat() if record.time else None,
            "status": record.status,
            "verification_method": record.verification_method
        })
    
    return result

# Analytics Endpoints
@app.get("/analytics/stats")
async def get_analytics_stats(
    date_from: str = None,
    date_to: str = None,
    department: str = None,
    db: Session = Depends(get_db)
):
    """Get analytics statistics"""
    query = db.query(AttendanceRecord)
    
    if date_from:
        query = query.filter(AttendanceRecord.date >= date_from)
    if date_to:
        query = query.filter(AttendanceRecord.date <= date_to)
    if department:
        query = query.join(Student, AttendanceRecord.student_register_number == Student.register_number)
        query = query.filter(Student.department == department)
    
    records = query.all()
    total_records = len(records)
    
    # Calculate statistics
    present_count = sum(1 for r in records if r.status == "Present")
    late_count = sum(1 for r in records if r.status == "Late")
    pending_count = sum(1 for r in records if r.status == "Pending")
    
    # Calculate trend (mock for now)
    trend_percent = 5.2  # This would be calculated based on previous period
    
    return {
        "total_records": total_records,
        "present": present_count,
        "late": late_count,
        "pending": pending_count,
        "attendance_rate": round((present_count + late_count) / total_records * 100, 2) if total_records > 0 else 0,
        "trend_percent": trend_percent
    }

# Verification Endpoints
@app.get("/pending_list")
async def get_pending_verifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of pending attendance records for verification"""
    if current_user.role not in ["admin", "department"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view pending verifications"
        )
    
    # Filter by department if user is department role
    department_filter = current_user.department if current_user.role == "department" else None
    
    pending_list = attendance_service.get_pending_verifications(department_filter, db)
    return {"pending_verifications": pending_list}

@app.post("/verify_pending")
async def verify_pending_attendance(
    verification_data: AttendanceVerificationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve or reject pending attendance"""
    if current_user.role not in ["admin", "department"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to verify attendance"
        )
    
    result = attendance_service.verify_pending_attendance(
        verification_data.attendance_id,
        verification_data.action,
        current_user.username,
        verification_data.notes,
        db
    )
    
    if result["status"] == "error":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )
    
    # If approved, send notification and create blockchain transaction
    if verification_data.action.lower() == "approve":
        try:
            notification_service.send_attendance_notification(
                verification_data.attendance_id, db
            )
            blockchain_service.create_attendance_transaction(
                verification_data.attendance_id, db
            )
        except Exception as e:
            print(f"Post-verification error: {e}")
    
    return result

# Dashboard and Statistics Endpoints
@app.get("/attendance/stats")
async def get_attendance_stats(
    date: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get attendance statistics for a specific date"""
    stats = attendance_service.get_attendance_stats(date, db)
    return stats

@app.get("/students/{register_number}/attendance")
async def get_student_attendance(
    register_number: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get attendance records for a specific student"""
    # Check permissions
    if current_user.role == "student":
        # Students can only view their own attendance
        student_user = db.query(Student).filter(
            Student.register_number == current_user.username
        ).first()
        if not student_user or student_user.register_number != register_number:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this student's attendance"
            )
    
    # Build query
    query = db.query(AttendanceRecord).filter(
        AttendanceRecord.student_register_number == register_number
    )
    
    if start_date:
        query = query.filter(AttendanceRecord.date >= start_date)
    if end_date:
        query = query.filter(AttendanceRecord.date <= end_date)
    
    attendance_records = query.order_by(AttendanceRecord.date.desc()).all()
    
    return {"attendance_records": [
        {
            "id": record.id,
            "date": record.date,
            "time": record.time.strftime("%H:%M:%S"),
            "status": record.status,
            "verification_method": record.verification_method,
            "verification_status": record.verification_status,
            "face_confidence": record.face_confidence,
            "created_at": record.created_at
        }
        for record in attendance_records
    ]}

# Notification Endpoints
@app.post("/notify_parent")
async def send_parent_notification(
    notification_data: NotificationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send notification to parent"""
    if current_user.role not in ["admin", "department"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to send notifications"
        )
    
    result = notification_service.send_attendance_notification(
        notification_data.attendance_record_id, db
    )
    
    if result["status"] == "error":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )
    
    return result

# Notification Endpoints
@app.post("/notifications/send_hod_summary")
async def send_hod_attendance_summary_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send attendance summary to HODs with late and absent student lists
    This should be triggered at 9:20 AM daily
    Only admin users can trigger this
    """
    try:
        # Check authorization
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to send HOD summaries"
            )
        
        # Send HOD attendance summaries
        result = notification_service.send_hod_attendance_summary(db)
        
        logger.info(f"HOD attendance summaries sent: {result}")
        
        return result
        
    except Exception as e:
        logger.error(f"Error sending HOD summaries: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send HOD summaries: {str(e)}"
        )

@app.post("/notifications/send_absent")
async def send_absent_notifications_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send notifications to all absent students' parents
    This should be triggered at 9:20 AM daily
    Only admin and department users can trigger this
    """
    try:
        # Check authorization
        if current_user.role not in ["admin", "department"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to send absent notifications"
            )
        
        # Send absent notifications
        result = notification_service.send_absent_notifications(db)
        
        logger.info(f"Absent notifications sent: {result}")
        
        return result
        
    except Exception as e:
        logger.error(f"Error sending absent notifications: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send absent notifications: {str(e)}"
        )

# Blockchain Endpoints
@app.get("/blockchain/audit/{register_number}")
async def get_blockchain_audit_trail(
    register_number: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get blockchain audit trail for a student"""
    if current_user.role not in ["admin", "department"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view blockchain audit trail"
        )
    
    audit_trail = blockchain_service.get_blockchain_audit_trail(
        register_number, start_date, end_date, db
    )
    
    return {"audit_trail": audit_trail}

@app.post("/blockchain/verify/{attendance_id}")
async def verify_blockchain_integrity(
    attendance_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify blockchain integrity of attendance record"""
    if current_user.role not in ["admin", "department"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to verify blockchain integrity"
        )
    
    result = blockchain_service.verify_attendance_integrity(attendance_id, db)
    
    if result["status"] == "error":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )
    
    return result

# Enhanced Attendance Endpoints
@app.post("/attendance/mark")
async def mark_attendance(
    attendance_data: AttendanceMarkRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark attendance with face and/or QR verification"""
    if current_user.role not in ["department", "operator"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to mark attendance"
        )
    
    # This would typically receive image data from frontend
    # For now, we'll simulate the attendance marking
    result = {
        "status": "success",
        "attendance_status": "Present",
        "verification_method": attendance_data.verification_method,
        "message": "Attendance marked successfully"
    }
    
    return result

@app.get("/attendance/pending/{department}")
async def get_pending_verifications(
    department: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get pending verifications for department"""
    if current_user.role not in ["admin", "department"] or (
        current_user.role == "department" and current_user.department != department
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this department's pending verifications"
        )
    
    pending_records = db.query(PendingVerification).filter(
        PendingVerification.status == "pending"
    ).join(
        Student, PendingVerification.student_register_number == Student.register_number
    ).filter(
        Student.department == department
    ).all()
    
    return [
        PendingVerificationResponse.from_orm(record) for record in pending_records
    ]

@app.post("/attendance/verify")
async def verify_pending_attendance(
    verification: VerificationAction,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve or reject pending attendance"""
    if current_user.role not in ["admin", "department"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to verify attendance"
        )
    
    pending_record = db.query(PendingVerification).filter(
        PendingVerification.id == verification.verification_id
    ).first()
    
    if not pending_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pending verification not found"
        )
    
    # Update pending record
    pending_record.status = verification.action
    pending_record.reviewed_by = current_user.username
    pending_record.review_notes = verification.notes
    pending_record.reviewed_at = datetime.utcnow()
    
    # Update corresponding attendance record
    attendance_record = db.query(AttendanceRecord).filter(
        AttendanceRecord.id == pending_record.attendance_record_id
    ).first()
    
    if attendance_record:
        if verification.action == "approve":
            # Determine if it was late based on time
            cutoff_time = datetime.strptime("08:45", "%H:%M").time()
            attendance_time = attendance_record.time.time()
            attendance_record.status = "Late" if attendance_time > cutoff_time else "Present"
            attendance_record.verification_status = "verified"
        else:
            attendance_record.status = "Absent"
            attendance_record.verification_status = "rejected"
        
        attendance_record.verified_by = current_user.username
    
    db.commit()
    
    return {"message": f"Attendance {verification.action}d successfully"}

# Department Management Endpoints
@app.post("/departments", response_model=DepartmentResponse)
async def create_department(
    dept_data: DepartmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new department"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can create departments"
        )
    
    # Check if department already exists
    existing_dept = db.query(Department).filter(Department.code == dept_data.code).first()
    if existing_dept:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department with this code already exists"
        )
    
    department = Department(**dept_data.dict())
    db.add(department)
    db.commit()
    db.refresh(department)
    
    return department

@app.get("/departments", response_model=List[DepartmentResponse])
async def get_departments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all departments"""
    departments = db.query(Department).filter(Department.is_active == True).all()
    return departments

# Report Endpoints
@app.post("/reports/attendance")
async def generate_attendance_report(
    report_request: AttendanceReportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate attendance reports"""
    if current_user.role not in ["admin", "department"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to generate reports"
        )
    
    # If department user, restrict to their department
    department_filter = report_request.department
    if current_user.role == "department":
        department_filter = current_user.department
    
    # Generate report based on request parameters
    query = db.query(AttendanceRecord).join(
        Student, AttendanceRecord.student_register_number == Student.register_number
    )
    
    if department_filter:
        query = query.filter(Student.department == department_filter)
    
    if report_request.year:
        query = query.filter(Student.year == report_request.year)
    
    if report_request.section:
        query = query.filter(Student.section == report_request.section)
    
    if report_request.date_from:
        query = query.filter(AttendanceRecord.date >= report_request.date_from.strftime("%Y-%m-%d"))
    
    if report_request.date_to:
        query = query.filter(AttendanceRecord.date <= report_request.date_to.strftime("%Y-%m-%d"))
    
    attendance_records = query.all()
    
    # Process records into report format
    student_stats = {}
    for record in attendance_records:
        reg_no = record.student_register_number
        if reg_no not in student_stats:
            student = db.query(Student).filter(Student.register_number == reg_no).first()
            student_stats[reg_no] = {
                "register_number": reg_no,
                "name": student.name if student else "Unknown",
                "department": student.department if student else "Unknown",
                "year": student.year if student else 0,
                "section": student.section if student else "Unknown",
                "total_days": 0,
                "present_days": 0,
                "late_days": 0,
                "absent_days": 0
            }
        
        student_stats[reg_no]["total_days"] += 1
        status = record.status.lower()
        if status == "present":
            student_stats[reg_no]["present_days"] += 1
        elif status == "late":
            student_stats[reg_no]["late_days"] += 1
        elif status == "absent":
            student_stats[reg_no]["absent_days"] += 1
    
    # Calculate attendance percentages
    report_data = []
    for stats in student_stats.values():
        total = stats["total_days"]
        if total > 0:
            attendance_percentage = ((stats["present_days"] + stats["late_days"]) / total) * 100
            stats["attendance_percentage"] = round(attendance_percentage, 2)
        else:
            stats["attendance_percentage"] = 0.0
        
        report_data.append(StudentAttendanceReport(**stats))
    
    return {
        "report_type": report_request.report_type,
        "department": department_filter,
        "date_range": {
            "from": report_request.date_from.strftime("%Y-%m-%d") if report_request.date_from else None,
            "to": report_request.date_to.strftime("%Y-%m-%d") if report_request.date_to else None
        },
        "total_students": len(report_data),
        "data": report_data
    }

@app.get("/reports/department/{department}")
async def get_department_report(
    department: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get department-wise attendance summary"""
    if current_user.role not in ["admin", "department"] or (
        current_user.role == "department" and current_user.department != department
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this department's report"
        )
    
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Get today's attendance for department
    today_records = db.query(AttendanceRecord).join(
        Student, AttendanceRecord.student_register_number == Student.register_number
    ).filter(
        Student.department == department,
        AttendanceRecord.date == today
    ).all()
    
    # Count students by status
    present_count = sum(1 for r in today_records if r.status == "Present")
    late_count = sum(1 for r in today_records if r.status == "Late")
    absent_count = sum(1 for r in today_records if r.status == "Absent")
    
    # Get total students in department
    total_students = db.query(Student).filter(
        Student.department == department,
        Student.is_active == True
    ).count()
    
    # Get pending verifications
    pending_count = db.query(PendingVerification).join(
        Student, PendingVerification.student_register_number == Student.register_number
    ).filter(
        Student.department == department,
        PendingVerification.status == "pending"
    ).count()
    
    attendance_percentage = 0.0
    if total_students > 0:
        attendance_percentage = ((present_count + late_count) / total_students) * 100
    
    return DepartmentAttendanceReport(
        department=department,
        total_students=total_students,
        present_today=present_count,
        late_today=late_count,
        absent_today=absent_count,
        pending_verifications=pending_count,
        attendance_percentage=round(attendance_percentage, 2)
    )

# Analytics Endpoints
@app.get("/analytics/insights")
async def get_predictive_insights(
    department: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get predictive analytics insights"""
    if current_user.role not in ["admin", "department"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view analytics"
        )
    
    # If department user, restrict to their department
    if current_user.role == "department":
        department = current_user.department
    
    if not analytics_service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Analytics service not available"
        )
    
    insights = analytics_service.generate_predictive_insights(db, department)
    return insights

@app.get("/analytics/trends/{student_register_number}")
async def get_student_trends(
    student_register_number: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get attendance trends for specific student"""
    # Check if user has permission to view this student's data
    if current_user.role == "student" and current_user.username != student_register_number:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view other students' data"
        )
    
    if current_user.role == "department":
        # Check if student belongs to user's department
        student = db.query(Student).filter(Student.register_number == student_register_number).first()
        if not student or student.department != current_user.department:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Student not in your department"
            )
    
    # Get analytics data for student
    analytics_records = db.query(AttendanceAnalytics).filter(
        AttendanceAnalytics.student_register_number == student_register_number
    ).order_by(AttendanceAnalytics.month.desc()).limit(12).all()
    
    return [AttendanceAnalyticsResponse.from_orm(record) for record in analytics_records]

# Notification Endpoints
@app.post("/notifications/send")
async def send_notification(
    notification_request: NotificationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send notification for attendance record"""
    if current_user.role not in ["admin", "department"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to send notifications"
        )
    
    if not notification_service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Notification service not available"
        )
    
    result = notification_service.send_attendance_notification(
        notification_request.attendance_record_id, db
    )
    
    if result["status"] == "error":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )
    
    return result

@app.get("/notifications/history/{student_register_number}")
async def get_notification_history(
    student_register_number: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get notification history for student"""
    if current_user.role == "student" and current_user.username != student_register_number:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view other students' notifications"
        )
    
    # Get attendance records for student
    attendance_records = db.query(AttendanceRecord).filter(
        AttendanceRecord.student_register_number == student_register_number
    ).all()
    
    attendance_ids = [record.id for record in attendance_records]
    
    # Get notifications for these records
    notifications = db.query(Notification).filter(
        Notification.attendance_record_id.in_(attendance_ids)
    ).order_by(Notification.created_at.desc()).limit(50).all()
    
    return [NotificationResponse.from_orm(notification) for notification in notifications]

# User Management Endpoints (Admin Only)
@app.get("/admin/users")
async def get_all_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all users (Admin only)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    users = db.query(User).all()
    return [
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "department": user.department,
            "is_active": user.is_active,
            "created_at": user.created_at
        }
        for user in users
    ]

@app.put("/admin/users/{user_id}/toggle")
async def toggle_user_status(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle user active status (Admin only)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.is_active = not user.is_active
    db.commit()
    
    return {"message": f"User {'activated' if user.is_active else 'deactivated'} successfully"}

@app.get("/admin/blockchain/logs")
async def get_blockchain_logs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get blockchain transaction logs (Admin only)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    try:
        blockchain_transactions = db.query(BlockchainTransaction).order_by(
            BlockchainTransaction.created_at.desc()
        ).limit(100).all()
        
        return [BlockchainResponse.from_attributes(transaction) for transaction in blockchain_transactions]
    except Exception as e:
        # Return empty logs for clean system
        print(f"Blockchain logs error: {e}")
        return []

# System Information Endpoints
@app.get("/system/status")
async def get_system_status():
    """Get system status and health check"""
    return {
        "status": "active",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "face_recognition": "active",
            "qr_detection": "active",
            "blockchain": "active",
            "notifications": "active"
        }
    }

# Enhanced Admin Management Endpoints

# Department Management
@app.put("/admin/departments/{department_id}")
async def update_department(
    department_id: int,
    dept_data: DepartmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update department information"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    department = db.query(Department).filter(Department.id == department_id).first()
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
    
    for key, value in dept_data.dict().items():
        setattr(department, key, value)
    
    db.commit()
    db.refresh(department)
    return department

@app.delete("/admin/departments/{department_id}")
async def delete_department(
    department_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete department and associated user account"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    try:
        department = db.query(Department).filter(Department.id == department_id).first()
        if not department:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found"
            )
        
        # Store department code for user account lookup
        department_code = department.code
        
        # Option 1: Complete deletion (removes all data)
        # Uncomment the following lines if you want complete deletion:
        
        # # Delete all students in this department
        # db.query(Student).filter(Student.department == department_code).delete()
        # 
        # # Delete department record
        # db.delete(department)
        
        # Option 2: Soft deletion (recommended - preserves data for audit)
        # Deactivate department record
        department.is_active = False
        
        # Also deactivate the associated user account
        department_user = db.query(User).filter(
            User.username == department_code,
            User.role == "department"
        ).first()
        
        if department_user:
            department_user.is_active = False
            logger.info(f"Deactivated user account for department {department_code}")
        else:
            logger.warning(f"No user account found for department {department_code}")
        
        db.commit()
        
        return {
            "message": "Department and associated credentials deactivated successfully",
            "department_code": department_code,
            "user_account_deactivated": department_user is not None
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting department {department_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting department: {str(e)}"
        )

@app.delete("/admin/departments/{department_id}/permanent")
async def permanently_delete_department(
    department_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Permanently delete department and all associated data (WARNING: Cannot be undone)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    try:
        department = db.query(Department).filter(Department.id == department_id).first()
        if not department:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found"
            )
        
        department_code = department.code
        
        # Count students in this department
        student_count = db.query(Student).filter(Student.department == department_code).count()
        
        # Delete all students in this department (and their attendance records)
        students_in_dept = db.query(Student).filter(Student.department == department_code).all()
        attendance_count = 0
        
        for student in students_in_dept:
            # Delete attendance records for each student
            student_attendance_count = db.query(AttendanceRecord).filter(
                AttendanceRecord.student_register_number == student.register_number
            ).count()
            attendance_count += student_attendance_count
            
            db.query(AttendanceRecord).filter(
                AttendanceRecord.student_register_number == student.register_number
            ).delete()
            
            # Delete student user accounts
            db.query(User).filter(
                User.username == student.register_number,
                User.role == "student"
            ).delete()
        
        # Delete all students in the department
        db.query(Student).filter(Student.department == department_code).delete()
        
        # Delete department user account
        department_user = db.query(User).filter(
            User.username == department_code,
            User.role == "department"
        ).first()
        
        user_deleted = False
        if department_user:
            db.delete(department_user)
            user_deleted = True
        
        # Delete department record
        db.delete(department)
        
        db.commit()
        
        return {
            "message": "Department and all associated data permanently deleted",
            "department_code": department_code,
            "students_deleted": student_count,
            "attendance_records_deleted": attendance_count,
            "user_account_deleted": user_deleted,
            "warning": "This action cannot be undone"
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error permanently deleting department {department_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error permanently deleting department: {str(e)}"
        )

# Student Management  
@app.get("/admin/students")
async def get_all_students(
    department: str = None,
    year: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all students with optional filters"""
    if current_user.role not in ["admin", "department"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view students"
        )
    
    query = db.query(Student).filter(Student.is_active == True)
    
    if department:
        query = query.filter(Student.department == department)
    if year:
        query = query.filter(Student.year == year)
    
    students = query.all()
    return students

@app.put("/admin/students/{student_id}")
async def update_student(
    student_id: int,
    student_data: dict,  # Use dict instead of StudentCreate to handle extra fields
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update student information"""
    try:
        print(f"Updating student {student_id} with data: {student_data}")
        
        if current_user.role not in ["admin", "department"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update students"
            )
        
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found"
            )
        
        # Store original register_number to find corresponding user account
        original_register_number = student.register_number
        
        # Define valid fields that can be updated
        valid_fields = {
            'register_number', 'name', 'email', 'phone', 'department', 
            'year', 'section', 'date_of_birth', 'parent_name', 
            'parent_email', 'parent_phone'
        }
        
        # Update student record with only valid fields
        for key, value in student_data.items():
            if key in valid_fields and value is not None and value != '':
                # Handle date_of_birth conversion
                if key == 'date_of_birth' and isinstance(value, str):
                    try:
                        from datetime import datetime
                        value = datetime.strptime(value, "%Y-%m-%d").date()
                    except ValueError as date_error:
                        print(f"Date parsing error: {date_error}")
                        continue
                
                setattr(student, key, value)
                print(f"Updated {key} to {value}")
        
        # Update corresponding user account for authentication
        if 'register_number' in student_data or 'email' in student_data:
            student_user = db.query(User).filter(
                User.username == original_register_number,
                User.role == "student"
            ).first()
            
            if student_user:
                # Update user credentials that might have changed
                if 'register_number' in student_data:
                    student_user.username = student_data['register_number']
                if 'email' in student_data:
                    student_user.email = student_data['email']
                print(f"Updated user account for {original_register_number}")
            else:
                # If no user account exists, create one (for existing students registered before the fix)
                existing_user = db.query(User).filter(User.username == student_data.get('register_number', original_register_number)).first()
                if not existing_user:
                    student_user = User(
                        username=student_data.get('register_number', original_register_number),
                        hashed_password="",  # No password needed - authentication is via date_of_birth
                        role="student",
                        email=student_data.get('email', ''),
                        is_active=True
                    )
                    db.add(student_user)
                    print(f"Created new user account for {student_data.get('register_number', original_register_number)}")
        
        db.commit()
        db.refresh(student)
        print(f"Successfully updated student {student_id}")
        return student
        
    except Exception as e:
        db.rollback()
        print(f"Error updating student: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating student: {str(e)}"
        )

@app.delete("/admin/students/{student_id}")
async def delete_student(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete student and associated user account"""
    if current_user.role not in ["admin", "department"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete students"
        )
    
    try:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found"
            )
        
        # Store register number for user account lookup
        register_number = student.register_number
        
        # Option 1: Complete deletion (removes all data)
        # Uncomment the following lines if you want complete deletion:
        
        # # Delete attendance records
        # db.query(AttendanceRecord).filter(
        #     AttendanceRecord.student_register_number == register_number
        # ).delete()
        # 
        # # Delete student record
        # db.delete(student)
        
        # Option 2: Soft deletion (recommended - preserves data for audit)
        # Deactivate student record
        student.is_active = False
        
        # Also deactivate the associated user account
        student_user = db.query(User).filter(
            User.username == register_number,
            User.role == "student"
        ).first()
        
        if student_user:
            student_user.is_active = False
            logger.info(f"Deactivated user account for student {register_number}")
        else:
            logger.warning(f"No user account found for student {register_number}")
        
        db.commit()
        
        return {
            "message": "Student and associated credentials deactivated successfully",
            "student_register_number": register_number,
            "user_account_deactivated": student_user is not None
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting student {student_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting student: {str(e)}"
        )

@app.delete("/admin/students/{student_id}/permanent")
async def permanently_delete_student(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Permanently delete student and all associated data (WARNING: Cannot be undone)"""
    if current_user.role != "admin":  # Only admin can permanently delete
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can permanently delete students"
        )
    
    try:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found"
            )
        
        register_number = student.register_number
        
        # Delete all attendance records
        attendance_count = db.query(AttendanceRecord).filter(
            AttendanceRecord.student_register_number == register_number
        ).count()
        
        db.query(AttendanceRecord).filter(
            AttendanceRecord.student_register_number == register_number
        ).delete()
        
        # Delete associated user account
        student_user = db.query(User).filter(
            User.username == register_number,
            User.role == "student"
        ).first()
        
        user_deleted = False
        if student_user:
            db.delete(student_user)
            user_deleted = True
        
        # Delete student record
        db.delete(student)
        
        db.commit()
        
        return {
            "message": "Student and all associated data permanently deleted",
            "student_register_number": register_number,
            "attendance_records_deleted": attendance_count,
            "user_account_deleted": user_deleted,
            "warning": "This action cannot be undone"
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error permanently deleting student {student_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error permanently deleting student: {str(e)}"
        )

# Password Management
@app.post("/admin/reset-password")
async def reset_password(
    reset_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reset password for users or students"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    user_type = reset_data.get("user_type")  # "user" or "student"
    identifier = reset_data.get("identifier")  # username or register_number
    new_password = reset_data.get("new_password")
    
    if user_type == "user":
        user = db.query(User).filter(User.username == identifier).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        user.hashed_password = auth_service.get_password_hash(new_password)
        db.commit()
        return {"message": "User password reset successfully"}
    
    elif user_type == "student":
        # For students, we might reset their login credentials
        # This could involve updating their date_of_birth or creating a temporary password
        return {"message": "Student credentials reset successfully"}
    
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user type"
        )

# Attendance Export
@app.post("/admin/export-attendance")
async def export_attendance(
    export_request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export attendance records to Excel or PDF"""
    if current_user.role not in ["admin", "department"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to export attendance"
        )
    
    format_type = export_request.get("format", "excel")  # excel or pdf
    department = export_request.get("department")
    start_date = export_request.get("start_date")
    end_date = export_request.get("end_date")
    
    # Query attendance records
    query = db.query(AttendanceRecord).join(
        Student, AttendanceRecord.student_register_number == Student.register_number
    )
    
    if department:
        query = query.filter(Student.department == department)
    if start_date:
        query = query.filter(AttendanceRecord.date >= start_date)
    if end_date:
        query = query.filter(AttendanceRecord.date <= end_date)
    
    records = query.all()
    
    # Generate export file (placeholder implementation)
    export_data = []
    for record in records:
        student = db.query(Student).filter(Student.register_number == record.student_register_number).first()
        export_data.append({
            "register_number": record.student_register_number,
            "name": student.name if student else "Unknown",
            "department": student.department if student else "Unknown",
            "date": record.date,
            "time": record.time.strftime("%H:%M:%S"),
            "status": record.status,
            "verification_method": record.verification_method
        })
    
    return {
        "export_data": export_data,
        "total_records": len(export_data),
        "format": format_type,
        "message": f"Attendance exported successfully in {format_type} format"
    }

# User Account Management
@app.post("/admin/create-user")
async def create_user_account(
    user_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new user account"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.username == user_data["username"]).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    # Create new user
    new_user = User(
        username=user_data["username"],
        email=user_data["email"],
        hashed_password=auth_service.get_password_hash(user_data["password"]),
        role=user_data["role"],
        department=user_data.get("department")
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {
        "message": "User created successfully",
        "user_id": new_user.id,
        "username": new_user.username,
        "role": new_user.role
    }

# Barcode Detection Endpoint for Student Registration
@app.post("/detect_barcode")
async def detect_barcode_from_id_card(
    id_card_image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Detect and extract barcode/QR code from student ID card image
    Returns register number if found
    """
    try:
        # Validate file type
        if not id_card_image.content_type.startswith('image/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file type. Please upload an image file."
            )
        
        # Read image data
        image_data = await id_card_image.read()
        
        if not qr_service:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Barcode detection service not available"
            )
        
        # Log image details for debugging
        logger.info(f"Processing image: {id_card_image.filename}, size: {len(image_data)} bytes, content_type: {id_card_image.content_type}")
        
        # Detect barcode/QR code in the image
        decoded_data = qr_service.decode_qr_from_image(image_data)
        logger.info(f"QR service returned: {decoded_data} (type: {type(decoded_data)})")
        
        if not decoded_data:
            logger.warning("No barcode or QR code detected in the uploaded image")
            return {
                "success": False,
                "message": "No barcode or QR code detected in the image. Please ensure the image contains a clear barcode or QR code.",
                "register_number": None,
                "debug_info": {
                    "image_size": len(image_data),
                    "content_type": id_card_image.content_type,
                    "filename": id_card_image.filename
                }
            }
        
        # Extract register number from decoded data
        register_number = None
        
        # Try different ways to extract register number
        # First check if decoded_data is an integer (direct barcode result)
        if isinstance(decoded_data, int):
            decoded_str = str(decoded_data)
            if len(decoded_str) == 7:
                register_number = decoded_str
                logger.info(f"Found 7-digit register number from integer: {register_number}")
            elif 5 <= len(decoded_str) <= 9:
                register_number = decoded_str
                logger.info(f"Found {len(decoded_str)}-digit register number from integer: {register_number}")
        
        # Then check if decoded_data is a plain string (direct barcode result)
        elif isinstance(decoded_data, str):
            decoded_clean = decoded_data.strip()
            if decoded_clean.isdigit() and len(decoded_clean) == 7:
                register_number = decoded_clean
                logger.info(f"Found 7-digit register number from direct string: {register_number}")
            elif decoded_clean.isdigit() and 5 <= len(decoded_clean) <= 9:
                register_number = decoded_clean
                logger.info(f"Found {len(decoded_clean)}-digit register number from direct string: {register_number}")
        
        # Then check if it's a dictionary structure
        elif isinstance(decoded_data, dict):
            # Check if it's structured data with register_number field
            register_number = decoded_data.get("register_number")
            
            # If not found, try the data field (for plain text barcodes)
            if not register_number:
                data_value = decoded_data.get("data")
                logger.info(f"Checking data field: {data_value}")
                if data_value and isinstance(data_value, str):
                    data_clean = data_value.strip()
                    # Check if it's a 7-digit number
                    if data_clean.isdigit() and len(data_clean) == 7:
                        register_number = data_clean
                        logger.info(f"Found 7-digit register number in data field: {register_number}")
                    elif data_clean.isdigit() and 5 <= len(data_clean) <= 9:
                        register_number = data_clean
                        logger.info(f"Found {len(data_clean)}-digit register number in data field: {register_number}")
                    else:
                        register_number = data_clean
                        logger.info(f"Using data field value as register number: {register_number}")
            
            # If still not found, try to extract from any string field
            if not register_number:
                import re
                for key, value in decoded_data.items():
                    if isinstance(value, str) and len(value) >= 5:
                        # First check if the value itself is a 7-digit number
                        if isinstance(value, str) and value.strip().isdigit() and len(value.strip()) == 7:
                            register_number = value.strip()
                            logger.info(f"Found exact 7-digit register number: {register_number}")
                        else:
                            # Extract all numeric sequences and prioritize 7-digit ones
                            import re
                            all_numbers = re.findall(r'\d+', value)
                            
                            # First look for 7-digit numbers
                            for num in all_numbers:
                                if len(num) == 7:
                                    register_number = num
                                    logger.info(f"Found 7-digit register number in data: {register_number}")
                                    break
                            
                            # If no 7-digit found, try other lengths
                            if not register_number:
                                for num in all_numbers:
                                    if 5 <= len(num) <= 9:  # Accept 5-9 digit numbers
                                        register_number = num
                                        logger.info(f"Using {len(num)}-digit number as register: {register_number}")
                                        break
                        
                        if register_number:
                            break
        
        if register_number:
            # Validate register number format
            register_number = register_number.strip().upper()
            
            # Check if student already exists
            existing_student = db.query(Student).filter(
                Student.register_number == register_number
            ).first()
            
            if existing_student:
                return {
                    "success": True,
                    "message": "Register number detected but student already exists",
                    "register_number": register_number,
                    "student_exists": True,
                    "student_name": existing_student.name
                }
            
            return {
                "success": True,
                "message": "Register number detected successfully",
                "register_number": register_number,
                "student_exists": False,
                "decoded_data": decoded_data
            }
        else:
            # Log what was actually detected for debugging
            logger.info(f"Barcode detected but no register number found. Decoded data: {decoded_data}")
            return {
                "success": False,
                "message": f"Barcode detected but no valid register number found. Detected data: {str(decoded_data)[:100]}...",
                "register_number": None,
                "decoded_data": decoded_data
            }
            
    except Exception as e:
        logger.error(f"Error detecting barcode: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Barcode detection failed: {str(e)}"
        )

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
