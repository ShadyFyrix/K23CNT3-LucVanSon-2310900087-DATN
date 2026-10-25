import React from 'react';
import { LucideIcon } from 'lucide-react';

interface AnimatedIconProps {
  icon: LucideIcon;
  size?: number;
  className?: string;
  animation?: 'pulse' | 'spin' | 'bounce' | 'ping' | 'none';
  color?: string;
}

export const AnimatedIcon: React.FC<AnimatedIconProps> = ({
  icon: Icon,
  size = 20,
  className = '',
  animation = 'none',
  color
}) => {
  const getAnimationClass = () => {
    switch (animation) {
      case 'pulse':
        return 'animate-pulse';
      case 'spin':
        return 'animate-spin';
      case 'bounce':
        return 'animate-bounce';
      case 'ping':
        return 'animate-ping';
      default:
        return '';
    }
  };

  return (
    <span className={`inline-flex items-center justify-center transition-transform hover:scale-110 duration-200 ${getAnimationClass()} ${className}`}>
      <Icon size={size} color={color} />
    </span>
  );
};

export default AnimatedIcon;
