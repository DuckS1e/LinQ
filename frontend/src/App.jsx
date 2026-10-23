import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Send,
  Cpu,
  Map,
  BarChart3,
  Plus,
  Eye,
  Sun,
  Moon,
  Database,
  Square,
  Pentagon,
  Trash2,
  Move,
  UserCheck,
  MessageSquare,
  Radar,
  Clock,
  Layers,
  Camera,
  Upload,
  Sparkles,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Volume2,
  Lock,
  FileDown,
  Sliders,
} from 'lucide-react';

// 8 поведенческих паттернов из кейса (events.violation ENUM)
const VIOLATION_TYPES = [
  { id: 0, code: '01', enumKey: 'RUNNING', name: 'Бег по цеху / резкие перемещения' },
  { id: 1, code: '02', enumKey: 'DANGER_PROXIMITY', name: 'Опасное сближение с техникой' },
  { id: 2, code: '03', enumKey: 'PHONE_USAGE', name: 'Использование мобильного телефона' },
  { id: 3, code: '04', enumKey: 'SMOKING_FIRE', name: 'Курение / открытый огонь' },
  { id: 4, code: '05', enumKey: 'FENCE_CLIMBING', name: 'Перелезание через ограждения' },
  { id: 5, code: '06', enumKey: 'NO_HARNESS_HEIGHT', name: 'Работа на высоте без страховки' },
  { id: 6, code: '07', enumKey: 'PERSON_FALL', name: 'Падение человека / неподвижность' },
  { id: 7, code: '08', enumKey: 'CARGO_VIOLATION', name: 'Переноска груза с нарушением правил' },
];

// Таблица users и roles (Роли 1 и 7 имеют полный доступ к настройке участков и камер)
const DB_USERS = [
  { id: 1, login: 'mikhalyich_ot', full_name: 'Кузьмин М.П. (Специалист по ОТ)', role_id: 1, role_name: 'Роль 1: Специалист по ОТ', canEditRules: true },
  { id: 2, login: 'disp_smena1', full_name: 'Соколов А.В. (Диспетчер ЦУП)', role_id: 3, role_name: 'Роль 3: Диспетчер', canEditRules: false },
  { id: 3, login: 'master_ceh1', full_name: 'Громов И.С. (Мастер смены)', role_id: 2, role_name: 'Роль 2: Мастер участка', canEditRules: false },
  { id: 4, login: 'it_linq_admin', full_name: 'Дехтерюк Д.К. (ИТ-Инженер LinQ)', role_id: 7, role_name: 'Роль 7: ИТ-интегратор', canEditRules: true },
];

const INITIAL_CAMERAS = [
  {
    id: 1,
    code: 'CAM-01',
    site_id: 10,
    site_name: 'Участок №1 — Сборочный цех',
    name: 'Камера 01 (Линия конвейера)',
    cameraType: 'dynamic', // static | dynamic (PTZ)
    panAngle: 0,
    zoomLevel: 1,
    autoPatrol: false,
    rtsp_url: 'rtsp://10.0.114.11:554/linq_stream_01',
    is_active: true,
    created_at: '2026-10-23 08:00:00',
    rulesVector: [0, 1, 1, 0, 1, 0, 1, 0],
    fps: 96,
    latency: '11.2 мс',
    mapPos: { x: 22, y: 26 },
    zones: [
      {
        id: 'z-1',
        type: 'danger',
        shape: 'rect',
        label: 'Опасная зона: Робот-манипулятор',
        rect: { x: 54, y: 34, w: 36, h: 48 },
      },
      {
        id: 'z-2',
        type: 'attention',
        shape: 'rect',
        label: 'Особое внимание: Проход у конвейера',
        rect: { x: 10, y: 42, w: 32, h: 42 },
      },
    ],
  },
  {
    id: 2,
    code: 'CAM-02',
    site_id: 20,
    site_name: 'Участок №2 — Склад и отгрузка',
    name: 'Камера 02 (Зона погрузчиков)',
    cameraType: 'static',
    panAngle: 0,
    zoomLevel: 1,
    autoPatrol: false,
    rtsp_url: 'rtsp://10.0.114.12:554/linq_stream_02',
    is_active: true,
    created_at: '2026-10-23 08:05:00',
    rulesVector: [1, 1, 0, 0, 0, 0, 1, 1],
    fps: 94,
    latency: '11.8 мс',
    mapPos: { x: 52, y: 72 },
    zones: [
      {
        id: 'z-3',
        type: 'danger',
        shape: 'rect',
        label: 'Проезд погрузчика (08:00-12:00)',
        rect: { x: 25, y: 38, w: 48, h: 46 },
      },
    ],
  },
  {
    id: 3,
    code: 'CAM-03',
    site_id: 30,
    site_name: 'Участок №3 — Окрасочная и ГСМ',
    name: 'Камера 03 (Хим. блок)',
    cameraType: 'dynamic',
    panAngle: -15,
    zoomLevel: 1,
    autoPatrol: false,
    rtsp_url: 'rtsp://10.0.114.13:554/linq_stream_03',
    is_active: true,
    created_at: '2026-10-23 08:10:00',
    rulesVector: [0, 0, 0, 1, 1, 1, 1, 0],
    fps: 98,
    latency: '10.5 мс',
    mapPos: { x: 80, y: 64 },
    zones: [],
  },
];

const INITIAL_EVENTS = [
  {
    id: 1042,
    camera_id: 1,
    camera_code: 'CAM-01',
    site_name: 'Участок №1 — Сборочный цех',
    violation: 'PERSON_FALL',
    violation_title: 'Падение человека / неподвижность',
    pattern_code: '07',
    timestamp: '14:05:12',
    frame_url: '/archive/frames/evt_1042_crop.jpg',
    ai_map_url: '/archive/ai_maps/evt_1042_homography.png',
    ai_pos: { x: 68, y: 62 },
    status: 'new',
    processed_by_id: null,
    processed_by_name: 'Ожидает реакции',
    processed_at: null,
    confidence: 0.98,
    description: 'Сотрудник без движения более 3.5 сек у линии сборки',
    severity: 'critical',
  },
  {
    id: 1041,
    camera_id: 2,
    camera_code: 'CAM-02',
    site_name: 'Участок №2 — Склад и отгрузка',
    violation: 'DANGER_PROXIMITY',
    violation_title: 'Опасное сближение с техникой',
    pattern_code: '02',
    timestamp: '13:52:40',
    frame_url: '/archive/frames/evt_1041_crop.jpg',
    ai_map_url: '/archive/ai_maps/evt_1041_homography.png',
    ai_pos: { x: 44, y: 58 },
    status: 'sent_to_master',
    processed_by_id: 2,
    processed_by_name: 'Соколов А.В. (Диспетчер ЦУП)',
    processed_at: '13:52:55',
    confidence: 0.95,
    description: 'Передано мастеру смены Громову И.С.',
    severity: 'warning',
  },
  {
    id: 1040,
    camera_id: 1,
    camera_code: 'CAM-01',
    site_name: 'Участок №1 — Сборочный цех',
    violation: 'PHONE_USAGE',
    violation_title: 'Использование мобильного телефона',
    pattern_code: '03',
    timestamp: '13:18:05',
    frame_url: '/archive/frames/evt_1040_crop.jpg',
    ai_map_url: '/archive/ai_maps/evt_1040_homography.png',
    ai_pos: { x: 26, y: 64 },
    status: 'confirmed',
    processed_by_id: 1,
    processed_by_name: 'Кузьмин М.П. (Специалист по ОТ)',
    processed_at: '13:20:10',
    confidence: 0.92,
    description: 'Зафиксировано в зоне особого внимания у конвейера',
    severity: 'warning',
  },
];

// Почасовая статистика для вкладки Аналитика (Слайд 12: пик нарушений в первые часы смены)
const HOURLY_STATS = [
  { hour: '08:00', count: 14, label: 'Пересменка (Пик)' },
  { hour: '10:00', count: 9, label: 'Утренняя смена' },
  { hour: '12:00', count: 5, label: 'Обед' },
  { hour: '14:00', count: 7, label: 'Дневная смена' },
  { hour: '16:00', count: 4, label: 'Вечер' },
  { hour: '18:00', count: 6, label: 'Сдача смены' },
  { hour: '20:00', count: 11, label: 'Ночная смена' },
];

