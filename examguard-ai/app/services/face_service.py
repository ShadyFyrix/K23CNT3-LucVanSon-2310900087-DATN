import os
import time
import numpy as np
from typing import Optional, Dict, Any, List
from pathlib import Path
from app.config import settings
from app.core.face_detector import FaceDetector
from app.core.face_embedder import FaceEmbedder
from app.core.liveness_checker import LivenessChecker
from app.core.face_storage import FaceStorage
from app.schemas.models import (
    FaceEnrollResponse,
    FaceRecognizeResponse,
    FaceVerifyResponse,
    FaceRecognitionCandidate,
    DetectedFace
)

try:
    import cv2
except ImportError:
    cv2 = None

class FaceService:
    """
    Core orchestrator combining Detection, Quality, Liveness, Alignment, Embedding, and Storage.
    """

    def __init__(self):
        self.detector = FaceDetector()
        self.embedder = FaceEmbedder()
        self.storage = FaceStorage()
        self._last_id_time = 0.0
        self._cached_identity = {
            "matched": False,
            "employee_id": None,
            "full_name": None,
            "similarity": 0.0
        }

    def enroll_employee(
        self,
        image_bgr: np.ndarray,
        employee_id: str,
        full_name: Optional[str] = None,
        department: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        check_quality: bool = True
    ) -> FaceEnrollResponse:
        """
        Enrolls a new face profile for an employee.
        """
        if image_bgr is None:
            return FaceEnrollResponse(
                success=False,
                employee_id=employee_id,
                message="Invalid image provided",
                face_detected=False,
                quality_passed=False,
                reasons=["Could not decode image"]
            )

        # 1. Detect faces
        faces = self.detector.detect_faces(image_bgr)
        if len(faces) == 0:
            return FaceEnrollResponse(
                success=False,
                employee_id=employee_id,
                message="No face detected",
                face_detected=False,
                quality_passed=False,
                reasons=["FACE_NOT_FOUND: No face detected in image. Please center your face in camera."]
            )

        # Sort by area descending
        faces.sort(key=lambda f: f.bbox.width * f.bbox.height, reverse=True)

        if len(faces) > 1:
            largest_area = faces[0].bbox.width * faces[0].bbox.height
            second_area = faces[1].bbox.width * faces[1].bbox.height
            if largest_area < 3.0 * second_area:
                return FaceEnrollResponse(
                    success=False,
                    employee_id=employee_id,
                    message="Multiple faces detected",
                    face_detected=True,
                    quality_passed=False,
                    reasons=["MULTIPLE_FACES: Only 1 person allowed during enrollment."]
                )

        face = faces[0]

        # 2. Quality Check
        quality_passed = face.quality.valid
        if check_quality and not quality_passed:
            return FaceEnrollResponse(
                success=False,
                employee_id=employee_id,
                message="Face image quality check failed",
                face_detected=True,
                quality_passed=False,
                reasons=face.quality.reasons
            )


        # 3. Align face and extract embedding vector
        aligned_face = self.embedder.align_face(image_bgr, face)
        embedding = self.embedder.extract_embedding(aligned_face)

        # 4. Save vector to DB (Không lưu ảnh ra đĩa để tiết kiệm dung lượng)
        self.storage.save_face(
            employee_id=employee_id,
            embedding=embedding,
            full_name=full_name,
            department=department,
            image_path="",
            metadata=metadata
        )

        return FaceEnrollResponse(
            success=True,
            employee_id=employee_id,
            message=f"Successfully enrolled face for {full_name or employee_id}",
            face_detected=True,
            quality_passed=True,
            image_saved_path="",
            registered_angles=["straight"],
            embeddings={"straight": embedding.tolist() if hasattr(embedding, 'tolist') else list(embedding)},
            reasons=[]
        )

    def enroll_employee_multi_angle(
        self,
        images_dict: Dict[str, np.ndarray],
        employee_id: str,
        full_name: Optional[str] = None,
        department: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        check_quality: bool = True
    ) -> FaceEnrollResponse:
        """
        Enrolls multi-angle face embeddings for accurate recognition,
        and saves ONLY 1 single frontal/straight panorama image into www/register.
        """
        if not images_dict or len(images_dict) == 0:
            return FaceEnrollResponse(
                success=False,
                employee_id=employee_id,
                message="No angle images provided",
                face_detected=False,
                quality_passed=False,
                reasons=["MISSING_IMAGES: Please provide images for straight, left, and right angles."]
            )

        embeddings_dict = {}
        all_reasons = []
        registered_angles = []
        image_paths_dict = {}

        # Không lưu trữ ảnh khuôn mặt ra ổ đĩa để tiết kiệm dung lượng, trích xuất vector trực tiếp từ RAM
        image_paths_dict = {}
        primary_path_str = ""

        # 1. Trích xuất đặc trưng ArcFace Vector (512D) cho từng góc khuôn mặt
        for angle_name, img_bgr in images_dict.items():
            if img_bgr is None or img_bgr.size == 0:
                continue

            faces = self.detector.detect_faces(img_bgr)
            if len(faces) == 0:
                all_reasons.append(f"FACE_NOT_FOUND: Không phát hiện khuôn mặt ở góc '{angle_name}'.")
                continue

            faces.sort(key=lambda f: f.bbox.width * f.bbox.height, reverse=True)
            face = faces[0]

            if check_quality and not face.quality.valid:
                all_reasons.extend([f"[{angle_name}] {r}" for r in face.quality.reasons])
                continue

            aligned = self.embedder.align_face(img_bgr, face)
            vec = self.embedder.extract_embedding(aligned)
            embeddings_dict[angle_name] = vec
            registered_angles.append(angle_name)

        # Fallback: Nếu chất lượng bị cảnh báo nhưng khuôn mặt vẫn được phát hiện rõ, vẫn tiến hành trích xuất vector 512D
        if len(embeddings_dict) == 0:
            for angle_name, img_bgr in images_dict.items():
                if img_bgr is None or img_bgr.size == 0:
                    continue
                faces = self.detector.detect_faces(img_bgr)
                if len(faces) == 0:
                    continue
                faces.sort(key=lambda f: f.bbox.width * f.bbox.height, reverse=True)
                aligned = self.embedder.align_face(img_bgr, faces[0])
                vec = self.embedder.extract_embedding(aligned)
                embeddings_dict[angle_name] = vec
                registered_angles.append(angle_name)

        if len(embeddings_dict) == 0:
            return FaceEnrollResponse(
                success=False,
                employee_id=employee_id,
                message="Không thể trích xuất vector đặc trưng hợp lệ từ các góc ảnh gửi lên.",
                face_detected=False,
                quality_passed=False,
                reasons=all_reasons or ["Lỗi xử lý ảnh góc khuôn mặt."]
            )

        # 3. Lưu trữ toàn bộ 5 vector đặc trưng vào Storage (JSON Vector DB + MongoDB)
        self.storage.save_face_multi_angle(
            employee_id=employee_id,
            embeddings=embeddings_dict,
            full_name=full_name,
            department=department,
            image_paths=image_paths_dict,
            metadata=metadata
        )

        # Convert numpy embeddings to float lists for JSON response
        serializable_embeddings = {
            k: (v.tolist() if hasattr(v, 'tolist') else list(v))
            for k, v in embeddings_dict.items()
        }

        return FaceEnrollResponse(
            success=True,
            employee_id=employee_id,
            message=f"Successfully registered {len(registered_angles)} angles ({', '.join(registered_angles)}) for {full_name or employee_id}",
            face_detected=True,
            quality_passed=True,
            image_saved_path=primary_path_str,
            registered_angles=registered_angles,
            embeddings=serializable_embeddings,
            reasons=all_reasons
        )

    def recognize_face(
        self,
        image_bgr: np.ndarray,
        threshold: float = settings.SIMILARITY_THRESHOLD,
        check_liveness: bool = True,
        check_quality: bool = True
    ) -> FaceRecognizeResponse:
        """
        1:N Search - Identifies who is in the image against all enrolled profiles.
        """
        if image_bgr is None:
            return FaceRecognizeResponse(
                matched=False,
                similarity=0.0,
                threshold=threshold,
                liveness_passed=False,
                liveness_score=0.0,
                reasons=["Could not decode image"]
            )

        # 1. Detect faces
        faces = self.detector.detect_faces(image_bgr)
        if len(faces) == 0:
            return FaceRecognizeResponse(
                matched=False,
                similarity=0.0,
                threshold=threshold,
                liveness_passed=False,
                liveness_score=0.0,
                reasons=["FACE_NOT_FOUND: No face detected."]
            )

        # Sort faces by area descending (largest first)
        faces.sort(key=lambda f: f.bbox.width * f.bbox.height, reverse=True)

        # If multiple faces exist, check if the largest face is the dominant foreground subject
        if len(faces) > 1:
            largest_area = faces[0].bbox.width * faces[0].bbox.height
            second_area = faces[1].bbox.width * faces[1].bbox.height
            if largest_area < 2.5 * second_area:
                return FaceRecognizeResponse(
                    matched=False,
                    similarity=0.0,
                    threshold=threshold,
                    liveness_passed=False,
                    liveness_score=0.0,
                    reasons=["MULTIPLE_FACES: Multiple subjects detected in frame. Please ensure only 1 person is centered."]
                )

        face = faces[0]

        # 2. Quality Check (Keep as info reasons, do not block recognition if face is clear)
        quality_reasons = []
        if not face.quality.valid:
            quality_reasons = face.quality.reasons


        # 3. Liveness Check
        liveness_passed = True
        liveness_score = 1.0
        reasons = []

        if check_liveness:
            liveness = LivenessChecker.check_liveness(image_bgr, face.bbox)
            liveness_score = liveness.score
            liveness_passed = liveness.is_live
            if not liveness_passed:
                reasons.append(f"SPOOF_DETECTED: Liveness check failed (Score: {liveness_score:.2f}/{settings.LIVENESS_THRESHOLD})")

        # 4. Align & Extract Embedding
        aligned_face = self.embedder.align_face(image_bgr, face)
        query_embedding = self.embedder.extract_embedding(aligned_face)

        # 5. Search in storage
        candidates = self.storage.search_similar_faces(query_embedding, top_k=5, threshold=threshold)

        if not candidates:
            return FaceRecognizeResponse(
                matched=False,
                similarity=0.0,
                threshold=threshold,
                liveness_passed=liveness_passed,
                liveness_score=liveness_score,
                candidates=[],
                reasons=reasons or ["NO_MATCH: No matching employee in database."],
                face_box=face.bbox
            )

        best_match = candidates[0]
        is_matched = (best_match.similarity >= threshold) and liveness_passed

        if not is_matched and best_match.similarity < threshold:
            reasons.append("Khuôn mặt không khớp với dữ liệu đã đăng ký!")

        return FaceRecognizeResponse(
            matched=is_matched,
            employee_id=best_match.employee_id if is_matched else None,
            full_name=best_match.full_name if is_matched else None,
            similarity=best_match.similarity,
            threshold=threshold,
            liveness_passed=liveness_passed,
            liveness_score=liveness_score,
            candidates=candidates,
            reasons=reasons,
            face_box=face.bbox
        )

    def verify_employee(
        self,
        image_bgr: np.ndarray,
        employee_id: str,
        threshold: float = settings.SIMILARITY_THRESHOLD,
        check_liveness: bool = True,
        check_quality: bool = True
    ) -> FaceVerifyResponse:
        """
        1:1 Verification - Verifies if the image matches a claimed employee_id.
        """
        profile = self.storage.get_face(employee_id)
        if not profile:
            return FaceVerifyResponse(
                matched=False,
                employee_id=employee_id,
                similarity=0.0,
                threshold=threshold,
                liveness_passed=False,
                liveness_score=0.0,
                reasons=[f"EMPLOYEE_NOT_ENROLLED: Employee ID '{employee_id}' has not registered face data."]
            )

        # Enforce strict minimum threshold
        effective_threshold = max(float(threshold or 0.68), 0.68)

        # Run 1:N recognition across all enrolled profiles to detect impersonation
        rec_res = self.recognize_face(image_bgr, threshold=effective_threshold, check_liveness=check_liveness, check_quality=check_quality)

        # Calculate direct 1:1 similarity against ALL registered angle vectors of the claimed employee
        faces = self.detector.detect_faces(image_bgr)
        if len(faces) == 0:
            return FaceVerifyResponse(
                matched=False,
                employee_id=employee_id,
                full_name=profile.get("full_name"),
                similarity=0.0,
                threshold=effective_threshold,
                liveness_passed=False,
                liveness_score=0.0,
                reasons=["FACE_NOT_FOUND: Không phát hiện thấy khuôn mặt trong khung hình."]
            )

        faces.sort(key=lambda f: f.bbox.width * f.bbox.height, reverse=True)
        primary_face = faces[0]
        aligned = self.embedder.align_face(image_bgr, primary_face)

        # Multi-angle similarity match
        vectors = self.storage.get_face_vectors(employee_id)
        if not vectors:
            return FaceVerifyResponse(
                matched=False,
                employee_id=employee_id,
                full_name=profile.get("full_name"),
                similarity=0.0,
                threshold=effective_threshold,
                liveness_passed=False,
                liveness_score=0.0,
                reasons=[f"EMPLOYEE_NOT_ENROLLED: Tài khoản '{employee_id}' chưa có dữ liệu vector khuôn mặt."]
            )

        best_sim = 0.0
        best_angle = "straight"
        sim_straight = 0.0

        for angle_name, db_vec in vectors:
            # Adapt query vector according to DB vector representation (ArcFace vs Legacy Spatial)
            query_vec = self.embedder.extract_for_db_vector(aligned, db_vec)
            sim = self.embedder.compute_similarity(query_vec, db_vec)
            if angle_name == "straight":
                sim_straight = sim
            if sim > best_sim:
                best_sim = sim
                best_angle = angle_name

        # Anti-impersonation: If camera face was recognized as another enrolled person with higher confidence
        if rec_res.matched and rec_res.employee_id and str(rec_res.employee_id) != str(employee_id) and rec_res.similarity > best_sim:
            other_name = rec_res.full_name or rec_res.employee_id
            return FaceVerifyResponse(
                matched=False,
                employee_id=employee_id,
                full_name=profile.get("full_name"),
                similarity=round(best_sim, 4),
                threshold=effective_threshold,
                matched_angle=best_angle,
                liveness_passed=rec_res.liveness_passed,
                liveness_score=rec_res.liveness_score,
                reasons=[f"IMPERSONATION_BLOCKED: Phát hiện khuôn mặt của nhân sự khác ({other_name}). Hệ thống từ chối điểm danh hộ."],
                face_box=rec_res.face_box
            )

        # Strict Matching Rule:
        # If DB vectors are legacy (all >= 0), require higher threshold to prevent stranger false positives
        is_legacy = any((v >= 0).all() for _, v in vectors)
        req_threshold = 0.72 if is_legacy else effective_threshold

        is_matched = (best_sim >= req_threshold) and rec_res.liveness_passed
        reasons = [r for r in rec_res.reasons if not r.startswith("LOW_SIMILARITY") and "ngưỡng" not in r]
        if not is_matched and best_sim < req_threshold:
            reasons.append(f"Khuôn mặt không khớp với tài khoản '{profile.get('full_name') or employee_id}'.")

        return FaceVerifyResponse(
            matched=is_matched,
            employee_id=employee_id,
            full_name=profile.get("full_name"),
            similarity=round(best_sim, 4),
            threshold=req_threshold,
            matched_angle=best_angle,
            liveness_passed=rec_res.liveness_passed,
            liveness_score=rec_res.liveness_score,
            reasons=reasons,
            face_box=rec_res.face_box
        )

    def detect_face_action(self, image_bgr: np.ndarray, identify: bool = False) -> Dict[str, Any]:
        """
        Realtime tracking of facial bounding box, 5 landmarks, head pose (yaw/pitch), and eye blinks.
        Identity recognition via ArcFace is disabled by default during tracking to save 80% CPU.
        """
        if image_bgr is None:
            return {"face_detected": False}

        faces = self.detector.detect_faces(image_bgr)
        if not faces:
            return {"face_detected": False}

        # Select primary dominant face
        faces.sort(key=lambda f: f.bbox.width * f.bbox.height, reverse=True)
        face = faces[0]

        # Pose & Eye state analysis
        pose_info = LivenessChecker.estimate_head_pose(face.landmarks, face.bbox)
        eye_info = LivenessChecker.analyze_eye_state(image_bgr, face.landmarks, face.bbox)
        liveness = LivenessChecker.check_liveness(image_bgr, face.bbox)

        combined_pose = {
            "pose": pose_info["pose"],
            "yaw_deg": pose_info.get("yaw_deg", 0.0),
            "pitch_deg": pose_info.get("pitch_deg", 0.0),
            "roll_deg": pose_info.get("roll_deg", 0.0),
            "yaw_ratio": round(pose_info.get("yaw_deg", 0.0) / 45.0, 3),
            "pitch_ratio": round(pose_info.get("pitch_deg", 0.0) / 45.0, 3),
            "vert_ratio": pose_info.get("vert_ratio", 1.4),
            "severity": pose_info.get("severity", "NONE"),
            "confidence": pose_info.get("confidence", 1.0),
            "penalty_suggestion": pose_info.get("penalty_suggestion", 0),
            "blink_detected": eye_info["blink_detected"],
            "eye_open_score": eye_info["eye_open_score"]
        }

        # Analyze poses for secondary faces if any
        all_poses = [combined_pose]
        if len(faces) > 1:
            for extra_face in faces[1:4]: # limit to top 3 extra faces to save CPU
                extra_pose = LivenessChecker.estimate_head_pose(extra_face.landmarks, extra_face.bbox)
                all_poses.append({
                    "pose": extra_pose.get("pose", "UNKNOWN"),
                    "yaw_deg": extra_pose.get("yaw_deg", 0.0),
                    "pitch_deg": extra_pose.get("pitch_deg", 0.0),
                    "severity": extra_pose.get("severity", "NONE")
                })

        # Fast Real-time Identification against registered database
        # (Only executed when identify=True, throttled to max once per 1.2s to prevent CPU spikes)
        identity = {
            "matched": False,
            "employee_id": None,
            "full_name": None,
            "similarity": 0.0
        }

        if identify and len(self.storage.profiles) > 0:
            now = time.time()
            if (now - self._last_id_time >= 1.2) or not self._cached_identity.get("matched"):
                self._last_id_time = now
                try:
                    aligned = self.embedder.align_face(image_bgr, face)
                    query_vec = self.embedder.extract_embedding(aligned)
                    candidates = self.storage.search_similar_faces(query_vec, top_k=1, threshold=settings.SIMILARITY_THRESHOLD)
                    if candidates:
                        best = candidates[0]
                        is_match = best.similarity >= settings.SIMILARITY_THRESHOLD
                        identity = {
                            "matched": is_match,
                            "employee_id": best.employee_id if is_match else None,
                            "full_name": best.full_name if is_match else None,
                            "similarity": best.similarity
                        }
                    else:
                        identity = {
                            "matched": False,
                            "employee_id": None,
                            "full_name": None,
                            "similarity": 0.0
                        }
                    self._cached_identity = identity
                except Exception as e:
                    pass
            else:
                identity = self._cached_identity

        return {
            "face_detected": True,
            "num_faces": len(faces),
            "bbox": face.bbox.dict() if hasattr(face.bbox, 'dict') else face.bbox.model_dump(),
            "landmarks": face.landmarks.dict() if hasattr(face.landmarks, 'dict') else face.landmarks.model_dump() if face.landmarks else None,
            "pose": combined_pose,
            "all_poses": all_poses,
            "quality": face.quality.dict() if hasattr(face.quality, 'dict') else face.quality.model_dump(),
            "liveness_score": liveness.score,
            "identity": identity
        }

    def analyze_proctor_frame(self, image_bgr: np.ndarray, expected_student_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Specialized exam proctoring frame analyzer:
        1. Detects face count (0 -> NO_FACE, >1 -> MULTIPLE_FACES)
        2. Detects head poses & suspicious behaviors (PHONE_LOOK_DOWN, SUSPICIOUS_SIDE, LOOK_AWAY)
        3. Assigns severity and penalty scores for automatic grading deduction
        """
        if image_bgr is None:
            return {
                "face_detected": False,
                "num_faces": 0,
                "violations": ["NO_FACE"],
                "severity": "MEDIUM",
                "suggested_penalty": 10,
                "message": "Không tìm thấy khuôn mặt trong khung hình."
            }

        action_res = self.detect_face_action(image_bgr, identify=bool(expected_student_id))
        if not action_res.get("face_detected"):
            return {
                "face_detected": False,
                "num_faces": 0,
                "violations": ["NO_FACE"],
                "severity": "MEDIUM",
                "suggested_penalty": 10,
                "result": action_res,
                "message": "Thí sinh đã rời khỏi khung hình hoặc bị che khuất."
            }

        num_faces = action_res.get("num_faces", 1)
        violations = []
        severity = "NONE"
        suggested_penalty = 0

        # Multi-face violation check
        if num_faces > 1:
            violations.append("MULTIPLE_FACES")
            severity = "HIGH"
            suggested_penalty += 15

        pose_info = action_res.get("pose", {})
        pose_type = pose_info.get("pose", "STRAIGHT")
        pose_severity = pose_info.get("severity", "NONE")
        pose_penalty = pose_info.get("penalty_suggestion", 0)

        # Suspicious pose check
        if pose_type == "PHONE_LOOK_DOWN":
            violations.append("PHONE_DETECTED")
            severity = "HIGH" if severity != "CRITICAL" else severity
            suggested_penalty += max(15, pose_penalty)
        elif pose_type in ("SUSPICIOUS_SIDE_LEFT", "SUSPICIOUS_SIDE_RIGHT"):
            violations.append("LOOK_AWAY")
            severity = "MEDIUM" if severity not in ("HIGH", "CRITICAL") else severity
            suggested_penalty += max(10, pose_penalty)
        elif pose_type in ("TURN_LEFT", "TURN_RIGHT", "LOOK_UP", "LOOK_DOWN"):
            violations.append("LOOK_AWAY")
            if severity == "NONE":
                severity = "LOW"
            suggested_penalty += max(5, pose_penalty)

        # Identity check if expected_student_id is specified
        if expected_student_id and action_res.get("identity", {}).get("matched"):
            matched_id = action_res["identity"].get("employee_id")
            if matched_id and matched_id != expected_student_id:
                violations.append("IMPERSONATION_DETECTED")
                severity = "CRITICAL"
                suggested_penalty = 50

        return {
            "face_detected": True,
            "num_faces": num_faces,
            "violations": violations,
            "severity": severity,
            "suggested_penalty": suggested_penalty,
            "result": action_res,
            "message": "Bình thường" if not violations else f"Phát hiện vi phạm: {', '.join(violations)}"
        }


