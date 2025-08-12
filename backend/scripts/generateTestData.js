const mongoose = require('mongoose');
const Train = require('../src/models/Train');

const INDIAN_CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad',
  'Surat', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Bhopal', 'Visakhapatnam',
  'Vadodara', 'Firozabad', 'Ludhiana', 'Rajkot', 'Agra', 'Siliguri', 'Nashik', 'Faridabad',
  'Patiala', 'Ghaziabad', 'Kalyan', 'Dombivli', 'Howrah', 'Ranchi', 'Raipur', 'Jabalpur',
  'Gwalior', 'Coimbatore', 'Vijayawada', 'Jodhpur', 'Madurai', 'Raigarh', 'Kota', 'Guwahati',
  'Chandigarh', 'Solapur', 'Hubballi', 'Tiruchirappalli', 'Bareilly', 'Mysuru', 'Tiruppur',
  'Gurgaon', 'Aligarh', 'Jalandhar', 'Bhubaneswar', 'Salem', 'Warangal', 'Guntur', 'Bhiwandi',
  'Saharanpur', 'Gorakhpur', 'Bikaner', 'Amravati', 'Noida', 'Jamshedpur', 'Bhilai', 'Cuttack',
  'Firozabad', 'Kochi', 'Nellore', 'Bhavnagar', 'Dehradun', 'Durgapur', 'Asansol', 'Rourkela',
  'Nanded', 'Kolhapur', 'Ajmer', 'Akola', 'Gulbarga', 'Jamnagar', 'Ujjain', 'Loni', 'Sikar',
  'Jhansi', 'Ulhasnagar', 'Jammu', 'Sangli', 'Mangalore', 'Erode', 'Belgaum', 'Ambattur',
  'Tirunelveli', 'Malegaon', 'Gaya', 'Jalgaon', 'Udaipur', 'Maheshtala'
];

function getRandomCity() {
  return INDIAN_CITIES[Math.floor(Math.random() * INDIAN_CITIES.length)];
}

function generateRandomTime() {
  const hours = Math.floor(Math.random() * 24).toString().padStart(2, '0');
  const minutes = Math.floor(Math.random() * 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function generateTrainNumber() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

function generateTrainName() {
  const prefixes = ['Express', 'Superfast', 'Mail', 'Passenger', 'Rajdhani', 'Shatabdi', 'Duronto'];
  const suffixes = ['Express', 'Special', 'Link', 'Passenger'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${prefix} ${suffix}`;
}

async function generateTestData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/traindb');
    console.log('Connected to MongoDB');
    
    // Clear existing data
    await Train.deleteMany({});
    console.log('Cleared existing train data');
    
    const trains = [];
    const usedTrainNumbers = new Set();
    const usedTrainNames = new Set();
    
    for (let i = 0; i < 1000; i++) {
      let trainNumber, trainName;
      
      // Ensure unique train number
      do {
        trainNumber = generateTrainNumber();
      } while (usedTrainNumbers.has(trainNumber));
      usedTrainNumbers.add(trainNumber);
      
      // Ensure unique train name
      do {
        trainName = `${generateTrainName()} ${trainNumber}`;
      } while (usedTrainNames.has(trainName));
      usedTrainNames.add(trainName);
      
      // Generate 3-8 stops for each train
      const numStops = 3 + Math.floor(Math.random() * 6);
      const stops = [];
      const usedCities = new Set();
      
      for (let j = 0; j < numStops; j++) {
        let city;
        do {
          city = getRandomCity();
        } while (usedCities.has(city));
        usedCities.add(city);
        
        const stop = {
          station: city,
          departureTime: generateRandomTime(),
          distanceFromPrevious: j === 0 ? 0 : 50 + Math.floor(Math.random() * 400) // 50-450 km
        };
        stops.push(stop);
      }
      
      // Sort stops by departure time to maintain logical sequence
      stops.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
      
      trains.push({
        trainName,
        trainNumber,
        stops
      });
      
      if ((i + 1) % 100 === 0) {
        console.log(`Generated ${i + 1} trains...`);
      }
    }
    
    // Insert all trains
    await Train.insertMany(trains);
    console.log(`Successfully generated and inserted ${trains.length} trains`);
    
    // Display some statistics
    const totalStations = await Train.aggregate([
      { $unwind: '$stops' },
      { $group: { _id: '$stops.station' } },
      { $count: 'totalStations' }
    ]);
    
    console.log(`Total unique stations: ${totalStations[0].totalStations}`);
    
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
