'use client';

import {
  AlertCircleIcon as HugeAlertCircleIcon,
  AlertTriangle as HugeAlertTriangle,
  ArrowLeftIcon as HugeArrowLeftIcon,
  ArrowRightIcon as HugeArrowRightIcon,
  BadgeCheckIcon as HugeBadgeCheckIcon,
  BellRingIcon as HugeBellRingIcon,
  BookUserIcon as HugeBookUserIcon,
  Building2 as HugeBuilding2,
  CalendarIcon as HugeCalendarIcon,
  CameraIcon as HugeCameraIcon,
  CarIcon as HugeCarIcon,
  CheckIcon as HugeCheckIcon,
  CheckmarkCircle02Icon as HugeCheckmarkCircle02Icon,
  ChevronDownIcon as HugeChevronDownIcon,
  ChevronLeftIcon as HugeChevronLeftIcon,
  ChevronRightIcon as HugeChevronRightIcon,
  ChevronUpIcon as HugeChevronUpIcon,
  ChevronsUpDown as HugeChevronsUpDown,
  CircleDashedIcon as HugeCircleDashedIcon,
  CircleIcon as HugeCircleIcon,
  CollapseIcon as HugeCollapseIcon,
  ContactIcon as HugeContactIcon,
  CopyIcon as HugeCopyIcon,
  CreditCardIcon as HugeCreditCardIcon,
  Crop as HugeCrop,
  ExpandIcon as HugeExpandIcon,
  FileText as HugeFileText,
  Filter as HugeFilter,
  Fingerprint as HugeFingerprint,
  FlashIcon as HugeFlashIcon,
  FlashOffIcon as HugeFlashOffIcon,
  FlaskConicalIcon as HugeFlaskConicalIcon,
  FolderOpenIcon as HugeFolderOpenIcon,
  GlassesIcon as HugeGlassesIcon,
  HelpCircleIcon as HugeHelpCircleIcon,
  House as HugeHouse,
  IdentityCardIcon as HugeIdentityCardIcon,
  Image01Icon as HugeImage01Icon,
  ImageUp as HugeImageUp,
  Mic01Icon as HugeMic01Icon,
  Info as HugeInfo,
  LandmarkIcon as HugeLandmarkIcon,
  Link2 as HugeLink2,
  Loading02Icon as HugeLoading02Icon,
  LocateFixed as HugeLocateFixed,
  LockIcon as HugeLockIcon,
  MailIcon as HugeMailIcon,
  MapPinCheck as HugeMapPinCheck,
  MapPinHouseIcon as HugeMapPinHouseIcon,
  MessageSquare as HugeMessageSquare,
  Minus as HugeMinus,
  Monitor as HugeMonitor,
  MoonIcon as HugeMoonIcon,
  PenLine as HugePenLine,
  PencilIcon as HugePencilIcon,
  PencilLine as HugePencilLine,
  Plus as HugePlus,
  RadarIcon as HugeRadarIcon,
  ReceiptTextIcon as HugeReceiptTextIcon,
  RefreshCcw as HugeRefreshCcw,
  RefreshCw as HugeRefreshCw,
  ScanFace as HugeScanFace,
  ScanLine as HugeScanLine,
  SearchIcon as HugeSearchIcon,
  SearchX as HugeSearchX,
  ShieldCheck as HugeShieldCheck,
  SlidersHorizontalIcon as HugeSlidersHorizontalIcon,
  Smartphone as HugeSmartphone,
  SmartphoneNfcIcon as HugeSmartphoneNfcIcon,
  Stamp as HugeStamp,
  SparklesIcon as HugeSparklesIcon,
  SunIcon as HugeSunIcon,
  SwitchCamera as HugeSwitchCamera,
  TimerIcon as HugeTimerIcon,
  UploadIcon as HugeUploadIcon,
  UserAdd01Icon as HugeUserAdd01Icon,
  UserGroupIcon as HugeUserGroupIcon,
  UserIcon as HugeUserIcon,
  UserRound as HugeUserRound,
  VideoIcon as HugeVideoIcon,
  X as HugeX,
  XCircle as HugeXCircle,
  ZapIcon as HugeZapIcon,
  ZoomIn as HugeZoomIn,
} from '@hugeicons/core-free-icons';
import { LONG_ARROW_LEFT } from './glyphs';
import { createAppIcon } from './app-icon';

export { ICON_SIZES, createAppIcon } from './app-icon';
export type { AppIconComponent, AppIconProps, AppIconSize } from './app-icon';

