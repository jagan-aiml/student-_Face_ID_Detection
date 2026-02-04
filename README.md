# 🎯 Real-Time Attendance Management System - PRODUCTION READY

**⚠️ IMPORTANT: This is a PRODUCTION system with NO test/dummy data**

A comprehensive attendance management system with **Face Recognition + QR/Barcode verification** backed by **blockchain** for immutable records and integrated with **notification services** for parents and administrators.

## 🚀 Features
### **Core Technologies**
- **Face Recognition**: OpenCV + DeepFace (Python)
- **QR/Barcode Detection**: OpenCV QRCodeDetector + pyzbar
- **Database**: SQLite (attendance logs, user details, states)
- **Blockchain**: Hyperledger Fabric simulation (immutable attendance transactions)
- **Notification System**: SMTP (Email) + Twilio API (SMS alerts)
- **Backend**: FastAPI (Python, REST API)
- **Frontend**: React.js (role-based dashboards)

### **Three Attendance Scenarios**

#### 1. **Direct Attendance** (Before 8:45 AM)
- Student scans Face + QR ID
- If both match and time < 8:45 AM → mark as **Present**
- Record stored in SQLite + Blockchain transaction
- Trigger email/SMS notification to parent

#### 2. **Late Attendance** (After 8:45 AM)
- Student scans Face + QR ID after cutoff
- Mark as **Late** (still present)
- Log into SQLite + Blockchain
- Notify parent about late arrival

#### 3. **Forgot ID Case**
- Student has no ID → manual entry of Register Number
- System runs Face Recognition for verification
- If matched → attendance marked as **Pending Verification**
- Department dashboard shows "Pending Verification" for admin approval

### **Role-Based Access Control**

#### **Admin** (`admin/password`)
- Complete system administration
- User management and system settings
- System-wide analytics and reports
- Blockchain audit trails

#### **Department** (`CS/password`, `IT/password`, etc.)
- Department management + scanner operations
- **Attendance Scanner** (face + ID verification)
- Pending verifications (approve/reject)
- Student registration (6-step wizard with ID card barcode detection)
- Department reports and analytics

#### **Student** (`20CS001/student123`)
- Personal attendance tracking
- Attendance history with blockchain verification
- Notification preferences

## 📁 Project Structure

```
attendance-system/
├── backend/                    # FastAPI Backend
│   ├── main.py                # Main FastAPI application
│   ├── database.py            # SQLAlchemy models & database
│   ├── models.py              # Pydantic models
│   ├── auth.py                # Authentication service
│   ├── init_system.py         # System initialization
│   └── services/              # Core services
│       ├── attendance_service.py      # Attendance logic
│       ├── face_recognition_service.py # Face recognition
│       ├── qr_service.py             # QR/Barcode detection
│       ├── notification_service.py   # Email/SMS notifications
│       └── blockchain_service.py     # Blockchain integration
├── frontend/                  # React Frontend
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   │   └── Layout/        # Navigation layout
│   │   ├── pages/            # Role-based pages
│   │   │   ├── Login/        # Authentication
│   │   │   ├── Admin/        # Admin dashboard & settings
│   │   │   ├── Department/   # Department management
│   │   │   ├── Student/      # Student dashboard
│   │   │   ├── Analytics/    # System analytics
│   │   │   └── Reports/      # Report generation
│   │   └── contexts/         # React contexts
│   │       └── AuthContext.js # Authentication context
│   ├── public/
│   └── package.json
├── requirements.txt          # Python dependencies
├── .env                     # Environment configuration
└── README.md               # This file
```

## 🛠️ Setup & Installation

### **Prerequisites**
- Python 3.8+
- Node.js 14+
- npm or yarn
- Webcam access for face recognition

### **1. Clone Repository**
```bash
git clone <repository-url>
cd attendance-system
```

### **2. Backend Setup**
```bash
# Install Python dependencies
pip install -r requirements.txt

# Initialize the system
python backend/init_system.py

# Start FastAPI server
cd backend
python -m uvicorn main:app --reload --port 8000
```

### **3. Frontend Setup**
```bash
# Install dependencies
cd frontend
npm install

# Start React development server
npm start
```

### **4. Access the System**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🔐 Default Credentials

### **System Administrator**
- **Username**: `admin`
- **Password**: `password`
- **Access**: Complete system management

### **Department Users**
- **Username**: `CS`, `IT`, `ECE`, `ME`
- **Password**: `password`
- **Access**: Department management + attendance scanner

### **Student Users**
- **Username**: `20CS001`, `20IT001`, `20ECE001`
- **Password**: `student123`
- **Access**: Personal attendance tracking

## ⚙️ Configuration

### **Environment Variables** (`.env`)
```bash
# Database
DATABASE_URL=sqlite:///./attendance_system.db

# JWT Authentication
SECRET_KEY=your-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Email Configuration (SMTP)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com

# Twilio Configuration (SMS)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number

# Attendance Settings
ATTENDANCE_CUTOFF_TIME=08:45
FACE_RECOGNITION_THRESHOLD=0.4
```

## 🎯 Usage Workflow

### **Student Registration**
1. **Admin/Department** → Student Registration
2. **5-Step Process**:
   - Basic Information (name, register number, department)
   - Parent/Guardian Details (contact information)
   - Face Registration (webcam capture + encoding)
   - QR Code Generation (unique student ID)
   - Complete Registration (blockchain record)

### **Daily Attendance**
1. **Department User** → Attendance Scanner
2. **Three Modes Available**:
   - **Face + QR Mode**: Complete verification
   - **Face Only Mode**: Requires verification
   - **Manual Mode**: Emergency entry
