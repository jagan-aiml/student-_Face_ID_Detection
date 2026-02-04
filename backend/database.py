from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Text, Float, ForeignKey, Date
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Database configuration
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./attendance_system.db")
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Student(Base):
    __tablename__ = "students"
    
    id = Column(Integer, primary_key=True, index=True)
    register_number = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    department = Column(String, nullable=False)
    year = Column(Integer, nullable=False)
    section = Column(String, nullable=False)
    
    # Parent contact information
    parent_name = Column(String, nullable=False)
    parent_email = Column(String, nullable=False)
    parent_phone = Column(String, nullable=False)
    
    # Additional student info
    date_of_birth = Column(Date, nullable=True)
    
    # Biometric data
    face_encoding = Column(Text, nullable=True)  # Stored as JSON string
    qr_code_data = Column(String, nullable=True)
    id_card_path = Column(String, nullable=True)  # Path to uploaded ID card
    
    # Account status
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)  # admin, department, operator, student
    department = Column(String, nullable=True)  # For department users
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    
    id = Column(Integer, primary_key=True, index=True)
    student_register_number = Column(String, nullable=False, index=True)
    date = Column(String, nullable=False, index=True)  # YYYY-MM-DD format
    time = Column(DateTime, nullable=False)
    
    # Attendance status: Present, Late, Pending
    status = Column(String, nullable=False)
    
    # Verification method: face_qr, face_only, manual
    verification_method = Column(String, nullable=False)
    
    # Face recognition confidence score
    face_confidence = Column(Float, nullable=True)
    
    # QR/ID verification status
    qr_verified = Column(Boolean, default=False)
    
    # Blockchain transaction details
    blockchain_hash = Column(String, nullable=True)
    blockchain_status = Column(String, default="pending")  # pending, confirmed, failed
    
    # Verification workflow
    verification_status = Column(String, default="verified")  # verified, pending, rejected
    verified_by = Column(String, nullable=True)  # Username of verifier
    verification_notes = Column(Text, nullable=True)
    
    # Notification status
    notification_sent = Column(Boolean, default=False)
    notification_type = Column(String, nullable=True)  # email, sms, both
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class BlockchainTransaction(Base):
    __tablename__ = "blockchain_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    attendance_record_id = Column(Integer, nullable=False)
    transaction_id = Column(String, unique=True, nullable=False)
    block_hash = Column(String, nullable=True)
    transaction_data = Column(Text, nullable=False)  # JSON data
    status = Column(String, default="pending")  # pending, confirmed, failed
    created_at = Column(DateTime, default=datetime.utcnow)
    confirmed_at = Column(DateTime, nullable=True)

class Department(Base):
    __tablename__ = "departments"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False)  # CS, IT, ECE, ME, AIML
    name = Column(String, nullable=False)
    hod_name = Column(String, nullable=True)
    hod_email = Column(String, nullable=True)
    hod_phone = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class PendingVerification(Base):
    __tablename__ = "pending_verifications"
    
    id = Column(Integer, primary_key=True, index=True)
    attendance_record_id = Column(Integer, ForeignKey("attendance_records.id"), nullable=False)
    student_register_number = Column(String, nullable=False)
    student_name = Column(String, nullable=False)
    date = Column(String, nullable=False)
    time = Column(DateTime, nullable=False)
    face_confidence = Column(Float, nullable=True)
    manual_register_number = Column(String, nullable=True)  # Manually entered RegNo
    status = Column(String, default="pending")  # pending, approved, rejected
    reviewed_by = Column(String, nullable=True)  # Department user who reviewed
    review_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AttendanceAnalytics(Base):
    __tablename__ = "attendance_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    student_register_number = Column(String, nullable=False)
    month = Column(String, nullable=False)  # YYYY-MM format
    total_days = Column(Integer, default=0)
    present_days = Column(Integer, default=0)
    late_days = Column(Integer, default=0)
    absent_days = Column(Integer, default=0)
    attendance_percentage = Column(Float, default=0.0)
    late_pattern_score = Column(Float, default=0.0)  # Risk score for frequent lateness
    absence_pattern_score = Column(Float, default=0.0)  # Risk score for frequent absence
    prediction_risk = Column(String, default="low")  # low, medium, high
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    attendance_record_id = Column(Integer, nullable=False)
    recipient_type = Column(String, nullable=False)  # parent, admin, department
    recipient_email = Column(String, nullable=True)
    recipient_phone = Column(String, nullable=True)
    message_type = Column(String, nullable=False)  # attendance, late_arrival, pending_verification
    message_content = Column(Text, nullable=False)
    delivery_status = Column(String, default="pending")  # pending, sent, failed
    delivery_method = Column(String, nullable=False)  # email, sms, whatsapp
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# Create all tables
def create_tables():
    Base.metadata.create_all(bind=engine)

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
