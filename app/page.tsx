"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type GameMode = "WINNER" | "LOSER";
type Screen = "setup" | "race" | "result";
type CameraMode = "follow" | "fixed";

type Participant = {
  id: number;
  name: string;
  count: number;
};

type RaceBall = {
  id: string;
  label: string;
  owner: string;
  color: string;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  angle: number;
  angularVelocity: number;
  seed: number;
  branchChoices: number[];
  jumpHits: boolean[];
  lastX: number;
  lastY: number;
  stuckSince: number;
  finishedAt: number | null;
};

type FinishRecord = {
  id: string;
  label: string;
  owner: string;
  color: string;
  finishedAt: number;
};

type RankEntry = {
  id: string;
  label: string;
  color: string;
  rank: number;
  y: number;
  finishedAt: number | null;
};

type RaceEvent = {
  id: number;
  text: string;
  tone: "leader" | "rise" | "pass";
};

type LeaderSpotlight = {
  title: string;
  label: string;
  color: string;
  until: number;
} | null;

type Bumper = {
  x: number;
  y: number;
  r: number;
};

type Branch = {
  y: number;
  height: number;
  leftTarget: number;
  centerTarget: number;
  rightTarget: number;
};

type Spinner = {
  x: number;
  y: number;
  length: number;
  speed: number;
};

type Hammer = {
  x: number;
  y: number;
  length: number;
  speed: number;
  phase: number;
};

type Platform = {
  y: number;
  width: number;
  speed: number;
  phase: number;
};

type JumpZone = {
  x: number;
  y: number;
  width: number;
  forceX: number;
  forceY: number;
};

type GuideBar = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  force: number;
};

type CTrap = {
  x: number;
  y: number;
  r: number;
  open: "left" | "right";
};

type SCorridor = {
  y: number;
  height: number;
  amplitude: number;
  phase: number;
};

type WindZone = {
  y: number;
  height: number;
  direction: "left" | "right";
  force: number;
  label: string;
};

type SectionLabel = {
  title: string;
  y: number;
  tone: "start" | "branch" | "spinner" | "hammer" | "jump" | "platform" | "finish";
};

type TrackZone = {
  title: string;
  subtitle: string;
  x: number;
  y: number;
  width: number;
  height: number;
  border: string;
  background: string;
  text: string;
};

type TrackPath = {
  title: string;
  d: string;
  color: string;
  width: number;
};

const MAP_WIDTH = 960;
const MAP_HEIGHT = 7600;
const VIEW_HEIGHT = 720;
const FINISH_Y = 7350;
const BALL_RADIUS = 16;
const VISUAL_BALL_SIZE = 44;
const GRAVITY = 0.08;
const FRICTION = 0.982;
const DAMPING = 0.994;
const BUMPER_RESTITUTION = 0.52;
const MAX_HORIZONTAL_SPEED = 1.65;
const MAX_FALL_SPEED = 5.1;
const CAMERA_FOLLOW = 0.18;
const CAMERA_DEADZONE = 120;
const CAMERA_TARGET_SMOOTHING = 0.14;
const CAMERA_MAX_STEP = 24;
const CAMERA_VIEW_ANCHOR = 0.48;
const PHYSICS_STEP = 1000 / 60;
const SOLVER_ITERATIONS = 2;
const CCD_SAMPLES: number = 3;
const ROLLING_RESISTANCE = 0.992;
const ANGULAR_DAMPING = 0.965;
const MICRO_VELOCITY_EPSILON = 0.025;
const WALL_X = 62;
const MAX_BALLS = 100;

const COLORS = [
  "#e11d48",
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#be123c",
  "#4f46e5",
];

const TRACK_PATHS: TrackPath[] = [
  {
    title: "A early route",
    d: "M480 210 C360 430 170 520 170 920 C170 1230 210 1590 410 1900",
    color: "#ef4444",
    width: 86,
  },
  {
    title: "B early route",
    d: "M480 210 C470 500 480 850 480 1260 C480 1510 480 1750 480 1900",
    color: "#3b82f6",
    width: 86,
  },
  {
    title: "C early route",
    d: "M480 210 C640 430 790 540 790 960 C790 1320 760 1650 550 1900",
    color: "#8b5cf6",
    width: 86,
  },
  {
    title: "merge",
    d: "M410 1900 C430 2060 450 2240 480 2660 M550 1900 C520 2060 500 2240 480 2660",
    color: "#22c55e",
    width: 82,
  },
  {
    title: "s course",
    d: "M480 2660 C190 2860 190 3180 480 3420 C770 3660 770 3920 480 4180",
    color: "#38bdf8",
    width: 92,
  },
  {
    title: "fast late route",
    d: "M480 4180 C320 4300 180 4480 180 4860 C180 5260 310 5520 410 5700",
    color: "#ef4444",
    width: 86,
  },
  {
    title: "safe late route",
    d: "M480 4180 C480 4480 480 4950 480 5700",
    color: "#3b82f6",
    width: 86,
  },
  {
    title: "chaos late route",
    d: "M480 4180 C680 4300 805 4580 780 5060 C760 5420 610 5580 550 5700",
    color: "#8b5cf6",
    width: 86,
  },
  {
    title: "bottleneck",
    d: "M410 5700 C455 5900 465 6220 480 6460 M550 5700 C510 5900 495 6220 480 6460",
    color: "#facc15",
    width: 78,
  },
  {
    title: "scramble",
    d: "M480 6460 C250 6580 260 7040 480 7220 C700 7040 700 6580 480 6460",
    color: "#a855f7",
    width: 82,
  },
  {
    title: "finish",
    d: "M480 7220 L480 7350",
    color: "#e5e7eb",
    width: 90,
  },
];

const TRACK_ZONES: TrackZone[] = [
  {
    title: "A",
    subtitle: "FAST / RISK",
    x: 96,
    y: 760,
    width: 248,
    height: 1140,
    border: "#b91c1c",
    background: "rgba(254, 226, 226, 0.52)",
    text: "#991b1b",
  },
  {
    title: "B",
    subtitle: "SAFE",
    x: 356,
    y: 760,
    width: 248,
    height: 1140,
    border: "#2563eb",
    background: "rgba(219, 234, 254, 0.5)",
    text: "#1d4ed8",
  },
  {
    title: "C",
    subtitle: "CHAOS",
    x: 616,
    y: 760,
    width: 248,
    height: 1140,
    border: "#7c3aed",
    background: "rgba(243, 232, 255, 0.52)",
    text: "#6d28d9",
  },
  {
    title: "MERGE ZONE",
    subtitle: "FIRST PASSING FIGHT",
    x: 260,
    y: 1900,
    width: 440,
    height: 760,
    border: "#171717",
    background: "rgba(255, 255, 255, 0.64)",
    text: "#171717",
  },
  {
    title: "S COURSE",
    subtitle: "LEFT / RIGHT / LEFT / RIGHT",
    x: 120,
    y: 2660,
    width: 720,
    height: 1520,
    border: "#0f766e",
    background: "rgba(204, 251, 241, 0.36)",
    text: "#0f766e",
  },
  {
    title: "FAST",
    subtitle: "SHORT / DANGER",
    x: 96,
    y: 4180,
    width: 248,
    height: 1520,
    border: "#b91c1c",
    background: "rgba(254, 226, 226, 0.48)",
    text: "#991b1b",
  },
  {
    title: "SAFE",
    subtitle: "AVERAGE",
    x: 356,
    y: 4180,
    width: 248,
    height: 1520,
    border: "#2563eb",
    background: "rgba(219, 234, 254, 0.45)",
    text: "#1d4ed8",
  },
  {
    title: "CHAOS",
    subtitle: "LONG / VARIABLE",
    x: 616,
    y: 4180,
    width: 248,
    height: 1520,
    border: "#7c3aed",
    background: "rgba(243, 232, 255, 0.48)",
    text: "#6d28d9",
  },
  {
    title: "BOTTLENECK",
    subtitle: "TOP5 MUST MEET",
    x: 382,
    y: 5700,
    width: 196,
    height: 760,
    border: "#b45309",
    background: "rgba(254, 243, 199, 0.62)",
    text: "#92400e",
  },
  {
    title: "SCRAMBLE",
    subtitle: "FINAL BATTLE",
    x: 220,
    y: 6460,
    width: 520,
    height: 760,
    border: "#b91c1c",
    background: "rgba(254, 226, 226, 0.42)",
    text: "#991b1b",
  },
];