3. **Automatic Processing**:
   - Face recognition with confidence scoring
   - QR code validation
   - Time-based status determination
   - Blockchain transaction creation
   - Parent notification dispatch

### **Verification Workflow**
1. **Department User** → Pending Verifications
2. **Review Records**: Face-only scans requiring approval
3. **Action Options**: Approve → Present/Late, Reject → Absent
4. **Blockchain Update**: Verified records stored immutably

### **Analytics & Reports**
1. **Real-time Dashboards**: Live attendance statistics
2. **Comprehensive Reports**: Daily, weekly, monthly summaries
3. **Export Options**: PDF, Excel, CSV formats
4. **Blockchain Audit**: Tamper-proof verification trail

## 🔒 Security Features

### **Biometric Security**
- **Face Recognition**: DeepFace with VGG-Face model
- **Confidence Scoring**: Adjustable threshold (default: 0.4)
- **Anti-Spoofing**: Live detection requirements
- **Encrypted Storage**: Face embeddings securely stored

### **ID Verification**
- **QR Code Validation**: Structured data verification
- **Barcode Support**: Multiple format compatibility
- **Cross-Verification**: Face + ID dual validation
- **Tamper Detection**: Invalid ID recognition

### **Blockchain Integration**
- **Immutable Records**: Attendance cannot be altered
- **Transaction Hashing**: SHA-256 verification
- **Audit Trail**: Complete history tracking
- **Integrity Verification**: Blockchain validation API

### **Authentication & Authorization**
- **JWT Tokens**: Secure session management
- **Role-Based Access**: Granular permissions
- **Session Timeout**: Configurable expiration
- **Password Security**: Bcrypt hashing

## 📊 API Endpoints

### **Authentication**
- `POST /login` - User authentication
- `POST /token` - OAuth2 token generation

### **Student Management**
- `POST /register_student` - Register new student
- `POST /students/{register_number}/face-encoding` - Store face data
- `POST /students/{register_number}/qr-code` - Generate QR code

### **Attendance Operations**
- `POST /mark_attendance` - Mark attendance (all scenarios)
- `GET /pending_list` - Get pending verifications
- `POST /verify_pending` - Approve/reject attendance

### **Analytics & Reports**
- `GET /attendance/stats` - Current statistics
- `GET /students/{register_number}/attendance` - Student history
- `GET /blockchain/audit/{register_number}` - Blockchain trail

### **Notifications**
- `POST /notify_parent` - Send parent notification
- `GET /notifications/history` - Notification history

## 🚀 Advanced Features

### **Blockchain Integration**
- **Hyperledger Fabric**: Enterprise blockchain platform
- **Smart Contracts**: Automated verification logic
- **Consensus Mechanism**: Multi-node validation
- **Immutable Ledger**: Tamper-proof attendance records

### **AI/ML Components**
- **Face Recognition**: Deep learning models
- **Confidence Scoring**: Probabilistic matching
- **Pattern Recognition**: Attendance trend analysis
- **Predictive Analytics**: Early warning systems

### **Notification System**
- **Multi-Channel**: Email + SMS delivery
- **Template Engine**: Customizable messages
- **Delivery Tracking**: Status monitoring
- **Escalation Rules**: Automated alerts

### **Mobile Integration** (Future)
- **React Native**: Cross-platform mobile app
- **Push Notifications**: Real-time alerts
- **Offline Capability**: Local data sync
- **Camera Integration**: Mobile face scanning

## 🔧 Troubleshooting

### **Common Issues**

#### **Face Recognition Not Working**
- Ensure webcam permissions are granted
- Check lighting conditions
- Verify OpenCV installation
- Adjust confidence threshold in settings

#### **QR Code Scanning Issues**
- Use clear, high-contrast QR images
- Ensure proper QR code format
- Check camera focus and stability
- Verify QR code is not damaged

#### **Notification Failures**
- Verify SMTP/Twilio credentials in `.env`
- Check internet connectivity
- Validate email addresses and phone numbers
- Review firewall settings

#### **Blockchain Errors**
- Ensure blockchain network is running
- Check network connectivity
- Verify transaction permissions
- Monitor blockchain node status

## 📈 Performance Optimization

### **Database Optimization**
- Index on frequently queried fields
- Regular database maintenance
- Query optimization for large datasets
- Connection pooling configuration

### **Face Recognition Optimization**
- GPU acceleration for large deployments
- Model optimization for speed vs accuracy
- Batch processing for multiple faces
- Caching frequently accessed embeddings

### **Frontend Performance**
- Code splitting for faster loading
- Image optimization and compression
- Lazy loading for large components
- Browser caching strategies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🆕 New Features

### **Automated Barcode Detection for Student Registration**
- **ID Card Upload**: Upload student ID card image during registration
- **Automatic Register Number Detection**: System automatically detects and extracts register number from barcode/QR code on ID card
- **Smart Pattern Recognition**: Supports various barcode formats and register number patterns (e.g., 20CS001, 21IT045)
- **Auto-Fill Functionality**: Detected register number automatically fills the registration form
- **Duplicate Detection**: System checks if student already exists before registration
- **Fallback Support**: Manual entry option if barcode detection fails

### **Enhanced Registration Workflow**
1. **ID Card Upload** - Upload and scan student ID card
2. **Basic Information** - Auto-filled register number + manual details
3. **Parent/Guardian Details** - Contact information
4. **Face Registration** - Biometric capture
5. **QR Code Generation** - System-generated QR for attendance
6. **Complete Registration** - Final confirmation and blockchain storage

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review API documentation at `/docs`

---

**Built with ❤️ for modern educational institutions**

*Secure • Reliable • Blockchain-Verified • AI-Powered*
