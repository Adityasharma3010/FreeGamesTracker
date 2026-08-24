import React from "react";
import {
  SiSteam,
  SiEpicgames,
  SiGogdotcom,
  SiPlaystation,
  SiXbox,
  SiNintendoswitch,
  SiAndroid,
  SiApple,
  SiItchdotio,
} from "react-icons/si";
import { LuMonitor, LuGamepad2 } from "react-icons/lu";

// Real brand marks instead of emoji. These are Simple Icons — simplified,
// permissively-licensed brand glyphs (not scans/exports of the official
// logo artwork), which is the standard way to reference a brand's icon
// in a third-party UI without redistributing their actual logo files.
const ICONS = {
  pc: LuMonitor,
  steam: SiSteam,
  epic: SiEpicgames,
  gog: SiGogdotcom,
  ps4: SiPlaystation,
  ps5: SiPlaystation,
  xboxseries: SiXbox,
  xboxone: SiXbox,
  switch: SiNintendoswitch,
  android: SiAndroid,
  ios: SiApple,
  itchio: SiItchdotio,
  other: LuGamepad2,
};

export default function PlatformIcon({ platformKey, size = 14, style, className }) {
  const Icon = ICONS[platformKey] || LuGamepad2;
  return <Icon size={size} style={style} className={className} aria-hidden="true" />;
}
