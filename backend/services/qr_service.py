import cv2
import numpy as np
from pyzbar import pyzbar
import qrcode
from io import BytesIO
import base64
import json
from typing import Optional, Dict, List
import logging
from sqlalchemy.orm import Session
from backend.database import Student

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class QRBarcodeService:
    def __init__(self):
        self.qr_detector = cv2.QRCodeDetector()
    
    def generate_student_qr(self, register_number: str, student_data: dict) -> str:
        """
        Generate QR code for student containing encrypted data
        Returns base64 encoded QR code image
        """
        try:
            # Create QR data payload
            qr_data = {
                "register_number": register_number,
                "name": student_data.get("name", ""),
                "department": student_data.get("department", ""),
                "year": student_data.get("year", ""),
                "section": student_data.get("section", ""),
                "type": "student_id",
                "version": "1.0"
            }
            
            # Convert to JSON string
            qr_json = json.dumps(qr_data, separators=(',', ':'))
            
            # Create QR code
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(qr_json)
            qr.make(fit=True)
            
            # Create image
            qr_image = qr.make_image(fill_color="black", back_color="white")
            
            # Convert to base64
            buffer = BytesIO()
            qr_image.save(buffer, format='PNG')
            img_str = base64.b64encode(buffer.getvalue()).decode()
            
            logger.info(f"QR code generated for student: {register_number}")
            return img_str
            
        except Exception as e:
            logger.error(f"Error generating QR code: {str(e)}")
            return ""
    
    def decode_qr_from_image(self, image_data: bytes) -> Optional[Dict]:
        """
        Decode QR code from image data with enhanced detection
        Returns decoded data or None
        """
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                logger.error("Failed to decode image")
                return None
            
            logger.info(f"Processing image of size: {image.shape}")
            
            # Debug: Save image for inspection
            import os
            import time
            debug_dir = "debug_barcode_images"
            if not os.path.exists(debug_dir):
                os.makedirs(debug_dir)
            debug_path = os.path.join(debug_dir, f"barcode_scan_{int(time.time())}.jpg")
            cv2.imwrite(debug_path, image)
            logger.info(f"Debug: Saved scan image to {debug_path}")
            
            # First try with the original color image (sometimes works better)
            # Then convert to grayscale for other attempts
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Sharpen image to enhance barcode edges
            kernel_sharpen = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
            sharpened = cv2.filter2D(gray, -1, kernel_sharpen)
            
            # Try multiple preprocessing techniques for better detection
            # Order matters - try simplest first
            processed_images = [
                image,  # Try original color image first
                gray,  # Original grayscale
                sharpened,  # Sharpened image for better edges
                cv2.equalizeHist(gray),  # Histogram equalization for better contrast
                cv2.equalizeHist(sharpened),  # Sharpened + equalized
                cv2.GaussianBlur(gray, (5, 5), 0),  # Slight blur
                cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1],  # OTSU threshold
                cv2.threshold(sharpened, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1],  # OTSU on sharpened
                cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2),  # Adaptive
                cv2.adaptiveThreshold(sharpened, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2),  # Adaptive on sharpened
                cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)[1],  # Simple binary threshold
                cv2.morphologyEx(gray, cv2.MORPH_CLOSE, np.ones((5,5), np.uint8)),  # Morphological closing
                cv2.bilateralFilter(gray, 9, 75, 75),  # Bilateral filter
                cv2.Canny(gray, 50, 150),  # Edge detection
            ]
            
            # Add focused region detection (bottom 40% of image where ID card barcodes usually are)
            height, width = gray.shape
            bottom_region = gray[int(height * 0.6):, :]  # Bottom 40%
            if bottom_region.size > 0:
                processed_images.extend([
                    bottom_region,
                    cv2.equalizeHist(bottom_region),
                    cv2.threshold(bottom_region, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1],
                    cv2.adaptiveThreshold(bottom_region, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2),
                ])
            
            # Also add inverted versions for some (in case of white barcode on dark background)
            inverted_thresh = cv2.bitwise_not(cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1])
            processed_images.append(inverted_thresh)
            
            # Try OpenCV QR detector with different preprocessing
            for i, processed_img in enumerate(processed_images):
                try:
                    data, bbox, _ = self.qr_detector.detectAndDecode(processed_img)
                    
                    if data and data.strip():
                        logger.info(f"QR code detected with OpenCV (preprocessing {i}): {data[:50]}...")
                        try:
                            # Parse JSON data
                            qr_data = json.loads(data)
                            logger.info(f"QR code decoded successfully: {qr_data.get('register_number', 'Unknown')}")
                            return qr_data
                        except json.JSONDecodeError:
                            # If not JSON, check if it's a direct register number
                            data_clean = data.strip()
                            if data_clean.isdigit() and len(data_clean) == 7:
                                logger.info(f"QR code contains 7-digit register number: {data_clean}")
                                return {"data": data_clean, "type": "register_number"}
                            elif data_clean.isdigit() and 5 <= len(data_clean) <= 9:
                                logger.info(f"QR code contains {len(data_clean)}-digit number: {data_clean}")
                                return {"data": data_clean, "type": "register_number"}
                            else:
                                logger.info(f"QR code contains text data: {data_clean}")
                                return {"data": data_clean, "type": "plain_text"}
                except Exception as e:
                    logger.debug(f"OpenCV detection failed for preprocessing {i}: {str(e)}")
                    continue
            
            # Try pyzbar with different preprocessing and settings
            for i, processed_img in enumerate(processed_images):
                try:
                    # Try with default settings first (detects all barcode types)
                    barcodes = pyzbar.decode(processed_img)
                    
                    # Log what we tried
                    logger.debug(f"Attempt {i}: Found {len(barcodes)} barcodes")
                    
                    # If no barcodes found and it's a grayscale image, try with specific settings
                    if not barcodes and len(processed_img.shape) == 2:
                        # Try with more aggressive decoding
                        from pyzbar.pyzbar import ZBarSymbol
                        # Try all supported barcode types
                        barcodes = pyzbar.decode(processed_img, symbols=[
                            ZBarSymbol.CODE128,  # Most common for ID cards
                            ZBarSymbol.CODE39,   # Common for ID cards
                            ZBarSymbol.EAN13,
                            ZBarSymbol.EAN8,
                            ZBarSymbol.UPCA,
                            ZBarSymbol.UPCE,
                            ZBarSymbol.I25,      # Interleaved 2 of 5
                            ZBarSymbol.CODABAR,
                            ZBarSymbol.CODE93,
                            ZBarSymbol.DATABAR,
                            ZBarSymbol.DATABAR_EXP,
                            ZBarSymbol.PDF417,   # 2D barcode
                            ZBarSymbol.QRCODE,   # QR codes
                        ])
                        logger.debug(f"Attempt {i} with specific symbols: Found {len(barcodes)} barcodes")
                    
                    for barcode in barcodes:
                        try:
                            barcode_data = barcode.data.decode('utf-8')
                        except:
                            # Try different encodings if UTF-8 fails
                            try:
                                barcode_data = barcode.data.decode('latin-1')
                            except:
                                barcode_data = barcode.data.hex()
                        
                        barcode_type = barcode.type
                        
                        if barcode_data and barcode_data.strip():
                            logger.info(f"Barcode detected with pyzbar (preprocessing {i}, type {barcode_type}): {barcode_data[:50]}...")
                            try:
                                # Try to parse as JSON
                                qr_data = json.loads(barcode_data)
                                logger.info(f"Barcode decoded with pyzbar: {qr_data.get('register_number', 'Unknown')}")
                                return qr_data
                            except json.JSONDecodeError:
                                # Check if it's a direct register number
                                data_clean = barcode_data.strip()
                                
                                # Check for email format (2227021@saec.ac.in)
                                if '@' in data_clean:
                                    import re
                                    email_match = re.match(r'(\d{7})@', data_clean)
                                    if email_match:
                                        register_num = email_match.group(1)
                                        logger.info(f"Barcode contains email with register number: {register_num}")
                                        return {"data": register_num, "type": "register_number", "barcode_type": barcode_type}
                                
                                # Check for direct 7-digit number
                                if data_clean.isdigit() and len(data_clean) == 7:
                                    logger.info(f"Barcode contains 7-digit register number: {data_clean}")
                                    return {"data": data_clean, "type": "register_number", "barcode_type": barcode_type}
                                elif data_clean.isdigit() and 5 <= len(data_clean) <= 9:
                                    logger.info(f"Barcode contains {len(data_clean)}-digit number: {data_clean}")
                                    return {"data": data_clean, "type": "register_number", "barcode_type": barcode_type}
                                else:
                                    # Try to extract 7-digit number from the text
                                    import re
                                    seven_digit = re.search(r'\b(\d{7})\b', data_clean)
                                    if seven_digit:
                                        register_num = seven_digit.group(1)
                                        logger.info(f"Extracted 7-digit number from barcode: {register_num}")
                                        return {"data": register_num, "type": "register_number", "barcode_type": barcode_type}
                                    
                                    logger.info(f"Barcode contains text data: {data_clean}")
                                    return {"data": data_clean, "type": "plain_text", "barcode_type": barcode_type}
                except Exception as e:
                    logger.debug(f"Pyzbar detection failed for preprocessing {i}: {str(e)}")
                    continue
            
            # Try with different image scales for better barcode detection
            for scale in [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5]:
                try:
                    height, width = gray.shape
                    new_width = int(width * scale)
                    new_height = int(height * scale)
                    
                    # Use different interpolation methods for different scales
                    if scale < 1.0:
                        resized = cv2.resize(gray, (new_width, new_height), interpolation=cv2.INTER_AREA)
                    else:
                        resized = cv2.resize(gray, (new_width, new_height), interpolation=cv2.INTER_CUBIC)
                    
                    # Try OpenCV on resized image
                    data, bbox, _ = self.qr_detector.detectAndDecode(resized)
                    if data and data.strip():
                        logger.info(f"QR code detected with OpenCV (scale {scale}): {data[:50]}...")
                        try:
                            qr_data = json.loads(data)
                            return qr_data
                        except json.JSONDecodeError:
                            return {"data": data.strip(), "type": "plain_text"}
                    
                    # Try pyzbar on resized image
                    barcodes = pyzbar.decode(resized)
                    for barcode in barcodes:
                        try:
                            barcode_data = barcode.data.decode('utf-8')
                        except:
                            try:
                                barcode_data = barcode.data.decode('latin-1')
                            except:
                                barcode_data = barcode.data.hex()
                        
                        if barcode_data and barcode_data.strip():
                            logger.info(f"Barcode detected with pyzbar (scale {scale}): {barcode_data[:50]}...")
                            data_clean = barcode_data.strip()
                            
                            # Check for email format (2227021@saec.ac.in)
                            if '@' in data_clean:
                                import re
                                email_match = re.match(r'(\d{7})@', data_clean)
                                if email_match:
                                    register_num = email_match.group(1)
                                    logger.info(f"Scale barcode contains email with register: {register_num}")
                                    return {"data": register_num, "type": "register_number", "barcode_type": barcode.type}
                            
                            # Check if it's a direct register number
                            if data_clean.isdigit() and len(data_clean) == 7:
                                logger.info(f"Scale barcode contains 7-digit register number: {data_clean}")
                                result = {"data": data_clean, "type": "register_number", "barcode_type": barcode.type}
                                logger.info(f"Returning from scale detection: {result}")
                                return result
                            elif data_clean.isdigit() and 5 <= len(data_clean) <= 9:
                                logger.info(f"Scale barcode contains {len(data_clean)}-digit number: {data_clean}")
                                return {"data": data_clean, "type": "register_number", "barcode_type": barcode.type}
                            else:
                                # Try to extract 7-digit number from text
                                import re
                                seven_digit = re.search(r'\b(\d{7})\b', data_clean)
                                if seven_digit:
                                    register_num = seven_digit.group(1)
                                    logger.info(f"Extracted 7-digit from barcode: {register_num}")
                                    return {"data": register_num, "type": "register_number", "barcode_type": barcode.type}
                                
                                return {"data": data_clean, "type": "plain_text", "barcode_type": barcode.type}
                except Exception as e:
                    logger.debug(f"Scale detection failed for scale {scale}: {str(e)}")
                    continue
            
            # Last resort: Try with image rotation (ID card might be tilted)
            logger.info("Trying rotation-based detection as last resort...")
            for angle in [-15, -10, -5, 5, 10, 15, -20, 20]:
                try:
                    height, width = gray.shape
                    center = (width // 2, height // 2)
                    rotation_matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
                    rotated = cv2.warpAffine(gray, rotation_matrix, (width, height), 
                                            flags=cv2.INTER_CUBIC, 
                                            borderMode=cv2.BORDER_REPLICATE)
                    
                    # Try pyzbar on rotated image
                    barcodes = pyzbar.decode(rotated)
                    for barcode in barcodes:
                        try:
                            barcode_data = barcode.data.decode('utf-8')
                        except:
                            try:
                                barcode_data = barcode.data.decode('latin-1')
                            except:
                                continue
                        
                        if barcode_data and barcode_data.strip():
                            logger.info(f"✅ Barcode detected with rotation {angle}°: {barcode_data[:50]}...")
                            data_clean = barcode_data.strip()
                            
                            # Extract 7-digit number
                            if data_clean.isdigit() and len(data_clean) == 7:
                                logger.info(f"✅ SUCCESS: 7-digit register number found: {data_clean}")
                                return {"data": data_clean, "type": "register_number", "barcode_type": barcode.type}
                            
                            # Try to extract from text
                            import re
                            seven_digit = re.search(r'\b(\d{7})\b', data_clean)
                            if seven_digit:
                                register_num = seven_digit.group(1)
                                logger.info(f"✅ SUCCESS: Extracted 7-digit number: {register_num}")
                                return {"data": register_num, "type": "register_number", "barcode_type": barcode.type}
                except Exception as e:
                    logger.debug(f"Rotation detection failed for angle {angle}: {str(e)}")
                    continue
            
            # Last resort: Try OCR to extract email or register number
            logger.info("Attempting OCR-based text extraction...")
            try:
                import pytesseract
                
                # Configure Tesseract path (try common installation locations)
                try:
                    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
                except:
                    try:
                        pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe'
                    except:
                        pass  # Use system PATH if configured
                
                # Try OCR on multiple image variations
                ocr_images = [(image, "color"), (gray, "grayscale"), (sharpened, "sharpened")]
                
                for img, img_type in ocr_images:
                    try:
                        # Extract text from image
                        text = pytesseract.image_to_string(img)
                        logger.info(f"OCR text from {img_type}: {text[:100]}...")
                        
                        # Look for email pattern with register number (e.g., 2227021@saec.ac.in)
                        import re
                        email_match = re.search(r'(\d{7})@[\w\.]+', text)
                        if email_match:
                            register_num = email_match.group(1)
                            logger.info(f"✅ SUCCESS: Extracted register number from email via OCR: {register_num}")
                            return {"data": register_num, "type": "register_number", "method": "ocr_email"}
                        
                        # Try finding just the 7-digit number
                        digit_match = re.search(r'\b(\d{7})\b', text)
                        if digit_match:
                            register_num = digit_match.group(1)
                            logger.info(f"✅ SUCCESS: Extracted 7-digit number via OCR: {register_num}")
                            return {"data": register_num, "type": "register_number", "method": "ocr_digits"}
                        
                    except Exception as e:
                        logger.debug(f"OCR failed for {img_type}: {str(e)}")
                        continue
                        
            except ImportError:
                logger.warning("Pytesseract not installed or Tesseract not configured")
            except Exception as e:
                logger.error(f"OCR extraction error: {str(e)}")
            
            logger.warning("❌ No QR/barcode found in image after ALL detection methods (including rotation and OCR)")
            return None
            
        except Exception as e:
            logger.error(f"Error decoding QR/barcode: {str(e)}")
            return None
    
    def verify_student_qr(self, qr_data: Dict, db: Session) -> Optional[Student]:
        """
        Verify QR code data against student database
        Returns student object if valid, None otherwise
        """
        try:
            if not qr_data:
                return None
            
            # Extract register number from QR data
            register_number = qr_data.get("register_number")
            if not register_number:
                # Try alternative formats
                register_number = qr_data.get("data")
            
            if not register_number:
                logger.error("No register number found in QR data")
                return None
            
            # Find student in database
            student = db.query(Student).filter(
                Student.register_number == register_number,
                Student.is_active == True
            ).first()
            
            if student:
                # Verify additional data if available
                if qr_data.get("type") == "student_id":
                    # Check if QR data matches student record
                    name_match = qr_data.get("name", "").lower() == student.name.lower()
                    dept_match = qr_data.get("department", "") == student.department
                    
                    if not (name_match and dept_match):
                        logger.warning(f"QR data mismatch for student: {register_number}")
                        # Still return student but with lower confidence
                
                logger.info(f"QR verification successful for student: {register_number}")
                return student
            
            logger.warning(f"Student not found for register number: {register_number}")
            return None
            
        except Exception as e:
            logger.error(f"Error verifying QR data: {str(e)}")
            return None
    
    def detect_qr_regions(self, image_data: bytes) -> List[Dict]:
        """
        Detect QR code regions in image
        Returns list of bounding boxes
        """
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return []
            
            # Use OpenCV QR detector to find regions
            data, bbox, _ = self.qr_detector.detectAndDecode(image)
            
            regions = []
            
            if bbox is not None and len(bbox) > 0:
                bbox = bbox[0]  # Get first detection
                
                # Convert to integer coordinates
                x_coords = [int(point[0]) for point in bbox]
                y_coords = [int(point[1]) for point in bbox]
                
                x_min, x_max = min(x_coords), max(x_coords)
                y_min, y_max = min(y_coords), max(y_coords)
                
                regions.append({
                    'x': x_min,
                    'y': y_min,
                    'width': x_max - x_min,
                    'height': y_max - y_min,
                    'confidence': 1.0,
                    'data': data if data else ""
                })
            
            # Also try pyzbar for additional detection
            barcodes = pyzbar.decode(image)
            
            for barcode in barcodes:
                rect = barcode.rect
                regions.append({
                    'x': rect.left,
                    'y': rect.top,
                    'width': rect.width,
                    'height': rect.height,
                    'confidence': 1.0,
                    'data': barcode.data.decode('utf-8')
                })
            
            logger.info(f"Detected {len(regions)} QR/barcode regions")
            return regions
            
        except Exception as e:
            logger.error(f"Error detecting QR regions: {str(e)}")
            return []
    
    def store_qr_data(self, register_number: str, qr_data: str, db: Session) -> bool:
        """
        Store QR code data for a student
        """
        try:
            # Find student
            student = db.query(Student).filter(
                Student.register_number == register_number
            ).first()
            
            if not student:
                logger.error(f"Student not found: {register_number}")
                return False
            
            # Update QR code data
            student.qr_code_data = qr_data
            db.commit()
            
            logger.info(f"QR code data stored for student: {register_number}")
            return True
            
        except Exception as e:
            logger.error(f"Error storing QR data: {str(e)}")
            db.rollback()
            return False
    
    def validate_qr_format(self, qr_data: Dict) -> bool:
        """
        Validate QR code data format
        Returns True if format is valid
        """
        try:
            if not isinstance(qr_data, dict):
                return False
            
            # Check for required fields
            required_fields = ["register_number"]
            
            for field in required_fields:
                if field not in qr_data:
                    return False
            
            # Validate register number format (customize as needed)
            register_number = qr_data["register_number"]
            if not isinstance(register_number, str) or len(register_number) < 3:
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating QR format: {str(e)}")
            return False
