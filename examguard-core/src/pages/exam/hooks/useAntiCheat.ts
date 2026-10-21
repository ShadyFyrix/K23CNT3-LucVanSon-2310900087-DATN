import { useEffect } from 'react';

interface UseAntiCheatOptions {
  enabled: boolean;
  onViolation: (eventType: string, details?: any) => void;
  isFullscreen: boolean;
  setIsFullscreen: (val: boolean) => void;
}

/**
 * Custom Hook theo dõi & ngăn chặn gian lận trình duyệt (Anti-Cheat Security)
 * Tuân thủ Single Responsibility Principle (SRP)
 */
export function useAntiCheat({
  enabled,
  onViolation,
  isFullscreen,
  setIsFullscreen
}: UseAntiCheatOptions) {
  useEffect(() => {
    if (!enabled) return;

    // 1. Chuyển tab / Ẩn trang
    const handleVisibilityChange = () => {
      if (document.hidden) {
        onViolation('TAB_SWITCH', {
          reason: 'Thí sinh chuyển sang tab hoặc ứng dụng khác ngoài trang thi',
          timestamp: new Date()
        });
      }
    };

    // 2. Chặn chuột phải (Context Menu)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      onViolation('RIGHT_CLICK', {
        reason: 'Thao tác click chuột phải bị chặn theo quy chế',
        timestamp: new Date()
      });
    };

    // 3. Chặn Copy, Paste, Cut
    const handleCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      onViolation('COPY_PASTE', {
        action: e.type,
        timestamp: new Date()
      });
    };

    // 4. Bắt các phím tắt DevTools, Reload, Save Page
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 mở DevTools
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        onViolation('DEVTOOLS_OPEN', {
          trigger: 'F12',
          timestamp: new Date()
        });
        return;
      }

      // Ctrl + Shift + I, Ctrl + Shift + J, Ctrl + Shift + C
      if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)) {
        e.preventDefault();
        onViolation('DEVTOOLS_OPEN', {
          trigger: `Ctrl+Shift+${e.key.toUpperCase()}`,
          timestamp: new Date()
        });
        return;
      }

      // Ctrl + U (Xem mã nguồn trang)
      if (e.ctrlKey && ['U', 'u'].includes(e.key)) {
        e.preventDefault();
        onViolation('DEVTOOLS_OPEN', {
          trigger: 'Ctrl+U',
          timestamp: new Date()
        });
        return;
      }

      // Ctrl + S (Lưu trang)
      if (e.ctrlKey && ['S', 's'].includes(e.key)) {
        e.preventDefault();
        return;
      }
    };

    // 5. Thoát toàn màn hình
    const handleFullscreenChange = () => {
      const isNowFull = Boolean(document.fullscreenElement);
      setIsFullscreen(isNowFull);
      if (!isNowFull && isFullscreen) {
        onViolation('FULLSCREEN_EXIT', {
          reason: 'Thí sinh thoát chế độ toàn màn hình',
          timestamp: new Date()
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('cut', handleCopyPaste);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('cut', handleCopyPaste);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [enabled, onViolation, isFullscreen, setIsFullscreen]);
}
