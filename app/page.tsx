"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type GameMode = "WINNER" | "LOSER";
type Screen = "setup" | "race" | "result";

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
  vx: number;
  vy: number;
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

const MAP_WIDTH = 960;
const MAP_HEIGHT = 7600;
const VIEW_HEIGHT = 720;
const FINISH_Y = 7350;
const BALL_RADIUS = 16;
const GRAVITY = 0.066;
const FRICTION = 0.982;
const DAMPING = 0.994;
const BUMPER_RESTITUTION = 0.52;
const MAX_HORIZONTAL_SPEED = 1.65;
const MAX_FALL_SPEED = 5.1;
const CAMERA_FOLLOW = 0.32;
const CAMERA_DEADZONE = 0;
const PHYSICS_STEP = 1000 / 60;
const WALL_X = 62;
const MAX_BALLS = 80;

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

const BRANCHES: Branch[] = [
  { y: 620, height: 520, leftTarget: 225, centerTarget: 480, rightTarget: 735 },
  { y: 2260, height: 600, leftTarget: 250, centerTarget: 505, rightTarget: 710 },
  { y: 4860, height: 620, leftTarget: 225, centerTarget: 485, rightTarget: 730 },
  { y: 6250, height: 520, leftTarget: 255, centerTarget: 485, rightTarget: 705 },
];

const BUMPERS: Bumper[] = [
  { x: 480, y: 1120, r: 58 },
  { x: 305, y: 1680, r: 48 },
  { x: 635, y: 1740, r: 52 },
  { x: 500, y: 2820, r: 56 },
  { x: 350, y: 3500, r: 50 },
  { x: 665, y: 4680, r: 42 },
  { x: 480, y: 5440, r: 58 },
  { x: 330, y: 6420, r: 50 },
  { x: 690, y: 6710, r: 44 },
  { x: 480, y: 7080, r: 52 },
];

const SPINNERS: Spinner[] = [
  { x: 480, y: 1540, length: 360, speed: 0.0048 },
  { x: 480, y: 1930, length: 420, speed: -0.0042 },
  { x: 480, y: 3350, length: 330, speed: 0.0038 },
  { x: 480, y: 5740, length: 390, speed: 0.0052 },
  { x: 480, y: 6900, length: 340, speed: -0.0045 },
];

const HAMMERS: Hammer[] = [
  { x: 285, y: 3300, length: 250, speed: 0.0046, phase: 0.3 },
  { x: 675, y: 3810, length: 270, speed: -0.0049, phase: 1.8 },
  { x: 520, y: 6660, length: 300, speed: 0.0054, phase: 0.8 },
];

const PLATFORMS: Platform[] = [
  { y: 4380, width: 320, speed: 0.0028, phase: 0.1 },
  { y: 4620, width: 260, speed: -0.0033, phase: 1.2 },
];

const JUMP_ZONES: JumpZone[] = [
  { x: 190, y: 4010, width: 210, forceX: 2.1, forceY: -2.2 },
  { x: 555, y: 4010, width: 230, forceX: -2.0, forceY: -2.0 },
  { x: 360, y: 6820, width: 240, forceX: 1.5, forceY: -1.8 },
];

const GUIDE_BARS: GuideBar[] = [
  { x1: 140, y1: 790, x2: 370, y2: 855, force: 0.13 },
  { x1: 820, y1: 790, x2: 590, y2: 855, force: 0.13 },
  { x1: 145, y1: 1345, x2: 395, y2: 1410, force: 0.14 },
  { x1: 810, y1: 1345, x2: 560, y2: 1410, force: 0.14 },
  { x1: 150, y1: 2500, x2: 385, y2: 2570, force: 0.15 },
  { x1: 815, y1: 2500, x2: 580, y2: 2570, force: 0.15 },
  { x1: 150, y1: 3085, x2: 430, y2: 3150, force: 0.13 },
  { x1: 810, y1: 3085, x2: 560, y2: 3155, force: 0.13 },
  { x1: 135, y1: 5235, x2: 385, y2: 5305, force: 0.14 },
  { x1: 825, y1: 5235, x2: 580, y2: 5305, force: 0.14 },
  { x1: 155, y1: 6140, x2: 410, y2: 6210, force: 0.13 },
  { x1: 810, y1: 6140, x2: 555, y2: 6210, force: 0.13 },
  { x1: 155, y1: 6520, x2: 390, y2: 6585, force: 0.12 },
  { x1: 810, y1: 6540, x2: 575, y2: 6605, force: 0.12 },
  { x1: 140, y1: 6885, x2: 380, y2: 6950, force: 0.13 },
  { x1: 820, y1: 6900, x2: 585, y2: 6965, force: 0.13 },
  { x1: 170, y1: 7200, x2: 430, y2: 7255, force: 0.11 },
  { x1: 790, y1: 7210, x2: 545, y2: 7265, force: 0.11 },
];

