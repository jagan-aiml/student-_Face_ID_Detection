"""
Update parent emails for existing students.
The current students have their own email as parent email.
This script will update them with proper parent email addresses.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import SessionLocal, Student
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def update_parent_emails():
    """Update parent emails for all students"""
    db = SessionLocal()
    
    try:
        # Get all students
        students = db.query(Student).all()
        
        if not students:
            print("No students found in database!")
            return
        
        print("\n" + "="*60)
        print("UPDATING PARENT EMAIL ADDRESSES")
        print("="*60)
        
        # Update parent emails - you can customize these based on actual parent emails
        parent_email_map = {
            "2227047": "srivishnu.parent@gmail.com",  # Sri Vishnu's parent
            "2227050": "syedahamed.parent@gmail.com",  # Syed Ahamed's parent
            "2227021": "jaganja.378@gmail.com",  # Jagan N's parent - using your email for testing
        }
        
        for student in students:
            old_parent_email = student.parent_email
            
            # Check if we have a mapping for this student
            if student.register_number in parent_email_map:
                new_parent_email = parent_email_map[student.register_number]
                
                # Update parent email
                student.parent_email = new_parent_email
                
                print(f"✅ Updated {student.name} ({student.register_number}):")
                print(f"   Old parent email: {old_parent_email}")
                print(f"   New parent email: {new_parent_email}")
            else:
                # For any other students, update with a pattern
                # You can customize this pattern
                if "@saec.ac.in" in student.parent_email:
                    # Replace student email with parent email pattern
                    new_parent_email = f"{student.register_number}.parent@gmail.com"
                    student.parent_email = new_parent_email
                    
                    print(f"✅ Updated {student.name} ({student.register_number}):")
                    print(f"   Old parent email: {old_parent_email}")
                    print(f"   New parent email: {new_parent_email}")
                else:
                    print(f"ℹ️ {student.name} ({student.register_number}): Keeping existing parent email: {student.parent_email}")
        
        # Commit changes
        db.commit()
        print("\n✅ Parent emails updated successfully!")
        
        print("\n" + "="*60)
        print("VERIFICATION - Current Parent Emails:")
        print("="*60)
        
        # Show updated parent emails
        students = db.query(Student).all()
        for student in students:
            print(f"• {student.name} ({student.register_number}): {student.parent_email}")
        
    except Exception as e:
        print(f"❌ Error updating parent emails: {str(e)}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

def main():
    print("\n" + "="*60)
    print("PARENT EMAIL UPDATE TOOL")
    print("="*60)
    
    print("\n⚠️  This will update parent email addresses in the database.")
    print("\nCurrent mapping:")
    print("• 2227047 (Sri Vishnu) → srivishnu.parent@gmail.com")
    print("• 2227050 (Syed Ahamed) → syedahamed.parent@gmail.com")
    print("• 2227021 (Jagan N) → jaganja.378@gmail.com (your email for testing)")
    
    print("\nDo you want to proceed? (y/n): ", end="")
    if input().lower() == 'y':
        update_parent_emails()
    else:
        print("Operation cancelled.")

if __name__ == "__main__":
    main()
