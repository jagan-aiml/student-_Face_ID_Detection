#!/usr/bin/env python3
"""
Fix department user passwords - set them to 'password'
"""

import sys
import os

# Add parent directory to path to import backend modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import SessionLocal, User
from passlib.context import CryptContext

def fix_department_passwords():
    """Fix department user passwords"""
    db = SessionLocal()
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    try:
        print("🔧 FIXING DEPARTMENT PASSWORDS")
        print("=" * 50)
        
        # Get all department users
        dept_users = db.query(User).filter(User.role == "department").all()
        
        if not dept_users:
            print("❌ No department users found!")
            return
        
        # Set password to 'password' for all department users
        new_password = "password"
        new_hash = pwd_context.hash(new_password)
        
        for user in dept_users:
            print(f"\n🔧 Updating password for department: {user.username}")
            print(f"   Email: {user.email}")
            print(f"   Old hash: {user.hashed_password[:50]}..." if user.hashed_password else "   Old hash: None")
            
            # Update password
            user.hashed_password = new_hash
            
            print(f"   New hash: {new_hash[:50]}...")
            print(f"   ✅ Password updated to: {new_password}")
        
        # Commit changes
        db.commit()
        print(f"\n✅ Successfully updated passwords for {len(dept_users)} department users")
        print(f"🔑 All department users can now login with password: {new_password}")
        
        # Test the new passwords
        print(f"\n🧪 TESTING NEW PASSWORDS")
        print("=" * 30)
        
        for user in dept_users:
            is_valid = pwd_context.verify(new_password, user.hashed_password)
            print(f"   {user.username}: {'✅ VALID' if is_valid else '❌ INVALID'}")
            
    except Exception as e:
        print(f"❌ Error fixing passwords: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    print("🎯 DEPARTMENT PASSWORD FIXER")
    print("=" * 40)
    
    fix_department_passwords()
    
    print(f"\n" + "=" * 40)
    print("🏁 Password fix completed!")
    print("💡 You can now login with:")
    print("   - Department AIML: AIML/password")
    print("   - Department CSE: CSE/password")