const C_TRAPS: CTrap[] = [
  { x: 250, y: 2060, r: 92, open: "right" },
  { x: 700, y: 3640, r: 96, open: "left" },
  { x: 710, y: 5480, r: 82, open: "left" },
  { x: 270, y: 6620, r: 88, open: "right" },
];

const S_CORRIDORS: SCorridor[] = [
  { y: 4700, height: 470, amplitude: 170, phase: 0 },
  { y: 5880, height: 500, amplitude: 155, phase: Math.PI },
  { y: 6700, height: 420, amplitude: 135, phase: Math.PI / 2 },
];

const WIND_ZONES: WindZone[] = [
  { y: 1460, height: 300, direction: "right", force: 0.035, label: "≫≫≫" },
  { y: 2580, height: 320, direction: "left", force: 0.032, label: "≪≪≪" },
  { y: 5300, height: 360, direction: "right", force: 0.03, label: "≫≫≫" },
  { y: 6500, height: 320, direction: "left", force: 0.032, label: "≪≪≪" },
];

const SECTION_LABELS: SectionLabel[] = [
  { title: "START", y: 85, tone: "start" },
  { title: "랜덤 분기 A", y: 620, tone: "branch" },
  { title: "회전 스피너 구간", y: 1440, tone: "spinner" },
  { title: "랜덤 분기 B", y: 2260, tone: "branch" },
  { title: "해머 구간", y: 3180, tone: "hammer" },
  { title: "대형 점프 구간", y: 3970, tone: "jump" },
  { title: "이동 플랫폼 구간", y: 4300, tone: "platform" },
  { title: "랜덤 분기 C", y: 4860, tone: "branch" },
  { title: "최종 경쟁 구간", y: 6250, tone: "branch" },
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
      vx: Math.sin(seed) * 0.7,
      vy: 0.75 + (index % 5) * 0.04,
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
  const dx = ball.x - bumper.x;
  const dy = ball.y - bumper.y;
  const distance = Math.hypot(dx, dy);
  const minDistance = bumper.r + BALL_RADIUS;

  if (distance > 0 && distance < minDistance) {
    const nx = dx / distance;
    const ny = dy / distance;
    const dot = ball.vx * nx + ball.vy * ny;

    ball.x = bumper.x + nx * minDistance;
    ball.y = bumper.y + ny * minDistance;
    ball.vx = (ball.vx - 2 * dot * nx) * BUMPER_RESTITUTION + nx * 0.62;
    ball.vy = Math.max(1.18, Math.abs(ball.vy - 2 * dot * ny) * 0.36 + 0.92);
  }
}

function applyGuideBars(ball: RaceBall) {
  GUIDE_BARS.forEach((bar) => {
    const hit = getLineDistance(ball.x, ball.y, bar.x1, bar.y1, bar.x2, bar.y2);

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

    ball.x += nx * 3.5;
    ball.y += ny * 3.5;
    ball.vx = ball.vx * 0.62 + tx * bar.force * 2.35 + nx * 0.16;
    ball.vy = Math.max(1.25, ball.vy * 0.94 + Math.abs(ty) * bar.force * 7.5);
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
    const half = spinner.length / 2;
    const x1 = spinner.x - Math.cos(angle) * half;
    const y1 = spinner.y - Math.sin(angle) * half;
    const x2 = spinner.x + Math.cos(angle) * half;
    const y2 = spinner.y + Math.sin(angle) * half;
    const hit = getLineDistance(ball.x, ball.y, x1, y1, x2, y2);

    if (hit.distance > BALL_RADIUS + 13) {
      return;
    }

    const nx = (ball.x - hit.px) / Math.max(1, hit.distance);
    const ny = (ball.y - hit.py) / Math.max(1, hit.distance);
    const tangential = spinner.speed > 0 ? 1 : -1;

    ball.x += nx * 6;
    ball.y += ny * 6;
    ball.vx += nx * 0.28 - Math.sin(angle) * tangential * 0.36;
    ball.vy += Math.abs(ny) * 0.95 + 0.28;
  });
}

