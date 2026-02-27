export type PaymentBreakdown = {
  gross: number
  tax: number
  platformFee: number
  net: number
}

export const computePayment = (gross: number, taxRate = 0.18, feeRate = 0.02): PaymentBreakdown => {
  const tax = round2(gross * taxRate)
  const platformFee = round2(gross * feeRate)
  const net = round2(gross - tax - platformFee)
  return { gross: round2(gross), tax, platformFee, net }
}

const round2 = (n: number) => Math.round(n * 100) / 100

