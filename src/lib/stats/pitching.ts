export interface PitchingInput {
  ip: number;
  h: number;
  bb: number;
  k: number;
  er: number;
}

export interface PitchingOutput {
  era: number;
  era7: number;
  whip: number;
  k9: number;
  bb9: number;
}

const inningsToDecimal = (ip: number): number => {
  const full = Math.trunc(ip);
  const decimalOuts = Math.round((ip - full) * 10);
  return full + decimalOuts / 3;
};

const statDivide = (num: number, den: number): number => {
  if (den === 0) return Number.POSITIVE_INFINITY;
  return num / den;
};

export const calculatePitching = (input: PitchingInput): PitchingOutput => {
  const inningDecimal = inningsToDecimal(input.ip);
  const era = statDivide(input.er * 9, inningDecimal);
  const era7 = statDivide(input.er * 7, inningDecimal);
  const whip = statDivide(input.bb + input.h, inningDecimal);
  const k9 = statDivide(input.k * 9, inningDecimal);
  const bb9 = statDivide(input.bb * 9, inningDecimal);

  return {
    era,
    era7,
    whip,
    k9,
    bb9,
  };
};
