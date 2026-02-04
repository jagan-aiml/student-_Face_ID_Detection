"""
Check if student has face encoding and registration status
"""
import sys
sys.path.append('.')

from database import SessionLocal, Student

def check_student(register_number):
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.register_number == register_number).first()
        
        if not student:
            print(f"❌ Student {register_number} NOT FOUND in database")
            print("\n📝 Action needed: Register student via Admin/Department Dashboard")
            return
        
        print(f"✅ Student found: {student.name}")
        print(f"   Register Number: {student.register_number}")
        print(f"   Department: {student.department}")
        print(f"   Email: {student.email}")
        print(f"   Parent Email: {student.parent_email or 'Not set'}")
        
        if student.face_encoding:
            print(f"\n✅ Face encoding: PRESENT (length: {len(student.face_encoding)})")
            print("   Student is ready for attendance scanning!")
        else:
            print(f"\n❌ Face encoding: MISSING")
            print("\n📝 Action needed:")
            print("   1. Go to Admin/Department Dashboard")
            print("   2. Navigate to Student Registration or Edit Student")
            print("   3. Upload face photo for this student")
            print("   4. System will generate and store face encoding")
            
    finally:
        db.close()

if __name__ == "__main__":
    register_number = input("Enter student register number (e.g., 2227021): ").strip()
    check_student(register_number)
