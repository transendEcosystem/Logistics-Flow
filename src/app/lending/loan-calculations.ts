
'use client';

export interface MonthlyPayment {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

export function generateAmortizationSchedule(
  principal: number,
  annualRate: number,
  termInMonths: number,
  firstInstallmentDateStr: string | undefined,
  paymentsInAdvance: boolean | undefined
): MonthlyPayment[] {
    if (principal <= 0 || annualRate < 0 || termInMonths <= 0) {
        return [];
    }

    const monthlyRate = annualRate / 100 / 12;
    
    // If there is no interest, the calculation is simple.
    if (monthlyRate === 0) {
        const monthlyPayment = principal / termInMonths;
        const schedule: MonthlyPayment[] = [];
        let remainingBalance = principal;
        for (let i = 1; i <= termInMonths; i++) {
            remainingBalance -= monthlyPayment;
            schedule.push({
                month: i,
                payment: monthlyPayment,
                principal: monthlyPayment,
                interest: 0,
                remainingBalance: Math.max(0, remainingBalance),
            });
        }
        return schedule;
    }

    const monthlyPayment =
        (principal * monthlyRate * Math.pow(1 + monthlyRate, termInMonths)) /
        (Math.pow(1 + monthlyRate, termInMonths) - 1);

    const schedule: MonthlyPayment[] = [];
    let remainingBalance = principal;

    for (let i = 1; i <= termInMonths; i++) {
        const interestPayment = remainingBalance * monthlyRate;
        const principalPayment = monthlyPayment - interestPayment;
        remainingBalance -= principalPayment;

        schedule.push({
            month: i,
            payment: monthlyPayment,
            principal: principalPayment,
            interest: interestPayment,
            remainingBalance: Math.max(0, remainingBalance),
        });
    }

    return schedule;
}
