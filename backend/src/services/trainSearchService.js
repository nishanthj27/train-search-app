// backend/src/services/trainSearchService.js
const Train = require('../models/Train');

class TrainSearchService {
  static PRICE_PER_KM = 1.25;

  // Use aggregation to compute direct routes on DB side
  static async findDirectTrains(source, destination) {
    const pipeline = [
      { $match: { 'stops.station': { $all: [source, destination] } } },
      {
        $addFields: {
          sourceIndex: { $indexOfArray: ['$stops.station', source] },
          destIndex: { $indexOfArray: ['$stops.station', destination] }
        }
      },
      { $match: { $expr: { $lt: ['$sourceIndex', '$destIndex'] } } },
      {
        $addFields: {
          // slice stops between sourceIndex+1 and destIndex (inclusive of dest)
          segment: {
            $slice: [
              '$stops',
              { $add: ['$sourceIndex', 1] },
              { $subtract: ['$destIndex', '$sourceIndex'] }
            ]
          }
        }
      },
      {
        $addFields: {
          distance: {
            $reduce: {
              input: '$segment',
              initialValue: 0,
              in: { $add: ['$$value', '$$this.distanceFromPrevious'] }
            }
          },
          startingTime: { $arrayElemAt: ['$stops.departureTime', '$sourceIndex'] },
          reachingTime: { $arrayElemAt: ['$stops.departureTime', '$destIndex'] }
        }
      },
      {
        $project: {
          _id: 1,
          trainName: 1,
          trainNumber: 1,
          startingTime: 1,
          reachingTime: 1,
          distance: 1
        }
      }
    ];

    const docs = await Train.aggregate(pipeline).exec();

    return docs.map(doc => ({
      trainName: doc.trainName,
      trainNumber: doc.trainNumber,
      startingTime: doc.startingTime,
      reachingTime: doc.reachingTime,
      distance: doc.distance,
      price: doc.distance * this.PRICE_PER_KM,
      type: 'direct'
    }));
  }

  static async findConnectingTrains(source, destination) {
    // Query only trains that actually pass through source or destination
    const fromSourceTrains = await Train.find({ 'stops.station': source }).lean();
    const toDestTrains = await Train.find({ 'stops.station': destination }).lean();

    const connectingRoutes = [];

    for (const sourceTrain of fromSourceTrains) {
      const sourceStopIndex = sourceTrain.stops.findIndex(s => s.station === source);
      if (sourceStopIndex === -1) continue;

      // check every station after source in this train
      for (let i = sourceStopIndex + 1; i < sourceTrain.stops.length; i++) {
        const intermediateStation = sourceTrain.stops[i].station;

        for (const destTrain of toDestTrains) {
          if (sourceTrain.trainNumber === destTrain.trainNumber) continue;

          const intStopIndex = destTrain.stops.findIndex(s => s.station === intermediateStation);
          const destStopIndex = destTrain.stops.findIndex(s => s.station === destination);

          if (intStopIndex !== -1 && destStopIndex !== -1 && intStopIndex < destStopIndex) {
            const firstLegDistance = this.calculateDistance(sourceTrain.stops, sourceStopIndex, i);
            const secondLegDistance = this.calculateDistance(destTrain.stops, intStopIndex, destStopIndex);
            const totalDistance = firstLegDistance + secondLegDistance;

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
              totalPrice: totalDistance * this.PRICE_PER_KM,
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
      distance += stops[i].distanceFromPrevious || 0;
    }
    return distance;
  }

  static async searchTrains(source, destination, sortBy = 'price') {
    const directTrains = await this.findDirectTrains(source, destination);
    const connectingTrains = await this.findConnectingTrains(source, destination);

    let allRoutes = [...directTrains, ...connectingTrains];

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
    const trains = await Train.find({}).lean();
    const stationsSet = new Set();
    trains.forEach(train => train.stops.forEach(s => stationsSet.add(s.station)));
    return Array.from(stationsSet).sort();
  }
}

module.exports = TrainSearchService;
