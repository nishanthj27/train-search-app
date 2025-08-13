// backend/scripts/generateTestData.js
const mongoose = require('mongoose');
const Train = require('../src/models/Train');

const INDIAN_CITIES = [
  'Mumbai','Delhi','Bangalore','Chennai','Kolkata','Hyderabad','Pune','Ahmedabad',
  'Surat','Jaipur','Lucknow','Kanpur','Nagpur','Indore','Bhopal','Visakhapatnam',
  'Vadodara','Ludhiana','Rajkot','Agra','Siliguri','Nashik','Faridabad','Patiala',
  'Ghaziabad','Kalyan','Dombivli','Howrah','Ranchi','Raipur','Jabalpur','Gwalior',
  'Coimbatore','Vijayawada','Jodhpur','Madurai','Kota','Guwahati','Chandigarh',
  'Solapur','Hubballi','Tiruchirappalli','Bareilly','Mysuru','Tiruppur','Guntur',
  'Bhiwandi','Saharanpur','Gorakhpur','Bikaner','Amravati','Noida','Jamshedpur',
  'Bhilai','Cuttack','Kochi','Nellore','Bhavnagar','Dehradun','Durgapur','Asansol',
  'Rourkela','Nanded','Kolhapur','Ajmer','Akola','Gulbarga','Jamnagar','Ujjain',
  'Loni','Sikar','Jhansi','Ulhasnagar','Jammu','Sangli','Mangalore','Erode','Belgaum',
  'Ambattur','Tirunelveli','Malegaon','Gaya','Jalgaon','Udaipur','Maheshtala'
];

function getRandomCity(exclude = new Set()) {
  const choices = INDIAN_CITIES.filter(c => !exclude.has(c));
  return choices[Math.floor(Math.random() * choices.length)];
}

function generateTrainNumber() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

function generateTrainName(origin, dest, number) {
  // Better readable names like "Mumbai - Delhi Express 12345"
  const types = ['Express', 'Superfast', 'Mail', 'Passenger', 'Rajdhani', 'Shatabdi', 'Duronto', 'Special'];
  const type = types[Math.floor(Math.random() * types.length)];
  return `${origin} - ${dest} ${type} ${number}`;
}

function pad(n) { return n.toString().padStart(2, '0'); }

function minutesToHHMM(totalMinutes) {
  totalMinutes = ((totalMinutes % (24*60)) + (24*60)) % (24*60); // wrap around day
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  return `${pad(hh)}:${pad(mm)}`;
}

async function generateTestData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/traindb');
    console.log('Connected to MongoDB');

    await Train.deleteMany({});
    console.log('Cleared existing train data');

    const trains = [];
    const usedTrainNumbers = new Set();

    for (let i = 0; i < 1000; i++) {
      let trainNumber;
      do { trainNumber = generateTrainNumber(); } while (usedTrainNumbers.has(trainNumber));
      usedTrainNumbers.add(trainNumber);

      // Build stops: choose 3-8 unique cities, pick origin/dest
      const numStops = 3 + Math.floor(Math.random() * 6);
      const usedCities = new Set();
      const stops = [];

      // pick random first city
      const origin = getRandomCity(usedCities);
      usedCities.add(origin);
      let prevCumulativeMinutes = Math.floor(4 * 60 + Math.random() * 8 * 60); // trains start between 04:00-12:00
      stops.push({
        station: origin,
        departureTime: minutesToHHMM(prevCumulativeMinutes),
        distanceFromPrevious: 0
      });

      for (let s = 1; s < numStops; s++) {
        const city = getRandomCity(usedCities);
        usedCities.add(city);

        // distance 50-450 km (random)
        const distance = 50 + Math.floor(Math.random() * 401);
        // assume average speed 60 km/h -> minutes = distance * (60 / 60) => distance minutes (approx)
        const travelMinutes = Math.round(distance / 60 * 60); // approx distance in minutes
        prevCumulativeMinutes += travelMinutes + (10 + Math.floor(Math.random() * 31)); // include 10-40 min station dwell
        stops.push({
          station: city,
          departureTime: minutesToHHMM(prevCumulativeMinutes),
          distanceFromPrevious: distance
        });
      }

      const dest = stops[stops.length - 1].station;
      const trainName = generateTrainName(origin, dest, trainNumber);

      trains.push({ trainName, trainNumber, stops });

      if ((i + 1) % 100 === 0) console.log(`Generated ${i + 1} trains...`);
    }

    await Train.insertMany(trains);
    console.log(`Successfully generated and inserted ${trains.length} trains`);

    const totalStations = await Train.aggregate([
      { $unwind: '$stops' },
      { $group: { _id: '$stops.station' } },
      { $count: 'totalStations' }
    ]);
    console.log(`Total unique stations: ${totalStations[0] ? totalStations[0].totalStations : 0}`);
  } catch (error) {
    console.error('Error generating test data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

if (require.main === module) {
  generateTestData();
}

module.exports = generateTestData;
