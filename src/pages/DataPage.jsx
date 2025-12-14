import React from 'react';
import DataTable from '../components/DataTable';
import { latencyData } from '../data/latencyData';

const DataPage = () => {
  // Column definitions for raw data table (from CSV) - All 41 columns
  const rawDataColumns = [
    { header: 'Packet Loss', accessor: 'packet_loss' },
    { header: 'Server IP', accessor: 'server_ip' },
    {
      header: 'Mean Latency (ms)',
      accessor: 'mean_latency',
      render: (value) => {
        if (!value) return '-';
        const latency = parseFloat(value);
        const color = latency < 30 ? 'text-green-600' : latency < 50 ? 'text-yellow-600' : 'text-red-600';
        return <span className={`font-medium ${color}`}>{value}</span>;
      }
    },
    { header: 'Min Latency (ms)', accessor: 'min_latency' },
    { header: 'Max Latency (ms)', accessor: 'max_latency' },
    { header: 'Mean Dev Latency', accessor: 'mean_dev_latency' },
    { header: 'No. Pings', accessor: 'no_pings' },
    { header: 'Timestamp', accessor: 'timestamp' },
    { header: 'Network', accessor: 'network' },
    { header: 'Cell Index', accessor: 'cell_index' },
    { header: 'Physical Cell ID', accessor: 'physical_cellid' },
    { header: 'Tracking Area Code', accessor: 'tracking_area_code' },
    { header: 'EARFCN', accessor: 'earfcn' },
    {
      header: 'RSRP (dBm)',
      accessor: 'rsrp',
      render: (value) => {
        if (!value) return '-';
        const rsrp = parseFloat(value);
        const color = rsrp > -90 ? 'text-green-600' : rsrp > -100 ? 'text-yellow-600' : 'text-red-600';
        return <span className={`font-medium ${color}`}>{value}</span>;
      }
    },
    { header: 'RSRQ (dB)', accessor: 'rsrq' },
    { header: 'RSSI (dBm)', accessor: 'rssi' },
    { header: 'SINR (dB)', accessor: 'sinr' },
    { header: 'TA', accessor: 'ta' },
    { header: 'CQI', accessor: 'cqi' },
    { header: 'Primary Bandwidth', accessor: 'primary_bandwidth' },
    { header: 'Cell Bandwidths', accessor: 'cellbandwidths' },
    { header: 'UL Bandwidth', accessor: 'ul_bandwidth' },
    { header: 'LTE MCS', accessor: 'lte_mcs' },
    { header: 'LTE RI', accessor: 'lte_ri' },
    { header: 'NR MCS', accessor: 'nr_mcs' },
    { header: 'NR RI', accessor: 'nr_ri' },
    { header: 'TX Power', accessor: 'tx_power' },
    { header: 'MCC', accessor: 'mcc' },
    { header: 'MNC', accessor: 'mnc' },
    { header: 'SS-RSRP', accessor: 'ss_rsrp' },
    { header: 'SS-RSRQ', accessor: 'ss_rsrq' },
    { header: 'SS-SINR', accessor: 'ss_sinr' },
    { header: 'Latitude', accessor: 'latitude' },
    { header: 'Longitude', accessor: 'longitude' },
    { header: 'Altitude', accessor: 'altitude' },
    { header: 'Location Accuracy', accessor: 'location_accuracy' },
    { header: 'Velocity', accessor: 'velocity' },
    { header: 'Velocity Accuracy', accessor: 'velocity_accuracy' },
    { header: 'Bearing', accessor: 'bearing' },
    { header: 'Bearing Accuracy', accessor: 'bearing_accuracy' },
    { header: 'Device', accessor: 'device' },
    { header: 'MNO', accessor: 'MNO' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Network Data Analytics</h2>
        <p className="text-gray-600">
          Complete network metrics dataset with 41 parameters from latency monitoring
        </p>
      </div>

      {/* Data Table */}
      <DataTable
        title="Raw Data - Complete Network Metrics (41 Columns)"
        data={latencyData}
        columns={rawDataColumns}
      />
    </div>
  );
};

export default DataPage;
