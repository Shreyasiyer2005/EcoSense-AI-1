/**
 * Settings Page
 * User preferences and configuration
 */

import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, RotateCcw, Bell, Map, Cloud, Info } from 'lucide-react';
import { storageService, AppSettings } from '../services/storage';

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>(storageService.getSettings());
  const [saved, setSaved] = useState(false);
  const [storageInfo, setStorageInfo] = useState(storageService.getStorageInfo());

  useEffect(() => {
    setStorageInfo(storageService.getStorageInfo());
  }, []);

  const handleSave = () => {
    storageService.saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    const defaults = storageService.getSettings();
    setSettings(defaults);
    storageService.saveSettings(defaults);
  };

  const updateSetting = (key: keyof AppSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const storageUsedPercent = Math.round((storageInfo.used / storageInfo.available) * 100);

  return (
    <div className="bg-[#0f1419] min-h-screen pt-16">
      <div className="max-w-5xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-900/20 rounded-lg">
              <SettingsIcon className="w-6 h-6 text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Settings</h1>
          </div>
          <p className="text-gray-400">Configure your EcoSense AI preferences</p>
        </div>

        {/* Save Status */}
        {saved && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-800/50 rounded-lg flex items-center gap-2 text-green-400">
            <Save className="w-4 h-4" />
            <span>Settings saved successfully</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Appearance */}
          <div className="bg-[#1a2332] border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Appearance
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Theme
                </label>
                <select
                  value={settings.theme}
                  onChange={(e) => updateSetting('theme', e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
                >
                  <option value="dark">Dark (Recommended)</option>
                  <option value="light">Light</option>
                </select>
              </div>
            </div>
          </div>

          {/* Analysis Preferences */}
          <div className="bg-[#1a2332] border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Cloud className="w-5 h-5 text-green-400" />
              Analysis Preferences
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Default Resolution (meters/pixel)
                </label>
                <select
                  value={settings.defaultResolution}
                  onChange={(e) => updateSetting('defaultResolution', parseInt(e.target.value))}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
                >
                  <option value={10}>10m (High Quality)</option>
                  <option value={20}>20m (Balanced)</option>
                  <option value={60}>60m (Fast)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Higher resolution requires more processing time</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Maximum Cloud Cover (%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={settings.defaultCloudCover}
                  onChange={(e) => updateSetting('defaultCloudCover', parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0% (Clear)</span>
                  <span className="text-green-400 font-semibold">{settings.defaultCloudCover}%</span>
                  <span>100% (Cloudy)</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Lower values return clearer imagery</p>
              </div>
            </div>
          </div>

          {/* Map Preferences */}
          <div className="bg-[#1a2332] border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Map className="w-5 h-5 text-green-400" />
              Map Preferences
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Map Provider
                </label>
                <select
                  value={settings.mapProvider}
                  onChange={(e) => updateSetting('mapProvider', e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
                >
                  <option value="cesium">Cesium 3D Globe (Recommended)</option>
                  <option value="openstreetmap">OpenStreetMap</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-[#1a2332] border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-green-400" />
              Notifications
            </h2>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notificationsEnabled}
                  onChange={(e) => updateSetting('notificationsEnabled', e.target.checked)}
                  className="w-5 h-5 rounded bg-gray-900 border-gray-700 text-green-600 focus:ring-green-500 focus:ring-offset-gray-900"
                />
                <span className="text-gray-300">Enable notifications</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoSaveReports}
                  onChange={(e) => updateSetting('autoSaveReports', e.target.checked)}
                  className="w-5 h-5 rounded bg-gray-900 border-gray-700 text-green-600 focus:ring-green-500 focus:ring-offset-gray-900"
                />
                <span className="text-gray-300">Auto-save analysis reports</span>
              </label>
            </div>
          </div>

          {/* Storage Info */}
          <div className="bg-[#1a2332] border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-green-400" />
              Storage Information
            </h2>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm text-gray-300 mb-2">
                  <span>Local Storage Usage</span>
                  <span className="text-green-400 font-semibold">{storageUsedPercent}%</span>
                </div>
                <div className="w-full bg-gray-900 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      storageUsedPercent > 80 ? 'bg-red-500' :
                      storageUsedPercent > 50 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${storageUsedPercent}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {(storageInfo.used / 1024).toFixed(2)} KB used of {(storageInfo.available / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>

              <p className="text-xs text-gray-400 bg-gray-900/50 p-3 rounded-lg">
                <strong>Note:</strong> Settings, notifications, and reports are stored locally in your browser.
                Clearing browser data will reset all preferences.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4 pt-4">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>

            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
