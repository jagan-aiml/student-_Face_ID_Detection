import cv2
import numpy as np
import json
import base64
from deepface import DeepFace
from typing import Optional, Tuple, List
import os
from sqlalchemy.orm import Session
from backend.database import Student
import logging
from .siamese_network import siamese_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FaceRecognitionService:
    def __init__(self):
        self.model_name = os.getenv("FACE_MODEL", "VGG-Face")
        self.threshold = float(os.getenv("FACE_RECOGNITION_THRESHOLD", "0.4"))
        self.use_siamese = os.getenv("USE_SIAMESE_NETWORK", "true").lower() == "true"
        self.enable_liveness = os.getenv("ENABLE_LIVENESS_DETECTION", "true").lower() == "true"
        
    def encode_face(self, image_data: bytes) -> Optional[str]:
        """
        Extract face encoding from image data
        Returns base64 encoded face embedding
        """
        try:
            # Use Siamese network if enabled
            if self.use_siamese:
                logger.info("Using Siamese network for face encoding")
                return siamese_service.encode_face(image_data)
            
            # Fallback to DeepFace
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                logger.error("Failed to decode image")
                return None
            
            # Convert BGR to RGB for face_recognition
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Get face embeddings using DeepFace
            embedding = DeepFace.represent(
                img_path=rgb_image,
                model_name='Facenet',
                enforce_detection=False
            )
            
            if embedding and len(embedding) > 0:
                # Convert to list for JSON serialization
                embedding_list = embedding[0]["embedding"]
                
                # Convert to JSON string for storage
                import json
                embedding_str = json.dumps(embedding_list)
                
                logger.info("Face encoding extracted successfully using DeepFace")
                return embedding_str
            else:
                logger.warning("No face embeddings found in image")
                return None
            
        except Exception as e:
            logger.error(f"Error extracting face encoding: {str(e)}")
            return None
    def verify_face(self, image_data: bytes, stored_encoding: str, threshold: float = 0.5) -> Tuple[bool, float]:
        """
        Verify if the face in the image matches the stored encoding
        Returns (is_match, confidence_score)
        Lower threshold for better detection in various conditions
        """
        try:
            # Use Siamese network if enabled
            if self.use_siamese:
                logger.info("Using Siamese network for face verification")
                return siamese_service.verify_face(image_data, stored_encoding)
            
            # Fallback to original implementation
            # Extract face encoding from the new image
            new_encoding = self.encode_face(image_data)
            
            if not new_encoding:
                logger.warning("No face found in verification image")
                return False, 0.0
            
            # Convert stored encoding from string to numpy array
            try:
                if isinstance(stored_encoding, str):
                    # Try JSON parsing first, then eval as fallback
                    try:
                        import json
                        stored_array = np.array(json.loads(stored_encoding))
                    except:
                        # Fallback to eval for legacy encodings
                        stored_array = np.array(eval(stored_encoding))
                else:
                    stored_array = np.array(stored_encoding)
            except Exception as e:
                logger.error(f"Failed to parse stored encoding: {str(e)}")
                return False, 0.0
            
            # Calculate similarity
            similarity = self.cosine_similarity(
                np.array(new_encoding),
                stored_array
            )
            
            # Determine if it's a match (lowered threshold for better detection)
            is_match = similarity >= threshold
            confidence = similarity
            
            logger.info(f"Face verification (DeepFace) - Confidence: {confidence:.3f}, Match: {is_match}, Threshold: {threshold}")
            return is_match, confidence
            
        except Exception as e:
            logger.error(f"Error verifying face: {str(e)}")
            return False, 0.0
    
    def detect_face(self, image_data: bytes) -> Optional[dict]:
        """
        Detect if a face is present in the image
        Returns face detection info if found, None otherwise
        """
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                logger.error("Failed to decode image for face detection")
                return None
            
            # Convert to grayscale for face detection
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Use OpenCV's face cascade for detection
            face_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            )
            
            faces = face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.05,  # More sensitive detection
                minNeighbors=3,    # Less strict requirement
                minSize=(50, 50)   # Larger minimum face size
            )
            
            if len(faces) > 0:
                # Face detected
                x, y, w, h = faces[0]  # Take the first face
                return {
                    "detected": True,
                    "confidence": 0.95,  # OpenCV cascade doesn't give confidence
                    "box": {"x": int(x), "y": int(y), "width": int(w), "height": int(h)},
                    "faces_count": len(faces)
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error detecting face: {str(e)}")
            return None
    
    def cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        """Calculate cosine similarity between two vectors"""
        try:
            dot_product = np.dot(a, b)
            norm_a = np.linalg.norm(a)
            norm_b = np.linalg.norm(b)
            
            if norm_a == 0 or norm_b == 0:
                return 0.0
            
            similarity = dot_product / (norm_a * norm_b)
            return float(similarity)
            
        except Exception as e:
            logger.error(f"Error calculating cosine similarity: {str(e)}")
            return 0.0
    
    def find_matching_student(self, image_data: bytes, db: Session) -> Optional[Tuple[Student, float]]:
        """
        Find student with matching face encoding
        Returns (student, confidence_score) or None
        """
        try:
            # Get all active students with face encodings
            students = db.query(Student).filter(
                Student.is_active == True,
                Student.face_encoding.isnot(None)
            ).all()
            
            best_match = None
            highest_confidence = 0.0
            
            for student in students:
                is_match, confidence = self.verify_face(image_data, student.face_encoding)
                
                if is_match and confidence > highest_confidence:
                    highest_confidence = confidence
                    best_match = student
            
            if best_match:
                logger.info(f"Found matching student: {best_match.register_number} with confidence: {highest_confidence:.3f}")
                return best_match, highest_confidence
            
            return None
            
        except Exception as e:
            logger.error(f"Error finding matching student: {str(e)}")
            return None
    
    def detect_faces(self, image_data: bytes) -> List[dict]:
        """
        Detect faces in image and return bounding boxes
        Returns list of face dictionaries with coordinates
        """
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return []
            
            # Load face cascade classifier
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            
            # Convert to grayscale for detection
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Detect faces
            faces = face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.05,  # More sensitive detection
                minNeighbors=3,    # Less strict requirement
                minSize=(50, 50)   # Larger minimum face size
            )
            
            face_list = []
            for (x, y, w, h) in faces:
                face_list.append({
                    'x': int(x),
                    'y': int(y),
                    'width': int(w),
                    'height': int(h),
                    'confidence': 1.0  # Placeholder confidence
                })
            
            logger.info(f"Detected {len(face_list)} faces in image")
            return face_list
            
        except Exception as e:
            logger.error(f"Error detecting faces: {str(e)}")
            return []
    
    def store_face_encoding(self, register_number: str, image_data: bytes, db: Session) -> bool:
        """
        Store face encoding for a student
        """
        try:
            # Find student
            student = db.query(Student).filter(
                Student.register_number == register_number
            ).first()
            
            if not student:
                logger.error(f"Student not found: {register_number}")
                return False
            
            # Extract face encoding
            encoding = self.encode_face(image_data)
            if not encoding:
                logger.error("Failed to extract face encoding")
                return False
            
            # Update student record
            student.face_encoding = encoding
            db.commit()
            
            logger.info(f"Face encoding stored for student: {register_number}")
            return True
            
        except Exception as e:
            logger.error(f"Error storing face encoding: {str(e)}")
            db.rollback()
            return False
    
    def verify_face_with_liveness(self, image_data: bytes, stored_encoding: str) -> Tuple[bool, float, bool]:
        """
        Verify face with liveness detection
        Returns (is_match, confidence_score, is_live)
        """
        try:
            if self.use_siamese and self.enable_liveness:
                logger.info("Using Siamese network with liveness detection")
                return siamese_service.verify_face_with_liveness(image_data, stored_encoding, check_liveness=True)
            else:
                # Use regular verification without liveness
                is_match, confidence = self.verify_face(image_data, stored_encoding)
                return is_match, confidence, True  # Assume live if liveness check is disabled
        except Exception as e:
            logger.error(f"Error in face verification with liveness: {str(e)}")
            return False, 0.0, False
    
    def check_liveness(self, image_data: bytes) -> Tuple[bool, float]:
        """
        Check if the face is from a live person
        Returns (is_live, confidence_score)
        """
        try:
            if self.use_siamese and self.enable_liveness:
                return siamese_service.check_liveness(image_data)
            else:
                # If liveness detection is not enabled, always return true
                return True, 1.0
        except Exception as e:
            logger.error(f"Error checking liveness: {str(e)}")
            return True, 1.0  # Default to live to avoid blocking
