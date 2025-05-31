import React from 'react';
import {
  User, Bot, Brain, Rocket, Search, BookOpen, Lightbulb,
  Target, Palette, Gamepad2, Globe, Laptop, FileText, BarChart,
  Puzzle, Settings, Wrench, TestTube, Microscope, Trophy, GraduationCap,
  Briefcase, TrendingUp, DollarSign, ShoppingCart, Handshake, Smartphone,
  MessageCircle, Mail, Calendar, Lock, Key, Shield, Folder, Clipboard,
  Pin, Magnet, Heart, Star, Zap, Coffee, Music, Camera, Video, Headphones,
  Code, Database, Server, Cloud, Wifi, Download, Upload, Share, Link,
  Edit, Trash2, Plus, Minus, Check, X, ArrowRight, ArrowLeft, Home, Menu
} from 'lucide-react';

// 图标映射表
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  User, Bot, Brain, Rocket, Search, BookOpen, Lightbulb,
  Target, Palette, Gamepad2, Globe, Laptop, FileText, BarChart,
  Puzzle, Settings, Wrench, TestTube, Microscope, Trophy, GraduationCap,
  Briefcase, TrendingUp, DollarSign, ShoppingCart, Handshake, Smartphone,
  MessageCircle, Mail, Calendar, Lock, Key, Shield, Folder, Clipboard,
  Pin, Magnet, Heart, Star, Zap, Coffee, Music, Camera, Video, Headphones,
  Code, Database, Server, Cloud, Wifi, Download, Upload, Share, Link,
  Edit, Trash2, Plus, Minus, Check, X, ArrowRight, ArrowLeft, Home, Menu
};

interface LucideIconRendererProps {
  iconName: string;
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Lucide图标渲染器 - 根据图标名称渲染对应的Lucide图标
 */
export default function LucideIconRenderer({ 
  iconName, 
  size = 20, 
  color, 
  className,
  style 
}: LucideIconRendererProps) {
  const IconComponent = ICON_MAP[iconName];
  
  if (!IconComponent) {
    // 如果找不到图标，显示默认的Bot图标
    return <Bot size={size} color={color} className={className} style={style} />;
  }
  
  return <IconComponent size={size} color={color} className={className} style={style} />;
}

/**
 * 检查是否为Lucide图标名称
 */
export function isLucideIcon(iconName: string): boolean {
  return iconName in ICON_MAP;
}

/**
 * 获取所有可用的Lucide图标名称
 */
export function getAllLucideIconNames(): string[] {
  return Object.keys(ICON_MAP);
}
