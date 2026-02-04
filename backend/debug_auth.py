#!/usr/bin/env python3
"""
Debug authentication issues - check user accounts and password hashes
"""

import sys
import os

# Add parent directory to path to import backend modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import SessionLocal, User, Department
from passlib.context import CryptContext

def debug_authentication():
    """Debug authentication issues"""
    db = SessionLocal()
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    try:
        print("🔍 AUTHENTICATION DEBUG")
        print("=" * 50)
        
        # List all users
        users = db.query(User).all()
        print(f"\n📋 Total users in database: {len(users)}")
        
        for user in users:
            print(f"\n👤 User: {user.username}")
            print(f"   Role: {user.role}")
            print(f"   Email: {user.email}")
            print(f"   Department: {user.department}")
            print(f"   Active: {user.is_active}")
            print(f"   Password Hash: {user.hashed_password[:50]}..." if user.hashed_password else "   Password Hash: None")
        
        # List all departments
        departments = db.query(Department).all()
        print(f"\n🏛️  Total departments in database: {len(departments)}")
        
        for dept in departments:
            print(f"\n🏢 Department: {dept.code}")
            print(f"   Name: {dept.name}")
            print(f"   Active: {dept.is_active}")
            
            # Check if corresponding user exists
            dept_user = db.query(User).filter(
                User.username == dept.code,
                User.role == "department"
            ).first()
            
            if dept_user:
                print(f"   ✅ User account exists: {dept_user.username}")
                print(f"   User active: {dept_user.is_active}")
            else:
                print(f"   ❌ No user account found for department {dept.code}")
        
        # Test authentication for department users
        print(f"\n🔐 TESTING DEPARTMENT AUTHENTICATION")
        print("=" * 50)
        
        dept_users = db.query(User).filter(User.role == "department").all()
        
        for user in dept_users:
            print(f"\n🧪 Testing authentication for: {user.username}")
            
            # Check password verification directly
            if user.hashed_password:
                test_passwords = ["password", "123456", user.username]
                for test_password in test_passwords:
                    is_valid = pwd_context.verify(test_password, user.hashed_password)
                    print(f"   Direct verify '{test_password}': {'✅ VALID' if is_valid else '❌ INVALID'}")
                    if is_valid:
                        print(f"   🎯 FOUND WORKING PASSWORD: {test_password}")
            else:
                print(f"   ⚠️  No password hash found!")
        
        # Check if there are any users without proper password hashes
        print(f"\n🚨 CHECKING FOR ISSUES")
        print("=" * 50)
        
        users_no_password = db.query(User).filter(
            (User.hashed_password == None) | (User.hashed_password == "")
        ).all()
        
        if users_no_password:
            print(f"⚠️  Found {len(users_no_password)} users without password hashes:")
            for user in users_no_password:
                print(f"   - {user.username} ({user.role})")
        else:
            print("✅ All users have password hashes")
        
        # Check for inactive users
        inactive_users = db.query(User).filter(User.is_active == False).all()
        if inactive_users:
            print(f"⚠️  Found {len(inactive_users)} inactive users:")
            for user in inactive_users:
                print(f"   - {user.username} ({user.role})")
        else:
            print("✅ All users are active")
            
    except Exception as e:
        print(f"❌ Error during debug: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

def test_password_creation():
    """Test password hashing"""
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    print(f"\n🧪 TESTING PASSWORD HASHING")
    print("=" * 50)
    
    test_password = "password"
    hashed = pwd_context.hash(test_password)
    
    print(f"Original password: {test_password}")
    print(f"Hashed password: {hashed}")
    
    # Test verification
    is_valid = pwd_context.verify(test_password, hashed)
    print(f"Verification result: {'✅ VALID' if is_valid else '❌ INVALID'}")
    
    # Test with wrong password
    is_invalid = pwd_context.verify("wrongpassword", hashed)
    print(f"Wrong password test: {'❌ SHOULD BE INVALID' if is_invalid else '✅ CORRECTLY INVALID'}")

if __name__ == "__main__":
    print("🎯 ATTENDANCE SYSTEM - AUTHENTICATION DEBUGGER")
    print("=" * 60)
    
    debug_authentication()
    test_password_creation()
    
    print(f"\n" + "=" * 60)
    print("🏁 Debug completed!")
