// frontend/src/components/TrainSearch.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TrainSearch.css';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || ''
});

const TrainSearch = () => {
  const [stations, setStations] = useState([]);
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [sortBy, setSortBy] = useState('price');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingStations, setLoadingStations] = useState(true);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false); // NEW STATE

  useEffect(() => {
    fetchStations();
  }, []);

  const fetchStations = async () => {
    setLoadingStations(true);
    try {
      const response = await api.get('/api/trains/stations');
      setStations(response.data.data || []);
    } catch (err) {
      console.error('fetchStations error', err);
      setError('Failed to fetch stations. Make sure backend is reachable.');
    } finally {
      setLoadingStations(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setHasSearched(true); // Mark that user has searched

    if (!source || !destination) {
      setError('Please select both source and destination');
      return;
    }

    if (source === destination) {
      setError('Source and destination cannot be the same');
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      const response = await api.get('/api/trains/search', {
        params: { source, destination, sortBy }
      });
      setResults(response.data.data.results || []);
    } catch (err) {
      console.error('search error', err);
      setError(err.response?.data?.message || 'Failed to search trains');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => `₹${(price || 0).toFixed(2)}`;

  const renderDirectTrain = (train) => (
    <div key={`${train.trainNumber}-direct`} className="train-card direct">
      <div className="train-header">
        <h3>{train.trainName} ({train.trainNumber})</h3>
        <span className="train-type">Direct</span>
      </div>
      <div className="train-details">
        <div className="timing">
          <span className="departure">Departs: {train.startingTime}</span>
          <span className="arrival">Arrives: {train.reachingTime}</span>
        </div>
        <div className="distance-price">
          <span className="distance">{train.distance} km</span>
          <span className="price">{formatPrice(train.price)}</span>
        </div>
      </div>
    </div>
  );

  const renderConnectingTrain = (route, index) => (
    <div key={`connecting-${index}`} className="train-card connecting">
      <div className="train-header">
        <h3>Connecting Route</h3>
        <span className="train-type">2 Trains</span>
      </div>

      <div className="connecting-trains">
        <div className="train-leg">
          <h4>{route.firstTrain.trainName} ({route.firstTrain.trainNumber})</h4>
          <div className="leg-details">
            <span>{source} → {route.intermediateStation}</span>
            <span>{route.firstTrain.startingTime} - {route.firstTrain.reachingTime}</span>
            <span>{route.firstTrain.distance} km - {formatPrice(route.firstTrain.price)}</span>
          </div>
        </div>

        <div className="transfer-info">
          <span>Change at {route.intermediateStation}</span>
        </div>

        <div className="train-leg">
          <h4>{route.secondTrain.trainName} ({route.secondTrain.trainNumber})</h4>
          <div className="leg-details">
            <span>{route.intermediateStation} → {destination}</span>
            <span>{route.secondTrain.startingTime} - {route.secondTrain.reachingTime}</span>
            <span>{route.secondTrain.distance} km - {formatPrice(route.secondTrain.price)}</span>
          </div>
        </div>
      </div>

      <div className="total-summary">
        <span className="total-distance">Total: {route.totalDistance} km</span>
        <span className="total-price">{formatPrice(route.totalPrice)}</span>
      </div>
    </div>
  );

  return (
    <div className="train-search-container">
      <header className="app-header">
        <h1>Train Search Application</h1>
      </header>

      <form onSubmit={handleSearch} className="search-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="source">From</label>
            <select
              id="source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              disabled={loadingStations}
              required
            >
              <option value="">{loadingStations ? 'Loading stations...' : 'Select Source Station'}</option>
              {stations.map(station => (
                <option key={station} value={station}>{station}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="destination">To</label>
            <select
              id="destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              disabled={loadingStations}
              required
            >
              <option value="">{loadingStations ? 'Loading stations...' : 'Select Destination Station'}</option>
              {stations.map(station => (
                <option key={station} value={station}>{station}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="sortBy">Sort By</label>
            <select
              id="sortBy"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="price">Price</option>
              <option value="time">Departure Time</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || loadingStations || stations.length === 0}
            className="search-btn"
            aria-busy={loading}
          >
            {loading ? 'Searching...' : 'Search Trains'}
          </button>
        </div>
      </form>

      {error && <div className="error-message" role="alert">{error}</div>}

      {results.length > 0 && (
        <div className="results-section">
          <h2>Available Trains ({results.length} found)</h2>
          <div className="results-container">
            {results.map((result, index) =>
              result.type === 'direct'
                ? renderDirectTrain(result)
                : renderConnectingTrain(result, index)
            )}
          </div>
        </div>
      )}

      {/* Show "No trains available" only after a search */}
      {hasSearched && !loading && results.length === 0 && !error && (
        <div className="no-results">
          <h3>No trains available for the selected route</h3>
          <p>Try searching for a different route or check connecting trains.</p>
        </div>
      )}
    </div>
  );
};

export default TrainSearch;
