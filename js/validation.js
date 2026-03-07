// js/validation.js

/**
 * Base class for all Zod-like schema validators.
 * Provides standard parsing, safe parsing, and optionality features.
 */
class ZodType {
  /**
   * Parses the given value according to the schema.
   * @param {*} val - The value to parse.
   * @returns {*} The parsed value.
   * @throws {Error} If validation fails.
   */
  parse(val) { throw new Error('Not implemented'); }

  /**
   * Safely parses the given value according to the schema without throwing errors.
   * @param {*} val - The value to parse.
   * @returns {{success: boolean, data?: *, error?: Error}} An object indicating success or failure.
   */
  safeParse(val) {
    try {
      return { success: true, data: this.parse(val) };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Returns a new schema that allows undefined or null values.
   * @returns {ZodOptional} A new optional schema instance.
   */
  optional() {
    return new ZodOptional(this);
  }
}

/**
 * Schema validator for string values.
 * Extends the base ZodType to enforce string type checking.
 */
class ZodString extends ZodType {
  /**
   * Parses the given value to ensure it is a string.
   * @param {*} val - The value to parse.
   * @returns {string} The parsed string.
   * @throws {Error} If the value is not a string.
   */
  parse(val) {
    if (typeof val !== 'string') throw new Error(`Expected string, received ${typeof val}`);
    return val;
  }
}

/**
 * Schema validator for boolean values.
 * Extends the base ZodType to enforce boolean type checking.
 */
class ZodBoolean extends ZodType {
  /**
   * Parses the given value to ensure it is a boolean.
   * @param {*} val - The value to parse.
   * @returns {boolean} The parsed boolean.
   * @throws {Error} If the value is not a boolean.
   */
  parse(val) {
    if (typeof val !== 'boolean') throw new Error(`Expected boolean, received ${typeof val}`);
    return val;
  }
}

/**
 * Schema validator for array values.
 * Extends the base ZodType to enforce array type checking and validate each item against a provided sub-schema.
 */
class ZodArray extends ZodType {
  /**
   * Creates an array schema validator.
   * @param {ZodType} schema - The schema validator for the array items.
   */
  constructor(schema) {
    super();
    this.schema = schema;
  }

  /**
   * Parses the given value to ensure it is an array and validates each item.
   * @param {*} val - The value to parse.
   * @returns {Array} The parsed array.
   * @throws {Error} If the value is not an array or if any item fails validation.
   */
  parse(val) {
    if (!Array.isArray(val)) throw new Error(`Expected array, received ${typeof val}`);
    return val.map((item, i) => {
        try {
            return this.schema.parse(item);
        } catch(e) {
            throw new Error(`Array item at index ${i}: ${e.message}`);
        }
    });
  }
}

/**
 * Schema validator for object values.
 * Extends the base ZodType to enforce object type checking and validate properties against a defined shape.
 */
class ZodObject extends ZodType {
  /**
   * Creates an object schema validator.
   * @param {Object.<string, ZodType>} shape - The schema validator for the object properties.
   */
  constructor(shape) {
    super();
    this.shape = shape;
  }

  /**
   * Parses the given value to ensure it is an object and validates each property.
   * @param {*} val - The value to parse.
   * @returns {Object} The parsed object.
   * @throws {Error} If the value is not an object or if any property fails validation.
   */
  parse(val) {
    if (typeof val !== 'object' || val === null || Array.isArray(val)) {
        throw new Error(`Expected object, received ${val === null ? 'null' : typeof val}`);
    }
    const result = {};
    for (const key in this.shape) {
      try {
          const parsed = this.shape[key].parse(val[key]);
          if (parsed !== undefined) {
              result[key] = parsed;
          }
      } catch(e) {
          throw new Error(`Property '${key}': ${e.message}`);
      }
    }
    return result;
  }
}

/**
 * Schema validator wrapper that allows undefined or null values.
 * If a value is provided, it delegates validation to the underlying schema.
 */
class ZodOptional extends ZodType {
  /**
   * Creates an optional schema validator.
   * @param {ZodType} schema - The schema validator to wrap.
   */
  constructor(schema) {
    super();
    this.schema = schema;
  }

  /**
   * Parses the given value, returning undefined for null or undefined values.
   * @param {*} val - The value to parse.
   * @returns {*} The parsed value or undefined.
   */
  parse(val) {
    if (val === undefined || val === null) return undefined;
    return this.schema.parse(val);
  }
}

/**
 * A lightweight, zero-dependency schema validation utility mimicking the Zod API.
 * Provides runtime type checking and validation for structured data.
 *
 * @type {{
 *   string: () => ZodString,
 *   boolean: () => ZodBoolean,
 *   array: (schema: ZodType) => ZodArray,
 *   object: (shape: Object.<string, ZodType>) => ZodObject
 * }}
 */
export const z = {
  string: () => new ZodString(),
  boolean: () => new ZodBoolean(),
  array: (schema) => new ZodArray(schema),
  object: (shape) => new ZodObject(shape)
};
