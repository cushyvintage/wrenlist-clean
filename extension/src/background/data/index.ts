import { countries as countriesSource } from "./countries.js";
import { depopBrands as depopBrandsSource } from "./depopBrands.js";
import { mercariBrands as mercariBrandsSource } from "./mercariBrands.js";

export interface CountryOption {
  label: string;
  value: string;
}

export interface DepopBrand {
  id: string;
  name: string;
  status: string;
}

export interface MercariBrand {
  id: number;
  name: string;
}

export const countries = countriesSource as unknown as CountryOption[];
export const depopBrands = depopBrandsSource as unknown as DepopBrand[];
export const mercariBrands = mercariBrandsSource as unknown as MercariBrand[];

