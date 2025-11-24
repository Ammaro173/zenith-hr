export const unknownError =
  "An unknown error occurred. Please try again later.";

export const MEMBER_ID_MAX_LENGTH = 4;

export const MIN_PASSWORD_LENGTH = 4;

export const VIN_REQUIRED_LENGTH = 17;
export const VIN_YEAR_ALLOWANCE = 2;

//TODO
// export const QAT_PHONE = {
//   PREFIX: "+974" as const,
//   LOCAL_LENGTH: 8 as const,
//   REGEX: /^\+974\d{8}$/,
//   STRIP_PREFIX_REGEX: /^\+?974/,
// } as const;

export const QAT_PHONE_PREFIX = "+974" as const;
export const QAT_PHONE_LOCAL_LENGTH = 8 as const;
export const QAT_PHONE_REGEX = /^\+974\d{8}$/;
export const STRIP_QAT_PHONE_PREFIX_REGEX = /^\+?974/;

export const NON_DIGIT_REGEX = /\D/g;

export const DEPARTMENTS = [
  "Q Auto Holding",
  "Credit and Collection",
  "Sales Administration",
  "Audi New Car Sales",
  "Audi Approved: plus",
  "Volkswagen New Car Sales",
  "Volkswagen Certified Used Car",
  "Q Auto Select",
  "SKODA Sales",
  "Commercial / Fleet Sales",
  "Customer Relation Management",
  "Aftersales Holding",
  "Aftersales – Parts",
  "Bodyshop",
  "Audi Aftersales",
  "Volkswagen Aftersales",
  "SKODA Aftersales",
  "Finance",
  "Human Resource",
  "Logistics",
  "Projects, Facility and Procurement",
  "Q Mobility Limousine",
  "Q Mobility Rent a Car",
  "Uber Black",
  "Royal Enfield",
  "BEELECTRIC",
  "Central Marketing",
  "SAWA Technology",
  "Zeal",
] as const;
