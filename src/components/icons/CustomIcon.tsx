import React from 'react';
import { iconData, type IconName } from './iconData';

interface CustomIconProps {
  name: IconName;
  size?: number;
  color?: string;
  className?: string;
}

/**
 * 统一的自定义图标组件
 * 通过 name 属性选择不同的图标
 */
export const CustomIcon: React.FC<CustomIconProps> = ({ 
  name,
  size = 16, 
  color = 'currentColor',
  className 
}) => {
  const icon = iconData[name];
  
  if (!icon) {
    console.warn(`CustomIcon: 未找到名为 "${name}" 的图标`);
    return null;
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={icon.viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      title={icon.description}
    >
      <path
        fill={color}
        fillRule="evenodd"
        d={icon.path}
        clipRule="evenodd"
      />
    </svg>
  );
};

export default CustomIcon;