const BRANCHES: Branch[] = [
  { y: 760, height: 1140, leftTarget: 180, centerTarget: 480, rightTarget: 780 },
  { y: 4180, height: 1520, leftTarget: 180, centerTarget: 480, rightTarget: 780 },
  { y: 5700, height: 760, leftTarget: 410, centerTarget: 480, rightTarget: 550 },
];

const BUMPERS: Bumper[] = [
  { x: 210, y: 1180, r: 38 },
  { x: 260, y: 1560, r: 36 },
  { x: 760, y: 1380, r: 38 },
  { x: 410, y: 2160, r: 40 },
  { x: 550, y: 2340, r: 40 },
  { x: 220, y: 4720, r: 36 },
  { x: 770, y: 5120, r: 38 },
  { x: 480, y: 6080, r: 42 },
  { x: 330, y: 6700, r: 30 },
  { x: 620, y: 6860, r: 30 },
  { x: 480, y: 7040, r: 32 },
];

const SPINNERS: Spinner[] = [
  { x: 480, y: 3440, length: 300, speed: 0.0039 },
];

const HAMMERS: Hammer[] = [
];

const PLATFORMS: Platform[] = [
];

const JUMP_ZONES: JumpZone[] = [
  { x: 130, y: 1020, width: 190, forceX: 1.15, forceY: -1.25 },
  { x: 130, y: 4440, width: 190, forceX: 1.2, forceY: -1.35 },
];

const GUIDE_BARS: GuideBar[] = [
  { x1: 370, y1: 1040, x2: 590, y2: 1110, force: 0.11 },
  { x1: 590, y1: 1540, x2: 370, y2: 1610, force: 0.11 },
  { x1: 145, y1: 2860, x2: 760, y2: 3040, force: 0.12 },
  { x1: 805, y1: 3260, x2: 190, y2: 3440, force: 0.12 },
  { x1: 145, y1: 3660, x2: 760, y2: 3840, force: 0.12 },
  { x1: 370, y1: 4780, x2: 590, y2: 4850, force: 0.11 },
  { x1: 180, y1: 5880, x2: 420, y2: 5960, force: 0.1 },
  { x1: 780, y1: 5880, x2: 540, y2: 5960, force: 0.1 },
];

const C_TRAPS: CTrap[] = [];

const S_CORRIDORS: SCorridor[] = [
  { y: 2660, height: 1520, amplitude: 230, phase: 0 },
];

const WIND_ZONES: WindZone[] = [
  { y: 1260, height: 360, direction: "left", force: 0.027, label: "≪≪≪" },
  { y: 5040, height: 420, direction: "right", force: 0.029, label: "≫≫≫" },
];

const SECTION_LABELS: SectionLabel[] = [
  { title: "START", y: 85, tone: "start" },
  { title: "A / B / C", y: 760, tone: "branch" },
  { title: "MERGE ZONE", y: 1900, tone: "spinner" },
  { title: "S COURSE", y: 2660, tone: "branch" },
  { title: "FAST / SAFE / CHAOS", y: 4180, tone: "branch" },
  { title: "BOTTLENECK", y: 5700, tone: "hammer" },
  { title: "SCRAMBLE", y: 6460, tone: "jump" },
  { title: "FINISH", y: FINISH_Y, tone: "finish" },
];

function createBallTemplates(participants: Participant[]) {
  return participants.flatMap((participant, participantIndex) =>
    Array.from({ length: participant.count }, (_, index) => ({
      id: `${participant.id}-${index + 1}`,
      label: `${participant.name}-${index + 1}`,
      owner: participant.name,
      color: COLORS[participantIndex % COLORS.length],
    })),
  );
}

function createRaceBalls(participants: Participant[], raceSalt: number): RaceBall[] {
  const templates = createBallTemplates(participants);
  const center = MAP_WIDTH / 2;

  return templates.map((ball, index) => {
    const row = Math.floor(index / 12);
    const column = index % 12;
    const offset = (column - 5.5) * 24 + (row % 2) * 12;
    const seed = Math.sin((index + 1 + raceSalt) * 12.9898) * 43758.5453;

    return {
      ...ball,
      x: center + offset,
      y: 120 - row * 24,
      prevX: center + offset,
      prevY: 120 - row * 24,
      vx: Math.sin(seed) * 0.7,
      vy: 0.75 + (index % 5) * 0.04,
      angle: seed % (Math.PI * 2),
      angularVelocity: 0,
      seed,
      branchChoices: Array(BRANCHES.length).fill(-1),
      jumpHits: Array(JUMP_ZONES.length).fill(false),
      lastX: center + offset,
      lastY: 120 - row * 24,
      stuckSince: 0,
      finishedAt: null,
    };
  });
}

function getLineDistance(
  x: number,
  y: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSquared));
  const px = x1 + t * dx;
  const py = y1 + t * dy;

  return { distance: Math.hypot(x - px, y - py), px, py };
}

function getSweptLineDistance(
  ball: RaceBall,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  const samples = Array.from({ length: CCD_SAMPLES }, (_, index) => {
    const t = CCD_SAMPLES === 1 ? 1 : index / (CCD_SAMPLES - 1);
    const x = ball.prevX + (ball.x - ball.prevX) * t;
    const y = ball.prevY + (ball.y - ball.prevY) * t;

    return getLineDistance(x, y, x1, y1, x2, y2);
  });

  return samples.reduce((closest, sample) =>
    sample.distance < closest.distance ? sample : closest,
  );
}

function getSweptMovingLineDistance(
  ball: RaceBall,
  previousLine: { x1: number; y1: number; x2: number; y2: number },
  currentLine: { x1: number; y1: number; x2: number; y2: number },
) {
  const samples = Array.from({ length: CCD_SAMPLES }, (_, index) => {
    const t = CCD_SAMPLES === 1 ? 1 : index / (CCD_SAMPLES - 1);
    const x = ball.prevX + (ball.x - ball.prevX) * t;
    const y = ball.prevY + (ball.y - ball.prevY) * t;
    const x1 = previousLine.x1 + (currentLine.x1 - previousLine.x1) * t;
    const y1 = previousLine.y1 + (currentLine.y1 - previousLine.y1) * t;
    const x2 = previousLine.x2 + (currentLine.x2 - previousLine.x2) * t;
    const y2 = previousLine.y2 + (currentLine.y2 - previousLine.y2) * t;

    return getLineDistance(x, y, x1, y1, x2, y2);
  });

  return samples.reduce((closest, sample) =>
    sample.distance < closest.distance ? sample : closest,
  );
}

function getSweptCircleDistance(ball: RaceBall, x: number, y: number) {
  const samples = Array.from({ length: CCD_SAMPLES }, (_, index) => {
    const t = CCD_SAMPLES === 1 ? 1 : index / (CCD_SAMPLES - 1);
    const sampleX = ball.prevX + (ball.x - ball.prevX) * t;
    const sampleY = ball.prevY + (ball.y - ball.prevY) * t;

    return {
      distance: Math.hypot(sampleX - x, sampleY - y),
      x: sampleX,
      y: sampleY,
    };
  });

  return samples.reduce((closest, sample) =>
    sample.distance < closest.distance ? sample : closest,
  );
}

function chooseBranch(ball: RaceBall, branchIndex: number, elapsed: number) {
  if (ball.branchChoices[branchIndex] !== -1) {
    return ball.branchChoices[branchIndex];
  }

  const roll = Math.abs(Math.sin(ball.seed + branchIndex * 4.71 + elapsed * 0.0017));
  const choice = roll < 0.36 ? 0 : roll < 0.68 ? 1 : 2;
  ball.branchChoices[branchIndex] = choice;

  return choice;
}

function applyBranches(ball: RaceBall, elapsed: number) {
  BRANCHES.forEach((branch, index) => {
    if (ball.y < branch.y || ball.y > branch.y + branch.height) {
      return;
    }

    const choice = chooseBranch(ball, index, elapsed);
    const target =
      choice === 0 ? branch.leftTarget : choice === 1 ? branch.centerTarget : branch.rightTarget;
    const progress = (ball.y - branch.y) / branch.height;
    const curve = Math.sin(progress * Math.PI);
    const routeBias = choice === 0 ? 0.022 : choice === 1 ? 0 : -0.012;

    ball.vx += (target - ball.x) * 0.0028 + (choice - 1) * curve * 0.018;
    ball.vy += routeBias;
  });
}