/**
 * Every icon the SDK draws, named as Lucide named it so call sites keep their
 * intent-led names, and drawn by Hugeicons Stroke Rounded so the SDK and the
 * dashboard share one glyph set. Where the dashboard has already chosen a
 * glyph for a name, that exact choice is repeated here — one icon, one
 * identity, wherever it appears in the product.
 */
export const CircleAlert = createAppIcon(HugeAlertCircleIcon, 'CircleAlert');
export const Glasses = createAppIcon(HugeGlassesIcon, 'Glasses');
export const TriangleAlert = createAppIcon(HugeAlertTriangle, 'TriangleAlert');
export const ArrowLeft = createAppIcon(HugeArrowLeftIcon, 'ArrowLeft');
export const ArrowRight = createAppIcon(HugeArrowRightIcon, 'ArrowRight');
export const BadgeCheck = createAppIcon(HugeBadgeCheckIcon, 'BadgeCheck');
export const BellRing = createAppIcon(HugeBellRingIcon, 'BellRing');
export const BookUser = createAppIcon(HugeBookUserIcon, 'BookUser');
export const Building2 = createAppIcon(HugeBuilding2, 'Building2');
export const Calendar = createAppIcon(HugeCalendarIcon, 'Calendar');
export const Camera = createAppIcon(HugeCameraIcon, 'Camera');
export const Car = createAppIcon(HugeCarIcon, 'Car');
export const Check = createAppIcon(HugeCheckIcon, 'Check');
export const CircleCheck = createAppIcon(HugeCheckmarkCircle02Icon, 'CircleCheck');
export const ChevronDown = createAppIcon(HugeChevronDownIcon, 'ChevronDown');
export const ChevronLeft = createAppIcon(HugeChevronLeftIcon, 'ChevronLeft');
export const ChevronRight = createAppIcon(HugeChevronRightIcon, 'ChevronRight');
export const ChevronUp = createAppIcon(HugeChevronUpIcon, 'ChevronUp');
export const ChevronsUpDown = createAppIcon(HugeChevronsUpDown, 'ChevronsUpDown');
export const Circle = createAppIcon(HugeCircleIcon, 'Circle');
export const CircleDashed = createAppIcon(HugeCircleDashedIcon, 'CircleDashed');
export const Contact = createAppIcon(HugeContactIcon, 'Contact');
export const Copy = createAppIcon(HugeCopyIcon, 'Copy');
export const CreditCard = createAppIcon(HugeCreditCardIcon, 'CreditCard');
export const Crop = createAppIcon(HugeCrop, 'Crop');
export const FileText = createAppIcon(HugeFileText, 'FileText');
export const Filter = createAppIcon(HugeFilter, 'Filter');
export const Fingerprint = createAppIcon(HugeFingerprint, 'Fingerprint');
export const Flash = createAppIcon(HugeFlashIcon, 'Flash');
export const FlashOff = createAppIcon(HugeFlashOffIcon, 'FlashOff');
export const FlaskConical = createAppIcon(HugeFlaskConicalIcon, 'FlaskConical');
export const FolderOpen = createAppIcon(HugeFolderOpenIcon, 'FolderOpen');
export const CircleHelp = createAppIcon(HugeHelpCircleIcon, 'CircleHelp');
export const House = createAppIcon(HugeHouse, 'House');
export const IdCard = createAppIcon(HugeIdentityCardIcon, 'IdCard');
export const Image = createAppIcon(HugeImage01Icon, 'Image');
export const ImageUp = createAppIcon(HugeImageUp, 'ImageUp');
export const Mic = createAppIcon(HugeMic01Icon, 'Mic');
export const Info = createAppIcon(HugeInfo, 'Info');
export const Landmark = createAppIcon(HugeLandmarkIcon, 'Landmark');
export const Link2 = createAppIcon(HugeLink2, 'Link2');
export const Loader2 = createAppIcon(HugeLoading02Icon, 'Loader2');
export const LocateFixed = createAppIcon(HugeLocateFixed, 'LocateFixed');
export const Lock = createAppIcon(HugeLockIcon, 'Lock');
export const Mail = createAppIcon(HugeMailIcon, 'Mail');
// One location icon everywhere: the pin with a house. Both names draw it.
export const MapPin = createAppIcon(HugeMapPinHouseIcon, 'MapPin');
export const MapPinCheck = createAppIcon(HugeMapPinCheck, 'MapPinCheck');
export const MapPinHouse = createAppIcon(HugeMapPinHouseIcon, 'MapPinHouse');
export const MapPinned = createAppIcon(HugeMapPinHouseIcon, 'MapPinned');
// The fullscreen toggle. Hugeicons' own `Maximize2`/`Minimize2` aliases
// resolve to Maximize02Icon/Minimize02Icon, which in this set are PINCH
// GESTURE glyphs (a hand), not the corner arrows Lucide's names describe.
// `ExpandIcon` is the glyph the dashboard already draws for this, and
// `CollapseIcon` is its designed counterpart, so the two surfaces agree.
export const Maximize2 = createAppIcon(HugeExpandIcon, 'Maximize2');
export const MessageSquare = createAppIcon(HugeMessageSquare, 'MessageSquare');
export const Minimize2 = createAppIcon(HugeCollapseIcon, 'Minimize2');
export const Minus = createAppIcon(HugeMinus, 'Minus');
export const Monitor = createAppIcon(HugeMonitor, 'Monitor');
export const Moon = createAppIcon(HugeMoonIcon, 'Moon');
// Lucide's `MoveLeft` is a LONG arrow: a full-width shaft with a small head.
// Hugeicons has no equivalent — `MoveLeftIcon` is a MOVE affordance (an arrow
// trailing a dot), `ArrowLeftIcon`/`ArrowLeft01Icon` are bare chevrons with no
// shaft, `ArrowLeft03`/`05` run into a vertical bar, and the longest true
// arrow, `ArrowLeft02Icon`, spans only 13.5 of 24 units against Lucide's 20.
// So this one glyph is drawn locally, in the set's own stroke language.
export const MoveLeft = createAppIcon(LONG_ARROW_LEFT, 'MoveLeft');
export const PenLine = createAppIcon(HugePenLine, 'PenLine');
export const Pencil = createAppIcon(HugePencilIcon, 'Pencil');
export const PencilLine = createAppIcon(HugePencilLine, 'PencilLine');
export const Plus = createAppIcon(HugePlus, 'Plus');
export const Radar = createAppIcon(HugeRadarIcon, 'Radar');
export const ReceiptText = createAppIcon(HugeReceiptTextIcon, 'ReceiptText');
export const RefreshCcw = createAppIcon(HugeRefreshCcw, 'RefreshCcw');
export const RefreshCw = createAppIcon(HugeRefreshCw, 'RefreshCw');
// Lucide's `RotateCcw` is a circular arrow. Hugeicons' alias of that name
// resolves to `RotateLeft01Icon`, which is a HAND rotating an object — so
// every Retake and retry control drew a hand. It takes the same drawing as
// `RefreshCcw`, which is the plain circular arrow the name describes. The
// two names are both kept: a call site says whether it means retake or
// replace, and the barrel decides the glyph.
export const RotateCcw = createAppIcon(HugeRefreshCcw, 'RotateCcw');
export const ScanFace = createAppIcon(HugeScanFace, 'ScanFace');
export const ScanLine = createAppIcon(HugeScanLine, 'ScanLine');
export const Search = createAppIcon(HugeSearchIcon, 'Search');
export const SearchX = createAppIcon(HugeSearchX, 'SearchX');
export const ShieldCheck = createAppIcon(HugeShieldCheck, 'ShieldCheck');
export const SlidersHorizontal = createAppIcon(HugeSlidersHorizontalIcon, 'SlidersHorizontal');
export const Smartphone = createAppIcon(HugeSmartphone, 'Smartphone');
export const Nfc = createAppIcon(HugeSmartphoneNfcIcon, 'Nfc');
export const Stamp = createAppIcon(HugeStamp, 'Stamp');
export const Sparkles = createAppIcon(HugeSparklesIcon, 'Sparkles');
export const Sun = createAppIcon(HugeSunIcon, 'Sun');
export const SwitchCamera = createAppIcon(HugeSwitchCamera, 'SwitchCamera');
export const Timer = createAppIcon(HugeTimerIcon, 'Timer');
export const Upload = createAppIcon(HugeUploadIcon, 'Upload');
export const User = createAppIcon(HugeUserIcon, 'User');
export const UserRound = createAppIcon(HugeUserRound, 'UserRound');
export const UserRoundPlus = createAppIcon(HugeUserAdd01Icon, 'UserRoundPlus');
export const UsersRound = createAppIcon(HugeUserGroupIcon, 'UsersRound');
export const Video = createAppIcon(HugeVideoIcon, 'Video');
export const X = createAppIcon(HugeX, 'X');
export const CircleX = createAppIcon(HugeXCircle, 'CircleX');
export const Zap = createAppIcon(HugeZapIcon, 'Zap');
export const ZoomIn = createAppIcon(HugeZoomIn, 'ZoomIn');
