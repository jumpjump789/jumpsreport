function Icon({ children, size = 16, style, className, strokeWidth = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
      {children}
    </svg>
  );
}

export const IconUpload = (p) => <Icon {...p}><path d="M12 16V4M12 4L7 9M12 4L17 9" /><path d="M4 16V19C4 19.55 4.45 20 5 20H19C19.55 20 20 19.55 20 19V16" /></Icon>;
export const IconSave = (p) => <Icon {...p}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 4V9H16V4" /><path d="M8 20V14H16V20" /></Icon>;
export const IconHistory = (p) => <Icon {...p}><circle cx="12" cy="12" r="8" /><path d="M12 8V12L15 14" /></Icon>;
export const IconX = (p) => <Icon {...p}><path d="M6 6L18 18M18 6L6 18" /></Icon>;
export const IconLoader = (p) => <Icon {...p} className={`st-spin ${p.className || ''}`}><circle cx="12" cy="12" r="9" opacity="0.25" /><path d="M21 12A9 9 0 0 0 12 3" /></Icon>;
export const IconCheckCircle = (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M8 12L11 15L16 9" /></Icon>;
export const IconAlertCircle = (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><line x1="12" y1="7" x2="12" y2="13" /><circle cx="12" cy="16.3" r="0.9" fill="currentColor" stroke="none" /></Icon>;
export const IconChevronLeft = (p) => <Icon {...p}><path d="M15 6L9 12L15 18" /></Icon>;
export const IconTrash = (p) => <Icon {...p}><path d="M5 7H19" /><path d="M9 7V4H15V7" /><path d="M7 7L8 20H16L17 7" /></Icon>;
export const IconDownload = (p) => <Icon {...p}><path d="M12 4V15M12 15L7 10M12 15L17 10" /><path d="M4 19H20" /></Icon>;
export const IconMenu = (p) => <Icon {...p}><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></Icon>;
export const IconSearch = (p) => <Icon {...p}><circle cx="10" cy="10" r="6" /><line x1="15" y1="15" x2="20" y2="20" /></Icon>;
export const IconBell = (p) => <Icon {...p}><path d="M6 10C6 6 8.5 4 12 4C15.5 4 18 6 18 10C18 14 19 15 19 15H5C5 15 6 14 6 10Z" /><path d="M10 18C10 19 11 20 12 20C13 20 14 19 14 18" /></Icon>;
export const IconCar = (p) => <Icon {...p}><path d="M4 16L5.5 10C5.8 9 6.7 8 8 8H16C17.3 8 18.2 9 18.5 10L20 16" /><rect x="3" y="16" width="18" height="4" rx="1" /><circle cx="7.5" cy="20" r="1.3" /><circle cx="16.5" cy="20" r="1.3" /></Icon>;
export const IconReceipt = (p) => <Icon {...p}><path d="M7 3H17V21L15 19.5L13 21L11 19.5L9 21L7 19.5Z" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="9" y1="12" x2="15" y2="12" /></Icon>;
export const IconPencil = (p) => <Icon {...p}><path d="M4 20L4.7 16.5L15 6.2C15.5 5.7 16.3 5.7 16.8 6.2L17.8 7.2C18.3 7.7 18.3 8.5 17.8 9L7.5 19.3L4 20Z" /></Icon>;
export const IconPlus = (p) => <Icon {...p}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></Icon>;