function collideWithBumper(ball: RaceBall, bumper: Bumper) {
  const swept = getSweptCircleDistance(ball, bumper.x, bumper.y);
  const dx = swept.x - bumper.x;
  const dy = swept.y - bumper.y;
  const distance = swept.distance;
  const minDistance = bumper.r + BALL_RADIUS;

  if (distance > 0 && distance < minDistance) {
    const nx = dx / distance;
    const ny = dy / distance;
    const dot = ball.vx * nx + ball.vy * ny;

    ball.x = bumper.x + nx * minDistance;
    ball.y = bumper.y + ny * minDistance;
    ball.vx = (ball.vx - 2 * dot * nx) * (BUMPER_RESTITUTION + 0.08) + nx * 0.72;
    ball.vy = Math.max(1.45, Math.abs(ball.vy - 2 * dot * ny) * 0.44 + 1.05);
    ball.angularVelocity += (Math.abs(dot) + Math.hypot(ball.vx, ball.vy)) * 0.045;
  }
}

function applyGuideBars(ball: RaceBall) {
  GUIDE_BARS.forEach((bar) => {
    const hit = getSweptLineDistance(ball, bar.x1, bar.y1, bar.x2, bar.y2);

    if (hit.distance > BALL_RADIUS + 8) {
      return;
    }

    const dx = bar.x2 - bar.x1;
    const dy = bar.y2 - bar.y1;
    const length = Math.max(1, Math.hypot(dx, dy));
    const tx = dx / length;
    const ty = dy / length;
    const nx = (ball.x - hit.px) / Math.max(1, hit.distance);
    const ny = (ball.y - hit.py) / Math.max(1, hit.distance);

    ball.x += nx * 2.8;
    ball.y += ny * 2.8;
    ball.vx = ball.vx * 0.8 + tx * bar.force * 3.1 + nx * 0.14;
    ball.vy = Math.max(1.5, ball.vy * 0.985 + Math.abs(ty) * bar.force * 8.8 + 0.14);
    ball.angularVelocity += (tx * ball.vx + ty * ball.vy) * 0.07;
  });
}

function applyCTraps(ball: RaceBall) {
  C_TRAPS.forEach((trap) => {
    const dx = ball.x - trap.x;
    const dy = ball.y - trap.y;
    const distance = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const exitDirection = trap.open === "right" ? 1 : -1;
    const opensToward =
      trap.open === "right" ? Math.abs(angle) < 0.72 : Math.abs(Math.PI - Math.abs(angle)) < 0.72;

    if (distance > trap.r + BALL_RADIUS || distance < trap.r - 34 || opensToward) {
      if (distance < trap.r - 36 && !opensToward) {
        ball.vx += exitDirection * 0.2;
        ball.vy = Math.max(ball.vy, 1.7);
      }
      return;
    }

    const nx = dx / Math.max(1, distance);
    const ny = dy / Math.max(1, distance);

    ball.x = trap.x + nx * (trap.r + BALL_RADIUS);
    ball.y = trap.y + ny * (trap.r + BALL_RADIUS);
    ball.vx = ball.vx * 0.58 + nx * 0.52 + exitDirection * 0.18;
    ball.vy = Math.max(1.35, ball.vy * 0.72 + Math.abs(ny) * 1.05);
  });
}

function applySCorridors(ball: RaceBall) {
  S_CORRIDORS.forEach((corridor) => {
    if (ball.y < corridor.y || ball.y > corridor.y + corridor.height) {
      return;
    }

    const progress = (ball.y - corridor.y) / corridor.height;
    const targetX =
      MAP_WIDTH / 2 + Math.sin(progress * Math.PI * 2 + corridor.phase) * corridor.amplitude;

    ball.vx += (targetX - ball.x) * 0.0038;
    ball.vy *= 0.996;
  });
}

function applyWindZones(ball: RaceBall) {
  WIND_ZONES.forEach((zone) => {
    if (ball.y < zone.y || ball.y > zone.y + zone.height) {
      return;
    }

    const progress = (ball.y - zone.y) / zone.height;
    const easing = Math.sin(progress * Math.PI);
    const direction = zone.direction === "right" ? 1 : -1;

    ball.vx += direction * zone.force * easing;
    ball.vy *= 0.998;
  });
}

function applySpinners(ball: RaceBall, elapsed: number) {
  SPINNERS.forEach((spinner) => {
    const angle = elapsed * spinner.speed;
    const previousAngle = (elapsed - PHYSICS_STEP) * spinner.speed;
    const half = spinner.length / 2;
    const previousLine = {
      x1: spinner.x - Math.cos(previousAngle) * half,
      y1: spinner.y - Math.sin(previousAngle) * half,
      x2: spinner.x + Math.cos(previousAngle) * half,
      y2: spinner.y + Math.sin(previousAngle) * half,
    };
    const x1 = spinner.x - Math.cos(angle) * half;
    const y1 = spinner.y - Math.sin(angle) * half;
    const x2 = spinner.x + Math.cos(angle) * half;
    const y2 = spinner.y + Math.sin(angle) * half;
    const hit = getSweptMovingLineDistance(ball, previousLine, { x1, y1, x2, y2 });

    if (hit.distance > BALL_RADIUS + 18) {
      return;
    }

    const nx = (ball.x - hit.px) / Math.max(1, hit.distance);
    const ny = (ball.y - hit.py) / Math.max(1, hit.distance);
    const tangential = spinner.speed > 0 ? 1 : -1;

    ball.x += nx * 4.5;
    ball.y += ny * 4.5;
    ball.vx += nx * 0.44 - Math.sin(angle) * tangential * 0.52;
    ball.vy += Math.abs(ny) * 1.18 + 0.42;
    ball.angularVelocity += tangential * 0.38;
  });
}

function applyHammers(ball: RaceBall, elapsed: number) {
  HAMMERS.forEach((hammer) => {
    const angle = Math.sin(elapsed * hammer.speed + hammer.phase) * 1.35 + Math.PI / 2;
    const previousAngle =
      Math.sin((elapsed - PHYSICS_STEP) * hammer.speed + hammer.phase) * 1.35 + Math.PI / 2;
    const previousLine = {
      x1: hammer.x,
      y1: hammer.y,
      x2: hammer.x + Math.cos(previousAngle) * hammer.length,
      y2: hammer.y + Math.sin(previousAngle) * hammer.length,
    };
    const x2 = hammer.x + Math.cos(angle) * hammer.length;
    const y2 = hammer.y + Math.sin(angle) * hammer.length;
    const hit = getSweptMovingLineDistance(ball, previousLine, {
      x1: hammer.x,
      y1: hammer.y,
      x2,
      y2,
    });

    if (hit.distance > BALL_RADIUS + 20) {
      return;
    }

    const swing = Math.cos(elapsed * hammer.speed + hammer.phase) * hammer.speed * 850;
    const nx = (ball.x - hit.px) / Math.max(1, hit.distance);
    const ny = (ball.y - hit.py) / Math.max(1, hit.distance);

    ball.x += nx * 5.5;
    ball.y += ny * 5.5;
    ball.vx += nx * 0.68 + swing * 0.15;
    ball.vy = Math.max(1.35, ball.vy * 0.72 + Math.abs(swing) * 0.3);
    ball.angularVelocity += swing * 0.04;
  });
}

function applyPlatforms(ball: RaceBall, elapsed: number) {
  PLATFORMS.forEach((platform) => {
    const centerX = MAP_WIDTH / 2 + Math.sin(elapsed * platform.speed + platform.phase) * 250;
    const previousCenterX =
      MAP_WIDTH / 2 + Math.sin((elapsed - PHYSICS_STEP) * platform.speed + platform.phase) * 250;
    const left = centerX - platform.width / 2;
    const right = centerX + platform.width / 2;
    const sweptTop = getSweptMovingLineDistance(
      ball,
      {
        x1: previousCenterX - platform.width / 2,
        y1: platform.y,
        x2: previousCenterX + platform.width / 2,
        y2: platform.y,
      },
      { x1: left, y1: platform.y, x2: right, y2: platform.y },
    );
    const closeY = sweptTop.distance < BALL_RADIUS + 12;
    const onPlatform =
      ball.x > Math.min(left, previousCenterX - platform.width / 2) - BALL_RADIUS &&
      ball.x < Math.max(right, previousCenterX + platform.width / 2) + BALL_RADIUS;

    if (!closeY || !onPlatform || ball.vy < 0) {
      return;
    }

    ball.y = platform.y - 23;
    ball.vy *= 0.24;
    ball.vx += Math.cos(elapsed * platform.speed + platform.phase) * platform.speed * 62;
    ball.angularVelocity += (centerX - previousCenterX) * 0.032;

    if (Math.abs(ball.x - centerX) < platform.width * 0.18) {
      ball.vy += 0.15;
    }
  });
}