function applyHammers(ball: RaceBall, elapsed: number) {
  HAMMERS.forEach((hammer) => {
    const angle = Math.sin(elapsed * hammer.speed + hammer.phase) * 1.35 + Math.PI / 2;
    const x2 = hammer.x + Math.cos(angle) * hammer.length;
    const y2 = hammer.y + Math.sin(angle) * hammer.length;
    const hit = getLineDistance(ball.x, ball.y, hammer.x, hammer.y, x2, y2);

    if (hit.distance > BALL_RADIUS + 15) {
      return;
    }

    const swing = Math.cos(elapsed * hammer.speed + hammer.phase) * hammer.speed * 850;
    const nx = (ball.x - hit.px) / Math.max(1, hit.distance);
    const ny = (ball.y - hit.py) / Math.max(1, hit.distance);

    ball.x += nx * 8;
    ball.y += ny * 8;
    ball.vx += nx * 0.45 + swing * 0.1;
    ball.vy = Math.max(1.05, ball.vy * 0.62 + Math.abs(swing) * 0.22);
  });
}

function applyPlatforms(ball: RaceBall, elapsed: number) {
  PLATFORMS.forEach((platform) => {
    const centerX = MAP_WIDTH / 2 + Math.sin(elapsed * platform.speed + platform.phase) * 250;
    const left = centerX - platform.width / 2;
    const right = centerX + platform.width / 2;
    const closeY = Math.abs(ball.y - platform.y) < 22;
    const onPlatform = ball.x > left - BALL_RADIUS && ball.x < right + BALL_RADIUS;

    if (!closeY || !onPlatform || ball.vy < 0) {
      return;
    }

    ball.y = platform.y - 23;
    ball.vy *= 0.18;
    ball.vx += Math.cos(elapsed * platform.speed + platform.phase) * platform.speed * 45;

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

  if (elapsed - ball.stuckSince < 2400) {
    return;
  }

  const push = ball.x < MAP_WIDTH / 2 ? 1 : -1;

  ball.vx += push * 0.35;
  ball.vy = Math.max(ball.vy, 3);
  ball.y += 12;
  ball.lastX = ball.x;
  ball.lastY = ball.y;
  ball.stuckSince = elapsed;
}

function advanceBall(ball: RaceBall, elapsed: number) {
  if (ball.finishedAt !== null) {
    return;
  }

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

  BUMPERS.forEach((bumper) => collideWithBumper(ball, bumper));
  applyGuideBars(ball);
  applySpinners(ball, elapsed);
  applyHammers(ball, elapsed);
  applyPlatforms(ball, elapsed);
  applyJumpZones(ball);
  applyCTraps(ball);
  applyAutoEscape(ball, elapsed);

  if (elapsed > 65000) {
    ball.vy = Math.max(ball.vy, 2.5);
  }

  if (elapsed > 75000) {
    ball.y += 1.6;
    ball.vx *= 0.98;
  }

  if (Math.abs(ball.vx) > MAX_HORIZONTAL_SPEED) {
    ball.vx = Math.sign(ball.vx) * MAX_HORIZONTAL_SPEED;
  }

  if (Math.abs(ball.vx) < 0.025) {
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

function getCameraTargetY(balls: RaceBall[]) {
  const leader = getRankings(balls).find((entry) => entry.finishedAt === null);

  if (!leader) {
    return MAP_HEIGHT - VIEW_HEIGHT;
  }

  return Math.min(Math.max(leader.y - VIEW_HEIGHT * 0.5, 0), MAP_HEIGHT - VIEW_HEIGHT);
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

  const frameRef = useRef<number | null>(null);
  const ballsRef = useRef<RaceBall[]>([]);
  const finishRecordsRef = useRef<FinishRecord[]>([]);
  const cameraYRef = useRef(0);
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
    lastFrameTimeRef.current = 0;
    physicsAccumulatorRef.current = 0;
    physicsElapsedRef.current = 0;
    previousRanksRef.current = new Map(initialRankings.map((entry) => [entry.id, entry.rank]));
    previousLeaderRef.current = initialRankings[0]?.id ?? null;
    lastRankSampleRef.current = 0;
    focusCooldownRef.current = 0;
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
    setCameraY(0);
    setRaceElapsed(0);
    setRankings([]);
    setRankDeltas({});
    setEvents([]);
    setLeaderSpotlight(null);
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
      const targetCameraY = getCameraTargetY(ballsRef.current);
      const cameraGap = targetCameraY - cameraYRef.current;
      if (Math.abs(cameraGap) > CAMERA_DEADZONE) {
        cameraYRef.current += cameraGap * CAMERA_FOLLOW;
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
              Sprint 2.2
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
              <RaceMap
                balls={balls}
                cameraY={cameraY}
                elapsed={raceElapsed}
                spotlight={activeSpotlight}
              />
              <EventLog events={events} />
            </div>
            <RaceHud
              ballCount={balls.length}
              finishCount={finishRecords.length}
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
  finishCount,
  participantCount,
  rankDeltas,
  topFive,
}: {
  ballCount: number;
  finishCount: number;
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

          return (
            <li
              className="grid grid-cols-[32px_1fr_58px] items-center gap-2 rounded-md border border-black/10 bg-[#f8fafc] px-3 py-2"
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
  spotlight,
}: {
  balls: RaceBall[];
  cameraY: number;
  elapsed: number;
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
              className="absolute h-5 origin-left rounded-full bg-[#334155] shadow-[0_0_0_4px_rgba(51,65,85,0.18)]"
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
              className="absolute rounded-full border-[14px] border-[#9333ea] bg-[#f3e8ff]/45"
              key={`${trap.x}-${trap.y}-${index}`}
              style={{
                borderLeftColor: trap.open === "left" ? "transparent" : "#9333ea",
                borderRightColor: trap.open === "right" ? "transparent" : "#9333ea",
                height: trap.r * 2,
                left: trap.x - trap.r,
                top: trap.y - trap.r,
                width: trap.r * 2,
              }}
            />
          ))}

          {JUMP_ZONES.map((zone, index) => (
            <div
              className="absolute rounded-md border-4 border-[#2563eb] bg-[#bfdbfe] text-center text-xs font-black leading-8 text-[#1d4ed8]"
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
                className="absolute h-8 rounded-md border-4 border-[#171717] bg-[#94a3b8]"
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
              className="absolute h-5 origin-center rounded-full bg-[#0891b2] shadow-[0_0_0_5px_rgba(8,145,178,0.25)]"
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
                className="absolute h-6 origin-left rounded-full bg-[#7c2d12]"
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
              className="absolute rounded-full border-4 border-[#171717] bg-[#ffd166] shadow-[inset_0_0_0_8px_rgba(255,255,255,0.45)]"
              key={`${bumper.x}-${bumper.y}-${index}`}
              style={{
                height: bumper.r * 2,
                left: bumper.x - bumper.r,
                top: bumper.y - bumper.r,
                width: bumper.r * 2,
              }}
            />
          ))}

          {balls.map((ball) => (
            <div
              className="absolute z-20 flex items-center gap-1"
              key={ball.id}
              style={{
                left: ball.x - BALL_RADIUS * 0.9,
                top: ball.y - BALL_RADIUS * 0.68,
              }}
              title={ball.label}
            >
              <span
                className="h-6 w-6 shrink-0 rounded-full shadow-[0_0_0_2px_rgba(255,255,255,0.9),0_2px_5px_rgba(0,0,0,0.28)]"
                style={{ background: ball.color }}
              />
              <span className="max-w-[46px] truncate text-[12px] font-black leading-none text-[#171717] drop-shadow-[0_1px_1px_rgba(255,255,255,0.95)]">
                {ball.owner}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
