export type TooltipEntry = {
  definition: string;
  howItWorks: string;
  formula: string;
};

export const WEALTH_PLANNER_TOOLTIPS = {
  retirement: {
    inputs: {
      currentAge: {
        definition: "Your age today in complete years.",
        howItWorks: "Starting point for accumulation timeline calculation.",
        formula: "years = retirementAge - currentAge",
      },
      retirementAge: {
        definition: "The age at which you stop working and live off accumulated corpus.",
        howItWorks: "Calculates total years available for wealth accumulation.",
        formula: "yearsToRetire = retirementAge - currentAge",
      },
      currentSavings: {
        definition: "Total investable wealth today (MFs, stocks, FDs, gold, bonds, NPS, EPF).",
        howItWorks: "Lump sum grows at pre-retirement return rate over accumulation period.",
        formula: "FV_Lump = currentSavings × (1 + preReturnRate/100)^years",
      },
      monthlySIP: {
        definition: "Recurring monthly investment across all channels (total amount, not per instrument).",
        howItWorks: "Monthly deposits grow at compounding rate as Annuity Due (deducted at month start).",
        formula: "FV_SIP = PMT × [(1 + r_monthly)^months - 1] / r_monthly × (1 + r_monthly)",
      },
      monthlyExpenses: {
        definition: "Current monthly lifestyle spending (rent, utilities, food, transport, medical, etc.).",
        howItWorks: "Inflated forward to retirement year to determine actual spending need.",
        formula: "inflatedMonthly = monthlyExpenses × (1 + inflationRate/100)^years",
      },
      preReturnRate: {
        definition: "Expected CAGR of portfolio during accumulation phase.",
        howItWorks: "Applied to both current savings and monthly SIP investments.",
        formula: "FV = PV × (1 + rate)^years",
      },
      postReturnRate: {
        definition: "Expected annual return on corpus after retirement (typically debt-heavy allocation).",
        howItWorks: "Extends corpus sustainability during withdrawal phase.",
        formula: "corpusGrowth = corpus × (1 + postReturnRate/100) - annualWithdrawal",
      },
      inflationRate: {
        definition: "Expected annual increase in cost of living.",
        howItWorks: "Escalates current expenses to retirement-year equivalent.",
        formula: "inflatedExpenses = currentExpenses × (1 + inflationRate/100)^years",
      },
      withdrawalRate: {
        definition: "Percentage of corpus you can withdraw annually indefinitely without depletion.",
        howItWorks: "Year 1 withdrawal = corpus × (SWR/100); adjusted for inflation yearly.",
        formula: "Required_Corpus = (monthlyExpenses × 12 × (1 + inflation)^years) / (SWR/100)",
      },
    },
    results: {
      projectedCorpus: {
        definition: "Total wealth you'll accumulate by retirement age.",
        howItWorks: "Sum of lump-sum growth and SIP growth over accumulation period.",
        formula: "Projected = [currentSavings × (1 + r)^years] + [SIP × [(1+r_mo)^months-1]/r_mo × (1+r_mo)]",
      },
      requiredCorpus: {
        definition: "Minimum wealth needed to sustain your lifestyle indefinitely.",
        howItWorks: "Inflation-adjusted annual expenses divided by Safe Withdrawal Rate.",
        formula: "Required = (monthlyExpenses × 12 × (1 + inflation)^years) / (SWR/100)",
      },
      surplus: {
        definition: "Gap between projected and required corpus (positive = surplus, negative = shortfall).",
        howItWorks: "If shortfall, calculates monthly SIP increase needed to close gap.",
        formula: "Gap = Projected - Required; If negative: addlSIP = |Gap| × r / [(1+r)^n - 1] / 12",
      },
      monthlyAtRetirement: {
        definition: "Expected monthly spending at retirement after inflation compounding.",
        howItWorks: "Brings today's expenses forward to retirement year.",
        formula: "inflatedMonthly = monthlyExpenses × (1 + inflationRate/100)^years",
      },
      sipFutureValue: {
        definition: "Projected value of ONLY monthly SIP investments (excludes initial savings).",
        howItWorks: "Shows power of recurring investing alone over accumulation period.",
        formula: "FV_SIP = monthlyPMT × [(1 + r_monthly)^months - 1] / r_monthly × (1 + r_monthly)",
      },
      coverage: {
        definition: "Percentage of required corpus you'll actually have at retirement.",
        howItWorks: "Shows progress toward retirement goal (100% = on track).",
        formula: "Coverage = (Projected / Required) × 100",
      },
    },
  },
  fire: {
    inputs: {
      currentAge: {
        definition: "Your age today in complete years.",
        howItWorks: "Starting point for FIRE timeline simulation.",
        formula: "yearsToFIRE = simulation until portfolio >= FIRE_number",
      },
      targetFireAge: {
        definition: "The age by which you want to achieve Financial Independence.",
        howItWorks: "Used to check if projected FIRE age aligns with target; shows if on track.",
        formula: "yearsAvailable = targetFireAge - currentAge",
      },
      currentNetWorth: {
        definition: "Total investable assets today (stocks, MFs, ETFs, bonds, gold, REITs, NPS, EPF).",
        howItWorks: "Starting portfolio value for growth simulation.",
        formula: "FV_Portfolio = currentNetWorth × (1 + annualReturn/100)^years",
      },
      annualExpenses: {
        definition: "Current annual lifestyle spending (12 × monthly or direct yearly amount).",
        howItWorks: "Used to calculate FIRE number via Safe Withdrawal Rate.",
        formula: "FIRE_Number = annualExpenses / (SWR/100)",
      },
      annualSavings: {
        definition: "Total amount invested annually across all channels (SIPs, lump sums, bonds, etc.).",
        howItWorks: "Added each year to portfolio; grows at annual return rate.",
        formula: "Portfolio(year+1) = Portfolio(year) × (1 + rate) + annualInvestments",
      },
      annualReturn: {
        definition: "Expected CAGR of your diversified portfolio.",
        howItWorks: "Applied to both current net worth and annual investments.",
        formula: "FV = PV × (1 + rate)^years + PMT × [(1 + rate)^n - 1] / rate",
      },
      swr: {
        definition: "Percentage of corpus you can withdraw annually indefinitely without depletion.",
        howItWorks: "Determines how much corpus you need to generate desired income.",
        formula: "FIRE_Number = annualExpenses / (SWR/100)",
      },
    },
    results: {
      fireNumber: {
        definition: "Total corpus needed to sustain your lifestyle indefinitely via SWR.",
        howItWorks: "Higher expenses or lower SWR = larger FIRE number.",
        formula: "FIRE_Number = annualExpenses / (SWR/100)",
      },
      progress: {
        definition: "Percentage of FIRE number you've already accumulated.",
        howItWorks: "Shows how close you are to achieving Financial Independence.",
        formula: "Progress = (currentNetWorth / FIRE_Number) × 100",
      },
      fireAge: {
        definition: "The age at which you'll reach your FIRE number based on current trajectory.",
        howItWorks: "Iterative simulation: each year adds annual investments, applies growth rate.",
        formula: "Simulate: portfolio = portfolio × (1 + rate) + annualInvestments until portfolio >= FIRE_Number",
      },
      projectedAtTarget: {
        definition: "Total portfolio value projected on your target FIRE age.",
        howItWorks: "Shows if you'll exceed FIRE number by target; surplus/deficit shown.",
        formula: "Portfolio_AtTarget = currentNetWorth × (1 + rate)^yearsAvailable + annualInvestments × [(1 + rate)^yearsAvailable - 1] / rate",
      },
      monthlyInvested: {
        definition: "Monthly equivalent of your annual investments (annual / 12).",
        howItWorks: "Shows monthly savings pace needed to achieve FIRE goal.",
        formula: "monthlyInvested = annualInvestments / 12",
      },
      monthlyNeeded: {
        definition: "Monthly investment required to hit FIRE number by target age (if shortfall exists).",
        howItWorks: "Reverse calculation: solves for PMT given target corpus and years.",
        formula: "PMT_needed = [FIRE_Number - FV_CurrentNW] × r / [(1 + r)^n - 1] / 12",
      },
      savingsRate: {
        definition: "Percentage of total income invested annually (investments / (investments + expenses)).",
        howItWorks: "Higher savings rate = faster FIRE; derived automatically.",
        formula: "savingsRate = (annualInvestments / (annualInvestments + annualExpenses)) × 100",
      },
    },
    variants: {
      leanFIRE: {
        definition: "FIRE number for 60% of current annual expenses (minimalist lifestyle).",
        howItWorks: "Lower expenses = smaller corpus needed = faster FIRE.",
        formula: "LeanFIRE = (annualExpenses × 0.60) / (SWR/100)",
      },
      standardFIRE: {
        definition: "FIRE number for 100% of current annual expenses (maintain current lifestyle).",
        howItWorks: "Base FIRE calculation; most common target.",
        formula: "FIRE = annualExpenses / (SWR/100)",
      },
      fatFIRE: {
        definition: "FIRE number for 200% of current annual expenses (upgraded lifestyle).",
        howItWorks: "Higher expenses = larger corpus needed = slower FIRE.",
        formula: "FatFIRE = (annualExpenses × 2.00) / (SWR/100)",
      },
    },
  },
} as const;
