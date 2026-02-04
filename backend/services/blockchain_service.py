import json
import hashlib
import time
from datetime import datetime
from typing import Dict, Optional, List
from sqlalchemy.orm import Session
from backend.database import AttendanceRecord, Student, BlockchainTransaction
import logging
import uuid
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BlockchainService:
    def __init__(self):
        self.network_url = os.getenv("BLOCKCHAIN_NETWORK_URL", "http://localhost:7051")
        self.channel_name = os.getenv("BLOCKCHAIN_CHANNEL_NAME", "attendancechannel")
        self.chaincode_name = os.getenv("BLOCKCHAIN_CHAINCODE_NAME", "attendance-chaincode")
        
        # For this implementation, we'll create a simplified blockchain simulation
        # In production, this would connect to actual Hyperledger Fabric network
        
    def create_attendance_transaction(
        self, 
        attendance_record_id: int, 
        db: Session
    ) -> Dict:
        """
        Create blockchain transaction for attendance record
        Returns transaction details
        """
        try:
            # Get attendance record and student details
            attendance = db.query(AttendanceRecord).filter(
                AttendanceRecord.id == attendance_record_id
            ).first()
            
            if not attendance:
                return {"status": "error", "message": "Attendance record not found"}
            
            student = db.query(Student).filter(
                Student.register_number == attendance.student_register_number
            ).first()
            
            if not student:
                return {"status": "error", "message": "Student not found"}
            
            # Create transaction data
            transaction_data = {
                "type": "attendance_record",
                "version": "1.0",
                "timestamp": int(time.time()),
                "attendance": {
                    "record_id": attendance.id,
                    "student_register_number": attendance.student_register_number,
                    "student_name": student.name,
                    "department": student.department,
                    "date": attendance.date,
                    "time": attendance.time.isoformat(),
                    "status": attendance.status,
                    "verification_method": attendance.verification_method,
                    "face_confidence": attendance.face_confidence,
                    "qr_verified": attendance.qr_verified,
                    "verification_status": attendance.verification_status,
                    "verified_by": attendance.verified_by
                },
                "integrity": {
                    "face_encoding_hash": self._hash_face_encoding(student.face_encoding) if student.face_encoding else None,
                    "qr_data_hash": self._hash_data(student.qr_code_data) if student.qr_code_data else None
                }
            }
            
            # Generate transaction ID
            transaction_id = str(uuid.uuid4())
            
            # Calculate transaction hash
            transaction_hash = self._calculate_transaction_hash(transaction_data, transaction_id)
            
            # Simulate blockchain submission (in production, this would call Fabric SDK)
            blockchain_result = self._submit_to_blockchain(transaction_id, transaction_data, transaction_hash)
            
            # Create blockchain transaction record
            blockchain_transaction = BlockchainTransaction(
                attendance_record_id=attendance_record_id,
                transaction_id=transaction_id,
                block_hash=blockchain_result.get("block_hash"),
                transaction_data=json.dumps(transaction_data),
                status=blockchain_result.get("status", "pending")
            )
            
            if blockchain_result.get("status") == "confirmed":
                blockchain_transaction.confirmed_at = datetime.utcnow()
            
            db.add(blockchain_transaction)
            
            # Update attendance record with blockchain info
            attendance.blockchain_hash = transaction_hash
            attendance.blockchain_status = blockchain_result.get("status", "pending")
            
            db.commit()
            
            logger.info(f"Blockchain transaction created: {transaction_id}")
            
            return {
                "status": "success",
                "transaction_id": transaction_id,
                "transaction_hash": transaction_hash,
                "blockchain_status": blockchain_result.get("status"),
                "block_hash": blockchain_result.get("block_hash"),
                "message": "Attendance record stored on blockchain"
            }
            
        except Exception as e:
            logger.error(f"Error creating blockchain transaction: {str(e)}")
            db.rollback()
            return {
                "status": "error",
                "message": f"Failed to create blockchain transaction: {str(e)}"
            }
    
    def verify_attendance_integrity(
        self, 
        attendance_record_id: int, 
        db: Session
    ) -> Dict:
        """
        Verify attendance record integrity using blockchain
        """
        try:
            # Get blockchain transaction
            blockchain_tx = db.query(BlockchainTransaction).filter(
                BlockchainTransaction.attendance_record_id == attendance_record_id
            ).first()
            
            if not blockchain_tx:
                return {
                    "status": "error",
                    "message": "No blockchain transaction found for this attendance record"
                }
            
            # Get current attendance record
            attendance = db.query(AttendanceRecord).filter(
                AttendanceRecord.id == attendance_record_id
            ).first()
            
            if not attendance:
                return {"status": "error", "message": "Attendance record not found"}
            
            # Parse stored blockchain data
            stored_data = json.loads(blockchain_tx.transaction_data)
            
            # Verify data integrity
            integrity_checks = []
            
            # Check basic fields
            if stored_data["attendance"]["student_register_number"] == attendance.student_register_number:
                integrity_checks.append({"field": "register_number", "status": "valid"})
            else:
                integrity_checks.append({"field": "register_number", "status": "tampered"})
            
            if stored_data["attendance"]["date"] == attendance.date:
                integrity_checks.append({"field": "date", "status": "valid"})
            else:
                integrity_checks.append({"field": "date", "status": "tampered"})
            
            if stored_data["attendance"]["status"] == attendance.status:
                integrity_checks.append({"field": "status", "status": "valid"})
            else:
                integrity_checks.append({"field": "status", "status": "tampered"})
            
            # Calculate integrity score
            valid_checks = sum(1 for check in integrity_checks if check["status"] == "valid")
            integrity_score = (valid_checks / len(integrity_checks)) * 100 if integrity_checks else 0
            
            # Verify transaction hash
            recalculated_hash = self._calculate_transaction_hash(
                stored_data, 
                blockchain_tx.transaction_id
            )
            
            hash_valid = recalculated_hash == attendance.blockchain_hash
            
            return {
                "status": "success",
                "transaction_id": blockchain_tx.transaction_id,
                "blockchain_status": blockchain_tx.status,
                "integrity_score": integrity_score,
                "hash_valid": hash_valid,
                "integrity_checks": integrity_checks,
                "verified_at": datetime.utcnow().isoformat(),
                "message": "Integrity verification completed"
            }
            
        except Exception as e:
            logger.error(f"Error verifying attendance integrity: {str(e)}")
            return {
                "status": "error",
                "message": f"Failed to verify integrity: {str(e)}"
            }
    
    def get_blockchain_audit_trail(
        self, 
        student_register_number: str, 
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        db: Session = None
    ) -> List[Dict]:
        """
        Get blockchain audit trail for a student
        """
        try:
            # Build query
            query = db.query(AttendanceRecord, BlockchainTransaction).join(
                BlockchainTransaction,
                AttendanceRecord.id == BlockchainTransaction.attendance_record_id
            ).filter(
                AttendanceRecord.student_register_number == student_register_number
            )
            
            if start_date:
                query = query.filter(AttendanceRecord.date >= start_date)
            
            if end_date:
                query = query.filter(AttendanceRecord.date <= end_date)
            
            results = query.order_by(AttendanceRecord.date.desc()).all()
            
            audit_trail = []
            for attendance, blockchain_tx in results:
                audit_trail.append({
                    "attendance_id": attendance.id,
                    "date": attendance.date,
                    "time": attendance.time.isoformat(),
                    "status": attendance.status,
                    "verification_method": attendance.verification_method,
                    "blockchain": {
                        "transaction_id": blockchain_tx.transaction_id,
                        "transaction_hash": attendance.blockchain_hash,
                        "block_hash": blockchain_tx.block_hash,
                        "status": blockchain_tx.status,
                        "created_at": blockchain_tx.created_at.isoformat(),
                        "confirmed_at": blockchain_tx.confirmed_at.isoformat() if blockchain_tx.confirmed_at else None
                    }
                })
            
            return audit_trail
            
        except Exception as e:
            logger.error(f"Error getting blockchain audit trail: {str(e)}")
            return []
    
    def _hash_face_encoding(self, face_encoding: str) -> str:
        """Create hash of face encoding for integrity verification"""
        try:
            return hashlib.sha256(face_encoding.encode()).hexdigest()
        except Exception:
            return None
    
    def _hash_data(self, data: str) -> str:
        """Create hash of any data"""
        try:
            return hashlib.sha256(data.encode()).hexdigest()
        except Exception:
            return None
    
    def _calculate_transaction_hash(self, transaction_data: Dict, transaction_id: str) -> str:
        """Calculate hash for transaction"""
        try:
            # Create a deterministic string from transaction data
            data_string = json.dumps(transaction_data, sort_keys=True, separators=(',', ':'))
            combined_data = f"{transaction_id}{data_string}"
            
            # Calculate SHA-256 hash
            return hashlib.sha256(combined_data.encode()).hexdigest()
            
        except Exception as e:
            logger.error(f"Error calculating transaction hash: {str(e)}")
            return ""
    
    def _submit_to_blockchain(
        self, 
        transaction_id: str, 
        transaction_data: Dict, 
        transaction_hash: str
    ) -> Dict:
        """
        Submit transaction to blockchain network
        This in production, would use Hyperledger Fabric SDK
        """
        try:
            
            # In production, this would:
            # 1. Connect to Fabric peer
            # 2. Submit transaction to chaincode
            # 3. Wait for confirmation
            # 4. Return block hash and confirmation
            
            # Generate simulated block hash
            block_data = f"{transaction_id}{transaction_hash}{int(time.time())}"
            block_hash = hashlib.sha256(block_data.encode()).hexdigest()
            
            # Simulate network confirmation (in real implementation, this would be async)
            return {
                "status": "confirmed",
                "block_hash": block_hash,
                "confirmation_time": datetime.utcnow().isoformat(),
                "network_response": "Transaction submitted successfully"
            }
            
        except Exception as e:
            logger.error(f"Error submitting to blockchain: {str(e)}")
            return {
                "status": "failed",
                "error": str(e)
            }
    
    def get_blockchain_stats(self, db: Session) -> Dict:
        """Get blockchain statistics"""
        try:
            total_transactions = db.query(BlockchainTransaction).count()
            confirmed_transactions = db.query(BlockchainTransaction).filter(
                BlockchainTransaction.status == "confirmed"
            ).count()
            pending_transactions = db.query(BlockchainTransaction).filter(
                BlockchainTransaction.status == "pending"
            ).count()
            failed_transactions = db.query(BlockchainTransaction).filter(
                BlockchainTransaction.status == "failed"
            ).count()
            
            return {
                "total_transactions": total_transactions,
                "confirmed": confirmed_transactions,
                "pending": pending_transactions,
                "failed": failed_transactions,
                "success_rate": round((confirmed_transactions / total_transactions * 100), 2) if total_transactions > 0 else 0
            }
            
        except Exception as e:
            logger.error(f"Error getting blockchain stats: {str(e)}")
            return {
                "total_transactions": 0,
                "confirmed": 0,
                "pending": 0,
                "failed": 0,
                "success_rate": 0
            }
