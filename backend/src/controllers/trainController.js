const TrainSearchService = require('../services/trainSearchService');

const searchTrains = async (req, res) => {
  try {
    const { source, destination, sortBy } = req.query;
    
    if (!source || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Source and destination are required'
      });
    }
    
    if (source === destination) {
      return res.status(400).json({
        success: false,
        message: 'Source and destination cannot be the same'
      });
    }
    
    const results = await TrainSearchService.searchTrains(source, destination, sortBy);
    
    res.json({
      success: true,
      data: {
        source,
        destination,
        results,
        count: results.length
      }
    });
  } catch (error) {
    console.error('Error searching trains:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getStations = async (req, res) => {
  try {
    const stations = await TrainSearchService.getAllStations();
    res.json({
      success: true,
      data: stations
    });
  } catch (error) {
    console.error('Error fetching stations:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = { searchTrains, getStations };
