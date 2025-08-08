import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

// Generic validation middleware
function validate(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): Response | void => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({ 
        error: 'Validation error',
        details: errorMessage 
      });
    }
    
    next();
  };
}

// FormData validation middleware - converts string fields to appropriate types
function validateFormData(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): Response | void => {
    try {
      // Convert FormData strings to appropriate types for validation
      const processedBody = { ...req.body };
      
      console.log('Original FormData body:', processedBody);
      
      // Parse playerIds if it's a JSON string (from FormData) - do this first
      if (processedBody.playerIds && typeof processedBody.playerIds === 'string') {
        try {
          processedBody.playerIds = JSON.parse(processedBody.playerIds);
          console.log('Parsed playerIds from string:', processedBody.playerIds);
        } catch (error) {
          return res.status(400).json({
            error: 'Validation error',
            details: 'playerIds must be a valid JSON array'
          });
        }
      }
      
      // Parse formationIds if it's a JSON string (from FormData)
      if (processedBody.formationIds && typeof processedBody.formationIds === 'string') {
        try {
          processedBody.formationIds = JSON.parse(processedBody.formationIds);
          console.log('Parsed formationIds from string:', processedBody.formationIds);
        } catch (error) {
          return res.status(400).json({
            error: 'Validation error',
            details: 'formationIds must be a valid JSON array'
          });
        }
      }
      
      // Parse positions if it's a JSON string (from FormData for formations)
      if (processedBody.positions && typeof processedBody.positions === 'string') {
        try {
          processedBody.positions = JSON.parse(processedBody.positions);
          console.log('Parsed positions from string:', processedBody.positions);
        } catch (error) {
          return res.status(400).json({
            error: 'Validation error',
            details: 'positions must be a valid JSON array'
          });
        }
      }
      
      // Convert numeric fields safely
      if (processedBody.points) {
        const pointsValue = parseInt(processedBody.points);
        if (isNaN(pointsValue)) {
          return res.status(400).json({ 
            error: 'Validation error',
            details: 'Points must be a valid number'
          });
        }
        processedBody.points = pointsValue;
      }
      
      if (processedBody.marketPrice) {
        const priceValue = parseInt(processedBody.marketPrice);
        if (isNaN(priceValue)) {
          return res.status(400).json({ 
            error: 'Validation error',
            details: 'Market price must be a valid number'
          });
        }
        processedBody.marketPrice = priceValue;
      }
      
      if (processedBody.percentage) {
        // Handle German decimal format (comma) and convert to English format (dot)
        const percentageString = processedBody.percentage.toString().replace(',', '.');
        const percentageValue = parseFloat(percentageString);
        if (isNaN(percentageValue)) {
          return res.status(400).json({ 
            error: 'Validation error',
            details: 'Percentage must be a valid number (use comma or dot as decimal separator)'
          });
        }
        processedBody.percentage = percentageValue;
      }
      
      if (processedBody.price) {
        const priceValue = parseInt(processedBody.price);
        if (isNaN(priceValue)) {
          return res.status(400).json({ 
            error: 'Validation error',
            details: 'Price must be a valid number'
          });
        }
        processedBody.price = priceValue;
      }
      
      console.log('Processed FormData body:', processedBody);
      console.log('playerIds type:', typeof processedBody.playerIds);
      console.log('playerIds value:', processedBody.playerIds);
      console.log('playerIds isArray:', Array.isArray(processedBody.playerIds));
      
      const { error } = schema.validate(processedBody);
      
      if (error) {
        const errorMessage = error.details.map(detail => detail.message).join(', ');
        console.log('Validation error details:', error.details);
        return res.status(400).json({ 
          error: 'Validation error',
          details: errorMessage 
        });
      }
      
      // Update req.body with processed values
      req.body = processedBody;
      next();
    } catch (err) {
      console.error('FormData validation error:', err);
      return res.status(400).json({ 
        error: 'Validation error',
        details: 'Invalid form data'
      });
    }
  };
}

// Authentication validation schemas
const registerSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.alphanum': 'Username must contain only alphanumeric characters',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username must not exceed 30 characters',
      'any.required': 'Username is required'
    }),
  
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .min(6)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password must not exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
      'any.required': 'Password is required'
    })
});

const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

// Player validation schemas
const createPlayerSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Player name cannot be empty',
      'string.max': 'Player name must not exceed 100 characters',
      'any.required': 'Player name is required'
    }),
  
  points: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .required()
    .messages({
      'number.base': 'Points must be a number',
      'number.integer': 'Points must be an integer',
      'number.min': 'Points must be at least 1',
      'number.max': 'Points must not exceed 100',
      'any.required': 'Points are required'
    }),
  
  position: Joi.string()
    .valid('GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF', 'LF', 'RF')
    .required()
    .messages({
      'any.only': 'Position must be one of: GK, CB, LB, RB, CDM, CM, CAM, LM, RM, LW, RW, ST, CF, LF, RF',
      'any.required': 'Position is required'
    }),
  
  color: Joi.string()
    .valid('RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE', 'ORANGE', 'PINK', 'CYAN')
    .required()
    .messages({
      'any.only': 'Color must be one of: RED, BLUE, GREEN, YELLOW, PURPLE, ORANGE, PINK, CYAN',
      'any.required': 'Color is required'
    }),
  
  marketPrice: Joi.number()
    .integer()
    .min(1)
    .required()
    .messages({
      'number.base': 'Market price must be a number',
      'number.integer': 'Market price must be an integer',
      'number.min': 'Market price must be at least 1',
      'any.required': 'Market price is required'
    }),
  
  theme: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.min': 'Theme cannot be empty',
      'string.max': 'Theme must not exceed 50 characters',
      'any.required': 'Theme is required'
    }),
  
  percentage: Joi.number()
    .min(0.001)
    .max(1)
    .default(0.05)
    .messages({
      'number.base': 'Percentage must be a number',
      'number.min': 'Percentage must be at least 0.001 (0.1%)',
      'number.max': 'Percentage must not exceed 1 (100%)'
    }),
  
  imageUrl: Joi.string()
    .optional()
    .messages({
      'string.base': 'Image URL must be a string'
    })
});

