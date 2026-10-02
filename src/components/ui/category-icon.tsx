import React from "react";
import {
  Monitor,
  Truck,
  Car,
  Armchair,
  Cpu,
  Printer,
  Camera,
  Speaker,
  Wrench,
  Stethoscope,
  FlaskConical,
  Shield,
  Building,
  Package,
  Archive,
  Boxes,
  HelpCircle,
} from "lucide-react";
import type { LucideProps } from "lucide-react";

export interface CategoryIconProps extends Omit<LucideProps, "ref"> {
  iconToken?: string | null;
}

export function CategoryIcon({ iconToken, ...props }: CategoryIconProps) {
  switch (iconToken) {
    case "monitor":
      return <Monitor {...props} />;
    case "truck":
      return <Truck {...props} />;
    case "car":
      return <Car {...props} />;
    case "armchair":
      return <Armchair {...props} />;
    case "cpu":
      return <Cpu {...props} />;
    case "printer":
      return <Printer {...props} />;
    case "camera":
      return <Camera {...props} />;
    case "speaker":
      return <Speaker {...props} />;
    case "wrench":
      return <Wrench {...props} />;
    case "stethoscope":
      return <Stethoscope {...props} />;
    case "flask-conical":
      return <FlaskConical {...props} />;
    case "shield":
      return <Shield {...props} />;
    case "building":
      return <Building {...props} />;
    case "package":
      return <Package {...props} />;
    case "archive":
      return <Archive {...props} />;
    case "boxes":
      return <Boxes {...props} />;
    default:
      return <HelpCircle {...props} />;
  }
}
