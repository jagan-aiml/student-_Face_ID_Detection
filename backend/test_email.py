"""
Test email sending functionality
"""
import sys
sys.path.append('.')

from services.notification_service import NotificationService
from database import SessionLocal, Student

def test_email():
    """Test sending email notification"""
    notification_service = NotificationService()
    
    print("=" * 80)
    print("📧 EMAIL CONFIGURATION TEST")
    print("=" * 80)
    print(f"SMTP Server: {notification_service.smtp_server}")
    print(f"SMTP Port: {notification_service.smtp_port}")
    print(f"Email User: {notification_service.email_user}")
    print(f"Password Set: {'Yes' if notification_service.email_password else 'No'}")
    print(f"Password Length: {len(notification_service.email_password) if notification_service.email_password else 0}")
    print("=" * 80)
    
    # Check if credentials are configured
    if not notification_service.email_user or not notification_service.email_password:
        print("❌ Email credentials not configured!")
        return
    
    # Test email send
    test_recipient = input("\nEnter test email address (or press Enter to skip): ").strip()
    
    if not test_recipient:
        print("Skipping email send test.")
        return
    
    print(f"\n📤 Sending test email to {test_recipient}...")
    
    subject = "Test Email - Attendance System"
    body = """
This is a test email from the Student Attendance System.

If you received this email, the email configuration is working correctly!

System: Real-Time Attendance Management
Date: 2025-11-04
    """
    
    success = notification_service.send_email(test_recipient, subject, body)
    
    if success:
        print("✅ Test email sent successfully!")
        print(f"   Check inbox: {test_recipient}")
    else:
        print("❌ Failed to send test email")
        print("   Check:")
        print("   1. Email credentials in .env file")
        print("   2. Gmail app password (16 chars, no spaces)")
        print("   3. 2-Step Verification enabled on Gmail")
        print("   4. SMTP settings correct")

if __name__ == "__main__":
    test_email()
