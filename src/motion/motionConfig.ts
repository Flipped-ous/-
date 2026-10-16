export type MotionLevel = 'simple' | 'standard' | 'rich';

export interface MotionConfig {
  level: MotionLevel;
  durations: {
    tapFeedback: number;
    smallTransition: number;
    cancelSwipe: number;
    confirmedSwipe: number;
    listReflow: number;
    pageTransition: number;
    bottomSheet: number;
  };
  easings: {
    standard: string;
    decelerate: string;
    accelerate: string;
    spring: string;
    bounce: string;
  };
  allowParallax: boolean;
  allowScaleEffects: boolean;
}

export const motionConfigs: Record<MotionLevel, MotionConfig> = {
  simple: {
    level: 'simple',
    durations: {
      tapFeedback: 100,
      smallTransition: 160,
      cancelSwipe: 220,
      confirmedSwipe: 280,
      listReflow: 200,
      pageTransition: 200,
      bottomSheet: 240,
    },
    easings: {
      standard: 'ease',
      decelerate: 'ease-out',
      accelerate: 'ease-in',
      spring: 'ease-out',
      bounce: 'ease',
    },
    allowParallax: false,
    allowScaleEffects: false,
  },
  standard: {
    level: 'standard',
    durations: {
      tapFeedback: 140,
      smallTransition: 190,
      cancelSwipe: 250,
      confirmedSwipe: 300,
      listReflow: 280,
      pageTransition: 260,
      bottomSheet: 300,
    },
    easings: {
      standard: 'cubic-bezier(0.25, 1, 0.5, 1)',
      decelerate: 'cubic-bezier(0.2, 0.9, 0.3, 1)',
      accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      bounce: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    },
    allowParallax: false,
    allowScaleEffects: true,
  },
  rich: {
    level: 'rich',
    durations: {
      tapFeedback: 150,
      smallTransition: 220,
      cancelSwipe: 270,
      confirmedSwipe: 330,
      listReflow: 310,
      pageTransition: 300,
      bottomSheet: 320,
    },
    easings: {
      standard: 'cubic-bezier(0.22, 1, 0.36, 1)',
      decelerate: 'cubic-bezier(0.16, 1, 0.3, 1)',
      accelerate: 'cubic-bezier(0.4, 0, 0.7, 1)',
      spring: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
      bounce: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    },
    allowParallax: true,
    allowScaleEffects: true,
  },
};

export function getMotionConfig(
  level: MotionLevel = 'standard',
  enabled = true,
): MotionConfig {
  if (!enabled)
    return {
      ...motionConfigs.simple,
      durations: Object.fromEntries(
        Object.keys(motionConfigs.simple.durations).map((key) => [key, 0]),
      ) as MotionConfig['durations'],
    };
  return motionConfigs[level] || motionConfigs.standard;
}
