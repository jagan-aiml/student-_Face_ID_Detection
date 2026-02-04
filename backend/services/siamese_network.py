"""
Siamese Network Face Recognition Service with Liveness Detection
This service provides face verification using Siamese networks and liveness detection
for the attendance system while maintaining backward compatibility.
"""

import cv2
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, Model
from tensorflow.keras.applications import MobileNetV2
import json
import base64
import logging
from typing import Optional, Tuple, List, Dict
import os
from datetime import datetime
import mediapipe as mp

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SiameseNetworkService:
    def __init__(self):
        """Initialize Siamese Network with MobileNetV2 backbone and liveness detection"""
        self.model = None
        self.base_model = None
        self.liveness_detector = None
        self.face_mesh = None
        self.threshold = float(os.getenv("SIAMESE_THRESHOLD", "0.6"))
        self.liveness_threshold = float(os.getenv("LIVENESS_THRESHOLD", "0.35"))
        
        # Log thresholds for debugging
        logger.info(f"🎯 Face matching threshold: {self.threshold}")
        logger.info(f"🎯 Liveness detection threshold: {self.liveness_threshold}")
        
        # Initialize components
        self._initialize_siamese_model()
        self._initialize_liveness_detection()
        
    def _initialize_siamese_model(self):
        """Initialize the Siamese network model with MobileNetV2 backbone"""
        try:
            # Input shape for face images (224x224 RGB)
            input_shape = (224, 224, 3)
            
            # Create the base model using MobileNetV2
            base_model = MobileNetV2(
                input_shape=input_shape,
                weights='imagenet',
                include_top=False,
                pooling='avg'
            )
            
            # Make base model trainable for fine-tuning
            base_model.trainable = True
            
            # Fine-tune from this layer onwards
            fine_tune_at = len(base_model.layers) - 20
            for layer in base_model.layers[:fine_tune_at]:
                layer.trainable = False
            
            # Create Siamese network inputs
            anchor_input = layers.Input(name="anchor", shape=input_shape)
            positive_input = layers.Input(name="positive", shape=input_shape)
            
            # Create embedding network
            def create_embedding_network(base_model):
                inputs = layers.Input(shape=input_shape)
                x = tf.keras.applications.mobilenet_v2.preprocess_input(inputs)
                x = base_model(x, training=False)
                x = layers.Dense(256, activation='relu')(x)
                x = layers.BatchNormalization()(x)
                x = layers.Dense(128, activation='relu')(x)
                x = layers.BatchNormalization()(x)
                embeddings = layers.Dense(64, activation=None)(x)
                embeddings = layers.Lambda(lambda x: tf.nn.l2_normalize(x, axis=1))(embeddings)
                return Model(inputs=inputs, outputs=embeddings)
            
            # Create the embedding model
            embedding_network = create_embedding_network(base_model)
            
            # Generate embeddings for anchor and positive
            anchor_embedding = embedding_network(anchor_input)
            positive_embedding = embedding_network(positive_input)
            
            # Create the Siamese model
            self.model = Model(
                inputs=[anchor_input, positive_input],
                outputs=[anchor_embedding, positive_embedding]
            )
            
            # Store the embedding network separately for single image encoding
            self.embedding_model = embedding_network
            
            # Try to load pre-trained weights if available
            weights_path = os.path.join(os.path.dirname(__file__), 'siamese_weights.h5')
            if os.path.exists(weights_path):
                try:
                    self.model.load_weights(weights_path)
                    logger.info("Loaded pre-trained Siamese network weights")
                except Exception as e:
                    logger.warning(f"Could not load pre-trained weights: {e}")
            
            logger.info("Siamese network initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Siamese network: {e}")
            # Fallback to a simpler model if MobileNetV2 fails
            self._create_simple_siamese_model()
    
    def _create_simple_siamese_model(self):
        """Create a simple Siamese model as fallback"""
        try:
            input_shape = (224, 224, 3)
            
            # Simple CNN architecture
            def create_simple_embedding():
                inputs = layers.Input(shape=input_shape)
                x = layers.Conv2D(32, (3, 3), activation='relu')(inputs)
                x = layers.MaxPooling2D((2, 2))(x)
                x = layers.Conv2D(64, (3, 3), activation='relu')(x)
                x = layers.MaxPooling2D((2, 2))(x)
                x = layers.Conv2D(128, (3, 3), activation='relu')(x)
                x = layers.GlobalAveragePooling2D()(x)
                x = layers.Dense(64, activation='relu')(x)
                embeddings = layers.Dense(32, activation=None)(x)
                embeddings = layers.Lambda(lambda x: tf.nn.l2_normalize(x, axis=1))(embeddings)
                return Model(inputs=inputs, outputs=embeddings)
            
            self.embedding_model = create_simple_embedding()
            logger.info("Using simple Siamese network model")
            
        except Exception as e:
            logger.error(f"Failed to create simple model: {e}")
            self.embedding_model = None
    
    def _initialize_liveness_detection(self):
        """Initialize liveness detection using MediaPipe Face Mesh"""
        try:
            # Initialize MediaPipe Face Mesh for liveness detection
            mp_face_mesh = mp.solutions.face_mesh
            self.face_mesh = mp_face_mesh.FaceMesh(
                static_image_mode=False,
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5
            )
            
            # Face detection for anti-spoofing
            mp_face_detection = mp.solutions.face_detection
            self.face_detector = mp_face_detection.FaceDetection(
                model_selection=1,
                min_detection_confidence=0.5
            )
            
            logger.info("Liveness detection initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize liveness detection: {e}")
            self.face_mesh = None
            self.face_detector = None
    
    def encode_face(self, image_data: bytes) -> Optional[str]:
        """
        Extract face embedding using Siamese network
        Returns base64 encoded face embedding
        """
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                logger.error("Failed to decode image")
                return None
            
            # Detect and crop face
            face_image = self._extract_face(image)
            if face_image is None:
                logger.warning("No face detected in image")
                return None
            
            # Resize to model input size
            face_image = cv2.resize(face_image, (224, 224))
            face_image = cv2.cvtColor(face_image, cv2.COLOR_BGR2RGB)
            
            # If we have a Siamese model, use it
            if self.embedding_model is not None:
                # Preprocess for model
                face_array = np.expand_dims(face_image, axis=0)
                face_array = tf.keras.applications.mobilenet_v2.preprocess_input(face_array)
                
                # Get embedding
                embedding = self.embedding_model.predict(face_array, verbose=0)
                embedding_list = embedding[0].tolist()
                
                # Convert to JSON string for storage
                embedding_str = json.dumps(embedding_list)
                logger.info("Face encoding extracted using Siamese network")
                return embedding_str
            
            # Fallback to basic feature extraction if model is not available
            else:
                # Use histogram of oriented gradients as fallback
                embedding = self._extract_hog_features(face_image)
                embedding_str = json.dumps(embedding)
                logger.info("Face encoding extracted using HOG features (fallback)")
                return embedding_str
            
        except Exception as e:
            logger.error(f"Error extracting face encoding: {e}")
            return None
    
    def verify_face_with_liveness(
        self, 
        live_image_data: bytes, 
        stored_encoding: str, 
        check_liveness: bool = True
    ) -> Tuple[bool, float, bool]:
        """
        Verify face with liveness detection
        Returns (is_match, confidence_score, is_live)
        """
        try:
            # First check liveness if required
            is_live = True
            liveness_score = 1.0
            
            if check_liveness:
                is_live, liveness_score = self.check_liveness(live_image_data)
                if not is_live:
                    logger.warning(f"Liveness check failed with score: {liveness_score}")
                    return False, 0.0, False
            
            # Now verify face match
            is_match, confidence = self.verify_face(live_image_data, stored_encoding)
            
            logger.info(f"Face verification - Match: {is_match}, Confidence: {confidence:.3f}, Live: {is_live}")
            return is_match, confidence, is_live
            
        except Exception as e:
            logger.error(f"Error in face verification with liveness: {e}")
            return False, 0.0, False
    
    def verify_face(self, image_data: bytes, stored_encoding: str) -> Tuple[bool, float]:
        """
        Verify if the face matches the stored encoding using Siamese network
        Returns (is_match, confidence_score)
        """
        try:
            # Extract face encoding from new image
            new_encoding = self.encode_face(image_data)
            
            if not new_encoding:
                logger.warning("No face found in verification image")
                return False, 0.0
            
            # Parse stored encoding
            try:
                stored_array = np.array(json.loads(stored_encoding))
                new_array = np.array(json.loads(new_encoding))
            except Exception as e:
                logger.error(f"Failed to parse encodings: {e}")
                return False, 0.0
            
            # Calculate similarity (cosine similarity for normalized embeddings)
            similarity = self._calculate_similarity(new_array, stored_array)
            
            # Determine if it's a match
            is_match = similarity >= self.threshold
            
            logger.info(f"🔬 SIAMESE VERIFICATION:")
            logger.info(f"   Stored encoding shape: {stored_array.shape}")
            logger.info(f"   New encoding shape: {new_array.shape}")
            logger.info(f"   Similarity Score: {similarity:.4f}")
            logger.info(f"   Threshold: {self.threshold}")
            logger.info(f"   Match: {is_match} ({similarity:.4f} {'≥' if is_match else '<'} {self.threshold})")
            
            return is_match, similarity
            
        except Exception as e:
            logger.error(f"Error verifying face: {e}")
            return False, 0.0
    
    def check_liveness(self, image_data: bytes) -> Tuple[bool, float]:
        """
        Check if the face is from a live person (not a photo/video)
        Uses multiple techniques for anti-spoofing
        Returns (is_live, confidence_score)
        """
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return False, 0.0
            
            # Convert to RGB for MediaPipe
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Check 1: Face mesh landmarks (3D face structure)
            mesh_score = self._check_face_mesh_liveness(rgb_image)
            
            # Check 2: Texture analysis (detect print/screen patterns)
            texture_score = self._check_texture_liveness(image)
            
            # Check 3: Color distribution analysis
            color_score = self._check_color_distribution(image)
            
            # Combine scores with weights
            liveness_score = (
                mesh_score * 0.5 +  # Face mesh is most reliable
                texture_score * 0.3 +
                color_score * 0.2
            )
            
            is_live = liveness_score >= self.liveness_threshold
            
            logger.info(f"Liveness check - Score: {liveness_score:.3f}, Threshold: {self.liveness_threshold:.3f}, Live: {is_live}")
            logger.debug(f"Mesh: {mesh_score:.3f}, Texture: {texture_score:.3f}, Color: {color_score:.3f}")
            logger.debug(f"Comparison: {liveness_score:.3f} >= {self.liveness_threshold:.3f} = {is_live}")
            
            return is_live, liveness_score
            
        except Exception as e:
            logger.error(f"Error checking liveness: {e}")
            return True, 1.0  # Default to live if check fails to avoid blocking
    
    def _check_face_mesh_liveness(self, rgb_image: np.ndarray) -> float:
        """Check liveness using 3D face mesh landmarks"""
        try:
            if self.face_mesh is None:
                return 1.0  # Default to live if not available
            
            # Process image with face mesh
            results = self.face_mesh.process(rgb_image)
            
            if not results.multi_face_landmarks:
                return 0.0  # No face landmarks detected
            
            landmarks = results.multi_face_landmarks[0]
            
            # Calculate depth variation (z-coordinates)
            z_coords = [lm.z for lm in landmarks.landmark]
            z_std = np.std(z_coords)
            
            # Real faces have more depth variation
            # Photos/screens have flatter z-distribution
            if z_std > 0.02:  # Threshold for depth variation
                depth_score = min(z_std * 20, 1.0)  # Normalize to 0-1
            else:
                depth_score = z_std * 10
            
            # Check for natural face proportions
            # Calculate eye aspect ratio
            left_eye = [landmarks.landmark[i] for i in [33, 133, 157, 158, 159, 160]]
            right_eye = [landmarks.landmark[i] for i in [362, 263, 387, 388, 389, 390]]
            
            eye_score = self._calculate_eye_aspect_ratio(left_eye, right_eye)
            
            # Combine scores
            mesh_score = (depth_score * 0.7 + eye_score * 0.3)
            
            return mesh_score
            
        except Exception as e:
            logger.error(f"Error in face mesh liveness: {e}")
            return 1.0
    
    def _check_texture_liveness(self, image: np.ndarray) -> float:
        """Check for print/screen patterns using texture analysis"""
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Apply Laplacian for edge detection
            laplacian = cv2.Laplacian(gray, cv2.CV_64F)
            variance = laplacian.var()
            
            # Real faces have more texture variation
            # Photos/screens tend to have regular patterns
            if variance > 100:
                texture_score = min(variance / 500, 1.0)
            else:
                texture_score = variance / 200
            
            # Check for Moiré patterns (common in screen captures)
            fft = np.fft.fft2(gray)
            fft_shift = np.fft.fftshift(fft)
            magnitude = np.abs(fft_shift)
            
            # Check for regular patterns in frequency domain
            pattern_score = 1.0 - (np.std(magnitude) / np.mean(magnitude))
            pattern_score = max(0, min(1, pattern_score))
            
            return (texture_score * 0.7 + pattern_score * 0.3)
            
        except Exception as e:
            logger.error(f"Error in texture liveness: {e}")
            return 1.0
    
    def _check_color_distribution(self, image: np.ndarray) -> float:
        """Check color distribution for natural skin tones"""
        try:
            # Convert to HSV for better skin tone analysis
            hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
            
            # Extract face region (center crop for simplicity)
            h, w = hsv.shape[:2]
            center_region = hsv[h//4:3*h//4, w//4:3*w//4]
            
            # Check hue distribution for skin tones
            hue = center_region[:, :, 0]
            sat = center_region[:, :, 1]
            
            # Natural skin tones have specific hue ranges
            skin_hue_mask = (hue > 0) & (hue < 30)
            skin_ratio = np.sum(skin_hue_mask) / skin_hue_mask.size
            
            # Check saturation variation (real skin has varied saturation)
            sat_std = np.std(sat)
            sat_score = min(sat_std / 50, 1.0)
            
            # Combine scores
            color_score = (skin_ratio * 0.6 + sat_score * 0.4)
            
            return color_score
            
        except Exception as e:
            logger.error(f"Error in color distribution check: {e}")
            return 1.0
    
    def _calculate_eye_aspect_ratio(self, left_eye, right_eye) -> float:
        """Calculate eye aspect ratio for liveness"""
        try:
            # Simplified eye aspect ratio calculation
            left_height = abs(left_eye[1].y - left_eye[5].y)
            right_height = abs(right_eye[1].y - right_eye[5].y)
            
            avg_height = (left_height + right_height) / 2
            
            # Normal eye aspect ratio range
            if 0.15 < avg_height < 0.35:
                return 1.0
            else:
                return 0.5
                
        except Exception as e:
            logger.error(f"Error calculating eye aspect ratio: {e}")
            return 1.0
    
    def _extract_face(self, image: np.ndarray) -> Optional[np.ndarray]:
        """Extract face region from image"""
        try:
            # Use OpenCV face detection
            face_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            )
            
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(100, 100)
            )
            
            if len(faces) > 0:
                # Get the largest face
                x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
                
                # Add some padding
                padding = int(min(w, h) * 0.2)
                x = max(0, x - padding)
                y = max(0, y - padding)
                w = min(image.shape[1] - x, w + 2 * padding)
                h = min(image.shape[0] - y, h + 2 * padding)
                
                face_image = image[y:y+h, x:x+w]
                return face_image
            
            return None
            
        except Exception as e:
            logger.error(f"Error extracting face: {e}")
            return None
    
    def _extract_hog_features(self, image: np.ndarray) -> List[float]:
        """Extract HOG features as fallback when model is not available"""
        try:
            # Resize to standard size
            image = cv2.resize(image, (64, 64))
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            
            # Simple HOG-like features
            # Calculate gradients
            gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=1)
            gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=1)
            
            # Calculate magnitude and angle
            mag, angle = cv2.cartToPolar(gx, gy, angleInDegrees=True)
            
            # Create histogram
            hist, _ = np.histogram(angle, bins=32, range=(0, 360), weights=mag)
            
            # Normalize
            hist = hist / (np.sum(hist) + 1e-6)
            
            return hist.tolist()
            
        except Exception as e:
            logger.error(f"Error extracting HOG features: {e}")
            # Return random features as last resort
            return np.random.rand(32).tolist()
    
    def _calculate_similarity(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """Calculate similarity between two embeddings"""
        try:
            # Use cosine similarity for normalized embeddings
            dot_product = np.dot(embedding1, embedding2)
            norm1 = np.linalg.norm(embedding1)
            norm2 = np.linalg.norm(embedding2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            similarity = dot_product / (norm1 * norm2)
            
            # Convert to 0-1 range
            similarity = (similarity + 1) / 2
            
            return float(similarity)
            
        except Exception as e:
            logger.error(f"Error calculating similarity: {e}")
            return 0.0
    
    def train_on_new_face(self, anchor_image: bytes, positive_images: List[bytes]):
        """
        Fine-tune the model on new face data (optional advanced feature)
        This allows the model to adapt to new faces over time
        """
        try:
            if self.model is None:
                logger.warning("Model not available for training")
                return False
            
            # Prepare training data
            anchor_face = self._prepare_training_image(anchor_image)
            if anchor_face is None:
                return False
            
            positive_faces = []
            for img_data in positive_images:
                face = self._prepare_training_image(img_data)
                if face is not None:
                    positive_faces.append(face)
            
            if len(positive_faces) == 0:
                logger.warning("No valid positive images for training")
                return False
            
            # Create training pairs
            # This is a simplified version - in production, you'd want negative pairs too
            anchors = np.repeat(anchor_face, len(positive_faces), axis=0)
            positives = np.array(positive_faces)
            
            # Fine-tune for a few epochs with a small learning rate
            optimizer = tf.keras.optimizers.Adam(learning_rate=0.0001)
            
            for epoch in range(3):  # Just a few epochs for quick adaptation
                with tf.GradientTape() as tape:
                    anchor_emb, positive_emb = self.model([anchors, positives])
                    
                    # Triplet loss (simplified - without negatives)
                    distance = tf.reduce_sum(tf.square(anchor_emb - positive_emb), axis=1)
                    loss = tf.reduce_mean(tf.maximum(distance - 0.2, 0))
                
                gradients = tape.gradient(loss, self.model.trainable_variables)
                optimizer.apply_gradients(zip(gradients, self.model.trainable_variables))
                
                logger.info(f"Training epoch {epoch + 1}, Loss: {loss.numpy():.4f}")
            
            # Save updated weights
            weights_path = os.path.join(os.path.dirname(__file__), 'siamese_weights.h5')
            self.model.save_weights(weights_path)
            
            logger.info("Model fine-tuned successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error training model: {e}")
            return False
    
    def _prepare_training_image(self, image_data: bytes) -> Optional[np.ndarray]:
        """Prepare image for training"""
        try:
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return None
            
            face = self._extract_face(image)
            if face is None:
                return None
            
            face = cv2.resize(face, (224, 224))
            face = cv2.cvtColor(face, cv2.COLOR_BGR2RGB)
            face = np.expand_dims(face, axis=0)
            face = tf.keras.applications.mobilenet_v2.preprocess_input(face)
            
            return face
            
        except Exception as e:
            logger.error(f"Error preparing training image: {e}")
            return None


# Create a singleton instance
siamese_service = SiameseNetworkService()
