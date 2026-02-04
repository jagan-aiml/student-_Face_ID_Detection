#!/usr/bin/env python3
"""
Interactive Database Cleanup Tool
Allows selective deletion of data with confirmation prompts
"""

import sys
from database import SessionLocal, Student, AttendanceRecord, Department, User, PendingVerification, Notification, BlockchainTransaction

def show_menu():
    """Display the main menu options"""
    print("\n" + "="*60)
    print("🗑️  DATABASE CLEANUP TOOL")
    print("="*60)
    print("Choose what to delete:")
    print()
    print("1. 📊 Delete Attendance Records Only")
    print("2. 🎓 Delete Students Only (keeps attendance history)")
    print("3. 🏛️  Delete Departments Only (keeps students)")
    print("4. 👥 Delete Non-Admin Users Only")
    print("5. 🔔 Delete Notifications Only")
    print("6. ⏳ Delete Pending Verifications Only")
    print("7. ⛓️  Delete Blockchain Transactions Only")
    print("8. 🧹 Delete Students + Their Attendance")
    print("9. 🏢 Delete Departments + Their Students + Attendance")
    print("10. 💥 NUCLEAR OPTION: Delete Everything (except admin)")
    print("11. 📋 Show Database Statistics")
    print("0. ❌ Exit")
    print("="*60)

def get_database_stats():
    """Get current database statistics"""
    db = SessionLocal()
    try:
        stats = {
            'students': db.query(Student).count(),
            'attendance': db.query(AttendanceRecord).count(),
            'departments': db.query(Department).count(),
            'users': db.query(User).count(),
            'admin_users': db.query(User).filter(User.role == 'admin').count(),
            'dept_users': db.query(User).filter(User.role == 'department').count(),
            'student_users': db.query(User).filter(User.role == 'student').count(),
            'notifications': db.query(Notification).count(),
            'pending': db.query(PendingVerification).count(),
            'blockchain': db.query(BlockchainTransaction).count()
        }
        return stats
    finally:
        db.close()

def show_database_stats():
    """Display current database statistics"""
    stats = get_database_stats()
    print("\n📊 CURRENT DATABASE STATISTICS:")
    print("="*40)
    print(f"🎓 Students: {stats['students']}")
    print(f"📊 Attendance Records: {stats['attendance']}")
    print(f"🏛️  Departments: {stats['departments']}")
    print(f"👥 Total Users: {stats['users']}")
    print(f"   - Admin Users: {stats['admin_users']}")
    print(f"   - Department Users: {stats['dept_users']}")
    print(f"   - Student Users: {stats['student_users']}")
    print(f"🔔 Notifications: {stats['notifications']}")
    print(f"⏳ Pending Verifications: {stats['pending']}")
    print(f"⛓️  Blockchain Transactions: {stats['blockchain']}")
    print("="*40)

def confirm_action(action_description):
    """Get user confirmation for destructive actions"""
    print(f"\n⚠️  WARNING: {action_description}")
    print("This action cannot be undone!")
    
    while True:
        choice = input("\nAre you sure? (yes/no): ").lower().strip()
        if choice in ['yes', 'y']:
            return True
        elif choice in ['no', 'n']:
            return False
        else:
            print("Please enter 'yes' or 'no'")

def delete_attendance_only():
    """Delete only attendance records"""
    if not confirm_action("Delete ALL attendance records"):
        return
    
    db = SessionLocal()
    try:
        deleted = db.query(AttendanceRecord).delete()
        db.commit()
        print(f"✅ Deleted {deleted} attendance records")
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

def delete_students_only():
    """Delete only student records (keeps attendance history)"""
    if not confirm_action("Delete ALL student records (attendance history will remain)"):
        return
    
    db = SessionLocal()
    try:
        # Delete student user accounts
        deleted_student_users = db.query(User).filter(User.role == 'student').delete()
        
        # Delete student records
        deleted_students = db.query(Student).delete()
        
        db.commit()
        print(f"✅ Deleted {deleted_students} students and {deleted_student_users} student user accounts")
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

def delete_departments_only():
    """Delete only department records (keeps students)"""
    if not confirm_action("Delete ALL departments (students will remain but lose department association)"):
        return
    
    db = SessionLocal()
    try:
        # Delete department user accounts
        deleted_dept_users = db.query(User).filter(User.role == 'department').delete()
        
        # Delete department records
        deleted_departments = db.query(Department).delete()
        
        db.commit()
        print(f"✅ Deleted {deleted_departments} departments and {deleted_dept_users} department user accounts")
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

def delete_non_admin_users():
    """Delete all users except admin"""
    if not confirm_action("Delete ALL non-admin user accounts"):
        return
    
    db = SessionLocal()
    try:
        deleted_users = db.query(User).filter(User.username != "admin").delete()
        db.commit()
        print(f"✅ Deleted {deleted_users} non-admin users")
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

def delete_notifications_only():
    """Delete only notifications"""
    if not confirm_action("Delete ALL notifications"):
        return
    
    db = SessionLocal()
    try:
        deleted = db.query(Notification).delete()
        db.commit()
        print(f"✅ Deleted {deleted} notifications")
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

