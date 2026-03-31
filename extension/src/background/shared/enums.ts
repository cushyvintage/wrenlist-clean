export enum Condition {
  NewWithTags = "NewWithTags",
  NewWithoutTags = "NewWithoutTags",
  VeryGood = "VeryGood",
  Good = "Good",
  Fair = "Fair",
  Poor = "Poor",
}

export enum Color {
  Red = "Red",
  Pink = "Pink",
  Orange = "Orange",
  Yellow = "Yellow",
  Green = "Green",
  Blue = "Blue",
  Purple = "Purple",
  Gold = "Gold",
  Silver = "Silver",
  Black = "Black",
  Gray = "Gray",
  White = "White",
  Cream = "Cream",
  Beige = "Beige",
  Brown = "Brown",
  Tan = "Tan",
  Khaki = "Khaki",
  Turquoise = "Turquoise",
  Apricot = "Apricot",
  Coral = "Coral",
  Burgundy = "Burgundy",
  Rose = "Rose",
  Lilac = "Lilac",
  LightBlue = "LightBlue",
  Navy = "Navy",
  DarkGreen = "DarkGreen",
  Mustard = "Mustard",
  Mint = "Mint",
  Multi = "Multi",
  Clear = "Clear",
}

export function isColor(value: string | null | undefined): value is Color {
  if (!value) {
    return false;
  }

  return Object.values(Color).includes(value as Color);
}





