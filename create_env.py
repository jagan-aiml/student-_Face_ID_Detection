"""
Script to create .env file with proper UTF-8 encoding
"""

env_content = """# Face Recognition & Liveness Detection
USE_SIAMESE_NETWORK=true
ENABLE_LIVENESS_DETECTION=true
LIVENESS_THRESHOLD=0.35
SIAMESE_THRESHOLD=0.4

# Email Configuration
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=jaganja.378@gmail.com
EMAIL_PASSWORD=cnzbrnccsnwmnwdr
FROM_EMAIL=jaganja.378@gmail.com

# Database
DATABASE_URL=sqlite:///./attendance.db

# JWT Authentication
SECRET_KEY=your-secret-key-change-in-production-123456
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# System Settings
DEBUG=True
ENVIRONMENT=development
"""

# Write .env file with UTF-8 encoding
with open('.env', 'w', encoding='utf-8') as f:
    f.write(env_content)

print("✅ .env file created successfully with UTF-8 encoding!")
print("\n📝 Content:")
print(env_content)
print("\n⚠️  Remember to update EMAIL_PASSWORD with your actual Gmail app password!")
