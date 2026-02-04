from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date

# Student Models
class StudentCreate(BaseModel):
    register_number: str
    name: str
    email: EmailStr
    phone: str
    department: str
    year: int
    section: str
    date_of_birth: Optional[date] = None
    parent_name: str
    parent_email: EmailStr
    parent_phone: str
    face_encoding: Optional[str] = None
    qr_code_data: Optional[str] = None

class StudentResponse(BaseModel):
    id: int
    register_number: str
    name: str
    email: str
    phone: str
    department: str
    year: int
    section: str
    date_of_birth: Optional[date] = None
    parent_name: str
    parent_email: str
    parent_phone: str
    face_encoding: Optional[str] = None
    qr_code_data: Optional[str] = None
    id_card_path: Optional[str] = None
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    parent_name: Optional[str] = None
    parent_email: Optional[EmailStr] = None
    parent_phone: Optional[str] = None
    is_active: Optional[bool] = None

# User Models
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str
    department: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    department: Optional[str]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    username: str
    password: str

# Attendance Models
class AttendanceRequest(BaseModel):
    register_number: Optional[str] = None  # For manual entry
    verification_method: str  # face_qr, face_only, manual

class AttendanceResponse(BaseModel):
    id: int
    student_register_number: str
    date: str
    time: datetime
    status: str
    verification_method: str
    face_confidence: Optional[float]
    qr_verified: bool
    verification_status: str
    notification_sent: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class AttendanceVerificationRequest(BaseModel):
    attendance_id: int
    action: str  # approve, reject
    notes: Optional[str] = None

# Face Recognition Models
class FaceEncodingRequest(BaseModel):
    register_number: str

class FaceVerificationRequest(BaseModel):
    register_number: Optional[str] = None

# QR Code Models
class QRVerificationRequest(BaseModel):
    qr_data: str

# Notification Models
class NotificationRequest(BaseModel):
    attendance_record_id: int
    recipient_type: str
    message_type: str

class NotificationResponse(BaseModel):
    id: int
    attendance_record_id: int
    recipient_type: str
    message_type: str
    delivery_status: str
    sent_at: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True

# Blockchain Models
class BlockchainTransactionRequest(BaseModel):
    attendance_record_id: int
    
class BlockchainTransactionResponse(BaseModel):
    id: int
    attendance_record_id: int
    transaction_id: str
    status: str
    created_at: datetime
    confirmed_at: Optional[datetime]
    
    class Config:
        from_attributes = True

# Dashboard Models
class AttendanceStats(BaseModel):
    total_students: int
    present_today: int
    late_today: int
    absent_today: int
    pending_verification: int

class DepartmentStats(BaseModel):
    department: str
    total_students: int
    attendance_percentage: float
    late_arrivals: int

# Token Models
class UserInfo(BaseModel):
    username: str
    email: str
    role: str
    department: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserInfo

class TokenData(BaseModel):
    username: Optional[str] = None

# Department Models
class DepartmentCreate(BaseModel):
    code: str
    name: str
    hod_name: Optional[str] = None
    hod_email: Optional[EmailStr] = None
    hod_phone: Optional[str] = None

class DepartmentResponse(BaseModel):
    id: int
    code: str
    name: str
    hod_name: Optional[str] = None
    hod_email: Optional[str] = None
    hod_phone: Optional[str] = None
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Enhanced Attendance Models
class AttendanceMarkRequest(BaseModel):
    register_number: Optional[str] = None
    verification_method: str  # face_qr, face_only, manual
    face_confidence: Optional[float] = None
    qr_verified: Optional[bool] = False
    manual_register_number: Optional[str] = None  # For forget ID case

class PendingVerificationResponse(BaseModel):
    id: int
    attendance_record_id: int
    student_register_number: str
    student_name: str
    date: str
    time: datetime
    face_confidence: Optional[float]
    manual_register_number: Optional[str]
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class VerificationAction(BaseModel):
    verification_id: int
    action: str  # approve, reject
    notes: Optional[str] = None

# Report Models
class AttendanceReportRequest(BaseModel):
    department: Optional[str] = None
    year: Optional[int] = None
    section: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    report_type: str = "daily"  # daily, weekly, monthly

class StudentAttendanceReport(BaseModel):
    register_number: str
    name: str
    department: str
    year: int
    section: str
    total_days: int
    present_days: int
    late_days: int
    absent_days: int
    attendance_percentage: float
    
class DepartmentAttendanceReport(BaseModel):
    department: str
    total_students: int
    present_today: int
    late_today: int
    absent_today: int
    pending_verifications: int
    attendance_percentage: float

# Analytics Models
class AttendanceAnalyticsResponse(BaseModel):
    student_register_number: str
    month: str
    attendance_percentage: float
    late_pattern_score: float
    absence_pattern_score: float
    prediction_risk: str
    
    class Config:
        from_attributes = True

class PredictiveInsights(BaseModel):
    at_risk_students: List[str]
    frequent_late_arrivals: List[str]
    attendance_trends: dict
    department_comparison: dict

# Notification Models
class NotificationRequest(BaseModel):
    attendance_record_id: int
    recipient_type: str  # parent, admin, department
    message_type: str  # attendance, late_arrival, pending_verification
    delivery_method: str = "email"  # email, sms, whatsapp

class NotificationResponse(BaseModel):
    id: int
    message_type: str
    recipient_type: str
    delivery_status: str
    delivery_method: str
    sent_at: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True

# Multi-role Login Models
class AdminLogin(BaseModel):
    username: str
    password: str

class DepartmentLogin(BaseModel):
    department_code: str
    password: str

class StudentLogin(BaseModel):
    register_number: str
    date_of_birth: date

class OperatorLogin(BaseModel):
    department_code: str
    password: str

# Blockchain Models
class BlockchainTransaction(BaseModel):
    attendance_record_id: int
    transaction_data: dict
    
class BlockchainResponse(BaseModel):
    id: int
    transaction_id: str
    block_hash: Optional[str]
    status: str
    created_at: datetime
    confirmed_at: Optional[datetime]
    
    class Config:
        from_attributes = True
