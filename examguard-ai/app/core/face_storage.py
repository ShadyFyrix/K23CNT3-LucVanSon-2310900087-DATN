import os
import sys
import json
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path

# Force UTF-8 encoding on Windows console
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
if hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

try:
    from pymongo import MongoClient
except ImportError:
    MongoClient = None

from app.config import settings
from app.schemas.models import FaceRecognitionCandidate, EmployeeFaceProfile

class FaceStorage:
    """
    Manages vector storage and metadata for enrolled employees.
    Directly connected to MongoDB ('employees' collection with embedded 'face_embeddings')
    with in-memory vector indexing for ultra-fast sub-millisecond cosine similarity search.
    """

    def __init__(self, db_file: Path = settings.DB_PATH):
        self.db_file = Path(db_file)
        self.profiles: Dict[str, Dict[str, Any]] = {}
        self.use_mongodb = settings.USE_MONGODB
        self._init_storage()

    def _get_mongo_client(self):
        if MongoClient is None:
            return None
        try:
            client = MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=2500)
            # Quick ping
            client.admin.command('ping')
            return client
        except Exception as e:
            print(f"[FaceStorage] ⚠️ MongoDB Connection Warning: {e}")
            return None

    def _get_collection(self):
        client = self._get_mongo_client()
        if client is not None:
            try:
                db_name = settings.MONGODB_DB_NAME or "crm_deepcode_db"
                return client, client[db_name]["users"]
            except Exception:
                return None, None
        return None, None

    def _init_storage(self):
        """Initializes storage from MongoDB (crm_deepcode_db), syncing to JSON."""
        loaded_from_mongo = self._load_from_mongodb()
        if not loaded_from_mongo:
            self._load_from_json()

    def _load_from_mongodb(self) -> bool:
        """Loads all employees and their multi-angle embeddings from MongoDB (users collection and employees collection)."""
        client = self._get_mongo_client()
        if client is None:
            return False

        try:
            db_name = settings.MONGODB_DB_NAME or "crm_deepcode_db"
            db = client[db_name]
            profiles = {}

            # 1. CRM users collection (has isFaceRegistered: true and faceAngles)
            try:
                user_docs = list(db["users"].find({
                    "$or": [
                        {"isFaceRegistered": True},
                        {"faceAngles.straight": {"$exists": True, "$ne": []}},
                        {"faceDescriptor": {"$exists": True, "$ne": []}}
                    ]
                }))
                for doc in user_docs:
                    u_id = str(doc.get("_id"))
                    email = str(doc.get("email") or "")
                    face_angles = doc.get("faceAngles", {})
                    embeddings = {}
                    registered_angles = []

                    if isinstance(face_angles, dict):
                        for angle, vec in face_angles.items():
                            if isinstance(vec, list) and len(vec) > 0:
                                embeddings[angle] = [float(x) for x in vec]
                                registered_angles.append(angle)

                    if not embeddings and doc.get("faceDescriptor"):
                        vec = doc.get("faceDescriptor")
                        if isinstance(vec, list) and len(vec) > 0:
                            embeddings["straight"] = [float(x) for x in vec]
                            registered_angles.append("straight")

                    if not embeddings:
                        continue

                    # Average primary embedding
                    all_vecs = [np.array(v, dtype=np.float32) for v in embeddings.values()]
                    avg_vec = np.mean(all_vecs, axis=0)
                    norm = np.linalg.norm(avg_vec)
                    if norm > 1e-6:
                        avg_vec = avg_vec / norm
                    primary_embedding = [float(x) for x in avg_vec.tolist()]

                    image_paths = doc.get("faceAnglePhotos") or {}
                    primary_avatar = doc.get("facePhoto") or doc.get("avatar")

                    profile_data = {
                        "employee_id": u_id,
                        "user_id": u_id,
                        "email": email,
                        "full_name": doc.get("fullName") or email or u_id,
                        "department": doc.get("department") or "Vận hành",
                        "company_id": "DEEPCODE",
                        "shift_id": "CA_HANH_CHINH",
                        "image_path": primary_avatar,
                        "image_paths": image_paths if isinstance(image_paths, dict) else {},
                        "created_at": doc.get("createdAt", datetime.now()).isoformat() if isinstance(doc.get("createdAt"), datetime) else str(doc.get("createdAt", "")),
                        "embeddings": embeddings,
                        "embedding": primary_embedding,
                        "registered_angles": registered_angles
                    }

                    profiles[u_id] = profile_data
                    if email:
                        profiles[email] = profile_data
            except Exception as user_err:
                print(f"[FaceStorage] Note reading users: {user_err}")

            # 2. Fallback: employees collection
            if "employees" in db.list_collection_names():
                try:
                    emp_docs = list(db["employees"].find({"is_active": True}))
                    for doc in emp_docs:
                        emp_id = str(doc.get("employee_id"))
                        if emp_id in profiles:
                            continue
                        embeddings = {}
                        image_paths = {}
                        registered_angles = []
                        for f in doc.get("face_embeddings", []):
                            angle = f.get("angle_type", "straight")
                            vec = f.get("embedding", [])
                            img = f.get("image_path")
                            if vec and len(vec) > 0:
                                embeddings[angle] = [float(x) for x in vec]
                                registered_angles.append(angle)
                            if img:
                                image_paths[angle] = img
                        if not embeddings:
                            continue
                        all_vecs = [np.array(v, dtype=np.float32) for v in embeddings.values()]
                        avg_vec = np.mean(all_vecs, axis=0)
                        norm = np.linalg.norm(avg_vec)
                        if norm > 1e-6:
                            avg_vec = avg_vec / norm
                        primary_embedding = [float(x) for x in avg_vec.tolist()]
                        primary_avatar = doc.get("avatar_url") or image_paths.get("straight")
                        profiles[emp_id] = {
                            "employee_id": emp_id,
                            "full_name": doc.get("full_name") or emp_id,
                            "department": doc.get("department") or "Văn phòng",
                            "company_id": doc.get("company_id") or "CP01",
                            "shift_id": doc.get("shift_id") or "CA_HANH_CHINH",
                            "image_path": primary_avatar,
                            "image_paths": image_paths,
                            "created_at": doc.get("created_at", "").isoformat() if isinstance(doc.get("created_at"), datetime) else str(doc.get("created_at", "")),
                            "embeddings": embeddings,
                            "embedding": primary_embedding,
                            "registered_angles": registered_angles
                        }
                except Exception as emp_err:
                    print(f"[FaceStorage] Note reading employees: {emp_err}")

            client.close()
            if profiles:
                self.profiles = profiles
                self._save_to_json()
                print(f"[FaceStorage] ✅ Đã nạp thành công {len(self.profiles)} hồ sơ khuôn mặt từ MongoDB ({db_name})!")
                return True
            return False
        except Exception as e:
            print(f"[FaceStorage] ⚠️ Lỗi đọc dữ liệu từ MongoDB: {e}")
            if client:
                client.close()
            return False
            return False

    def _load_from_json(self):
        # Tự động sao chép file vector DB ban đầu từ code ra thư mục lưu trữ ngoài nếu chưa tồn tại
        seed_db = settings.BASE_DIR / "data" / "faces_vector_db.json"
        if not self.db_file.exists() and seed_db.exists() and seed_db != self.db_file:
            try:
                import shutil
                self.db_file.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(seed_db, self.db_file)
                print(f"[FaceStorage] 📋 Đã tự động khởi tạo vector DB ban đầu sang: {self.db_file}")
            except Exception as se:
                print(f"[FaceStorage] Ghi chú đồng bộ vector DB ban đầu: {se}")

        if self.db_file.exists():
            try:
                with open(self.db_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.profiles = data.get("profiles", {})
                    print(f"[FaceStorage] Đã nạp {len(self.profiles)} hồ sơ từ cache JSON ({self.db_file}).")
            except Exception as e:
                print(f"[FaceStorage] Error loading JSON vector DB: {e}")
                self.profiles = {}
        else:
            self.profiles = {}

    def _save_to_json(self):
        try:
            self.db_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.db_file, "w", encoding="utf-8") as f:
                json.dump({"profiles": self.profiles, "updated_at": datetime.now().isoformat()}, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[FaceStorage] Error saving vector DB JSON: {e}")

    def _migrate_json_to_mongodb(self):
        """Migrates local JSON profiles into MongoDB."""
        for emp_id, p in self.profiles.items():
            embeddings = {}
            for angle, vec in p.get("embeddings", {}).items():
                embeddings[angle] = np.array(vec, dtype=np.float32)
            if not embeddings and p.get("embedding"):
                embeddings["straight"] = np.array(p["embedding"], dtype=np.float32)

            self._save_to_mongodb(
                employee_id=emp_id,
                full_name=p.get("full_name"),
                department=p.get("department"),
                embeddings=embeddings,
                image_paths=p.get("image_paths") or {"straight": p.get("image_path")}
            )

    def _save_to_mongodb(
        self,
        employee_id: str,
        full_name: Optional[str],
        department: Optional[str],
        embeddings: Dict[str, np.ndarray],
        image_paths: Optional[Dict[str, str]] = None,
        company_id: str = "CP01",
        shift_id: str = "CA_HANH_CHINH"
    ) -> bool:
        """Saves employee record and all face embeddings directly into MongoDB."""
        client, collection = self._get_collection()
        if collection is None:
            return False

        try:
            primary_avatar = None
            if image_paths:
                primary_avatar = image_paths.get("straight") or next(iter(image_paths.values()), None)

            face_embeddings_list = []
            face_angles = {}
            for angle, vec in embeddings.items():
                if vec is not None:
                    vec_list = [float(x) for x in vec.tolist()]
                    face_angles[angle] = vec_list
                    img_path = image_paths.get(angle) if image_paths else None
                    face_embeddings_list.append({
                        "angle_type": angle,
                        "embedding": vec_list,
                        "image_path": img_path,
                        "created_at": datetime.now()
                    })

            user_id_str = str(employee_id)
            is_valid_oid = len(user_id_str) == 24 and all(c in '0123456789abcdefABCDEF' for c in user_id_str)
            if is_valid_oid:
                try:
                    from bson import ObjectId
                    query_filter = {
                        "$or": [
                            {"_id": ObjectId(user_id_str)},
                            {"email": user_id_str},
                            {"employee_id": user_id_str}
                        ]
                    }
                except Exception:
                    query_filter = {"$or": [{"email": user_id_str}, {"employee_id": user_id_str}]}
            else:
                query_filter = {"$or": [{"email": user_id_str}, {"employee_id": user_id_str}]}

            update_doc = {
                "isFaceRegistered": True,
                "faceRegisteredAt": datetime.now(),
                "face_embeddings": face_embeddings_list,
                "is_active": True
            }
            if full_name:
                update_doc["fullName"] = full_name
            if department:
                update_doc["department"] = department
            if primary_avatar:
                update_doc["facePhoto"] = primary_avatar
                update_doc["avatar_url"] = primary_avatar
            if face_angles:
                update_doc["faceAngles"] = face_angles
                if "straight" in face_angles:
                    update_doc["faceDescriptor"] = face_angles["straight"]
            if image_paths:
                update_doc["faceAnglePhotos"] = image_paths

            res = collection.update_one(query_filter, {"$set": update_doc})
            if res.matched_count == 0:
                collection.update_one(
                    {"employee_id": user_id_str},
                    {"$set": update_doc, "$setOnInsert": {"created_at": datetime.now()}},
                    upsert=True
                )

            client.close()
            print(f"[FaceStorage] 💾 Đã lưu thành công dữ liệu khuôn mặt cho '{employee_id}' vào MongoDB!")
            return True
        except Exception as e:
            print(f"[FaceStorage] ❌ Lỗi khi lưu vào MongoDB: {e}")
            if client:
                client.close()
            return False

    def save_face(
        self,
        employee_id: str,
        embedding: np.ndarray,
        full_name: Optional[str] = None,
        department: Optional[str] = None,
        image_path: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Saves a single-angle face embedding."""
        return self.save_face_multi_angle(
            employee_id=employee_id,
            embeddings={"straight": embedding},
            full_name=full_name,
            department=department,
            image_paths={"straight": image_path} if image_path else None,
            metadata=metadata
        )

    def save_face_multi_angle(
        self,
        employee_id: str,
        embeddings: Dict[str, np.ndarray],
        full_name: Optional[str] = None,
        department: Optional[str] = None,
        image_paths: Optional[Dict[str, str]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Saves multi-angle face embeddings directly into MongoDB and updates memory state.
        """
        now_str = datetime.now().isoformat()
        embeddings_json = {}
        all_vecs = []

        for angle, vec in embeddings.items():
            if vec is not None:
                vec_list = [float(x) for x in vec.tolist()]
                embeddings_json[angle] = vec_list
                all_vecs.append(vec)

        if all_vecs:
            avg_vec = np.mean(all_vecs, axis=0)
            avg_norm = np.linalg.norm(avg_vec)
            if avg_norm > 1e-6:
                avg_vec = avg_vec / avg_norm
            primary_embedding = [float(x) for x in avg_vec.tolist()]
        else:
            primary_embedding = []

        registered_angles = list(embeddings_json.keys())
        primary_image = image_paths.get("straight") if image_paths else None
        if not primary_image and image_paths:
            primary_image = next(iter(image_paths.values()), None)

        # 1. Update in-memory profile
        self.profiles[employee_id] = {
            "employee_id": employee_id,
            "full_name": full_name or employee_id,
            "department": department or "N/A",
            "image_path": primary_image,
            "image_paths": image_paths or {},
            "created_at": now_str,
            "metadata": metadata or {},
            "embedding": primary_embedding,
            "embeddings": embeddings_json,
            "registered_angles": registered_angles
        }

        # 2. Save directly to MongoDB
        if self.use_mongodb:
            self._save_to_mongodb(
                employee_id=employee_id,
                full_name=full_name,
                department=department,
                embeddings=embeddings,
                image_paths=image_paths
            )

        # 3. Backup to JSON
        self._save_to_json()
        return True

    def get_face(self, employee_id: str) -> Optional[Dict[str, Any]]:
        return self.profiles.get(employee_id)

    def get_face_vectors(self, employee_id: str) -> List[Tuple[str, np.ndarray]]:
        """Returns list of (angle_name, numpy_vector) for an employee."""
        profile = self.get_face(employee_id)
        if not profile:
            return []
        vectors = []
        if "embeddings" in profile and isinstance(profile["embeddings"], dict):
            for angle, vec in profile["embeddings"].items():
                if vec:
                    vectors.append((angle, np.array(vec, dtype=np.float32)))
        elif "embedding" in profile and profile["embedding"]:
            vectors.append(("straight", np.array(profile["embedding"], dtype=np.float32)))
        return vectors

    def delete_face(self, employee_id: str) -> bool:
        """Deletes face and employee from MongoDB and memory."""
        to_delete = []
        for k, v in self.profiles.items():
            if (k == employee_id or 
                v.get("user_id") == employee_id or 
                v.get("employee_id") == employee_id or 
                v.get("email") == employee_id):
                to_delete.append(k)
        for k in to_delete:
            del self.profiles[k]
        self._save_to_json()

        if self.use_mongodb:
            client, collection = self._get_collection()
            if collection is not None:
                try:
                    user_id_str = str(employee_id)
                    is_valid_oid = len(user_id_str) == 24 and all(c in '0123456789abcdefABCDEF' for c in user_id_str)
                    if is_valid_oid:
                        try:
                            from bson import ObjectId
                            query_filter = {"$or": [{"_id": ObjectId(user_id_str)}, {"email": user_id_str}, {"employee_id": user_id_str}]}
                        except Exception:
                            query_filter = {"$or": [{"email": user_id_str}, {"employee_id": user_id_str}]}
                    else:
                        query_filter = {"$or": [{"email": user_id_str}, {"employee_id": user_id_str}]}

                    collection.update_one(
                        query_filter,
                        {"$set": {
                            "isFaceRegistered": False,
                            "faceRegisteredAt": None,
                            "facePhoto": "",
                            "faceAngles": {"straight": [], "left": [], "right": [], "up": [], "down": []},
                            "faceAnglePhotos": {"straight": "", "left": "", "right": "", "up": "", "down": ""},
                            "faceDescriptor": [],
                            "face_embeddings": []
                        }}
                    )
                    client.close()
                    print(f"[FaceStorage] 🗑️ Đã xóa khuôn mặt '{employee_id}' khỏi MongoDB!")
                except Exception as e:
                    print(f"[FaceStorage] Lỗi khi xóa khỏi MongoDB: {e}")
                    if client:
                        client.close()
        return True

    def clear_all(self, delete_images: bool = False) -> int:
        """Purges local cache and reloads ONLY genuine profiles from crm_deepcode_db."""
        count = len(self.profiles)
        self.profiles = {}
        if self.db_file.exists():
            try:
                self.db_file.unlink()
            except Exception:
                pass

        # Delete image files in registered_faces
        if delete_images:
            reg_dir = settings.DATA_DIR / "registered_faces"
            if reg_dir.exists():
                for img_file in reg_dir.glob("*.*"):
                    try:
                        img_file.unlink()
                    except Exception as e:
                        print(f"[FaceStorage] Error removing image {img_file}: {e}")

        # Reload clean from MongoDB crm_deepcode_db
        self._load_from_mongodb()
        print(f"[FaceStorage] 🧹 Đã xoá sạch cache dữ liệu cũ và đồng bộ lại {len(self.profiles)} tài khoản CRM chuẩn!")
        return count

    def list_faces(self) -> List[EmployeeFaceProfile]:
        seen_users = set()
        res = []
        for emp_id, p in self.profiles.items():
            u_id = p.get("user_id") or p.get("employee_id") or emp_id
            if u_id in seen_users:
                continue
            seen_users.add(u_id)
            angles = p.get("registered_angles", ["straight"])
            res.append(EmployeeFaceProfile(
                employee_id=u_id,
                full_name=p.get("full_name"),
                department=p.get("department"),
                created_at=p.get("created_at", ""),
                image_path=p.get("image_path"),
                embedding_dim=len(p.get("embedding", [])),
                registered_angles=angles
            ))
        return res

    def search_similar_faces(
        self,
        query_embedding: np.ndarray,
        top_k: int = 5,
        threshold: float = settings.SIMILARITY_THRESHOLD
    ) -> List[FaceRecognitionCandidate]:
        """
        Calculates cosine similarities across ALL stored angles for every employee
        and returns the best matching candidate and angle.
        """
        if query_embedding is None or len(self.profiles) == 0:
            return []

        query_norm = np.linalg.norm(query_embedding)
        if query_norm == 0:
            return []
        norm_query = query_embedding / query_norm

        candidates: List[Tuple[str, str, float, str]] = []
        seen_users = set()

        for emp_id, profile in self.profiles.items():
            u_id = profile.get("user_id") or profile.get("employee_id") or emp_id
            if u_id in seen_users:
                continue
            seen_users.add(u_id)

            best_sim_for_user = 0.0
            best_angle_for_user = "straight"

            # Check all registered angles
            vectors = self.get_face_vectors(emp_id)
            for angle_name, db_vec in vectors:
                db_norm = np.linalg.norm(db_vec)
                if db_norm == 0 or len(norm_query) != len(db_vec):
                    continue
                sim = float(np.dot(norm_query, db_vec / db_norm))
                sim = float(np.clip(sim, 0.0, 1.0))
                if sim > best_sim_for_user:
                    best_sim_for_user = sim
                    best_angle_for_user = angle_name

            candidates.append((u_id, profile.get("full_name", u_id), best_sim_for_user, best_angle_for_user))

        candidates.sort(key=lambda x: x[2], reverse=True)

        results = []
        for emp_id, full_name, sim, matched_angle in candidates[:top_k]:
            results.append(FaceRecognitionCandidate(
                employee_id=emp_id,
                full_name=full_name,
                similarity=round(sim, 4),
                matched_angle=matched_angle
            ))

        return results