// Lobby validation schemas
const createLobbySchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(50)
    .pattern(/^[a-zA-Z0-9\s\-_]+$/)
    .required()
    .messages({
      'string.empty': 'Lobby name cannot be empty',
      'string.min': 'Lobby name must be at least 3 characters long',
      'string.max': 'Lobby name must not exceed 50 characters',
      'string.pattern.base': 'Lobby name can only contain letters, numbers, spaces, hyphens, and underscores',
      'any.required': 'Lobby name is required'
    })
});

// Formation validation schemas
const createFormationSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Formation name cannot be empty',
      'string.max': 'Formation name must not exceed 100 characters',
      'any.required': 'Formation name is required'
    }),
  
  imageUrl: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'Image URL must be a valid URL'
    }),
  
  positions: Joi.array()
    .items(Joi.object({
      position: Joi.string()
        .valid('GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF', 'LF', 'RF')
        .required()
        .messages({
          'any.only': 'Position type must be valid',
          'any.required': 'Position type is required'
        }),
      x: Joi.number()
        .min(0)
        .max(100)
        .required()
        .messages({
          'number.base': 'X coordinate must be a number',
          'number.min': 'X coordinate must be at least 0',
          'number.max': 'X coordinate must not exceed 100',
          'any.required': 'X coordinate is required'
        }),
      y: Joi.number()
        .min(0)
        .max(100)
        .required()
        .messages({
          'number.base': 'Y coordinate must be a number',
          'number.min': 'Y coordinate must be at least 0',
          'number.max': 'Y coordinate must not exceed 100',
          'any.required': 'Y coordinate is required'
        })
    }))
    .length(11)
    .required()
    .messages({
      'array.length': 'Formation must have exactly 11 positions',
      'any.required': 'Positions are required'
    }),
  
  percentage: Joi.number()
    .min(0.001)
    .max(1)
    .optional()
    .default(0.05)
    .messages({
      'number.base': 'Percentage must be a number',
      'number.min': 'Percentage must be at least 0.001 (0.1%)',
      'number.max': 'Percentage must not exceed 1 (100%)'
    })
});

// Pack validation schemas
const createPackSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Pack name cannot be empty',
      'string.min': 'Pack name cannot be empty',
      'string.max': 'Pack name must not exceed 100 characters',
      'any.required': 'Pack name is required'
    }),
  
  price: Joi.number()
    .integer()
    .min(1)
    .required()
    .messages({
      'number.base': 'Price must be a number',
      'number.integer': 'Price must be an integer',
      'number.min': 'Price must be at least 1',
      'any.required': 'Price is required'
    }),
  
  imageUrl: Joi.string()
    .optional()
    .messages({
      'string.base': 'Image URL must be a string'
    }),
  
  playerIds: Joi.array()
    .items(Joi.string().required())
    .optional()
    .messages({
      'array.base': 'Player IDs must be an array',
      'string.base': 'Each player ID must be a string'
    }),
  
  formationIds: Joi.array()
    .items(Joi.string().required())
    .optional()
    .messages({
      'array.base': 'Formation IDs must be an array',
      'string.base': 'Each formation ID must be a string'
    }),
  
  status: Joi.string()
    .valid('ACTIVE', 'INACTIVE', 'EMPTY')
    .optional()
    .messages({
      'any.only': 'Status must be ACTIVE, INACTIVE, or EMPTY'
    })
});

// Pack player management schemas
const packPlayerManagementSchema = Joi.object({
  playerIds: Joi.array()
    .items(Joi.string().required())
    .min(1)
    .required()
    .messages({
      'array.base': 'Player IDs must be an array',
      'array.min': 'At least one player ID is required',
      'array.includesRequiredUnknowns': 'At least one player ID is required',
      'string.base': 'Each player ID must be a string',
      'any.required': 'Player IDs are required'
    })
});

const packFormationManagementSchema = Joi.object({
  formationIds: Joi.array()
    .items(Joi.string().required())
    .min(1)
    .required()
    .messages({
      'array.base': 'Formation IDs must be an array',
      'array.min': 'At least one formation ID is required',
      'array.includesRequiredUnknowns': 'At least one formation ID is required',
      'string.base': 'Each formation ID must be a string',
      'any.required': 'Formation IDs are required'
    })
});

// Export validation middleware functions
export const validateRegistration = validate(registerSchema);
export const validateLogin = validate(loginSchema);
export const validateCreatePlayer = validateFormData(createPlayerSchema);
export const validateCreateLobby = validate(createLobbySchema);
export const validateCreateFormation = validateFormData(createFormationSchema);
export const validateCreateFormationJSON = validate(createFormationSchema);
export const validateCreatePack = validateFormData(createPackSchema);
export const validatePackPlayerManagement = validate(packPlayerManagementSchema);
export const validatePackFormationManagement = validate(packFormationManagementSchema);

// Generic parameter validation
export function validateId(req: Request, res: Response, next: NextFunction): Response | void {
  const { id } = req.params;
  
  if (!id || id.trim().length === 0) {
    return res.status(400).json({ error: 'Valid ID is required' });
  }
  
  next();
}