function applyJumpZones(ball: RaceBall) {
  JUMP_ZONES.forEach((zone, index) => {
    if (ball.jumpHits[index]) {
      return;
    }

    const inZone =
      ball.y > zone.y &&
      ball.y < zone.y + 42 &&
      ball.x > zone.x &&
      ball.x < zone.x + zone.width;

    if (!inZone) {
      return;
    }

    ball.jumpHits[index] = true;
    ball.vx += zone.forceX * 0.42;
    ball.vy += zone.forceY * 0.45;
  });
}

function applyRaceFlow(ball: RaceBall) {
  if (ball.y > 3100 && ball.y < 3900) {
    ball.vy *= 0.994;
  }

  if (ball.y > 6200 && ball.y < FINISH_Y) {
    ball.vy *= 0.996;
  }
}

function applyAutoEscape(ball: RaceBall, elapsed: number) {
  const moved = Math.hypot(ball.x - ball.lastX, ball.y - ball.lastY);

  if (moved > 32) {
    ball.lastX = ball.x;
    ball.lastY = ball.y;
    ball.stuckSince = elapsed;
    return;
  }

  if (elapsed - ball.stuckSince < 2000) {
    return;
  }

  const push = ball.x < MAP_WIDTH / 2 ? 1 : -1;

  ball.vx += push * 0.35;
  ball.vy = Math.max(ball.vy, 3.3);
  ball.y += 12;
  ball.lastX = ball.x;
  ball.lastY = ball.y;
  ball.stuckSince = elapsed;
}

function advanceBall(ball: RaceBall, elapsed: number) {
  if (ball.finishedAt !== null) {
    return;
  }

  ball.prevX = ball.x;
  ball.prevY = ball.y;
  ball.vy += GRAVITY;
  applyBranches(ball, elapsed);
  applyRaceFlow(ball);
  applySCorridors(ball);
  applyWindZones(ball);

  ball.vx *= FRICTION;
  ball.vy *= DAMPING;
  ball.x += ball.vx;
  ball.y += ball.vy;

  if (ball.x < WALL_X + BALL_RADIUS) {
    ball.x = WALL_X + BALL_RADIUS;
    ball.vx = Math.abs(ball.vx) * 0.42;
    ball.vy = Math.max(ball.vy, 1.6);
  }

  if (ball.x > MAP_WIDTH - WALL_X - BALL_RADIUS) {
    ball.x = MAP_WIDTH - WALL_X - BALL_RADIUS;
    ball.vx = -Math.abs(ball.vx) * 0.42;
    ball.vy = Math.max(ball.vy, 1.6);
  }

  for (let iteration = 0; iteration < SOLVER_ITERATIONS; iteration += 1) {
    BUMPERS.forEach((bumper) => collideWithBumper(ball, bumper));
    applyGuideBars(ball);
    applySpinners(ball, elapsed);
    applyHammers(ball, elapsed);
    applyPlatforms(ball, elapsed);
    applyJumpZones(ball);
    applyCTraps(ball);
  }

  applyAutoEscape(ball, elapsed);

  if (elapsed > 36000) {
    ball.vy = Math.max(ball.vy, 3.1);
  }

  if (elapsed > 45000) {
    ball.y += 1.4;
    ball.vx *= 0.98;
  }

  if (Math.abs(ball.vx) > MAX_HORIZONTAL_SPEED) {
    ball.vx = Math.sign(ball.vx) * MAX_HORIZONTAL_SPEED;
  }

  if (Math.abs(ball.vx) < MICRO_VELOCITY_EPSILON) {
    ball.vx = 0;
  }

  if (ball.vy > MAX_FALL_SPEED) {
    ball.vy = MAX_FALL_SPEED;
  }

  if (ball.vy < -1.8) {
    ball.vy = -1.8;
  }

  if (ball.vy > -0.2 && ball.vy < 1) {
    ball.vy = 1;
  }

  const rollingSpeed = Math.hypot(ball.vx, ball.vy);
  const rollingDirection = ball.vx >= 0 ? 1 : -1;
  ball.angularVelocity =
    ball.angularVelocity * ANGULAR_DAMPING +
    (rollingSpeed / BALL_RADIUS) * 0.32 * rollingDirection;
  ball.angularVelocity *= ROLLING_RESISTANCE;
  ball.angle += ball.angularVelocity;

  if (ball.y >= FINISH_Y) {
    ball.y = FINISH_Y;
    ball.finishedAt = elapsed;
  }
}

function getRankings(balls: RaceBall[]): RankEntry[] {
  return [...balls]
    .sort((a, b) => {
      if (a.finishedAt !== null && b.finishedAt !== null) {
        return a.finishedAt - b.finishedAt;
      }

      if (a.finishedAt !== null) {
        return -1;
      }

      if (b.finishedAt !== null) {
        return 1;
      }

      return b.y - a.y || b.vy - a.vy;
    })
    .map((ball, index) => ({
      id: ball.id,
      label: ball.label,
      color: ball.color,
      rank: index + 1,
      y: ball.y,
      finishedAt: ball.finishedAt,
    }));
}

function getCameraTargetY(rankings: RankEntry[]) {
  const activeTopFive = rankings.filter((entry) => entry.finishedAt === null).slice(0, 5);

  if (activeTopFive.length === 0) {
    return MAP_HEIGHT - VIEW_HEIGHT;
  }

  const averageY =
    activeTopFive.reduce((sum, entry) => sum + entry.y, 0) / activeTopFive.length;

  return Math.min(
    Math.max(averageY - VIEW_HEIGHT * CAMERA_VIEW_ANCHOR, 0),
    MAP_HEIGHT - VIEW_HEIGHT,
  );
}

function getNextCameraY(currentY: number, targetY: number) {
  const gap = targetY - currentY;

  if (Math.abs(gap) <= CAMERA_DEADZONE) {
    return currentY;
  }

  const deadzoneEdgeTarget = targetY - Math.sign(gap) * CAMERA_DEADZONE;
  const step = Math.max(
    -CAMERA_MAX_STEP,
    Math.min(CAMERA_MAX_STEP, (deadzoneEdgeTarget - currentY) * CAMERA_FOLLOW),
  );

  return Math.min(Math.max(currentY + step, 0), MAP_HEIGHT - VIEW_HEIGHT);
}

function getElapsedSeconds(records: FinishRecord[]) {
  if (records.length === 0) {
    return "0.0";
  }

  return (records[records.length - 1].finishedAt / 1000).toFixed(1);
}

function getLeaderFocus(ball: RaceBall | undefined, elapsed: number) {
  if (!ball) {
    return null;
  }

  const jump = JUMP_ZONES.find(
    (zone) =>
      ball.y > zone.y - 24 &&
      ball.y < zone.y + 70 &&
      ball.x > zone.x - 24 &&
      ball.x < zone.x + zone.width + 24,
  );

  if (jump) {
    return "JUMP ZONE";
  }

  const spinner = SPINNERS.find((item) => {
    const angle = elapsed * item.speed;
    const half = item.length / 2;
    const hit = getLineDistance(
      ball.x,
      ball.y,
      item.x - Math.cos(angle) * half,
      item.y - Math.sin(angle) * half,
      item.x + Math.cos(angle) * half,
      item.y + Math.sin(angle) * half,
    );

    return hit.distance < BALL_RADIUS + 34;
  });

  if (spinner) {
    return "ROTATING BAR";
  }

  const trap = C_TRAPS.find((item) => Math.hypot(ball.x - item.x, ball.y - item.y) < item.r + 26);

  if (trap) {
    return "C TRAP";
  }

  return null;
}

function getDeltaText(delta: number | undefined) {
  if (!delta) {
    return "ㅡ";
  }

  return delta > 0 ? `▲ +${delta}` : `▼ ${delta}`;
}

