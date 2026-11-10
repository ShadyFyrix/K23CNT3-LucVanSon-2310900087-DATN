import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import {
  Maximize2,
  Minimize2,
  RotateCcw,
  Camera,
  Eye,
  Sliders,
  ShieldAlert,
  ShieldCheck,
  Video,
  Info,
  RefreshCw,
  Compass,
  Monitor,
  Volume2
} from 'lucide-react';

export interface StudentSeat {
  _id: string;
  candidateCode?: string;
  blindCode?: string;
  seatRow?: number;
  seatCol?: number;
  seatPin?: string;
  status?: string;
  trustScore?: number;
  isOnline?: boolean;
  extraTimeMinutes?: number;
  student?: {
    fullName?: string;
    name?: string;
    studentCode?: string;
  };
  proctorOverrideUntil?: string | null;
  isLateUnlocked?: boolean;
  [key: string]: any;
}

export interface ExamRoom3DProps {
  room: any;
  session?: any;
  students?: any[];
  violations?: any[];
  postureAlerts?: Record<string, { event: string; severity: string; time: number }>;
  onSelectSeat?: (student: any) => void;
  selectedSeat?: any;
  height?: string | number;
}

export function ExamRoom3D({
  room,
  session,
  students = [],
  violations = [],
  postureAlerts = {},
  onSelectSeat,
  selectedSeat,
  height = '620px'
}: ExamRoom3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  // Điều khiển camera & hiển thị
  const [cameraMode, setCameraMode] = useState<'OVERVIEW' | 'PROCTOR' | 'CCTV' | 'FREE'>('OVERVIEW');
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [hoveredDesk, setHoveredDesk] = useState<any>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Map vị trí sinh viên
  const seatMap = useMemo(() => {
    const map: Record<string, StudentSeat> = {};
    students.forEach(st => {
      map[`${st.seatRow}-${st.seatCol}`] = st;
    });
    return map;
  }, [students]);

  // Cấu hình kích thước phòng
  const rows = room?.rows || 4;
  const cols = room?.cols || 6;
  const splitCol = room?.layoutConfig?.aisles?.[0] || Math.ceil(cols / 2);
  const disabledSeats = useMemo(() => room?.layoutConfig?.disabledSeats || [], [room]);
  const customLabels = useMemo(() => room?.layoutConfig?.customLabels || {}, [room]);

  // Refs Three.js
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const deskMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const screenMaterialsRef = useRef<Map<string, THREE.MeshStandardMaterial>>(new Map());
  const beaconMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const sphericalRef = useRef({ radius: 24, theta: Math.PI / 4, phi: Math.PI / 3.2 });
  const targetLookAtRef = useRef(new THREE.Vector3(0, 0, 0));

  // ── KHỞI TẠO THREE.JS SCENE ──
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const heightPx = typeof height === 'number' ? height : parseInt(String(height)) || 620;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d); // Deep dark space cyan
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.015);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / heightPx, 0.1, 150);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lights (Ánh sáng phòng thi)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xcceeff, 1.2);
    dirLight.position.set(15, 25, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 70;
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    scene.add(dirLight);

    // Đèn hắt bục giảng phía trước
    const podiumLight = new THREE.PointLight(0x00ffff, 1.5, 25);
    podiumLight.position.set(0, 6, -12);
    scene.add(podiumLight);

    // Đèn sàn mềm
    const floorLight = new THREE.DirectionalLight(0x1a365d, 0.6);
    floorLight.position.set(-15, 10, -15);
    scene.add(floorLight);

    // 5. DỰNG KIẾN TRÚC PHÒNG THI (FLOOR, WALLS, DOORS, WHITEBOARD)
    const roomWidth = cols * 2.8 + 8;
    const roomLength = rows * 3.0 + 10;
    const wallHeight = 7.5;

    // 5.1 Sàn nhà (Floor)
    const floorGeo = new THREE.PlaneGeometry(roomWidth, roomLength);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.35,
      metalness: 0.25
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Lưới gạch sàn công nghệ cao (Grid Helper)
    const grid = new THREE.GridHelper(Math.max(roomWidth, roomLength), Math.round(Math.max(roomWidth, roomLength)), 0x06b6d4, 0x1e293b);
    grid.position.y = 0.01;
    scene.add(grid);

    // 5.2 Bức tường phía trước (Front Wall) với BẢNG TRẮNG
    const frontWallGeo = new THREE.PlaneGeometry(roomWidth, wallHeight);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const frontWall = new THREE.Mesh(frontWallGeo, wallMat);
    frontWall.position.set(0, wallHeight / 2, -roomLength / 2);
    scene.add(frontWall);

    // BẢNG TRẮNG (WHITEBOARD) treo tường chính diện
    const boardWidth = Math.min(roomWidth * 0.45, 9);
    const boardHeight = 3.2;
    const boardGeo = new THREE.BoxGeometry(boardWidth, boardHeight, 0.1);
    const boardMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.1 });
    const whiteboard = new THREE.Mesh(boardGeo, boardMat);
    whiteboard.position.set(0, 3.8, -roomLength / 2 + 0.12);
    whiteboard.castShadow = true;
    scene.add(whiteboard);

    // Viền nhôm của bảng
    const frameGeo = new THREE.BoxGeometry(boardWidth + 0.2, boardHeight + 0.2, 0.08);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8, roughness: 0.2 });
    const boardFrame = new THREE.Mesh(frameGeo, frameMat);
    boardFrame.position.set(0, 3.8, -roomLength / 2 + 0.08);
    scene.add(boardFrame);

    // Khay đựng bút viết
    const trayGeo = new THREE.BoxGeometry(boardWidth * 0.7, 0.15, 0.3);
    const trayMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7 });
    const markerTray = new THREE.Mesh(trayGeo, trayMat);
    markerTray.position.set(0, 3.8 - boardHeight / 2 - 0.08, -roomLength / 2 + 0.2);
    scene.add(markerTray);

    // 5.3 BỤC GIẢNG & BÀN GIÁM THỊ (PROCTOR STATION)
    const podiumPlatformGeo = new THREE.BoxGeometry(6, 0.35, 3.5);
    const podiumPlatformMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
    const podiumPlatform = new THREE.Mesh(podiumPlatformGeo, podiumPlatformMat);
    podiumPlatform.position.set(0, 0.175, -roomLength / 2 + 3.2);
    podiumPlatform.receiveShadow = true;
    podiumPlatform.castShadow = true;
    scene.add(podiumPlatform);

    // Bàn giám thị
    const pDeskGeo = new THREE.BoxGeometry(2.8, 1.1, 1.2);
    const pDeskMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const proctorDesk = new THREE.Mesh(pDeskGeo, pDeskMat);
    proctorDesk.position.set(0, 0.9, -roomLength / 2 + 3.2);
    proctorDesk.castShadow = true;
    scene.add(proctorDesk);

    // Laptop giám thị
    const laptopBaseGeo = new THREE.BoxGeometry(0.7, 0.05, 0.5);
    const laptopMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
    const laptopBase = new THREE.Mesh(laptopBaseGeo, laptopMat);
    laptopBase.position.set(0, 1.5, -roomLength / 2 + 3.2);
    scene.add(laptopBase);

    const laptopScreenGeo = new THREE.BoxGeometry(0.7, 0.45, 0.04);
    const laptopScreenMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.8
    });
    const laptopScreen = new THREE.Mesh(laptopScreenGeo, laptopScreenMat);
    laptopScreen.position.set(0, 1.75, -roomLength / 2 + 3.0);
    laptopScreen.rotation.x = -Math.PI / 12;
    scene.add(laptopScreen);

    // 5.4 CỬA RA VÀO BẰNG KÍNH (GLASS DOOR) - GÓC TRƯỚC BÊN TRÁI
    const doorFrameGeo = new THREE.BoxGeometry(0.2, 4.2, 2.2);
    const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
    const doorFrame = new THREE.Mesh(doorFrameGeo, doorFrameMat);
    doorFrame.position.set(-roomWidth / 2 + 0.1, 2.1, -roomLength / 2 + 4.5);
    scene.add(doorFrame);

    const doorGlassGeo = new THREE.BoxGeometry(0.08, 4.0, 2.0);
    const doorGlassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.9
    });
    const doorGlass = new THREE.Mesh(doorGlassGeo, doorGlassMat);
    doorGlass.position.set(-roomWidth / 2 + 0.1, 2.1, -roomLength / 2 + 4.5);
    scene.add(doorGlass);

    // Đèn Exit xanh lá trên cửa
    const exitSignGeo = new THREE.BoxGeometry(0.3, 0.35, 1.0);
    const exitSignMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 1.0
    });
    const exitSign = new THREE.Mesh(exitSignGeo, exitSignMat);
    exitSign.position.set(-roomWidth / 2 + 0.2, 4.5, -roomLength / 2 + 4.5);
    scene.add(exitSign);

    // 5.5 TƯỜNG PHẢI - LOGO STEAM / TRANG TRÍ
    const steamPanelGeo = new THREE.BoxGeometry(0.1, 2.5, 5.0);
    const steamPanelMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      roughness: 0.4
    });
    const steamPanel = new THREE.Mesh(steamPanelGeo, steamPanelMat);
    steamPanel.position.set(roomWidth / 2 - 0.1, 3.5, -2);
    scene.add(steamPanel);

    // ── VÒNG LẶP RENDER & CẬP NHẬT GÓC CAMERA ──
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Tự động xoay nếu bật
      if (autoRotate && cameraMode === 'FREE') {
        sphericalRef.current.theta += 0.003;
      }

      // Cập nhật vị trí camera từ spherical coordinates
      if (cameraMode === 'FREE' || cameraMode === 'OVERVIEW') {
        const { radius, theta, phi } = sphericalRef.current;
        camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
        camera.position.y = radius * Math.cos(phi);
        camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
        camera.lookAt(targetLookAtRef.current);
      }

      // Xoay các vòng pulsing beacon vi phạm
      beaconMeshesRef.current.forEach((mesh) => {
        mesh.rotation.y += 0.04;
        const scale = 1 + Math.sin(Date.now() * 0.008) * 0.15;
        mesh.scale.set(scale, 1, scale);
      });

      renderer.render(scene, camera);
    };

    animate();

    // ── RESIZE LISTENER ──
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newWidth = container.clientWidth;
      const newHeight = typeof height === 'number' ? height : parseInt(String(height)) || 620;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    // ── WHEEL ZOOM LISTENER (NON-PASSIVE ĐỂ ZOOM MƯỢT KHÔNG LỖI PREVENTDEFAULT) ──
    const handleNativeWheel = (e: WheelEvent) => {
      if (e.cancelable) {
        try {
          e.preventDefault();
        } catch (_) {}
      }
      sphericalRef.current.radius = Math.max(8, Math.min(45, sphericalRef.current.radius + e.deltaY * 0.02));
    };

    container.addEventListener('wheel', handleNativeWheel, { passive: false });
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('wheel', handleNativeWheel);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [rows, cols, height]);

  // ── DỰNG & CẬP NHẬT CÁC BÀN THI 3D (DESKS, CHAIRS, SCREENS & TELEMETRY) ──
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Xóa các bàn cũ
    deskMeshesRef.current.forEach(group => scene.remove(group));
    deskMeshesRef.current.clear();
    screenMaterialsRef.current.clear();
    beaconMeshesRef.current.clear();

    const spacingX = 2.4;
    const spacingZ = 2.8;
    const aisleWidth = 1.6;

    // Vật liệu dùng chung
    const woodTopMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.4 });
    const metalLegMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
    const chairBackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
    const pcCaseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7 });

    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const seatKey = `${r}-${c}`;
        const isDisabled = disabledSeats.includes(seatKey);
        const st = seatMap[seatKey];
        const label = customLabels[seatKey] || `BÀN ${r}-${c}`;

        // Tính tọa độ không gian 3D
        const isAfterAisle = c > splitCol;
        const posX = (c - 1 - (cols - 1) / 2) * spacingX + (isAfterAisle ? aisleWidth / 2 : -aisleWidth / 2);
        const posZ = (r - 1 - (rows - 1) / 2) * spacingZ + 1.5;

        const deskGroup = new THREE.Group();
        deskGroup.position.set(posX, 0, posZ);
        deskGroup.userData = { seatKey, student: st, label, isDisabled };

        // 1. Mặt bàn gỗ (Desk Top)
        const deskTopGeo = new THREE.BoxGeometry(1.6, 0.08, 0.9);
        const deskTop = new THREE.Mesh(deskTopGeo, isDisabled ? new THREE.MeshStandardMaterial({ color: 0x475569 }) : woodTopMat);
        deskTop.position.y = 1.0;
        deskTop.castShadow = true;
        deskTop.receiveShadow = true;
        deskGroup.add(deskTop);

        // 4 Chân bàn kim loại (Legs)
        const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.0, 8);
        const legPositions = [
          [-0.7, 0.5, -0.35],
          [0.7, 0.5, -0.35],
          [-0.7, 0.5, 0.35],
          [0.7, 0.5, 0.35]
        ];
        legPositions.forEach(([lx, ly, lz]) => {
          const leg = new THREE.Mesh(legGeo, metalLegMat);
          leg.position.set(lx, ly, lz);
          deskGroup.add(leg);
        });

        // 2. Màn hình máy tính (Computer Monitor)
        const monitorStandGeo = new THREE.BoxGeometry(0.1, 0.25, 0.1);
        const stand = new THREE.Mesh(monitorStandGeo, metalLegMat);
        stand.position.set(0, 1.15, -0.15);
        deskGroup.add(stand);

        const monitorFrameGeo = new THREE.BoxGeometry(0.85, 0.55, 0.04);
        const monitorFrame = new THREE.Mesh(monitorFrameGeo, pcCaseMat);
        monitorFrame.position.set(0, 1.45, -0.15);
        deskGroup.add(monitorFrame);

        // Màn hình phát sáng theo trạng thái Telemetry
        let screenColor = 0x334155; // Mặc định tắt
        let emissiveColor = 0x000000;
        let emissiveIntensity = 0;

        const activePosture = st && postureAlerts[st._id];

        if (isDisabled) {
          screenColor = 0x1e293b;
        } else if (st) {
          if (activePosture || st.trustScore < 60 || st.status === 'SUSPENDED') {
            screenColor = 0xef4444; // Đỏ vi phạm
            emissiveColor = 0xef4444;
            emissiveIntensity = 1.2;
          } else if (st.trustScore < 85) {
            screenColor = 0xf59e0b; // Vàng cảnh báo
            emissiveColor = 0xf59e0b;
            emissiveIntensity = 0.9;
          } else if (st.proctorOverrideUntil && new Date(st.proctorOverrideUntil) > new Date()) {
            screenColor = 0xa855f7; // Tím override
            emissiveColor = 0xa855f7;
            emissiveIntensity = 1.0;
          } else if (st.status === 'IN_EXAM') {
            screenColor = 0x06b6d4; // Xanh ngọc làm bài
            emissiveColor = 0x06b6d4;
            emissiveIntensity = 0.8;
          } else {
            screenColor = 0x10b981; // Xanh lá sẵn sàng
            emissiveColor = 0x10b981;
            emissiveIntensity = 0.5;
          }
        }

        const screenMat = new THREE.MeshStandardMaterial({
          color: screenColor,
          emissive: emissiveColor,
          emissiveIntensity: emissiveIntensity,
          roughness: 0.2
        });
        screenMaterialsRef.current.set(seatKey, screenMat);

        const screenGeo = new THREE.PlaneGeometry(0.8, 0.5);
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(0, 1.45, -0.125);
        deskGroup.add(screen);

        // Bàn phím & Chuột
        const keyboardGeo = new THREE.BoxGeometry(0.5, 0.015, 0.18);
        const keyboard = new THREE.Mesh(keyboardGeo, pcCaseMat);
        keyboard.position.set(-0.05, 1.05, 0.15);
        deskGroup.add(keyboard);

        // 3. Ghế lưới văn phòng (Office Mesh Chair)
        const chairGroup = new THREE.Group();
        chairGroup.position.set(0, 0, 0.65);

        const seatCushionGeo = new THREE.BoxGeometry(0.65, 0.08, 0.6);
        const seatCushion = new THREE.Mesh(seatCushionGeo, chairBackMat);
        seatCushion.position.y = 0.65;
        chairGroup.add(seatCushion);

        const backrestGeo = new THREE.BoxGeometry(0.6, 0.75, 0.06);
        const backrest = new THREE.Mesh(backrestGeo, chairBackMat);
        backrest.position.set(0, 1.05, 0.28);
        chairGroup.add(backrest);

        const chairStemGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8);
        const chairStem = new THREE.Mesh(chairStemGeo, metalLegMat);
        chairStem.position.y = 0.3;
        chairGroup.add(chairStem);

        deskGroup.add(chairGroup);

        // 4. Hải đăng vi phạm 3D (Violation Pulsing Beacon) nếu có cảnh báo nghiêm trọng
        if (st && (activePosture || st.trustScore < 80)) {
          const beaconGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.15, 16);
          const beaconMat = new THREE.MeshBasicMaterial({
            color: activePosture ? 0xef4444 : 0xf59e0b,
            transparent: true,
            opacity: 0.55,
            wireframe: true
          });
          const beacon = new THREE.Mesh(beaconGeo, beaconMat);
          beacon.position.set(0, 2.3, 0);
          deskGroup.add(beacon);
          beaconMeshesRef.current.set(seatKey, beacon);
        }

        scene.add(deskGroup);
        deskMeshesRef.current.set(seatKey, deskGroup);
      }
    }
  }, [rows, cols, splitCol, disabledSeats, seatMap, postureAlerts, customLabels]);

  // ── XỬ LÝ CHỌN GÓC CAMERA CÀI SẴN (CAMERA PRESETS) ──
  const setCameraPreset = (mode: 'OVERVIEW' | 'PROCTOR' | 'CCTV' | 'FREE') => {
    setCameraMode(mode);
    setAutoRotate(false);

    if (mode === 'OVERVIEW') {
      sphericalRef.current = { radius: 25, theta: Math.PI / 4, phi: Math.PI / 3.2 };
      targetLookAtRef.current.set(0, 0, 0);
    } else if (mode === 'PROCTOR') {
      // Góc nhìn từ bục giảng giám thị nhìn xuống toàn bộ lớp học
      const roomLength = rows * 3.0 + 10;
      sphericalRef.current = { radius: 2.5, theta: 0, phi: Math.PI / 2.2 };
      cameraRef.current?.position.set(0, 3.2, -roomLength / 2 + 3.5);
      cameraRef.current?.lookAt(0, 1.2, 5);
      targetLookAtRef.current.set(0, 1.2, 5);
    } else if (mode === 'CCTV') {
      // Góc nhìn Camera an ninh CCTV trên cao góc phòng
      const roomWidth = cols * 2.8 + 8;
      const roomLength = rows * 3.0 + 10;
      cameraRef.current?.position.set(-roomWidth / 2 + 1, 9.5, -roomLength / 2 + 1);
      cameraRef.current?.lookAt(0, 1.0, 2);
      targetLookAtRef.current.set(0, 1.0, 2);
    }
  };

  // ── CHUỘT XOAY & ZOOM 3D (ORBIT INTERACTION) ──
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    prevMouseRef.current = { x: e.clientX, y: e.clientY };
    if (cameraMode !== 'FREE') setCameraMode('FREE');
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const container = mountRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }

    if (!isDraggingRef.current) {
      // RAYCASTING: Kiểm tra hover vào bàn nào
      if (!mountRef.current || !cameraRef.current || !sceneRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);

      const intersects = raycaster.intersectObjects(sceneRef.current.children, true);
      let foundDesk = null;
      for (const hit of intersects) {
        let cur: THREE.Object3D | null = hit.object;
        while (cur && cur.parent && !cur.userData?.seatKey) {
          cur = cur.parent;
        }
        if (cur?.userData?.seatKey) {
          foundDesk = cur.userData;
          break;
        }
      }
      setHoveredDesk(foundDesk);
      return;
    }

    const deltaX = e.clientX - prevMouseRef.current.x;
    const deltaY = e.clientY - prevMouseRef.current.y;
    prevMouseRef.current = { x: e.clientX, y: e.clientY };

    // Điều chỉnh góc cầu (Spherical coordinates)
    sphericalRef.current.theta -= deltaX * 0.007;
    sphericalRef.current.phi = Math.max(0.15, Math.min(Math.PI / 2.05, sphericalRef.current.phi - deltaY * 0.007));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Click vào bàn để chọn thí sinh
  const handleClick = () => {
    if (hoveredDesk?.student && onSelectSeat) {
      onSelectSeat(hoveredDesk.student);
    }
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 shadow-2xl select-none group">
      {/* ── 3D CANVAS MOUNT ── */}
      <div
        ref={mountRef}
        style={{ height }}
        className="w-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
      />

      {/* ── WATERMARK CCTV OVERLAY (KHI BẬT GÓC CAMERA CCTV) ── */}
      {cameraMode === 'CCTV' && (
        <div className="absolute top-4 left-4 pointer-events-none flex items-center space-x-2 bg-slate-950/80 border border-slate-700/60 px-3 py-1.5 rounded-xl text-xs font-mono text-emerald-400 backdrop-blur-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
          <span>REC ● CCTV CAM-01 (ROOM 3D STREAM)</span>
          <span className="text-slate-400 ml-2">FPS: 30.0</span>
        </div>
      )}

      {/* ── TOOLBAR ĐIỀU KHIỂN GÓC NHÌN CAMERA 3D ── */}
      <div className="absolute top-4 right-4 flex items-center space-x-1.5 bg-slate-900/90 border border-slate-700/80 p-1.5 rounded-2xl shadow-xl backdrop-blur-md">
        <button
          type="button"
          onClick={() => setCameraPreset('OVERVIEW')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
            cameraMode === 'OVERVIEW' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Góc nhìn toàn cảnh 45 độ"
        >
          <Compass className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Toàn Cảnh</span>
        </button>

        <button
          type="button"
          onClick={() => setCameraPreset('PROCTOR')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
            cameraMode === 'PROCTOR' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Góc nhìn từ bục giảng giám thị phía trước"
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Bục Giảng</span>
        </button>

        <button
          type="button"
          onClick={() => setCameraPreset('CCTV')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
            cameraMode === 'CCTV' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Góc nhìn camera CCTV an ninh từ góc tường"
        >
          <Camera className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">CCTV Góc</span>
        </button>

        <button
          type="button"
          onClick={() => setAutoRotate(!autoRotate)}
          className={`p-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            autoRotate ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
          }`}
          title={autoRotate ? 'Dừng xoay tự động' : 'Bật xoay phòng tự động'}
        >
          <RotateCcw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── TOOLTIP HOVER THÔNG TIN BÀN THI 3D ── */}
      {hoveredDesk && (
        <div
          className="absolute pointer-events-none z-30 bg-slate-900/95 border border-cyan-500/40 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs text-white max-w-xs transition-opacity duration-150 animate-in fade-in"
          style={{
            left: Math.min(window.innerWidth - 240, mousePos.x + 15),
            top: Math.max(10, mousePos.y - 70)
          }}
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-700/60 pb-1.5 mb-1.5">
            <span className="font-mono font-bold text-cyan-400">{hoveredDesk.label}</span>
            <span className="text-[10px] font-mono text-slate-400">Tọa độ: {hoveredDesk.seatKey}</span>
          </div>

          {hoveredDesk.isDisabled ? (
            <p className="text-rose-400 font-bold text-[11px]">Bàn này đang bị tạm khóa hoặc hỏng máy</p>
          ) : hoveredDesk.student ? (
            <div className="space-y-1">
              <p className="font-bold text-slate-100">{hoveredDesk.student.student?.fullName || 'Thí sinh'}</p>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">SBD: {hoveredDesk.student.candidateCode}</span>
                <span className={`font-mono font-bold ${hoveredDesk.student.trustScore >= 80 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  Uy tín: {hoveredDesk.student.trustScore}đ
                </span>
              </div>
              <p className="text-[10px] text-cyan-300 font-medium pt-0.5">Nhấp để mở bảng điều khiển thí sinh này ➔</p>
            </div>
          ) : (
            <p className="text-slate-400 italic text-[11px]">Bàn thi trống (Chưa có thí sinh gán chỗ)</p>
          )}
        </div>
      )}

      {/* ── FOOTER CHÚ GIẢI TRẠNG THÁI 3D ── */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center space-x-3 bg-slate-900/85 border border-slate-800 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-slate-300 backdrop-blur-md pointer-events-auto">
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-xs"></span>
            <span>Đang thi</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-xs"></span>
            <span>Cảnh báo</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-xs"></span>
            <span>Vi phạm (Beacon)</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-xs"></span>
            <span>Giám thị tại bàn</span>
          </span>
        </div>

        <div className="bg-slate-900/85 border border-slate-800 px-3 py-1.5 rounded-xl text-[10px] font-mono text-slate-400 backdrop-blur-md pointer-events-auto flex items-center space-x-2">
          <span>💡 Kéo chuột trái để xoay 360° • Lăn chuột để Zoom</span>
        </div>
      </div>
    </div>
  );
}