// ОРИГИНАЛЬНЫЙ БЛОЧНО-ПИКСЕЛЬНЫЙ ЛОГОТИП LinQ (1-в-1 по второму скриншоту)
function LinQOriginalLogo({ isDark }) {
  const mainColor = isDark ? '#FFFFFF' : '#1E242B';
  const bluePixel = '#1D8FE1';
  return (
    <svg
      width="104"
      height="40"
      viewBox="0 0 26 11"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      className="select-none shrink-0"
    >
      {/* Буква L */}
      <path d="M1 1H3V7H6V9H1V1Z" fill={mainColor} />
      {/* Буква i (белая ножка + синий квадрат сверху) */}
      <rect x="8" y="2" width="2" height="2" fill={bluePixel} />
      <rect x="8" y="5" width="2" height="4" fill={mainColor} />
      {/* Буква n со ступенчатым правым плечом как на оригинале */}
      <path d="M11 5H14V6H13V9H11V5Z" fill={mainColor} />
      <rect x="14" y="6" width="2" height="3" fill={mainColor} />
      {/* Буква Q (высокий прямоугольный блок со ступенькой в правом верхнем углу) */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17 1H21V2H23V9H17V1ZM19 3H21V7H19V3Z"
        fill={mainColor}
      />
      {/* Синий пиксель в правом нижнем углу буквы Q */}
      <rect x="23" y="9" width="2" height="2" fill={bluePixel} />
    </svg>
  );
}

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const [eyeComfort, setEyeComfort] = useState(false);
  const [activeTab, setActiveTab] = useState('monitoring'); // monitoring | map_rules | analytics | db_inspector

  const [currentUser, setCurrentUser] = useState(DB_USERS[0]);
  const [cameras, setCameras] = useState(INITIAL_CAMERAS);
  const [selectedCamId, setSelectedCamId] = useState(1);
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [selectedEventId, setSelectedEventId] = useState(1042);
  const [filterStatus, setFilterStatus] = useState('all');

  // Источник видео: симуляция LinQ / свой видеофайл / живая веб-камера ноутбука
  const [videoSource, setVideoSource] = useState('simulation'); // simulation | file | webcam
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState(null);
  const webcamVideoRef = useRef(null);

  // Фильтр сложных условий съемки (Слайд 5: Ночь / Пыль / Пар / Блики)
  const [enhanceFilter, setEnhanceFilter] = useState(false);
  // Привязка зон к координатам при повороте динамичной PTZ-камеры
  const [stabilizeZonesOnPTZ, setStabilizeZonesOnPTZ] = useState(true);
  // Автоматика цеха (Слайд 6 и 10: Светозвуковой маяк и СКУД)
  const [sirenEnabled, setSirenEnabled] = useState(true);
  const [skudLockEnabled, setSkudLockEnabled] = useState(false);

  // Выделение, перемещение и изменение размера зон в реальном времени
  const [drawMode, setDrawMode] = useState('none'); // none | rect | polygon
  const [newZoneType, setNewZoneType] = useState('danger');
  const [newZoneLabel, setNewZoneLabel] = useState('Зона особого контроля');
  const [dragStart, setDragStart] = useState(null);
  const [dragCurrent, setDragCurrent] = useState(null);
  const [tempPolygon, setTempPolygon] = useState([]);

  // Состояния для перетаскивания (Move) и растягивания (Resize) уже созданных зон
  const [activeZoneAction, setActiveZoneAction] = useState(null);
  // { mode: 'move' | 'resize', zoneId, startX, startY, initialRect }
  const videoContainerRef = useRef(null);

  // Перетаскивание камер на карте цеха
  const [draggingCamId, setDraggingCamId] = useState(null);
  const mapContainerRef = useRef(null);

  // Добавление новой камеры
  const [newSiteInput, setNewSiteInput] = useState('');
  const [newCamInput, setNewCamInput] = useState('');
  const [newCamTypeInput, setNewCamTypeInput] = useState('dynamic');
  const [newRtspInput, setNewRtspInput] = useState('rtsp://10.0.114.15:554/linq_stream_04');

  // Калькулятор кластера LinQ TPU (Вкладка 3: Аналитика)
  const [clusterCamerasCount, setClusterCamerasCount] = useState(24);

  // Таймер 3-секундной верификации нарушения
  const [verifyProgress, setVerifyProgress] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  const currentCamera = cameras.find((c) => c.id === selectedCamId) || cameras[0];
  const activeEvent = events.find((e) => e.id === selectedEventId) || events[0];

  // Авто-патрулирование для динамичной камеры (плавный поворот ракурса в реальном времени)
  useEffect(() => {
    if (!currentCamera.autoPatrol || currentCamera.cameraType !== 'dynamic') return;
    const interval = setInterval(() => {
      setCameras((prev) =>
        prev.map((cam) => {
          if (cam.id !== currentCamera.id) return cam;
          const nextAngle = cam.panAngle >= 35 ? -35 : cam.panAngle + 5;
          return { ...cam, panAngle: nextAngle };
        })
      );
    }, 900);
    return () => clearInterval(interval);
  }, [currentCamera.autoPatrol, currentCamera.cameraType, currentCamera.id]);

  // Включение/выключение реальной веб-камеры для живого демо перед жюри
  useEffect(() => {
    let stream = null;
    if (videoSource === 'webcam' && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((s) => {
          stream = s;
          if (webcamVideoRef.current) {
            webcamVideoRef.current.srcObject = s;
          }
        })
        .catch(() => {
          setVideoSource('simulation');
        });
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [videoSource]);

  // 3-секундная верификация нарушения (отсев случайных кадров)
  useEffect(() => {
    if (!isVerifying) return;
    const timer = setInterval(() => {
      setVerifyProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setIsVerifying(false);
          createVerifiedEvent();
          return 0;
        }
        return prev + 10;
      });
    }, 220);
    return () => clearInterval(timer);
  }, [isVerifying]);

  const createVerifiedEvent = () => {
    const enabledIndices = currentCamera.rulesVector
      .map((v, i) => (v === 1 ? i : null))
      .filter((v) => v !== null);
    const chosenIdx =
      enabledIndices.length > 0
        ? enabledIndices[Math.floor(Math.random() * enabledIndices.length)]
        : 1;
    const vType = VIOLATION_TYPES[chosenIdx];
    const newId = events.length > 0 ? Math.max(...events.map((e) => e.id)) + 1 : 1001;

    const newEvt = {
      id: newId,
      camera_id: currentCamera.id,
      camera_code: currentCamera.code,
      site_name: currentCamera.site_name,
      violation: vType.enumKey,
      violation_title: vType.name,
      pattern_code: vType.code,
      timestamp: new Date().toLocaleTimeString(),
      frame_url: `/archive/frames/evt_${newId}_crop.jpg`,
      ai_map_url: `/archive/ai_maps/evt_${newId}_homography.png`,
      ai_pos: {
        x: Math.floor(25 + Math.random() * 55),
        y: Math.floor(30 + Math.random() * 50),
      },
      status: 'new',
      processed_by_id: null,
      processed_by_name: 'Ожидает реакции',
      processed_at: null,
      confidence: Number((0.92 + Math.random() * 0.07).toFixed(2)),
      description: `Автофиксация (${currentCamera.cameraType === 'dynamic' ? 'Динамичная PTZ' : 'Статичная'} ${currentCamera.code})`,
      severity: vType.code === '07' ? 'critical' : 'warning',
    };

    setEvents((prev) => [newEvt, ...prev]);
    setSelectedEventId(newId);
  };

  // --- КООРДИНАТЫ МЫШИ НА ВИДЕОКАДРЕ ---
  const getVideoCoords = (e) => {
    if (!videoContainerRef.current) return { x: 0, y: 0 };
    const rect = videoContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    const y = Math.max(0, Math.min(100, Math.round(((e.clientY - rect.top) / rect.height) * 100)));
    return { x, y };
  };

  const handleVideoMouseDown = (e) => {
    if (drawMode === 'rect') {
      const coords = getVideoCoords(e);
      setDragStart(coords);
      setDragCurrent(coords);
    } else if (drawMode === 'polygon') {
      const coords = getVideoCoords(e);
      setTempPolygon((prev) => [...prev, coords]);
    }
  };

  // Перемещение и изменение размера зон в реальном времени + рисование новой зоны
  const handleVideoMouseMove = (e) => {
    if (activeZoneAction) {
      const coords = getVideoCoords(e);
      const dx = coords.x - activeZoneAction.startX;
      const dy = coords.y - activeZoneAction.startY;

      setCameras((prev) =>
        prev.map((cam) => {
          if (cam.id !== selectedCamId) return cam;
          return {
            ...cam,
            zones: cam.zones.map((z) => {
              if (z.id !== activeZoneAction.zoneId || z.shape !== 'rect') return z;
              if (activeZoneAction.mode === 'move') {
                const nextX = Math.max(0, Math.min(100 - z.rect.w, activeZoneAction.initialRect.x + dx));
                const nextY = Math.max(0, Math.min(100 - z.rect.h, activeZoneAction.initialRect.y + dy));
                return { ...z, rect: { ...z.rect, x: nextX, y: nextY } };
              } else if (activeZoneAction.mode === 'resize') {
                const nextW = Math.max(8, Math.min(100 - z.rect.x, activeZoneAction.initialRect.w + dx));
                const nextH = Math.max(8, Math.min(100 - z.rect.y, activeZoneAction.initialRect.h + dy));
                return { ...z, rect: { ...z.rect, w: nextW, h: nextH } };
              }
              return z;
            }),
          };
        })
      );
      return;
    }

    if (drawMode === 'rect' && dragStart) {
      setDragCurrent(getVideoCoords(e));
    }
  };

  const handleVideoMouseUp = () => {
    if (activeZoneAction) {
      setActiveZoneAction(null);
      return;
    }

    if (drawMode === 'rect' && dragStart && dragCurrent) {
      const x = Math.min(dragStart.x, dragCurrent.x);
      const y = Math.min(dragStart.y, dragCurrent.y);
      const w = Math.abs(dragCurrent.x - dragStart.x);
      const h = Math.abs(dragCurrent.y - dragStart.y);

      if (w > 4 && h > 4) {
        const defaultLabels = {
          danger: 'Опасная зона (Запрет входа)',
          attention: 'Особое внимание (Контроль ТБ)',
          blind: 'Слепая зона / Стеллажи',
        };
        const newZone = {
          id: `z-${Date.now()}`,
          type: newZoneType,
          shape: 'rect',
          label: newZoneLabel.trim() || defaultLabels[newZoneType],
          rect: { x, y, w, h },
        };
        setCameras((prev) =>
          prev.map((c) => (c.id === selectedCamId ? { ...c, zones: [...c.zones, newZone] } : c))
        );
      }
      setDragStart(null);
      setDragCurrent(null);
      setDrawMode('none');
    }
  };

  const finishPolygonZone = () => {
    if (tempPolygon.length >= 3) {
      const newZone = {
        id: `z-${Date.now()}`,
        type: newZoneType,
        shape: 'polygon',
        label: newZoneLabel.trim() || 'Полигон контроля',
        points: tempPolygon,
      };
      setCameras((prev) =>
        prev.map((c) => (c.id === selectedCamId ? { ...c, zones: [...c.zones, newZone] } : c))
      );
    }
    setTempPolygon([]);
    setDrawMode('none');
  };

  const removeZone = (zoneId) => {
    setCameras((prev) =>
      prev.map((c) =>
        c.id === selectedCamId ? { ...c, zones: c.zones.filter((z) => z.id !== zoneId) } : c
      )
    );
  };

  // --- УПРАВЛЕНИЕ ТИПОМ КАМЕРЫ (СТАТИЧНАЯ / ДИНАМИЧНАЯ PTZ) ---
  const toggleCameraType = (camId) => {
    setCameras((prev) =>
      prev.map((cam) =>
        cam.id === camId
          ? {
              ...cam,
              cameraType: cam.cameraType === 'static' ? 'dynamic' : 'static',
              autoPatrol: false,
            }
          : cam
      )
    );
  };

  const adjustCameraPan = (deltaAngle) => {
    setCameras((prev) =>
      prev.map((cam) =>
        cam.id === selectedCamId
          ? { ...cam, panAngle: Math.max(-45, Math.min(45, cam.panAngle + deltaAngle)) }
          : cam
      )
    );
  };

  const adjustCameraZoom = (deltaZoom) => {
    setCameras((prev) =>
      prev.map((cam) =>
        cam.id === selectedCamId
          ? {
              ...cam,
              zoomLevel: Number(
                Math.max(1, Math.min(1.6, cam.zoomLevel + deltaZoom)).toFixed(2)
              ),
            }
          : cam
      )
    );
  };

  const toggleAutoPatrol = () => {
    setCameras((prev) =>
      prev.map((cam) =>
        cam.id === selectedCamId ? { ...cam, autoPatrol: !cam.autoPatrol } : cam
      )
    );
  };

  // --- ПЕРЕТАСКИВАНИЕ КАМЕР НА МИНИ-КАРТЕ МЫШКОЙ ---
  const handleMapMouseMove = (e) => {
    if (!draggingCamId || !mapContainerRef.current) return;
    const rect = mapContainerRef.current.getBoundingClientRect();
    const x = Math.max(6, Math.min(92, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    const y = Math.max(8, Math.min(90, Math.round(((e.clientY - rect.top) / rect.height) * 100)));

    setCameras((prev) =>
      prev.map((cam) => (cam.id === draggingCamId ? { ...cam, mapPos: { x, y } } : cam))
    );
  };

  const handleAddCamera = (e) => {
    e.preventDefault();
    if (!currentUser.canEditRules) return;
    if (!newSiteInput.trim() || !newCamInput.trim()) return;
    const nextNum = cameras.length + 1;
    const offsetX = Math.min(85, 28 + ((nextNum * 15) % 52));
    const offsetY = Math.min(85, 32 + ((nextNum * 19) % 48));

    const createdCam = {
      id: Date.now(),
      code: `CAM-0${nextNum}`,
      site_id: nextNum * 10,
      site_name: newSiteInput,
      name: newCamInput,
      cameraType: newCamTypeInput,
      panAngle: 0,
      zoomLevel: 1,
      autoPatrol: false,
      rtsp_url: newRtspInput,
      is_active: true,
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      rulesVector: [0, 1, 1, 0, 1, 0, 1, 0],
      fps: 96,
      latency: '11.0 мс',
      mapPos: { x: offsetX, y: offsetY },
      zones: [],
    };
    setCameras((prev) => [...prev, createdCam]);
    setSelectedCamId(createdCam.id);
    setNewSiteInput('');
    setNewCamInput('');
  };

  const handleProcessEvent = (eventId, newStatus) => {
    const nowTime = new Date().toLocaleTimeString();
    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === eventId
          ? {
              ...ev,
              status: newStatus,
              processed_by_id: currentUser.id,
              processed_by_name: currentUser.full_name,
              processed_at: nowTime,
            }
          : ev
      )
    );
  };

  const handleUpdateEventComment = (eventId, text) => {
    setEvents((prev) =>
      prev.map((ev) => (ev.id === eventId ? { ...ev, description: text } : ev))
    );
  };

  const toggleRule = (idx) => {
    if (!currentUser.canEditRules) return;
    setCameras((prev) =>
      prev.map((cam) => {
        if (cam.id !== selectedCamId) return cam;
        const nextVec = [...cam.rulesVector];
        nextVec[idx] = nextVec[idx] === 1 ? 0 : 1;
        return { ...cam, rulesVector: nextVec };
      })
    );
  };

  const handleVideoFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUploadedVideoUrl(url);
      setVideoSource('file');
    }
  };

  const filteredEvents = events.filter((e) =>
    filterStatus === 'all' ? true : e.status === filterStatus
  );

  // Стили тем
  const themePage = isDark
    ? 'bg-[#0F172A] text-slate-100'
    : 'bg-[#F1F5F9] text-slate-800';
  const themeCard = isDark
    ? 'bg-[#1E293B] border-slate-700/80 text-slate-100'
    : 'bg-white border-slate-200/90 text-slate-800 shadow-xs';
  const themeSubCard = isDark
    ? 'bg-[#0F172A]/70 border-slate-700/60'
    : 'bg-slate-50 border-slate-200';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  const zoneColors = {
    danger: {
      border: '#EF4444',
      bg: 'rgba(239, 68, 68, 0.20)',
      badge: 'bg-red-600 text-white',
      name: 'Опасная зона',
    },
    attention: {
      border: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.20)',
      badge: 'bg-amber-500 text-slate-950',
      name: 'Особое внимание',
    },
    blind: {
      border: '#64748B',
      bg: 'rgba(100, 116, 139, 0.28)',
      badge: 'bg-slate-600 text-white',
      name: 'Слепая зона / Стеллажи',
    },
  };

  // Смещение зон при повороте динамичной камеры (если включена стабилизация по координатам цеха)
  const panOffsetPercent =
    currentCamera.cameraType === 'dynamic' && stabilizeZonesOnPTZ
      ? -currentCamera.panAngle * 0.45
      : 0;

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-300 ${themePage} ${
        eyeComfort ? 'sepia-[.18] saturate-[.85] contrast-[.96]' : ''
      }`}
    >
      {/* Верхняя корпоративная панель */}
      <div className="bg-[#0F172A] text-slate-200 text-xs px-6 py-2 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-0.5 rounded bg-sky-600 text-white font-semibold">
            ООО «ХайТэк» • LinQ TPU
          </span>
          <span className="hidden md:inline text-slate-400">
            Интеллектуальный видеоконтроль промышленной безопасности
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Выбор аккаунта с проверкой прав доступа по блок-схеме */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700">
            <UserCheck size={14} className="text-sky-400" />
            <span className="text-slate-400">Аккаунт:</span>
            <select
              value={currentUser.id}
              onChange={(e) =>
                setCurrentUser(
                  DB_USERS.find((u) => u.id === Number(e.target.value)) || DB_USERS[0]
                )
              }
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              {DB_USERS.map((u) => (
                <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                  {u.full_name} — [{u.role_name}]
                </option>
              ))}
            </select>
          </div>

          {/* Защита зрения */}
          <button
            onClick={() => setEyeComfort(!eyeComfort)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border transition cursor-pointer ${
              eyeComfort
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-semibold'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Eye size={14} />
            <span>{eyeComfort ? 'Защита зрения: ВКЛ' : 'Защита зрения'}</span>
          </button>

          {/* Переключатель темы */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 cursor-pointer transition"
          >
            {isDark ? (
              <Sun size={14} className="text-amber-400" />
            ) : (
              <Moon size={14} className="text-sky-400" />
            )}
            <span>{isDark ? 'Светлая тема' : 'Темная тема'}</span>
          </button>
        </div>
      </div>

      {/* Шапка сайта с оригинальным логотипом LinQ и 4 вкладками */}
      <header
        className={`border-b px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 ${themeCard}`}
      >
        <div className="flex items-center gap-4">
          <LinQOriginalLogo isDark={isDark} />
          <div className="h-8 w-[1px] bg-slate-300 dark:bg-slate-700 hidden sm:block" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight">
                Система контроля безопасности цеха
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                LinQ TPU Активен
              </span>
            </div>
            <p className={`text-xs ${textMuted}`}>
              {currentUser.role_name} •{' '}
              {currentUser.canEditRules
                ? 'Полный доступ (редактирование участков и правил)'
                : 'Режим оперативного дежурства'}
            </p>
          </div>
        </div>

        {/* 4 вкладки навигации */}
        <nav className="flex flex-wrap items-center gap-2">
          {[
            { id: 'monitoring', label: '01. Мониторинг и разметка', icon: Video },
            { id: 'map_rules', label: '02. Карта цеха и Правила', icon: Map },
            { id: 'analytics', label: '03. Аналитика и Статистика', icon: BarChart3 },
            { id: 'db_inspector', label: '04. Инспектор СУБД', icon: Database },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  active
                    ? 'bg-sky-600 text-white shadow-sm'
                    : `${themeSubCard} border hover:border-sky-500/50`
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Кнопка симуляции 3-секундного удержания */}
        <button
          onClick={() => {
            if (!isVerifying) {
              setVerifyProgress(10);
              setIsVerifying(true);
            }
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-98 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
        >
          <AlertTriangle size={15} />
          <span>
            {isVerifying
              ? `Верификация (${(verifyProgress * 0.03).toFixed(1)} сек)...`
              : 'Симуляция нарушения (3 сек)'}
          </span>
        </button>
      </header>

      {/* Полоса верификации */}
      {isVerifying && (
        <div className="px-6 pt-3">
          <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl p-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-xs font-medium text-amber-700 dark:text-amber-300">
              <Clock size={16} className="animate-spin" />
              <span>
                Проверка длительности события (3.0 сек) для исключения одиночных ложных кадров и подавления дубликатов...
              </span>
            </div>
            <div className="w-56 h-2.5 bg-slate-300 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-200"
                style={{ width: `${verifyProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Верхняя сводка показателей */}
      <section className="px-6 pt-4 grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          {
            label: 'Инференс на LinQ TPU',
            val: `${currentCamera.fps} кадров/с`,
            sub: `Задержка: ${currentCamera.latency} • Поток активен`,
            color: 'text-sky-600 dark:text-sky-400',
          },
          {
            label: 'Тип выбранной камеры',
            val:
              currentCamera.cameraType === 'dynamic'
                ? `Динамичная PTZ (${currentCamera.panAngle}°)`
                : 'Статичная (Фиксированная)',
            sub: `Зон на кадре: ${currentCamera.zones.length} (можно двигать мышкой)`,
            color: 'text-amber-600 dark:text-amber-400',
          },
          {
            label: 'Зафиксировано инцидентов',
            val: events.length,
            sub: `Ожидают реакции: ${events.filter((e) => e.status === 'new').length}`,
            color: 'text-red-600 dark:text-red-400',
          },
          {
            label: 'Точность модели (Confidence)',
            val: `${Math.round(activeEvent.confidence * 100)}%`,
            sub: 'Подавлено дубликатов: 142 кадра',
            color: 'text-emerald-600 dark:text-emerald-400',
          },
        ].map((m, i) => (
          <div key={i} className={`border rounded-2xl p-3.5 ${themeCard}`}>
            <p className={`text-xs font-medium ${textMuted}`}>{m.label}</p>
            <p className={`text-lg font-bold mt-0.5 ${m.color}`}>{m.val}</p>
            <p className={`text-[11px] truncate mt-0.5 ${textMuted}`}>{m.sub}</p>
          </div>
        ))}
      </section>

      {/* ОСНОВНОЙ КОНТЕНТ */}
      <main className="flex-1 p-6">
        {/* ================= ВКЛАДКА 1: МОНИТОРИНГ И РАЗМЕТКА КАМЕР ================= */}
        {activeTab === 'monitoring' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            <div className="lg:col-span-8 flex flex-col gap-5">
              <div className={`border rounded-2xl flex flex-col overflow-hidden ${themeCard}`}>
                {/* Шапка видеоплеера с переключением типа камеры (Статичная / Динамичная) и источника */}
                <div className="p-3.5 border-b border-inherit flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <h2 className="text-sm font-bold">
                        {currentCamera.name} — {currentCamera.site_name}
                      </h2>
                      <button
                        onClick={() => toggleCameraType(currentCamera.id)}
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-lg border cursor-pointer transition ${
                          currentCamera.cameraType === 'dynamic'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40'
                            : 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30'
                        }`}
                        title="Нажмите, чтобы переключить тип камеры: Статичная или Динамичная (Поворотная PTZ)"
                      >
                        {currentCamera.cameraType === 'dynamic'
                          ? '🔄 Тип: Динамичная (PTZ)'
                          : '📌 Тип: Статичная'}
                      </button>
                    </div>
                    <p className={`text-xs mt-0.5 ${textMuted}`}>
                      Хватайте любую зону мышкой для перемещения или тяните за правый нижний уголок для изменения размера
                    </p>
                  </div>

                  {/* Кнопки выбора камеры */}
                  <div className="flex flex-wrap gap-1.5">
                    {cameras.map((cam) => (
                      <button
                        key={cam.id}
                        onClick={() => setSelectedCamId(cam.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                          selectedCamId === cam.id
                            ? 'bg-sky-600 text-white border-sky-600'
                            : `${themeSubCard} hover:border-sky-500/50`
                        }`}
                      >
                        {cam.code}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Если камера ДИНАМИЧНАЯ (PTZ) — показываем пульт поворота, зума и авто-патруля */}
                {currentCamera.cameraType === 'dynamic' && (
                  <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/25 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <RotateCw
                        size={14}
                        className={`text-amber-600 dark:text-amber-400 ${
                          currentCamera.autoPatrol ? 'animate-spin' : ''
                        }`}
                      />
                      <span className="font-semibold">
                        Управление поворотной камерой (PTZ): угол {currentCamera.panAngle}° | зум{' '}
                        {currentCamera.zoomLevel}x
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={() => adjustCameraPan(-10)}
                        className={`px-2 py-1 rounded border flex items-center gap-0.5 cursor-pointer ${themeCard}`}
                      >
                        <ChevronLeft size={13} /> Влево
                      </button>
                      <button
                        onClick={() => adjustCameraPan(10)}
                        className={`px-2 py-1 rounded border flex items-center gap-0.5 cursor-pointer ${themeCard}`}
                      >
                        Вправо <ChevronRight size={13} />
                      </button>
                      <button
                        onClick={() => adjustCameraZoom(0.15)}
                        className={`px-2 py-1 rounded border flex items-center gap-1 cursor-pointer ${themeCard}`}
                      >
                        <ZoomIn size={13} /> +
                      </button>
                      <button
                        onClick={() => adjustCameraZoom(-0.15)}
                        className={`px-2 py-1 rounded border flex items-center gap-1 cursor-pointer ${themeCard}`}
                      >
                        <ZoomOut size={13} /> -
                      </button>
                      <button
                        onClick={toggleAutoPatrol}
                        className={`px-2.5 py-1 rounded font-semibold border cursor-pointer ${
                          currentCamera.autoPatrol
                            ? 'bg-amber-600 text-white border-amber-600'
                            : themeCard
                        }`}
                      >
                        {currentCamera.autoPatrol ? 'Стоп патруль' : 'Авто-патруль'}
                      </button>
                      <label className="flex items-center gap-1 ml-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={stabilizeZonesOnPTZ}
                          onChange={(e) => setStabilizeZonesOnPTZ(e.target.checked)}
                        />
                        <span>Трекинг зон при повороте</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Панель инструментов: Выделение зон + Источник видео (Веб-камера / Файл) + Фильтр Пыль/Ночь */}
                <div
                  className={`px-4 py-2.5 border-b border-inherit flex flex-wrap items-center justify-between gap-2 ${themeSubCard}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={newZoneType}
                      onChange={(e) => setNewZoneType(e.target.value)}
                      className={`text-xs rounded-lg px-2.5 py-1.5 border font-medium ${themeCard}`}
                    >
                      <option value="danger">🔴 Опасная зона (Кран / Техника)</option>
                      <option value="attention">🟡 Зона особого внимания (Станки / СИЗ)</option>
                      <option value="blind">⚪ Слепая зона / Стеллажи (Окклюзия)</option>
                    </select>

                    <input
                      type="text"
                      value={newZoneLabel}
                      onChange={(e) => setNewZoneLabel(e.target.value)}
                      placeholder="Название зоны..."
                      className={`text-xs rounded-lg px-2.5 py-1.5 border w-40 ${themeCard}`}
                    />

                    <button
                      onClick={() => {
                        setTempPolygon([]);
                        setDrawMode(drawMode === 'rect' ? 'none' : 'rect');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition cursor-pointer ${
                        drawMode === 'rect'
                          ? 'bg-sky-600 text-white border-sky-600'
                          : `${themeCard} hover:border-sky-500`
                      }`}
                    >
                      <Square size={13} />
                      {drawMode === 'rect' ? 'Тяните мышь по видео...' : '+ Область (Зажать мышь)'}
                    </button>

                    <button
                      onClick={() => {
                        if (drawMode === 'polygon') {
                          finishPolygonZone();
                        } else {
                          setTempPolygon([]);
                          setDrawMode('polygon');
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition cursor-pointer ${
                        drawMode === 'polygon'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : `${themeCard} hover:border-amber-500`
                      }`}
                    >
                      <Pentagon size={13} />
                      {drawMode === 'polygon'
                        ? `Сохранить (${tempPolygon.length})`
                        : '+ Полигон'}
                    </button>
                  </div>

                  {/* Переключатель: Веб-камера ноутбука / Свое видео / Фильтр сложных условий */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() =>
                        setVideoSource(videoSource === 'webcam' ? 'simulation' : 'webcam')
                      }
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1 cursor-pointer ${
                        videoSource === 'webcam'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : themeCard
                      }`}
                      title="Включить живую веб-камеру ноутбука для демонстрации жюри"
                    >
                      <Camera size={13} /> Веб-камера
                    </button>

                    <label
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1 cursor-pointer ${themeCard}`}
                      title="Загрузить свой видеофайл .mp4"
                    >
                      <Upload size={13} /> Свое видео
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoFileUpload}
                        className="hidden"
                      />
                    </label>

                    <button
                      onClick={() => setEnhanceFilter(!enhanceFilter)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1 cursor-pointer ${
                        enhanceFilter
                          ? 'bg-sky-600 text-white border-sky-600'
                          : themeCard
                      }`}
                      title="Слайд 5: Компенсация пыли, пара, дыма и слабого освещения"
                    >
                      <Sparkles size={13} /> Анти-пыль/Ночь
                    </button>
                  </div>
                </div>

                {/* ЭКРАН КАМЕРЫ С ЖИВЫМ ПЕРЕМЕЩЕНИЕМ И РАСТЯГИВАНИЕМ ЗОН */}
                <div
                  ref={videoContainerRef}
                  onMouseDown={handleVideoMouseDown}
                  onMouseMove={handleVideoMouseMove}
                  onMouseUp={handleVideoMouseUp}
                  onMouseLeave={handleVideoMouseUp}
                  className={`relative bg-slate-900 h-[360px] flex items-center justify-center overflow-hidden select-none ${
                    drawMode !== 'none' ? 'cursor-crosshair ring-2 ring-sky-500' : ''
                  } ${enhanceFilter ? 'contrast-125 brightness-110 saturate-125' : ''}`}
                >
                  {/* Если выбрана реальная Веб-камера */}
                  {videoSource === 'webcam' && (
                    <video
                      ref={webcamVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}

                  {/* Если загружен свой видеофайл */}
                  {videoSource === 'file' && uploadedVideoUrl && (
                    <video
                      src={uploadedVideoUrl}
                      autoPlay
                      loop
                      muted
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}

                  {/* Инженерная сетка с трансформацией при PTZ-повороте/зуме */}
                  <div
                    className="absolute inset-0 opacity-15 pointer-events-none transition-transform duration-300"
                    style={{
                      transform: `scale(${currentCamera.zoomLevel}) translateX(${panOffsetPercent}%)`,
                      backgroundImage:
                        'linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)',
                      backgroundSize: '48px 48px',
                    }}
                  />

                  {/* ОТРИСОВКА ПРЯМОУГОЛЬНЫХ ЗОН (С ПОДДЕРЖКОЙ ПЕРЕТАСКИВАНИЯ И ИЗМЕНЕНИЯ РАЗМЕРА МЫШКОЙ!) */}
                  {currentCamera.zones
                    .filter((z) => z.shape === 'rect')
                    .map((zone) => {
                      const st = zoneColors[zone.type] || zoneColors.danger;
                      const displayX = Math.max(
                        0,
                        Math.min(100 - zone.rect.w, zone.rect.x + panOffsetPercent)
                      );
                      return (
                        <div
                          key={zone.id}
                          style={{
                            left: `${displayX}%`,
                            top: `${zone.rect.y}%`,
                            width: `${zone.rect.w}%`,
                            height: `${zone.rect.h}%`,
                            borderColor: st.border,
                            backgroundColor: st.bg,
                          }}
                          onMouseDown={(e) => {
                            if (drawMode !== 'none') return;
                            e.stopPropagation();
                            const coords = getVideoCoords(e);
                            setActiveZoneAction({
                              mode: 'move',
                              zoneId: zone.id,
                              startX: coords.x,
                              startY: coords.y,
                              initialRect: { ...zone.rect },
                            });
                          }}
                          className="absolute border-2 rounded-lg flex flex-col justify-between p-2 cursor-move group hover:ring-2 hover:ring-white/60"
                          title="Зажмите мышь внутри зоны, чтобы передвинуть её, или потяните за правый нижний угол для изменения размера"
                        >
                          <div className="flex items-center justify-between gap-1 pointer-events-none">
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${st.badge} truncate`}
                            >
                              ⠿ {zone.label}
                            </span>
                            <button
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                removeZone(zone.id);
                              }}
                              className="bg-black/70 hover:bg-red-600 text-white p-1 rounded pointer-events-auto cursor-pointer"
                              title="Удалить зону"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>

                          <div className="flex items-end justify-between pointer-events-none">
                            <span className="text-[10px] text-white/90 bg-black/60 px-1.5 py-0.5 rounded">
                              {st.name} ({Math.round(zone.rect.w)}x{Math.round(zone.rect.h)}%)
                            </span>

                            {/* УГОЛОК ИЗМЕНЕНИЯ РАЗМЕРА ЗОНЫ В РЕАЛЬНОМ ВРЕМЕНИ (RESIZE HANDLE) */}
                            <div
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                const coords = getVideoCoords(e);
                                setActiveZoneAction({
                                  mode: 'resize',
                                  zoneId: zone.id,
                                  startX: coords.x,
                                  startY: coords.y,
                                  initialRect: { ...zone.rect },
                                });
                              }}
                              className="w-4 h-4 bg-white border-2 border-sky-600 rounded-xs cursor-nwse-resize pointer-events-auto shadow-md hover:scale-125 transition-transform"
                              title="Потяните за уголок для изменения размера зоны"
                            />
                          </div>
                        </div>
                      );
                    })}

                  {/* Предпросмотр рисуемой зоны */}
                  {drawMode === 'rect' && dragStart && dragCurrent && (
                    <div
                      style={{
                        left: `${Math.min(dragStart.x, dragCurrent.x)}%`,
                        top: `${Math.min(dragStart.y, dragCurrent.y)}%`,
                        width: `${Math.abs(dragCurrent.x - dragStart.x)}%`,
                        height: `${Math.abs(dragCurrent.y - dragStart.y)}%`,
                        borderColor: zoneColors[newZoneType].border,
                        backgroundColor: zoneColors[newZoneType].bg,
                      }}
                      className="absolute border-2 border-dashed rounded-lg pointer-events-none"
                    />
                  )}

                  {/* SVG-слой для полигонов */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {currentCamera.zones
                      .filter((z) => z.shape === 'polygon')
                      .map((zone) => {
                        const st = zoneColors[zone.type] || zoneColors.danger;
                        return (
                          <polygon
                            key={zone.id}
                            points={zone.points.map((p) => `${p.x}%,${p.y}%`).join(' ')}
                            fill={st.bg}
                            stroke={st.border}
                            strokeWidth="2.5"
                          />
                        );
                      })}
                    {tempPolygon.length >= 2 && (
                      <polyline
                        points={tempPolygon.map((p) => `${p.x}%,${p.y}%`).join(' ')}
                        fill="rgba(56, 189, 248, 0.2)"
                        stroke="#38bdf8"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />
                    )}
                    {tempPolygon.map((p, i) => (
                      <circle key={i} cx={`${p.x}%`} cy={`${p.y}%`} r="4" fill="#38bdf8" />
                    ))}
                  </svg>

                  {/* BBox сотрудника */}
                  <div
                    style={{
                      transform: `translateX(${panOffsetPercent * 2}px)`,
                    }}
                    className="absolute top-20 left-1/3 w-36 h-48 border-2 border-emerald-400 bg-emerald-500/10 rounded-lg pointer-events-none transition-transform"
                  >
                    <div className="bg-emerald-600 text-white text-[10px] font-semibold px-2 py-0.5 flex justify-between rounded-t">
                      <span>ID #14</span>
                      <span>СИЗ: ОК</span>
                    </div>
                  </div>

                  {/* Информационная подпись в центре (если включена симуляция) */}
                  {videoSource === 'simulation' && (
                    <div className="text-center text-slate-300 z-10 px-4 pointer-events-none">
                      <Cpu size={32} className="mx-auto mb-1 text-sky-400 opacity-80" />
                      <p className="text-xs font-semibold uppercase tracking-wider">
                        {currentCamera.code} ({currentCamera.cameraType === 'dynamic' ? 'Динамичная PTZ' : 'Статичная'}) • {currentCamera.fps} FPS
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Перетаскивайте зоны мышкой или меняйте их размер за правый нижний квадратик
                      </p>
                    </div>
                  )}
                </div>

                {/* Нижняя полоса превентивной автоматики в цеху (Слайд 6 и 10: Сирена + СКУД) */}
                <div className="px-4 py-2.5 border-t border-inherit flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        checked={sirenEnabled}
                        onChange={(e) => setSirenEnabled(e.target.checked)}
                      />
                      <Volume2 size={14} className="text-amber-500" />
                      <span>Локальный светозвуковой сигнал в цеху (Роль 4)</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        checked={skudLockEnabled}
                        onChange={(e) => setSkudLockEnabled(e.target.checked)}
                      />
                      <Lock size={14} className="text-sky-500" />
                      <span>Интеграция со СКУД (Блокировка при входе без СИЗ)</span>
                    </label>
                  </div>

                  <span className={`text-[11px] ${textMuted}`}>
                    Препроцессинг: {enhanceFilter ? 'CLAHE Анти-пыль/Ночь ВКЛ' : 'Стандартный'}
                  </span>
                </div>
              </div>

              {/* НИЖНИЙ БЛОК ЛЕВОЙ КОЛОНКИ: Сетка всех камер + ИИ-радар позиции */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1">
                {/* 1. Сетка камер */}
                <div className={`border rounded-2xl p-4 flex flex-col justify-between ${themeCard}`}>
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Layers size={14} className="text-sky-500" />
                      Все камеры предприятия ({cameras.length})
                    </h3>
                    <span className={`text-[11px] ${textMuted}`}>Статичные и PTZ</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 flex-1">
                    {cameras.map((cam) => (
                      <div
                        key={cam.id}
                        onClick={() => setSelectedCamId(cam.id)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                          selectedCamId === cam.id
                            ? 'border-sky-500 bg-sky-500/10'
                            : `${themeSubCard} hover:border-slate-400`
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">{cam.code}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              cam.cameraType === 'dynamic'
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                : 'bg-slate-500/15 text-slate-500'
                            }`}
                          >
                            {cam.cameraType === 'dynamic' ? 'PTZ 🔄' : 'Статич.'}
                          </span>
                        </div>
                        <p className={`text-[11px] truncate mt-1 ${textMuted}`}>{cam.site_name}</p>
                        <p className="text-[10px] text-sky-600 dark:text-sky-400 font-medium mt-1">
                          Зон: {cam.zones.length} • {cam.fps} FPS
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. ИИ-карта позиции нарушителя (ai_map_url) */}
                <div className={`border rounded-2xl p-4 flex flex-col justify-between ${themeCard}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Radar size={14} className="text-amber-500" />
                        ИИ-карта позиции (events.ai_map_url)
                      </h3>
                      <p className={`text-[11px] ${textMuted}`}>
                        Инцидент #{activeEvent.id} • {activeEvent.violation_title}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold">
                      Conf: {Math.round(activeEvent.confidence * 100)}%
                    </span>
                  </div>

                  <div className="relative bg-slate-900 rounded-xl h-28 border border-slate-700 overflow-hidden flex items-center justify-center my-1">
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{
                        backgroundImage: 'radial-gradient(#38bdf8 1px, transparent 1px)',
                        backgroundSize: '16px 16px',
                      }}
                    />
                    <div
                      style={{
                        left: `${activeEvent.ai_pos.x}%`,
                        top: `${activeEvent.ai_pos.y}%`,
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                    >
                      <span className="w-4 h-4 rounded-full bg-red-500 animate-ping absolute" />
                      <span className="w-3 h-3 rounded-full bg-red-500 border-2 border-white relative z-10" />
                      <span className="text-[9px] bg-black/80 text-white px-1.5 py-0.5 rounded mt-1 whitespace-nowrap">
                        {activeEvent.camera_code} (X:{activeEvent.ai_pos.x}, Y:{activeEvent.ai_pos.y})
                      </span>
                    </div>
                  </div>

                  <div className="mt-1.5 flex items-center gap-2">
                    <MessageSquare size={14} className={textMuted} />
                    <input
                      type="text"
                      value={activeEvent.description}
                      onChange={(e) => handleUpdateEventComment(activeEvent.id, e.target.value)}
                      placeholder="Комментарий к событию (description)..."
                      className={`text-xs px-2.5 py-1 rounded-lg border flex-1 ${themeSubCard}`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ПРАВАЯ КОЛОНКА (4 из 12): Журнал инцидентов */}
            <div
              className={`lg:col-span-4 border rounded-2xl flex flex-col overflow-hidden ${themeCard}`}
            >
              <div className="p-4 border-b border-inherit flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold">Лента инцидентов</h2>
                  <p className={`text-xs ${textMuted}`}>Оперативный журнал диспетчера</p>
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className={`text-xs rounded-lg px-2.5 py-1.5 border font-medium ${themeSubCard}`}
                >
                  <option value="all">Все ({events.length})</option>
                  <option value="new">Новые</option>
                  <option value="confirmed">Подтверждено</option>
                  <option value="sent_to_master">У мастера</option>
                  <option value="false_alarm">Ложные</option>
                </select>
              </div>

              <div className="p-3.5 space-y-3 overflow-y-auto flex-1 max-h-[640px]">
                {filteredEvents.map((ev) => {
                  const isSelected = ev.id === selectedEventId;
                  return (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedEventId(ev.id)}
                      className={`p-3.5 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-sky-500 border-sky-500'
                          : `${themeSubCard} hover:border-slate-400`
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                ev.severity === 'critical'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-amber-500 text-slate-950'
                              }`}
                            >
                              {ev.violation}
                            </span>
                            <span className={`text-xs font-mono ${textMuted}`}>
                              #{ev.id} • {ev.camera_code}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold mt-1">{ev.violation_title}</h3>
                        </div>
                        <span className="text-xs font-mono font-semibold text-sky-600 dark:text-sky-400">
                          {ev.timestamp}
                        </span>
                      </div>

                      <p className={`text-xs mt-1.5 ${textMuted}`}>{ev.description}</p>

                      <div
                        className={`text-[11px] mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/70 flex items-center justify-between ${textMuted}`}
                      >
                        <span>Ответственный: {ev.processed_by_name}</span>
                        {ev.processed_at && <span>в {ev.processed_at}</span>}
                      </div>

                      <div
                        className="mt-2.5 flex flex-wrap gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleProcessEvent(ev.id, 'confirmed')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1 cursor-pointer ${
                            ev.status === 'confirmed'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : `${themeCard} hover:border-emerald-500`
                          }`}
                        >
                          <CheckCircle2 size={12} /> Подтвердить
                        </button>
                        <button
                          onClick={() => handleProcessEvent(ev.id, 'sent_to_master')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1 cursor-pointer ${
                            ev.status === 'sent_to_master'
                              ? 'bg-sky-600 text-white border-sky-600'
                              : `${themeCard} hover:border-sky-500`
                          }`}
                        >
                          <Send size={12} /> Мастеру
                        </button>
                        <button
                          onClick={() => handleProcessEvent(ev.id, 'false_alarm')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1 cursor-pointer ${
                            ev.status === 'false_alarm'
                              ? 'bg-slate-600 text-white border-slate-600'
                              : `${themeCard} hover:border-slate-500`
                          }`}
                        >
                          <XCircle size={12} /> Ложное
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= ВКЛАДКА 2: КАРТА ЦЕХА И ПРАВИЛА ================= */}
        {activeTab === 'map_rules' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-5">
              <div className={`border rounded-2xl p-5 ${themeCard}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-inherit">
                  <div>
                    <h2 className="text-sm font-bold flex items-center gap-2">
                      <Move size={16} className="text-sky-500" />
                      Интерактивная карта участка (Перетаскивание камер мышкой)
                    </h2>
                    <p className={`text-xs ${textMuted}`}>
                      Зажмите любую камеру мышкой для смены позиции. У динамичных PTZ-камер отображается сектор вращения
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400">
                    Всего камер: {cameras.length}
                  </span>
                </div>

                <div
                  ref={mapContainerRef}
                  onMouseMove={handleMapMouseMove}
                  onMouseUp={() => setDraggingCamId(null)}
                  onMouseLeave={() => setDraggingCamId(null)}
                  className="mt-4 relative bg-slate-900 border-2 border-slate-700 rounded-2xl h-[360px] select-none overflow-hidden"
                >
                  <div
                    className="absolute inset-0 opacity-15 pointer-events-none"
                    style={{
                      backgroundImage:
                        'linear-gradient(to right, #64748b 1px, transparent 1px), linear-gradient(to bottom, #64748b 1px, transparent 1px)',
                      backgroundSize: '36px 36px',
                    }}
                  />

                  <div className="absolute top-8 left-12 w-36 h-24 bg-red-500/20 border-2 border-red-500/70 rounded-xl p-2 pointer-events-none">
                    <span className="text-[10px] font-bold text-red-200 uppercase">
                      Опасная зона: Кран-балка
                    </span>
                  </div>

                  <div className="absolute bottom-10 left-1/3 w-40 h-24 bg-amber-500/20 border-2 border-amber-400/70 rounded-xl p-2 pointer-events-none">
                    <span className="text-[10px] font-bold text-amber-200 uppercase">
                      Конвейерная линия (СИЗ)
                    </span>
                  </div>

                  <div className="absolute top-10 right-12 w-28 h-24 bg-slate-800/90 border border-slate-600 rounded-xl p-2 flex items-center justify-center text-center pointer-events-none">
                    <span className="text-[10px] text-slate-300 font-medium">
                      Стеллажи (Слепая зона)
                    </span>
                  </div>

                  {cameras.map((cam) => {
                    const isSelected = cam.id === selectedCamId;
                    return (
                      <div
                        key={cam.id}
                        style={{
                          left: `${cam.mapPos.x}%`,
                          top: `${cam.mapPos.y}%`,
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setSelectedCamId(cam.id);
                          setDraggingCamId(cam.id);
                        }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl text-xs font-bold border-2 flex items-center gap-1.5 cursor-grab active:cursor-grabbing ${
                          isSelected
                            ? 'bg-sky-600 text-white border-white shadow-lg scale-105 z-20'
                            : 'bg-slate-800 text-slate-100 border-sky-400/60 hover:border-white z-10'
                        }`}
                      >
                        <Video size={13} />
                        <span>{cam.code}</span>
                        <span className="text-[10px] px-1 rounded bg-black/30">
                          {cam.cameraType === 'dynamic' ? `PTZ ${cam.panAngle}°` : 'Стат.'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Форма добавления камеры с выбором типа: Статичная или Динамичная */}
              <div className={`border rounded-2xl p-5 ${themeCard}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Plus size={16} className="text-sky-500" />
                    Добавить новую камеру и участок
                  </h3>
                  {!currentUser.canEditRules && (
                    <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                      <Lock size={12} /> Доступно только для Роли 1 и Роли 7
                    </span>
                  )}
                </div>

                <form
                  onSubmit={handleAddCamera}
                  className="grid grid-cols-1 sm:grid-cols-4 gap-3"
                >
                  <input
                    type="text"
                    disabled={!currentUser.canEditRules}
                    placeholder="Участок (напр. Цех №4)"
                    value={newSiteInput}
                    onChange={(e) => setNewSiteInput(e.target.value)}
                    className={`text-xs rounded-xl px-3 py-2 border ${themeSubCard}`}
                  />
                  <input
                    type="text"
                    disabled={!currentUser.canEditRules}
                    placeholder="Название (напр. Камера 04)"
                    value={newCamInput}
                    onChange={(e) => setNewCamInput(e.target.value)}
                    className={`text-xs rounded-xl px-3 py-2 border ${themeSubCard}`}
                  />
                  <select
                    disabled={!currentUser.canEditRules}
                    value={newCamTypeInput}
                    onChange={(e) => setNewCamTypeInput(e.target.value)}
                    className={`text-xs rounded-xl px-3 py-2 border font-medium ${themeSubCard}`}
                  >
                    <option value="dynamic">🔄 Динамичная (Поворотная PTZ)</option>
                    <option value="static">📌 Статичная (Фиксированная)</option>
                  </select>
                  <button
                    type="submit"
                    disabled={!currentUser.canEditRules}
                    className="bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-semibold text-xs rounded-xl py-2 px-4 cursor-pointer transition"
                  >
                    + Добавить на карту
                  </button>
                </form>
              </div>
            </div>

            {/* Правая половина: Матрица правил и JSONB */}
            <div
              className={`lg:col-span-5 border rounded-2xl p-5 flex flex-col justify-between ${themeCard}`}
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-inherit">
                  <div>
                    <h2 className="text-sm font-bold">
                      Конфигуратор правил камеры: {currentCamera.code}
                    </h2>
                    <p className={`text-xs ${textMuted}`}>
                      Настройка отслеживаемых паттернов без правки кода
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400">
                    [{currentCamera.rulesVector.join(', ')}]
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {VIOLATION_TYPES.map((v, idx) => {
                    const active = currentCamera.rulesVector[idx] === 1;
                    return (
                      <div
                        key={v.id}
                        onClick={() => toggleRule(idx)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                          active
                            ? 'border-sky-500 bg-sky-500/10'
                            : `${themeSubCard} opacity-65`
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-sky-600 text-white">
                            {v.code}
                          </span>
                          <span className="text-xs font-medium">{v.name}</span>
                        </div>
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg ${
                            active
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {active ? 'ВКЛ (1)' : 'ВЫКЛ (0)'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-inherit">
                <p className={`text-[11px] font-mono mb-1.5 ${textMuted}`}>
                  Сформированный JSONB-объект (sites.rules):
                </p>
                <pre className="bg-slate-900 text-sky-300 p-3 rounded-xl text-[11px] font-mono overflow-x-auto border border-slate-700">
                  {JSON.stringify(
                    {
                      site_id: currentCamera.site_id,
                      camera_type: currentCamera.cameraType,
                      vector: currentCamera.rulesVector,
                      zones: currentCamera.zones.map((z) => ({
                        label: z.label,
                        type: z.type,
                        rect: z.rect,
                      })),
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* ================= ВКЛАДКА 3: АНАЛИТИКА И СТАТИСТИКА ================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* 1. График почасовой динамики нарушений по сменам */}
              <div className={`lg:col-span-7 border rounded-2xl p-5 ${themeCard}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-inherit">
                  <div>
                    <h2 className="text-sm font-bold">
                      Динамика нарушений по часам смены (Выявление опасных интервалов)
                    </h2>
                    <p className={`text-xs ${textMuted}`}>
                      Позволяет руководству точечно усиливать инструктаж в часы пикового травматизма
                    </p>
                  </div>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    <FileDown size={14} /> Экспорт отчета (PDF)
                  </button>
                </div>

                {/* Столбчатая диаграмма по часам */}
                <div className="mt-6 grid grid-cols-7 gap-3 items-end h-48 pt-6 px-2 border-b border-slate-300 dark:border-slate-700">
                  {HOURLY_STATS.map((item, i) => {
                    const heightPct = Math.round((item.count / 15) * 100);
                    return (
                      <div key={i} className="flex flex-col items-center h-full justify-end group">
                        <span className="text-xs font-bold mb-1 text-sky-600 dark:text-sky-400">
                          {item.count}
                        </span>
                        <div
                          style={{ height: `${heightPct}%` }}
                          className={`w-full max-w-[42px] rounded-t-lg transition-all ${
                            item.count >= 11 ? 'bg-red-500' : 'bg-sky-500'
                          }`}
                          title={item.label}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-7 gap-3 text-center mt-2">
                  {HOURLY_STATS.map((item, i) => (
                    <div key={i}>
                      <p className="text-xs font-bold">{item.hour}</p>
                      <p className={`text-[10px] ${textMuted}`}>{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Калькулятор масштабирования кластера LinQ TPU (Слайд 12, 13, 19) */}
              <div className={`lg:col-span-5 border rounded-2xl p-5 flex flex-col justify-between ${themeCard}`}>
                <div>
                  <h2 className="text-sm font-bold pb-3 border-b border-inherit flex items-center gap-2">
                    <Sliders size={16} className="text-sky-500" />
                    Калькулятор внедрения и нагрузки LinQ TPU
                  </h2>
                  <p className={`text-xs mt-2 ${textMuted}`}>
                    Расчет оборудования для масштабирования от столярной мастерской (5 камер) до крупного комбината (100 камер)
                  </p>

                  <div className={`mt-4 p-4 rounded-xl border ${themeSubCard}`}>
                    <div className="flex justify-between text-xs font-semibold mb-2">
                      <span>Количество видеопотоков на предприятии:</span>
                      <span className="text-sky-600 dark:text-sky-400 font-bold text-sm">
                        {clusterCamerasCount} камер
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      value={clusterCamerasCount}
                      onChange={(e) => setClusterCamerasCount(Number(e.target.value))}
                      className="w-full accent-sky-600 cursor-pointer"
                    />
                    <div className={`flex justify-between text-[10px] mt-1 ${textMuted}`}>
                      <span>5 камер (100 м²)</span>
                      <span>50 камер (Цех)</span>
                      <span>100 камер (10 000 м²)</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className={`p-3 rounded-xl border ${themeSubCard}`}>
                      <p className={`text-[11px] ${textMuted}`}>Узлов ускорителей LinQ</p>
                      <p className="text-lg font-bold mt-0.5 text-sky-600 dark:text-sky-400">
                        {Math.ceil(clusterCamerasCount / 16)} шт. (INT8)
                      </p>
                    </div>
                    <div className={`p-3 rounded-xl border ${themeSubCard}`}>
                      <p className={`text-[11px] ${textMuted}`}>Суммарный поток</p>
                      <p className="text-lg font-bold mt-0.5">
                        {clusterCamerasCount * 25} FPS
                      </p>
                    </div>
                    <div className={`p-3 rounded-xl border ${themeSubCard}`}>
                      <p className={`text-[11px] ${textMuted}`}>Снижение травматизма</p>
                      <p className="text-lg font-bold mt-0.5 text-emerald-600 dark:text-emerald-400">
                        до -78% в год
                      </p>
                    </div>
                    <div className={`p-3 rounded-xl border ${themeSubCard}`}>
                      <p className={`text-[11px] ${textMuted}`}>Защита по ст. 143 УК РФ</p>
                      <p className="text-lg font-bold mt-0.5">100% фотоархив</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Сводная аналитическая таблица по участкам и типам нарушений */}
            <div className={`border rounded-2xl p-5 ${themeCard}`}>
              <h3 className="text-sm font-bold mb-3">
                Сводная таблица безопасности по производственным участкам и типам нарушений
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800">
                    <tr>
                      <th className="p-3">Производственный участок</th>
                      <th className="p-3">Камера и Тип</th>
                      <th className="p-3">Частое нарушение</th>
                      <th className="p-3">Всего инцидентов</th>
                      <th className="p-3">Подтверждено ОТ</th>
                      <th className="p-3">Индекс безопасности</th>
                      <th className="p-3">Рекомендация ИИ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    <tr>
                      <td className="p-3 font-semibold">Участок №1 — Сборочный цех</td>
                      <td className="p-3">CAM-01 (Динамичная PTZ)</td>
                      <td className="p-3 text-red-600 dark:text-red-400 font-medium">
                        [02] Опасное сближение / [07] Падение
                      </td>
                      <td className="p-3 font-bold">19</td>
                      <td className="p-3">17 (89%)</td>
                      <td className="p-3 text-emerald-600 font-bold">94.2%</td>
                      <td className="p-3">Обновить разметку у манипулятора</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Участок №2 — Склад и отгрузка</td>
                      <td className="p-3">CAM-02 (Статичная)</td>
                      <td className="p-3 text-amber-600 dark:text-amber-400 font-medium">
                        [01] Бег по цеху / [08] Переноска груза
                      </td>
                      <td className="p-3 font-bold">28</td>
                      <td className="p-3">26 (93%)</td>
                      <td className="p-3 text-amber-600 font-bold">88.5%</td>
                      <td className="p-3">Инструктаж перед сменой в 07:55</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Участок №3 — Окрасочная и ГСМ</td>
                      <td className="p-3">CAM-03 (Динамичная PTZ)</td>
                      <td className="p-3 text-sky-600 dark:text-sky-400 font-medium">
                        [04] Курение / [06] Работа на высоте
                      </td>
                      <td className="p-3 font-bold">9</td>
                      <td className="p-3">9 (100%)</td>
                      <td className="p-3 text-emerald-600 font-bold">97.1%</td>
                      <td className="p-3">В пределах нормы</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= ВКЛАДКА 4: ИНСПЕКТОР СУБД ================= */}
        {activeTab === 'db_inspector' && (
          <div className="space-y-5">
            <div className={`border rounded-2xl p-5 ${themeCard}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-inherit">
                <div>
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <Database size={18} className="text-sky-500" />
                    Инспектор реляционной СУБД (PostgreSQL)
                  </h2>
                  <p className={`text-xs ${textMuted}`}>
                    Структура таблиц roles, users, sites, cameras и живой журнал events
                  </p>
                </div>
                <span className="text-xs font-mono px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">
                  Синхронизация активна
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    table: 'roles',
                    pk: 'id (int PK)',
                    fields: ['name (varchar UK) — Название роли'],
                    count: '4 записи',
                  },
                  {
                    table: 'users',
                    pk: 'id (int PK)',
                    fields: [
                      'login (varchar UK)',
                      'password_hash (bcrypt)',
                      'role_id (int FK → roles.id)',
                      'full_name (varchar ФИО)',
                      'is_active (boolean)',
                    ],
                    count: `${DB_USERS.length} сотрудника`,
                  },
                  {
                    table: 'sites',
                    pk: 'id (int PK)',
                    fields: [
                      'name (varchar Участок/цех)',
                      'rules (jsonb Правила и зоны)',
                      'created_at (timestamp)',
                    ],
                    count: `${cameras.length} участка`,
                  },
                  {
                    table: 'cameras',
                    pk: 'id (int PK)',
                    fields: [
                      'site_id (int FK → sites.id)',
                      'name (varchar Название)',
                      'rtsp_url (varchar Поток LinQ)',
                      'is_active (boolean)',
                    ],
                    count: `${cameras.length} камеры`,
                  },
                ].map((tb, idx) => (
                  <div key={idx} className={`p-3.5 rounded-xl border ${themeSubCard}`}>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-300 dark:border-slate-700">
                      <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
                        Таблица: {tb.table}
                      </span>
                      <span className="text-[11px] font-semibold">{tb.count}</span>
                    </div>
                    <p className="text-[11px] font-mono text-amber-600 dark:text-amber-400 mt-2">
                      🔑 {tb.pk}
                    </p>
                    <ul className={`text-[11px] font-mono mt-1.5 space-y-1 ${textMuted}`}>
                      {tb.fields.map((f, i) => (
                        <li key={i}>• {f}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider mb-2.5">
                  Живые записи таблицы events
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-300 dark:border-slate-700">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      <tr>
                        <th className="p-2.5">id (PK)</th>
                        <th className="p-2.5">camera_id (FK)</th>
                        <th className="p-2.5">violation (enum)</th>
                        <th className="p-2.5">frame_url & ai_map_url</th>
                        <th className="p-2.5">status</th>
                        <th className="p-2.5">processed_by_id (FK)</th>
                        <th className="p-2.5">confidence</th>
                        <th className="p-2.5">description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {events.map((ev) => (
                        <tr key={ev.id} className="hover:bg-sky-500/5">
                          <td className="p-2.5 font-bold">{ev.id}</td>
                          <td className="p-2.5">
                            {ev.camera_id} ({ev.camera_code})
                          </td>
                          <td className="p-2.5 text-red-600 dark:text-red-400 font-semibold">
                            {ev.violation}
                          </td>
                          <td className="p-2.5 text-[11px] text-sky-600 dark:text-sky-400">
                            <div>📷 {ev.frame_url}</div>
                            <div>🗺️ {ev.ai_map_url}</div>
                          </td>
                          <td className="p-2.5 font-semibold">{ev.status}</td>
                          <td className="p-2.5">
                            {ev.processed_by_id
                              ? `ID:${ev.processed_by_id} (${ev.processed_by_name.split(' ')[0]})`
                              : 'NULL'}
                          </td>
                          <td className="p-2.5 text-emerald-600 dark:text-emerald-400 font-bold">
                            {ev.confidence}
                          </td>
                          <td className="p-2.5 max-w-xs truncate">{ev.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}