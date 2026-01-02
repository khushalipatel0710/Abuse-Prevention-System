let mongoose;

const getRateLimitConfigModel = () => {
  if (!mongoose) {
    mongoose = require('mongoose');
  }
  
  const RateLimitConfigSchema = new mongoose.Schema(
    {
      endpointPattern: {
        type: String,
        required: true,
        index: true,
      },
      method: {
        type: String,
        default: 'ALL',
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ALL'],
      },
      maxRequests: {
        type: Number,
        required: true,
        min: [1, 'Max requests must be at least 1'],
        validate: {
          validator: function(value) {
            return Number.isInteger(value) && value > 0;
          },
          message: 'Max requests must be a positive integer'
        }
      },
      windowMs: {
        type: Number,
        required: true,
        min: [1000, 'Window must be at least 1000ms'],
        validate: {
          validator: function(value) {
            return Number.isInteger(value) && value >= 1000;
          },
          message: 'Window must be a positive integer >= 1000ms'
        }
      },
      isActive: {
        type: Boolean,
        default: true,
      },
    },
    { timestamps: true }
  );

  return mongoose.model('RateLimitConfig', RateLimitConfigSchema);
};

module.exports = getRateLimitConfigModel();