function RaceStatusBar({
  cameraMode,
  finishCount,
  rankDeltas,
  topFive,
  totalCount,
}: {
  cameraMode: CameraMode;
  finishCount: number;
  rankDeltas: Record<string, number>;
  topFive: RankEntry[];
  totalCount: number;
}) {
  const leader = topFive[0];
  const biggestMove = topFive.reduce<{ label: string; delta: number } | null>((best, entry) => {
    const delta = rankDeltas[entry.id] ?? 0;

    if (Math.abs(delta) <= Math.abs(best?.delta ?? 0)) {
      return best;
    }

    return { label: entry.label, delta };
  }, null);
  const remaining = Math.max(0, totalCount - finishCount);

  return (
    <section className="grid gap-2 rounded-lg border border-black/15 bg-[#111827] p-3 text-white shadow-sm sm:grid-cols-5">
      <div className="rounded-md bg-white/10 px-3 py-2">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/55">Leader</p>
        <p className="mt-1 truncate text-sm font-black text-[#facc15]">
          {leader ? leader.label : "-"}
        </p>
      </div>
      <div className="rounded-md bg-white/10 px-3 py-2">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/55">Move</p>
        <p className="mt-1 truncate text-sm font-black text-[#fb7185]">
          {biggestMove
            ? `${biggestMove.label} ${biggestMove.delta > 0 ? "+" : ""}${biggestMove.delta}`
            : "-"}
        </p>
      </div>
      <div className="rounded-md bg-white/10 px-3 py-2">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/55">
          Remaining
        </p>
        <p className="mt-1 text-sm font-black">{remaining}</p>
      </div>
      <div className="rounded-md bg-white/10 px-3 py-2">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/55">Map</p>
        <p className="mt-1 text-sm font-black">CLASSIC TRACK</p>
      </div>
      <div className="rounded-md bg-white/10 px-3 py-2">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/55">
          Camera
        </p>
        <p className="mt-1 text-sm font-black">
          {cameraMode === "follow" ? "FOLLOW TOP5" : "FIXED TEST"}
        </p>
      </div>
    </section>
  );
}

