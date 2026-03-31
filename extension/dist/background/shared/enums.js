export var Condition;
(function (Condition) {
    Condition["NewWithTags"] = "NewWithTags";
    Condition["NewWithoutTags"] = "NewWithoutTags";
    Condition["VeryGood"] = "VeryGood";
    Condition["Good"] = "Good";
    Condition["Fair"] = "Fair";
    Condition["Poor"] = "Poor";
})(Condition || (Condition = {}));
export var Color;
(function (Color) {
    Color["Red"] = "Red";
    Color["Pink"] = "Pink";
    Color["Orange"] = "Orange";
    Color["Yellow"] = "Yellow";
    Color["Green"] = "Green";
    Color["Blue"] = "Blue";
    Color["Purple"] = "Purple";
    Color["Gold"] = "Gold";
    Color["Silver"] = "Silver";
    Color["Black"] = "Black";
    Color["Gray"] = "Gray";
    Color["White"] = "White";
    Color["Cream"] = "Cream";
    Color["Beige"] = "Beige";
    Color["Brown"] = "Brown";
    Color["Tan"] = "Tan";
    Color["Khaki"] = "Khaki";
    Color["Turquoise"] = "Turquoise";
    Color["Apricot"] = "Apricot";
    Color["Coral"] = "Coral";
    Color["Burgundy"] = "Burgundy";
    Color["Rose"] = "Rose";
    Color["Lilac"] = "Lilac";
    Color["LightBlue"] = "LightBlue";
    Color["Navy"] = "Navy";
    Color["DarkGreen"] = "DarkGreen";
    Color["Mustard"] = "Mustard";
    Color["Mint"] = "Mint";
    Color["Multi"] = "Multi";
    Color["Clear"] = "Clear";
})(Color || (Color = {}));
export function isColor(value) {
    if (!value) {
        return false;
    }
    return Object.values(Color).includes(value);
}
