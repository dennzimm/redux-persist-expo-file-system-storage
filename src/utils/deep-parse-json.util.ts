/**
 * Represents a JSON value that can be of type string, number, boolean, null, JsonObject, or JsonArray.
 */
type JsonValue = string | number | boolean | null | JsonObject | JsonArray;

/**
 * Represents a JSON object.
 */
type JsonObject = { [key: string]: JsonValue };

/**
 * Represents an array of JSON values.
 */
type JsonArray = Array<JsonValue>;

/**
 * Checks if a string represents a numeric value.
 * @param str - The string to check.
 * @returns True if the string represents a numeric value, false otherwise.
 */
function isNumericString(str: string): boolean {
  return !Number.isNaN(Number(str));
}

/**
 * Converts a JSON value to a string.
 * If the value is already a string, it is returned as is.
 * Otherwise, the value is converted to a JSON string representation.
 *
 * @param value - The JSON value to convert.
 * @returns The converted string.
 */
function convertToString(value: JsonValue): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

/**
 * Checks if a value is a JSON object.
 * @param value The value to check.
 * @returns True if the value is a JSON object, false otherwise.
 */
function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Checks if the given value is a numeric JSON value.
 * @param value The value to check.
 * @returns True if the value is a numeric JSON value, false otherwise.
 */
function isNumericJsonValue(value: unknown): value is string {
  return typeof value === "string" && isNumericString(value);
}

/**
 * Parses a JSON string and returns the corresponding JavaScript value.
 * If the JSON string is invalid, it returns the original string.
 *
 * @param jsonString The JSON string to parse.
 * @returns The parsed JavaScript value or the original string if parsing fails.
 */
export function deepParseJson(jsonString: string): JsonValue {
  try {
    const parsedJson = JSON.parse(jsonString);

    if (isNumericJsonValue(parsedJson)) {
      return parsedJson;
    }

    if (Array.isArray(parsedJson)) {
      return parsedJson.map(deepParseJson);
    }

    if (isJsonObject(parsedJson)) {
      return Object.fromEntries(
        Object.entries(parsedJson).map(([key, val]) => [
          key,
          deepParseJson(convertToString(val)),
        ])
      );
    }

    return parsedJson;
  } catch (err) {
    return jsonString;
  }
}