def delete_pending_verifications():
    """Delete only pending verifications"""
    if not confirm_action("Delete ALL pending verifications"):
        return
    
    db = SessionLocal()
    try:
        deleted = db.query(PendingVerification).delete()
        db.commit()
        print(f"✅ Deleted {deleted} pending verifications")
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

def delete_blockchain_transactions():
    """Delete only blockchain transactions"""
    if not confirm_action("Delete ALL blockchain transactions"):
        return
    
    db = SessionLocal()
    try:
        deleted = db.query(BlockchainTransaction).delete()
        db.commit()
        print(f"✅ Deleted {deleted} blockchain transactions")
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

def delete_students_and_attendance():
    """Delete students and their attendance records"""
    if not confirm_action("Delete ALL students AND their attendance records"):
        return
    
    db = SessionLocal()
    try:
        # Delete attendance records
        deleted_attendance = db.query(AttendanceRecord).delete()
        
        # Delete student user accounts
        deleted_student_users = db.query(User).filter(User.role == 'student').delete()
        
        # Delete students
        deleted_students = db.query(Student).delete()
        
        db.commit()
        print(f"✅ Deleted {deleted_students} students, {deleted_attendance} attendance records, and {deleted_student_users} student accounts")
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

def delete_departments_students_attendance():
    """Delete departments, their students, and all attendance"""
    if not confirm_action("Delete ALL departments, students, and attendance records"):
        return
    
    db = SessionLocal()
    try:
        # Delete attendance records
        deleted_attendance = db.query(AttendanceRecord).delete()
        
        # Delete student user accounts
        deleted_student_users = db.query(User).filter(User.role == 'student').delete()
        
        # Delete students
        deleted_students = db.query(Student).delete()
        
        # Delete department user accounts
        deleted_dept_users = db.query(User).filter(User.role == 'department').delete()
        
        # Delete departments
        deleted_departments = db.query(Department).delete()
        
        db.commit()
        print(f"✅ Deleted {deleted_departments} departments, {deleted_students} students, {deleted_attendance} attendance records")
        print(f"   and {deleted_dept_users + deleted_student_users} user accounts")
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

def nuclear_option():
    """Delete everything except admin user"""
    print("\n💥 NUCLEAR OPTION - DELETE EVERYTHING")
    print("This will delete ALL data except the admin user!")
    
    if not confirm_action("DELETE EVERYTHING (attendance, students, departments, notifications, etc.)"):
        return
    
    # Double confirmation for nuclear option
    print("\n🚨 FINAL WARNING: This will completely wipe the database!")
    if not confirm_action("Are you ABSOLUTELY SURE you want to delete everything?"):
        return
    
    db = SessionLocal()
    try:
        # Delete in order to avoid foreign key constraints
        deleted_blockchain = db.query(BlockchainTransaction).delete()
        deleted_notifications = db.query(Notification).delete()
        deleted_pending = db.query(PendingVerification).delete()
        deleted_attendance = db.query(AttendanceRecord).delete()
        deleted_students = db.query(Student).delete()
        deleted_departments = db.query(Department).delete()
        deleted_users = db.query(User).filter(User.username != "admin").delete()
        
        db.commit()
        
        print("\n💥 NUCLEAR CLEANUP COMPLETED!")
        print(f"✅ Deleted {deleted_attendance} attendance records")
        print(f"✅ Deleted {deleted_students} students")
        print(f"✅ Deleted {deleted_departments} departments")
        print(f"✅ Deleted {deleted_users} non-admin users")
        print(f"✅ Deleted {deleted_notifications} notifications")
        print(f"✅ Deleted {deleted_pending} pending verifications")
        print(f"✅ Deleted {deleted_blockchain} blockchain transactions")
        print("\n🎯 Database is now clean - Only admin user remains")
        
    except Exception as e:
        print(f"❌ Error during nuclear cleanup: {e}")
        db.rollback()
    finally:
        db.close()

def main():
    """Main interactive loop"""
    print("🎯 ATTENDANCE SYSTEM - DATABASE CLEANUP TOOL")
    print("=" * 60)
    
    while True:
        show_menu()
        
        try:
            choice = input("\nEnter your choice (0-11): ").strip()
            
            if choice == '0':
                print("\n👋 Goodbye!")
                sys.exit(0)
            elif choice == '1':
                delete_attendance_only()
            elif choice == '2':
                delete_students_only()
            elif choice == '3':
                delete_departments_only()
            elif choice == '4':
                delete_non_admin_users()
            elif choice == '5':
                delete_notifications_only()
            elif choice == '6':
                delete_pending_verifications()
            elif choice == '7':
                delete_blockchain_transactions()
            elif choice == '8':
                delete_students_and_attendance()
            elif choice == '9':
                delete_departments_students_attendance()
            elif choice == '10':
                nuclear_option()
            elif choice == '11':
                show_database_stats()
            else:
                print("❌ Invalid choice. Please enter a number between 0-11.")
                
        except KeyboardInterrupt:
            print("\n\n👋 Interrupted by user. Goodbye!")
            sys.exit(0)
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
        
        # Pause before showing menu again
        input("\nPress Enter to continue...")

if __name__ == "__main__":
    main()
