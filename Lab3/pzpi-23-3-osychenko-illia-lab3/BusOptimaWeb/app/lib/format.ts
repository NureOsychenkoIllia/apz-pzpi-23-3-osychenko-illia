export const fmtUAH = (value: number) =>
  `${new Intl.NumberFormat("uk-UA").format(Math.round(value))} ₴`;

export const fmtPct = (value: number) => `${value.toFixed(1)}%`;

export const fmtNum = (value: number) =>
  new Intl.NumberFormat("uk-UA").format(Math.round(value));
