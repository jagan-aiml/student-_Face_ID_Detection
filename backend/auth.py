from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from backend.database import get_db, User, Student, Department
from backend.models import TokenData
import os

# Security configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class AuthService:
    def __init__(self):
        self.secret_key = SECRET_KEY
        self.algorithm = ALGORITHM
        self.access_token_expire_minutes = ACCESS_TOKEN_EXPIRE_MINUTES
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """Get password hash"""
        return pwd_context.hash(password)
    
    def get_user(self, db: Session, username: str) -> Optional[User]:
        """Get user by username"""
        return db.query(User).filter(User.username == username).first()
    
    def authenticate_user(self, username: str, password: str, db: Session) -> Optional[dict]:
        """General user authentication - determines role and authenticates accordingly"""
        user = self.get_user(db, username)
        if not user:
            return None
        
        if not self.verify_password(password, user.hashed_password):
            return None
        
        return self._create_token_response(user)
    
    def authenticate_admin(self, username: str, password: str, db: Session) -> Optional[dict]:
        """Authenticate admin user"""
        user = self.get_user(db, username)
        
        if not user or user.role != "admin":
            return None
        
        if not self.verify_password(password, user.hashed_password):
            return None
        
        if not user.is_active:
            return None
        
        # Create access token
        access_token_expires = timedelta(minutes=self.access_token_expire_minutes)
        access_token = self.create_access_token(
            data={"sub": user.username}, expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "department": user.department
            }
        }
    
    def authenticate_department(self, department_code: str, password: str, db: Session) -> Optional[dict]:
        """Authenticate department user"""
        user = self.get_user(db, department_code)
        
        if not user or user.role != "department":
            return None
        
        if not self.verify_password(password, user.hashed_password):
            return None
        
        if not user.is_active:
            return None
        
        return self._create_token_response(user)
    
    def authenticate_operator(self, department_code: str, password: str, db: Session) -> Optional[dict]:
        """Authenticate operator user (same as department for now)"""
        user = self.get_user(db, department_code)
        
        if not user or user.role not in ["department", "operator"]:
            return None
        
        if not self.verify_password(password, user.hashed_password):
            return None
        
        if not user.is_active:
            return None
        
        return self._create_token_response(user)
    
    def authenticate_student(self, register_number: str, date_of_birth: str, db: Session) -> Optional[dict]:
        """Authenticate student using register number and date of birth"""
        # First check if user account exists
        user = self.get_user(db, register_number)
        
        if not user or user.role != "student":
            return None
        
        if not user.is_active:
            return None
        
        # Check student record for date of birth verification
        student = db.query(Student).filter(Student.register_number == register_number).first()
        
        if not student:
            return None
        
        # Verify date of birth (convert string to date for comparison)
        try:
            from datetime import datetime
            input_dob = datetime.strptime(date_of_birth, "%Y-%m-%d").date()
            if student.date_of_birth != input_dob:
                return None
        except (ValueError, AttributeError):
            return None
        
        return self._create_token_response(user)
    
    def _create_token_response(self, user: User) -> dict:
        """Create standardized token response"""
        access_token_expires = timedelta(minutes=self.access_token_expire_minutes)
        access_token = self.create_access_token(
            data={"sub": user.username}, expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "department": user.department
            }
        }
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        """Create JWT access token"""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=15)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        
        return encoded_jwt
    
    def create_user(
        self, 
        username: str, 
        email: str, 
        password: str, 
        role: str, 
        department: Optional[str] = None,
        db: Session = None
    ) -> User:
        """Create new user"""
        hashed_password = self.get_password_hash(password)
        
        user = User(
            username=username,
            email=email,
            hashed_password=hashed_password,
            role=role,
            department=department
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        return user

# Auth dependency functions
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        
        if username is None:
            raise credentials_exception
        
        token_data = TokenData(username=username)
        
    except JWTError:
        raise credentials_exception
    
    auth_service = AuthService()
    user = auth_service.get_user(db, username=token_data.username)
    
    if user is None:
        raise credentials_exception
    
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    return current_user

def require_role(required_roles: list):
    """Decorator to require specific roles"""
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted"
            )
        return current_user
    
    return role_checker

def initialize_default_users(db: Session):
    """Initialize only essential admin user for real-time system"""
    auth_service = AuthService()
    
    # Check if admin user exists
    admin_user = auth_service.get_user(db, "admin")
    if not admin_user:
        auth_service.create_user(
            username="admin",
            email="admin@attendance.system",
            password="admin123",
            role="admin",
            db=db
        )
        print("✅ Admin user created: admin/admin123")
        print("📋 System ready for real-time data entry")
    else:
        print("ℹ️  Admin user already exists")
    
    db.commit()
    print("🎯 Real-time system initialization completed - No dummy data created")
