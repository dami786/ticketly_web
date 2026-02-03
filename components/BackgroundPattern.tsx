"use client";

import React from "react";
import type { BackgroundElement, PatternWeight } from "../lib/ticketTheme";
import { PATTERN_WEIGHT_MULTIPLIER } from "../lib/ticketTheme";

const VIEWBOX_WIDTH = 400;
const VIEWBOX_HEIGHT = 320;

interface BackgroundPatternProps {
  element: BackgroundElement;
  width?: number;
  height?: number;
  patternWeight: PatternWeight;
  overlayColor: string;
}

const BASE_STROKE = 1.5;

export function BackgroundPattern({
  element,
  width = VIEWBOX_WIDTH,
  height = VIEWBOX_HEIGHT,
  patternWeight,
  overlayColor,
}: BackgroundPatternProps) {
  if (element === "none") return null;

  const mult = PATTERN_WEIGHT_MULTIPLIER[patternWeight] ?? 1.2;
  const stroke = BASE_STROKE * mult;

  const commonProps = {
    fill: "none",
    stroke: overlayColor,
    strokeWidth: stroke,
    opacity: 0.5,
  };

  const renderPattern = () => {
    switch (element) {
      case "grid": {
        const step = 16 + stroke * 2;
        const lines: React.ReactNode[] = [];
        for (let x = 0; x <= width + step; x += step) {
          lines.push(<line key={`v-${x}`} x1={x} y1={0} x2={x} y2={height} {...commonProps} />);
        }
        for (let y = 0; y <= height + step; y += step) {
          lines.push(<line key={`h-${y}`} x1={0} y1={y} x2={width} y2={y} {...commonProps} />);
        }
        return lines;
      }
      case "organic":
      case "fluid": {
        const waves = 4;
        const path = Array.from({ length: waves }, (_, i) => {
          const y = (height / (waves + 1)) * (i + 1);
          const amp = 8 + stroke * 2;
          let d = `M 0 ${y}`;
          for (let x = 0; x <= width + 20; x += 20) {
            d += ` Q ${x + 10} ${y - amp} ${x + 20} ${y}`;
          }
          return <path key={i} d={d} {...commonProps} />;
        });
        return path;
      }
      case "geometric": {
        const step = 24;
        const shapes: React.ReactNode[] = [];
        for (let x = 0; x < width + step; x += step) {
          for (let y = 0; y < height + step; y += step) {
            shapes.push(
              <circle key={`${x}-${y}`} cx={x} cy={y} r={3 + stroke} {...commonProps} />
            );
          }
        }
        return shapes;
      }
      case "mesh":
      case "gradient_mesh": {
        const step = 20;
        const lines: React.ReactNode[] = [];
        for (let i = 0; i <= 8; i++) {
          const t = i / 8;
          lines.push(
            <line key={`d1-${i}`} x1={0} y1={t * height} x2={width} y2={(1 - t) * height} {...commonProps} />,
            <line key={`d2-${i}`} x1={t * width} y1={0} x2={(1 - t) * width} y2={height} {...commonProps} />
          );
        }
        return lines;
      }
      case "vector": {
        const step = 28;
        const lines: React.ReactNode[] = [];
        for (let x = 0; x <= width + step; x += step) {
          lines.push(<line key={`v-${x}`} x1={x} y1={0} x2={x} y2={height} {...commonProps} />);
        }
        for (let y = 0; y <= height + step; y += step) {
          lines.push(<line key={`h-${y}`} x1={0} y1={y} x2={width} y2={y} {...commonProps} />);
        }
        return lines;
      }
      case "dynamic": {
        const step = 14;
        const path = `M 0 ${height / 2} Q ${width * 0.25} ${height * 0.3} ${width / 2} ${height / 2} T ${width} ${height / 2}`;
        return [
          <path key="1" d={path} {...commonProps} />,
          <path key="2" d={path} transform={`translate(0, ${height * 0.2})`} {...commonProps} />,
          <path key="3" d={path} transform={`translate(0, ${-height * 0.2})`} {...commonProps} />,
        ];
      }
      default:
        return (
          <rect x={0} y={0} width={width} height={height} fill={overlayColor} opacity={0.08} />
        );
    }
  };

  const viewBox = `0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`;
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden rounded-[12px]"
      aria-hidden
    >
      <svg width="100%" height="100%" viewBox={viewBox} preserveAspectRatio="none">
        {renderPattern()}
      </svg>
    </div>
  );
}
