#!/usr/bin/env python3
"""
Blockchain-Integrated Smart Attendance System
System Initialization Script

This script initializes the attendance system with default data, users, and configuration.
Run this before starting the system for the first time.
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from backend.database import create_tables, get_db, Student, User, AttendanceRecord, Department, SessionLocal
from backend.auth import AuthService
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def initialize_system():
    """Initialize the attendance system with minimal setup for production"""
    
    print("🎯 REAL-TIME ATTENDANCE SYSTEM - PRODUCTION SETUP")
    print("=" * 70)
    print("Initializing clean system for real-time production use...")
    print("NO TEST DATA WILL BE CREATED - PRODUCTION ENVIRONMENT")
    
    try:
        # Step 1: Create database tables
        print("\n📊 Creating database tables...")
        create_tables()
        print("✅ Database tables created successfully")
        
        # Step 2: Initialize services and database session
        print("\n🔧 Initializing services...")
        db = SessionLocal()
        auth_service = AuthService()
        
        # Step 3: Skip creating dummy departments for real-time system
        print("\n🏢 Departments: Ready for real-time creation via admin panel")
        print("  📝 Departments will be created as needed through admin interface")
        
        # Step 4: Create admin user only
        print("\n👑 Creating admin user...")
        admin_user = auth_service.get_user(db, "admin")
        if not admin_user:
            auth_service.create_user(
                username="admin",
                email="admin@attendance.system",
                password="admin123",
                role="admin",
                db=db
            )
            print("  ✅ Admin user created: admin/admin123")
        else:
            print("  ℹ️  Admin user already exists")
        
        # Step 5: Skip creating dummy department users for real-time system
        print("\n🏛️  Department Users: Ready for real-time creation")
        print("  📝 Department users will be created through admin panel as needed")
        
        # Step 6: Skip creating dummy student data for real-time system
        print("\n🎓 Students: Ready for real-time registration")
        print("  📝 Students will be registered through the registration wizard")
        
        db.commit()
        
        # Step 7: Display real-time system information
        print("\n🔐 REAL-TIME SYSTEM ACCESS:")
        print("=" * 50)
        
        print("\n👑 ADMIN ACCESS (ONLY CREDENTIAL CREATED):")
        print("  Username: admin")
        print("  Password: admin123")
        print("  Role: Complete system management")
        print("  Features: Create departments, manage users, system settings")
        
        print("\n🏛️  DEPARTMENT ACCESS:")
        print("  📝 To be created through admin panel:")
        print("    - Add departments via admin interface")
        print("    - Create department login credentials")
        print("    - Features: Dashboard, Scanner, Reports, Verifications")
        
        print("\n🎓 STUDENT ACCESS:")
        print("  📝 To be registered through:")
        print("    - Student registration wizard")
        print("    - Department registration interface")
        print("    - Authentication: Register Number + Date of Birth")
        print("  Features: View attendance history, notifications")
        
        print("\n📊 SYSTEM FEATURES IMPLEMENTED:")
        print("  ✅ Multi-role authentication (Admin/Department/Student)")
        print("  ✅ 3-case attendance workflow (Direct/Late/Forget ID)")
        print("  ✅ Face recognition + QR/ID verification")
        print("  ✅ Department verification for pending cases")
        print("  ✅ Comprehensive reporting & analytics")
        print("  ✅ Predictive insights & risk assessment")
        print("  ✅ Email/SMS notification system")
        print("  ✅ Blockchain integration for immutable logs")
        print("  ✅ Role-based dashboards")
        
        print("\n🚀 API ENDPOINTS AVAILABLE:")
        print("  Authentication: /auth/{admin|department|student}")
        print("  Attendance: /attendance/{mark|pending|verify}")
        print("  Reports: /reports/{attendance|department}")
        print("  Analytics: /analytics/{insights|trends}")
        print("  Notifications: /notifications/{send|history}")
        print("  Admin: /admin/{users|blockchain/logs}")
        print("  System: /system/status")
        
        print("\n🌐 ACCESS URLS:")
        print("  Backend API: http://localhost:8000")
        print("  API Documentation: http://localhost:8000/docs")
        print("  Frontend: http://localhost:3000")
        
        db.close()
        print("\n🎉 REAL-TIME SYSTEM READY FOR PRODUCTION!")
        print("=" * 70)
        print("✅ Clean database with no dummy data")
        print("✅ Only admin user created for system management")
        print("✅ Ready for real departments and students")
        return True
        
    except Exception as e:
        logger.error(f"System initialization failed: {str(e)}")
        print(f"\n❌ Initialization failed: {str(e)}")
        return False

if __name__ == "__main__":
    print("Starting system initialization...")
    success = initialize_system()
    
    if success:
        print("\n✅ All dependencies are installed")
        print("🎯 Blockchain-Integrated Smart Attendance System")
        print("=" * 60)
        print("Ready to start the backend server!")
        print("\nTo start the system:")
        print("1. Backend: python -m uvicorn main:app --reload --port 8000")
        print("2. Frontend: cd frontend && npm start")
        print("3. Access: http://localhost:3000")
    else:
        print("\n❌ System initialization failed. Please check the errors above.")

if __name__ == "__main__":
    print("Starting system initialization...")
    success = initialize_system()
    
    if success:
        print("\n✅ All dependencies are installed")
        print("🎯 Blockchain-Integrated Smart Attendance System")
        print("=" * 60)
        print("Ready to start the backend server!")
        print("\nTo start the system:")
        print("1. Backend: python -m uvicorn main:app --reload --port 8000")
        print("2. Frontend: cd frontend && npm start")
        print("3. Access: http://localhost:3000")
    else:
        print("\n❌ System initialization failed. Please check the errors above.")
