// The fixed set of insurance products this org sells, in the order they
// should always be displayed (Book of Business form, Product Analytics).
export const PRODUCTS = ["Final Expense", "Whole Life", "Term", "IUL", "Annuities"] as const;
export type Product = (typeof PRODUCTS)[number];
