const Train = require('../models/Train');

class TrainSearchService {
  static PRICE_PER_KM = 1.25;

  static async findDirectTrains(source, destination) {
    const trains = await Train.find({
      'stops.station': { $all: [source, destination] }
    });

    const directTrains = [];
    
    for (const train of trains) {
      const sourceIndex = train.stops.findIndex(stop => stop.station === source);
      const destIndex = train.stops.findIndex(stop => stop.station === destination);
      
      if (sourceIndex !== -1 && destIndex !== -1 && sourceIndex < destIndex) {
        const distance = this.calculateDistance(train.stops, sourceIndex, destIndex);
        const price = distance * this.PRICE_PER_KM;
        
        directTrains.push({
          trainName: train.trainName,
          trainNumber: train.trainNumber,
          startingTime: train.stops[sourceIndex].departureTime,
          reachingTime: train.stops[destIndex].departureTime,
          distance,
          price,
          type: 'direct'
        });
      }
    }
    
    return directTrains;
  }

  static async findConnectingTrains(source, destination) {
    const allTrains = await Train.find({});
    const connectingRoutes = [];
    
    // Find trains from source to intermediate stations
    const fromSourceTrains = allTrains.filter(train => 
      train.stops.some(stop => stop.station === source)
    );
    
    // Find trains from intermediate stations to destination
    const toDestTrains = allTrains.filter(train => 
      train.stops.some(stop => stop.station === destination)
    );
    
    for (const sourceTrain of fromSourceTrains) {
      const sourceStopIndex = sourceTrain.stops.findIndex(stop => stop.station === source);
      if (sourceStopIndex === -1) continue;
      
      // Check all stations after source in this train
      for (let i = sourceStopIndex + 1; i < sourceTrain.stops.length; i++) {
        const intermediateStation = sourceTrain.stops[i].station;
        
        // Find trains from intermediate station to destination
        for (const destTrain of toDestTrains) {
          if (sourceTrain.trainNumber === destTrain.trainNumber) continue;
          
          const intStopIndex = destTrain.stops.findIndex(stop => stop.station === intermediateStation);
          const destStopIndex = destTrain.stops.findIndex(stop => stop.station === destination);
          
          if (intStopIndex !== -1 && destStopIndex !== -1 && intStopIndex < destStopIndex) {
            const firstLegDistance = this.calculateDistance(sourceTrain.stops, sourceStopIndex, i);
            const secondLegDistance = this.calculateDistance(destTrain.stops, intStopIndex, destStopIndex);
            const totalDistance = firstLegDistance + secondLegDistance;
            const totalPrice = totalDistance * this.PRICE_PER_KM;
            
            connectingRoutes.push({
              firstTrain: {
                trainName: sourceTrain.trainName,
                trainNumber: sourceTrain.trainNumber,
                startingTime: sourceTrain.stops[sourceStopIndex].departureTime,
                reachingTime: sourceTrain.stops[i].departureTime,
                distance: firstLegDistance,
                price: firstLegDistance * this.PRICE_PER_KM
              },
              secondTrain: {
                trainName: destTrain.trainName,
                trainNumber: destTrain.trainNumber,
                startingTime: destTrain.stops[intStopIndex].departureTime,
                reachingTime: destTrain.stops[destStopIndex].departureTime,
                distance: secondLegDistance,
                price: secondLegDistance * this.PRICE_PER_KM
              },
              intermediateStation,
              totalDistance,
              totalPrice,
              type: 'connecting'
            });
          }
        }
      }
    }
    
    return connectingRoutes;
  }

  static calculateDistance(stops, fromIndex, toIndex) {
    let distance = 0;
    for (let i = fromIndex + 1; i <= toIndex; i++) {
      distance += stops[i].distanceFromPrevious;
    }
    return distance;
  }

  static async searchTrains(source, destination, sortBy = 'price') {
    const directTrains = await this.findDirectTrains(source, destination);
    const connectingTrains = await this.findConnectingTrains(source, destination);
    
    let allRoutes = [...directTrains, ...connectingTrains];
    
    // Sort based on criteria
    if (sortBy === 'price') {
      allRoutes.sort((a, b) => {
        const priceA = a.type === 'direct' ? a.price : a.totalPrice;
        const priceB = b.type === 'direct' ? b.price : b.totalPrice;
        return priceA - priceB;
      });
    } else if (sortBy === 'time') {
      allRoutes.sort((a, b) => {
        const timeA = a.type === 'direct' ? a.startingTime : a.firstTrain.startingTime;
        const timeB = b.type === 'direct' ? b.startingTime : b.firstTrain.startingTime;
        return timeA.localeCompare(timeB);
      });
    }
    
    return allRoutes;
  }

  static async getAllStations() {
    const trains = await Train.find({});
    const stationsSet = new Set();
    
    trains.forEach(train => {
      train.stops.forEach(stop => {
        stationsSet.add(stop.station);
      });
    });
    
    return Array.from(stationsSet).sort();
  }
}

module.exports = TrainSearchService;
