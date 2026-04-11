import { countries as countriesSource } from "./countries.js";
import { depopBrands as depopBrandsSource } from "./depopBrands.js";

export interface CountryOption {
  label: string;
  value: string;
}

export interface DepopBrand {
  id: string;
  name: string;
  status: string;
}

export const countries = countriesSource as unknown as CountryOption[];
export const depopBrands = depopBrandsSource as unknown as DepopBrand[];
