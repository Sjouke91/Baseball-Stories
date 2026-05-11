export interface HittingInput {
  ab: number;
  h: number;
  singles: number;
  doubles: number;
  triples: number;
  hr: number;
  bb: number;
  hbp: number;
  sf: number;
}

export interface HittingOutput {
  avg: number;
  obp: number;
  slg: number;
  ops: number;
  totalBases: number;
}

const safeDivide = (num: number, den: number): number => {
  if (den === 0) return 0;
  return num / den;
};

export const calculateHitting = (input: HittingInput): HittingOutput => {
  const totalBases =
    input.singles + input.doubles * 2 + input.triples * 3 + input.hr * 4;

  const avg = safeDivide(input.h, input.ab);
  const obp = safeDivide(
    input.h + input.bb + input.hbp,
    input.ab + input.bb + input.hbp + input.sf,
  );
  const slg = safeDivide(totalBases, input.ab);
  const ops = obp + slg;

  return {
    avg,
    obp,
    slg,
    ops,
    totalBases,
  };
};
