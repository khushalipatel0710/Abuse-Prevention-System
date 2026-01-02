const healthController = {
  /**
   * Health check endpoint
   */
  async health(_req, res) {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  },
};

module.exports = healthController;