export default function Home() {
  const [participants, setParticipants] = useState<Participant[]>([
    { id: 1, name: "철수", count: 5 },
    { id: 2, name: "영희", count: 3 },
    { id: 3, name: "민수", count: 10 },
  ]);
  const [name, setName] = useState("");
  const [count, setCount] = useState(1);
  const [mode, setMode] = useState<GameMode>("WINNER");
  const [screen, setScreen] = useState<Screen>("setup");
  const [balls, setBalls] = useState<RaceBall[]>([]);
  const [finishRecords, setFinishRecords] = useState<FinishRecord[]>([]);
  const [cameraY, setCameraY] = useState(0);
  const [raceElapsed, setRaceElapsed] = useState(0);
  const [rankings, setRankings] = useState<RankEntry[]>([]);
  const [rankDeltas, setRankDeltas] = useState<Record<string, number>>({});
  const [events, setEvents] = useState<RaceEvent[]>([]);
  const [leaderSpotlight, setLeaderSpotlight] = useState<LeaderSpotlight>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>("follow");

  const frameRef = useRef<number | null>(null);
  const ballsRef = useRef<RaceBall[]>([]);
  const finishRecordsRef = useRef<FinishRecord[]>([]);
  const cameraYRef = useRef(0);
  const cameraTargetYRef = useRef(0);
  const cameraModeRef = useRef<CameraMode>("follow");
  const startTimeRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const physicsAccumulatorRef = useRef(0);
  const physicsElapsedRef = useRef(0);
  const previousRanksRef = useRef<Map<string, number>>(new Map());
  const previousLeaderRef = useRef<string | null>(null);
  const lastRankSampleRef = useRef(0);
  const focusCooldownRef = useRef(0);
  const eventIdRef = useRef(1);

  const totalBallCount = useMemo(
    () => participants.reduce((sum, participant) => sum + participant.count, 0),
    [participants],
  );
  const generatedBalls = useMemo(
    () => createBallTemplates(participants),
    [participants],
  );
  const selectedRecord =
    mode === "WINNER" ? finishRecords[0] : finishRecords[finishRecords.length - 1];
  const topFive = rankings.slice(0, 5);
  const leaderDebugBall = balls.find((ball) => ball.id === topFive[0]?.id) ?? null;
  const activeSpotlight =
    leaderSpotlight && raceElapsed <= leaderSpotlight.until ? leaderSpotlight : null;

  function addParticipant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName || count < 1) {
      return;
    }

    setParticipants((current) => [
      ...current,
      { id: Date.now(), name: trimmedName, count },
    ]);
    setName("");
    setCount(1);
  }

  function removeParticipant(id: number) {
    setParticipants((current) => current.filter((participant) => participant.id !== id));
  }

  function startRace() {
    if (totalBallCount === 0 || totalBallCount > MAX_BALLS) {
      return;
    }

    const nextBalls = createRaceBalls(participants, Math.random() * 1000);
    const initialRankings = getRankings(nextBalls);

    ballsRef.current = nextBalls.map((ball) => ({ ...ball }));
    finishRecordsRef.current = [];
    cameraYRef.current = 0;
    cameraTargetYRef.current = 0;
    lastFrameTimeRef.current = 0;
    physicsAccumulatorRef.current = 0;
    physicsElapsedRef.current = 0;
    previousRanksRef.current = new Map(initialRankings.map((entry) => [entry.id, entry.rank]));
    previousLeaderRef.current = initialRankings[0]?.id ?? null;
    lastRankSampleRef.current = 0;
    focusCooldownRef.current = 0;
    cameraModeRef.current = cameraMode;
    setBalls(nextBalls);
    setFinishRecords([]);
    setCameraY(0);
    setRaceElapsed(0);
    setRankings(initialRankings);
    setRankDeltas({});
    setEvents([]);
    setLeaderSpotlight(null);
    setScreen("race");
  }

  function resetRace() {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }

    setScreen("setup");
    setBalls([]);
    setFinishRecords([]);
    cameraYRef.current = 0;
    cameraTargetYRef.current = 0;
    setCameraY(0);
    setRaceElapsed(0);
    setRankings([]);
    setRankDeltas({});
    setEvents([]);
    setLeaderSpotlight(null);
  }

  function changeCameraMode(mode: CameraMode) {
    cameraModeRef.current = mode;
    setCameraMode(mode);
  }

  useEffect(() => {
    if (screen !== "race") {
      return;
    }

    startTimeRef.current = performance.now();
    lastFrameTimeRef.current = startTimeRef.current;
    physicsAccumulatorRef.current = 0;
    physicsElapsedRef.current = 0;

    const tick = (now: number) => {
      const frameDelta = Math.min(now - lastFrameTimeRef.current, 80);
      lastFrameTimeRef.current = now;
      physicsAccumulatorRef.current += frameDelta;
      const nextRecords = finishRecordsRef.current;

      while (physicsAccumulatorRef.current >= PHYSICS_STEP) {
        physicsElapsedRef.current += PHYSICS_STEP;

        ballsRef.current.forEach((ball) => {
          const before = ball.finishedAt;
          advanceBall(ball, physicsElapsedRef.current);

          if (before === null && ball.finishedAt !== null) {
            nextRecords.push({
              id: ball.id,
              label: ball.label,
              owner: ball.owner,
              color: ball.color,
              finishedAt: ball.finishedAt,
            });
          }
        });

        physicsAccumulatorRef.current -= PHYSICS_STEP;
      }

      const elapsed = physicsElapsedRef.current;

      const currentRankings = getRankings(ballsRef.current);
      if (cameraModeRef.current === "follow") {
        const rawCameraTargetY = getCameraTargetY(currentRankings);
        cameraTargetYRef.current +=
          (rawCameraTargetY - cameraTargetYRef.current) * CAMERA_TARGET_SMOOTHING;
        cameraYRef.current = getNextCameraY(cameraYRef.current, cameraTargetYRef.current);
      }

      const leaderBall = ballsRef.current.find((ball) => ball.id === currentRankings[0]?.id);
      const leaderFocus = getLeaderFocus(leaderBall, elapsed);

      if (leaderBall && leaderFocus && elapsed > focusCooldownRef.current) {
        setLeaderSpotlight({
          title: leaderFocus,
          label: leaderBall.owner,
          color: leaderBall.color,
          until: elapsed + 800,
        });
        focusCooldownRef.current = elapsed + 1800;
      }

      if (elapsed - lastRankSampleRef.current >= 450) {
        const previousRanks = previousRanksRef.current;
        const nextDeltas: Record<string, number> = {};
        const nextEvents: RaceEvent[] = [];
        const leader = currentRankings[0];

        currentRankings.forEach((entry) => {
          const previousRank = previousRanks.get(entry.id);
          if (!previousRank) {
            return;
          }

          const delta = previousRank - entry.rank;
          if (delta !== 0) {
            nextDeltas[entry.id] = delta;
          }

          if (delta >= 4) {
            nextEvents.push({
              id: eventIdRef.current++,
              text: `🚀 ${entry.label} ${delta}계단 상승`,
              tone: "rise",
            });
          } else if (delta >= 2 && entry.rank <= 5) {
            nextEvents.push({
              id: eventIdRef.current++,
              text: `⚡ ${entry.label} 추월 성공`,
              tone: "pass",
            });
          }
        });

        if (leader && leader.id !== previousLeaderRef.current) {
          nextEvents.unshift({
            id: eventIdRef.current++,
            text: `🔥 ${leader.label} 선두 탈환`,
            tone: "leader",
          });
          setLeaderSpotlight({
            title: "NEW LEADER",
            label: leader.label,
            color: leader.color,
            until: elapsed + 1000,
          });
          previousLeaderRef.current = leader.id;
        }

        previousRanksRef.current = new Map(
          currentRankings.map((entry) => [entry.id, entry.rank]),
        );
        lastRankSampleRef.current = elapsed;
        setRankDeltas(nextDeltas);

        if (nextEvents.length > 0) {
          setEvents((current) => [...nextEvents, ...current].slice(0, 5));
        }
      }

      setBalls(ballsRef.current.map((ball) => ({ ...ball })));
      setFinishRecords([...nextRecords]);
      setRankings(currentRankings);
      setCameraY(cameraYRef.current);
      setRaceElapsed(elapsed);

      if (nextRecords.length >= ballsRef.current.length) {
        setScreen("result");
        return;
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [screen]);

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#171717]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-black/15 pb-4">
          <div>
            <p className="text-sm font-semibold uppercase text-[#b91c1c]">
              Classic Blueprint v1
            </p>
            <h1 className="mt-1 text-3xl font-black sm:text-4xl">
              AI 자동 중계 핀볼 레이스 쇼
            </h1>
          </div>
          <div className="rounded-md border border-black/15 bg-white px-4 py-3 text-sm font-semibold shadow-sm">
            {screen === "setup" && "참가자 등록"}
            {screen === "race" && "실시간 중계 진행 중"}
            {screen === "result" && "결과 발표"}
          </div>
        </header>

        {screen === "setup" && (
          <section className="grid flex-1 gap-6 lg:grid-cols-[380px_1fr]">
            <div className="rounded-lg border border-black/15 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black">참가자 등록</h2>
              <form className="mt-5 grid gap-3" onSubmit={addParticipant}>
                <label className="grid gap-2 text-sm font-bold">
                  참가자 이름
                  <input
                    className="h-11 rounded-md border border-black/20 px-3 outline-none focus:border-[#b91c1c]"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="예: 지수"
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold">
                  공 개수
                  <input
                    className="h-11 rounded-md border border-black/20 px-3 outline-none focus:border-[#b91c1c]"
                    min={1}
                    max={MAX_BALLS}
                    type="number"
                    value={count}
                    onChange={(event) => setCount(Number(event.target.value))}
                  />
                </label>
                <button className="h-11 rounded-md bg-[#171717] px-4 font-black text-white transition hover:bg-[#303030]">
                  참가자 추가
                </button>
              </form>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-md bg-[#f6f4ef] p-4">
                  <p className="text-sm font-bold text-black/60">총 참가자 수</p>
                  <p className="mt-1 text-3xl font-black">{participants.length}</p>
                </div>
                <div className="rounded-md bg-[#f6f4ef] p-4">
                  <p className="text-sm font-bold text-black/60">총 공 개수</p>
                  <p className="mt-1 text-3xl font-black">{totalBallCount}</p>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-sm font-black">게임 모드</p>
                <div className="mt-2 grid grid-cols-2 gap-2 rounded-md bg-[#f6f4ef] p-1">
                  {(["WINNER", "LOSER"] as GameMode[]).map((nextMode) => (
                    <button
                      className={`h-11 rounded px-3 text-sm font-black transition ${
                        mode === nextMode
                          ? "bg-[#b91c1c] text-white shadow-sm"
                          : "bg-transparent text-black/65 hover:bg-white"
                      }`}
                      key={nextMode}
                      onClick={() => setMode(nextMode)}
                      type="button"
                    >
                      {nextMode}
                    </button>
                  ))}
                </div>
              </div>

              {totalBallCount > MAX_BALLS && (
                <p className="mt-4 rounded-md bg-[#fff1f2] p-3 text-sm font-bold text-[#be123c]">
                  MVP 안정성을 위해 공은 최대 {MAX_BALLS}개까지 시작할 수 있습니다.
                </p>
              )}

              <button
                className="mt-6 h-12 w-full rounded-md bg-[#b91c1c] px-4 text-base font-black text-white transition hover:bg-[#991b1b] disabled:cursor-not-allowed disabled:bg-black/30"
                disabled={totalBallCount === 0 || totalBallCount > MAX_BALLS}
                onClick={startRace}
              >
                게임 시작
              </button>
            </div>

            <div className="grid gap-4 rounded-lg border border-black/15 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black">자동 생성될 공</h2>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {participants.map((participant) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-md border border-black/10 px-3 py-2"
                    key={participant.id}
                  >
                    <span className="min-w-0 truncate font-bold">
                      {participant.name} x {participant.count}
                    </span>
                    <button
                      className="shrink-0 rounded border border-black/15 px-2 py-1 text-xs font-black text-black/60 hover:text-[#b91c1c]"
                      onClick={() => removeParticipant(participant.id)}
                      type="button"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
              <div className="max-h-[430px] overflow-auto rounded-md bg-[#f6f4ef] p-4">
                <div className="flex flex-wrap gap-2">
                  {generatedBalls.map((ball) => (
                    <span
                      className="rounded border border-black/10 bg-white px-2 py-1 text-sm font-bold"
                      key={ball.id}
                    >
                      {ball.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {screen === "race" && (
          <section className="grid flex-1 gap-6 lg:grid-cols-[1fr_320px]">
            <div className="grid gap-3">
              <RaceStatusBar
                cameraMode={cameraMode}
                finishCount={finishRecords.length}
                rankDeltas={rankDeltas}
                topFive={topFive}
                totalCount={balls.length}
              />
              <RaceMap
                balls={balls}
                cameraY={cameraY}
                elapsed={raceElapsed}
                leaderId={topFive[0]?.id ?? null}
                spotlight={activeSpotlight}
              />
              <EventLog events={events} />
            </div>
            <RaceHud
              ballCount={balls.length}
              cameraMode={cameraMode}
              finishCount={finishRecords.length}
              leaderDebugBall={leaderDebugBall}
              onCameraModeChange={changeCameraMode}
              participantCount={participants.length}
              rankDeltas={rankDeltas}
              topFive={topFive}
            />
          </section>
        )}

        {screen === "result" && selectedRecord && (
          <section className="grid flex-1 gap-6 lg:grid-cols-[360px_1fr]">
            <div className="rounded-lg border border-black/15 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase text-[#b91c1c]">
                {mode}
              </p>
              <h2 className="mt-2 text-4xl font-black">
                {mode === "WINNER" ? "WINNER" : "LOSER"}
              </h2>
              <div className="mt-8 rounded-lg border border-black/15 bg-[#f6f4ef] p-5">
                <p className="text-sm font-bold text-black/55">당첨 공</p>
                <p className="mt-2 break-words text-3xl font-black">
                  {selectedRecord.label}
                </p>
              </div>
              <p className="mt-4 rounded-md bg-[#f6f4ef] px-3 py-2 text-sm font-bold">
                경기 시간 {getElapsedSeconds(finishRecords)}초
              </p>
              <button
                className="mt-6 h-12 w-full rounded-md bg-[#171717] px-4 font-black text-white transition hover:bg-[#303030]"
                onClick={resetRace}
              >
                새 레이스 준비
              </button>
            </div>

            <div className="rounded-lg border border-black/15 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black">전체 순위 목록</h2>
              <ol className="mt-4 grid max-h-[640px] gap-2 overflow-auto">
                {finishRecords.map((record, index) => (
                  <li
                    className="grid grid-cols-[56px_1fr_auto] items-center gap-3 rounded-md border border-black/10 px-3 py-2"
                    key={record.id}
                  >
                    <span className="text-lg font-black">{index + 1}</span>
                    <span className="min-w-0 truncate font-bold">{record.label}</span>
                    <span className="text-sm font-bold text-black/55">
                      {(record.finishedAt / 1000).toFixed(2)}s
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function RaceHud({
  ballCount,
  cameraMode,
  finishCount,
  leaderDebugBall,
  onCameraModeChange,
  participantCount,
  rankDeltas,
  topFive,
}: {
  ballCount: number;
  cameraMode: CameraMode;
  finishCount: number;
  leaderDebugBall: RaceBall | null;
  onCameraModeChange: (mode: CameraMode) => void;
  participantCount: number;
  rankDeltas: Record<string, number>;
  topFive: RankEntry[];
}) {
  return (
    <aside className="rounded-lg border border-black/15 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black">TOP 5</h2>
      <ol className="mt-4 grid gap-2">
        {topFive.map((entry) => {
          const delta = rankDeltas[entry.id];
          const isLeader = entry.rank === 1;
          const isTopThree = entry.rank <= 3;

          return (
            <li
              className={`grid grid-cols-[32px_1fr_58px] items-center gap-2 rounded-md border px-3 py-2 transition ${
                isLeader
                  ? "border-[#facc15] bg-[#fef3c7] shadow-[0_0_0_2px_rgba(250,204,21,0.35)]"
                  : isTopThree
                    ? "border-[#2563eb]/30 bg-[#dbeafe]"
                    : "border-black/10 bg-[#f8fafc]"
              }`}
              key={entry.id}
            >
              <span className="text-lg font-black">{entry.rank}</span>
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: entry.color }}
                />
                <span className="truncate text-sm font-black">{entry.label}</span>
              </span>
              <span
                className={`text-right text-xs font-black ${
                  delta && delta > 0
                    ? "text-[#16a34a]"
                    : delta && delta < 0
                      ? "text-[#dc2626]"
                      : "text-black/35"
                }`}
              >
                {getDeltaText(delta)}
              </span>
            </li>
          );
        })}
      </ol>

      <dl className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-md bg-[#f6f4ef] p-3">
          <dt className="text-xs font-bold text-black/55">참가자</dt>
          <dd className="text-2xl font-black">{participantCount}</dd>
        </div>
        <div className="rounded-md bg-[#f6f4ef] p-3">
          <dt className="text-xs font-bold text-black/55">공</dt>
          <dd className="text-2xl font-black">{ballCount}</dd>
        </div>
        <div className="rounded-md bg-[#f6f4ef] p-3">
          <dt className="text-xs font-bold text-black/55">완주</dt>
          <dd className="text-2xl font-black">
            {finishCount}/{ballCount}
          </dd>
        </div>
        <div className="rounded-md bg-[#f6f4ef] p-3">
          <dt className="text-xs font-bold text-black/55">카메라</dt>
          <dd className="text-sm font-black text-[#b91c1c]">선두 추적</dd>
        </div>
      </dl>

      <div className="mt-4 rounded-md border border-black/10 bg-[#f8fafc] p-3">
        <p className="text-xs font-black text-black/55">떨림 테스트</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            className={`h-9 rounded text-xs font-black ${
              cameraMode === "follow" ? "bg-[#171717] text-white" : "bg-white text-black/65"
            }`}
            type="button"
            onClick={() => onCameraModeChange("follow")}
          >
            CAMERA ON
          </button>
          <button
            className={`h-9 rounded text-xs font-black ${
              cameraMode === "fixed" ? "bg-[#171717] text-white" : "bg-white text-black/65"
            }`}
            type="button"
            onClick={() => onCameraModeChange("fixed")}
          >
            CAMERA OFF
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-black/10 bg-[#f8fafc] p-3">
        <p className="text-xs font-black text-black/55">물리 디버그</p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-black text-black/65">
          <span>v {leaderDebugBall ? Math.hypot(leaderDebugBall.vx, leaderDebugBall.vy).toFixed(2) : "-"}</span>
          <span>
            av {leaderDebugBall ? leaderDebugBall.angularVelocity.toFixed(2) : "-"}
          </span>
        </div>
      </div>
    </aside>
  );
}

function EventLog({ events }: { events: RaceEvent[] }) {
  return (
    <section className="rounded-lg border border-black/15 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-black text-black/55">최근 이벤트</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-5">
        {events.length === 0 &&
          Array.from({ length: 5 }, (_, index) => (
            <div
              className="rounded-md border border-dashed border-black/15 px-3 py-2 text-sm font-bold text-black/35"
              key={index}
            >
              대기 중
            </div>
          ))}
        {events.map((event) => (
          <div
            className={`rounded-md border px-3 py-2 text-sm font-black ${
              event.tone === "leader"
                ? "border-[#b91c1c]/30 bg-[#fee2e2] text-[#991b1b]"
                : event.tone === "rise"
                  ? "border-[#16a34a]/30 bg-[#dcfce7] text-[#166534]"
                  : "border-[#2563eb]/30 bg-[#dbeafe] text-[#1d4ed8]"
            }`}
            key={event.id}
          >
            {event.text}
          </div>
        ))}
      </div>
    </section>
  );
}

function RaceMap({
  balls,
  cameraY,
  elapsed,
  leaderId,
  spotlight,
}: {
  balls: RaceBall[];
  cameraY: number;
  elapsed: number;
  leaderId: string | null;
  spotlight: LeaderSpotlight;
}) {
  const zoom = spotlight ? 1.16 : 1;

  return (
    <div className="rounded-lg border border-black/15 bg-white p-3 shadow-sm">
      <div
        className="relative mx-auto overflow-hidden rounded-md border-4 border-[#171717] bg-[#dce7ef]"
        style={{ height: VIEW_HEIGHT, maxWidth: MAP_WIDTH, width: "100%" }}
      >
        {spotlight && (
          <div className="pointer-events-none absolute left-1/2 top-6 z-30 -translate-x-1/2 rounded-md border-4 border-[#171717] bg-white px-6 py-3 text-center shadow-lg">
            <p className="text-xs font-black text-[#b91c1c]">{spotlight.title}</p>
            <p className="mt-1 text-2xl font-black" style={{ color: spotlight.color }}>
              {spotlight.label}
            </p>
          </div>
        )}

        <div
          className="absolute left-1/2 top-0 overflow-hidden bg-[#f8fafc] transition-transform duration-300 ease-out"
          style={{
            height: MAP_HEIGHT,
            transform: `translate(-50%, ${-cameraY}px) scale(${zoom})`,
            transformOrigin: `50% ${cameraY + VIEW_HEIGHT * 0.38}px`,
            width: MAP_WIDTH,
          }}
        >
          <div className="absolute left-0 top-0 h-full w-full bg-[linear-gradient(180deg,rgba(14,165,233,0.12),rgba(255,255,255,0)_20%,rgba(250,204,21,0.16)_54%,rgba(185,28,28,0.13))]" />

          <div className="absolute left-[62px] top-0 h-full w-4 bg-[#171717]" />
          <div className="absolute right-[62px] top-0 h-full w-4 bg-[#171717]" />

          <svg
            className="pointer-events-none absolute left-0 top-0 h-full w-full"
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          >
            {TRACK_PATHS.map((path) => (
              <g key={path.title}>
                <path
                  d={path.d}
                  fill="none"
                  stroke="rgba(17,24,39,0.42)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={path.width + 18}
                />
                <path
                  d={path.d}
                  fill="none"
                  stroke={path.color}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity={0.7}
                  strokeWidth={path.width}
                />
                <path
                  d={path.d}
                  fill="none"
                  stroke="rgba(255,255,255,0.72)"
                  strokeDasharray="22 22"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={4}
                />
              </g>
            ))}
          </svg>

          {TRACK_ZONES.map((zone) => (
            <div
              className="absolute rounded-lg border-[5px] px-3 py-3 text-center shadow-[inset_0_0_0_2px_rgba(255,255,255,0.72)]"
              key={`${zone.title}-${zone.y}`}
              style={{
                background: zone.background,
                borderColor: zone.border,
                color: zone.text,
                height: zone.height,
                left: zone.x,
                top: zone.y,
                width: zone.width,
              }}
            >
              <p className="text-3xl font-black leading-none">{zone.title}</p>
              <p className="mt-1 text-[11px] font-black tracking-[0.12em]">{zone.subtitle}</p>
            </div>
          ))}

          {S_CORRIDORS.map((corridor, index) => (
            <div
              className="absolute left-[100px] right-[100px] rounded-[38px] border-4 border-dashed border-[#0f766e]/45 bg-[#ccfbf1]/35 text-center text-sm font-black text-[#0f766e]"
              key={`${corridor.y}-${index}`}
              style={{
                height: corridor.height,
                lineHeight: `${corridor.height}px`,
                top: corridor.y,
              }}
            >
              S COURSE
            </div>
          ))}

          {WIND_ZONES.map((zone, index) => (
            <div
              className="absolute left-[96px] right-[96px] rounded-md border-2 border-[#0284c7]/35 bg-[#e0f2fe]/45 text-center text-3xl font-black tracking-[0.2em] text-[#0284c7]/80"
              key={`${zone.y}-${index}`}
              style={{
                height: zone.height,
                lineHeight: `${zone.height}px`,
                top: zone.y,
              }}
            >
              {zone.label}
            </div>
          ))}

          {BRANCHES.map((branch, index) => (
            <div
              className="absolute left-[90px] right-[90px] rounded-md border-y-4 border-dashed border-[#171717]/35 bg-white/45"
              key={branch.y}
              style={{ height: branch.height, top: branch.y }}
            >
              <div className="absolute left-[120px] top-0 h-full w-1 rotate-12 bg-black/20" />
              <div className="absolute left-1/2 top-0 h-full w-1 bg-black/20" />
              <div className="absolute right-[120px] top-0 h-full w-1 -rotate-12 bg-black/20" />
              <span className="absolute bottom-3 left-5 rounded bg-white px-2 py-1 text-xs font-black text-black/55">
                {index === 0 ? "빠름/위험" : index === 1 ? "랜덤 선택" : "역전 포인트"}
              </span>
            </div>
          ))}

          {GUIDE_BARS.map((bar, index) => (
            <div
              className="absolute h-4 origin-left rounded-full bg-[#64748b]/70 shadow-[0_0_0_3px_rgba(100,116,139,0.12)]"
              key={`${bar.x1}-${bar.y1}-${index}`}
              style={{
                left: bar.x1,
                top: bar.y1,
                transform: `rotate(${Math.atan2(bar.y2 - bar.y1, bar.x2 - bar.x1)}rad)`,
                width: Math.hypot(bar.x2 - bar.x1, bar.y2 - bar.y1),
              }}
            />
          ))}

          {C_TRAPS.map((trap, index) => (
            <div
              className="absolute rounded-full border-[10px] border-[#8b5cf6]/70 bg-[#f3e8ff]/25"
              key={`${trap.x}-${trap.y}-${index}`}
              style={{
                borderLeftColor: trap.open === "left" ? "transparent" : "rgba(139,92,246,0.7)",
                borderRightColor: trap.open === "right" ? "transparent" : "rgba(139,92,246,0.7)",
                height: trap.r * 2,
                left: trap.x - trap.r,
                top: trap.y - trap.r,
                width: trap.r * 2,
              }}
            />
          ))}

          {JUMP_ZONES.map((zone, index) => (
            <div
              className="absolute rounded-md border-2 border-[#2563eb]/60 bg-[#bfdbfe]/45 text-center text-xs font-black leading-8 text-[#1d4ed8]/80"
              key={`${zone.x}-${zone.y}`}
              style={{ height: 42, left: zone.x, top: zone.y, width: zone.width }}
            >
              JUMP {index + 1}
            </div>
          ))}

          {PLATFORMS.map((platform, index) => {
            const centerX =
              MAP_WIDTH / 2 + Math.sin(elapsed * platform.speed + platform.phase) * 250;

            return (
              <div
                className="absolute h-7 rounded-md border-2 border-[#334155]/70 bg-[#94a3b8]/70"
                key={`${platform.y}-${index}`}
                style={{
                  left: centerX - platform.width / 2,
                  top: platform.y,
                  width: platform.width,
                }}
              />
            );
          })}

          {SECTION_LABELS.map((label) => (
            <div
              className={`absolute left-[98px] right-[98px] h-16 rounded-md border-4 text-center text-2xl font-black leading-[56px] ${
                label.tone === "finish"
                  ? "border-[#b91c1c] bg-[#fee2e2] text-[#991b1b]"
                  : label.tone === "spinner"
                    ? "border-[#0891b2] bg-[#cffafe] text-[#0e7490]"
                    : label.tone === "hammer"
                      ? "border-[#7c2d12] bg-[#fed7aa] text-[#9a3412]"
                      : label.tone === "jump"
                        ? "border-[#2563eb] bg-[#dbeafe] text-[#1d4ed8]"
                        : label.tone === "platform"
                          ? "border-[#475569] bg-[#e2e8f0] text-[#334155]"
                          : "border-[#171717] bg-white text-[#171717]"
              }`}
              key={`${label.title}-${label.y}`}
              style={{ top: label.y }}
            >
              {label.title}
            </div>
          ))}

          {SPINNERS.map((spinner, index) => (
            <div
              className="absolute h-4 origin-center rounded-full bg-[#0891b2]/65 shadow-[0_0_0_4px_rgba(8,145,178,0.14)]"
              key={`${spinner.y}-${index}`}
              style={{
                left: spinner.x - spinner.length / 2,
                top: spinner.y - 10,
                transform: `rotate(${elapsed * spinner.speed}rad)`,
                width: spinner.length,
              }}
            />
          ))}

          {HAMMERS.map((hammer, index) => {
            const angle =
              Math.sin(elapsed * hammer.speed + hammer.phase) * 1.35 + Math.PI / 2;

            return (
              <div
                className="absolute h-5 origin-left rounded-full bg-[#92400e]/70"
                key={`${hammer.y}-${index}`}
                style={{
                  left: hammer.x,
                  top: hammer.y,
                  transform: `rotate(${angle}rad)`,
                  width: hammer.length,
                }}
              />
            );
          })}

          {BUMPERS.map((bumper, index) => (
            <div
              className="absolute rounded-full border-2 border-[#334155]/55 bg-[#fde68a]/70 shadow-[inset_0_0_0_6px_rgba(255,255,255,0.34)]"
              key={`${bumper.x}-${bumper.y}-${index}`}
              style={{
                height: bumper.r * 2,
                left: bumper.x - bumper.r,
                top: bumper.y - bumper.r,
                width: bumper.r * 2,
              }}
            />
          ))}

          {balls.map((ball) => {
            const isLeader = ball.id === leaderId;

            return (
              <div
                className={`absolute flex items-center gap-1.5 ${isLeader ? "z-30" : "z-20"}`}
                key={ball.id}
                style={{
                  left: ball.x - VISUAL_BALL_SIZE * 0.42,
                  top: ball.y - VISUAL_BALL_SIZE * 0.3,
                }}
                title={ball.label}
              >
                <span
                  className={`relative h-11 w-11 shrink-0 overflow-hidden rounded-full ${
                    isLeader
                      ? "shadow-[0_0_0_4px_rgba(250,204,21,0.95),0_0_22px_rgba(250,204,21,0.85),0_4px_12px_rgba(0,0,0,0.55)]"
                      : "shadow-[0_0_0_2px_rgba(255,255,255,0.95),0_3px_9px_rgba(0,0,0,0.52)]"
                  }`}
                  style={{
                    background: `radial-gradient(circle at 27% 23%, rgba(255,255,255,1), ${ball.color} 30%, rgba(23,23,23,0.72) 100%)`,
                    transform: `rotate(${ball.angle}rad)`,
                  }}
                >
                  <span className="absolute left-1/2 top-[-5px] h-[52px] w-[8px] -translate-x-1/2 rounded-full bg-white/95 shadow-[0_0_0_1px_rgba(0,0,0,0.38)]" />
                  <span className="absolute left-[6px] top-1/2 h-[26px] w-[5px] -translate-y-1/2 rounded-full bg-black/45" />
                  <span className="absolute right-[7px] top-1/2 h-[16px] w-[4px] -translate-y-1/2 rounded-full bg-white/55" />
                  <span className="absolute left-1/2 top-1/2 h-[11px] w-[11px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/62 shadow-[0_0_0_1px_rgba(255,255,255,0.48)]" />
                </span>
                <span
                  className={`max-w-[82px] truncate rounded-sm px-1 text-[13px] font-black leading-5 ${
                    isLeader
                      ? "bg-[#facc15] text-[#171717] shadow-[0_2px_6px_rgba(0,0,0,0.28)]"
                      : "bg-white/75 text-[#171717] shadow-[0_1px_3px_rgba(0,0,0,0.24)]"
                  }`}
                >
                  {ball.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
