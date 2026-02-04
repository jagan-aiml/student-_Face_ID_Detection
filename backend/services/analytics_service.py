from datetime import datetime, timedelta, date
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from backend.database import AttendanceRecord, Student, AttendanceAnalytics
from typing import Dict, List, Optional, Tuple
import pandas as pd
import numpy as np
from collections import defaultdict
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AttendanceAnalyticsService:
    def __init__(self):
        self.risk_thresholds = {
            "late_pattern": 0.3,  # 30% late arrivals
            "absence_pattern": 0.2,  # 20% absences
            "high_risk": 0.7,
            "medium_risk": 0.4
        }
    
    def generate_predictive_insights(self, db: Session, department: Optional[str] = None) -> Dict:
        """Generate predictive analytics for attendance patterns"""
        try:
            # Get attendance data for analysis
            query = db.query(AttendanceRecord)
            if department:
                # Join with Student to filter by department
                query = query.join(Student, AttendanceRecord.student_register_number == Student.register_number)
                query = query.filter(Student.department == department)
            
            # Get last 3 months of data
            three_months_ago = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
            attendance_records = query.filter(AttendanceRecord.date >= three_months_ago).all()
            
            if not attendance_records:
                return {
                    "at_risk_students": [],
                    "frequent_late_arrivals": [],
                    "attendance_trends": {},
                    "department_comparison": {}
                }
            
            # Analyze patterns
            student_patterns = self._analyze_student_patterns(attendance_records, db)
            
            # Identify at-risk students
            at_risk_students = self._identify_at_risk_students(student_patterns)
            
            # Identify frequent late arrivals
            frequent_late = self._identify_frequent_late_arrivals(student_patterns)
            
            # Generate attendance trends
            trends = self._generate_attendance_trends(attendance_records)
            
            # Department comparison
            dept_comparison = self._generate_department_comparison(db)
            
            return {
                "at_risk_students": at_risk_students,
                "frequent_late_arrivals": frequent_late,
                "attendance_trends": trends,
                "department_comparison": dept_comparison,
                "analysis_period": f"Last 90 days (from {three_months_ago})",
                "total_records_analyzed": len(attendance_records)
            }
            
        except Exception as e:
            logger.error(f"Error generating predictive insights: {str(e)}")
            return {
                "error": f"Failed to generate insights: {str(e)}",
                "at_risk_students": [],
                "frequent_late_arrivals": [],
                "attendance_trends": {},
                "department_comparison": {}
            }
    
    def _analyze_student_patterns(self, attendance_records: List, db: Session) -> Dict:
        """Analyze individual student attendance patterns"""
        student_data = defaultdict(lambda: {
            "total_days": 0,
            "present_days": 0,
            "late_days": 0,
            "absent_days": 0,
            "pending_days": 0,
            "consecutive_absences": 0,
            "max_consecutive_absences": 0,
            "late_streak": 0,
            "max_late_streak": 0
        })
        
        # Group records by student
        for record in attendance_records:
            reg_no = record.student_register_number
            status = record.status.lower()
            
            student_data[reg_no]["total_days"] += 1
            
            if status == "present":
                student_data[reg_no]["present_days"] += 1
                student_data[reg_no]["consecutive_absences"] = 0
                student_data[reg_no]["late_streak"] = 0
            elif status == "late":
                student_data[reg_no]["late_days"] += 1
                student_data[reg_no]["consecutive_absences"] = 0
                student_data[reg_no]["late_streak"] += 1
                student_data[reg_no]["max_late_streak"] = max(
                    student_data[reg_no]["max_late_streak"],
                    student_data[reg_no]["late_streak"]
                )
            elif status == "absent":
                student_data[reg_no]["absent_days"] += 1
                student_data[reg_no]["consecutive_absences"] += 1
                student_data[reg_no]["max_consecutive_absences"] = max(
                    student_data[reg_no]["max_consecutive_absences"],
                    student_data[reg_no]["consecutive_absences"]
                )
                student_data[reg_no]["late_streak"] = 0
            elif status == "pending":
                student_data[reg_no]["pending_days"] += 1
        
        # Calculate risk scores
        for reg_no, data in student_data.items():
            if data["total_days"] > 0:
                data["attendance_percentage"] = (data["present_days"] + data["late_days"]) / data["total_days"]
                data["late_percentage"] = data["late_days"] / data["total_days"]
                data["absence_percentage"] = data["absent_days"] / data["total_days"]
                
                # Calculate risk scores
                data["late_pattern_score"] = min(data["late_percentage"] * 2, 1.0)
                data["absence_pattern_score"] = min(data["absence_percentage"] * 3, 1.0)
                
                # Overall risk score
                risk_score = (data["late_pattern_score"] + data["absence_pattern_score"]) / 2
                
                if risk_score >= self.risk_thresholds["high_risk"]:
                    data["risk_level"] = "high"
                elif risk_score >= self.risk_thresholds["medium_risk"]:
                    data["risk_level"] = "medium"
                else:
                    data["risk_level"] = "low"
                
                data["overall_risk_score"] = risk_score
        
        return dict(student_data)
    
    def _identify_at_risk_students(self, student_patterns: Dict) -> List[Dict]:
        """Identify students at risk of dropping out or academic decline"""
        at_risk = []
        
        for reg_no, data in student_patterns.items():
            risk_factors = []
            
            # Check various risk factors
            if data["absence_percentage"] > self.risk_thresholds["absence_pattern"]:
                risk_factors.append(f"High absence rate: {data['absence_percentage']:.1%}")
            
            if data["max_consecutive_absences"] >= 5:
                risk_factors.append(f"Long absence streak: {data['max_consecutive_absences']} days")
            
            if data["late_percentage"] > self.risk_thresholds["late_pattern"]:
                risk_factors.append(f"Frequent late arrivals: {data['late_percentage']:.1%}")
            
            if data["attendance_percentage"] < 0.75:  # Less than 75% attendance
                risk_factors.append(f"Low overall attendance: {data['attendance_percentage']:.1%}")
            
            if risk_factors:
                at_risk.append({
                    "register_number": reg_no,
                    "risk_level": data["risk_level"],
                    "risk_score": data["overall_risk_score"],
                    "attendance_percentage": data["attendance_percentage"],
                    "risk_factors": risk_factors,
                    "consecutive_absences": data["consecutive_absences"],
                    "total_days": data["total_days"]
                })
        
        # Sort by risk score (highest first)
        at_risk.sort(key=lambda x: x["risk_score"], reverse=True)
        return at_risk[:20]  # Return top 20 at-risk students
    
    def _identify_frequent_late_arrivals(self, student_patterns: Dict) -> List[Dict]:
        """Identify students with frequent late arrivals"""
        frequent_late = []
        
        for reg_no, data in student_patterns.items():
            if data["late_percentage"] > 0.15:  # More than 15% late arrivals
                frequent_late.append({
                    "register_number": reg_no,
                    "late_percentage": data["late_percentage"],
                    "late_days": data["late_days"],
                    "total_days": data["total_days"],
                    "max_late_streak": data["max_late_streak"],
                    "current_late_streak": data["late_streak"]
                })
        
        # Sort by late percentage (highest first)
        frequent_late.sort(key=lambda x: x["late_percentage"], reverse=True)
        return frequent_late[:15]  # Return top 15 frequent late students
    
    def _generate_attendance_trends(self, attendance_records: List) -> Dict:
        """Generate attendance trends over time"""
        # Group by date
        daily_stats = defaultdict(lambda: {"present": 0, "late": 0, "absent": 0, "pending": 0})
        
        for record in attendance_records:
            date_key = record.date
            status = record.status.lower()
            daily_stats[date_key][status] += 1
        
        # Calculate weekly trends
        weekly_trends = []
        sorted_dates = sorted(daily_stats.keys())
        
        if sorted_dates:
            current_week = []
            week_stats = {"present": 0, "late": 0, "absent": 0, "pending": 0}
            
            for date_str in sorted_dates:
                current_week.append(date_str)
                for status, count in daily_stats[date_str].items():
                    week_stats[status] += count
                
                # If week is complete (7 days) or last date
                if len(current_week) == 7 or date_str == sorted_dates[-1]:
                    total = sum(week_stats.values())
                    if total > 0:
                        weekly_trends.append({
                            "week_start": current_week[0],
                            "week_end": current_week[-1],
                            "total_records": total,
                            "attendance_rate": (week_stats["present"] + week_stats["late"]) / total,
                            "late_rate": week_stats["late"] / total,
                            "absence_rate": week_stats["absent"] / total,
                            "pending_rate": week_stats["pending"] / total
                        })
                    
                    current_week = []
                    week_stats = {"present": 0, "late": 0, "absent": 0, "pending": 0}
        
        return {
            "daily_statistics": dict(daily_stats),
            "weekly_trends": weekly_trends,
            "analysis_summary": {
                "total_days_analyzed": len(daily_stats),
                "date_range": {
                    "start": min(sorted_dates) if sorted_dates else None,
                    "end": max(sorted_dates) if sorted_dates else None
                }
            }
        }
    
    def _generate_department_comparison(self, db: Session) -> Dict:
        """Compare attendance across departments"""
        try:
            # Get department-wise statistics for last 30 days
            thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
            
            dept_stats = db.query(
                Student.department,
                func.count(AttendanceRecord.id).label('total_records'),
                func.sum(func.case([(AttendanceRecord.status == 'Present', 1)], else_=0)).label('present_count'),
                func.sum(func.case([(AttendanceRecord.status == 'Late', 1)], else_=0)).label('late_count'),
                func.sum(func.case([(AttendanceRecord.status == 'Absent', 1)], else_=0)).label('absent_count'),
                func.sum(func.case([(AttendanceRecord.status == 'Pending', 1)], else_=0)).label('pending_count')
            ).join(
                AttendanceRecord, Student.register_number == AttendanceRecord.student_register_number
            ).filter(
                AttendanceRecord.date >= thirty_days_ago
            ).group_by(Student.department).all()
            
            department_comparison = {}
            
            for stat in dept_stats:
                total = stat.total_records or 1  # Avoid division by zero
                department_comparison[stat.department] = {
                    "total_records": stat.total_records,
                    "present_count": stat.present_count or 0,
                    "late_count": stat.late_count or 0,
                    "absent_count": stat.absent_count or 0,
                    "pending_count": stat.pending_count or 0,
                    "attendance_rate": ((stat.present_count or 0) + (stat.late_count or 0)) / total,
                    "late_rate": (stat.late_count or 0) / total,
                    "absence_rate": (stat.absent_count or 0) / total,
                    "pending_rate": (stat.pending_count or 0) / total
                }
            
            return department_comparison
            
        except Exception as e:
            logger.error(f"Error generating department comparison: {str(e)}")
            return {}
    
    def update_monthly_analytics(self, db: Session, month: str = None) -> Dict:
        """Update monthly analytics for all students"""
        try:
            if not month:
                month = datetime.now().strftime("%Y-%m")
            
            # Get all attendance records for the month
            attendance_records = db.query(AttendanceRecord).filter(
                AttendanceRecord.date.like(f"{month}%")
            ).all()
            
            # Group by student
            student_monthly_data = defaultdict(lambda: {
                "total_days": 0, "present_days": 0, "late_days": 0, "absent_days": 0
            })
            
            for record in attendance_records:
                reg_no = record.student_register_number
                status = record.status.lower()
                
                student_monthly_data[reg_no]["total_days"] += 1
                if status == "present":
                    student_monthly_data[reg_no]["present_days"] += 1
                elif status == "late":
                    student_monthly_data[reg_no]["late_days"] += 1
                elif status == "absent":
                    student_monthly_data[reg_no]["absent_days"] += 1
            
            # Update or create analytics records
            updated_count = 0
            for reg_no, data in student_monthly_data.items():
                # Calculate percentages and risk scores
                total = data["total_days"]
                if total > 0:
                    attendance_percentage = (data["present_days"] + data["late_days"]) / total
                    late_pattern_score = min((data["late_days"] / total) * 2, 1.0)
                    absence_pattern_score = min((data["absent_days"] / total) * 3, 1.0)
                    
                    # Determine risk level
                    risk_score = (late_pattern_score + absence_pattern_score) / 2
                    if risk_score >= 0.7:
                        risk_level = "high"
                    elif risk_score >= 0.4:
                        risk_level = "medium"
                    else:
                        risk_level = "low"
                    
                    # Update or create analytics record
                    analytics = db.query(AttendanceAnalytics).filter(
                        and_(
                            AttendanceAnalytics.student_register_number == reg_no,
                            AttendanceAnalytics.month == month
                        )
                    ).first()
                    
                    if analytics:
                        # Update existing record
                        analytics.total_days = total
                        analytics.present_days = data["present_days"]
                        analytics.late_days = data["late_days"]
                        analytics.absent_days = data["absent_days"]
                        analytics.attendance_percentage = attendance_percentage
                        analytics.late_pattern_score = late_pattern_score
                        analytics.absence_pattern_score = absence_pattern_score
                        analytics.prediction_risk = risk_level
                        analytics.updated_at = datetime.utcnow()
                    else:
                        # Create new record
                        analytics = AttendanceAnalytics(
                            student_register_number=reg_no,
                            month=month,
                            total_days=total,
                            present_days=data["present_days"],
                            late_days=data["late_days"],
                            absent_days=data["absent_days"],
                            attendance_percentage=attendance_percentage,
                            late_pattern_score=late_pattern_score,
                            absence_pattern_score=absence_pattern_score,
                            prediction_risk=risk_level
                        )
                        db.add(analytics)
                    
                    updated_count += 1
            
            db.commit()
            
            return {
                "status": "success",
                "month": month,
                "students_updated": updated_count,
                "records_processed": len(attendance_records)
            }
            
        except Exception as e:
            logger.error(f"Error updating monthly analytics: {str(e)}")
            db.rollback()
            return {
                "status": "error",
                "message": f"Failed to update analytics: {str(e)}"
            }
