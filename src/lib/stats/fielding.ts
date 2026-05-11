export interface FieldingInput {
  po: number;
  a: number;
  e: number;
}

export interface FieldingOutput {
  tc: number;
  fld: number;
}

export const calculateFielding = (input: FieldingInput): FieldingOutput => {
  const tc = input.po + input.a + input.e;
  const fld = tc === 0 ? 0 : (input.po + input.a) / tc;

  return {
    tc,
    fld,
  };
};
