# Account system: 6 account types + comprehensive bank/provider search

Keeps the existing Add Account form design (dark theme, layout, controls, colours, icons, spacing, responsive behaviour). Only the data, options and field logic change.

## Account types

The Type selector offers exactly six options and swaps fields dynamically:

1. Bank Account
2. Credit Card
3. Cash
4. Wallet
5. Broker
6. Other

Existing accounts saved under older labels (Demat / Broker, Investment Account, Loan) keep working and stay visible; they are mapped onto the closest of the six for display and filtering.

## Bank Account fields

Name (required), Bank (searchable), Last 4, Opening Balance, Currency, Balance as of, Colour, Icon, Part of emergency fund, Set as default account.

## Bank / provider directory

A single provider directory replaces the small hardcoded list, grouped and searchable:

- India — Public Sector Banks (SBI, PNB, Bank of Baroda, Canara, Union, Bank of India, Indian Bank, Central Bank, IOB, UCO, Bank of Maharashtra, Punjab & Sind)
- India — Private Sector Banks (HDFC, ICICI, Axis, Kotak, IndusInd, Yes, IDFC FIRST, Federal, RBL, Bandhan, South Indian, City Union, Karnataka, Karur Vysya, DCB, Tamilnad Mercantile, CSB, Dhanlaxmi, J&K, Nainital)
- Small Finance / Payments Banks (AU, Ujjivan, Equitas, Jana, Suryoday, Utkarsh, ESAF, Fincare, Airtel Payments, India Post Payments, Fino, NSDL Payments)
- International / Foreign banks in India (HSBC, Citibank, Standard Chartered, Deutsche, Barclays, Bank of America, JPMorgan Chase, DBS, BNP Paribas, BBK, Bank of Ceylon, Scotiabank, Doha, Emirates NBD, First Abu Dhabi, Mizuho, MUFG, QNB, Société Générale, SMBC, UBS, Wells Fargo)
- Other / Custom — free typing is always allowed ("Custom — type a different bank" stays)

Search matches full names, abbreviations and aliases (HDFC, SBI, BOB, SCB, StanChart, Kotak, ICICI…), and results appear under their group headings.

Card issuers, wallets/UPI apps and brokers get the same searchable treatment from the same directory, so Credit Card, Wallet and Broker types offer relevant providers instead of banks.

## Field sets per type

- Bank Account: as listed above.
- Credit Card: Name, Issuer (searchable), Last 4, Credit Limit, Current Outstanding, Currency, Statement/Balance as of, Colour, Icon, default.
- Cash: Name, Amount on hand, Currency, Balance as of, Colour, Icon, default.
- Wallet: Name, Wallet / UPI app (searchable), Balance, Currency, Balance as of, Colour, Icon, default.
- Broker: Name, Broker (searchable), Client / Demat ID (masked), Uninvested cash balance, Currency, Balance as of, Colour, Icon, default.
- Other: Name, Provider (free text), Balance, Currency, Balance as of, Colour, Icon, Notes, default.

Shared across all: Owner (family member), Status, Notes — as today.

## Where accounts are used

Held in account on the asset forms keeps reading the same accounts, and Broker accounts are offered for market-traded holdings while Bank/Cash/Wallet accounts are offered for bank-held ones. The Accounts list, totals, type breakdown, filters, import/export and bulk actions keep working with the new types.

## Technical notes

- Account storage stays the existing `wealth_accounts` table — no second account system. One migration adds the fields the form needs and the table lacks: `color`, `icon`, `is_default`, `is_emergency_fund`, `credit_limit`, `balance_as_of`, `opening_balance` (all nullable / defaulted, with GRANTs unchanged since the table already exists).
- New `src/lib/account-providers.ts`: grouped provider registry with aliases plus a `searchProviders(query, kind)` helper.
- New searchable combobox built on the existing `command` + `popover` primitives, reused by every provider field.
- `src/lib/wealth-api.ts`: `ACCOUNT_TYPES` becomes the six types, `LEGACY_ACCOUNT_TYPE_MAP` normalises old rows, `Account`/`AccountInput`/payload gain the new fields, and setting an account as default clears the flag on the others.
- `src/components/wealth/account-dialog.tsx`: same markup and styling, driven by a per-type field spec.
- `src/components/wealth/account-select.tsx`: compatibility switches from regex guessing to the normalised type (market → Broker/Investment/Demat, bank → Bank Account/Cash/Wallet).
- `src/components/wealth/accounts-view.tsx`: icon/tint map and stat tiles updated for the six types.
- Verify with `bunx tsgo --noEmit` and the build log.
